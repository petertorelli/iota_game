
// TODO: Wildcards

// 0b10xx.yy00 = 1
// 0b10xx.yy01 = 2
// 0b10xx.yy10 = 3
// 0b10xx.yy11 = 4
// -
// 0b10xx.00zz = square
// 0b10xx.01zz = circle
// 0b10xx.10zz = cross
// 0b10xx.11zz = triangle
// -
// 0b1000.yyzz = blue
// 0b1001.yyzz = red
// 0b1010.yyzz = green
// 0b1011.yyzz = yellow
//
// 0x80 = blue square 1
// 0xbf = yellow triangle 4
//
// MSB is set so that card 0x00 isn't "falsy" in tests!

export function isCard(card: number|null) {
  if (card === null) {
    return false;
  }
  return (card & 0x7f) <= 0x3f;
}

export function color(card: number|null) {
  if (card === null) {
    return 'white';
  }
  switch ((card >> 4) & 0x3) {
    case 0: return 'blue';
    case 1: return 'red';
    case 2: return 'green';
    case 3: return 'yellow';
    default: return 'white';
  }
}

export function htmlColor(card: number|null) {
  if (card === null) {
    return 'white';
  }
  switch ((card >> 4) & 0x3) {
    case 0: return 'dodgerblue';
    case 1: return 'red';
    case 2: return 'seagreen';
    case 3: return 'gold';
    default: return 'white';
  }
}

export function shape(card: number|null) {
  if (card === null) {
    return '';
  }
  switch ((card >> 2) & 0x3) {
    case 0: return 'square';
    case 1: return 'circle';
    case 2: return 'cross';
    case 3: return 'triangle';
    default: return '?';
  }
}

export function htmlShape(card: number|null) {
  if (card === null) {
    return '';
  }
  switch ((card >> 2) & 0x3) {
    case 0: return '&#x25a0;';
    case 1: return '&#x25cf;';
    case 2: return '&#x271a;';
    case 3: return '&#x25b2';
    default: return '?';
  }
}

export function score(card: number) {
  return (card & 0x3) + 1;
}

export function name(card: number|null) {
  if (card === null) { return 'nocard' };
  return color(card) + ' ' + shape(card) + ' ' + score(card);
}