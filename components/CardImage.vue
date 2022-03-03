<template lang='pug'>
.card(:style='{ color }' v-html='shape + " " + score')
</template>

<script lang='ts'>
import Vue from 'vue';
import * as card from './CardObject';

export default Vue.component( "CardImage", {
  props: {
    card: {
      type: Number,
      default: 0xff,
    }
  },
  computed: {
    shape() {
      return card.htmlShape(this.card);
    },
    color() {
      return card.htmlColor(this.card);
    },
    score() {
      return card.score(this.card);
    }
  }
});
</script>

<style lang='scss' scoped>
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
