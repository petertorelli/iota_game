import BoardObject from './BoardObject';
import DeckObject from './DeckObject';
import * as card from './CardObject';
import type { Point } from './BoardObject';

type Outcome = {
  score: number;
  line: number[];
  x: number;
  y: number;
  dir: 'u' | 'd' | 'l' | 'r';
};

// taken from the internets...
function permuteArray(input: any[]) {
  const output: any[] = [];
  for (let i = 0; i < input.length; ++i) {
    const rest = permuteArray(input.slice(0, i).concat(input.slice(i + 1)));
    if (rest.length === 0) {
      output.push([input[i]]);
    } else {
      for (let j = 0; j < rest.length; ++j) {
        output.push([input[i]].concat(rest[j]));
      }
    }
  }
  return output;
}

/**
 * Create all possible ways to play a hand (array) of cards. This is different
 * than a permutation of K elements from set of length N, which is always length
 * N. Instead, we have to generate all permutations with length 1 ... N.
 *
 * TODO: There must be an algorithm for this, since it seems so ancient.
 *
 * @param input a set of cards to permute
 * @returns a set of permutations including holes
 */
function getAllPermutations(input: any[]) {
  const hackSeen = new Set<string>();
  const permutations = permuteArray(input);
  const output: any[] = [];
  permutations.forEach((permutation) => {
    for (let j = 0; j < permutation.length; ++j) {
      const partialPermutation = [];
      for (let k = 0; k <= j; ++k) {
        partialPermutation.push(permutation[k]);
      }
      // TODO: Hack b/c this algorithm generates duplicates, plz fix!
      // all length 4 are unique
      // all length 3 are unique
      // all length 2 appear twice
      // all length 1 appear 6 times
      const key = partialPermutation.join(',');
      if (!hackSeen.has(key)) {
        hackSeen.add(key);
        output.push(partialPermutation);
      }
    }
  });
  return output;
}

function buildVertical(board: BoardObject, x: number, y: number) {
  // Order does NOT matter
  const vline: number[] = [];
  for (let i = 1; i < 10; ++i) {
    // TODO stop at null
    const c = board.at(x, y - i);
    if (c != null) {
      vline.push(c);
    } else {
      break;
    }
  }
  for (let i = 1; i < 10; ++i) {
    // TODO stop at null
    const c = board.at(x, y + i);
    if (c != null) {
      vline.push(c);
    } else {
      break;
    }
  }
  return vline;
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
  const hSearch: Point[] = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  const vSearch: Point[] = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  // Since this is only called once per turn, use a Set to uniquify.
  const seen = new Map<string, Point>();

  // Helper function to reduce redundant code.
  function check(p: Point, set: Point[]) {
    set.forEach((search) => {
      const newp = { x: p.x + search.x, y: p.y + search.y };
      if (board.atP(newp) === null) {
        const key = JSON.stringify(newp);
        if (!seen.has(key)) {
          seen.set(key, newp);
        }
        // contour.push(newp);
      }
    });
  }

  // Default case when it is the first move.
  if (board.taken.length === 0) {
    return [{ x: 0, y: 0 }];
  }
  board.taken.forEach((anchor) => {
    check(anchor, hSearch);
    check(anchor, vSearch);
  });

  const contour: Point[] = [];
  seen.forEach((v, _k) => {
    contour.push(v);
  });
  return contour;
}

/**
 * Lay down all cards to the right, starting from spot x/y, to construct a
 * contiguous line of cards, including cards that are skipped over to find
 * the next playable spot to the right, any cards touching to the right, and
 * any cards touching to the left. For example:
 *
 * Four cards to play: [i,j,k,l]
 * Board row at spot.y, playing spot.x = `?` and blank spaces are `.`:
 *
 * .................
 * ....A?.B..CD.....
 * .................
 *
 * The result is: [A, i, j, B, k, l, C, D]
 *
 * @param board A BoardObject (immutable)
 * @param x Current x location on the board
 * @param y Current y location on the board
 * @param cards Cards to play.
 * @returns A line of cards (array of numbers)
 */
