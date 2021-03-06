import _ from 'lodash';
import { Masks } from './CardObject';
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
export class WildcardObject {
  public loc: Point = { x: 0, y: 0 };
  public played: boolean = false;
  public card: number;

  public constructor(card: number) {
    this.card = card;
  }

  public cache(x: number, y: number) {
    this.played = true;
    this.loc.x = x;
    this.loc.y = y;
  }
}

export const BOARD_DIM = 97; // After 1Million games 25 is the largest width/height
export const BOARD_HALF = (BOARD_DIM - 1) / 2;
export class BoardObject {
  public board: number[];
  public taken: Point[] = [];
  public w1: WildcardObject = new WildcardObject(Masks.wildcard_one);
  public w2: WildcardObject = new WildcardObject(Masks.wildcard_two);
  public bbox: BoundingBox = {
    ulc: { x: 0, y: 0 },
    lrc: { x: 0, y: 0 },
    w: 0,
    h: 0,
  };

  constructor() {
    this.board = Array(BOARD_DIM * BOARD_DIM).fill(Masks.none);
    this.init();
  }

  public init() {
    this.bbox = { ulc: { x: 0, y: 0 }, lrc: { x: 0, y: 0 }, w: 0, h: 0 };
    this.board.fill(Masks.none);
    this.taken = [];
    this.w1.played = false;
    this.w2.played = false;
  }

  public atP(p: Point): number {
    return this.at(p.x, p.y);
  }

  // TODO: Doing the [] lookup directly is a 10~15% perf increase over this!!!
  public at(_x: number, _y: number): number {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return Masks.none;
    }
    const card = this.board[x + y * BOARD_DIM];
    return card === null ? Masks.none : card;
  }

  public removeWildcardFromBoard(w: WildcardObject, card: number) {
    const x = w.loc.x + BOARD_HALF;
    const y = w.loc.y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      throw new Error('Attempted to replace a wildcard out of bounds');
    }
    this.board[x + y * BOARD_DIM] = card;
    w.played = false;
  }

  // TODO: Should add a check to make sure not putting a card on a card?
  public put(_x: number, _y: number, card: number): boolean {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return false;
    }
    this.board[x + y * BOARD_DIM] = card;
    this.taken.push({ x: _x, y: _y });
    this.setBbox();
    if (card === Masks.wildcard_one) {
      this.w1.cache(_x, _y);
    } else if (card === Masks.wildcard_two) {
      this.w2.cache(_x, _y);
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
