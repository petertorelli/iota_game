<!-- Please remove this file from your project -->
<template lang='pug'>
div
  .flex.flex-row.items-center
    .w-24 {{ game.player1.name }}
    card-image(v-for='card of game.player1.hand' :card='card' :key='card.key')
  .flex.flex-row.items-center
    .w-24 {{ game.player2.name }}
    card-image(v-for='card of game.player2.hand' :card='card' :key='card.key')
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
    card-image(v-for='card of game.deck.deck' :card='card' :key='card.key')
</template>

<script lang='ts'>
import Vue from 'vue'

import _ from 'lodash';

function* prng(seed: number = 1): Generator<number, any, number> {
  let next;
  let previous = seed;
  while (1) {
    next = previous * 16807 % 2147483647;
    previous = next;
    yield next / 2147483647;
  }
}

const prngGen = prng();

type CardObject = {
  color: string;
  shape: string;
  score: number;
  key: number;
}

function shuffle (array: any[]) {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(prngGen.next().value * currentIndex);
    // randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

type ScoredHandPlay = [number, number[]];
type ScoredHandPlays = ScoredHandPlay[];

function reportCards(cards: CardObject[]) {
  cards.forEach(card => {
    console.log(card.color, card.shape, card.score);
  });
}

function scoreLine (existing: CardObject[], hand: CardObject[]) {
  const ratedPlays: ScoredHandPlays = [];
  const ncards = hand.length;
  const npermutes = 2 ** ncards;
  
  console.log('existing', UNWRAP(existing));
  console.log('hand', UNWRAP(hand));
  // construct a hand, score, add to Map<number, string>, sort Map<key>
  for (let i=0; i<npermutes; ++i) {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const scores = new Set<number>();
    let count = 0;
    // Add existing cards to Sets, we don't permute these.
    for (let j=0; j<existing.length; ++j) {
      ++count;
      colors.add(existing[j].color);
      shapes.add(existing[j].shape);
      scores.add(existing[j].score);
    }
    const toPlay = [];
    const debugToPlay = [];
    // TODO: Start on j=1, 0 is always 0 cards!
    for (let j=0; j<ncards; ++j) {
      if (i & (1 << j)) {
        ++count;
        colors.add(hand[j].color);
        shapes.add(hand[j].shape);
        scores.add(hand[j].score);
        toPlay.push(j);
        debugToPlay.push(hand[j]);
      }
    }
    // TODO: lots of wasted work here.
    if (count < 2 || count > 4) {
      continue;
    }
    if (
      (colors.size === 1 && shapes.size === 1 && scores.size === 1) ||
      (colors.size === 1 && shapes.size === 1 && scores.size === count) ||
      (colors.size === 1 && shapes.size === count && scores.size === 1) ||
      (colors.size === 1 && shapes.size === count && scores.size === count) ||
      (colors.size === count && shapes.size === 1 && scores.size === 1) ||
      (colors.size === count && shapes.size === 1 && scores.size === count) ||
      (colors.size === count && shapes.size === count && scores.size === 1) ||
      (colors.size === count && shapes.size === count && scores.size === count)
    ) {
      let handScore = 0;
      if (scores.size === 1) {
        // If all the scores are the same, it is count * the value
        handScore = count * scores.values().next().value;
      } else {
        // Otherwise the scores are different, so sum them
        for (const score of scores) {
          handScore += score;
        }
      }
      // Bonus for playing all four cards
      if (toPlay.length === 4) {
        handScore *= 2;
      }
      ratedPlays.push([handScore, toPlay]);
    }
  }
  return ratedPlays;
}

class DeckObject {
  public deck: CardObject[];
  constructor () {
    this.deck = [];
    this.initDeck();
    this.shuffleDeck();
  }

  private initDeck() {
    let key = 0x8000;
    for (const color of [ 'red', 'yellow', 'blue', 'green' ]) {
      for (const shape of ['square', 'circle', 'triangle', 'cross']) {
        for (const score of [1, 2, 3, 4]) {
          const card: CardObject = { color, shape, score, key };
          ++key;
          this.deck.push(card);
        }
      }
    }
  }
  
  public shuffleDeck() {
    this.deck = shuffle(this.deck);
  }

  public drawOne() {
    if (this.deck.length > 0) {
      const card = this.deck.shift();
      return card;
    } else {
      return null;
    }
  }
}

/*

The largest possible board is derived from the most number of plays in any
one direction:

1234
   5678
      8abcd
          ef..

Which would be 16 rows of 4 cards. Each row after the first moves to the right
three cards. The max number of card places would be: 4 + 15 * 3, or 49.

If we went backwards it would be 48 squares the other way. So the total
max width is 48 + 49 or 97 squares.

To be safe, assume the board is 97 x 97, or 9409 squares.

*/
const BOARD_DIM = 97;
const BOARD_HALF = (BOARD_DIM - 1) / 2;
class BoardObject {
  public board: CardObject[];
  public taken: Array<{x: number, y: number}>;
  public bbox = {ulc: {x: 0, y: 0}, lrc: {x: 0, y: 0}, w:0, h:0};
  constructor () {
    this.board = Array(BOARD_DIM * BOARD_DIM).fill(null);
    this.taken = [];
  }

  public at(_x: number, _y: number): CardObject|null {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return null;
    }
    return this.board[x + y * BOARD_DIM]
  }

  public put(_x: number, _y: number, card: CardObject): boolean {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return false;
    }
    this.board[x + y * BOARD_DIM] = card;
    console.log('taken', UNWRAP(card), { x, y});
    this.taken.push({x: _x, y: _y});
    this.bbox.ulc.x = Math.min(this.bbox.ulc.x, _x);
    this.bbox.ulc.y = Math.min(this.bbox.ulc.y, _y);
    this.bbox.lrc.x = Math.max(this.bbox.lrc.x, _x);
    this.bbox.lrc.y = Math.max(this.bbox.lrc.y, _y);
    this.bbox.w = this.bbox.lrc.x - this.bbox.ulc.x + 1;
    this.bbox.h = this.bbox.lrc.y - this.bbox.ulc.y + 1;
    return true;
  }

  public getXRange() {
    /*
    return _.range(-3, 4);
    */
    if (this.bbox.w === 0) return _.range(-3, 4);
    return _.range(this.bbox.ulc.x - 2, this.bbox.lrc.x + 3);
  }

  public getYRange() {
    /*
    return _.range(-3, 4);
    */
    if (this.bbox.h === 0) return _.range(-3, 4);
    return _.range(this.bbox.ulc.y - 2, this.bbox.lrc.y + 3);
  }
}

