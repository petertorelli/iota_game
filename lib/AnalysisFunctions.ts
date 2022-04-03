import { WildcardObject, BoardObject, Point } from './BoardObject';
import {
  Card,
  score as cardScore,
  isCard,
  name,
  color as cardColor,
  shape as cardShape,
} from './CardObject';
import Permutes from './FasterPermute';
import { rand } from './RandomGenerator';
import {
  checkTwo,
  checkThree,
  growCards2,
  growCrossAt,
  choiceMask,
} from './SanityCheckBoard';
import * as San from './SanityCheckBoard';
import type { CardCross } from './SanityCheckBoard';
import { sprintf } from 'sprintf-js';


export function approveWildcardSwap(
  wx: number,
  cx: number,
  sl: Array<number[]>
): boolean {
  let canSwap = true;

  // TODO: Are we always guaranteed to have wx in line0 and line1 and not in line2?
  const index1 = sl[0].indexOf(wx);
  if (index1 < 0) {
    return false;
  }
  // WE ARE MODIFYING AN INPUT!
  sl[0][index1] = cx;

  const index2 = sl[1].indexOf(wx);
  if (index2 < 0) {
    return false;
  }
  // WE ARE MODIFYING AN INPUT!
  sl[1][index2] = cx;

  if (sl.length === 2) {
    if (San.checkTwo(sl[0], sl[1]) === false) {
      canSwap = false;
    }
  }
  if (sl.length === 3) {
    if (San.checkThree(sl[0], sl[1], sl[2]) === false) {
      canSwap = false;
    }
  }
  // WE ARE UN-MODIFYING AN INPUT!
  sl[0][index1] = wx;
  sl[1][index2] = wx;
  return canSwap;
}

export function reclaimWildcard(board: BoardObject, wc: WildcardObject, hand: number[]) {
  let success = false;
  if (wc.played) {
    let seen: Array<number[]> = getWildcardDeps(board, wc.loc);
    hand.some((card, i) => {
      if (card === Card.Wild_One || card === Card.Wild_Two) {
        return false;
      } else {
        if (approveWildcardSwap(wc.card, card, seen)) {
          board.replaceWildCard(wc, card);
          hand[i] = wc.card;
          success = true;
          return true;
        } else {
          return false;
        }
      }
    });
  }
  return success;
}

export function getWildcardMasks(line: number[]): [number, number, number] {
  // TODO: We need to switch to one-hot encoding!
  let nCards = 0;
  let cbits = 0; // YGRB
  let hbits = 0; // T+CS
  let sbits = 0; // 4321

  line.forEach((card) => {
    if (card !== Card.Wild_One && card !== Card.Wild_Two) {
      cbits |= 1 << ((card >> 4) & 0x3);
      hbits |= 1 << ((card >> 2) & 0x3);
      sbits |= 1 << ((card >> 0) & 0x3);
      ++nCards;
    }
  });

  const cMask = choiceMask(cbits, nCards);
  const hMask = choiceMask(hbits, nCards);
  const sMask = choiceMask(sbits, nCards);

  return [cMask, hMask, sMask];
}

// Direction unit vectors and origin.
export const UP: Point = { x: 0, y: -1 };
export const RT: Point = { x: 1, y: 0 };
export const DN: Point = { x: 0, y: 1 };
export const LF: Point = { x: -1, y: 0 };
export const OR: Point = { x: 0, y: 0 };

// The primary search function is called a "parallel" build.
export type BuildParallelResult = {
  line: number[];
  slide: number;
};

let debugFlag: boolean = false;
let debugX: number | undefined = undefined;
let debugY: number | undefined = undefined;
export function toggleDebug(
  x: number | undefined = undefined,
  y: number | undefined = undefined
) {
  if (x === undefined && y === undefined) {
    debugFlag = !debugFlag;
  }
  debugX = x !== undefined ? x : debugX;
  debugY = y !== undefined ? y : debugY;
  console.log('ToggleDebug', { debugFlag, x, y, debugX, debugY });
}

function debug(
  x: number | undefined = undefined,
  y: number | undefined = undefined
) {
  // use '==' since it's text from the form control.
  return (
    (x !== undefined && x == debugX && y !== undefined && y == debugY) ||
    debugFlag
  );
}

