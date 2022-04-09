<!-- Please remove this file from your project -->
<template lang="pug">
mixin sidebar
  .text-sm
    h1 Results
    h2 Game log
    .h-48.overflow-y-scroll.border
      .font-mono.text-xs(v-for='res in results') {{ res }}
    h2 Debug Settings (see Dev Console)
    table.w-full
      tr
        td Game
        td.text-right
          input(type='checkbox' @change='game.debug = !game.debug')
      tr
        td Board
        td.text-right
          input(type='checkbox' @change='game.board.debug = !game.board.debug')
      tr
        td Player 1
        td.text-right
          input(type='checkbox' @change='game.player1.debug = !game.player1.debug')
      tr
        td Player 2
        td.text-right
          input(type='checkbox' @change='game.player2.debug = !game.player2.debug')
      tr
        td Algorithms
        td.text-right
          input(type='checkbox' @change='toggleAlgDebug()')
      tr
        td Algorithm X
        td.text-right
          input.border(type='number' v-model='algX' @change='setDebugXY(algX, algY)')
      tr
        td Algorithm Y
        td.text-right
          input.border(type='number' v-model='algY' @change='setDebugXY(algX, algY)')
    h2 Settings
    table.w-full
      tr
        td Deck seed:
        td.text-right {{ game.deck.seed }}
      tr
        td
          input(type='number' v-model='userSeed').w-40.border.rounded
        td.text-right
          button(@click='reset(userSeed)').px-1.py-1.text-xs.rounded.bg-gray-500.text-white Set Seed
      tr
        td Current turn:
        td.text-right {{ game.ply }}
    h2 Interesting Seeds
    p 151785470 is a very high score
    p 133207245 seems to be missing dead cards
    p 1598795824 fails 2xW check
    p 727689717 starts with a wildcard
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
    small (Wildcard swaps {{ game.player1.wildcardSwaps }})
    .flex.flex-row.items-center.h-12
      .w-24(:style='{ color: game.ply & 1 ? "dodgerblue" : "black" }') {{ game.player2.name }}
      .w-8.text-right.mr-4 {{ game.player2.score }}
      card-image(v-for='card of cachePlayer2Hand' :card='card' :key='card')
    small (Wildcard swaps {{ game.player2.wildcardSwaps }})

