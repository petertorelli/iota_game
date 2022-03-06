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

export default class DeckObject {
  public deck: number[] = []
  public seed: number = 0;
  private rand = prng(this.seed);
  constructor () {
    this.init();
  }

  public init() {
    // Interesting seed: 939263 -> player 1 start bingo
    this.seed = 1;// Math.floor(Math.random() * (1024*1024));
    this.rand = prng(this.seed);
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
        array[randomIndex], array[currentIndex]];
    }
  }

  public drawOne(): number|null {
    const c = this.deck.shift();
    return c || null;
  }

  // TODO: We never really check deck consistency. Maybe we should.
  public returnCards(hand: number[]) {
    hand.forEach(card => {
      this.deck.push(card);
    });
  }
}
