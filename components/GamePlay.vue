<!-- Please remove this file from your project -->
<template lang='pug'>
.flex.flex-row
  .m-4.p-4
    .mb-4.w-48
      b Results
    .mb-4.w-48.text-xs Game log
    .mb-4.h-48.overflow-y-scroll.border
      p.text-xs(v-for='res in game.results') {{ res }}
    .mb-4.w-48.text-xs
      b Settings
    .mb-4.w-48.text-xs
      p Deck seed: {{ game.deck.seed }}
    .mb-4.w-48.text-xs
      b Score outcomes
    .mb-4.w-48.text-xs
      table(style='width: 100%;')
        tr
          td Games Played: &nbsp;
          td.text-right {{ game.nGames }}
        tr
          td Player 1:
          td.text-right {{ game.pct(1) }}
        tr
          td Player 2:
          td.text-right {{ game.pct(2) }}
        tr
          td Tie:
          td.text-right {{ game.pct(0) }}
        tr
          td Speed (ms):
          td.text-right {{ game.speedMs }}
        tr
          td Average score:
          td.text-right {{ meanScore.toFixed(1) }}
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
      table(style='border: 1px solid #ddd')
        //-tr
          th
          th(v-for='xx in game.board.getXRange()') {{ xx }}
        tr(v-for='yy in cacheRangeY')
          //- th {{ yy }}
          td(v-for='xx in cacheRangeX')
            card-image(v-if='cacheBoard[xx + yy * 97] !== null'
              :card='cacheBoard[xx + yy * 97]'
              :key='0xf000000 + [xx + yy * 97]'
              )
            .dummy-card(v-else)
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
      scores: [] as number[],
      areas: [] as number[],
      aspects: [] as number[],
      meanScore: 0,
      meanAspect: 0,
      meanArea: 0,
      autoPlayTimer: 0,
    }
  },
  mounted() {
    this.cacheBoard = Array(100 * 100);
  },
  methods: {
    update() {
      this.cacheRangeX = this.game.board.getXRangeA();
      this.cacheRangeY = this.game.board.getYRangeA();
      for (let i=0; i<(97*97); ++i) {
        this.cacheBoard[i] = this.game.board.board[i];
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
    async autoPlay(games: number) {
      await new Promise<void>((resolve) => {
        let count = 0;
        this.autoPlayTimer = window.setInterval(() => {
          this.game.playOneGame();
          
          this.scores.push(this.game.player1.score);
          this.scores.push(this.game.player2.score);
          this.areas.push(this.game.board.bbox.w * this.game.board.bbox.h);
          this.aspects.push(this.game.board.bbox.w / this.game.board.bbox.h);
          this.meanScore = _.mean(this.scores);
          this.meanAspect = _.mean(this.aspects);
          this.meanArea = _.mean(this.areas);

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

</style>
