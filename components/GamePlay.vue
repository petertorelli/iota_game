<!-- Please remove this file from your project -->
<template lang="pug">
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
  .flex.flex-col
    .mt-8.mb-4(v-if='error' class='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative') {{ error }}
    .mt-8.mb-4
      .flex.flex-row.items-center.h-12
        .w-24(:style='{ color: game.ply & 1 ? "black" : "dodgerblue" }') {{ game.player1.name }}
        .w-8.text-right.mr-4 {{ game.player1.score }}
        card-image(v-for='card of cachePlayer1Hand' :card='card' :key='card')
      .flex.flex-row.items-center.h-12
        .w-24(:style='{ color: game.ply & 1 ? "dodgerblue" : "black" }') {{ game.player2.name }}
        .w-8.text-right.mr-4 {{ game.player2.score }}
        card-image(v-for='card of cachePlayer2Hand' :card='card' :key='card')
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
      table(style='border: 1px solid #ddd')
        //- tr
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
    .mb-4.max-w-md
      .flex.flex-row.flex-wrap
        card-image(v-for='card of cacheDeck' :card='card' :key='card')
</template>

<script lang="ts">
import _ from 'lodash';
import Vue from 'vue';
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
      cacheBoard: [] as Array<number | null>,
      cacheRangeX: [] as number[],
      cacheRangeY: [] as number[],
      cacheBackground: [] as string[],
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
      results: [] as string[],
      ms: [] as number[],
      error: '',
      compressedGame:
        '789cedddcf6e1a4700c0e157a9a6d7b1e4d9bfc0b17d80e6d09be503868d1d992c1136722ccbef9e591c936c2ba53dc40a82efe0efc72cbbc3dab326c407780acb6e711b664f5f7b919a26a6b68ea94a314df2ede63ca6729a9bc7651b535de5edb993dc226f9f94f92b779af7ab26799f7c6c93db0ef7e563eadc32b7c9c754f99832ef570ff3e7afb6c8cdc797f971aa7cbb9d5cc670d775cb302bda3ad56d0c9b799f474fcfcf315cade79be1f6eb8d8b7ebb5a45000000000000000000000000000000000000000000000000000000000000000000fc34523bbc9774730067823758dd7a78c770ab7b9ca4b28ca919de4bbe3880b3c1cf5ddc76f8a0000b7b9ca4669a577772006782b758dd223f295bdde324b5c3c7ba9c1fc099e00d56b7193e54a73c8033c11bac6e9b5f2e3756f7384975fe0f51e599f9d849d3fc2f70357c289ad75800000000000000000000000000000000000000000000000000000078332e63587657dbeb3fe68bdbebcd7adb2fc3ec223cdc7cb8ef42545555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555d523eeef5df75d7ef5d9a8fe82abff7f6e563da6bafaf574fb1f97b9df023de2fef8b9dfc5af475c2f7cf474ebead7d3adab5f4fb7ae7e3dddbafaf574fbc3abbfdfae563836467fcfbb8ce17e7edbf56176f1143e87d9790c8fd9e7b81ba5d1e8ec6598be0ecf47a3f17d67c56e588c8fdc0fcbddb01cefbc1f56bb6135de793fac77c37abc733d3a8bb3d7d328c6c3b366376ec653ed87ed6ed88e77de0f27bbe164bcf33f86d3f1b1d3f1034d9ff34ffbea6a9db73c85ed6a31e4dbccc35986d5e6756bf13a4378c8df56febe6e863ce7f1a7d5fcb1dba461bf9b79bfcc2b97aa36a6b288a998c4549fe747e9e71fbb300bef76bbfef6573facf7dd62bdc91b9bb49fa3f87e8eb28a6952c7d436798ef4af39fe7e587f9ba37e99e3f1e5cc16f3be5fdfbfdbac175d97a77a3f5fdd75316cbaf9ddbaff737c5fbe663ea5ab0ffdf57a777bd9bdef3677c315f60549be4318' as string,
    };
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
      this.cacheDeck = [...this.game.deck.deck];
      this.cachePlayer1Hand = [...this.game.player1.hand];
      this.cachePlayer2Hand = [...this.game.player2.hand];
      for (let i = 0; i < 97 * 97; ++i) {
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
    async autoPlay(n: number | undefined) {
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
          const res =
            `${this.game.player1.score}-${this.game.player2.score} ` +
            `${this.game.ply} ${winner} ${this.game.deck.seed}`;
          this.results.unshift(res);
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
            this.stopAutoPlay();
            this.update();
          }
        }, 65);
        resolve();
      });
    },
    stopAutoPlay() {
      clearInterval(this.autoPlayTimer);
      this.update();
    },
  },
});
</script>

<style lang="scss" scoped>
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
