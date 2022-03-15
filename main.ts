import { sprintf } from 'sprintf-js';
import _ from 'lodash';
import { GameObject } from './components/GameObject';



const gamePlyOutcomes: Array<string[]> = [];
const game = new GameObject(1234);
for (let i=0; i<50_000; ++i) {
  let outcome;
  const plyOutcomes: string[] = [];
  do {
    game.turn();
    outcome = (game.player1.score > game.player2.score) ? 'p1' :
    (game.player1.score === game.player2.score) ? 'ti' : 'p2';
    /*
    const status = game.cannotProceed ? 'done' : 'play';
    console.log(sprintf("%5d %5d %5d %5d %s %s",
      i+1,
      game.ply,
      game.player1.score,
      game.player2.score,
      outcome,
      status,
    ));
    */
    if (game.ply) {
      plyOutcomes.push(outcome);
    }
  } while (!game.cannotProceed);
  console.log('Game #', i+1);
  game.init();
  gamePlyOutcomes.push(plyOutcomes);
}

const reduced: Array<number[]> = [];

let min = 100;
for (let g=0; g<gamePlyOutcomes.length; ++g) {
  const final = gamePlyOutcomes[g][gamePlyOutcomes[g].length - 1];
  const strat: number[] = [];
  for (let j=0; j<gamePlyOutcomes[g].length; ++j) {
    const guess = (final === gamePlyOutcomes[g][j]) ? 1 : 0;
    strat.push(guess);
  }
  reduced.push(strat);
  min = Math.min(strat.length, min);
}

const transpose: Array<number[]> = [];
for (let i=0; i<reduced.length; ++i) {
  for (let j=0; j<min; ++j) {
    if (transpose.length <= j) {
      transpose.push([])
    }
    transpose[j].push(reduced[i][j]);
  }
}

for (let i=0; i<transpose.length; ++i) {
  console.log(sprintf('Accuracy at ply %5d = %5.1f %%',
    i+1, _.mean(transpose[i]) * 100));
}
/*
const times: number[] = [];

let p1wins = 0;
let p2wins = 0;
let ties = 0;
let ngames = 1;

    }
// for (let i=0; i<100_000; ++i) {
for (let i=0; i<1000; ++i) {

  const res = game.playOneGame();

  const area = res.w * res.h;
  const aspect = res.w / res.h;

  if (res.p1score > res.p2score) {
    ++p1wins;
  } else if (res.p1score < res.p2score) {
    ++p2wins;
  } else {
    ++ties;
  }
//    if (res.nply < 100) {
    ++ngames;
//    }
  const p1 = (p1wins / ngames) * 100;
  const p2 = (p2wins / ngames) * 100;
  const ti = (ties / ngames) * 100;
  console.log(sprintf("%5d %3d %3d %5.1f %3d %2d %2d %4d %5.3f %.2f %.2f %.2f %9d",
    i+1,
    res.p1score,
    res.p2score,
    res.playTime,
    res.nply,
    res.w,
    res.h,
    area,
    aspect,
    p1,
    p2,
    ti,
    res.seed
    )
  );
  times.push(res.playTime);
}
*/

/*
Game # 50000
Accuracy at ply     1 =  51.5 %
Accuracy at ply     2 =  46.6 %
Accuracy at ply     3 =  52.2 %
Accuracy at ply     4 =  53.4 %
Accuracy at ply     5 =  56.2 %
Accuracy at ply     6 =  57.4 %
Accuracy at ply     7 =  59.7 %
Accuracy at ply     8 =  60.7 %
Accuracy at ply     9 =  62.7 %
Accuracy at ply    10 =  63.6 %
Accuracy at ply    11 =  64.9 %
Accuracy at ply    12 =  66.3 %
Accuracy at ply    13 =  67.6 %
Accuracy at ply    14 =  68.8 %
Accuracy at ply    15 =  70.0 %
Accuracy at ply    16 =  71.2 %
Accuracy at ply    17 =  72.3 %
Accuracy at ply    18 =  73.9 %
Accuracy at ply    19 =  75.2 %
Accuracy at ply    20 =  76.4 %
Accuracy at ply    21 =  77.7 %
Accuracy at ply    22 =  79.1 %
Accuracy at ply    23 =  80.7 %
Accuracy at ply    24 =  82.2 %
✨  Done in 36952.79s.
*/