// The result of a play is an outcome.
export type Outcome = {
  score: number;
  line: number[];
  x: number;
  y: number;
  dir: Point | null;
  tag: number;
  orgx: number;
  orgy: number;
};

// Note: Picking largest play increases avg score by ~2.5pts!
export function pickBestPlay(options: Outcome[]): Outcome {
  // Name the anon function to make profiling easier
  const picker002 = (a: Outcome, b: Outcome) => {
    const highestScore = b.score - a.score;
    if (highestScore === 0) {
      // Pick the most cards to play when there's a score tie.
      // TODO: What about the fewest? Leaves more chances to score points?
      return b.line.length - a.line.length;
    } else {
      return highestScore;
    }
  };
  const best = options.sort(picker002);
  return best[0];
}

/**
 * If putting a card in this spot creates more than four cards in a row
 * up or down, this spot cannot be played, ever. It is now dead.
 *
 * @param board BoardObject
 * @param x Board X-coordinate
 * @param y Board Y-coordinate
 * @returns Boolean, true if this spot is "dead" (see above).
 */
function checkDead(board: BoardObject, x: number, y: number) {
  let count = 0;
  let i = 1;
  while (i) {
    if (isCard(board.at(x + i, y))) {
      ++count;
      if (count > 3) {
        return true;
      }
    } else {
      break;
    }
    if (isCard(board.at(x - i, y))) {
      ++count;
      if (count > 3) {
        return true;
      }
    } else {
      break;
    }
    ++i;
  }
  count = 0;
  i = 1;
  while (i) {
    if (isCard(board.at(x, y + i))) {
      ++count;
      if (count > 3) {
        return true;
      }
    } else {
      break;
    }
    if (isCard(board.at(x, y - i))) {
      ++count;
      if (count > 3) {
        return true;
      }
    } else {
      break;
    }
    ++i;
  }
  return false;
}

/**
 * Scan the board to find all the bounding contour of all playable coordinates.
 * A playable coordinate is a blank square that is up, down, left, or right of
 * a card on the board. No verification is performed, it only returns a list
 * of Points that might be played, but still need to be analyzed.
 *
 * @param board A BoardObject to examine.
 * @returns An array of Points (board coordinates) that may be played.
 */
export function findContour(board: BoardObject): Point[] {
  // Always faster to use pre-defined arrays than construct them dynamically.
  const hSearch: Point[] = [LF, RT];
  const vSearch: Point[] = [UP, DN];
  // Since this is only called once per turn, use a Set to uniquify.
  const seen = new Map<string, Point>();

  // Helper function to reduce redundant code.
  function check(p: Point, set: Point[]) {
    set.forEach((search) => {
      if (board.atP(p) === Card.Dead) {
        // console.log("check contour at ", p.x, p.y, "dead");
        return;
      }
      const newp = { x: p.x + search.x, y: p.y + search.y };
      if (board.atP(newp) === Card.None) {
        const key = JSON.stringify(newp);
        if (!seen.has(key)) {
          // console.log("check contour at ", newp.x, newp.y, "new");
          seen.set(key, newp);
        } else {
          // console.log("check contour at ", newp.x, newp.y, "seen");
        }
      }
    });
  }

  // Default case when it is the first move.
  if (board.taken.length === 0) {
    return [OR];
  }
  board.taken.forEach(function findFromAnchor(anchor) {
    check(anchor, hSearch);
    check(anchor, vSearch);
  });

  const contour: Point[] = [];
  seen.forEach(function filterContours(v, _k) {
    // Banish spaces that may never be plaid again in this game.
    if (checkDead(board, v.x, v.y)) {
      board.put(v.x, v.y, Card.Dead);
    } else {
      contour.push(v);
    }
  });
  return contour;
}

// Note: this added 20% more time (990us to 1120us). Dammmit.
function wildScore(line: number[]): number {
  // Note: Putting the length check up here is ~5% faster for some reason,
  //       compared to having a `default` case for non {2,3,4} values.
  if (line.length > 4 || line.length < 2) {
    return 0;
  }
  // We can ignore wildcards: if the hand without wildcards is valid, then
  // return just the baseScore of that smaller hand subset.
  const newLine: number[] = [];
  line.forEach((card) => {
    if (card === Card.Wild_One || card === Card.Wild_Two) {
      // do nothing
    } else {
      newLine.push(card);
    }
  });
  return baseScore(newLine);
}

