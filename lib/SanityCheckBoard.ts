import { BoardObject, Point } from './BoardObject';
import { Masks, name } from './CardObject';

import { UP, DN, LF, RT } from './AnalysisFunctions';
import * as Algs from './AnalysisFunctions';

type CardCross = {
  vline: number[];
  hline: number[];
  played: boolean;
};

function choiceMask4(bits4: number, nCards: number): number {
  let choices: number = bits4;
  let x = bits4;
  if (bits4 === 1 || bits4 === 2 || bits4 === 4 || bits4 === 8) {
    // one-hot = all same
    // choices = bits4;
  } else {
    // Hacker's Delight, Chapter 5-1. Counting 1-Bits
    x = (x & 0x5) + ((x >>  1) & 0x5);
    x = (x & 0x3) + ((x >>  2) & 0x3);
    if (x === nCards) {
      // all different (or nCards === 0)
      choices = ~bits4 & 0xf;
    } else {
      // violation of all or none.
      choices = -1;
    }
  }
  return choices;
}

export function getMasks(x: number[], debug: boolean = false): [number, number, number] {
  const result: [number, number, number] = [-1, -1, -1];
  let [a, b, c, n] = [0, 0, 0, 0];
  switch (x.length) {
    case 1:
      a = (x[0]>>0)&0xf;
      b = (x[0]>>4)&0xf;
      c = (x[0]>>8)&0xf;
      n = (x[0] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      break;
    case 2:
      a = ((x[0]>>0)&0xf)|((x[1]>>0)&0xf);
      b = ((x[0]>>4)&0xf)|((x[1]>>4)&0xf);
      c = ((x[0]>>8)&0xf)|((x[1]>>8)&0xf);
      n = (x[0] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[1] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      break;
    case 3:
      a = ((x[0]>>0)&0xf)|((x[1]>>0)&0xf)|((x[2]>>0)&0xf);
      b = ((x[0]>>4)&0xf)|((x[1]>>4)&0xf)|((x[2]>>4)&0xf);
      c = ((x[0]>>8)&0xf)|((x[1]>>8)&0xf)|((x[2]>>8)&0xf);
      n = (x[0] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[1] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[2] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      break;
    case 4:
      a = ((x[0]>>0)&0xf)|((x[1]>>0)&0xf)|((x[2]>>0)&0xf)|((x[3]>>0)&0xf);
      b = ((x[0]>>4)&0xf)|((x[1]>>4)&0xf)|((x[2]>>4)&0xf)|((x[3]>>4)&0xf);
      c = ((x[0]>>8)&0xf)|((x[1]>>8)&0xf)|((x[2]>>8)&0xf)|((x[3]>>8)&0xf);
      n = (x[0] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[1] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[2] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      n = (x[3] & Masks.wildcard & ~Masks.card) ? n : n + 1;
      break;
  }
  result[0] = choiceMask4(a, n);
  result[1] = choiceMask4(b, n);
  result[2] = choiceMask4(c, n);
  if (debug) {
    console.log('getMasks:');
    console.log(' ... ', { a, b, c, n });
    console.log(' ... ', result);
  }
  return result;
}
/*
export function XgetMasks(line: number[]): [number, number, number] {
  let colorBits = 0; // YGRB
  let shapeBits = 0; // T+CS
  let scoreBits = 0; // 4321
  let n = 0;
  for (let i = 0; i < line.length; ++i) {
    // remove the conditional later? TODO: Unroll this loop?
    if (line[i] !== Card.Wild_One && line[i] !== Card.Wild_Two) {
      colorBits |= 1 << ((line[i] >> 4) & 0x3);
      shapeBits |= 1 << ((line[i] >> 2) & 0x3);
      scoreBits |= 1 << ((line[i] >> 0) & 0x3);
      ++n;
    }
  }
  const result: [number, number, number] = [-1, -1, -1];
  result[0] = choiceMask4(colorBits, n);
  result[1] = choiceMask4(shapeBits, n);
  result[2] = choiceMask4(scoreBits, n);
  return result;
}
*/
export function checkTwo(A: number[], B: number[], debug: boolean = false): boolean {
  debug && console.log("  checkTwo");
  debug && console.log("  ...A: " + A.map(name).join(' -> '));
  debug && console.log("  ...B: " + B.map(name).join(' -> '));
  const [Ac, Ah, As] = getMasks(A);
  if (Ac < 0 || Ah < 0 || As < 0) {
    debug && console.log('----FAIL A basic');
    return false;
  }
  const [Bc, Bh, Bs] = getMasks(B);
  if (Bc < 0 || Bh < 0 || Bs < 0) {
    debug && console.log('----FAIL B basic');
    return false;
  }
  if ((Ac & Bc) === 0 || (Ah & Bh) === 0 || (As & Bs) === 0) {
    debug && console.log('----FAIL A v B: ', Ac, Bc, Ah, Bh, As, Bs);
    return false;
  }
  return true;
}

export function checkThree(A: number[], B: number[], C: number[], debug: boolean = false): boolean {
  // TODO: There's an optimization here if the lines are one card long.
  debug && console.log("  checkThree");
  debug && console.log("  ...A: " + A.map(name).join(' -> '));
  debug && console.log("  ...B: " + B.map(name).join(' -> '));
  debug && console.log("  ...C: " + C.map(name).join(' -> '));
  const [Ac, Ah, As] = getMasks(A);
  if (Ac < 0 || Ah < 0 || As < 0) {
    debug && console.log('----FAIL A basic');
    return false;
  }
  const [Bc, Bh, Bs] = getMasks(B);
  if (Bc < 0 || Bh < 0 || Bs < 0) {
    debug && console.log('----FAIL B basic');
    return false;
  }
  const Tc = Ac & Bc;
  const Th = Ah & Bh;
  const Ts = As & Bs;
  if (Tc === 0 || Th === 0 || Ts === 0) {
    debug && console.log('----FAIL A v B');
    return false;
  }
  const [Cc, Ch, Cs] = getMasks(C);
  if (Cc < 0 || Ch < 0 || Cs < 0) {
    debug && console.log('----FAIL C basic');
    return false;
  }
  if ((Tc & Cc) === 0 || (Th & Ch) === 0 || (Ts & Cs) === 0) {
    debug && console.log('----FAIL A v B v C');
    return false;
  }
  debug && console.log('----PASS');
  return true;
}

function growCrossAt(board: BoardObject, spot: Point, cross: CardCross) {
  Algs.addCardsTowardDir(board, spot, cross.hline, LF);
  Algs.addCardsTowardDir(board, spot, cross.hline, RT);
  Algs.addCardsTowardDir(board, spot, cross.vline, UP);
  Algs.addCardsTowardDir(board, spot, cross.vline, DN);
}

function rasterCheck(board: BoardObject, x: number, y: number, line: number[]) {
  const c = board.at(x, y);
  if (c & Masks.card) {
    // 1. Make sure no card is isolated
    const nNeighbors =
      board.at(x + 1, y) |
      board.at(x - 1, y) |
      board.at(x, y + 1) |
      board.at(x, y - 1);
    if (nNeighbors === 0) {
      throw new Error(`Card at [${x}, ${y}] is an orphan ${c.toString(16)}`);
    }
    // 2. Line-check state machine
    line.push(c);
  } else {
    // 2a. We hit the end of a line.
    if (line.length > 4) {
      throw new Error(`Line is greater than 4 cards at (${x}, ${y})`);
    }
    // 2b. Check non-wildcard consistency
    if (line.length > 1) {
      const masks = getMasks(line);
      if (masks[0] < 0) {
        throw new Error(`Scan done at (${x},${y}) breaks color rules.`);
      }
      if (masks[1] < 0) {
        throw new Error(`Scan done at (${x},${y}) breaks shape rules`);
      }
      if (masks[2] < 0) {
        throw new Error(`Scan done at (${x},${y}) breaks score rules`);
      }
    }
    // 3. Not a card at (x,y) - empty or dead, reset line checker
    // Since we passed by reference, we cannot do `line = []` to clear.
    line.splice(0, line.length);
  }
}

export function sanityCheckBoard(board: BoardObject): void {
  const ulcx = board.bbox.ulc.x;
  const ulcy = board.bbox.ulc.y;
  const h = board.bbox.h;
  const w = board.bbox.w;

  // Skip first card turned over from deck on turn #1.
  if (board.taken.length < 2) {
    return;
  }

  // Horizontal raster
  for (let y = ulcy; y < ulcy + h; ++y) {
    const line: number[] = [];
    for (let x = ulcx; x < w; ++x) {
      rasterCheck(board, x, y, line);
    }
  }

  // Vertical raster
  for (let x = ulcx; x < w; ++x) {
    const line: number[] = [];
    for (let y = ulcy; y < ulcy + h; ++y) {
      rasterCheck(board, x, y, line);
    }
  }

  // hline & vline always start with the wildcard, i.e. index zero.
  const w1: CardCross = { vline: [], hline: [], played: false };
  const w2: CardCross = { vline: [], hline: [], played: false };

  board.taken.forEach((spot) => {
    if (board.atP(spot) === Masks.wildcard_one) {
      // Build W1's cross
      w1.hline.push(Masks.wildcard_one);
      w1.vline.push(Masks.wildcard_one);
      growCrossAt(board, spot, w1);
      w1.played = true;
    } else if (board.atP(spot) === Masks.wildcard_two) {
      // Build W2's cross
      w2.hline.push(Masks.wildcard_two);
      w2.vline.push(Masks.wildcard_two);
      growCrossAt(board, spot, w2);
      w2.played = true;
    }
  });

  let valid = false;

  if (w1.played) {
    // Check intersection with W2
    if (w1.hline.includes(Masks.wildcard_two)) {
      valid = checkThree(w1.hline, w1.vline, w2.vline);
    } else if (w1.vline.includes(Masks.wildcard_two)) {
      valid = checkThree(w1.vline, w1.hline, w2.hline);
    } else {
      valid = checkTwo(w1.hline, w1.vline);
    }
    if (!valid) {
      throw new Error('Wildcard check failed with W1');
    }
  }

  if (w2.played) {
    // Check intersection with W1 (redundant??? <- TODO)
    if (w2.hline.includes(Masks.wildcard_one)) {
      valid = checkThree(w2.hline, w2.vline, w1.vline);
    } else if (w2.vline.includes(Masks.wildcard_one)) {
      valid = checkThree(w2.vline, w2.hline, w1.hline);
    } else {
      valid = checkTwo(w2.hline, w2.vline);
    }
    if (!valid) {
      throw new Error('Wildcard check failed with W2');
    }
  }
}
