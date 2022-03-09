import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import * as card from './CardObject';
import type { Point } from './BoardObject';

type Outcome = {
  score: number,
  line: number[],
  x: number,
  y: number,
  dir: 'u'|'d'|'l'|'r',
}

function perm(xs: number[]) {
  const ret: Array<number[]> = [];
  for (let i = 0; i < xs.length; i = i + 1) {
    const rest = perm(xs.slice(0, i).concat(xs.slice(i + 1)));
    if(!rest.length) {
      ret.push([xs[i]])
    } else {
      for(let j = 0; j < rest.length; j = j + 1) {
        ret.push([xs[i]].concat(rest[j]))
      }
    }
  }
  return ret;
}

/**
 * Scan the board to find all the bounding contour of all playable coordinates.
 * A playable coordinate is a blank square that is up, down, left, or right of
 * a card on the board. No verification is performed, it only returns a list
 * of Points that might be played, but still need to be analyzed.
 * 
 * @param board A BoardObject to examine.
 * @returns An array of Points (board coordinates) that may be played.
 */
function findContour(board: BoardObject): Point[] {
  const hSearch: Point[] = [{x: -1, y: 0}, {x: 1, y:  0}];
  const vSearch: Point[] = [{x:  0, y: 1}, {x: 0, y: -1}];
  // Since this is only called once per turn, use a Set to uniquify.
  const seen = new Set<Point>();

  // Helper function to reduce redundant code.
  function check(p: Point, set: Point[]) {
    set.forEach(search => {
      const newp = {x: p.x + search.x, y: p.y + search.y};
      if (board.atP(newp) === null) {
        if (!seen.has(newp)) {
          seen.add(newp);
        }
        // contour.push(newp);
      }
    })
  }

  // Default case when it is the first move.
  if (board.taken.length === 0) {
    return [{x: 0, y: 0}];
  }
  board.taken.forEach(anchor => {
    check(anchor, hSearch);
    check(anchor, vSearch);
  })

  const contour: Point[] = [];
  seen.forEach(p => {
    contour.push(p);
  });
  return contour;
}

/**
 * An loop-unrolled comparison that checks to see if all properties are the
 * same, or if all properties are different. Can be used for validation as
 * well as basic scoring. "Basic" means no bonuses are computed.
 *
 * This is a 20x performance improvement over using Set()s and dynamic arrays.
 *
 * @param line An array of cards (64 values from 0x00-0x3f)
 * @returns 0 = invalid line or score (sum of card values without bonuses)
 */