/**
 * An loop-unrolled comparison that checks to see if all properties are the
 * same, or if all properties are different. Can be used for validation as
 * well as basic scoring. "Basic" means no bonuses are computed.
 *
 * Note: This is a 20x performance improvement over using Set()s and
 *       creating dynamic arrays.
 *
 * @param line An array of cards (64 values from 0x00-0x3f)
 * @returns 0 = invalid line or score (sum of card values without bonuses)
 */
function baseScore(line: number[]) {
  let aSame = false;
  let aDiff = false;
  let bSame = false;
  let bDiff = false;
  let cSame = false;
  let cDiff = false;
  let score = 0;

  switch (line.length) {
    case 2:
      aSame = (line[0] & 0x03) === (line[1] & 0x03);
      aDiff = (line[0] & 0x03) !== (line[1] & 0x03);
      bSame = (line[0] & 0x0c) === (line[1] & 0x0c);
      bDiff = (line[0] & 0x0c) !== (line[1] & 0x0c);
      cSame = (line[0] & 0x30) === (line[1] & 0x30);
      cDiff = (line[0] & 0x30) !== (line[1] & 0x30);
      score = (line[0] & 0x3) + (line[1] & 0x3) + 2;
      break;
    case 3:
      aSame =
        (line[0] & 0x03) === (line[1] & 0x03) &&
        (line[1] & 0x03) === (line[2] & 0x03);
      aDiff =
        (line[0] & 0x03) !== (line[1] & 0x03) &&
        (line[1] & 0x03) !== (line[2] & 0x03) &&
        (line[0] & 0x03) !== (line[2] & 0x03);
      bSame =
        (line[0] & 0x0c) === (line[1] & 0x0c) &&
        (line[1] & 0x0c) === (line[2] & 0x0c);
      bDiff =
        (line[0] & 0x0c) !== (line[1] & 0x0c) &&
        (line[1] & 0x0c) !== (line[2] & 0x0c) &&
        (line[0] & 0x0c) !== (line[2] & 0x0c);
      cSame =
        (line[0] & 0x30) === (line[1] & 0x30) &&
        (line[1] & 0x30) === (line[2] & 0x30);
      cDiff =
        (line[0] & 0x30) !== (line[1] & 0x30) &&
        (line[1] & 0x30) !== (line[2] & 0x30) &&
        (line[0] & 0x30) !== (line[2] & 0x30);
      score = (line[0] & 0x3) + (line[1] & 0x3) + (line[2] & 0x3) + 3;
      break;
    case 4:
      aSame =
        (line[0] & 0x03) === (line[1] & 0x03) &&
        (line[1] & 0x03) === (line[2] & 0x03) &&
        (line[2] & 0x03) === (line[3] & 0x03);
      aDiff =
        (line[0] & 0x03) !== (line[1] & 0x03) &&
        (line[0] & 0x03) !== (line[2] & 0x03) &&
        (line[0] & 0x03) !== (line[3] & 0x03) &&
        (line[1] & 0x03) !== (line[2] & 0x03) &&
        (line[1] & 0x03) !== (line[3] & 0x03) &&
        (line[2] & 0x03) !== (line[3] & 0x03);
      bSame =
        (line[0] & 0x0c) === (line[1] & 0x0c) &&
        (line[1] & 0x0c) === (line[2] & 0x0c) &&
        (line[2] & 0x0c) === (line[3] & 0x0c);
      bDiff =
        (line[0] & 0x0c) !== (line[1] & 0x0c) &&
        (line[0] & 0x0c) !== (line[2] & 0x0c) &&
        (line[0] & 0x0c) !== (line[3] & 0x0c) &&
        (line[1] & 0x0c) !== (line[2] & 0x0c) &&
        (line[1] & 0x0c) !== (line[3] & 0x0c) &&
        (line[2] & 0x0c) !== (line[3] & 0x0c);
      cSame =
        (line[0] & 0x30) === (line[1] & 0x30) &&
        (line[1] & 0x30) === (line[2] & 0x30) &&
        (line[2] & 0x30) === (line[3] & 0x30);
      cDiff =
        (line[0] & 0x30) !== (line[1] & 0x30) &&
        (line[0] & 0x30) !== (line[2] & 0x30) &&
        (line[0] & 0x30) !== (line[3] & 0x30) &&
        (line[1] & 0x30) !== (line[2] & 0x30) &&
        (line[1] & 0x30) !== (line[3] & 0x30) &&
        (line[2] & 0x30) !== (line[3] & 0x30);
      score =
        (line[0] & 0x3) +
        (line[1] & 0x3) +
        (line[2] & 0x3) +
        (line[3] & 0x3) +
        4;
      break;
  }
  const pass = (aSame || aDiff) && (bSame || bDiff) && (cSame || cDiff);
  return pass ? score : 0;
}

