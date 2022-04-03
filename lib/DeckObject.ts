import { Card } from './CardObject';
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
      this.seed = rand() * 2147483647;
    }
    // See note about MSB in CardObject.ts
    for (let i = 0x80; i < 0xc0; ++i) {
      this.deck[i - 0x80] = i;
    }
    // Two wildcards
    this.deck[64] = Card.Wild_One;
    this.deck[65] = Card.Wild_Two;
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
