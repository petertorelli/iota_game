<!-- Please remove this file from your project -->
<template lang="pug">
mixin sidebar
  .m-4.p-4.w-80.text-sm
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
          input(type='number' v-model='userSeed').w-40.border.rounded
        td.text-right
          button(@click='reset(userSeed)').px-1.py-1.text-xs.rounded.bg-gray-500.text-white Set Seed
      tr
        td Current turn:
        td.text-right {{ game.ply }}
    h2 Interesting Seeds
    p 1668437305 is a high score
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
  .w-80.mr-4
    +sidebar
  .flex.flex-col
    .mt-8.mb-4.error-message(v-if='error') {{ error }}
    h1.mt-8 Iota Auto-Player
    p Based on the game "IOTA" by Gamewrite (c) www.gamewrite.com
    p This app plays the game by itself (wildcard rules are still in progress). It's a fun study in 1-ply gameplay.
    p It is extremely slow on Safari for some reason, recommend Chrome or Firefox.
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
import { DoneReason, GameObject } from '../lib/GameObject';
import { BOARD_DIM, BOARD_HALF } from '../lib/BoardObject';

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
      userSeed: null as number | null,
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
      compressedGame: '789ced9c4d6edb301085af5270cd00e23fe56d0fd02cba3382425154b8882b15720a27087cf70e15cbf1b072e1240bd5c0c3075b79223d9c37437115e859dc76557f2716cfe2a1ba6f5ab1583e8b47b128a478a2ef9d1cd4959a926a949a8f6a3e6a077975d026d33ad3fbf93a9b9fe92c5c363ae652f0d88acb7c6535395bf3d98795dc8b3699d67c69c3838dd24cca43ecf0a2eda87da65da6f7f35d36df9daaf1bf3ba67949ed9434ac2a05f35130cfa3b23c67cb2ba0b9b4dc80cbfc389ebf9d92073b31fb719c4cc4f3a53c2fa5e22b67f2b5b07e7a9364c53bb9b9f7327039e6927535db1466529ed86126ab4998f6916bc38b147826617723c5ed6df7988e93dfeb3a5d8e0a4eb3c5ba1feffa711b892dd59302aee842eb8d07d2b29000000000000000000000000000000000000000782fcaeaf4edac54b19c3d9b8ff8f052992855b0b3e77266c6baa4ba6ba9ca8931ea46ea481a55b3677a961befa8fe811cd127847cd492235f0e7fc5d9733ddb1339d2af2a18ea484877437a62dcecf9bdc98ba1dd16a8472ee53f3ee9ca93723412e7ceefad6ec88937c373927656da5783f26907d249102fab3ba3abd4113fb82237864e005b0eaee81cb097e64819f2e0e2f0bca4fca933d1cf9ed547fc50671c790a9771229ff4112eb90b0000000000000000000000000000000000000000e0bfe06627c5af75f5d4f42abd216a55b5e92550caa67fe4b2528528952b6ea468ab9f8d5888eb61eaa72f6d23a4d8d45d4f37b5768720fa3848a41f7bfa18255569fe0af275db1d05317108925e7916a4a8abb6ed1eaefbae6e1a8af5bd5a6f1a29faa6da74ed673e564871d7d4f769e197eb5279ca5cd3c2a5a645b7ea5bbdea7ed4cd86a6a4f75e69ae374314e59d8aaa28acdbedfe0084d6cd97' as string,
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
        this.game.turn();
        this.update();
      } catch (error) {
        this.error = error as string;
        console.error(error);
      }
    },
    reset(seed: number | undefined = undefined) {
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
        const intervalPlayLauncher = () => {
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
        }
        this.autoPlayTimer = window.setInterval(intervalPlayLauncher, 150);
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
</style>
