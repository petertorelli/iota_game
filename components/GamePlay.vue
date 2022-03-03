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
      button.btn.btn-blue.mr-4(
        @click='game.turn()'
        :disabled='game.cannotProceed || game.timer !== 0'
        ) Play One Turn
      button.btn.btn-blue.mr-4(
        @click='game.init()'
        :disabled='game.timer !== 0'
        ) Reset
      button.btn.btn-blue.mr-4(
        @click='game.autoPlay()'
        :disabled='game.timer !== 0'
        ) Autoplay Once
      button.btn.btn-blue.mr-4(v-if='game.timer === 0' @click='game.autoPlay(10000)') Autoplay 10,000x
      button.btn.btn-blue.mr-4(v-else @click='game.stopAutoPlay()') Stop
    .mb-4
      //-table(style='border: 1px solid #ddd')
        - var yy = 30
        while yy++ < (48+18)
          tr
            - var xx = 30
            while xx++ < (48+18)
              - var zz = xx + (yy * 97)
              td
                card-image(v-bind:card= 'game.board.board[' + zz + ']' :key= zz)
      table(style='border: 1px solid #ddd')
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
import Vue from 'vue'
import GameObject from './GameObject';

export default Vue.extend({
  name: 'GamePlay',
  data() {
    return {
      game: new GameObject(),
    }
  },
  mounted() {
  }
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
