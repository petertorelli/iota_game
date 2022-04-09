import zlib from 'zlib';
import { Masks } from './CardObject';
import DeckObject from './DeckObject';
import { BoardObject } from './BoardObject';
import PlayerObject from './PlayerObject';
import { sanityCheckBoard } from './SanityCheckBoard';

export function portableMsecTimer() {
  if (process.hrtime) {
    return Number(process.hrtime.bigint()) / 1e6;
  } else {
    return window.performance.now();
  }
}

export enum DoneReason {
  None = 0,
  Player1NoCards, // Player One ran out of cards
  Player2NoCards, // Player Two ran out of cards
  NoPlays, // Players still have cards, but no progress, and deck empty
  Deadlock, // Players still have cards, no progress, and deck not empty
  LongGame, // Really long game?
  DebugEnd, // Ending in purpose for debugging reasons.
}

export type GameResults = {
  playTime: number;
  done: boolean;
  reason: DoneReason;
  p1score: number;
  p2score: number;
  tie: boolean;
  w: number;
  h: number;
  nply: number;
  seed: number;
  nDead: number;
};

export class GameObject {
  public deck: DeckObject;
  public board = new BoardObject();
  public player1 = new PlayerObject('Player 1');
  public player2 = new PlayerObject('Player 2');
  public ply = 0;
  public cannotProceed: boolean = false;
  public reasonCannotProceed: DoneReason = DoneReason.None;
  public debug: boolean = false;
  constructor(seed: number | undefined = undefined) {
    this.deck = new DeckObject(seed);
    this.init();
  }

  public init(
    seed: number | undefined = undefined,
    name1: string = 'Player One',
    name2: string = 'Player Two'
  ) {
    this.board.init();
    this.deck.init(seed);
    this.player1.init(name1);
    this.player2.init(name2);
    this.ply = 0;
    this.cannotProceed = false;
    this.reasonCannotProceed = DoneReason.None;
    this.deal();
    const firstCard: number = this.deck.deck.shift() as number;
    this.board.put(0, 0, firstCard);
  }

  public deal() {
    for (let i = 0; i < 4; ++i) {
      this.player1.draw(1, this.deck);
      this.player2.draw(1, this.deck);
    }
  }

  public turn() {
    if (this.cannotProceed) {
      return;
    }
    if (this.ply & 1) {
      this.player2.playYourHand(this.deck, this.board);
      if (this.player2.hand.length === 0) {
        this.reasonCannotProceed = DoneReason.Player2NoCards;
        this.cannotProceed = true;
      }
    } else {
      this.player1.playYourHand(this.deck, this.board);
      if (this.player1.hand.length === 0) {
        this.reasonCannotProceed = DoneReason.Player1NoCards;
        this.cannotProceed = true;
      }
    }
    ++this.ply;
    if (this.ply >= 100) {
      this.cannotProceed = true;
      this.reasonCannotProceed = DoneReason.LongGame;
    }
  }

  public checkGame() {
    sanityCheckBoard(this.board);
  }

  public playOneGame(seed: number | undefined = undefined): GameResults {
    // Finish playing the current game, unless it is done, in which case init.
    if (this.cannotProceed) {
      this.init(seed);
    }
    const t0 = portableMsecTimer(); // performance.now();
    while (!this.cannotProceed) {
      this.turn();
    }
    const t1 = portableMsecTimer(); // performance.now();

    return {
      p1score: this.player1.score,
      p2score: this.player2.score,
      tie: this.player1.score === this.player2.score,
      playTime: t1 - t0,
      // TODO: cannotProceed is redundant with reasonCannotProceed
      done: this.cannotProceed,
      reason: this.reasonCannotProceed,
      w: this.board.bbox.w,
      h: this.board.bbox.h,
      nply: this.ply,
      seed: this.deck.seed,
      nDead: this.board.board.reduce((acc, item) => {
        return acc + (item === Masks.dead ? 1 : 0);
      }, 0),
    };
  }

  public exportGame(): string {
    const cmp = zlib.deflateSync(JSON.stringify(this));
    return cmp.toString('hex');
  }

  public importGame(game: string) {
    const buf = Buffer.from(game, 'hex');
    const obj = zlib.inflateSync(buf);
    const txt = obj.toString('ascii');
    const json = JSON.parse(txt);
    // These are the only states we care about.
    this.deck.deck = json.deck.deck;
    this.board.bbox = json.board.bbox;
    this.board.board = json.board.board;
    this.board.taken = json.board.taken;
    this.board.w1 = json.board.w1; // can't do this
    this.board.w2 = json.board.w2; // can't do this
    this.player1.hand = json.player1.hand;
    this.player1.name = json.player1.name;
    this.player1.score = json.player1.score;
    this.player1.wildcardSwaps = json.player1.wildcardSwaps;
    this.player2.hand = json.player2.hand;
    this.player2.name = json.player2.name;
    this.player2.score = json.player2.score;
    this.player2.wildcardSwaps = json.player2.wildcardSwaps;
    this.ply = json.ply;
  }
}

export default {};