function grabOrthoLine(board: BoardObject, x: number, y: number, unit: Point) {
  const ortho: Point = { x: unit.y, y: unit.x };
  const line: number[] = [];
  for (let i = 1; i < 6; ++i) {
    const _x = x - ortho.x * i;
    const _y = y - ortho.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (c === Card.None) {
      break;
    } else {
      line.unshift(c);
    }
  }
  for (let i = 1; i < 6; ++i) {
    const _x = x + ortho.x * i;
    const _y = y + ortho.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (c === Card.None) {
      break;
    } else {
      line.push(c);
    }
  }
  return line;
}

/**
 *
 * @param board BoardObject (immutable)
 * @param x Point at which to scan, x-coord
 * @param y Point at which to scan, y-coord
 * @param unit
 * @returns
 */
function buildPerpendicular(
  board: BoardObject,
  x: number,
  y: number,
  unit: Point,
  wildLines: Array<Array<number>>
) {
  // Order does NOT matter
  const line: number[] = [];
  // -ve direction
  for (let i = 1; i < 6; ++i) {
    const _x = x - unit.x * i;
    const _y = y - unit.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    // const c = board.at(x - unit.x * i, y - unit.y * i);
    if (!isCard(c)) {
      break;
    } else {
      line.unshift(c);
      if (c === Card.Wild_One) {
        wildLines[0] = grabOrthoLine(board, _x, _y, unit);
      } else if (c === Card.Wild_Two) {
        wildLines[1] = grabOrthoLine(board, _x, _y, unit);
      }
    }
  }
  // +ve direction
  for (let i = 1; i < 6; ++i) {
    const _x = x + unit.x * i;
    const _y = y + unit.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    // const c = board.at(x + unit.x * i, y + unit.y * i);
    if (!isCard(c)) {
      break;
    } else {
      line.push(c);
      if (c === Card.Wild_One) {
        wildLines[0] = grabOrthoLine(board, _x, _y, unit);
      } else if (c === Card.Wild_Two) {
        wildLines[1] = grabOrthoLine(board, _x, _y, unit);
      }
    }
  }
  return line;
}

export type LineDescriptor = {
  start: Point;
  end: Point;
  cards: number[];
};

/**
 * Given a point on a board and a direction: move in the opposite direction
 * until there is no valid card at that spot. Start at the last valid spot,
 * begin moving in the given directions, adding cards to a list until there
 * are no more cards in that direction.
 *
 * @param board Board object.
 * @param o Origin.
 * @param dir Direction to search.
 * @returns A complete description of the line.
 */
export function getLine(
  board: BoardObject,
  o: Point,
  dir: Point
): LineDescriptor {
  const result: LineDescriptor = {
    start: o,
    end: o,
    cards: [],
  };
  let i = 1;
  while (1) {
    let _x = o.x - i * dir.x;
    let _y = o.y - i * dir.y;
    if (isCard(board.at(_x, _y))) {
      ++i;
    } else {
      break;
    }
  }
  --i;
  let j = 0;
  result.start = {
    x: o.x - i * dir.x + j * dir.x,
    y: o.y - i * dir.y + j * dir.y,
  };
  while (1) {
    let _x = o.x - i * dir.x + j * dir.x;
    let _y = o.y - i * dir.y + j * dir.y;
    let c = board.at(_x, _y);
    if (isCard(c)) {
      result.cards.push(c);
      ++j;
    } else {
      break;
    }
  }
  --j;
  result.end = {
    x: o.x - i * dir.x + j * dir.x,
    y: o.y - i * dir.y + j * dir.y,
  };
  return result;
}

