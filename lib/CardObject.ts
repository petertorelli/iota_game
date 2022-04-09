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

// How about one-hot?

/*
    C                        SHP  COL  SCR
32b'0000-0000-0000-0000.0000-0000-0000-0000 Card.NONE
32b'0100 .... .... .... .... .... .... .... Card.Dead

   0x0         = none
   0x4000_0000 = dead
 < 0x8000_0000 = not a card
>= 0x8000_0000 = a card

32b'0000-0000-0000-0000-0111-0000-0000-0000 scoreBin
32b'0000-0000-0000-0000.0000-0000-0000-0000 Card.NONE
    1                      1           0001 1 pt
    1                     10           0010 2 pts
    1                     11           0100 3 pts
    1                    100           1000 4 pts
    1                             0001-.... RED
    1                             0010-.... GREEN
    1                             0100-.... BLUE
    1                             1000-.... YELLOW
    1                        0001-.... .... SQUARE
    1                        0010-.... .... CIRCLE
    1                        0100-.... .... CROSS
    1                        1000-.... .... TRIANGLE
32b'1101 .... .... .... .... .... .... .... WILDCARD1
32b'1110 .... .... .... .... .... .... .... WILDCARD2
32b'1... .... .... .... .... .... .... .... card
*/

export enum Masks {
  none = 0,

  // We add in the actual score as binary to make score extraction easier
  pt1 = 0x01 | (0x1 << 12),
  pt2 = 0x02 | (0x2 << 12),
  pt3 = 0x04 | (0x3 << 12),
  pt4 = 0x08 | (0x4 << 12),
  score = 0xf,
  scoreBin = 0x7 << 12,
  
  red    = 0x10,
  green  = 0x20,
  blue   = 0x40,
  yellow = 0x80,
  color  = 0xf0,

  square   = 0x100,
  circle   = 0x200,
  cross    = 0x400,
  triangle = 0x800,
  shape    = 0xf00,

  dead = 0x4000_0000,
  card = 0x8000_0000,

  wildcard     = 0xc000_0000,
  wildcard_one = 0xd000_0000,
  wildcard_two = 0xe000_0000,
}

export function color(card: number) {
  switch (card) {
    case Masks.none:
      return 'none';
    case Masks.dead:
      return 'dead';
    case Masks.wildcard_one:
      return 'wild1';
    case Masks.wildcard_two:
      return 'wild2';
    default:
      switch (card & Masks.color) {
        case Masks.blue:
          return 'blue';
        case Masks.red:
          return 'red';
        case Masks.green:
          return 'green';
        case Masks.yellow:
          return 'yellow';
        default:
          return 'color?';
      }
  }
}

export function htmlColor(card: number) {
  switch (card) {
    case Masks.none:
      return 'black';
    case Masks.dead:
      return 'black';
    case Masks.wildcard_one:
    case Masks.wildcard_two:
      return 'magenta';
    default:
    switch (card & Masks.color) {
      case Masks.blue:
        return 'dodgerblue';
      case Masks.red:
        return 'red';
      case Masks.green:
        return 'seagreen';
      case Masks.yellow:
        return 'gold';
      default:
        return 'gray';
    }
  }
}

export function shape(card: number) {
  switch (card) {
    case Masks.none:
      return 'O';
    case Masks.dead:
      return 'X';
    case Masks.wildcard_one:
      return 'W';
      case Masks.wildcard_two:
      return 'w';
    default:
    switch (card & Masks.shape) {
      case Masks.square:
        return 'square';
      case Masks.triangle:
        return 'triangle';
      case Masks.cross:
        return 'cross';
      case Masks.circle:
        return 'circle';
      default:
        return 'shape?';
    }
  }
}

export function htmlShape(card: number) {
  switch (card) {
    case Masks.none:
      return 'O';
    case Masks.dead:
      return '&times;';
    case Masks.wildcard_one:
      return 'W';
      case Masks.wildcard_two:
      return 'w';
    default:
    switch (card & Masks.shape) {
      case Masks.square:
        return '&#x25a0;';
      case Masks.triangle:
        return '&#x25b2';
      case Masks.cross:
        return '&#x271a;';
      case Masks.circle:
        return '&#x25cf;';
      default:
        return '?';
    }
  }
}

export function score(card: number) {
  return (card & Masks.scoreBin) >> 12;
}

export function name(card: number) {
  return color(card) + ' ' + shape(card) + ' ' + score(card);
}
