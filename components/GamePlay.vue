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
          input.border(type='number' v-model='algX' @change='toggleAlgDebug(algX, algY)')
      tr
        td Algorithm Y
        td.text-right
          input.border(type='number' v-model='algY' @change='toggleAlgDebug(algX, algY)')
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
    p This app plays the game by itself (wildcard rules are still in progress). It's a fun study in 1-ply gameplay.
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
      userSeed: 459432530 as number | null,
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
      compressedGame: '789ced9ccf8e9b3010c65fa5f2d92be1bf40ae7d80eea1b728074268236d162a48945d45fbee1d43a03b2e521be580227dfa89d883c7e3f96c4c2e1617b16d8a76275617712c5eaa5aacd617f126568914eff4fb217beb49cd996a34356fd5bcd5f4e653e43dd97ca484f51d2c7db5d48c65c6a87688aa237b1ad50db68d6c13d9537f1fb5fbf9f8ff3bbee2cd6aae3561169f836920c54dcde346737b5da84975124d421ab9fbf949532c3a1fcbb0d096656999a78d92723c29c7074df8444ea661a6e17d0dd767f85c193e57963bdbd989353c699eb3636a79dbd43112afafbe1b29b6dbe62d6cbcd3a10cc5a705a150e2d08e77ed185e9c692c0ab0a782d664dcbaeb4402000000000000000000000000000000000000003c1ecaa752393bd473bd783e37e76fd2b1966574f9a16ea9eed4e2d9dda424339477c8dd4dda4845aa24916ab2f2c573bc498ff17485d2fcb9e7e84a9d543a5b3cbf9bb438cad9ebb01219d5b29caee1e95229a9f4e6aee80b69ca484f6a7a4d9634900e4bef82fc11b54c9a725263488d0b6bb57436776a71b4fbf3f084d9c573b94b073d5fe17fe6b1de5e4c8133fd2fedfa9476887fdcf55036ec747a8359da1f597a773c000000000000000000000000000000000000008005d87c48f1eb50bc57ad0adf85da1775f8f493f29954361c1e0a87a2f28d1475f15a899578ee5dbf7cab2b214557362dddd4e42476d5f6f453ac8eeda99a226a16311c190987aa722ad3bf227e3f379f22aa648af8a3387443c8f091301aa92ceaba393eb74d5955bb6bbb146d55744dfd95b745518255be84a48672ad8c238924d386b386945c4ab23dd93a9c6d493671f7f36bd1f5fdcffd64958349a3eca75a77ad85cf6ae97f3a9157d7679a2799cd73ede9d66fa00fbafb' as string,
    };
  },
  mounted() {
    this.reset();
  },
  methods: {
    toggleAlgDebug(x: number|undefined=undefined, y: number|undefined=undefined) {
      toggleDebug(x, y);
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
        console.error(error);
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
