import DeckObject from './DeckObject';
import BoardObject from './BoardObject';
import PlayerObject from './PlayerObject';

export default class GameObject {
  private deck = new DeckObject();
  private board = new BoardObject();
  public player1 = new PlayerObject("Player 1");
  public player2 = new PlayerObject("Player 2");
  private ply = 0;
  constructor () {
    this.deal();
    // this.turn();
    // this.turn();
  }

  public deal() {
    for (let i=0; i<4; ++i) {
      this.player1.draw(1, this.deck);
      this.player2.draw(1, this.deck);
    }
  }

  public turn() {
    if (this.ply & 1) {
      this.player2.play(this.deck, this.board);
    } else {
      this.player1.play(this.deck, this.board);
    }
    ++this.ply;
  }
}