export function getWildcardDeps(board: BoardObject, spot: Point) {
  let line: LineDescriptor = getLine(board, spot, RT);
  if (line.cards.length === 1) {
    line = getLine(board, spot, DN);
    if (line.cards.length === 1 && board.taken.length > 1) {
      throw new Error('A wildcard was played illegally');
    }
  }
  let seenLines: Array<number[]> = [];
  recurseWildcardLines(
    board,
    line.cards,
    line.start,
    line.end,
    0,
    seenLines
  );
  return seenLines;
}

export function recurseWildcardLines(
  board: BoardObject,
  line: number[],
  p1: Point,
  p2: Point,
  seenMask: number,
  seenLines: Array<number[]>
) {
  const debug3 = false; //true;
  debug3 &&
    console.log(
      `-- Recursing (${seenMask}) at [${p1.x},${p1.y}] to [${p2.x},${p2.y}] : ` +
        line.map(name).join(' > ')
    );

  seenLines.push(line);

  let pivot: number = Card.None;
  const dir: Point = p1.x === p2.x ? { x: 0, y: 1 } : { x: 1, y: 0 };
  let _x = p1.x;
  let _y = p1.y;
  for (let i = 0; i < line.length; ++i) {
    _x = p1.x + i * dir.x;
    _y = p1.y + i * dir.y;
    if (line[i] === Card.Wild_One) {
      if (seenMask & 0x1) {
        // seen this card, dont' descend
      } else {
        seenMask |= 0x1;
        pivot = Card.Wild_One;
        break;
      }
    } else if (line[i] === Card.Wild_Two) {
      if (seenMask & 0x2) {
        // seen this card, dont' descend
      } else {
        seenMask |= 0x2;
        pivot = Card.Wild_Two;
        break;
      }
    } else {
    }
  }

  if (pivot !== Card.None) {
    debug3 && console.log(`---- pivoting at point [${_x},${_y}]`);
    // Now we need to construct a perpendicular line to this point
    const perp: Point = { x: dir.y, y: dir.x };
    const newLine: number[] = [pivot];
    growCards2(board, { x: _x, y: _y }, newLine, perp);
    const n = newLine.length;
    growCards2(board, { x: _x, y: _y }, newLine, { x: -perp.x, y: -perp.y });
    const diff = newLine.length - n;
    if (diff) {
      _x = _x - diff * perp.x;
      _y = _y - diff * perp.y;
      debug3 && console.log(`---- correction: pivoting at point [${_x},${_y}]`);
    }
    const np1: Point = { x: _x, y: _y };
    const np2: Point = {
      x: _x + perp.x * (newLine.length - 1),
      y: _y + perp.y * (newLine.length - 1),
    };
    recurseWildcardLines(board, newLine, np1, np2, seenMask, seenLines);
  }
  debug3 && console.log('<< returning from recursion', p1.x, p1.y);
}

