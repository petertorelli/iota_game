import { sprintf } from 'sprintf-js';
import { GameObject } from './components/GameObject';
const game = new GameObject();

for (let i=0; i<333_333; ++i) {
    const res = game.playOneGame();
    const area = res.w * res.h;
    const aspect = res.w / res.h;

    console.log(sprintf("%3d %3d %5.1f %3d %2d %2d %4d %5.3f %9d",
        res.p1score,
        res.p2score,
        res.playTime,
        res.nply,
        res.w,
        res.h,
        area,
        aspect,
        res.seed
        )
    );
}
