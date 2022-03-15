import BoardObject, { Point } from './BoardObject';
import { Card, score as cardScore, isCard } from './CardObject';

// Direction unit vectors and origin.
export const UP: Point = { x: 0, y: 1 };
export const RT: Point = { x: 1, y: 0 };
export const DN: Point = { x: 0, y: -1 };
export const LF: Point = { x: -1, y: 0 };
export const OR: Point = { x: 0, y: 0 };

// The primary search function is called a "lateral" build.
export type BuildLateralResult = {
  line: number[];
  slide: number;
};

// The result of a play is an outcome.
export type Outcome = {
  score: number;
  line: number[];
  x: number;
  y: number;
  dir: Point | null;
};

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
  board.taken.forEach((anchor) => {
    check(anchor, hSearch);
    check(anchor, vSearch);
  });

  // If there are more than 4 adjacent cards in any horizontal or vertical
  // slice then this square is dead and cannot be played for the rest of
  // the game.
  function checkDead(x: number, y: number) {
    // Count cards left/right
    let count = 0;
    let i = 1;
    while (i) {
      if (isCard(board.at(x + i, y))) {
        ++count;
        if (count > 3) {
          return true;
        }
      } else {
        // Not a card
        break;
      }
      if (isCard(board.at(x - i, y))) {
        ++count;
        if (count > 3) {
          return true;
        }
      } else {
        // Not a card
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
        // Not a card
        break;
      }
      if (isCard(board.at(x, y - i))) {
        ++count;
        if (count > 3) {
          return true;
        }
      } else {
        // Not a card
        break;
      }
      ++i;
    }
    return false;
  }

  const contour: Point[] = [];
  seen.forEach((v, _k) => {
    // Banish spaces that may never be plaid again in this game.
    if (checkDead(v.x, v.y)) {
      board.put(v.x, v.y, Card.Dead);
    } else {
      contour.push(v);
    }
  });
  return contour;
}

/**
 * An loop-unrolled comparison that checks to see if all properties are the
 * same, or if all properties are different. Can be used for validation as
 * well as basic scoring. "Basic" means no bonuses are computed.
 *
 * This is a 20x performance improvement over using Set()s and dynamic arrays.
 *
 * @param line An array of cards (64 values from 0x00-0x3f)
 * @returns 0 = invalid line or score (sum of card values without bonuses)
 */
 function baseScore(line: number[]) {
  // Putting the length check up here is ~5% faster for some reason! (Compared
  // to having a `default` case for non {2,3,4} values.)
  if (line.length > 4 || line.length < 2) {
    return 0;
  }
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

export function scoreVerify(
  board: BoardObject,
  line: number[],
  x: number,
  y: number,
  permutation: number[],
  unit1: Point,
  unit2: Point
): Outcome | null {
  let scoreMultiplier = 1;
  if (line.length > 4) {
    return null;
  }
  let score = baseScore(line);
  if (score === 0 && line.length > 1) {
    return null;
  }
  // Completed a horizontal lot
  if (line.length === 4) {
    scoreMultiplier *= 2;
  }
  // Now walk the verticals
  for (let i = 0; i < line.length; ++i) {
    const _x = x + i * unit1.x;
    const _y = y + i * unit1.y;
    const perpLine = scanPerpendicular(board, _x, _y, unit2);
    if (perpLine.length === 0) {
      continue;
    }
    perpLine.push(line[i]); // don't forget the card that should be there!
    let vscore = baseScore(perpLine);
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
  score *= scoreMultiplier;
  return {
    score,
    line,
    x,
    y,
    dir: null,
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
export function buildLateral(
  board: BoardObject,
  x: number,
  y: number,
  cards: number[],
  validLen: number,
  unit: Point
): BuildLateralResult | null {
  const line: number[] = [];
  let slide = 0;
  let c: number;

  let _x;
  let _y;
  // First, built to the right.
  for (let i = 0; i < validLen /* increment on play! */; ) {
    _x = x + slide * unit.x;
    _y = y + slide * unit.y;
    c = board.at(_x, _y);
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

  // We've played all cards, but the next spot to the right might have a card.
  // `slide` is already at the next square after exiting the for-loop.
  do {
    _x = x + slide * unit.x;
    _y = y + slide * unit.y;
    c = board.at(_x, _y);
    if (c === Card.Dead) {
      return null;
    }
    if (c !== Card.None) {
      // Add the cards that are touching to the right until an empty square.
      line.push(c);
    }
    ++slide;
  } while (c !== Card.None);

  // Now we have to prepend any cards we are touching to the left
  slide = 0;
  do {
    _x = x - (slide + 1) * unit.x;
    _y = y - (slide + 1) * unit.y;
    // We already did the current spot so start one over.
    c = board.at(_x, _y);
    if (c === Card.Dead) {
      return null;
    }
    if (c !== Card.None) {
      // Add the cards that are touching to the left until an empty square.
      line.unshift(c);
    }
    ++slide;
  } while (c !== Card.None);

  // Now we have a contiguous line of cards. This line could be huge, but it
  // isn't up to this function to resolve it.
  // If we've added cards to the LHS, let the caller know that with `slide`.
  return {
    line,
    slide: slide - 1,
  };
}

/**
 *
 * @param board BoardObject (immutable)
 * @param x Point at which to scan, x-coord
 * @param y Point at which to scan, y-coord
 * @param unit
 * @returns
 */
export function scanPerpendicular(
  board: BoardObject,
  x: number,
  y: number,
  unit: Point
) {
  // Order does NOT matter
  const line: number[] = [];
  // -ve direction
  for (let i = 1; i < 6; ++i) {
    const c = board.at(x - unit.x * i, y - unit.y * i);
    if (c === Card.None) {
      break;
    } else {
      line.push(c);
    }
  }
  // +ve direction
  for (let i = 1; i < 6; ++i) {
    const c = board.at(x + unit.x * i, y + unit.y * i);
    if (c === Card.None) {
      break;
    } else {
      line.push(c);
    }
  }
  return line;
}
  