function scoreVerify(
  board: BoardObject,
  line: number[],
  x: number, // slid
  y: number, // slid
  permutation: number[],
  unit1: Point,
  unit2: Point
): Outcome | null {
  let areWePlayingAWildcard = false;

  let scoreMultiplier = 1;
  if (line.length > 4) {
    return null;
  }
  // Score the parallel line first
  let score = wildScore(line);
  if (score === 0 && line.length > 1) {
    return null;
  }
  // Completed a horizontal lot
  if (line.length === 4) {
    scoreMultiplier *= 2;
  }
  // Now walk the perpendiculars
  for (let i = 0; i < line.length; ++i) {
    const _x = x + i * unit1.x;
    const _y = y + i * unit1.y;

    areWePlayingAWildcard ||= (line[i] & 0xc0) === 0xc0;

    const wildLines: Array<Array<number>> = [[], []];
    const perpLine = buildPerpendicular(board, _x, _y, unit2, wildLines);
    // The perpendicular scan won't include our card
    if (perpLine.length === 0) {
      continue;
    }

    // Did we add to a wildcard line? If so, we need to check the cross with
    // that line! But what is that line?

    // This is a different case than sanitizing a play-card cross.
    // This is a case where we are influencing a previous line that HAS
    // a wildcard in it.

    perpLine.push(line[i]); // don't forget the card that should be there!

    const debug2 = false; //x === 2 && unit1.y === 1;
    /*
    debug2 &&
      console.log(
        `-- scoreVerify(${x},${y}) build perp at ${_x}, ${_y} ->`,
        perpLine.map((x) => name(x))
      );
*/
    // Are we on a wildcard?
    if ((line[i] & 0xc0) === 0xc0) {
      // Wildcard. Check to see if these two lines are consistent.
      if (!checkTwo(line, perpLine)) {
        // debug2 && console.log('--- onWild fail');
        return null;
      }
      debug2 &&
        console.log(
          '--- checkTwoA pass:',
          line.map((x) => name(x)),
          perpLine.map((x) => name(x))
        );
    }
    if (wildLines[0].length) {
      if (!checkTwo(wildLines[0], perpLine)) {
        return null;
      }
      debug2 &&
        console.log(
          '--- checkTwoB pass:',
          wildLines[0].map((x) => name(x)),
          perpLine.map((x) => name(x))
        );
    }
    if (wildLines[1].length) {
      if (!checkTwo(wildLines[1], perpLine)) {
        return null;
      }
      debug2 &&
        console.log(
          '--- checkTwoC pass:',
          wildLines[1].map((x) => name(x)),
          perpLine.map((x) => name(x))
        );
    }

    let vscore = wildScore(perpLine);
    if (vscore === cardScore(line[i])) {
      // If the total score is the score of the card, it just the card.
    } else if (vscore === 0) {
      // If this play creates a bad vertical line, the whole play fails.
      return null;
    } else {
      if (perpLine.length === 4) {
        // Did we play a card that completed a vertical lot?
        // or was there already a completed veritcal lot?
        if (board.at(_x, _y) === Card.None) {
          scoreMultiplier *= 2;
        }
      }
      // Is the card we're scoring off of in the original permutation?
      if (permutation.includes(line[i]) === false) {
        vscore = 0;
      }
      score += vscore;
    }
  }

  // At this point we are proposing to build a line of cards on the board
  // starting at point (x,y) and extending in the direction of unit1 for
  // line.length squares.
  const debug3 = debug(x, y);

  const start: Point = { x, y };
  const end: Point = {
    x: x + unit1.x * (line.length - 1),
    y: y + unit1.y * (line.length - 1),
  };
  debug3 &&
    console.log(
      `Proposing line from [${start.x},${start.y}] to [${end.x},${end.y}] ` +
        line.map(name).join(' > ')
    );

  // Now we have to do a local check on our line for wildcards

  let w1: CardCross = { vline: [], hline: [], played: false };
  let w2: CardCross = { vline: [], hline: [], played: false };
  let valid = false;

  if (areWePlayingAWildcard) {
    const seenLines: Array<number[]> = [];
    debug3 && console.log('] Played a wildcard, need to recurse');
    recurseWildcardLines(board, line, start, end, 0, seenLines);
    if (debug3) {
      for (let i = 0; i < seenLines.length; ++i) {
        console.log('seenLine', i, seenLines[i].map(name).join(' > '));
      }
    }
    if (seenLines.length === 2) {
      if (checkTwo(seenLines[0], seenLines[1]) === false) {
        debug3 && console.log('checkTwo failed');
        return null;
      }
      debug3 && console.log('checkTwo passed');
    }
    if (seenLines.length === 3) {
      if (checkThree(seenLines[0], seenLines[1], seenLines[2]) === false) {
        debug3 && console.log('checkThree failed');
        return null;
      }
      debug3 && console.log('checkThree passed');
    }
    debug3 && console.log('] recurse check passed');
  }
  debug3 &&
    console.log(
      `-> PASSED: Proposing line from [${start.x},${start.y}] to [${end.x},${end.y}] ` +
        line.map(name).join(' > ')
    );

  /**
   * growCross has a bug: if the cross it grows in one direction touches
   * another wildcard (that isn't in this line!) then it doesn't build the
   * next line. So we need to check the new intersecting line to see if
   * THAT has a wildcard. It is a recursive process, but we only have two
   * wildcards so we could unroll it.
   */
  /*
  if (
    (w1.hline.length === 0) ||
    (w1.vline.length === 0) ||
    (w2.hline.length === 0) ||
    (w2.vline.length === 0))
    {
      debug3 && console.log("EMPTY LINE!!!!!!!!!!!!!!!!!!!!");
    }
  if (w1.played) {
    if (w1.hline.indexOf(Card.Wild_Two) >= 0) {
      debug3 && console.log(".... HLine had W1 and W2");
      valid = checkThree(w1.hline, w1.vline, w2.vline);
    } else if (w1.vline.indexOf(Card.Wild_Two) >= 0) {
      debug3 && console.log(".... VLine had W1 and W2");
      valid = checkThree(w1.vline, w1.hline, w2.hline);
    } else {
      debug3 && console.log(".... Line only had W1");
      valid = checkTwo(w1.hline, w1.vline);
    }
    if (!valid) {
      return null;
    }
  }
  if (w2.played) {
    if (w2.hline.indexOf(Card.Wild_One) >= 0) {
      valid = checkThree(w2.hline, w2.vline, w1.vline);
      debug3 && console.log(".... HLine had W2 and W1");
      debug3 && console.log("...... valid", valid);
      debug3 && console.log("...... w2.hline", w2.hline.map(name));
      debug3 && console.log("...... w2.vline", w2.vline.map(name));
      debug3 && console.log("...... w1.vline", w1.vline.map(name));
    } else if (w2.vline.indexOf(Card.Wild_One) >= 0) {
      debug3 && console.log(".... VLine had W2 and W1");
      valid = checkThree(w2.vline, w2.hline, w1.hline);
    } else {
      debug3 && console.log(".... Line only had W2");
      valid = checkTwo(w2.hline, w2.vline);
    }

    if (!valid) {
      return null;
    }
  }
  */
  score *= scoreMultiplier;
  return {
    score,
    line,
    x,
    y,
    orgx: x,
    orgy: y,
    dir: null,
    tag: Math.floor(rand() * 1024),
  };
}

