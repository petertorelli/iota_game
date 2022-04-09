<template lang="pug">
.card( :style='{ color, background }' v-html='html')
</template>

<script lang="ts">
import Vue from 'vue';
import * as card from '../lib/CardObject';

export default Vue.component('CardImage', {
  props: {
    card: {
      type: Number,
      default: 0xff,
    },
  },
  computed: {
    color() {
      if (this.card === card.Masks.wildcard_one) return 'white';
      if (this.card === card.Masks.wildcard_two) return 'white';
      return card.htmlColor(this.card);
    },
    html() {
      if (this.card === card.Masks.dead) return '';
      if (this.card === card.Masks.wildcard_one) return 'W1';
      if (this.card === card.Masks.wildcard_two) return 'W2';
      return card.htmlShape(this.card) + ' ' + card.score(this.card);
    },
    background() {
      if (this.card === card.Masks.dead) return '#f2f2f2';
      if (this.card === card.Masks.wildcard_one) return 'magenta';
      if (this.card === card.Masks.wildcard_two) return 'magenta';
      return this.card === card.Masks.dead ? '#f2f2f2' : 'white';
    },
  },
});
</script>