function baseScore(line: number[]) {
  // Putting the length check up here is ~5% faster for some reason! (Compared
  // to having a `default` case for non {2,3,4} values.)
  if (line.length > 4 || line.length < 2) {
    return 0;
  }
  let aSame = false;
  let aDiff = false;
  let bSame = false;
  let bDiff = false;
  let cSame = false;
  let cDiff = false;
  let score = 0;

  switch (line.length) {
    case 2:
      aSame = (line[0]&0x03)===(line[1]&0x03);
      aDiff = (line[0]&0x03)!==(line[1]&0x03);
      bSame = (line[0]&0x0c)===(line[1]&0x0c);
      bDiff = (line[0]&0x0c)!==(line[1]&0x0c);
      cSame = (line[0]&0x30)===(line[1]&0x30);
      cDiff = (line[0]&0x30)!==(line[1]&0x30);
      score = (line[0]&0x3)
            + (line[1]&0x3)
            + 2;
      break;
    case 3:
      aSame = ((line[0]&0x03)===(line[1]&0x03)) &&
              ((line[1]&0x03)===(line[2]&0x03));
      aDiff = ((line[0]&0x03)!==(line[1]&0x03)) &&
              ((line[1]&0x03)!==(line[2]&0x03)) &&
              ((line[0]&0x03)!==(line[2]&0x03));
      bSame = ((line[0]&0x0c)===(line[1]&0x0c)) &&
              ((line[1]&0x0c)===(line[2]&0x0c));
      bDiff = ((line[0]&0x0c)!==(line[1]&0x0c)) &&
              ((line[1]&0x0c)!==(line[2]&0x0c)) &&
              ((line[0]&0x0c)!==(line[2]&0x0c));
      cSame = ((line[0]&0x30)===(line[1]&0x30)) &&
              ((line[1]&0x30)===(line[2]&0x30));
      cDiff = ((line[0]&0x30)!==(line[1]&0x30)) &&
              ((line[1]&0x30)!==(line[2]&0x30)) &&
              ((line[0]&0x30)!==(line[2]&0x30));
      score = (line[0]&0x3)
            + (line[1]&0x3)
            + (line[2]&0x3)
            + 3;
      break;
    case 4:
      aSame = ((line[0]&0x03)===(line[1]&0x03)) &&
              ((line[1]&0x03)===(line[2]&0x03)) &&
              ((line[2]&0x03)===(line[3]&0x03));
      aDiff = ((line[0]&0x03)!==(line[1]&0x03)) &&
              ((line[0]&0x03)!==(line[2]&0x03)) &&
              ((line[0]&0x03)!==(line[3]&0x03)) &&
              ((line[1]&0x03)!==(line[2]&0x03)) &&
              ((line[1]&0x03)!==(line[3]&0x03)) &&
              ((line[2]&0x03)!==(line[3]&0x03));
      bSame = ((line[0]&0x0c)===(line[1]&0x0c)) &&
              ((line[1]&0x0c)===(line[2]&0x0c)) &&
              ((line[2]&0x0c)===(line[3]&0x0c));
      bDiff = ((line[0]&0x0c)!==(line[1]&0x0c)) &&
              ((line[0]&0x0c)!==(line[2]&0x0c)) &&
              ((line[0]&0x0c)!==(line[3]&0x0c)) &&
              ((line[1]&0x0c)!==(line[2]&0x0c)) &&
              ((line[1]&0x0c)!==(line[3]&0x0c)) &&
              ((line[2]&0x0c)!==(line[3]&0x0c));
      cSame = ((line[0]&0x30)===(line[1]&0x30)) &&
              ((line[1]&0x30)===(line[2]&0x30)) &&
              ((line[2]&0x30)===(line[3]&0x30));
      cDiff = ((line[0]&0x30)!==(line[1]&0x30)) &&
              ((line[0]&0x30)!==(line[2]&0x30)) &&
              ((line[0]&0x30)!==(line[3]&0x30)) &&
              ((line[1]&0x30)!==(line[2]&0x30)) &&
              ((line[1]&0x30)!==(line[3]&0x30)) &&
              ((line[2]&0x30)!==(line[3]&0x30));
      score = (line[0]&0x3)
            + (line[1]&0x3)
            + (line[2]&0x3)
            + (line[3]&0x3)
            + 4;
      break;
  }
  const pass = (aSame || aDiff) && (bSame || bDiff) && (cSame || cDiff);
  return pass ? score : 0;
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
  public swapHand (deck: DeckObject, n: number) {
    if (n > deck.deck.length) {
      n = deck.deck.length;
    }
    // TODO: Which cards to discard?
    deck.returnCards(this.hand, n);
    this.draw(n, deck);
    return true;
  }

  public draw (count: number, deck: DeckObject) {
    // TODO: set draw rules?
    while (count-- > 0) {
      const card = deck.drawOne();
      if (card) {
        this.hand.push(card);
      } else {
        // console.log('Out of cards, cannot draw');
      }
    }
  }

  public playThisSpot(board: BoardObject, p: Point, hand: number[]) {
    const results: Outcome[] = [];
    const seen = new Set<string>();
    let debug = 0;
    // if (p.x === -2 && p.y === 0 ) debug = 1;
    // debug = (p.x === -2 || p.x === -1) && p.y === -4;
    // debug = (p.x === -3 && p.y === -4);
    if (debug) {
      console.log(`playThisSpot(${p.x},${p.y})`);
    }
    
    const px = perm(hand);
    const finalOrders: Array<number[]> = [];
    px.forEach(possibleHand => {
      for (let j=0; j<possibleHand.length; ++j) {
        const mx = [];
        for (let k=0; k<=j; ++k) {
          mx.push(possibleHand[k]);
        }
        const key = mx.join(',');
        // TODO: Hack, my algorithm generates duplicates, fix this!
        // all length 4 are unique
        // all length 3 are unique
        // all length 2 appear twice
        // all length 1 appear 6 times
        if (!seen.has(key)) {
          seen.add(key);
          finalOrders.push(mx);
        }
      }
    })

    // Cool, now I've got all possible hand mixes (24 * 4 = 96)
    // So I can shift them through the range of playable holes from
    // -3, -2, 1, 0, 1, 2, 3
    //   One cards:             0                   = 1 play
    //   Two cards:         -1, 0, 1                = 2 plays
    // Three cards:     -2, -1, 0, 1, 2             = 3 plays
    //  Four cards: -3, -2, -1, 0, 1, 2, 3          = 4 plays
    //   ----------------------------------------   = 10 plays
    // 96 * 10 = 960 plays (with some redundancies)
    //
    finalOrders.forEach(attempt => {
      let outcome: Outcome|null;
      // Guaranteed to be n=[1,4] cards
      if (attempt.length === 1) {
        // If just one card, we don't have to scan L<>R
        outcome = computeScoreH(attempt, p.x, p.y);
        if (outcome !== null) {
          debug && console.log('outcome', outcome);
          results.push(outcome);
        }
      } else {
        const nshifts = attempt.length - 1;
        for (let i=0; i<nshifts; ++i) {
          // now build to the right starting on p.x + i
          const line: number[] = [];
          const newx = p.x - i;
          for (let j=0, k=0; j<attempt.length; ++k) {
            const c = board.at(newx + k, p.y);
            if (c === null) {
              line.push(attempt[j]);
              j++;
            } else {
              line.push(c);
            }
          }
          if (line.length > 4 || line.length < 2) {
            continue;
          }
          // If the hand we're playing is illegal, don't bother
          if (baseScore(line) > 0) {
            outcome = computeScoreH(line, newx, p.y);
            if (outcome !== null) {
              // All four cards played, doubles score AGAIN
              if (attempt.length === 4) {
                outcome.score *= 2;
              }
              debug && console.log('outcome', outcome);
              results.push(outcome);
            }
          }
        }
      }
    })
    const sortedResults = results.sort((a, b) => {
      return b.score - a.score;
    });
      if (debug) {
      console.log('sortedResults:');
      console.log(sortedResults);
    }
    const bestPlay = sortedResults[0];
    return bestPlay;

    function buildVerticalLine(x: number, y: number) {
      // Order does NOT matter
      const vline: number[] = [];
      for (let i=1; i<6; ++i) {
        const c = board.at(x, y - i);
        if (c != null) {
          vline.push(c);
        } else {
          break;
        }
      }
      for (let i=1; i<6; ++i) {
        const c = board.at(x, y + i);
        if (c != null) {
          vline.push(c);
        } else {
          break;
        }
      }
      return vline;
    }

    // horizontal compute, look up/down
    function computeScoreH(_line: number[], x: number, y: number): Outcome|null {
      debug && console.log('Enter computeScoreH', x, y, _line.map(x => card.name(x)));
      // check LHS null terminator
      const line = [..._line];
      let cc;
      let sr = 1;
      let scoreMultiplier = 1;
      // We need to fill a hole for each card AND have two null terminators
      let nHolesNeeded = _line.length;
      // The algorithms currently only play to the right, so no left search
      while (sr < 10 && nHolesNeeded > 0) {
        cc = board.at(x + sr, y);
        // debug && console.log('>>>RHS check', x+sr, y, card.name(cc));
        if (cc === null) {
          --nHolesNeeded;
          if (nHolesNeeded === 0) {
            break;
          }
        } else {
          line.push(cc)
        }
        ++sr;
      }
      if (line.length > 4) {
        // debug && console.log("line greater than four");
        return null;
      }
      // Now check LHS and RHS terminators!
      if (board.at(x - 1, y) !== null) {
        // debug && console.log("missing LHS terminator");
        return null;
      }
      if (board.at(x + (sr + 1), y) !== null) {
        //  debug && console.log("missing RHS terminator");
        return null;
      }
      if (_line.length !== line.length) {
        // debug && console.log("line changed to", line.map(x => card.name(x)));
      }
      let score = baseScore(line);
      if (score === 0 && line.length > 1) {
        return null;
      }
      // Completed a horizontal lot
      if (line.length === 4) {
        scoreMultiplier *= 2;
      }
      // Now walk the verticals
      // debug && console.log('walking verticals');
      for (let i=0; i<line.length; ++i) {
        const vline = buildVerticalLine(x + i, y);
        if (vline.length === 0) {
          continue;
        }
        vline.push(line[i]); // don't forget the card that should be there!
        let vscore = baseScore(vline);
        if (vscore === card.score(line[i])) {
          // debug && console.log('... no vscore, card same');
        } else if (vscore === 0) {
          // debug && console.log('... bad line!');
          return null;
        } else {
          // debug && console.log('... adding vscore');
          if (vline.length === 4) {
            // Did we play a card that completed a vertical lot?
            // or was there already a completed veritcal lot?
            if (_line.includes(line[i])) {
              debug && console.log('Vertical x2 mult @', x+i, y);
              scoreMultiplier *= 2;
            }
          }
//          debug && console.log('Does _line', _line.map(x => card.name(x)), 'contain',
  //        card.name(line[i]), '?', _line.includes(line[i]));
          if (_line.includes(line[i]) === false) {
            debug && console.log('did not play this line, ignore score');
            vscore = 0;
          }
          debug && console.log(' ++ add vertical score', vscore);
          score += vscore;
        }
      }
      debug && console.log('base score', score);
      score *= scoreMultiplier;
      debug && console.log('final score', score);
      return {
        score,
        // we mutate `line` above!
        line: _line,
        x,
        y,
        dir: 'r'
      }
    }
  }

  public play (deck: DeckObject, board: BoardObject) {
    const virtualBoard = new BoardObject(board);
    const virtualHand = [...this.hand];
    const contour: Point[] = findContour(virtualBoard);
    const results: Outcome[] = [];
    board.debugBackground.fill('white');
    contour.forEach(spot => {
      const r = this.playThisSpot(virtualBoard, spot, virtualHand);
      // TODO define a type to return so that don't use 'any'
      board.debugBackground[(spot.x + 48) + ((spot.y + 48) * 97)] = '#eee';
      if (r !== undefined) {
        results.push(r);
      }
    });

    const sortedResults = results.sort((a, b) => {
      return b.score - a.score;
    })
    const bestPlay = sortedResults[0];
    if (bestPlay === undefined) {
      // TODO: strategic pass? swap fewer?
      const r: number = deck.rand.next().value;
      const n: number = this.hand.length;
      const swap = Math.max(1, Math.floor(r * n));
      this.swapHand(deck, swap);
    } else {
      let i=0;
      bestPlay.line.forEach(c => {
        const idx = this.hand.indexOf(c);
        this.hand.splice(idx, 1);
        // TODO: Bugbug: if the play tries to span a gap, this overwrites it.
        const _x = bestPlay.x + i;
        const _y = bestPlay.y;
        board.put(_x, _y, c);
        ++i;
      })
      this.draw(i, deck);
      this.score += bestPlay.score;
    }
  }
}


