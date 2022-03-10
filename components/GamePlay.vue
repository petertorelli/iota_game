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
      results: [] as string[],
      ms: [] as number[],
      error: '',
      compressedGame: '789ceddd4f6fda3018c7f1b73279d720c571fec1717b01eb6137d44300b79dca922a147515e2bdef092508a7296cdd5049f81ef8244f6c8cc9af0ea18776a566767aaf46abed76ac93c0d349eae930b8f6d4c2da991a85be093d5566b9ecafd66b4f4d8aacacf6eb9d71be9ccf3d00000000000000000000000000000000000000000000000000000000000000000000000000807f439ba13cd23398099c20ddc4783a8acf6026708274c32a5dd66e07d1c9f0588fa1965e2cddaea24d200b54b7b745926ddade06e78f4e23599bbee418bd6a1aca6163ce6092f0fe7c8354b24d24e7eaaf05eb3a74b9538e8233981efc6d9e69b52825cf58f28cf63f79751c4aaba46df8a4ed343a968fd458828c6359b2fb97651d49c4917f067384ff96769a6c774259d5a68a9e8fdc3ea18ddc61a5db6bb28e5fdd66412fd09191257cecab30741d9d5639f39baa1ea38ddc6625f208b993ee313a906fc149720633010000000000000000000000000000000000000000000000000000000000000000000000000000805372eda9999d2c6fbf64d3fbdbb258e633351a7ff8ac000000000000000000000000000000000000000000000000000000000000000000000000e002509fadb5aade7cfc7ce064191f38005d878c3bce1fe545ca1d673faf03d991731f389e2239f781f6d00e2e7572ee16eed724aedcfde578b6c7973b748977244ed89de6edab396bbbd71c5cc8a4dc3bb8705f12a47d4990f68540d0978473537eeda9c7ecdee66a345ea95f6ae47bea595c7b9b4a3bd54b9b76dab4d336701b77e5e08d3aa8eba0bd36756d1aed61a3368dfe61e3f5b6ed6163fc5d1d396f74fb74df7db6ef766e0ebe2be34673d8fa5e1a6fb5f94e22e7bc363a1bf734eecaa4f52c87ce506e153979b9d5eeec36c2797966ecf48ddd976c9c0bdf1da89eaf692deb0986ad653dc5a8b5aca711b796c9b64c5acb745ba66e39a84f8dac94c9a490232bb59c4fabcdde2997de6a5ed647d3fa9ca8273917f2ea77b289d6523fccb3675beaaadf5db6f9a7683af63d1d469e36d5d69757c9b39f568dd4d5a6eba76f79b55617d3a2948341a2778304fb83a4a13c591e71228fe1ab41be3f157b83c854aa41aa9f1c99e934cbf3e2f1aa2ca6d6ca5837d97c613d55da6c51e45fdd3649fe414f7ee4b7c5667f666f6cb9a8e2fd0d0859f0c6' as string,
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
