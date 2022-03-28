import { sprintf } from 'sprintf-js';
import _ from 'lodash';
import { GameObject } from './lib/GameObject';
import crypto from 'crypto';
import { turnOnBetterRandom } from './lib/RandomGenerator';

let p1wins = 0;
let p2wins = 0;
let ties = 0;
let nPlys = 0;
let msec = 0;
let check = '';
const scores: number[] = [];
const game = new GameObject(1);//234);
turnOnBetterRandom(true);

for (let i=0; i<100_000; ++i) {
//for (let i=0; i<20; ++i) {

  let res;
  try {
    res = game.playOneGame();
  } catch (error) {
    console.log("Game failed with seed:", game.deck.seed);
    console.error(error);
    process.exit();
  }

  const area = res.w * res.h;
  const aspect = res.w / res.h;

  if (res.p1score > res.p2score) {
    ++p1wins;
  } else if (res.p1score < res.p2score) {
    ++p2wins;
  } else {
    ++ties;
  }
  const p1 = (p1wins / (i+1)) * 100;
  const p2 = (p2wins / (i+1)) * 100;
  const ti = (ties   / (i+1)) * 100;
  console.log(sprintf("%5d %3d %3d %3d %2d %2d %4d %5.3f %6.2f %6.2f %6.2f %12d %3d %5.1f",
    i+1,
    res.p1score,
    res.p2score,
    res.nply,
    res.w,
    res.h,
    area,
    aspect,
    p1,
    p2,
    ti,
    res.seed,
    res.nDead,
    res.playTime,
    )
  );
  if (res.nply !== 100) {
    nPlys += res.nply;
    msec += res.playTime;
    scores.push(res.p1score);
    scores.push(res.p2score);
  } else {
    console.log("Skip deadlock in performance result");
  }
  check += `${res.p1score}${res.p2score}${res.nply}${res.w}${res.h}`;
}

console.log(sprintf("Average score: %.1f", _.mean(scores)));
console.log(sprintf("msec per ply: %.3f", msec / nPlys));
console.log('Checksum:', crypto.createHash('md5').update(check).digest('hex'));
