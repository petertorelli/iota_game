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
// MSB is set so that card 0x00 (blue square 1) isn't "falsy" in tests!

// 0xc0 is now the wildcard. It should contain aliases that indicate what
// role it plays in both contexts, so that it may be recalled later.

export function isCard(card: number) {
  return card >= 0x80 && card <= 0xc1; // <= instead of < for wildcards
}

export enum Card {
  None = 0,
  Dead = 1, // This is a placeholder for board squares that cannot be played
  // TODO: None is useful, but do we need EVERY card to be enum'd?
  Wild_One = 0xc0,
  Wild_Two = 0xc1,
}

export function color(card: number) {
  switch (card) {
    case Card.None:
      return 'none';
    case Card.Dead:
      return 'dead';
    case Card.Wild_One:
      return 'wild1';
    case Card.Wild_Two:
      return 'wild2';
    default:
      switch ((card >> 4) & 0x3) {
        case 0:
          return 'blue';
        case 1:
          return 'red';
        case 2:
          return 'green';
        case 3:
          return 'yellow';
        default:
          return 'color?';
      }
  }
}

export function htmlColor(card: number) {
  switch (card) {
    case Card.None:
      return 'black';
    case Card.Dead:
      return 'black';
    case Card.Wild_One:
    case Card.Wild_Two:
      return 'magenta';
    default:
      switch ((card >> 4) & 0x3) {
        case 0:
          return 'dodgerblue';
        case 1:
          return 'red';
        case 2:
          return 'seagreen';
        case 3:
          return 'gold';
        default:
          return 'gray';
      }
  }
}

export function shape(card: number) {
  switch (card) {
    case Card.None:
      return 'O';
    case Card.Dead:
      return 'X';
    case Card.Wild_One:
      return 'W';
    case Card.Wild_Two:
      return 'w';
    default:
      switch ((card >> 2) & 0x3) {
        case 0:
          return 'square';
        case 1:
          return 'circle';
        case 2:
          return 'cross';
        case 3:
          return 'triangle';
        default:
          return 'shape?';
      }
  }
}

export function htmlShape(card: number) {
  switch (card) {
    case Card.None:
      return 'O';
    case Card.Dead:
      return '&times;';
    case Card.Wild_One:
      return 'W';
    case Card.Wild_Two:
      return 'w';
    default:
      switch ((card >> 2) & 0x3) {
        case 0:
          return '&#x25a0;';
        case 1:
          return '&#x25cf;';
        case 2:
          return '&#x271a;';
        case 3:
          return '&#x25b2';
        default:
          return '?';
      }
  }
}

export function score(card: number) {
  if ((card & 0xc0) === 0xc0) {
    return 0;
  }
  if (isCard(card)) {
    return (card & 0x3) + 1;
  }
  return 0;
}

export function name(card: number) {
  return color(card) + ' ' + shape(card) + ' ' + score(card);
}
