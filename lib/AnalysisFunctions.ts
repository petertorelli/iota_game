import { WildcardObject, BoardObject, Point } from './BoardObject';
import { Card, score as cardScore, isCard, name } from './CardObject';
import Permutes from './FasterPermute';
import { rand } from './RandomGenerator';
import { checkTwo, checkThree } from './SanityCheckBoard';
import * as San from './SanityCheckBoard';


// Direction unit vectors and origin.
export const UP: Point = { x: 0, y: -1 };
export const RT: Point = { x: 1, y: 0 };
export const DN: Point = { x: 0, y: 1 };
export const LF: Point = { x: -1, y: 0 };
export const OR: Point = { x: 0, y: 0 };

type BuildParallelResult = {
  line: number[];
  backup: number;
};

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

type LineDescriptor = {
  start: Point;
  end: Point;
  cards: number[];
};

let debugFlag: boolean = false;
let debugX: number | undefined;
let debugY: number | undefined;

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

/*
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
*/

function approveWildcardSwap(
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

  /**
   * There's a neat corner case here: when working in a single line, the
   * recursive dependencies will contain two lines: the first is the main
   * line, the second is a single-card line with the wildcard. Normally,
   * checkTwo and checkThree will be fine with this, but since we are altering
   * that wildcard to be a proposed card, now the mask expectations for
   * the check functions are constrained.
   * 
   * TODO: optimize checkTwo/Three so that they can handle single-card lines.
   */
  if (sl.length === 2 && sl[1].length === 1) {
    const [cm, hm, sm] = San.getMasks(sl[0]);
    sl[0][index1] = wx;
    if ((cm < 0) || (hm < 0) || (sm < 0)) {
      return false;
    } else {
      return true;
    }
  }
  
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

function getWildcardDeps(board: BoardObject, spot: Point) {
  let line: LineDescriptor = grabRealLine(board, spot, RT);
  if (line.cards.length === 1) {
    line = grabRealLine(board, spot, DN);
    if (line.cards.length === 1 && board.taken.length > 1) {
      throw new Error('A wildcard was played illegally');
    }
  }
  const seenLines: Array<number[]> = [];
  recurseWildcardLines(board, line.cards, line.start, line.end, 0, seenLines);
  return seenLines;
}

export function reclaimWildcard(
  board: BoardObject,
  wc: WildcardObject,
  hand: number[]
) {
  let success = false;
  if (wc.played) {
    const seen: Array<number[]> = getWildcardDeps(board, wc.loc);
    hand.some((card, i) => {
      if (card === Card.Wild_One || card === Card.Wild_Two) {
        return false;
      } else if (approveWildcardSwap(wc.card, card, seen)) {
        board.removeWildcardFromBoard(wc, card);
        hand[i] = wc.card;
        success = true;
        return true;
      } else {
        return false;
      }
    });
  }
  return success;
}

/*
these three functions are very similar: can we reduce them?
grabRealLine : rewinds to start of line at point and adds real cards
addCardsTowardDir : adds cards to given line (might not even be on board)
buildPerpendicular : one-step BFS in case it builds on a wildcard
buildParallel : constructs a real/hypothetical line: hand + board + spot
The all do kinda the same thing....
*/



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
 function grabRealLine(
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
    const _x = o.x - i * dir.x;
    const _y = o.y - i * dir.y;
    if (isCard(board.board[_x + 48 + (_y + 48) * 97])) {
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
    const _x = o.x - i * dir.x + j * dir.x;
    const _y = o.y - i * dir.y + j * dir.y;
    const c = board.board[_x + 48 + (_y + 48) * 97];
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

export function addCardsTowardDir(
  board: BoardObject,
  spot: Point,
  line: number[],
  dir: Point
) {
  let c: number;
  let i: number = 1;
  while (1) {
    const _x = spot.x + i * dir.x;
    const _y = spot.y + i * dir.y;
    c = board.board[_x + 48 + (_y + 48) * 97];
    if (isCard(c)) {
      if (dir.x > 0 || dir.y > 0) {
        line.push(c);
      } else {
        line.unshift(c);
      }
      ++i;
    } else {
      break;
    }
  }
}

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
function isSquareDead(board: BoardObject, x: number, y: number): boolean {
  let count = 0;
  let i = 1;
  // Count cards left and right
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
  // Count cards up and down
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
        return;
      }
      const newp = { x: p.x + search.x, y: p.y + search.y };
      if (board.atP(newp) === Card.None) {
        const key = JSON.stringify(newp);
        if (!seen.has(key)) {
          seen.set(key, newp);
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
    // Banish spaces that may never be played again in this game.
    if (isSquareDead(board, v.x, v.y)) {
      board.put(v.x, v.y, Card.Dead);
    } else {
      contour.push(v);
    }
  });
  return contour;
}

/**
 * Seems a little ridiculous to build a new line just to remove wildcards.
 * 
 * @param line Input line, possibly with wildcards
 * @returns Score of line without wilcards
 */
// Note: this added 20% more time (990us to 1120us). Dammmit.
function wildScore(line: number[]): number {
  // Note: Putting the length check up here is ~5% faster for some reason,
  //       compared to having a `default` case for non {2,3,4} values.
  if (line.length > 4 || line.length < 2) {
    // All lines must be between 2 and 4 cards to count toward the score.
    return 0;
  }
  // We can ignore wildcards: if the hand without wildcards is valid, then
  // return just the baseScore of that smaller hand subset.
  const newLine: number[] = [];
  // TODO: I think we can do this with .map()...
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

/**
 * Construct a line from a point in a direction, and if it touches wildcards
 * construct the line orthogonal that contains the wildcard. This is
 * necessary to check consistency if we modify an adjacent line.
 * 
 * @param board BoardObject (immutable)
 * @param x Point at which to scan, x-coord
 * @param y Point at which to scan, y-coord
 * @param dir
 * @returns
 */
function buildPerpendicular( // this is really a grabRealLine with 1 recursion?
  board: BoardObject,
  x: number,
  y: number,
  dir: Point,
  wildLines: Array<LineDescriptor>
) {
  const ortho: Point = { x: dir.y, y: dir.x };
  // Order does NOT matter
  const line: number[] = [];
  // -ve direction
  for (let i = 1; i < 6; ++i) {
    const _x = x - dir.x * i;
    const _y = y - dir.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (!isCard(c)) {
      break;
    } else {
      line.unshift(c);
      if (c === Card.Wild_One) {
        wildLines[0] = grabRealLine(board, { x: _x, y: _y}, ortho);
      } else if (c === Card.Wild_Two) {
        wildLines[1] = grabRealLine(board, { x: _x, y: _y}, ortho);
      }
    }
  }
  // +ve direction
  for (let i = 1; i < 6; ++i) {
    const _x = x + dir.x * i;
    const _y = y + dir.y * i;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (!isCard(c)) {
      break;
    } else {
      line.push(c);
      if (c === Card.Wild_One) {
        wildLines[0] = grabRealLine(board, { x: _x, y: _y}, ortho);
      } else if (c === Card.Wild_Two) {
        wildLines[1] = grabRealLine(board, { x: _x, y: _y}, ortho);
      }
    }
  }
  return line;
}

/**
 * Start with a line, it may be a proposed unplayed line, or an actual line on
 * the board. Then Step through that line checking for a wildcard. If a wild-
 * card is seen, DFS pivot into that new line, and check it. The goal is to
 * return either two or three lines. If only one wildcard is used, there will
 * be at most two lines: and the second line might be just a single card (the
 * wildcard itself). It is always possible for line two or three to be just
 * one card (the wildcard).
 * 
 * @param board The BoardObject.
 * @param line A real line on the board or an unplayed pre-check permutation!
 * @param p1 Start point
 * @param p2 End point
 * @param seenMask Mask of wildcards seen
 * @param seenLines Accumulating associated/dependent lines
 * @param debug Turn on debug messages from above.
 */
export function recurseWildcardLines(
  board: BoardObject,
  line: number[],
  p1: Point,
  p2: Point,
  seenMask: number,
  seenLines: Array<number[]>,
  debug: boolean = false,
) {
  seenLines.push(line);

  function pivot(wc: number) {
    // Now we need to construct a perpendicular line to this point
    const perp: Point = { x: dir.y, y: dir.x };
    // Note: this line may be PRE-CHECK line which means the cards may not
    // be on the board. This is why we use `addCardsTowardDir` rather than
    // `getLine`, the latter expects all the cards to be on the board.
    const newLine: number[] = [wc];
    addCardsTowardDir(board, { x: _x, y: _y }, newLine, perp);
    const n = newLine.length;
    addCardsTowardDir(board, { x: _x, y: _y }, newLine, { x: -perp.x, y: -perp.y });
    const diff = newLine.length - n;
    // If we added cards going in the opposite direction, backup the start
    if (diff) {
      _x = _x - diff * perp.x;
      _y = _y - diff * perp.y;
    }
    const np1: Point = { x: _x, y: _y };
    const np2: Point = {
      x: _x + perp.x * (newLine.length - 1),
      y: _y + perp.y * (newLine.length - 1),
    };
    recurseWildcardLines(board, newLine, np1, np2, seenMask, seenLines, debug);
  }
  
  const dir: Point = p1.x === p2.x ? { x: 0, y: 1 } : { x: 1, y: 0 };
  let _x = p1.x;
  let _y = p1.y;
  for (let i = 0; i < line.length; ++i) {
    _x = p1.x + i * dir.x;
    _y = p1.y + i * dir.y;
    if (line[i] === Card.Wild_One) {
      if ((seenMask & 0x1) === 0) {
        seenMask |= 0x1;
        pivot(Card.Wild_One);
      }
    } else if (line[i] === Card.Wild_Two) {
      if ((seenMask & 0x2) === 0) {
        seenMask |= 0x2;
        pivot(Card.Wild_Two);
      }
    }
  }
}

/**
 * 
 * @param board The board object.
 * @param preLine The proposed parallel line to score.
 * @param permHand The permuted hand used to construct the preLine
 * @param x Start of the pre-line x-coord
 * @param y Start of the pre-line y-coord
 * @param parallel Parallel direction vector
 * @param perpendicular Perpendicular direction vector
 * @returns 
 */
function scoreVerify(
  board: BoardObject,
  preLine: number[],
  permHand: number[],
  x: number, // slid
  y: number, // slid
  parallel: Point,
  perpendicular: Point
): Outcome | null {
  let areWePlayingAWildcard = false;
  let scoreMultiplier = 1;
  if (preLine.length > 4) {
    return null;
  }
  // Score the parallel line first
  let score = wildScore(preLine);
  if (score === 0 && preLine.length > 1) {
    return null;
  }
  // Completed a horizontal lot
  if (preLine.length === 4) {
    scoreMultiplier *= 2;
  }
  // Now walk the parallel and check the perpendiculars
  for (let i = 0; i < preLine.length; ++i) {
    areWePlayingAWildcard ||= (preLine[i] & 0xc0) === 0xc0;
    const _x = x + i * parallel.x;
    const _y = y + i * parallel.y;
    const wildLines: Array<LineDescriptor> = [];
    // The perpendicular scan won't include our card
    const perpLine = buildPerpendicular(board, _x, _y, perpendicular, wildLines);
    if (perpLine.length === 0) {
      // If there are no perpendicular lines to this card, continue
      continue;
    }
    // Now add our card to the perp line.
    perpLine.push(preLine[i]);
    // If we add a card to a wildcard line, make sure it is still consistent!
    if (wildLines[0] && wildLines[0].cards.length) {
      if (!checkTwo(wildLines[0].cards, perpLine)) {
        return null;
      }
    }
    if (wildLines[1] && wildLines[1].cards.length) {
      if (!checkTwo(wildLines[1].cards, perpLine)) {
        return null;
      }
    }
    // Now check to see if this line is valid, and if so, what is its score?
    let perpScore = wildScore(perpLine);
    if (perpScore === cardScore(preLine[i])) {
      // If the total score is the score of the card, it is just the card!
    } else if (perpScore === 0) {
      // If this play creates a bad vertical line, the whole play fails.
      return null;
    } else {
      if (perpLine.length === 4) {
        // Did we play a card that completed a vertical lot?
        // or was there already a completed veritcal lot?
        if (board.board[_x + 48 + (_y + 48) * 97] === Card.None) {
          scoreMultiplier *= 2;
        }
      }
      // Is the card we're scoring off of in the original permutation?
      if (permHand.includes(preLine[i]) === false) {
        perpScore = 0;
      }
      score += perpScore;
    }
  } // "Add perpendiculars' scores on each card" loop

  // Now we have to do a local check on our line for wildcards
  if (areWePlayingAWildcard) {
    const debug = false;
    debug && console.log(`Trying to play line at [${x},${y}] ` + preLine.map(name).join(' -> '));
    const start: Point = { x, y };
    const end: Point = {
      x: x + parallel.x * (preLine.length - 1),
      y: y + parallel.y * (preLine.length - 1),
    };
    const seenLines: Array<number[]> = [];
    recurseWildcardLines(board, preLine, start, end, 0, seenLines, debug);
    debug && console.log(' .. . .  seen length', seenLines.length);
    if (seenLines.length === 2) {
      if (checkTwo(seenLines[0], seenLines[1], debug) === false) {
        debug && console.log("^^ failed try on checkTwo");
        return null;
      }
    }
    if (seenLines.length === 3) {
      if (checkThree(seenLines[0], seenLines[1], seenLines[2], debug) === false) {
        debug &&  console.log("^^ failed try on checkThree");
        return null;
      }
    }
    debug && console.log("^^ Passed checkTwo and checkThree");
  }
  score *= scoreMultiplier;
  // This is a handy debug feature
  const tag = Math.floor(rand() * 1024);
  return {
    score,
    line: preLine,
    x,
    y,
    orgx: x,
    orgy: y,
    dir: parallel,
    tag
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
 * @param permHand Permuted hand to play.
 * @param dir The direction vector.
 * @returns BuildLateralResult type.
 */
function buildParallelLine(
  board: BoardObject,
  x: number,
  y: number,
  permHand: number[],
  dir: Point
): BuildParallelResult | null {
  const line: number[] = [];
  let ptr = 0;
  let c: number;
  let _x;
  let _y;

  // First, built to the +ve.
  for (let i = 0; i < permHand.length;  /* increment on play! */) {
    _x = x + ptr * dir.x;
    _y = y + ptr * dir.y;
    c = board.board[_x + 48 + (_y + 48) * 97];
    // If we still have valid cards to play and we hit a dead card, fail!
    if (c === Card.Dead) {
      return null;
    }
    // Add either a line card or a board card...
    if (c === Card.None) {
      line.push(permHand[i]);
      ++i;
    } else {
      line.push(c);
    }
    ++ptr;
  }

  // 5~10 ms speedup doing this compared to doing it in the above for loop.
  if (line.length > 4) {
    return null;
  }
  
  // We've played the line, but the next spot to the +ve might have a card.
  // `ptr` is already at the next square after exiting the for-loop.
  do {
    _x = x + ptr * dir.x;
    _y = y + ptr * dir.y;
    c = board.board[_x + 48 + (_y + 48) * 97];
    if (isCard(c)) {
      // Add the cards that are touching to the +ve until an empty square.
      line.push(c);
    }
    ++ptr;
  } while (isCard(c));

  // 5~10 ms speedup doing this.
  if (line.length > 4) {
    return null;
  }
  
  // Now we have to prepend any cards we are touching to the -ve
  let backup = 0;
  do {
    _x = x - (backup + 1) * dir.x;
    _y = y - (backup + 1) * dir.y;
    // We already did the current spot so start one over.
    c = board.board[_x + 48 + (_y + 48) * 97];
    if (isCard(c)) {
      // Add the cards that are touching to the -ve until an empty square.
      line.unshift(c);
    }
    ++backup;
  } while (isCard(c));
  --backup;

  // 5~10 ms speedup doing this.
  if (line.length > 4) {
    return null;
  }

  // If we've added cards to the -ve, let the caller know that with `backup`.
  return {
    line,
    backup,
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
 * @param permHand Permuted hand to analyze
 * @param spot Where we are on the board
 * @param parallel Parallel direction vector to line of play.
 * @param perpendicular Perpendicular direction vector to line of play.
 * @returns A list of possible outcomes.
 */
function scan(
  board: BoardObject,
  permHand: number[],
  spot: Point,
  parallel: Point,
  perpendicular: Point
): Outcome[] {
  const results: Outcome[] = [];
  const permLen = permHand.length;
  for (let i = 0; i < permLen; ++i) {
    const _x = spot.x - i * parallel.x;
    const _y = spot.y - i * parallel.y;
    const c = board.board[_x + 48 + (_y + 48) * 97];
    if (c === Card.None) {
      // Now we have a completed line that needs scoring.
      const br = buildParallelLine(board, _x, _y, permHand, parallel);
      // If the hand we're playing is illegal, don't bother
      if (br !== null) {
        // Now check the perpendiculars to this parallel line.
        const outcome = scoreVerify(
          board,
          br.line,
          permHand,
          // The parallel line may actual start back a few spots in the -ve dir.
          _x - br.backup * parallel.x,
          _y - br.backup * parallel.y,
          parallel,
          perpendicular
        );
        if (outcome) {
          // All four cards played, double score
          if (permLen === 4) {
            outcome.score *= 2;
          }
          // The outcome needs to know if the builder added to the -ve. If
          // so, then the placement square needs to backup -ve.
          outcome.x = _x - br.backup * parallel.x;
          outcome.y = _y - br.backup * parallel.y;
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
  } // Creep in -ve direction loop
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
  Permutes[hand.length - 1].forEach(function playPermute(permuteIndices) {
    // Using the permutation indices, construct a permuted hand from N=1 to 4
    const permHand: number[] = [];
    for (let i = 0; i < permuteIndices.length; ++i) {
      permHand.push(hand[permuteIndices[i]]);
    }
    let r;
    // Look right, creep left
    r = scan(board, permHand, spot, RT, DN);
    results.splice(0, 0, ...r);
    // Look down, creep up
    r = scan(board, permHand, spot, DN, RT);
    results.splice(0, 0, ...r);
  });
  return pickBestPlay(results);
}
