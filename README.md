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

# To-do

1. Currently it does not play a space if there are cards on opposite sides. This is a simplification since determining if all the intersections are playable requires more thought.
2. No wildcards.
3. There are some options for the players, like if a hand has the same score for 1, 2, or 3 cards to play, which option should the player choose? Also, which order should the cards be played? And why favor one direction over another?
4. I think I'm missing some scoring bonuses

# Weirdness

1. The first player to start has a +10% win advantage????

# Screenshot

![image](https://user-images.githubusercontent.com/8249735/156663269-00577912-a5d6-4149-9e74-f57a92b20a65.png)

