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
        //-tr
          th
          th(v-for='xx in game.board.getXRange()') {{ xx }}
        tr(v-for='yy in cacheRangeY')
          //- th {{ yy - 48 }}
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
      results: [] as string[],
      ms: [] as number[],
      compressedGame: '789ceddcbb6ee3461480e1570926ed141ef126a9dc3cc06e91ce70a10b632fac500bdac26621e8dd73c689133b69b64976617c85fe8f1c720e69586e7d4efb71779fd6e73fbd2e4397cb7288cf2a97bee4d2b4b90c71de5fe5b258e6d22d622d3e6d1f9f6a139fd8d3c7791f7bbab86f88b52ece97f538f634753dd69ab86f156b6dcceceadcd8bfa8cf0997f1acae3eb73e3ff60c71bd8fe326e634b17788eb7d9d15f7b47546bda7ceafcfa9ef52afc79e65cceae39eae3eb3dce4f4308efbb4eefab61f5639cd9b29cece974b4edbe366aec7cf07d7d3e970c8222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222f255294dfd1fe1cd77f026f25ffd8adb219761f51dbc8988888888888888888888888888888888888888888888888888888888888888888888888888888888888888c81bc84d4efb717bba7db7d9dddfcec7d3b44febebf4f9eee3e3983249922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449926fd21fc7f105dffa6dc86ff0edffca65f22deaaf80fcc7d7deb79f24499224499224499224499224499224499224f9bf7b93d3e3e67e9cd2fafa9c7e4bebab9cbe442ff9e9acbc3afbe35a7975ad5c62c2767b8c85733a1d76959763d2617e5e7bde108f4eeb454e77d14b9c7d3a6cbe8c73a977dd6da67dbc49e996b92c9b5cda552eab124f9836bf8e699d3e3cddfac3fba9fe000fbbe31c8bcbbf462c5e8e58b6b93431a6b9caa5ebfe35e2e7cfc7bf472cdaa719f1765d93d36e334dc7c70ff371378e31ea713e8d39cde3e6e138fdf4fa521bbbcaf6e3747b7cfa89f7e32fe3fc1043cae5779f724673' as string,
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
      this.game.turn();
      this.update();
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
          const gameRes = this.game.playOneGame();
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
          if (gameRes.reason === DoneReason.Deadlock) {
            this.stopAutoPlay();
          }
        }, 150)
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
