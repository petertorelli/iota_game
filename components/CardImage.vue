<template lang="pug">
.card( :style='{ color, background }' v-html='html')
</template>

<script lang="ts">
import Vue from 'vue';
import * as card from './CardObject';

export default Vue.component('CardImage', {
  props: {
    card: {
      type: Number,
      default: 0xff,
    },
  },
  computed: {
    color() {
      return card.htmlColor(this.card);
    },
    html() {
      if (this.card === card.Card.Dead) return '';
      return card.htmlShape(this.card) + ' ' + card.score(this.card);
    },
    background() {
      return this.card === card.Card.Dead ? '#eee' : 'white';
    },
  },
});
</script>
