# About

This program auto-plays the game "Iota" by GameWrite in a SPA using some really simple DFS single-ply lookahead.

GUI options:

1. Play One Turn - Causes the engine to play the next player's turn.
2. Reset - Reset the board, reshuffle, and deal
3. Autoplay Once - Causes the engine to finish the game
4. Autoplay 10,000x - Autoplay a bunch of times

Each time a game finishes, the scores, board side, and # of turns are reported on the left-hand side.


# Running

It's a NuxtJS app, so:

```Bash
% yarn
% yarn dev
```

And then open a browser at `localhost:3000`.

# Problems

1. The games starts to really slow down after ~700 turns. The heatmap in FireFox shows it is the DOM being re-rendered. I'm experimenting with different layouts to see what is causing the problem. If I comment out the board table in the template, there is no slowdown, so something in there is causing a problem.

# Screenshot

![image](https://user-images.githubusercontent.com/8249735/156663269-00577912-a5d6-4149-9e74-f57a92b20a65.png)

