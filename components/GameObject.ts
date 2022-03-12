import zlib from 'zlib';

import DeckObject from './DeckObject';
import BoardObject from './BoardObject';
import PlayerObject from './PlayerObject';

export enum DoneReason {
  None = 0,
  Player1NoCards, // Player One ran out of cards
  Player2NoCards, // Player Two ran out of cards
  NoPlays, // Players still have cards, but no progress, and deck empty
  Deadlock, // Players still have cards, no progress, and deck not empty
  LongGame, // Really long game?
}

export type GameResults = {
  playTime: number;
  done: boolean;
  reason: DoneReason;
};

export class GameObject {
  public deck = new DeckObject();
  public board = new BoardObject();
  public player1 = new PlayerObject('Player 1');
  public player2 = new PlayerObject('Player 2');
  public ply = 0;
  public cannotProceed: boolean = false;
  public reasonCannotProceed: DoneReason = DoneReason.None;
  constructor() {
    this.init();
  }

  public init(name1: string = 'Player One', name2: string = 'Player Two') {
    this.board.init();
    this.deck.init();
    this.player1.init(name1);
    this.player2.init(name2);
    this.ply = 0;
    this.cannotProceed = false;
    this.reasonCannotProceed = DoneReason.None;
    this.deal();
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
      this.player2.play(this.deck, this.board);
      if (this.player2.hand.length === 0) {
        this.reasonCannotProceed = DoneReason.Player2NoCards;
        this.cannotProceed = true;
      }
    } else {
      this.player1.play(this.deck, this.board);
      if (this.player1.hand.length === 0) {
        this.reasonCannotProceed = DoneReason.Player1NoCards;
        this.cannotProceed = true;
      }
    }
    ++this.ply;
    if (this.ply > 150) {
      this.cannotProceed = true;
      this.reasonCannotProceed = DoneReason.LongGame;
    }
  }

  public playOneGame(): GameResults {
    if (this.cannotProceed) {
      this.init();
    }
    const t0 = window.performance.now();
    while (!this.cannotProceed) {
      this.turn();
    }
    const t1 = window.performance.now();
    return {
      playTime: t1 - t0,
      // TODO: cannotProceed is redundant with reasonCannotProceed
      done: this.cannotProceed,
      reason: this.reasonCannotProceed,
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
    this.player1.hand = json.player1.hand;
    this.player1.name = json.player1.name;
    this.player1.score = json.player1.score;
    this.player2.hand = json.player2.hand;
    this.player2.name = json.player2.name;
    this.player2.score = json.player2.score;
    this.ply = json.ply;
  }
}

export default {};
