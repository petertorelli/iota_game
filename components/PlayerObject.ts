import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import { Card } from './CardObject';
import type { Point } from './BoardObject';
import Permutes from './FasterPermute';
import { rand } from './RandomGenerator';

import * as Algs from './AnalysisFunctions';

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
    const results: Algs.Outcome[] = [];
    const pHand: number[] = Array(4);
    let br: Algs.BuildLateralResult | null;
    let outcome: Algs.Outcome | null;

    Permutes[hand.length - 1].forEach((permutationIndicies) => {
      const permLen = permutationIndicies.length;
      // Using the permutation indices, construct a permuted hand from N=1 to 4
      pHand.fill(Card.None);
      for (let i = 0; i < permLen; ++i) {
        pHand[i] = hand[permutationIndicies[i]];
      }
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
      for (let i = 0; i < permLen; ++i) {
        const _x = spot.x - i;
        const _y = spot.y;
        const c = board.at(_x, _y);
        if (c === Card.None) {
          // Now we have a completed line that needs scoring.
          br = Algs.buildLateral(board, _x, _y, pHand, permLen, Algs.RT);
          // If the hand we're playing is illegal, don't bother
          if (br !== null) {
            outcome = Algs.scoreVerify(board, br.line, _x, _y, pHand, Algs.RT, Algs.UP);
            if (outcome) {
              // All four cards played, doubles score AGAIN
              if (permLen === 4) {
                outcome.score *= 2;
              }
              // The outcome needs to know if the builder added to the left. If
              // so, then the placement square needs to slide left.
              outcome.x = _x - br.slide;
              outcome.dir = Algs.RT;
              results.push(outcome);
            }
          }
        } else {
          // We can't creep right anymore, because we hit a card.
          // There is no point in stepping OVER this card, because the contour
          // search algorithm will have found the playable spots to the left
          // of this 'blockage'.
          break;
        }
      } // Creep-left loop.
      // We're going to creep up and build down.
      for (let i = 0; i < permLen; ++i) {
        const _x = spot.x;
        const _y = spot.y - i;
        const c = board.at(_x, _y);
        if (c === Card.None) {
          // Now we have a completed line that needs scoring.
          br = Algs.buildLateral(board, _x, _y, pHand, permLen, Algs.UP);
          // If the hand we're playing is illegal, don't bother
          if (br !== null) {
            outcome = Algs.scoreVerify(board, br.line, _x, _y, pHand, Algs.UP, Algs.RT);
            if (outcome) {
              // All four cards played, doubles score AGAIN
              if (permLen === 4) {
                outcome.score *= 2;
              }
              // The outcome needs to know if the builder added to the left. If
              // so, then the placement square needs to slide left.
              outcome.y = _y - br.slide;
              outcome.dir = Algs.UP;
              results.push(outcome);
            }
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

    // TODO: Our current selection criteria is the highest score, ignores ties
    const bestPlay = sortedResults[0];
    return bestPlay;
  }
/* // why is making copies faster when it should be slower
// because we don't honor dead cards???
  public play(deck: DeckObject, board: BoardObject) {
    const virtualBoard = new BoardObject(board);
    const contour: Point[] = Algs.findContour(virtualBoard);
    const results: Algs.Outcome[] = [];

    contour.forEach((spot) => {
    const r = this.playThisSpot(virtualBoard, spot, virtualHand);
  */
  public play(deck: DeckObject, board: BoardObject) {
    const contour: Point[] = Algs.findContour(board);
    const results: Algs.Outcome[] = [];

    contour.forEach((spot) => {
      const r = this.playThisSpot(board, spot, this.hand);
      if (r !== undefined) {
        results.push(r);
      }
    });

    const bestPlay = results.sort((a, b) => {
      return b.score - a.score;
    })[0];

    if (bestPlay === undefined) {
      // TODO: strategic pass? swap fewer? Swap random to prevent deadlock.
      const r: number = rand();
      const n: number = this.hand.length;
      const nswap = Math.max(1, Math.floor(r * n));
      this.swapHand(deck, nswap);
    } else {
      let i = 0;
      let ndraw = 0;
      const unitVector = bestPlay.dir;
      if (unitVector === null) {
        throw new Error('Play vector is null');
      }
      bestPlay.line.forEach((c) => {
        // The best play contains cards that are ON the board too.
        const idx = this.hand.indexOf(c);
        if (idx >= 0) {
          this.hand.splice(idx, 1);
          ++ndraw;
        }
        const x = bestPlay.x + i * unitVector.x;
        const y = bestPlay.y + i * unitVector.y;
        const at = board.at(x, y);
        // Sanity check, doesn't cost a lot.
        if (at !== c && at !== Card.None) {
          throw new Error(`Cannot play a card on a card! [${x}, ${y}]`);
        }
        board.put(x, y, c);
        ++i;
      });
      if (deck.deck.length === 0 && this.hand.length === 0) {
        this.score += bestPlay.score * 2;
        // Game over.
      } else {
        this.score += bestPlay.score;
        this.draw(ndraw, deck);
      }
    }
  }
}