type Geometry = {
  direction: 'up'|'down'|'left'|'right',
  distance: number,
  x: number,
  y: number
}

function UNWRAP (object: any) {
  const x = JSON.stringify(object);
  return x;// JSON.parse(x);
}

class PlayerObject {
  public hand: Array<CardObject>;
  public name: string;
  constructor (name: string) {
    this.hand = [];
    this.name = name;
  }

  public draw (count: number, deck: DeckObject) {
    // TODO: set draw rules
    while (count-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      } else {
        throw new Error('Out of cards');
      }
    }
  }

  public findBoardPlays (board: BoardObject) {
    const plays: Array<CardObject[]> = [];
    const geometry: Geometry[] = [];
    console.log(' ... find board plays');
    board.taken.forEach(coord => {
      const cc = board.at(coord.x, coord.y);
      if (cc) {
        console.log('look', UNWRAP(cc));
        const x = coord.x;
        const y = coord.y;
        if (board.at(x, y-1) === null) {
          plays.push([cc]); // single-card-only
          geometry.push({
            direction: 'up',
            distance: 4, x, y: y-1});
        }
        if (board.at(x, y+1) === null) {
          plays.push([cc]); // single-card-only
          geometry.push({
            direction: 'down',
            distance: 4, x, y: y+1});
        }
        if (board.at(x-1, y) === null) {
          plays.push([cc]); // single-card-only
          geometry.push({
            direction: 'left',
            distance: 4, x: x-1, y});
        }
        if (board.at(x+1, y) === null) {
          plays.push([cc]); // single-card-only
          geometry.push({
            direction: 'right',
            distance: 4, x: x+1, y});
        }
      } else {
        console.log('no card');
      }
    });
    // There are no cards to play, hence the board is open
    if (plays.length === 0) {
      plays.push([]);
      // default to play RIGHT at 0,0
      geometry.push({direction: 'right', distance: 4, x: 0, y: 0});
    }
    console.log('plays', UNWRAP(plays));
    console.log('geometry', UNWRAP(geometry));
    console.log(' ... done looking at board');
    return {plays, geometry};
  }

  public play (deck: DeckObject, board: BoardObject) {
    console.log('--- player "', this.name, '" start ---');
    console.log('hand', UNWRAP(this.hand));
    console.log('--- player thinking ---');
    const survey = this.findBoardPlays(board);
    const summary: Array<any> = [];
    survey.plays.forEach((anchorLine, ii) => {
      console.log('>> construct new analysis line');
      console.log('anchor', UNWRAP(anchorLine), ii);
      const proposal = scoreLine(anchorLine, this.hand);
      proposal.forEach(scoredPlay => {
        summary.push({ sp: scoredPlay, geo: survey.geometry[ii], index: ii});
      })
    });
    console.log('summary:');
    console.log(UNWRAP(summary));
    console.log('--- player choosing ---');

    const sortedSummary = summary.sort((a, b) => {
      return b.sp[0] - a.sp[0];
    });
    console.log('sortedSummary:');
    console.log(UNWRAP(sortedSummary));

    if (sortedSummary.length > 0) {
      const chosenPlay = sortedSummary[0];
      const play: CardObject[] = [];
      const mhand: Array<CardObject|null> = [...this.hand];
      // TODO: Wow, this is overly complicated.
      for (const i of chosenPlay.sp[1]) {
        const c = this.hand[i];
        if (c) {
          play.push(c);
          mhand[i] = null;
        }
      }
      console.log('play', UNWRAP(play));
      this.hand = mhand.filter(card => card !== null) as CardObject[];
      // TODO: As is or shuffled?
      console.log(survey.geometry.length);
      console.log(chosenPlay.index);
      const geo = survey.geometry[chosenPlay.index];
      console.log(geo);
      console.log('playGeo', UNWRAP(geo));
      const startx = geo.x;
      const starty = geo.y;
      switch (geo.direction) {
        case 'up':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx, starty - i, play[i]);
          }
          break;
        case 'down':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx, starty + i, play[i]);
          }
          break;
        case 'left':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx - i, starty, play[i]);
          }
          break;
        case 'right':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx + i, starty, play[i]);
          }
          break;
        default: break;
      }
   //   this.draw(play.length, deck);
    }
    console.log('--- player "', this.name, '" done ---');
  }
}

class GameObject {
  private deck = new DeckObject();
  private board = new BoardObject();
  public player1 = new PlayerObject("Player 1");
  public player2 = new PlayerObject("Player 2");
  private ply = 0;

  constructor () {
    this.deal();
    // this.turn();
    // this.turn();
  }

  public deal() {
    for (let i=0; i<4; ++i) {
      this.player1.draw(1, this.deck);
      this.player2.draw(1, this.deck);
    }
  }

  public turn() {
    if (this.ply & 1) {
      this.player2.play(this.deck, this.board);
    } else {
      this.player1.play(this.deck, this.board);
    }
    ++this.ply;
  }
}

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