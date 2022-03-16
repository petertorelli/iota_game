import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import { Card, name } from './CardObject';
import type { Point } from './BoardObject';
import Permutes from './FasterPermute';
import { rand } from './RandomGenerator';
import * as Algs from './AnalysisFunctions';

// TODO: Picking largest play increases avg score by ~2.5pts
function pickBestPlay(options: Algs.Outcome[]): Algs.Outcome {
  // Name the anon function to make profiling easier
  const picker002 = (a: Algs.Outcome, b: Algs.Outcome) => {
    const highestScore = b.score - a.score;
    if (highestScore === 0) {
      // Longest line of scores are a tie.
      return b.line.length - a.line.length;
    } else {
      return highestScore;
    }
  }
  const best = options.sort(picker002);
  return best[0];
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
    while (count-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      }
    }
  }

  public playThisSpot(board: BoardObject, spot: Point, hand: number[]) {
    // The end result is the best outcome from this list
    const results: Algs.Outcome[] = [];
    const pHand: number[] = Array(4);
    let br: Algs.BuildLateralResult | null;
    let outcome: Algs.Outcome | null;

    // Name the anon function to make profiling easier
    Permutes[hand.length - 1].forEach(function playPermute (permuteIndices) {
      const permLen = permuteIndices.length;
      // Using the permutation indices, construct a permuted hand from N=1 to 4
      pHand.fill(Card.None);
      for (let i = 0; i < permLen; ++i) {
        pHand[i] = hand[permuteIndices[i]];
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
        // const c = board.at(_x, _y);
        const c = board.board[(_x + 48) + ((_y + 48) * 97)];
        if (c === Card.None) {
          // Now we have a completed line that needs scoring.
          br = Algs.buildLateral(board, _x, _y, pHand, permLen, Algs.RT);
          // If the hand we're playing is illegal, don't bother
          if (br !== null) {
            outcome = Algs.scoreVerify(
              board,
              br.line,
              _x,
              _y,
              pHand,
              Algs.RT,
              Algs.UP
            );
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
        // const c = board.at(_x, _y);
        const c = board.board[(_x + 48) + ((_y + 48) * 97)];
        if (c === Card.None) {
          // Now we have a completed line that needs scoring.
          br = Algs.buildLateral(board, _x, _y, pHand, permLen, Algs.UP);
          // If the hand we're playing is illegal, don't bother
          if (br !== null) {
            outcome = Algs.scoreVerify(
              board,
              br.line,
              _x,
              _y,
              pHand,
              Algs.UP,
              Algs.RT
            );
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

    return pickBestPlay(results);
  }

  /**
   * Play one hand according to the rules! The search algorithm is just a
   * one-ply lookahead. Nothing fancy. See "TODO"s for optimization ideas.
   *
   * @param deck A DeckObject, it will change as we draw from it (or return)
   * @param board A BoardObject, it will change with dead cards and plays
   */
  public playYourHand(deck: DeckObject, board: BoardObject) {
    // Find all of the playable spots on the board (the contour)
    const contour: Point[] = Algs.findContour(board);
    // Now create a list of all best plays for each contour spot
    const results: Algs.Outcome[] = [];
    // Name the anon function to make profiling easier
    const considerSpot = (spot: Point) => {
      const r = this.playThisSpot(board, spot, this.hand);
      if (r !== undefined) {
        results.push(r);
      }
    };
    contour.forEach(considerSpot);
    if (results.length === 0) {
      // If there's nothing to do, swap hands
      // TODO: strategic pass? swap fewer? Swap random to prevent deadlock.
      const r: number = rand();
      const n: number = this.hand.length;
      const nswap = Math.max(1, Math.floor(r * n));
      this.swapHand(deck, nswap);
    } else {
      const bestPlay = pickBestPlay(results);
      let i = 0;
      let ndraw = 0;
      const unitVector = bestPlay.dir;
      if (unitVector === null) {
        throw new Error('Play vector is null');
      }
      // Name the anon function to make profiling easier
      const playThisCard = (c: number) => {
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
          throw new Error(`Cannot play a card on a card! [${x}, ${y}] ${name(c)} on ${name(at)}`);
        }
        board.put(x, y, c);
        ++i;
      }
      bestPlay.line.forEach(playThisCard);
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
