import DeckObject from './DeckObject';
import BoardObject from './BoardObject';
import PlayerObject from './PlayerObject';

export default class GameObject {
  public deck = new DeckObject();
  public board = new BoardObject();
  public player1 = new PlayerObject("Player 1");
  public player2 = new PlayerObject("Player 2");
  public ply = 0;
  public cannotProceed: boolean = false;
  public speedMs: number = 0;
  public p1bingo: number = 0;
  constructor () {
    this.init();
  }

  public init(name1: string = 'Player One', name2: string = 'Player Two') {
    this.board.init();
    this.deck.init();
    this.player1.init(name1);
    this.player2.init(name2);
    this.ply = 0;
    this.p1bingo = 0;
    this.cannotProceed = false;
    this.deal();
  }

  public deal() {
    for (let i=0; i<4; ++i) {
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
    } else {
      this.player1.play(this.deck, this.board);
    }
    if (this.ply === 0) {
      if (this.player1.score === 20) {
        this.p1bingo = 1;
      }
    }
    ++this.ply;
    if (this.deck.deck.length === 0) {
      if (this.player1.hand.length === 0) {
        this.cannotProceed = true;
      }
      if (this.player2.hand.length === 0) {
        this.cannotProceed = true;
      }
    }
  }

  public playOneGame() {
    if (this.cannotProceed) {
      this.init();
    }
    const t0 = window.performance.now();
    while (!this.cannotProceed) {
      this.turn();
    }
    const t1 = window.performance.now();
    this.speedMs = t1 - t0;
  }
}
