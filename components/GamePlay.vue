<!-- Please remove this file from your project -->
<template lang="pug">
mixin sidebar
  .m-4.p-4.w-64.text-sm
    h1 Results
    h2 Game log
    .h-48.overflow-y-scroll.border
      .font-mono.text-xs(v-for='res in results') {{ res }}
    h2 Settings
    table.w-full
      tr
        td Deck seed:
        td.text-right {{ game.deck.seed }}
      tr
        td
          input(type='number' v-model='userSeed').w-24.border.rounded
        td.text-right
          button(@click='reset(userSeed)').px-1.py-1.text-xs.rounded.bg-gray-500.text-white Set Seed
      tr
        td Current turn:
        td.text-right {{ game.ply }}
    h2 Game state
      textarea.w-full.border(v-model='compressedGame' rows=10)
      button(@click='exportGame()').mr-2.px-2.py-1.rounded.font-bold.bg-gray-500.text-white Export
      button(@click='importGame()').px-2.py-1.rounded.font-bold.bg-gray-500.text-white Import
    h2 Score outcomes
    .mb-4
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
          td Average Speed (ms):
          td.text-right {{ meanMs.toFixed(1) }}
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

mixin players
  .mt-8.mb-4
    .flex.flex-row.items-center.h-12
      .w-24(:style='{ color: game.ply & 1 ? "black" : "dodgerblue" }') {{ game.player1.name }}
      .w-8.text-right.mr-4 {{ game.player1.score }}
      card-image(v-for='card of cachePlayer1Hand' :card='card' :key='card')
    .flex.flex-row.items-center.h-12
      .w-24(:style='{ color: game.ply & 1 ? "dodgerblue" : "black" }') {{ game.player2.name }}
      .w-8.text-right.mr-4 {{ game.player2.score }}
      card-image(v-for='card of cachePlayer2Hand' :card='card' :key='card')

mixin controls
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
      ) stop

mixin board
  .mb-4
    table(style='border: 1px solid #ddd')
      tr
        td
        td.text-sm.text-center.font-mono(v-for='xx in game.board.getXRange()') {{ xx }}
      tr(v-for='yy in cacheRangeY')
        td.text-sm.text-center.font-mono {{ yy - boardHalf }}
        td(v-for='xx in cacheRangeX')
          card-image(v-if='cacheBoard[xx + yy * boardDim] !== 0'
            :card='cacheBoard[xx + yy * boardDim]'
            :key='0xf000000 + [xx + yy * boardDim]'
            )
          .dummy-card(v-else) &nbsp;

mixin deck
  .mb-4.max-w-md
    .flex.flex-row.flex-wrap
      card-image(v-for='card of cacheDeck' :card='card' :key='card')

.flex.flex-row
  +sidebar
  .flex.flex-col
    .mt-8.mb-4.error-message(v-if='error') {{ error }}
    +players
    .mb-4
      div(v-if='game.cannotProceed')
        div(v-if='game.player1.score === game.player2.score')
          b Tie!
        div(v-else)
          b Winner is player # {{ game.player1.score > game.player2.score ? 1 : 2 }}
      div(v-else)
        p Choose an option:
    +controls
    +board
    +deck
</template>

<script lang="ts">
import _ from 'lodash';
import Vue from 'vue';
import { DoneReason, GameObject } from './GameObject';
import { BOARD_DIM, BOARD_HALF } from './BoardObject';

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
      userSeed: null as number|null,
      cacheBoard: [] as Array<number | null>,
      cacheRangeX: [] as number[],
      cacheRangeY: [] as number[],
      cachePlayer1Hand: [] as number[],
      cachePlayer2Hand: [] as number[],
      cacheDeck: [] as number[],
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
      boardDim: BOARD_DIM,
      boardHalf: BOARD_HALF,
      results: [] as string[],
      ms: [] as number[],
      error: '',
      compressedGame: '' as string,
    };
  },
  mounted() {
    this.reset();
  },
  methods: {
    exportGame() {
      this.compressedGame = this.game.exportGame();
    },
    importGame() {
      if (this.compressedGame === '') {
        return;
      }
      this.game.importGame(this.compressedGame);
      this.update();
    },
    update() {
      this.cacheRangeX = this.game.board.getXRangeA();
      this.cacheRangeY = this.game.board.getYRangeA();
      this.cacheDeck = [...this.game.deck.deck];
      this.cachePlayer1Hand = [...this.game.player1.hand];
      this.cachePlayer2Hand = [...this.game.player2.hand];
      for (let i = 0; i < 97 * 97; ++i) {
        this.cacheBoard[i] = this.game.board.board[i];
      }
    },
    turn() {
      try {
        this.game.turn()
        this.update();
      } catch (error) {
        this.error = error as string;
        console.error(error);
      }
    },
    reset(seed: number|undefined = undefined) {
      this.game.init(seed);
      this.update();
    },
    pct(n: number, d: number, prec: number = 1) {
      let pct = 0;
      if (d > 0) {
        pct = (n / d) * 100;
      }
      return pct.toFixed(prec);
    },
    async autoPlay(n: number | undefined) {
      // Don't start autoPlay'ing again if already in progress!
      if (this.autoPlayTimer !== 0) {
        return;
      }
      await new Promise<void>((resolve) => {
        let count = 0;
        this.autoPlayTimer = window.setInterval(() => {
          let gameRes;
          try {
            gameRes = this.game.playOneGame();
          } catch (error) {
            this.stopAutoPlay();
            this.error = error as string;
            console.error(error);
          }
          if (gameRes === undefined) {
            return;
          }
          this.nGames++;
          let winner = '';
          if (this.game.player1.score === this.game.player2.score) {
            this.ties++;
            winner = 'tie';
          } else if (this.game.player1.score > this.game.player2.score) {
            this.player1++;
            winner = 'p1';
          } else {
            this.player2++;
            winner = 'p2';
          }
          this.spreads.push(
            Math.abs(this.game.player1.score - this.game.player2.score)
          );
          this.scores.push(this.game.player1.score);
          this.scores.push(this.game.player2.score);
          this.areas.push(this.game.board.bbox.w * this.game.board.bbox.h);
          this.aspects.push(this.game.board.bbox.w / this.game.board.bbox.h);
          this.meanScore = _.mean(this.scores);
          this.meanAspect = _.mean(this.aspects);
          this.meanArea = _.mean(this.areas);
          this.meanSpread = _.mean(this.spreads);
          let msec = -1;
          msec = gameRes.playTime;
          this.ms.push(msec);
          this.meanMs = _.mean(this.ms);
          const res =
            `${this.game.player1.score}-${this.game.player2.score} ` +
            `${this.game.ply} ${winner} ${this.game.deck.seed} ` +
            `${msec} ms`;
          this.results.unshift(res);

          // this.update();
          ++count;
          if (n !== undefined) {
            if (count >= n) {
              this.stopAutoPlay();
            }
          }
          if (gameRes !== undefined && gameRes.reason === DoneReason.Deadlock) {
            this.stopAutoPlay();
            this.update();
          }
        }, 150);
        resolve();
      });
    },
    stopAutoPlay() {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = 0;
      this.update();
    },
  },
});
</script>

<style lang='scss'>


h1 {
  @apply text-2xl font-bold;
}

h2 {
  @apply text-base font-bold mt-4;
}
textarea {
  @apply text-sm;
}

.error-message {
  @apply bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative;
}
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
  @apply bg-blue-100 text-white cursor-not-allowed;
}

.base-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: 0.75rem;
  width: 30px;
  height: 30px;
  margin: 3px;
}

.card {
  @apply base-card rounded;
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
