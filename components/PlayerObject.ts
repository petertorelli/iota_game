import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import { score as cardScore, Card } from './CardObject';
import type { Point } from './BoardObject';

type Outcome = {
  score: number;
  line: number[];
  x: number;
  y: number;
  dir: 'u' | 'd' | 'l' | 'r';
};

// Copyright: https://www.quickperm.org/
// Switching to this from a recursive was a 2x speedup.
function permuteArray(items: number[]) {
  const a = [...items];
  const p = Array<number>(items.length).fill(0);
  const results: Array<Array<number>> = [];
  const N=items.length;
  let i;
  let j;
  let swap;

  results.push([...a]); // don't forgot to duplicate!
  i=1;
  while (i < N) {
    if (p[i] < i) {
      if (i & 1) {
        j = p[i];
      } else {
        j = 0;
      }
      swap = a[j]; a[j] = a[i]; a[i] = swap;
      results.push([...a]); // don't forgot to duplicate!
      p[i]++;
      i=1;
    } else {
      p[i] = 0;
      ++i;
    }
  }

  return results;
}

/*
// Copyright: https://www.quickperm.org/
// Switching to this from a recursive was a 2x speedup.
function *permuteGenerator(items: number[]): Generator<number[], any, number> {
  const a = [...items];
  const p = Array<number>(items.length).fill(0);
  const N=items.length;
  let i;
  let j;
  let swap;

  yield a;
  i=1;
  while (i < N) {
    if (p[i] < i) {
      if (i & 1) {
        j = p[i];
      } else {
        j = 0;
      }
      swap = a[j]; a[j] = a[i]; a[i] = swap;
      yield a;
      p[i]++;
      i=1;
    } else {
      p[i] = 0;
      ++i;
    }
  }
}
*/


/**
 * Create all possible ways to play a hand (array) of cards. This is different
 * than a permutation of K elements from set of length N, which is always length
 * N. Instead, we have to generate all permutations with length 1 ... N.
 *
 * TODO: There must be an algorithm for this, since it seems so ancient.
 *
 * @param input a set of cards to permute
 * @returns a set of permutations including holes
 */
function getAllPermutations(input: any[]) {
  const hackSeen = new Set<string>();
  const permutations = permuteArray(input);
  const output: any[] = [];
  permutations.forEach((permutation) => {
    for (let j = 0; j < permutation.length; ++j) {
      const partialPermutation = [];
      for (let k = 0; k <= j; ++k) {
        partialPermutation.push(permutation[k]);
      }
      // TODO: Hack b/c this algorithm generates duplicates, plz fix!
      // all length 4 are unique
      // all length 3 are unique
      // all length 2 appear twice
      // all length 1 appear 6 times
      const key = partialPermutation.join(',');
      if (!hackSeen.has(key)) {
        hackSeen.add(key);
        output.push(partialPermutation);
      }
    }
  });
  return output;
}

/*
function getAllPermutationsX(input: number[]) {
  const results: Array<number[]> = [];
  for (let i=1; i<16; ++i) {
    const subset: number[] = [];
    if (i & 1) { subset.push(input[0]); }
    if (i & 2) { subset.push(input[1]); }
    if (i & 4) { subset.push(input[2]); }
    if (i & 8) { subset.push(input[3]); }
    permuteArray(subset).forEach((permutation) => {
      results.push(permutation);
    })
  }
  return results;
}


function getAllPermutations(input: number[]) {
  const results: Array<number[]> = [];
  for (let i=1; i<16; ++i) {
    const subset: number[] = [];
    if (i & 1) { subset.push(input[0]); }
    if (i & 2) { subset.push(input[1]); }
    if (i & 4) { subset.push(input[2]); }
    if (i & 8) { subset.push(input[3]); }
    const gen = permuteGenerator(subset);
    while (!gen.next().done) {
      const p = gen.next().value;
      if (p) {
        results.push(p);
      }
    }
  }
  return results;
}
*/

