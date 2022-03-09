import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import { name as cardName } from './CardObject';
import UNWRAP from './Utilities';
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

function findContour(board: BoardObject): Point[] {
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
    board.taken.forEach(anchor => {
        check(anchor, hSearch);
        check(anchor, vSearch);
    })
  }

  // TODO: This needs to be UNIQUIFIED to reduce redundant work
  return contour;
}

function baseScore(line: number[]): number {
  if (line.length > 4 || line.length < 2) {
    return 0;
  }
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
    // Can't have more than one of any card so we can do this
    let i=0;
    if (bestPlay === undefined) {
      // TODO: strategic pass? swap fewer?
      const r: number = deck.rand.next().value;
      const n: number = this.hand.length;
      this.swapHand(deck, Math.max(1, Math.floor(r * n)));
    } else {
      bestPlay.line.forEach(c => {
        const idx = this.hand.indexOf(c);
        this.hand.splice(idx, 1);
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

this game cannot win due to no playable cards if we deterministically 
swap hands of n=4 in a deck of 16 and neither play has a play.

789ceddc4b4fe3561880e1bf52b9db532927be26cbeeabcea23bc422092e8cc8242880e808f1df7b0c09c22145c35c3449fa2ce679f3c5c609e3637359709f9db5b3cb6c7cbfee496c46213665884513e2303daed2e3bc4a73116299a739fd6b6288759aabe23464d76d7b968de3202f46b108d96ab248e3fdc343c8a6cbc9aa7bbc7970b2b89dcf030000000000000000000000000000000000000000000000000000000000c07f12cb2ac4aada8377821f758aeb26c4c6293e40625da7ab73f8c60ef920ed14f7e0ade2bde736effef86c3abff5ee4b33d6c374ee477bf04ef1ee539beeb845b91962fa57bede279dfa66b007ef16ef38b3653a99d5abfb6d1ca5db709e6fce6cf7d7a6dfb869630f8945ba1ecb5797e9cb539feed7751ee2b0d983b78bf79edfaa3bbf6f7c398d4dba6997ceedb1138b740dd76f5ce8380ae2287da92e7d8375ecc4a6fb19ca793e626295bebd2e7c477dc4c422ddad0bbfa40400000000000000000000000000000000000000000000000000000000e0b0380dd9593bbd3dff7d32bb3c5f2d6f1767d9f824bbbbf878d366415555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555bfb0bfb6ed8bfcec77a3fa1356ff173eadbacffdba7bb96b400fbf5fb78aad7d3dfc7ed7456eedeb01f59b16b74b400fb73f628d5bfa7a00fdaedfed5bfb7a80f513af6a6ff9facda7eab75d43ae06555783aaab40d555a0babdecad7efddff734643793cb76918d4feeb37fb2f120649f930fe1718abde9695bec6deb4fbf6dc6e1ce71b81ef39d63be1e8bfe58eedc5af4b76e8d9b23573bc7cdbbaa778d9b4fb6e94da3de54f73ef5a6378dfa078d83fefcb4f3b0b7737fcafb1fb9353e7f2e316ecd4fdb8bfee6a2bfb5ec6f2dfb5babfed66aeb95f3ad57de9e9f5f6bb87b7e7eb57c6b5e6fafb6b6570f69714ea7cbf4d47d763b9f75795e85ddded97cb57972fd31dd9377694a8be4a27bf221cd57f3c9e77615bb1d2f268bb3b4d0633108b11c86583521d6a3f42a8bc9a7361b671f1e77fde5cf45777d5ccf96abf4642c8be7830c5f1e244f07688a108b516afeea207fdd2d5f1ca4681e0fd2ad933cad9ed964b158de7c582d676d9b0ef6f7647edda69dafd2f4c7755a1065fa2fbd8ad38f8bf365b7eafe05ff1bc16b


player 1 can play YC2 on 0, -1 or 0, 2 but doesn't?

789ceddc4d4fe34618c0f1af52b95757caf83d1c7bafba87de1087105c76459aa000a22bc477ef389b206cb22fa28b36ebfc0ef9fff38c9f4c063f33b613ac3c2417edfc2a3979d8fa3494591aea260d659d86a6384b939bb6bd484ec2242fa6a14893f56c19c387c7c734395fcdd6ddf3dd93d3e5dd629102000000000000000000000000000000000000000000000000000000000000c02b10ea2c0dd5e40046026f51dd223eaa3494f9018c06be6f71ab58dca6da064df7d31d210d4579004383ef51dfe9240df9f34373c863816b05fef9118aee57765e543294b1c07976000384d7d7b62a63119d70478c308debb4aa0f6024f006d5cde385555e1dc048e00daadbd4b1bad3031809bc4175ab78646e54779c0875f791c879779c08455cbb657300238137a86e153ff2e6aa3b6284a2bbb4f2fdd43811aa3c56d89753a34328bb7f24c4e2668ecee3442862759b78ed5cf85663ec0875f7e3fd4ec26347c8a6f1c86d3d8f1da18e75ae5c768d18a1ea6ed1711316000000000000000000000000000000000000000000000000000000000000000000000000000000c04f85b334b968cfef2e7f9fcdaf2ed7abbbe54572729adcbfff70db2629333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333f317fd6bdb3ed38f1e0df30f98fddfd8cc3c267f659a3b35f078fdba43bfc5c023f2971781ab231eafbf6d765b033c3effaf8b1f739f476047763e5e9bfd7cbc36fbf9786df6f3f1daece7e3b5d9cfc76bb39fd92ae0e3b39b1af868edb63666ab807930dd5d10317f65da5b0d7c84b61a98ad02e6c1b4dfe82c4d6e6757ed3239397d48fe4d4e2669f231f231dd44a11765bde85366e865865e663ffa6d17e67bc36c1b16fd70bb35ef6f1d84c5362cf786e536acf686d536acf786f5366cf686cd369cee0da7bb5d33e9c7dbcd6132d8feb2e169e78641c3a73ddadf47d930f9a9211b36ec32f26146deebb1bf97fb517f1f17bd6d656f5b397c935d72c8870dc5e732ca61c68b86a73fa51c36549fcbc88619d930230c33c2635c2fe7e7abd8f690dc2de69d9e96c26654c962bd6bddbeaa6bbc8f519c51ef6395c2638caf17b38fed3a7489ef67cb8bb8f842d3a4a10969a8f3341493f836cbd93f6d7292bcdba4fef2e7b25bb237f3d5baed7aae9e3ac99e77524de38be3a3ec5cbce8e4affbd5b34e9a6cd3491c6215e7f37cb65cae6edfad57f3b68d7dfd3d5bdcb431f73a467fdc6cfec4eb70fe6179b9ea8e00ff017b52d057

player 2 can play G+2 on -1, -1 but doesn't?

789cedda4d4fe3561480e1bf52b95b57caf577b2ecbeea2cba432c42709911698202888e10ffbd378c83b08199aa2552709e05ef9b737db8b9f1b9c73121f7c979bbb84c66f79d4f4251a4a1989ca6c975db9e27b330c98b6928d264335fc5f0fee1214dced6f3cdf6f1eec1c9ea76b94c010000000000000000000000000000000000000000000000000000000000e0fd11caec0056017bad719da5a19a1cc04a601fd52de24f153b393f80d5c0fb16b78ac56daa2e68621fd7210d4579004b83f7a8ef749286fcf9a539e4b1c0b5027f7c84a28917e517950c652c70eeaeeb432354652ca237dc11234c639f56f501ac04f650dd3cde58e5d501ac04f650dda68ed59d1ec04a600fd5ade295b951dd7122d4db3f89bcef8e13a188bd5b3607b012d84375abf8276faeba234628b6b7563e9f1a134213ba07551e0becb3a9d12194dbff23c4e2662ecee3442862759b78eb5cf85063ec08757c0f6ebc078f1d219bc62bb77e1e3b421deb5cb9ed1a3142b5fd868eef60010000000000000000000000000000000000000000000000000000000000000000000000000000007c289ca6c9797b767bf1eb7c7179b159dfaece93d94972f7f9cb4d9ba4ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccfc1dffdcb687b00ce603d8feba818fd06f6c7bddc047e01f6cf3eeb066e011fabf5dfa35038fc8df6f0277473c5effbbddad07787cfe5f373ff63e8fc0aeec7cbcb6fbf9786df7f3f1daeee7e3b5ddcfc76bbb9f8fd7763f1f9ffd4b8b8fd6363f1fbd7dab8d5917300fb6bb1b22e61f6c7bddc04768ddc0ac0b9807dbfe51a7697233bf6c57c9ece43ef93b994dd2e46be443fa18855e94f5a26f99a197197a99fde8975d98bf1a665d58f4c3ee68de3f3a088b2e2c5f0dcb2eac5e0dab2eac5f0deb2e6c5e0d9b2e9cbe1a4e77a766d28fbbc3613238fe72e0e9e486c1c0b733da3f47d930f969201b0eec32f26146de9bb17f96fb51ff1c17bd6365ef58397c925d72c88703c55b19e530e3c5c0d34b298703d55b19d930231b668461c66e6057a0e13aab87d84f6767eb38769fdc2e175b3d4b8f9b2b596e76a3ddacf1a52477318a3bee73ac62f610e3abe5fc6bbb09dbc4cff3d5796cced03469a8f33414d33434457c9ad5fcaf3699259f1e537ffa7db56de9ebc57ad36ee76a9e26c99e4f52c55faee344651d7fa62f26f9e36efd6c92267b9c242e313e6fb298af56eb9b4f9bf5a26de35c7fce97d76dccbd8ad16fd78f2ff12a9c7d595dacb757887f004459d2ec


789ceddc4d4f1b471cc0e1af524daf83c4ec9b5f8ebd57cda137c4c1982d44b83632201a21be7bff4b4dc4125451a80421cfc1cfcf33b3ac37ccb2e1c44d3aee9767697eb3eb4169db5c66fbb94ca39349bcaa5cea1837c35c974b35cba58bf793a1b1d6c6fb2ee6db1837f135d3989b9618d7714c135f3b8ca7f18af7ed70be98efe2d836e627c367c45a5b0e73bae8fbe3342ffb75332b4d4edbc53a8637b7b7391d6d16dbe1fdfd9b83f5d56a95010000000000000000000000000000000000000000000000000000000000f06129f52c5edd3bb812bc68ffba492ecdf4e9b5a6c47a79075789976ff0a4cb653a7b38338d2defa6f163fbf4b6e37ba2d4c35f12deff66ba89e9ba7d071788576e703bfca80e4fe26637d1d5b1bdd53bb834fccf3bddc4c33936b7f260fe98942676773afc0979bf31030000000000000000000000000000000000000000000000000000000000000000bc96c39c8efba3ab935f16cbb393ede66a7d9ce607e9faf4f3659fb2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafe80fdb9ef1fe4adaf46f50deefe674eab7e0ffdf767fab356dffa9fa0fa8a5bffbfddf3ee7dfd407dde93ddf35f3f6e5ff6a477f3eb07acdf7e549f779bfb29d01fa8e3ff1aee7298d3e5e2ac5fa7f9c14dfa2bcdf773fa12dee6bb51198daad1e89f23cbe8c8323ab28c8edc1b2f7e1dd64f0eabddb0190f77abf578f57eb857c6e7daab9e1e578f8e7ff461cd6ed88e87d5f8c376abed6ed88d877bd5d397563f5a6f1ead37b7b12347479b98ba4957abe5900787c7e9d36a7b3fdbdd7f9bd3759acf723a4df3c96d8cce578b2ffdb60c479d2ed6c7b1b7a5ed7299955c26f16a66f119ebc59f7d9aa74f7787fef4db7ab8232e969b6d4c9669f5f524d5c393344d2ef5f0aa73e9da6f4ef2fbf5e6c149aafdbb930c1718dfaae562bdde5c7eda6e967d1fe7fa63b1bae8e3d8f318fd7a71778b9c97a3cfeb93cd7083fd0d124ec3c2

*/
