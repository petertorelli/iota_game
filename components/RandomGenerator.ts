
let previous;

const globalPrng = prng(3);

export function* prng(seed: number = 1): Generator<number, any, number> {
  let next;
  previous = seed;
  while (1) {
    next = (previous * 16807) % 2147483647;
    previous = next;
    yield next / 2147483647;
  }
}

export function reseed(seed: number) {
  previous = seed;
}

export function rand() {
  return globalPrng.next().value;
}
