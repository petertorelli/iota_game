import { sprintf } from 'sprintf-js';
import { GameObject } from './components/GameObject';

let p1wins = 0;
let p2wins = 0;
let ties = 0;
let nPlys = 0;
let msec = 0;

const game = new GameObject();

// for (let i=0; i<100_000; ++i) {
for (let i=0; i<100; ++i) {

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
  const p1 = (p1wins / (i+1)) * 100;
  const p2 = (p2wins / (i+1)) * 100;
  const ti = (ties   / (i+1)) * 100;
  console.log(sprintf("%5d [%d] %3d %3d %5.1f %3d %2d %2d %4d %5.3f %6.2f %6.2f %6.2f %9d",
    i+1,
    res.nDead,
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
  if (res.nply !== 100) {
    nPlys += res.nply;
    msec += res.playTime;
  } else {
    console.log("Skip deadlock in performance result");
  }
}

console.log(sprintf("msec per ply: %.3f", msec / nPlys));
