import DeckObject from './DeckObject';
import BoardObject from './BoardObject';
import PlayerObject from './PlayerObject';

export default class GameObject {
  private deck = new DeckObject();
  private board = new BoardObject();
  public player1 = new PlayerObject("Player 1");
  public player2 = new PlayerObject("Player 2");
  public ply = 0;
  public results: string[] = [];
  public cannotProceed: boolean = false;
  public wins = [0, 0, 0];
  public nGames = 0;
  public timer: number = 0;
  public speedMs: number = 0;
  public isAutoPlay: boolean = false;
  constructor () {
    this.init();
  }

  public pct(i: number): string {
    if (this.nGames) {
      const pct = this.wins[i] / this.nGames * 100;
      return pct.toFixed(1) + ' %'
    } else {
      return '0.0 %';
    }
  }

  private init(name1: string = 'Player One', name2: string = 'Player Two') {
    this.board.init();
    this.deck.init();
    this.player1.init(name1);
    this.player2.init(name2);
    this.ply = 0;
    this.isAutoPlay = false;
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
    ++this.ply;

    if (this.deck.deck.length === 0) {
      if (this.player1.hand.length === 0) {
        this.cannotProceed = true;
      }
      if (this.player2.hand.length === 0) {
        this.cannotProceed = true;
      }
    }

    if (this.cannotProceed) {
      const scores = `${this.player1.score} - ${this.player2.score}`;
      const bbox = `${this.board.bbox.w} x ${this.board.bbox.h}`;
      const turns = `${this.ply}`;
      const result = `${scores} : ${bbox} : ${turns}`;
      this.results.unshift(result);
      if (this.results.length > 100) {
        this.results.pop();
      }
      this.nGames++;
      if (this.player1.score === this.player2.score) {
        this.wins[0]++;
      } else if (this.player1.score > this.player2.score) {
        this.wins[1]++;
      } else {
          this.wins[2]++;
      }
    }
  }

  private playOne() {
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

  public stopAutoPlay() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
    if (this.isAutoPlay) {
      this.isAutoPlay = false;
    }
  }

  public autoPlay(count: number = 1) {
    if (this.timer > 0) {
      return; // don't re-enter!
    }
    if (this.isAutoPlay) {
      return;
    }
    if (count === 1) {
      this.playOne();
    } else {
      let x = 0;
      this.isAutoPlay = true;
      console.log('set interval');
      this.timer = window.setInterval(() => {
        this.playOne();
        x++;
        if (x >= count) {
          clearInterval(this.timer);
          this.isAutoPlay = false;
          this.timer = 0;
        }
      }, 100);
    }
  }
}
