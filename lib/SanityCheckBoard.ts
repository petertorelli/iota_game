import { BoardObject, Point } from './BoardObject';
import { Card, name, isCard } from './CardObject';

import { UP, DN, LF, RT } from './AnalysisFunctions';
import * as Algs from './AnalysisFunctions';

type CardCross = {
  vline: number[];
  hline: number[];
  played: boolean;
};

export function getMasks(line: number[]): [number, number, number] {
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
  result[0] = choiceMask(colorBits, n);
  result[1] = choiceMask(shapeBits, n);
  result[2] = choiceMask(scoreBits, n);
  return result;
}

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

function countBits32(int32: number) {
  // Hacker's Delight, Chapter 5-1. Counting 1-Bits
  let x = int32;
  // TODO: we never count more than 4 bits, don't need all this!
  x = (x & 0x5555_5555) + ((x >> 1) & 0x5555_5555);
  x = (x & 0x3333_3333) + ((x >> 2) & 0x3333_3333);
  x = (x & 0x0f0f_0f0f) + ((x >> 4) & 0x0f0f_0f0f);
  x = (x & 0x00ff_00ff) + ((x >> 8) & 0x00ff_00ff);
  x = (x & 0x0000_ffff) + ((x >> 16) & 0x0000_ffff);
  return x;
}

function choiceMask(bits4: number, nCards: number): number {
  let choices: number;
  if (bits4 === 1 || bits4 === 2 || bits4 === 4 || bits4 === 8) {
    // one-hot = all same
    choices = bits4;
  } else if (countBits32(bits4) === nCards) {
    // all different (or nCards === 0)
    choices = ~bits4 & 0xf;
  } else {
    // violation of all or none.
    choices = -1;
  }
  return choices;
}

function growCrossAt(board: BoardObject, spot: Point, cross: CardCross) {
  Algs.addCardsTowardDir(board, spot, cross.hline, LF);
  Algs.addCardsTowardDir(board, spot, cross.hline, RT);
  Algs.addCardsTowardDir(board, spot, cross.vline, UP);
  Algs.addCardsTowardDir(board, spot, cross.vline, DN);
}

function rasterCheck(board: BoardObject, x: number, y: number, line: number[]) {
  const c = board.at(x, y);
  if (isCard(c)) {
    // 1. Make sure no card is isolated
    const nNeighbors =
      (isCard(board.at(x + 1, y)) ? 1 : 0) +
      (isCard(board.at(x - 1, y)) ? 1 : 0) +
      (isCard(board.at(x, y + 1)) ? 1 : 0) +
      (isCard(board.at(x, y - 1)) ? 1 : 0);
    if (nNeighbors === 0) {
      throw new Error(`Card at (${x}, ${y}) is an orphan`);
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
      // TODO: We need to switch to one-hot encoding!
      let nCards = 0;
      let colorBits = 0; // YGRB
      let shapeBits = 0; // T+CS
      let scoreBits = 0; // 4321
      line.forEach((card) => {
        if (card !== Card.Wild_One && card !== Card.Wild_Two) {
          colorBits |= 1 << ((card >> 4) & 0x3);
          shapeBits |= 1 << ((card >> 2) & 0x3);
          scoreBits |= 1 << ((card >> 0) & 0x3);
          ++nCards;
        }
      });
      if (choiceMask(colorBits, nCards) < 0) {
        throw new Error(`Scan done at (${x},${y}) breaks color rules.`);
      }
      if (choiceMask(shapeBits, nCards) < 0) {
        throw new Error(`Scan done at (${x},${y}) breaks shape rules`);
      }
      if (choiceMask(scoreBits, nCards) < 0) {
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
    if (board.atP(spot) === Card.Wild_One) {
      // Build W1's cross
      w1.hline.push(Card.Wild_One);
      w1.vline.push(Card.Wild_One);
      growCrossAt(board, spot, w1);
      w1.played = true;
    } else if (board.atP(spot) === Card.Wild_Two) {
      // Build W2's cross
      w2.hline.push(Card.Wild_Two);
      w2.vline.push(Card.Wild_Two);
      growCrossAt(board, spot, w2);
      w2.played = true;
    }
  });

  let valid = false;

  if (w1.played) {
    // Check intersection with W2
    if (w1.hline.includes(Card.Wild_Two)) {
      valid = checkThree(w1.hline, w1.vline, w2.vline);
    } else if (w1.vline.includes(Card.Wild_Two)) {
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
    if (w2.hline.includes(Card.Wild_One)) {
      valid = checkThree(w2.hline, w2.vline, w1.vline);
    } else if (w2.vline.includes(Card.Wild_One)) {
      valid = checkThree(w2.vline, w2.hline, w1.hline);
    } else {
      valid = checkTwo(w2.hline, w2.vline);
    }
    if (!valid) {
      throw new Error('Wildcard check failed with W2');
    }
  }
}
