import _ from 'lodash';

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
  x: number,
  y: number,
}

type BoundingBox = {
  ulc: Point,
  lrc: Point,
  w: number,
  h: number,
}

const BOARD_DIM = 97;
const BOARD_HALF = (BOARD_DIM - 1) / 2;
export default class BoardObject {
  public board: Array<number|null> = [];
  public debugBackground: Array<string> = [];
  public taken: Point[] = [];
  public bbox: BoundingBox = {ulc: {x: 0, y: 0}, lrc: {x: 0, y: 0}, w:0, h:0};
  constructor (initBoard: BoardObject|undefined = undefined) {
    this.board = Array(BOARD_DIM * BOARD_DIM).fill(null);
    this.init(initBoard);
  }

  public init(initBoard: BoardObject|undefined = undefined) {
    if (initBoard !== undefined) {
      this.bbox = JSON.parse(JSON.stringify(initBoard.bbox));
      this.board = [...initBoard.board];
      this.debugBackground = [...initBoard.debugBackground];
      this.taken = [...initBoard.taken]
    } else {
      this.bbox = {ulc: {x: 0, y: 0}, lrc: {x: 0, y: 0}, w:0, h:0};
      this.board.fill(null);
      this.debugBackground.fill('white');
      this.taken = [];
    }
  }

  public atP(p: Point): number|null {
    const x = p.x + BOARD_HALF;
    const y = p.y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return null;
    }
    return this.board[x + y * BOARD_DIM]
  }

  public at(_x: number, _y: number): number|null {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return null;
    }
    return this.board[x + y * BOARD_DIM]
  }

  public put(_x: number, _y: number, card: number): boolean {
    const x = _x + BOARD_HALF;
    const y = _y + BOARD_HALF;
    if (x > BOARD_DIM || x < 0 || y > BOARD_DIM || y < 0) {
      return false;
    }
    this.board[x + y * BOARD_DIM] = card;
    this.taken.push({x: _x, y: _y});
    this.setBbox();
    return true;
  }

  private setBbox() {
    if (this.taken.length === 0) {
      this.bbox = {ulc: {x: 0, y: 0}, lrc: {x: 0, y: 0}, w:0, h:0};
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
    return _.range(this.bbox.ulc.x - 2 + BOARD_HALF, this.bbox.lrc.x + 3 + BOARD_HALF);
  }

  public getYRangeA() {
    if (this.bbox.h === 0) return _.range(-2 + BOARD_HALF, 3 + BOARD_HALF);
    return _.range(this.bbox.ulc.y - 2 + BOARD_HALF, this.bbox.lrc.y + 3 + BOARD_HALF);
  }
}
