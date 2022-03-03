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

function shuffle (array: number[]) {
  let currentIndex = array.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(prngGen.next().value * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

export default class DeckObject {
  public deck: number[];
  constructor () {
    // See note about MSB in CardObject.ts
    this.deck = _.range(0x80, 0xc0); // TODO: Actually 66 due to wildcards
    this.shuffleDeck();
  }
  
  public shuffleDeck() {
    this.deck = shuffle(this.deck);
  }

  public drawOne(): number|null {
    const c = this.deck.shift();
    return c || null;
  }
}
