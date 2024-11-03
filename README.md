# About

This program auto-plays the game "Iota", copywrite by GameWrite, in a SPA using some really simple DFS single-ply lookahead.

GUI options:

1. Play One Turn - Causes the engine to play the next player's turn.
2. Reset - Reset the board, reshuffle, and deal
3. Autoplay Once - Causes the engine to finish the game
4. Autoplay Forever - Play until clicking "Stop"
5. Set seed - If not using Math.random(), a PRNG sets a seed which can then be used to restart the same game. Great for debug, but the PRNG will bias toward one player after a thousand games or so by as much as 10%.
6. Export/Import - The game state can be exported as a hex string, or re-imported via cut-and-paste into this area.

Each time a game finishes, the scores, board side, and # of turns are reported on the left-hand side. Note that it does not render while autoplaying as it becomes progressively slower for reasons I don't quite get (because how many times do you create & destory millions of VueJS components?).

# Running

You can play it live [here](https://repete.io/iota/)!

## Browser

It's a NuxtJS app, so:

```Bash
% yarn
% yarn dev
```

And then open a browser at `localhost:3000`. See screenshot below.

## NodeJS app

It can also be run as a NodeJS app, which is 3x faster since VueJS hasn't applied reactivity to all of the objects (`reactiveGetter` eats up a lot of cycles).

```Bash
% yarn ts-node -T main.ts
% yarn ts-node -T tests/regression01.ts
% yarn ts-node -T tests/regression02.ts
```

The file `main.ts` is just for experimenting. The two regressions have their own output files which I use to verify correctness (`regression01` has a checksum), and predictability (`regression02` evaluates how well the winner can be predicted at each ply).

# Compatability & Performance

On my 2019 MacBook Pro (Intel Core i9) I get the following performance:

* Firefox: ~70 msec per game
* Chrome: ~40 msec per game
* Safari: ~1000 msec per game
* NodeJS: ~25 msec per game (0.960 msec per ply)

# Problems

1. The games starts to really slow down after ~700 turns. The heatmap in FireFox shows it is the DOM being re-rendered. I'm experimenting with different layouts to see what is causing the problem. If I comment out the board table in the template, there is no slowdown, so something in there is causing a problem.

# Screenshot

![Screen Shot 2022-05-30 at 4 15 16 PM](https://user-images.githubusercontent.com/8249735/171067988-f74b6bb8-b48e-4fd2-96ff-6a946fb84503.png)
