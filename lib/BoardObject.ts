import _ from 'lodash';
import { Card, name } from './CardObject';
import { growCards, mergeTwo, mergeThree } from './SanityCheckBoard';
import * as Algs from './AnalysisFunctions';
/*
The largest possible board is derived from the most number of plays in any
one direction:

1234
   5678
      8abcd
          ef..

Which would be 16 rows of 4 cards. Each row after the first moves to the right
three cards. The max number of card places would be: 4 + 15 * 3, or 49.

If we went backwards it would be 48 squares the other way. So the total
max width is 48 + 49 or 97 squares.

To be safe, assume the board is 97 x 97, or 9409 squares.
*/

export type Point = {
  x: number;
  y: number;
};

type BoundingBox = {
  ulc: Point;
  lrc: Point;
  w: number;
  h: number;
};

// It is easier to cache the wildcards than seek them out
class WildCard {
  public loc: Point = { x: 0, y: 0 };
  public played: boolean = false;
  public hline: number[] = [];
  public vline: number[] = [];
  public masks: [number, number, number] = [-1, -1, -1];

  public reset() {
    this.played = false;
    this.hline = [];
    this.vline = [];
    this.masks = [-1, -1, -1];
  }

  public cache(board: BoardObject, x: number, y: number, c: number) {
    this.played = true;
    this.loc.x = x;
    this.loc.y = y;
    //console.log("Cached card at", x, y);
    this.masks = [-1, -1, -1];
    this.regrow(board);
  }

  // this needs to recursively check massk

  public regrow(board: BoardObject) {
    this.hline = [];
    this.vline = [];
    growCards(board, this.loc, this.hline, Algs.LF);
    growCards(board, this.loc, this.hline, Algs.RT);
    growCards(board, this.loc, this.vline, Algs.UP);
    growCards(board, this.loc, this.vline, Algs.DN);
  }
}

export const BOARD_DIM = 97; // After 1Million games 25 is the largest width/height
export const BOARD_HALF = (BOARD_DIM - 1) / 2;
export default class BoardObject {
  public board: number[];
  public taken: Point[] = [];
  public w1: WildCard = new WildCard();
  public w2: WildCard = new WildCard();
  public bbox: BoundingBox = {
    ulc: { x: 0, y: 0 },
    lrc: { x: 0, y: 0 },
    w: 0,
    h: 0,
  };

  constructor() {
    this.board = Array(BOARD_DIM * BOARD_DIM).fill(Card.None);
    this.init();
  }

  public init() {
    this.bbox = { ulc: { x: 0, y: 0 }, lrc: { x: 0, y: 0 }, w: 0, h: 0 };
    this.board.fill(Card.None);
    this.taken = [];
    this.w1.reset();
    this.w2.reset();
  }

  public atP(p: Point): number {
    const x = p.x + BOARD_HALF;
    const y = p.y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return Card.None;
    }
    const card = this.board[x + y * BOARD_DIM];
    return card === null ? Card.None : card;
  }

  // TODO: Doing the [] lookup directly is a 10~15% perf increase over this!
  public at(_x: number, _y: number): number {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return Card.None;
    }
    const card = this.board[x + y * BOARD_DIM];
    return card === null ? Card.None : card;
  }

  public replaceWildCard(w: WildCard, card: number) {
    const x = w.loc.x + BOARD_HALF;
    const y = w.loc.y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      throw new Error('Attempted to replace a wildcard out of bounds');
    }
    this.board[x + y * BOARD_DIM] = card;
    w.played = false;
  }

  private updateWildCardMasks() {
    if (this.w1.played) {
      this.w1.regrow(this);
      if (this.w1.hline.indexOf(Card.Wild_Two) >= 0) {
        this.w1.masks = mergeThree(this.w1.hline, this.w1.vline, this.w2.vline);
      } else if (this.w1.vline.indexOf(Card.Wild_Two) >= 0) {
        this.w1.masks = mergeThree(this.w1.vline, this.w1.hline, this.w2.hline);
      } else {
        this.w1.masks = mergeTwo(this.w1.hline, this.w1.vline);
      }
      // console.log(this.w1.masks, this.w1.hline, this.w1.vline);
    }
    if (this.w2.played) {
      this.w1.regrow(this);
      if (this.w2.hline.indexOf(Card.Wild_One) >= 0) {
        this.w2.masks = mergeThree(this.w2.hline, this.w2.vline, this.w1.vline);
      } else if (this.w2.vline.indexOf(Card.Wild_One) >= 0) {
        this.w2.masks = mergeThree(this.w2.vline, this.w2.hline, this.w1.hline);
      } else {
        this.w2.masks = mergeTwo(this.w2.hline, this.w2.vline);
      }
    }
  }

  public put(_x: number, _y: number, card: number): boolean {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return false;
    }
    this.board[x + y * BOARD_DIM] = card;
    this.taken.push({ x: _x, y: _y });
    this.setBbox();
    if (card === Card.Wild_One) {
      //console.log("cache WC1");
      this.w1.cache(this, _x, _y, card);
    } else if (card === Card.Wild_Two) {
      //console.log("cache WC2");
      this.w2.cache(this, _x, _y, card);
    }
    if (this.w1.played || this.w2.played) {
      // console.log('putting', name(card))
      this.updateWildCardMasks();
    }
    return true;
  }

  private setBbox() {
    if (this.taken.length === 0) {
      this.bbox = { ulc: { x: 0, y: 0 }, lrc: { x: 0, y: 0 }, w: 0, h: 0 };
    } else {
      const P = this.taken[this.taken.length - 1];
      this.bbox.ulc.x = Math.min(this.bbox.ulc.x, P.x);
      this.bbox.ulc.y = Math.min(this.bbox.ulc.y, P.y);
      this.bbox.lrc.x = Math.max(this.bbox.lrc.x, P.x);
      this.bbox.lrc.y = Math.max(this.bbox.lrc.y, P.y);
      this.bbox.w = this.bbox.lrc.x - this.bbox.ulc.x + 1;
      this.bbox.h = this.bbox.lrc.y - this.bbox.ulc.y + 1;
    }
  }

  public undo() {
    this.board.pop();
    this.taken.pop();
    this.setBbox();
  }

  public getXRange() {
    if (this.bbox.w === 0) return _.range(-2, 3);
    return _.range(this.bbox.ulc.x - 2, this.bbox.lrc.x + 3);
  }

  public getYRange() {
    if (this.bbox.h === 0) return _.range(-2, 3);
    return _.range(this.bbox.ulc.y - 2, this.bbox.lrc.y + 3);
  }

  public getXRangeA() {
    if (this.bbox.w === 0) return _.range(-2 + BOARD_HALF, 3 + BOARD_HALF);
    return _.range(
      this.bbox.ulc.x - 2 + BOARD_HALF,
      this.bbox.lrc.x + 3 + BOARD_HALF
    );
  }

  public getYRangeA() {
    if (this.bbox.h === 0) return _.range(-2 + BOARD_HALF, 3 + BOARD_HALF);
    return _.range(
      this.bbox.ulc.y - 2 + BOARD_HALF,
      this.bbox.lrc.y + 3 + BOARD_HALF
    );
  }
}
