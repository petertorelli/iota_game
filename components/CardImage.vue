<template lang='pug'>
.card(
    :style='{ color: mapColor(card.color) }'
    v-html='mapShape(card.shape) + " " + card.score')
</template>
<script lang='ts'>

import Vue from 'vue';

interface Dictionary {
    [index: string]: string;
}

const colors: Dictionary = {
    'blue': 'dodgerblue',
    'red': 'red',
    'yellow': 'gold',
    'green': 'seagreen',
    'white': 'white'
};

const shapes: Dictionary = {
    'cross': '&#x271a;',
    'circle': '&#x25cf;',
    'triangle': '&#x25b2',
    'square': '&#x25a0;',
    '': '',
}

export default Vue.component( "CardImage", {
    props: {
        card: {
            type: Object,
            default() {
                return {
                    color: 'white',
                    shape: 'square',
                    score: 0,
                }
            }
        }
    },
    methods: {
        mapShape(name: string) {
            return shapes[name];
        },
        mapColor(name: string) {
            return colors[name];
        }
    }
});

</script>