mixin controls
  .mb-4
    button.btn.btn-blue.mb-1.mr-2(@click='turn()'
      ) Play One Turn
    button.btn.btn-blue.mb-1.mr-2(@click='reset()'
      ) Reset
    button.btn.btn-blue.mb-1.mr-2(@click='autoPlay(1)'
      ) Autoplay Once
    button.btn.btn-blue.mb-1.mr-2(@click='autoPlay()'
      ) Autoplay Forever
    button.btn.btn-blue.mb-1(@click='stopAutoPlay()'
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

//- Main!
.m-4.flex.flex-row
  .w-80.mr-4
    +sidebar
  .flex.flex-col
    h1 Iota Auto-Player
    p Based on the game "IOTA" by Gamewrite (c) www.gamewrite.com
    p This app plays the game by itself. It's a fun study in 1-ply gameplay.
    p It is extremely slow on Safari for some reason, recommend Chrome or Firefox.
    +players
    .mb-4(v-if='game.cannotProceed')
      div(v-if='game.player1.score === game.player2.score')
        b Tie!
      div(v-else)
        b Winner is player # {{ game.player1.score > game.player2.score ? 1 : 2 }}
    +controls
    .mb-4.error-message(v-if='error') <button @click="error=''">&times;</button> {{ error }}
    +board
    +deck
</template>

<script lang="ts">
import _ from 'lodash';
import Vue from 'vue';
import { DoneReason, GameObject } from '../lib/GameObject';
import { BOARD_DIM, BOARD_HALF } from '../lib/BoardObject';
import { toggleDebug } from '../lib/AnalysisFunctions';

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
      userSeed: 133207245 as number | null,
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
      algX: undefined,
      algY: undefined,
      compressedGame:
        '789ced9ccf8e9b3010c65fa5f2d991f03f30b9ee03740fbd4539902c6daa64a182a4d9559477ef0c018a69d40b0784f4e99704c61e8fe73376b2d25abe895d99556f627d13e7ec981762bdb9890fb18ea4f8a4cfbb6cac956acc950aed5175571b85cee3b63a6cab83b6ada93bd384b526acb5cf4c13a6a1c33446a60dcdaeedca85915d105987ce3a8cdcf61b87a60b4d1b9a6634d07e6427233b1ed92e1cbebffefa69323e54ed43ef5132261cfcd1f0a661a8f4be95e2aa783e9dca3d5f4255e2d729fbcc69be9dab4b2ec5e1f4b3c869cea93891ca186afbbb2bd15eaa4449e5122a7dcfea634da55e6a69b714e6aac32efaf9da77f03d3bd5831e06a107f128b3e6c52177bbf283a35d4e7ddeaed7284e5557da0f92b88ab5a71e483c5bed42da44120000000000000000000000000000000000c0f250c64b159bd9f398a421d5b2fd0ffcecb94c50614885f6b3e7315545f4d8f7e0d5ecb94c54e26846254b9e519d0e23958d67cf63a20ad241ebc324b3673249454273caa5a463c9cf43794b0ae889d874f65c26a8884945e2e8aa67cf65820a4fabdb9112bddc67a13cff7ed3df219656875df2ef86b2fc1d65f9db2aa155ee97fb4c0000000000000000000000000000000000000000c0ec6cbbd3a4aae63cab4356f0f14e2a89a54a79d30d6f814ab75214d97b2ed6e2b571fdf2b5c88514f5beaca89077728ab77c77f9d11e48d587d4c390d652384f610d8554ff84fc762d0721e3e849483e24cd49b1cf8aa23cbf56e53e1f9c8155e5595d162f61dd280a5bfb2327f5b86e94e32d83949427bd31bdad932ae12d3aac9dee1d959994ca3495b11f6ff7a4ab633f129452fb98fd591495196e136dc7dd5ef92c2eeef7716ad8fe61527687feae6eeffa73bffeeb445e75a350181d9924b2d68bfbfd0fab85a96c' as string,
    };
  },
  mounted() {
    this.reset();
  },
  methods: {
    setDebugXY(
      x: number | undefined = undefined,
      y: number | undefined = undefined
    ) {
      toggleDebug(x, y);
    },
    toggleAlgDebug() {
      toggleDebug();
    },
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
      try {
        this.game.checkGame();
      } catch (error) {
        this.error = error as string;
        console.error(this.game.deck.seed);
        console.error(error);
      }
    },
    turn() {
      try {
        this.game.turn();
        this.update();
      } catch (error) {
        this.error = error as string;
        console.error(this.game.deck.seed);
        console.error(error);
      }
    },
    reset(seed: number | undefined = undefined) {
      this.error = '';
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
    stopAutoPlay() {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = 0;
      this.update();
    },
    async autoPlay(n: number | undefined) {
      // Don't start autoPlay'ing again if already in progress!
      if (this.autoPlayTimer !== 0) {
        return;
      }
      await new Promise<void>((resolve) => {
        let count = 0;
        const intervalPlayLauncher = () => {
          let gameRes;
          try {
            gameRes = this.game.playOneGame();
          } catch (error) {
            this.stopAutoPlay();
            this.error = error as string;
            console.error(this.game.deck.seed);
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
            `${this.game.ply} ${winner} ` +
            `${msec.toString().padStart(4, '.')} ms ${this.game.deck.seed} `;
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
        };
        this.autoPlayTimer = window.setInterval(intervalPlayLauncher, 150);
        resolve();
      });
    },
  },
});
</script>

<style lang="scss">
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
  user-select: none;
  @apply rounded;
}

.card {
  @apply base-card;
  border: 1px solid #ccc;
}

.dummy-card {
  @apply base-card;
  border: 1px solid white;
}

.base-card:hover {
  background: #aaa;
}

td {
  padding: 0;
}

tr:hover {
  background: #eee;
}
</style>