/**
 * Lay down all cards to the +ve dir, starting from spot x/y, to construct a
 * contiguous line of cards, including cards that are skipped over to find
 * the next playable spot in the +ve dir, any cards touching to the +ve, and
 * any cards touching to the -ve. For example:
 *
 * Four cards to play: [i,j,k,l]
 * Board row at spot.y, playing spot.x = `?` and blank spaces are `.`:
 *
 * .................
 * ....A?.B..CD.....
 * .................
 *
 * The result is: [A, i, j, B, k, l, C, D]
 *
 * @param board A BoardObject (immutable)
 * @param x Current x location on the board
 * @param y Current y location on the board
 * @param cards Cards to play.
 * @param validLen How many cards from 0..validLen are valid?
 * @param unit The direction vector.
 * @returns BuildLateralResult type.
 */
function buildParallelLine(
  board: BoardObject,
  x: number,
  y: number,
  cards: number[],
  validLen: number,
  unit: Point
): BuildParallelResult | null {
  const line: number[] = [];
  let slide = 0;
  let c: number;
  let _x;
  let _y;

  // First, built to the +ve.
  for (let i = 0; i < validLen /* increment on play! */; ) {
    _x = x + slide * unit.x;
    _y = y + slide * unit.y;
    // c = board.at(_x, _y);
    c = board.board[_x + 48 + (_y + 48) * 97];
    // If we still have valid cards to play and we hit a dead card, fail!
    if (c === Card.Dead) {
      return null;
    }
    if (c === Card.None) {
      // If the spot is empty, add the next card.
      line.push(cards[i]);
      ++i;
    } else {
      // If it is not empty, and there are still cards to add, add one!
      line.push(c);
    }
    ++slide;
  }

  // We've played all cards, but the next spot to the +ve might have a card.
  // `slide` is already at the next square after exiting the for-loop.
  do {
    _x = x + slide * unit.x;
    _y = y + slide * unit.y;
    // c = board.at(_x, _y);
    c = board.board[_x + 48 + (_y + 48) * 97];
    if (isCard(c)) {
      // Add the cards that are touching to the +ve until an empty square.
      line.push(c);
    }
    ++slide;
  } while (isCard(c));

  // Now we have to prepend any cards we are touching to the -ve
  slide = 0;
  do {
    _x = x - (slide + 1) * unit.x;
    _y = y - (slide + 1) * unit.y;
    // We already did the current spot so start one over.
    // c = board.at(_x, _y);
    c = board.board[_x + 48 + (_y + 48) * 97];
    if (isCard(c)) {
      // Add the cards that are touching to the -ve until an empty square.
      line.unshift(c);
    }
    ++slide;
  } while (isCard(c));

  // Now we have a contiguous line of cards. This line could be huge, but it
  // isn't up to this function to resolve it.
  // If we've added cards to the -ve, let the caller know that with `slide`.
  // TODO: optimize: return null on len > 4 ASAP
  return {
    line,
    slide: slide - 1,
  };
}

