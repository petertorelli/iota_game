import _ from 'lodash';

function* prng(seed: number = 1): Generator<number, any, number> {
  let next;
  let previous = seed;
  while (1) {
    next = (previous * 16807) % 2147483647;
    previous = next;
    yield next / 2147483647;
  }
}

export default class DeckObject {
  public deck: number[] = [];
  public seed: number = -1;
  public rand = prng(this.seed);
  constructor(seed: number | undefined = undefined) {
    if (seed === undefined) {
      this.seed = Math.floor(Math.random() * (1024 * 1024));
    } else {
      this.seed = seed;
    }
    this.rand = prng(this.seed);
    this.init();
  }
  
  // Interesting seed: 939263 -> player 1 start bingo
  // this.seed = 1034914; 4034;258991
  // If we re-seed on init, it makes debugging easier
  public init(seed: number | undefined = undefined) {
    if (seed !== undefined) {
      this.rand = prng(seed);
    }
    // See note about MSB in CardObject.ts
    this.deck = _.range(0x80, 0xc0); // TODO: Actually 66 due to wildcards
    this.shuffleDeck();
  }

  public shuffleDeck() {
    const array = this.deck;
    let currentIndex = array.length;
    let randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(this.rand.next().value * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }

  public drawOne(): number | undefined {
    return this.deck.shift();
  }

  // TODO: We never really check deck consistency. Maybe we should?
  public returnCards(hand: number[], n: number) {
    while (n-- > 0) {
      const c = hand.pop();
      if (c !== undefined) {
        this.deck.push(c);
      }
    }
  }
}
