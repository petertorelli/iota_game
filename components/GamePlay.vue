<!-- Please remove this file from your project -->
<template lang='pug'>
div
  .flex.flex-row.items-center
    .w-24 {{ game.player1.name }}
    card-image(v-for='card of game.player1.hand' :card='card' :key='card')
  .flex.flex-row.items-center
    .w-24 {{ game.player2.name }}
    card-image(v-for='card of game.player2.hand' :card='card' :key='card')
  button.btn.btn-blue(@click='game.turn()') Play a Turn
  p Board
  table
    tr
      th
      th(v-for='xx in game.board.getXRange()') {{ xx }}
    tr(v-for='yy in game.board.getYRange()')
      th {{ yy }}
      td(v-for='xx in game.board.getXRange()')
        card-image(v-if='game.board.at(xx,yy) !== null'
          :card='game.board.at(xx,yy)'
          do_i_need_a_key='(xx + 100) + ((yy + 100) * 100)'
          )
        .card(v-else)
  p Deck
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
.card {
  display: flex; 
  align-items: center;
  justify-content: space-around;
  font-size: 1rem;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  margin: 3px;
}


</style>