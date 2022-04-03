import { sprintf } from 'sprintf-js';
import _ from 'lodash';
import { GameObject } from '../lib/GameObject';
import { turnOnBetterRandom } from '../lib/RandomGenerator';

const gamePlyOutcomes: Array<string[]> = [];
turnOnBetterRandom(true);

const game = new GameObject();
for (let i = 0; i < 1000; ++i) {
  let outcome;
  const plyOutcomes: string[] = [];
  do {
    game.turn();
    outcome =
      game.player1.score > game.player2.score
        ? 'p1'
        : game.player1.score === game.player2.score
        ? 'ti'
        : 'p2';
    if (game.ply) {
      plyOutcomes.push(outcome);
    }
  } while (!game.cannotProceed);
  console.log('Game #', i + 1);
  game.init();
  gamePlyOutcomes.push(plyOutcomes);
}

const reduced: Array<number[]> = [];

let min = 100;
for (let g = 0; g < gamePlyOutcomes.length; ++g) {
  const final = gamePlyOutcomes[g][gamePlyOutcomes[g].length - 1];
  const strat: number[] = [];
  for (let j = 0; j < gamePlyOutcomes[g].length; ++j) {
    const guess = final === gamePlyOutcomes[g][j] ? 1 : 0;
    strat.push(guess);
  }
  reduced.push(strat);
  min = Math.min(strat.length, min);
}

const transpose: Array<number[]> = [];
for (let i = 0; i < reduced.length; ++i) {
  for (let j = 0; j < min; ++j) {
    if (transpose.length <= j) {
      transpose.push([]);
    }
    transpose[j].push(reduced[i][j]);
  }
}

for (let i = 0; i < transpose.length; ++i) {
  console.log(
    sprintf('Accuracy at ply %5d = %5.1f %%', i + 1, _.mean(transpose[i]) * 100)
  );
}
