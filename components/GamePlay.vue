<!-- Please remove this file from your project -->
<template lang='pug'>
.flex.flex-row
  .m-4.p-4
    .mb-4.w-48
      b Results
    .mb-4.w-48.text-xs Game log
    .mb-4.h-48.overflow-y-scroll.border
      p.text-xs(v-for='res in results') {{ res }}
    .mb-4.w-48.text-xs
      b Settings
    .mb-4.w-48.text-xs
      table(style='width: 100%;')
        tr
          td Deck seed:
          td.text-right {{ game.deck.seed }}
        tr
          td Current turn:
          td.text-right {{ game.ply }}
    .mb-4.w-48.text-xs
      b Game state
      textarea.border(v-model='compressedGame')
      button(@click='exportGame()').mr-2.px-2.py-1.rounded.font-bold.bg-gray-500.text-white Export
      button(@click='importGame()').px-2.py-1.rounded.font-bold.bg-gray-500.text-white Import
    .mb-4.w-48.text-xs
      b Score outcomes
    .mb-4.w-48.text-xs
      table(style='width: 100%;')
        tr
          td Games Played:
          td.text-right {{ nGames }}
        tr
          td Player 1:
          td.text-right {{ pct(player1, nGames) }} %
        tr
          td Player 2:
          td.text-right {{ pct(player2, nGames) }} %
        tr
          td Tie:
          td.text-right {{ pct(ties, nGames) }} %
        tr
          td Deadlocks:
          td.text-right {{ pct(deadlocks, nGames) }} %
        tr
          td Mean Speed (ms):
          td.text-right {{ meanMs.toFixed(1) }}
        tr
          td Player 1 Bingos:
          td.text-right {{ p1bingos }}
        tr
          td Average score:
          td.text-right {{ meanScore.toFixed(1) }}
        tr
          td Average spread:
          td.text-right {{ meanSpread.toFixed(1) }}
        tr
          td Average area:
          td.text-right {{ meanArea.toFixed(1) }}
        tr
          td Average aspect ratio:
          td.text-right {{ meanAspect.toFixed(3) }}
  .flex.flex-col
    .mt-8.mb-4(v-if='error' class='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative') {{ error }}
    .mt-8.mb-4
      .flex.flex-row.items-center.h-12
        .w-24(:style='{ color: game.ply & 1 ? "black" : "dodgerblue" }') {{ game.player1.name }}
        .w-8.text-right.mr-4 {{ game.player1.score }}
        card-image(v-for='card of game.player1.hand' :card='card' :key='card')
      .flex.flex-row.items-center.h-12
        .w-24(:style='{ color: game.ply & 1 ? "dodgerblue" : "black" }') {{ game.player2.name }}
        .w-8.text-right.mr-4 {{ game.player2.score }}
        card-image(v-for='card of game.player2.hand' :card='card' :key='card')
    .mb-4
      div(v-if='game.cannotProceed')
        div(v-if='game.player1.score === game.player2.score')
          b Tie!
        div(v-else)
          b Winner is player # {{ game.player1.score > game.player2.score ? 1 : 2 }}
      div(v-else)
        p Choose an option:
    .mb-4
      button.btn.btn-blue.mr-4(@click='turn()'
        ) Play One Turn
      button.btn.btn-blue.mr-4(@click='reset()'
        ) Reset
      button.btn.btn-blue.mr-4(@click='autoPlay(1)'
        ) Autoplay Once
      button.btn.btn-blue.mr-4(@click='autoPlay()'
        ) Autoplay Forever
      button.btn.btn-blue.mr-4(@click='stopAutoPlay()'
        ) Stop
    .mb-4
      //-table
        -let rows=97
        while rows-- > 0
          tr
            -let cols=97
            while cols-- > 0
              -let idx = (cols + (rows * 97))
              -let iidx = `i${idx}`
              td(id= idx)
                card-image(:card='cacheBoard[' + idx + ']')
      table(style='border: 1px solid #ddd')
        tr
          th
          th(v-for='xx in game.board.getXRange()') {{ xx }}
        tr(v-for='yy in cacheRangeY')
          th {{ yy - 48 }}
          td(v-for='xx in cacheRangeX')
            card-image(v-if='cacheBoard[xx + yy * 97] !== null'
              :card='cacheBoard[xx + yy * 97]'
              :style='{ background: cacheBackground[xx + yy * 97] }'
              :key='0xf000000 + [xx + yy * 97]'
              )
            .dummy-card(v-else
              :style='{ background: cacheBackground[xx + yy * 97] }') &nbsp;
      //-table(style='border: 1px solid #ddd')
        //-tr
          th
          th(v-for='xx in game.board.getXRange()') {{ xx }}
        tr(v-for='yy in game.board.getYRange()')
          //- th {{ yy }}
          td(v-for='xx in game.board.getXRange()')
            card-image(v-if='game.board.at(xx,yy) !== null'
              :card='game.board.at(xx,yy)'
              )
            .dummy-card(v-else)
    .mb-4.max-w-md
      .flex.flex-row.flex-wrap
        card-image(v-for='card of game.deck.deck' :card='card' :key='card')