function buildVertical(board: BoardObject, x: number, y: number) {
  // Order does NOT matter
  const vline: number[] = [];
  for (let i = 1; i < 6; ++i) {
    const c = board.at(x, y - i);
    if (c === Card.None) {
      break;
    } else {
      vline.push(c);
    }
  }
  for (let i = 1; i < 6; ++i) {
    const c = board.at(x, y + i);
    if (c === Card.None) {
      break;
    } else {
      vline.push(c);
    }
  }
  return vline;
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
function findContour(board: BoardObject): Point[] {
  const hSearch: Point[] = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  const vSearch: Point[] = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  // Since this is only called once per turn, use a Set to uniquify.
  const seen = new Map<string, Point>();

  // Helper function to reduce redundant code.
  function check(p: Point, set: Point[]) {
    set.forEach((search) => {
      const newp = { x: p.x + search.x, y: p.y + search.y };
      if (board.atP(newp) === 0) {
        const key = JSON.stringify(newp);
        if (!seen.has(key)) {
          seen.set(key, newp);
        }
      }
    });
  }

  // Default case when it is the first move.
  if (board.taken.length === 0) {
    return [{ x: 0, y: 0 }];
  }
  board.taken.forEach((anchor) => {
    check(anchor, hSearch);
    check(anchor, vSearch);
  });

  const contour: Point[] = [];
  seen.forEach((v, _k) => {
    contour.push(v);
  });
  return contour;
}

/**
 * Lay down all cards to the right, starting from spot x/y, to construct a
 * contiguous line of cards, including cards that are skipped over to find
 * the next playable spot to the right, any cards touching to the right, and
 * any cards touching to the left. For example:
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
 * @returns A line of cards (array of numbers)
 */
function buildRight(
  board: BoardObject,
  x: number,
  y: number,
  cards: number[]
): [number[], number] {
  const line: number[] = [];
  let slide = 0;
  let c: number;

  // First, built to the right.
  for (let i = 0; i < cards.length /* increment on play! */; ) {
    c = board.at(x + slide, y);
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
    c = board.at(x + slide, y);
    if (c !== Card.None) {
      // Add the cards that are touching to the right until an empty square.
      line.push(c);
    }
    ++slide;
  } while (c !== Card.None);

  // Now we have to prepend any cards we are touching to the left
  slide = 0;
  do {
    // We already did the current spot so start one over.
    c = board.at(x - (slide + 1), y);
    if (c !== Card.None) {
      // Add the cards that are touching to the left until an empty square.
      line.unshift(c);
    }
    ++slide;
  } while (c !== Card.None);

  // Now we have a contiguous line of cards. This line could be huge, but it
  // isn't up to this function to resolve it.
  // If we've added cards to the LHS, let the caller know that with `slide`.
  return [line, slide - 1];
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

export default class PlayerObject {
  public hand: number[] = [];
  public name: string = 'Player Name';
  public score = 0;
  constructor(name: string) {
    this.init(name);
  }

  public init(name: string) {
    this.hand = [];
    this.name = name;
    this.score = 0;
  }

  // TODO: When to do this strategically?
  public swapHand(deck: DeckObject, n: number) {
    if (n > deck.deck.length) {
      n = deck.deck.length;
    }
    // TODO: Which cards to discard?
    deck.returnCards(this.hand, n);
    this.draw(n, deck);
    return true;
  }

  public draw(count: number, deck: DeckObject) {
    // TODO: set draw rules?
    while (count-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      } else {
        // console.log('Out of cards, cannot draw');
      }
    }
  }

  public playThisSpot(board: BoardObject, spot: Point, hand: number[]) {
    // The end result is the best outcome from this list
    const results: Outcome[] = [];

    getAllPermutations(hand).forEach((permutation) => {
      // We've got a permutation to lay out at point 'spot'
      // 1. We're going to lay it out at that spot first, and go to the right,
      //    building a line to examine.
      // 2. Then we're going to validate/score that line.
      // 3. Then we're going to slide to the left one spot, and see if we
      //    can start building there, going to step #2, until we have moved
      //    so far to the left that we can't play on `spot`.
      // 4. When playing cards to the right, we have to add existing cards to
      //    the line and skip over them to find an unplayed square.
      // 5. If we run out of cards to play as we play to the right, we have to
      //    append any abutting cards. The line might be very large!
      // 6. Similarly, as we slide to the left, if we abutt any cards, those
      //    too must be prepended.

      // We're going to creep to the left and build to the right.
      for (let i = 0; i < permutation.length; ++i) {
        const x = spot.x - i;
        const c = board.at(x, spot.y);
        if (c === Card.None) {
          // Now we have a completed line that needs scoring.
          const [line, leftShift] = buildRight(board, x, spot.y, permutation);
          // If the hand we're playing is illegal, don't bother
          const outcome = computeScoreHoriz(line, x, spot.y, permutation);
          if (outcome !== null) {
            // All four cards played, doubles score AGAIN
            if (permutation.length === 4) {
              outcome.score *= 2;
            }
            // The outcome doesn't know that if builder added to the left.
            outcome.x = x - leftShift;
            results.push(outcome);
          }
        } else {
          // We can't creep right anymore, because we hit a card.
          // There is no point in stepping OVER this card, because the contour
          // search algorithm will have found the playable spots to the left
          // of this 'blockage'.
          break;
        }
      } // Creep-left loop.
    }); // Permutation loop

    const sortedResults = results.sort((a, b) => {
      return b.score - a.score;
    });

    // TODO: Our current selection criteria is the highest score, ignore ties
    const bestPlay = sortedResults[0];
    return bestPlay;

    // horizontal compute, look up/down
    function computeScoreHoriz(
      line: number[],
      x: number,
      y: number,
      permutation: number[],
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
        const vline = buildVertical(board, x + i, y);
        if (vline.length === 0) {
          continue;
        }
        vline.push(line[i]); // don't forget the card that should be there!
        let vscore = baseScore(vline);
        if (vscore === cardScore(line[i])) {
          // If the total score is the score of the card, it just the card.
        } else if (vscore === 0) {
          // If this play creates a bad vertical line, the whole play fails.
          return null;
        } else {
          if (vline.length === 4) {
            // Did we play a card that completed a vertical lot?
            // or was there already a completed veritcal lot?
            if (board.at(x + i, y) === Card.None) {
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
        dir: 'r',
      };
    }
  }

  public play(deck: DeckObject, board: BoardObject) {
    const virtualBoard = new BoardObject(board);
    const virtualHand = [...this.hand];
    const contour: Point[] = findContour(virtualBoard);
    const results: Outcome[] = [];

    contour.forEach((spot) => {
      const r = this.playThisSpot(virtualBoard, spot, virtualHand);
      if (r !== undefined) {
        results.push(r);
      }
    });

    const bestPlay = results.sort((a, b) => {
      return b.score - a.score;
    })[0];
    
    if (bestPlay === undefined) {
      // TODO: strategic pass? swap fewer? Swap random to prevent deadlock.
      const r: number = deck.rand.next().value;
      const n: number = this.hand.length;
      const nswap = Math.max(1, Math.floor(r * n));
      this.swapHand(deck, nswap);
    } else {
      let i = 0;
      let ndraw = 0;
      bestPlay.line.forEach((c) => {
        // The best play contains cards that are ON the board too.
        const idx = this.hand.indexOf(c);
        if (idx >= 0) {
          this.hand.splice(idx, 1);
          ++ndraw;
        }
        const x = bestPlay.x + i;
        const y = bestPlay.y;
        const at = board.at(x, y);
        // Sanity check, doesn't cost a lot.
        if (at !== c && at !== Card.None) {
          throw new Error(`Cannot play a card on a card! [${x}, ${y}]`);
        }
        board.put(x, y, c);
        ++i;
      });
      if (deck.deck.length === 0 && this.hand.length === 0) {
        this.score += (bestPlay.score * 2);
        // Game over.
      } else {
        this.score += bestPlay.score;
        this.draw(ndraw, deck);
      }
    }
  }
}
