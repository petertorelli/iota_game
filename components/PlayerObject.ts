import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import UNWRAP from './Utilities';
import * as card from './CardObject';

type Geometry = {
  direction: 'up'|'down'|'left'|'right',
  distance: number,
  x: number,
  y: number
}

type ScoredHandPlay = [number, number[]];
type ScoredHandPlays = ScoredHandPlay[];

function PCARDS(_hdr: string, c: number[]) {
  let text = "";
  // console.log(_hdr, "-->");
  c.forEach(cc => {
    text += card.name(cc) + '\n';
  });
  // console.log(text);
  // console.log(hdr, "<--");
}

function scoreLine (existing: number[], hand: number[], max: number) {
  const ratedPlays: ScoredHandPlays = [];
  const ncards = hand.length;
  const npermutes = 2 ** ncards;
  
  // console.log('existing', UNWRAP(existing));
  // console.log('hand', UNWRAP(hand));
  // construct a hand, score, add to Map<number, string>, sort Map<key>
  for (let i=0; i<npermutes; ++i) {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const scores = new Set<number>();
    let count = 0;
    // Add existing cards to Sets, we don't permute these.
    for (let j=0; j<existing.length; ++j) {
      ++count;
      colors.add(card.color(existing[j]));
      shapes.add(card.shape(existing[j]));
      scores.add(card.score(existing[j]));
    }
    const toPlay = [];
    const debugToPlay = [];
    // TODO: Start on j=1, 0 is always 0 cards!
    for (let j=0; j<ncards; ++j) {
      if (i & (1 << j)) {
        ++count;
        colors.add(card.color(hand[j]));
        shapes.add(card.shape(hand[j]));
        scores.add(card.score(hand[j]));
        toPlay.push(j);
        debugToPlay.push(hand[j]);
      }
    }
    // TODO: lots of wasted work here.
    if (count < 2 || count > 4) {
      continue;
    }
    if (toPlay.length > max) {
      // console.log('abort max');
      continue;
    }
    if (
      (colors.size === 1 && shapes.size === 1 && scores.size === 1) ||
      (colors.size === 1 && shapes.size === 1 && scores.size === count) ||
      (colors.size === 1 && shapes.size === count && scores.size === 1) ||
      (colors.size === 1 && shapes.size === count && scores.size === count) ||
      (colors.size === count && shapes.size === 1 && scores.size === 1) ||
      (colors.size === count && shapes.size === 1 && scores.size === count) ||
      (colors.size === count && shapes.size === count && scores.size === 1) ||
      (colors.size === count && shapes.size === count && scores.size === count)
    ) {
      let handScore = 0;
      if (scores.size === 1) {
        // If all the scores are the same, it is count * the value
        handScore = count * scores.values().next().value;
      } else {
        // Otherwise the scores are different, so sum them
        for (const score of scores) {
          handScore += score;
        }
      }
      // Bonus for playing all four cards
      if (toPlay.length === 4) {
        handScore *= 2;
      }
      ratedPlays.push([handScore, toPlay]);
    }
  }
  return ratedPlays;
}

export default class PlayerObject {
  public hand: number[] = [];
  public name: string = 'Player Name';
  public score = 0;
  constructor (name: string) {
    this.init(name);
  }

  public init(name: string) {
    this.hand = [];
    this.name = name;
    this.score = 0;
  }

  // TODO: When to do this strategically?
  public swapHand (deck: DeckObject) {
    if (this.hand.length > deck.deck.length) {
      return false;
    }
    const n = this.hand.length;
    deck.returnCards(this.hand);
    this.hand = [];
    this.draw(n, deck);
    return true;
  }