</template>

<script lang='ts'>
import _ from 'lodash';
import Vue from 'vue'
import GameObject from './GameObject';
import { DoneReason } from './GameObject';

export default Vue.extend({
  name: 'GamePlay',
  data() {
    return {
      game: new GameObject(),
      /**
       * I'm seeing a gradual slowdown of performance after ~700 games. This
       * goes away if I comment out the results table. My idea here is that if
       * I stop trying to update the DOM after EVERY turn during autoplay, it
       * might ... do something? I dunno. Just a thought.
       */
      cacheBoard: [] as Array<number|null>,
      cacheRangeX: [] as number[],
      cacheRangeY: [] as number[],
      cacheBackground: [] as string[],
      scores: [] as number[],
      areas: [] as number[],
      aspects: [] as number[],
      spreads: [] as number[],
      meanScore: 0,
      meanAspect: 0,
      meanArea: 0,
      meanSpread: 0,
      autoPlayTimer: 0,
      meanMs: 0,
      nGames: 0,
      ties: 0,
      player1: 0,
      player2: 0,
      p1bingos: 0,
      deadlocks: 0,
      results: [] as string[],
      ms: [] as number[],
      error: '',
      compressedGame: '789ceddadd4ee3461880e15ba9dc53478ae3dfe4b0bd80ee41cf1007817861054d56014457887bef38248109741ba088049e83bc6f3ecf8f07cf7c633be22699b4c767c9e866e983c334b968db49321a94cd7098a5c97c3c0dd1cded6d9a1ccdc6f3eefbeacbc1f4eafc3c0500000000000000000000000000000000000000000000000000000000000000000000000000000080dd4756156956163b301278ab29cebb29aec2540fd3ac1eeec088e0ada6ba2ac3a7099f7c0746036f3ad74d98eb22a475d1df81d1c01bcc70d965723fcc741d367119bdafc806e1c65b65e1e65b2f0fe4dd840e9641114a4b39bcd7c88a4148d3ead1e13a0f331f8aaa7a070609af9ce46197c3d93268c2b40efbab20ecd2e5ba243c6f17cd0e0c189e3bc38370c72d43ced68fde88b33c6cd34598d92a3c7235dea2f61559d9dd7b9fceceac08654597e46ec71f0e591d72bb289741decd7278812ac3a7f168fd31919561cf6ec24ce78f9ecc60df91e5ddef1f52f76322abc3e375ee360c000000000000000000000000000000000000000000000000000000000000000000000000002b1ca6c9a43dba3af96d7c7c76329f5d4d27c9e820b93efd76d92629333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333efb07f6ddb077aefd130bfc3ea9714fc79bde532970dfc09bcdddeef0ec19fc7cfca89f71e2cf3db2d7a0f4bfcf1fdf3f7e2d71d66de076ff5dbd0f31e89bc35f0fef92d6f065281f7c82fdaee5fd929f32efa7fdde89ff554c5bc4bfef9aa7ddd938f54e00fe417fda82a07f803db3f21f1a7b5df85983796fd42876972393e6ba7c9e8e026f93b19f5d3e447e06dba88b228ba2bcba2b22c2aebc585ebb0b7116f553bdbe2b4bdc1221cc42dd761b108f35598c7e1e0a9b0b7d1d73aeec7617ca68d61dc9da8887b2ea2baabd3c6638a07bc7dcdf289b2222a2ba25e8a2d6aae2ec8cb26b188ae48195f9ff2a9698aeb96cba88aa24114e551d4abe2a551c66115ade565693f1e426f63a9f4361747be51bfd8a8bf11f7e3e6fde86faa96511d454d142d8779dfef7f9cf767d7ae8ea2ed6b364fb4aba376abe86e704d54b389affffdc89ff997adda971bedd7711d5ff17f99eeb0df1d1dcdc2919be4eafcb8d37ddbaeafe47cbe3adaacc69f5c876514fa3b0d2a6e43fcfd7cfca39d675dbdd3f17412f6ceac6942cfd3f15f6d324abe2c8a7ff963daedb217c7b37938980f86eb8683870dcb419ad5d5a3c67f5ecf1e341e968bc65d8a87cb743c9e4e67975fe6b3e3b60d7d7c1d9f5fb469326fc717b3e9ef7159b888dfb3a36fd393d9225f27edd7767ed15d877f00ede323fd' as string,
    }
  },
  mounted() {
    this.cacheBoard = Array(100 * 100);
    this.cacheBackground = Array(100 * 100).fill('white');
  },
  methods: {
    exportGame() {
      this.compressedGame = this.game.exportGame();
    },
    importGame() {
      this.game.importGame(this.compressedGame);
      this.update();
    },
    update() {
      this.cacheRangeX = this.game.board.getXRangeA();
      this.cacheRangeY = this.game.board.getYRangeA();
      for (let i=0; i<(97*97); ++i) {
        this.cacheBoard[i] = this.game.board.board[i];
        this.cacheBackground[i] = this.game.board.debugBackground[i];
      }
    },
    turn() {
      try {
        this.game.turn();
        this.update();
      } catch (error) {
        this.error = error as string;
      }
    },
    reset() {
      this.game.init();
      this.update();
    },
    pct(n: number, d: number, prec: number = 1) {
      let pct = 0;
      if (d > 0) {
        pct = (n / d) * 100;
      }
      return pct.toFixed(prec);
    },
    async autoPlay(n: number|undefined) {
      await new Promise<void>((resolve) => {
        let count = 0;
        this.autoPlayTimer = window.setInterval(() => {
          let gameRes;
          try {
            gameRes = this.game.playOneGame();
          } catch (error) {
            this.stopAutoPlay();
            this.error = error as string;
          }
          this.nGames++;
          if (this.game.player1.score === this.game.player2.score) {
            this.ties++;
          } else if (this.game.player1.score > this.game.player2.score) {
            this.player1++;
          } else {
            this.player2++;
          }
          const res
            = `${this.game.player1.score}-${this.game.player2.score} `
            + `${this.game.ply}`;
          this.results.unshift(res);
          this.p1bingos += this.game.p1bingo;
          this.spreads.push(Math.abs(this.game.player1.score - this.game.player2.score));
          this.scores.push(this.game.player1.score);
          this.scores.push(this.game.player2.score);
          this.areas.push(this.game.board.bbox.w * this.game.board.bbox.h);
          this.aspects.push(this.game.board.bbox.w / this.game.board.bbox.h);
          this.meanScore = _.mean(this.scores);
          this.meanAspect = _.mean(this.aspects);
          this.meanArea = _.mean(this.areas);
          this.meanSpread = _.mean(this.spreads);
          if (gameRes !== undefined) {
            this.ms.push(gameRes.playTime);
          }
          this.meanMs = _.mean(this.ms);

          // this.update();
          ++count;
          if (n !== undefined) {
            if (count >= n) {
              this.stopAutoPlay();
            }
          }
          if (gameRes !== undefined && gameRes.reason === DoneReason.Deadlock) {
            this.deadlocks++;
            // this.stopAutoPlay();
          }
        }, 250)
        resolve();
      });
    },
    stopAutoPlay() {
      clearInterval(this.autoPlayTimer);
      this.update();
    },
  },
})
</script>

<style lang='scss' scoped>

.btn {
  @apply font-bold py-2 px-4 rounded;
}

.btn-blue {
  @apply bg-blue-500 text-white;
}

.btn-blue:hover {
  @apply bg-blue-700;
}

.btn-blue:disabled {
  @apply bg-blue-100 text-white cursor-not-allowed
}

.base-card {
  display: flex; 
  align-items: center;
  justify-content: space-around;
  font-size: .75rem;
  width: 30px;
  height: 30px;
  margin: 3px;
}

.card {
  @apply base-card;
  border: 1px solid #ccc;
}

.dummy-card {
  @apply base-card;
  border: 1px solid white;
}

td {
  padding: 0;
}
</style>