function buildRight(
  board: BoardObject,
  x: number,
  y: number,
  cards: number[]
): [number[], number] {
  const line: number[] = [];
  let slide = 0;
  let c: number | null = null;

  // First, built to the right.
  for (let i = 0; i < cards.length /* increment on play! */; ) {
    c = board.at(x + slide, y);
    if (c === null) {
      // If the spot is empty, add the next card.
      line.push(cards[i]);
      ++i;
    } else {
      // If it is not empty, and there are still cards to add, add one!
      line.push(c);
    }
    ++slide;
  }

  // We've played all cards, but the next spot to the right might have a card.
  // `slide` is already at the next square after exiting the for-loop.
  do {
    c = board.at(x + slide, y);
    if (c !== null) {
      // Add the cards that are touching to the right until an empty square.
      line.push(c);
    }
    ++slide;
  } while (c !== null);

  // Now we have to prepend any cards we are touching to the left
  slide = 0;
  do {
    // We already did the current spot so start one over.
    c = board.at(x - (slide + 1), y);
    if (c !== null) {
      // Add the cards that are touching to the left until an empty square.
      line.unshift(c);
    }
    ++slide;
  } while (c != null);

  // Now we have a contiguous line of cards. This line could be huge, but it
  // isn't up to this function to resolve it.
  // If we've added cards to the LHS, let the caller know that with `slide`.
  return [line, slide - 1];
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
      aSame = (line[0] & 0x03) === (line[1] & 0x03);
      aDiff = (line[0] & 0x03) !== (line[1] & 0x03);
      bSame = (line[0] & 0x0c) === (line[1] & 0x0c);
      bDiff = (line[0] & 0x0c) !== (line[1] & 0x0c);
      cSame = (line[0] & 0x30) === (line[1] & 0x30);
      cDiff = (line[0] & 0x30) !== (line[1] & 0x30);
      score = (line[0] & 0x3) + (line[1] & 0x3) + 2;
      break;
    case 3:
      aSame =
        (line[0] & 0x03) === (line[1] & 0x03) &&
        (line[1] & 0x03) === (line[2] & 0x03);
      aDiff =
        (line[0] & 0x03) !== (line[1] & 0x03) &&
        (line[1] & 0x03) !== (line[2] & 0x03) &&
        (line[0] & 0x03) !== (line[2] & 0x03);
      bSame =
        (line[0] & 0x0c) === (line[1] & 0x0c) &&
        (line[1] & 0x0c) === (line[2] & 0x0c);
      bDiff =
        (line[0] & 0x0c) !== (line[1] & 0x0c) &&
        (line[1] & 0x0c) !== (line[2] & 0x0c) &&
        (line[0] & 0x0c) !== (line[2] & 0x0c);
      cSame =
        (line[0] & 0x30) === (line[1] & 0x30) &&
        (line[1] & 0x30) === (line[2] & 0x30);
      cDiff =
        (line[0] & 0x30) !== (line[1] & 0x30) &&
        (line[1] & 0x30) !== (line[2] & 0x30) &&
        (line[0] & 0x30) !== (line[2] & 0x30);
      score = (line[0] & 0x3) + (line[1] & 0x3) + (line[2] & 0x3) + 3;
      break;
    case 4:
      aSame =
        (line[0] & 0x03) === (line[1] & 0x03) &&
        (line[1] & 0x03) === (line[2] & 0x03) &&
        (line[2] & 0x03) === (line[3] & 0x03);
      aDiff =
        (line[0] & 0x03) !== (line[1] & 0x03) &&
        (line[0] & 0x03) !== (line[2] & 0x03) &&
        (line[0] & 0x03) !== (line[3] & 0x03) &&
        (line[1] & 0x03) !== (line[2] & 0x03) &&
        (line[1] & 0x03) !== (line[3] & 0x03) &&
        (line[2] & 0x03) !== (line[3] & 0x03);
      bSame =
        (line[0] & 0x0c) === (line[1] & 0x0c) &&
        (line[1] & 0x0c) === (line[2] & 0x0c) &&
        (line[2] & 0x0c) === (line[3] & 0x0c);
      bDiff =
        (line[0] & 0x0c) !== (line[1] & 0x0c) &&
        (line[0] & 0x0c) !== (line[2] & 0x0c) &&
        (line[0] & 0x0c) !== (line[3] & 0x0c) &&
        (line[1] & 0x0c) !== (line[2] & 0x0c) &&
        (line[1] & 0x0c) !== (line[3] & 0x0c) &&
        (line[2] & 0x0c) !== (line[3] & 0x0c);
      cSame =
        (line[0] & 0x30) === (line[1] & 0x30) &&
        (line[1] & 0x30) === (line[2] & 0x30) &&
        (line[2] & 0x30) === (line[3] & 0x30);
      cDiff =
        (line[0] & 0x30) !== (line[1] & 0x30) &&
        (line[0] & 0x30) !== (line[2] & 0x30) &&
        (line[0] & 0x30) !== (line[3] & 0x30) &&
        (line[1] & 0x30) !== (line[2] & 0x30) &&
        (line[1] & 0x30) !== (line[3] & 0x30) &&
        (line[2] & 0x30) !== (line[3] & 0x30);
      score =
        (line[0] & 0x3) +
        (line[1] & 0x3) +
        (line[2] & 0x3) +
        (line[3] & 0x3) +
        4;
      break;
  }
  const pass = (aSame || aDiff) && (bSame || bDiff) && (cSame || cDiff);
  return pass ? score : 0;
}

