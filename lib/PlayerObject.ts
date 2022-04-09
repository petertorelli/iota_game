import { BoardObject } from './BoardObject';
import DeckObject from './DeckObject';
import { Masks, name } from './CardObject';
import type { Point } from './BoardObject';
import { rand } from './RandomGenerator';
import * as Algs from './AnalysisFunctions';

export default class PlayerObject {
  public hand: number[] = [];
  public name: string = 'Player Name';
  public score = 0;
  public wildcardSwaps = 0;
  public debug: boolean = false;
  constructor(name: string) {
    this.init(name);
  }

  public init(name: string) {
    this.hand = [];
    this.name = name;
    this.score = 0;
    this.wildcardSwaps = 0;
  }

  // TODO: When to do this strategically?
  public swapHand(deck: DeckObject) {
    // TODO: strategic pass? swap fewer? Swap random to prevent deadlock.
    const r: number = rand();
    const n: number = this.hand.length;
    let nSwap = Math.max(1, Math.floor(r * n));
    if (nSwap > deck.deck.length) {
      nSwap = deck.deck.length;
    }
    // TODO: Which cards to discard?
    deck.returnCards(this.hand, nSwap);
    this.draw(nSwap, deck);
    return true;
  }

  /**
   * Draw cards from a deck if there are any.
   *
   * @param nCards Number of cards to draw.
   * @param deck Deck to draw them from.
   */
  public draw(nCards: number, deck: DeckObject) {
    while (nCards-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      }
    }
  }

  /**
   * Given a best play outcome, actually put the cards on the board.
   *
   * @param board BoardObject (it will be modified)
   * @param bestPlay An Outcome the player chose to play.
   * @returns How many cards were played from the player's hand.
   */
  public layEmDown(board: BoardObject, bestPlay: Algs.Outcome) {
    let i = 0;
    let nDraw = 0;
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
        ++nDraw;
      }
      const x = bestPlay.x + i * unitVector.x;
      const y = bestPlay.y + i * unitVector.y;
      const at = board.at(x, y);
      // Sanity check, doesn't cost a lot.
      if (at !== c && at !== Masks.none) {
        throw new Error(
          `Cannot play a card on a card! [${x}, ${y}] ${name(c)} on ${name(at)}`
        );
      }
      // Remember: if the card is already on the board, don't `put()` it!
      if (at !== c) {
        this.debug && console.log(`${this.name} puts ${name(c)} at ${x}, ${y}`);
        board.put(x, y, c);
      }
      ++i;
    };
    bestPlay.line.forEach(playThisCard);
    return nDraw;
  }

  private reclaimWildcards(board: BoardObject) {
    if (Algs.reclaimWildcard(board, board.w1, this.hand)) {
      this.wildcardSwaps++;
    }
    if (Algs.reclaimWildcard(board, board.w2, this.hand)) {
      this.wildcardSwaps++;
    }
  }

  /**
   * Play one hand according to the rules! The search algorithm is just a
   * one-ply lookahead. Nothing fancy. See "TODO"s for optimization ideas.
   *
   * @param deck A DeckObject, it will change as we draw from it (or return)
   * @param board A BoardObject, it will change with dead cards and plays
   */
  public playYourHand(deck: DeckObject, board: BoardObject) {
    // TODO: What kind of strategy is associated with reclaiming a wildcard?
    this.reclaimWildcards(board);
    // Create a list of all best plays for each contour spot
    const results: Algs.Outcome[] = [];
    // Name the anon function to make profiling easier
    const considerSpot = (spot: Point) => {
      this.debug && console.log(`${this.name} looks at ${spot.x}, ${spot.y}`);
      const r = Algs.considerThisSpot(board, spot, this.hand);
      if (r !== undefined) {
        results.push(r);
      }
    };
    Algs.findContour(board).forEach(considerSpot);
    if (results.length === 0) {
      this.swapHand(deck);
    } else {
      const bestPlay = Algs.pickBestPlay(results);
      this.debug && console.log(`${this.name} plays`, bestPlay);
      const ndraw = this.layEmDown(board, bestPlay);
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
