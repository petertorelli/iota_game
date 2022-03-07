import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import { name as cardName } from './CardObject';
import UNWRAP from './Utilities';
import * as card from './CardObject';
import type { Point } from './BoardObject';

type Geometry = {
  direction: 'up'|'down'|'left'|'right',
  distance: number,
  x: number,
  y: number
}

type Outcome = {
  score: number,
  line: number[],
  x: number,
  y: number,
  dir: 'u'|'d'|'l'|'r',
}

type ScoredHandPlay = [number, number[]];
type ScoredHandPlays = ScoredHandPlay[];

function PCARDS(_hdr: string, _c: Array<number|null>) {
  let text = "";
  console.log(_hdr, "-->");
  _c.forEach(cc => {
    if (cc === null) {
      text += "null\n";
    } else {
      text += card.name(cc) + '\n';
    }
  });
  console.log(text);
  console.log(_hdr, "<--");
}

function baseScore(line: number[]): number {
  const A = new Set<number>(); // These are the scores
  const B = new Set<number>();
  const C = new Set<number>();
  const N = line.length;
  let score = 0;
  line.forEach(c => {
    A.add(((c >> 0) & 0x3) + 1);
    B.add((c >> 2) & 0x3);
    C.add((c >> 4) & 0x3);
  });
  
  if (
    (A.size === 1 && B.size === 1 && C.size === 1) ||
    (A.size === 1 && B.size === 1 && C.size === N) ||
    (A.size === 1 && B.size === N && C.size === 1) ||
    (A.size === 1 && B.size === N && C.size === N) ||
    (A.size === N && B.size === 1 && C.size === 1) ||
    (A.size === N && B.size === 1 && C.size === N) ||
    (A.size === N && B.size === N && C.size === 1) ||
    (A.size === N && B.size === N && C.size === N)
  ) {
    if (A.size === 1) {
      // If all the scores are the same, it is count * the value
      score = N * A.values().next().value;
    } else {
      // Otherwise the scores are different, so sum them
      for (const cardScore of A) {
        score += cardScore;
      }
    }
  }
  return score;
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

  /**
   * Takes a point on the board (where a card is present!) and evaluates if
   * that position's score. If the position is not legal, the score is zero.
   * It looks in both horizontal and vertical directions for valid lines.
   * 
   * @param board A BoardObject to analyze.
   * @param p A point on the board.
   */
  private getScoresAt(board: BoardObject, p: Point) {
    console.log('Score board at', p.x, p.y);
    let line: number[];
    let card;
    let horizontalScore = 0;
    let verticalScore = 0;
    
    line = [];
    // Construct horizontal line
    for (let i=0; ; ++i) {
      card = board.at(p.x + i, p.y);
      if (card !== null) {
        line.push(card);
      } else {
        break;
      }
    }
    for (let i=1; ; ++i) {
      card = board.at(p.x - i, p.y);
      if (card !== null) {
        line.push(card);
      } else {
        break;
      }
    }
    if (line.length > 0 && line.length <= 4) {
      horizontalScore = baseScore(line);
      console.log('hline', line, '=', horizontalScore);
    }
    line = [];
    // Construct vertical line
    for (let i=0; ; ++i) {
      card = board.at(p.x, p.y + i);
      if (card !== null) {
        line.push(card);
      } else {
        break;
      }
    }
    for (let i=1; ; ++i) {
      card = board.at(p.x, p.y - i);
      if (card !== null) {
        line.push(card);
      } else {
        break;
      }
    }
    if (line.length > 0 && line.length <= 4) {
      verticalScore = baseScore(line);
      console.log('vline', line, '=', verticalScore);
    }
    return [horizontalScore, verticalScore];
  }

  public playHorizontal(board: BoardObject, p: Point, hand: number[]) {
    const card = hand.pop();
    if (card) {
      board.put(p.x, p.y, card);
      const [hs, vs] = this.getScoresAt(board, p);
      return [hs, vs];
    }
    return []
  }

  private findContour(board: BoardObject, constrain = 3, P: Point|undefined = undefined) {
    const hSearch: Point[] = [{x: -1, y: 0}, {x: 1, y:  0}];
    const vSearch: Point[] = [{x:  0, y: 1}, {x: 0, y: -1}];
    const contour: Point[] = [];

    function check(p: Point, set: Point[]) {
      set.forEach(search => {
        const newp = {x: p.x + search.x, y: p.y + search.y};
        if (board.atP(newp) === null) {
          contour.push(newp);
        }
      })
    }

    if (board.taken.length === 0) {
      contour.push({x: 0, y: 0});
    } else {
      let todo: Point[];
      if (P !== undefined) {
        todo = [P];
      } else {
        todo = board.taken;
      }
      todo.forEach(anchor => {
        if (constrain & 1) {
          check(anchor, hSearch);
        }
        if (constrain & 2) {
          check(anchor, vSearch);
        }
      })
    }

    // TODO: This needs to be UNIQUIFIED to reduce redundant work
    return contour;
  }
  
  public playThisSpot(board: BoardObject, p: Point, hand: number[]) {
    const rline: Array<number|null> = [];
    const lline: Array<number|null> = [];
    let n;
    const seen = new Set<string>();

    n = 0;
    for (let x = 1; ; ++x) {
      const cc = board.at(p.x + x, p.y);
      if (cc === null) {
        ++n;
      }
      if (n >= 4 || rline.length > 4) {
        break;
      }
      // we'll check terminator later
      rline.push(cc);
    }

    n = 0;
    for (let x = 1; ; ++x) {
      const cc = board.at(p.x - x, p.y);
      if (cc === null) {
        ++n;
      }
      if (n >= 4 || lline.length > 4) {
        break;
      }
      // we'll check terminator later
      lline.unshift(cc);
    }

    function makeMask(set: Array<number|null>, fill: number=1): number[] {
      const mask = Array(set.length).fill(0);
      for (let i=0; i<set.length; ++i) {
        mask[i] = set[i] === null ? 0 : fill;
      }
      return mask;
    }
    const center = lline.length;
    const full = [...lline, null, ...rline];
    const mask = makeMask(full, 1);

    function findHole(a: number[], b: number[]) {
      // 0 = no card
      // 1 = starting mask
      // 2 = mask after play
      // 3 = user played a card here
      const sum = Array(a.length).fill(0);
      for (let i=0; i<a.length; ++i) {
        sum[i] = a[i] + b[i];
      }
      let inside = 0;
      let n = 0;
      // Look for a hole in between two user plays
      for (let i=0; i<sum.length; ++i) {
        switch (inside) {
          case 0: // haven't seen a user card
            if (sum[i] === 2) {
              inside = 1;
            }
            break;
          case 1: // in a user line
            if (sum[i] === 0) {
              inside = 2;
            }
            break;
          case 2: // exited a user line
            if (sum[i] === 2) {
              return true;
            }
            break;
          default:
            break;
        }
        n = sum[i] === 0 ? 0 : n + 1;
        // Too many cards in a series, not a hole but a fail
        if (n > 4) {
          return true;
        }
      }
      return false;
    }


    function permute3(_hand: Array<number>, _base: Array<number|null>, center: number, mask: number[]) {
      const test = [..._base];
      const hand = [..._hand];

      for (let k=0; k<hand.length; ++k) {
        const removed = hand.splice(k, 1);
        for (let i=0; i<test.length; ++i) {
          let y=0;
          if (test[i] === null) {
            y=1;
            test[i] = removed[0];
          }
          if (test[center] === null) {
            // BAD: This permutation didn't play a card in the center spot
          } else if (findHole(mask, makeMask(test, 2))) {
            // BAD: Card wasn't played on the current line
          } else  {
            const str = test.join(',');
            if (seen.has(str)) {
              // 
            } else {
              // TODO: Hack because this algorithm has redundancies
              seen.add(str);
            }
          }
          permute3(hand, test, center, mask);
          if (y) {
            test[i] = null;
          }
        }
        hand.splice(k, 0, removed[0]);
      }
    }

    // console.log(hand);
    // console.log(full);
    // console.log(mask);
    // console.log(center);
    
    const results: any[] = [];
    permute3(hand, full, center, mask);
    seen.forEach(x => {
      const xh = x.split(',').map(y => parseInt(y) || null);
      let r=center;
      for (; r<xh.length; ++r) {
        if (xh[r] ===  null) {
          --r;
          break;
        }
      }
      let l=center;
      for (; l>=0; --l) {
        if (xh[l] ===  null) {
          ++l;
          break;
        }
      }
      // WE already know this will NOT contain nulls.
      const scoreHand = xh.slice(l, r + 1) as number[];
      // Where does it start?
      // center - left.
      // Remember we are horizontal here.
      const x2 = (p.x - (center - l));
      const y2 = p.y;
      const outcome: Outcome|null = computeScore(scoreHand, x2, y2);
      if (outcome !== null) {
        results.push(outcome);
      }
    });
    const scoredResults = results.sort((a, b) => {
      return b.score - a.score;
    })
    const bestPlay = scoredResults[0];
    return bestPlay;

    function buildVerticalLine(x: number, y: number) {
      // Order does NOT matter
      const vline: number[] = [];
      for (let i=0; i<5; ++i) {
        const c = board.at(x, y - i);
        if (c != null) {
          vline.push(c);
        }
      }
      for (let i=1; i<6; ++i) {
        const c = board.at(x, y + i);
        if (c != null) {
          vline.push(c);
        }
      }
      return vline;
    }
    // horizontal compute, look up/down
    function computeScore(line: number[], x: number, y: number, _debug: number=0): Outcome|null {
      // check LHS null terminator
      if (board.at(x - 1, y) != null) {
        return null;
      }
      // check RHS null terminator
      if (board.at(x + line.length + 1, y) != null) {
        return null;
      }
      // Sanity check that we aren't over four cards
      if (line.length > 4) {
        return null;
      }
      let score = baseScore(line);
      if (score === 0) {
        return null;
      }
      // PCARDS("horizontal line", line);
      // console.log("---got this far: score =", score);
      // Now walk the verticals
      for (let i=0; i<line.length; ++i) {
        const vline = buildVerticalLine(x + i, y);
        vline.push(line[i]); // don't forget the card that should be there!
        // PCARDS("vline", vline);
        const vscore = baseScore(vline);
        // console.log('vline base score is', vscore);
        if (vscore === card.score(line[i])) {
          // console.log('... no vscore, card same');
        } else if (vscore === 0) {
          // console.log('... bad line!');
          return null;
        } else {
          // console.log('... adding vscore');
          score += vscore;
        }
      }
      // console.log("------got this far: score =", score);
      return {
        score,
        line,
        x,
        y,
        dir: 'r'
      }
    }
  }

  /*

  public play (_deck: DeckObject, board: BoardObject) {
    // Find contours. A list of [x,y] tuples of places to examine
    // Start with list of board.taken spots, check NSEW; push.
    const virtualBoard = new BoardObject(board);
    const virtualHand = [...this.hand];
    const contour: Point[] = this.findContour(virtualBoard);
    console.log('Evalute first contour');
    contour.forEach(spot => {
      console.log("Checking plays at location", spot.x, spot.y);
      this.playThisSpot(virtualBoard, spot, virtualHand, 0);
    })
  }
  */
  public play (_deck: DeckObject, board: BoardObject) {
    // Find contours. A list of [x,y] tuples of places to examine
    // Start with list of board.taken spots, check NSEW; push.
    const virtualBoard = new BoardObject(board);
    const virtualHand = [...this.hand];
//    virtualBoard.put(0, 0, 175);
//    virtualBoard.put(2, 0, 176);
    const contour: Point[] = this.findContour(virtualBoard, 3 /* H & V */);
/*
    const spot = contour[0];
    if (spot) {
      this.playThisSpot(virtualBoard, spot, virtualHand);

    }
*/
    const results: Outcome[] = [];
    contour.forEach(spot => {
      const r = this.playThisSpot(virtualBoard, spot, virtualHand);
      // TODO return a type
      if (r !== undefined) {
        results.push(r);
      }
    });

    const scoredResults = results.sort((a, b) => {
      return b.score - a.score;
    })
    const bestPlay = scoredResults[0];
    // Can't have more than one of any card so we can do this
    let i=0;
    if (bestPlay === undefined) {
      this.swapHand(_deck);
    } else {
      bestPlay.line.forEach(c => {
        const idx = this.hand.indexOf(c);
        this.hand.splice(idx, 1);
        const _x = bestPlay.x + i;
        const _y = bestPlay.y;
        board.put(_x, _y, c);
        ++i;
      })
      this.draw(i, _deck);
      this.score += bestPlay.score;
    }
  }
  

  public play_1 (deck: DeckObject, board: BoardObject) {
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