/** current game i'm debugging

Deadlock game (deck empty)

789cedda4f4fe3461880f1af52b95723311e3b76726c3f40f7d01be21012975d41935500d115e2bb77c226b41350cbaea00dceef90e7c99bf99399bc33199b7057ccfbd94531b9dbf8e4b42caefa7e5e4cc271acc7a12e8bd57491c2bbfbfbb2385b4e57ebe7db27278b9bcbcb1200000000000000000000000000000000000000000000000000000000000000006038085d5786382ac3a8de83d1c05b643865b71ba747dc83d1c05ba5b94e698e523c3884b64adfceeb47bb07a381d74d6eb33e7edb945c3b77c0086d4af3286c8218d2616c330f04a14ab96db6b9ad8f536ed3a37639fdfe11da94c9d83d79b9a95382ab3d1820bc4696639352da6c539e72db3a8c878450a70337a63be098aea2e3f11e8c08de2ad56d4a7523c58343e85262dbb487c7923b3884980edd513a85eb27d75af0de11ea9876ee2879bc07a38157cbeb28dd1cb569d38ed6bf1ec9ed30119a74cd5caf6f90647848086d9baea5d67f884cf9edfcb16a980875ca7265e70200000000000000000000000000000000000000000000000000000000000000000000000000000000bc279c96c5bc3fbb39ff693abb385f2d6f16f3627252dc7efc74dd17253333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333330fd83ff6fd53fddf8362fe0f17ff7716330fc17601f33f5f01d9043c603b02f870fdb2d5ef169987ef6fbbfeb1197840febe556e13f000fcb2c5ef20e0e1db55101fbc5fb8acad7e3e00fb7d800fd6ee80f9706df5f3e1f965bf7759fc3c40bbf7657604f0c1da11c0fc2fcbdceae703b4ff0565666666666666666666666666666666de5f9f96c5f5f4a25f149393bbe28f62725c165f12efcb8728645195455f6b86ac661e1d85ace163189f0dab4d583f1bc64dd8e4e1a6b4ce4beb6c885536a86d749487316f7994cfe76b47312f8c79d3269fec4e38cac3366fbb1376f9ecbabc749c978ef3513dcea0ca66d0e4a31ae5e1a6ab709cd70e79e6773fe610f2dec2ce9b856aa7bcda298f3be53bf1f6336bf3303e3fb89dcedbbcaf36efabcddb8ef3ca5d5e79271d8fd3d87cc4310f1f1310b3d27a678e613ba9b403cfce96e995bbe2e672b6d65f8d1faa1797abedcbedf61d8adbd443eae26352779fe2cf97d32ffd2aaceb7d9c2ee6693b87269661d495a169d35b2ca6bff7c5a4f8f050ed875f16eb6f80abd972955e8c75f5d8419575302a43d73c69fcebedf2ef8dc343e334ac6e5c16b3e962b1bcfeb05acefa3ef571bdbae9cb62d54faf968b9ff3a234c1cfe1ecd3e27cf9b0bde6fd6ffdea2a652fdcff09977bb5cd

Deadlock game (deck not empty?!?!)

789ceddcbb6ee3461480e1570926ed141ef126a9dc3cc06e91ce70a10b632fac500bdac26621e8dd73c689133b69b64976617c85fe8f1c720e69586e7d4efb71779fd6e73fbd2e4397cb7288cf2a97bee4d2b4b90c71de5fe5b258e6d22d622d3e6d1f9f6a139fd8d3c7791f7bbab86f88b52ece97f538f634753dd69ab86f156b6dcceceadcd8bfa8cf0997f1acae3eb73e3ff60c71bd8fe326e634b17788eb7d9d15f7b47546bda7ceafcfa9ef52afc79e65cceae39eae3eb3dce4f4308efbb4eefab61f5639cd9b29cece974b4edbe366aec7cf07d7d3e970c8222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222f255294dfd1fe1cd77f026f25ffd8adb219761f51dbc8988888888888888888888888888888888888888888888888888888888888888888888888888888888888888c81bc84d4efb717bba7db7d9dddfcec7d3b44febebf4f9eee3e3983249922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449922449926fd21fc7f105dffa6dc86ff0edffca65f22deaaf80fcc7d7deb79f24499224499224499224499224499224499224f9bf7b93d3e3e67e9cd2fafa9c7e4bebab9cbe442ff9e9acbc3afbe35a7975ad5c62c2767b8c85733a1d76959763d2617e5e7bde108f4eeb454e77d14b9c7d3a6cbe8c73a977dd6da67dbc49e996b92c9b5cda552eab124f9836bf8e699d3e3cddfac3fba9fe000fbbe31c8bcbbf462c5e8e58b6b93431a6b9caa5ebfe35e2e7cfc7bf472cdaa719f1765d93d36e334dc7c70ff371378e31ea713e8d39cde3e6e138fdf4fa521bbbcaf6e3747b7cfa89f7e32fe3fc1043cae5779f724673

same

789ceddccf6e1a4700c0e157a9a6d789c4b07f5838b60fd01c7ab37cc0b0b523bb4b846d3991c5bb67d681d69bd226aa8c8cf077e0f76518d88c98c1363ef8312cdbc575983d6e3d4bd534a6c938a6ba8aa999c4344d795ce65b1d5395ef2ff2adece746799ce7ebfcf83a3f66dc9bc74d93cdb72adf8a7e3e3fafee9f9f9f33e9ef1f9dc770dbb6cb306b52538c520ceb7997478f9b4d0c17abf9bafff7ee1f67ddfdcd4d14111111111111111111111111111111111111111111111111111111111111111111111111397c5251c734991cc14ae410bb5be4dd4d3195e511ac465e76739bbcb945ff17f28a23588dbcece656f9eb72333d8295c8cb6e6c398e69dcffdd4a9b7bc24993697eff8e8f60257280ddadf2cf54b5dd3dcda4a6ffd3c3e908562207d8dda2ccdf84eb235889bcf0c6f66fdbfed7193e0f9d6652d17fdbcd9f7a4bbfb03acda4b2dfddfe4767bfb03ae1a4727404ab101111111111111111111111111111111111111111111111111111111111111111111111111111111111913ee7312cdb8bfbcb5fe68bebcbf5eabe5b86d95978b8fa70d7864892244992244992244992244992244992244992244992244992244992244992244992244992244992244992e1e7b67dc66baf867c85d3ff837793a7e4778eb977014f58a79f6fcffffe79dfa7019eaebee293df39eede057c033afd7cbb3afd7c7bfed067dfd75e2479c0c3ff3fa7c953d0bb80f42e20ffe5b83bfd7cc33afe2449922449922449922449922449922449f2a83c8fe16e7edd766176f6183e85d92886cfb99bf8344a83d1d7b934981b8edeed86e3bdc3f17658ec1d16db61b977586e87d570b89dad86b3df0cebedb0de3b9c6c8793e1b0d93bdb0c6777c3e9ded9e970763a781dc783576e377ab7ef252f862f54357cec374f4d9bbca71717ab7ccf63b8bf59f4fc3ddb2f22dcac77f74e77d70f0ff999f92157996293c71f6fe69fdb75ea1f7735ef96f97ca4aa8aa91ec534cdb7aaccff4b37ffb30db3f0fee9a13ffdd6f5c7ea76b15ae73bd3b8f9eb22e3e71729534c6513d3245fa468fe7191df1f56cf2e527cbd485e629d57ba9877ddeaeefd7ab568db7cadbbf57d1bc3ba9ddfaeba5f8753f9547c4c171fbacbd5d34bb86cff68d7b7f938a4cd17fb026f71

*/
