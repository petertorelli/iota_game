import { Masks } from './CardObject';
import { rand, reseed } from './RandomGenerator';

export default class DeckObject {
  public deck: number[] = Array<number>(64 + 2); // 66 with wildcards
  public seed: number;
  public debug: boolean = false;
  constructor(seed: number | undefined = undefined) {
    if (seed) {
      reseed(seed);
      this.seed = seed;
    } else {
      this.seed = rand();
    }
    this.init();
  }

  public init(seed: number | undefined = undefined) {
    if (seed) {
      reseed(seed);
      this.seed = seed;
    } else {
      this.seed = Math.floor(rand() * 2147483647);
    }
    let a = 0x1;
    let b = 0x10;
    let c = 0x100;
    let s;
    // See note about MSB in CardObject.ts
    for (let i = 0; i < 64; ++i) {
      s = (i % 4) + 1;
      this.deck[i] = a | b | c | (s << 12) | Masks.card;
      a <<= 1;
      if (a === 0x10) {
        a = 1;
        b <<= 1;
        if (b === 0x100) {
          b = 0x10;
          c <<= 1;
        }
      }
    }
    // Two wildcards
    this.deck[64] = Masks.wildcard_one;
    this.deck[65] = Masks.wildcard_two;
    this.shuffleDeck();
  }

  public shuffleDeck() {
    const array = this.deck;
    let currentIndex = array.length;
    let randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(rand() * currentIndex);
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