export default class PlayerObject {
  public hand: number[] = [];
  public name: string = 'Player Name';
  public score = 0;
  constructor(name: string) {
    this.init(name);
  }

  public init(name: string) {
    this.hand = [];
    this.name = name;
    this.score = 0;
  }

  // TODO: When to do this strategically?
  public swapHand(deck: DeckObject, n: number) {
    if (n > deck.deck.length) {
      n = deck.deck.length;
    }
    // TODO: Which cards to discard?
    deck.returnCards(this.hand, n);
    this.draw(n, deck);
    return true;
  }

  public draw(count: number, deck: DeckObject) {
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

  public playThisSpot(board: BoardObject, spot: Point, hand: number[]) {
    const debug = 0; // (spot.x === -7) && (spot.y === -1);
    // The end result is the best outcome from this list
    const results: Outcome[] = [];
    debug && console.log('playThisSpot', spot.x, spot.y);

    getAllPermutations(hand).forEach((permutation) => {
      // We've got a permutation to lay out at point 'spot'
      // 1. We're going to lay it out at that spot first, and go to the right,
      //    building a line to examine.
      // 2. Then we're going to validate/score that line.
      // 3. Then we're going to slide to the left one spot, and see if we
      //    can start building there, going to step #2, until we have moved
      //    so far to the left that we can't play on `spot`.
      // 4. When playing cards to the right, we have to add existing cards to
      //    the line and skip over them to find an unplayed square.
      // 5. If we run out of cards to play as we play to the right, we have to
      //    append any abutting cards. The line might be very large!
      // 6. Similarly, as we slide to the left, if we abutt any cards, those
      //    too must be prepended.

      // We're going to creep to the left and build to the right.
      for (let i = 0; i < permutation.length; ++i) {
        const x = spot.x - i;
        const c = board.at(x, spot.y);
        if (c === null) {
          // Now we have a completed line that needs scoring.
          const [line, leftShift] = buildRight(board, x, spot.y, permutation);
          // If the hand we're playing is illegal, don't bother
          const outcome = computeScoreHoriz(line, x, spot.y);
          if (outcome !== null) {
            // All four cards played, doubles score AGAIN
            if (permutation.length === 4) {
              outcome.score *= 2;
            }
            // The outcome doesn't know that if builder added to the left.
            outcome.x = x - leftShift;
            results.push(outcome);
          }
        } else {
          // We can't creep right anymore, because we hit a card.
          // There is no point in stepping OVER this card, because the contour
          // search algorithm will have found the playable spots to the left
          // of this 'blockage'.
          break;
        }
      } // Creep-left loop.
    }); // Permutation loop

    const sortedResults = results.sort((a, b) => {
      return b.score - a.score;
    });

    // TODO: Our current selection criteria is the highest score, ignore ties
    const bestPlay = sortedResults[0];
    debug && console.log(bestPlay);
    return bestPlay;

    // horizontal compute, look up/down
    function computeScoreHoriz(
      line: number[],
      x: number,
      y: number
    ): Outcome | null {
      debug &&
        console.log(
          'Enter computeScoreH',
          x,
          y,
          line.map((x) => card.name(x))
        );
      let scoreMultiplier = 1;
      if (line.length > 4) {
        debug && console.log('line greater than four');
        return null;
      }
      let score = baseScore(line);
      if (score === 0 && line.length > 1) {
        return null;
      }
      // Completed a horizontal lot
      if (line.length === 4) {
        debug && console.log('multiplier(horz lot)', scoreMultiplier);
        scoreMultiplier *= 2;
      }
      // Now walk the verticals
      // debug && console.log('walking verticals');
      for (let i = 0; i < line.length; ++i) {
        const vline = buildVertical(board, x + i, y);
        if (vline.length === 0) {
          continue;
        }
        vline.push(line[i]); // don't forget the card that should be there!
        let vscore = baseScore(vline);
        if (vscore === card.score(line[i])) {
          debug && console.log('... no vscore, card same');
        } else if (vscore === 0) {
          debug && console.log('... bad line!');
          return null;
        } else {
          debug && console.log('... adding vscore');
          if (vline.length === 4) {
            // Did we play a card that completed a vertical lot?
            // or was there already a completed veritcal lot?
            if (board.at(x + i, y) === null) {
              debug && console.log('Vertical x2 mult @', x + i, y);
              scoreMultiplier *= 2;
            }
          }
          if (vline.includes(line[i]) === false) {
            debug && console.log('did not play this line, ignore score');
            vscore = 0;
          }
          debug && console.log(' ++ add vertical score', vscore);
          score += vscore;
        }
      }
      score *= scoreMultiplier;
      return {
        score,
        line,
        x,
        y,
        dir: 'r',
      };
    }
  }

  public play(deck: DeckObject, board: BoardObject) {
    const virtualBoard = new BoardObject(board);
    const virtualHand = [...this.hand];
    const contour: Point[] = findContour(virtualBoard);
    const results: Outcome[] = [];
    board.debugBackground.fill('white');
    contour.forEach((spot) => {
      const r = this.playThisSpot(virtualBoard, spot, virtualHand);
      // TODO define a type to return so that don't use 'any'
      board.debugBackground[spot.x + 48 + (spot.y + 48) * 97] = '#eee';
      if (r !== undefined) {
        results.push(r);
      }
    });

    const sortedResults = results.sort((a, b) => {
      return b.score - a.score;
    });
    const bestPlay = sortedResults[0];
    if (bestPlay === undefined) {
      // TODO: strategic pass? swap fewer?
      const r: number = deck.rand.next().value;
      const n: number = this.hand.length;
      const swap = Math.max(1, Math.floor(r * n));
      this.swapHand(deck, swap);
    } else {
      let i = 0;
      let ndraw = 0;
      bestPlay.line.forEach((c) => {
        // The best play contains cards that are ON the board too.
        const idx = this.hand.indexOf(c);
        if (idx >= 0) {
          this.hand.splice(idx, 1);
          ++ndraw;
        }
        const _x = bestPlay.x + i;
        const _y = bestPlay.y;
        const at = board.at(_x, _y);
        // Sanity check, doesn't cost a lot.
        if (at !== c && at !== null) {
          throw new Error(`Cannot play a card on a card! [${_x}, ${_y}]`);
        }
        board.put(_x, _y, c);
        ++i;
      });
      this.draw(ndraw, deck);
      console.log('Last score was', bestPlay.score);
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


overplay bug!

789ceddd4f6fda3018c7f1b73279d720c571fec1717b01eb6137d44300b79dca922a147515e2bdef092508a7296cdd5049f81ef8244f6c8cc9af0ea18776a566767aaf46abed76ac93c0d349eae930b8f6d4c2da991a85be093d5566b9ecafd66b4f4d8aacacf6eb9d71be9ccf3d00000000000000000000000000000000000000000000000000000000000000000000000000807f439ba13cd23398099c20ddc4783a8acf6026708274c32a5dd66e07d1c9f0588fa1965e2cddaea24d200b54b7b745926ddade06e78f4e23599bbee418bd6a1aca6163ce6092f0fe7c8354b24d24e7eaaf05eb3a74b9538e8233981efc6d9e69b52825cf58f28cf63f79751c4aaba46df8a4ed343a968fd458828c6359b2fb97651d49c4917f067384ff96769a6c774259d5a68a9e8fdc3ea18ddc61a5db6bb28e5fdd66412fd09191257cecab30741d9d5639f39baa1ea38ddc6625f208b993ee313a906fc149720633010000000000000000000000000000000000000000000000000000000000000000000000000000805372eda9999d2c6fbf64d3fbdbb258e633351a7ff8ac000000000000000000000000000000000000000000000000000000000000000000000000e002509fadb5aade7cfc7ce064191f38005d878c3bce1fe545ca1d673faf03d991731f389e2239f781f6d00e2e7572ee16eed724aedcfde578b6c7973b748977244ed89de6edab396bbbd71c5cc8a4dc3bb8705f12a47d4990f68540d0978473537eeda9c7ecdee66a345ea95f6ae47bea595c7b9b4a3bd54b9b76dab4d336701b77e5e08d3aa8eba0bd36756d1aed61a3368dfe61e3f5b6ed6163fc5d1d396f74fb74df7db6ef766e0ebe2be34673d8fa5e1a6fb5f94e22e7bc363a1bf734eecaa4f52c87ce506e153979b9d5eeec36c2797966ecf48ddd976c9c0bdf1da89eaf692deb0986ad653dc5a8b5aca711b796c9b64c5acb745ba66e39a84f8dac94c9a490232bb59c4fabcdde2997de6a5ed647d3fa9ca8273917f2ea77b289d6523fccb3675beaaadf5db6f9a7683af63d1d469e36d5d69757c9b39f568dd4d5a6eba76f79b55617d3a2948341a2778304fb83a4a13c591e71228fe1ab41be3f157b83c854aa41aa9f1c99e934cbf3e2f1aa2ca6d6ca5837d97c613d55da6c51e45fdd3649fe414f7ee4b7c5667f666f6cb9a8e2fd0d0859f0c6
*/
