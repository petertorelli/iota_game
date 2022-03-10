<template lang="pug">
.card(v-show='isCard' :style='{ color }' v-html='shape + " " + score')
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
    isCard() {
      return card.isCard(this.card);
    },
    shape() {
      return card.htmlShape(this.card);
    },
    color() {
      return card.htmlColor(this.card);
    },
    score() {
      return card.score(this.card);
    },
  },
});
</script>