  public draw (count: number, deck: DeckObject) {
    // TODO: set draw rules
    while (count-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      } else {
        // console.log('Out of cards, cannot draw');
      }
    }
  }

  public findBoardPlays (board: BoardObject) {
    const plays: Array<number[]> = [];
    const geometry: Geometry[] = [];
    // console.log(' ... find board plays');
    board.taken.forEach(coord => {
      const cc = board.at(coord.x, coord.y);
      if (cc) {
        // console.log('Look at', card.name(cc));
        const x = coord.x;
        const y = coord.y;

        let d = 0;

        // How far to the next card? 4, or N-1 where the next card is at N
          // How many cards in the opposite direction

        // ------------------ UP
        d = 0;
        while (++d < 3) {
          if (board.at(x, y-d) !== null) {
            --d;
            break;
          }
          // The next square in this direction is free, but does it have
          // neighbors?
          if (board.at(x, y-d-1) ||
              board.at(x+1, y-d) ||
              board.at(x-1, y-d))
          {
            // card. shit.
            --d;
            break;
          }
        }
        if (d) {
        const scan: number[] = [];
        let s = 0;
          while (1) {
            const sc = board.at(x, y+s);
            ++s;
            if (sc !== null && card.isCard(sc)) {
              scan.push(sc);
            } else {
              break;
            }
          }
          if (scan.length < 4) {
            plays.push(scan);
            d = Math.min(4 - scan.length, d);
            geometry.push({ direction: 'up', distance: d, x, y: y-1});
            // console.log(UNWRAP(geometry[geometry.length-1]));
          }
        }
        // ------------------ DOWN
        d = 0;
        while (++d < 3) {
          if (board.at(x, y+d) !== null) {
            --d;
            break;
          }
          // The next square in this direction is free, but does it have
          // neighbors?
          if (board.at(x, y+d+1) ||
              board.at(x+1, y+d) ||
              board.at(x-1, y+d))
          {
            // card. shit.
            --d;
            break;
          }
        }
        if (d) {
          const scan: number[] = [];
          let s = 0;
          while (1) {
            const sc = board.at(x, y-s);
            ++s;
            if (sc !== null && card.isCard(sc)) {
              scan.push(sc);
            } else {
              break;
            }
          }
          if (scan.length < 4) {
            plays.push(scan);
            d = Math.min(4 - scan.length, d);
            geometry.push({ direction: 'down', distance: d, x, y: y+1});
            // console.log(UNWRAP(geometry[geometry.length-1]));
          }
        }        
        // ------------------ LEFT
        d = 0;
        while (++d < 3) {
          if (board.at(x-d, y) !== null) {
            --d;
            break;
          }
          // The next square in this direction is free, but does it have
          // neighbors?
          if (board.at(x-d-1, y) ||
              board.at(x-d, y+1) ||
              board.at(x-d, y-1))
          {
            // card. shit.
            --d;
            break;
          }
        }
        if (d) {
          const scan: number[] = [];
          let s = 0;
          while (1) {
            const sc = board.at(x+s, y);
            ++s;
            if (sc !== null && card.isCard(sc)) {
              scan.push(sc);
            } else {
              break;
            }
          }
          if (scan.length < 4) {
            plays.push(scan);
            d = Math.min(4 - scan.length, d);
            geometry.push({ direction: 'left', distance: d, x: x-1, y});
            // console.log(UNWRAP(geometry[geometry.length-1]));
          }
        }        
        // ------------------ RIGHT
        d = 0;
        while (++d < 3) {
          if (board.at(x+d, y) !== null) {
            --d;
            break;
          }
          // The next square in this direction is free, but does it have
          // neighbors?
          if (board.at(x+d+1, y) ||
              board.at(x+d, y+1) ||
              board.at(x+d, y-1))
          {
            // card. shit.
            --d;
            break;
          }
        }
        if (d) {
          const scan: number[] = [];
          let s = 0;
          while (1) {
            const sc = board.at(x-s, y);
            ++s;
            if (sc !== null && card.isCard(sc)) {
              scan.push(sc);
            } else {
              break;
            }
          }
          if (scan.length < 4) {
            plays.push(scan);
            d = Math.min(4 - scan.length, d);
            geometry.push({ direction: 'right', distance: d, x: x+1, y});
            // console.log(UNWRAP(geometry[geometry.length-1]));
          }
        }   
      } else {
        // console.log('no card');
      }
    });
    // There are no cards to play, hence the board is open
    if (plays.length === 0) {
      plays.push([]);
      // default to play RIGHT at 0,0
      geometry.push({direction: 'right', distance: 4, x: 0, y: 0});
    }
    for (let i=0; i<plays.length;++i) {
      // console.log(`:: Option ${i} ::`, UNWRAP(plays[i].map(x => card.name(x))), UNWRAP(geometry[i]));
    }
    // console.log(' ... done looking at board');
    return {plays, geometry};
  }

  public play (deck: DeckObject, board: BoardObject) {
    // console.log('--- player "', this.name, '" start ---');
    PCARDS('hand', this.hand);
    // console.log('--- player thinking ---');
    const survey = this.findBoardPlays(board);
    const summary: Array<any> = [];
    survey.plays.forEach((anchorLine, ii) => {
      // console.log('>> construct new analysis line');
      PCARDS('anchorLine', anchorLine);
      const proposal = scoreLine(anchorLine, this.hand, survey.geometry[ii].distance);
      proposal.forEach(scoredPlay => {
        if (scoredPlay[1].length > 0) {
          summary.push({ sp: scoredPlay, geo: survey.geometry[ii], index: ii});
          // console.log(UNWRAP(summary[summary.length-1]));;
        }
      })
    });
    const sortedSummary = summary.sort((a, b) => {
      // TODO: choose smallest hand in tie, or largest?
      return b.sp[0] - a.sp[0];
    });
    // console.log('sortedSummary:');
    // console.log(UNWRAP(sortedSummary));
    // console.log('--- player choosing ---');

    if (sortedSummary.length > 0) {
      const chosenPlay = sortedSummary[0];
      const score = chosenPlay.sp[0];
      // TODO: Double check final move and all card plays!
      this.score += score;
      const play: number[] = [];
      const mhand: Array<number|null> = [...this.hand];
      // TODO: Wow, this is overly complicated.
      for (const i of chosenPlay.sp[1]) {
        const c = this.hand[i];
        if (c) {
          play.push(c);
          mhand[i] = null;
        }
      }
      // console.log('play', UNWRAP(play));
      this.hand = mhand.filter(card => card !== null) as number[];
      // TODO: As is or shuffled?
      const geo = survey.geometry[chosenPlay.index];
      // console.log(geo);
      // console.log('playGeo', UNWRAP(geo));
      const startx = geo.x;
      const starty = geo.y;
      switch (geo.direction) {
        case 'up':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx, starty - i, play[i]);
          }
          break;
        case 'down':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx, starty + i, play[i]);
          }
          break;
        case 'left':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx - i, starty, play[i]);
          }
          break;
        case 'right':
          for (let i = 0; i < play.length; ++i) {
            board.put(startx + i, starty, play[i]);
          }
          break;
        default: break;
      }
      this.draw(play.length, deck);
    } else {
      this.swapHand(deck);
    }
    // console.log('--- player "', this.name, '" done ---');
  }
}
