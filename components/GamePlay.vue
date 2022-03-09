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
      button(@click='exportGame()').px-2.py-1.rounded.font-bold.bg-gray-500.text-white Export
      button(@click='importGame()').px-2.py-1.rounded.font-bold.bg-gray-500.text-white Import
      textarea.border(v-model='compressedGame')
    .mb-4.w-48.text-xs
      b Score outcomes
    .mb-4.w-48.text-xs
      table(style='width: 100%;')
        tr
          td Games Played:
          td.text-right {{ nGames }}
        tr
          td Player 1:
          td.text-right {{ pct(player1, nGames) }}
        tr
          td Player 2:
          td.text-right {{ pct(player2, nGames) }}
        tr
          td Tie:
          td.text-right {{ pct(ties, nGames) }}
        tr
          td Speed (ms):
          td.text-right {{ game.speedMs }}
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
      button.btn.btn-blue.mr-4(@click='autoPlay(100000)'
        ) Autoplay 100,000x
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
      nGames: 0,
      ties: 0,
      player1: 0,
      player2: 0,
      p1bingos: 0,
      results: [] as string[],
      compressedGame: '789ceddc4d4fe3460080e1bf524daf8394f1579c1c7bafba87de10877cb8b0224d5000d15594ffde310d5bcca2162dad36ca3e873caf673c71acd8b1567b601796dde23a4c77879ea7718aa99ac454d7314d4631b5b9e3717e153195795cf5734d4c455ed3e4ed71dfbcafcedb4d9eaff3b8caef69f35c9b8f5597794d95dfdb8fdbfccadb757fbc3cdff49f93e7c7fd67e47d75ba88e1b6eb96619a46653549550cdbd93a0f77fb7d0cf3cd6cdb6f3f6d9cafef57ab0800000000000000000000000000000000000000000000000000000000008093259593fc6a8ee04cf03f5cdd2ac5d4a42338137cfd451c3731b593e733ed385fd636ff70db23383fbcf3fa96fddf121e7d315de5e9b23e8213c43b2f70ddff54fb2771759868ca7c798b233835fcc757baca0fe77c710b0fe6d32455f9eab6fd1f91f76f66000000000000000000000000000000000000000000000000000000000000000080f77211c3b29bdf5ffe345b5c5f6e37f7eb65989e8787ab8f775d88aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafa1df6c7ae7b966f7d36aadfe0ee7fe3b4ea29f49f9ff96e7e3d81be7e93ffcbcdedded713e8db9eec9eff7abafdba27bd9b5f4fb06ffb5f1e37bf7e07f52b507d71bb3fcf450c77b3eb6e1da6e7bbf047988e62f894ddc7c7511a8c8ac1e8af9569b0320d56a6c1cab3e1cecfc3f2d561711856c3e1616f39dcfb343c4bc3639d15af8f8b17eb5f7c587518d6c36131fcb0c3defa306c86c3b3e2f5532bf7f91b9fcf37796a17ee578b3ecf96e7b787d5f669b679fa1ac343984e62b80ad3f13e8f6e56b34fdd36f5abae66eb65be76a96e62aada982629a6669c3f633dfbbd0bd3f0e171e90fbfacfb2b7ebbd86cf3645b7c3e46f1fc18551553d9bfca7c8cfa8b63fcfab0f9fb18a9183d1ea43fbffcb52d66ebf5e6eec376b3e8ba7cacdf66abdb2eafbdc9a39f6f1fef809b34ffb8bedcf4f7cf9f2d34c103' as string,
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
    async autoPlay(games: number) {
      await new Promise<void>((resolve) => {
        let count = 0;
        this.autoPlayTimer = window.setInterval(() => {
          this.game.playOneGame();
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
          // this.update();
          ++count;
          if (count >= games) {
            clearInterval(this.autoPlayTimer);
            this.update();
          }
        }, 50)
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