/**
 * We've got a permutation to lay out at point 'spot'.
 * 1. We're going to lay it out at that spot first, and go to the +ve,
 *    building a line to examine.
 * 2. Then we're going to validate/score that line.
 * 3. Then we're going to slide to the -ve one spot, and see if we
 *    can start building there, going to step #2, until we have moved
 *    so far to the -ve that we can't play on `spot`.
 * 4. When playing cards to the +ve, we have to add existing cards to
 *    the line and skip over them to find an unplayed square.
 * 5. If we run out of cards to play as we play to the +ve, we have to
 *    append any abutting cards. The line might be very large!
 * 6. Similarly, as we slide to the -ve, if we abutt any cards, those
 *    too must be prepended.
 * We're going to creep to the -ve and build to the +ve.
 *
 * @param board BoardObject
 * @param pHand Hand to analyze
 * @param permLen How many cards in the pHand are valid (can't use .length)
 * @param spot Where we are on the board
 * @param parallel Parallel direction vector to line of play.
 * @param perpendicular Perpendicular direction vector to line of play.
 * @returns A list of possible outcomes.
 */
function scan(
  board: BoardObject,
  pHand: number[],
  permLen: number,
  spot: Point,
  parallel: Point,
  perpendicular: Point
): Outcome[] {
  const results: Outcome[] = [];
  for (let i = 0; i < permLen; ++i) {
    const _x = spot.x - i * parallel.x;
    const _y = spot.y - i * parallel.y;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (c === Card.None) {
      // Now we have a completed line that needs scoring.
      const br = buildParallelLine(board, _x, _y, pHand, permLen, parallel);
      // If the hand we're playing is illegal, don't bother
      if (br !== null) {
        const outcome = scoreVerify(
          board,
          br.line,
          _x - br.slide * parallel.x,
          _y - br.slide * parallel.y,
          pHand,
          parallel,
          perpendicular
        );
        if (outcome) {
          // All four cards played, doubles score
          if (permLen === 4) {
            outcome.score *= 2;
          }
          // The outcome needs to know if the builder added to the -ve. If
          // so, then the placement square needs to slide -ve.
          outcome.x = _x - br.slide * parallel.x;
          outcome.y = _y - br.slide * parallel.y;
          outcome.dir = parallel;
          results.push(outcome);
        }
      }
    } else {
      // We can't creep -ve parallel anymore, because we hit a card.
      // There is no point in stepping OVER this card, because the contour
      // search algorithm will have found the playable spots to the -ve
      // of this 'blockage'.
      break;
    }
  }
  return results;
}

/**
 * Look at a spot on the board and find the best play that can be made in
 * either the horizontal or vertical direction. Return that outcome, or
 * undefined if there is no outcome.
 *
 * @param board BoardObject (doesn't change)
 * @param spot x,y Point on board
 * @param hand Player's hand (does not change)
 * @returns
 */
export function considerThisSpot(
  board: BoardObject,
  spot: Point,
  hand: number[]
): Outcome | undefined {
  const results: Outcome[] = [];
  const pHand: number[] = Array(4);
  // Name the anon function to make profiling easier
  Permutes[hand.length - 1].forEach(function playPermute(permuteIndices) {
    const permLen = permuteIndices.length;
    // Using the permutation indices, construct a permuted hand from N=1 to 4
    pHand.fill(Card.None);
    for (let i = 0; i < permLen; ++i) {
      pHand[i] = hand[permuteIndices[i]];
    }
    let r;
    // Look right, creep left
    r = scan(board, pHand, permLen, spot, RT, DN);
    results.splice(0, 0, ...r);
    // Look down, creep up
    r = scan(board, pHand, permLen, spot, DN, RT);
    results.splice(0, 0, ...r);
  });
  return pickBestPlay(results);
}
