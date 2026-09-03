# Assignment 1

## Usage

Setup (requires node.js):

```bash
> npm install
```

Start tests:

```bash
> npm test
```

Serve up the App (and ctrl-click the URL that appears in the console)

```bash
> npm run dev
```

To format your code, for the assignment specifications:

```bash
npx prettier . --write
```

The configuration for this is set in `.prettierrc.json`. Feel free to change this to your heart's desire, but try to ensure it still fits the assignment guidelines.

If you are using VS Code, you can also install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). This skeleton code is set up to automatically format your code on save. You can disable this in `.vscode/settings.json` by changing `"editor.formatOnSave": true` to `"editor.formatOnSave": false`.

## Advanced Features

Per the spec, additional/advanced requirements need "one or more (or own
idea of similar complexity), done well, in proper FRP style" and must
"non-trivially impact state management and/or overall complexity". Beyond
the Full Game requirements, this implementation adds two such features:

### Pause

Press `Space` at any time during play to pause/unpause the game. This is
handled as a `Pause` action ([`src/state.ts`](src/state.ts)) that toggles a
`gamePause` flag on `State`. The `Tick` action checks this flag first and, if
set, returns the state unchanged — so target movement, spawning, scoring, and
difficulty scaling all freeze without needing a separate branch in every other
reducer. A "Game Paused" banner is shown/hidden in `view.ts` based on this
flag. Restarting (`R`) works regardless of pause state.

### Mario power-up with an escalating miss penalty (own idea)

This is a power-up in the spec's sense ("bonus score, speed up/down, destroy
other numbers, etc."), extended with our own twist: missing it gets
progressively more costly, which is what makes it non-trivial rather than a
one-off speed bump.

Every 3 target spawns (`Constants.MARIO_SPAWN_COUNT`), a Mario sprite spawns
at a random position on the canvas (`marioPos`, generated with its own RNG
seed chain, independent of the seeds used for target values/gaps). Mario
stays on screen for a limited window (`Constants.MARIO_EXPIRE` ticks, ~2
seconds) before expiring if not interacted with.

**Catching it:** clicking Mario fires a `KillMario` action that immediately
removes the current lowest (i.e. next-to-resolve) falling target from
`targetRects`, letting the player skip it without matching its value, and
resets `marioMissStreak` to 0.

**Missing it:** if Mario expires without being clicked, a penalty is applied
via `applyMarioPenalty` — a random target on screen (picked with its own
`penaltySeed` RNG chain) has its fall velocity boosted by
`marioMissStreak * Constants.ACCELERATION`. `marioMissStreak` increments on
every consecutive miss and only resets when Mario is successfully clicked, so
the penalty compounds the longer the player ignores Mario — a state-driven
escalation rather than a fixed, one-shot effect.

This whole feature is tracked via extra fields on `State` —
`marioActive`, `marioClicked`, `marioPos`, `marioMissStreak`, `penaltySeed`,
`tickCount`, `marioActivatedTick` — all threaded purely through the same
`Tick` reducer that drives the rest of the game loop, with no separate
subscription or side-effecting code path.

**Clicking Mario when no targets are on screen:** the click still counts —
`marioClicked` is set to `true` and `marioMissStreak` resets to 0, same as a
normal catch. There is just no target to remove as a reward, since
`s.targetRects.slice(1)` on an empty array is a no-op. This is kinder to the
player than silently ignoring the click.

### Checkline (game-over condition)

The "checkline" is the bottom edge of the play area — `Viewport.CANVAS_HEIGHT`
in `src/types.ts` (y = 400px). There's no separate line drawn on the canvas
for this; it's simply the bottom edge of the SVG viewBox, which is why it
visually overlaps the digit-input row (drawn over the bottom
`Constants.DIGIT_HEIGHT` = 50px of the canvas, i.e. from y = 350 down).

Each `Tick`, after targets have moved and Mario's lifecycle
has been processed, `checkReachLine` (`src/state.ts`) finds the lowest (i.e.
furthest-fallen) target on screen via `findLowestTarget` and checks whether
its bottom edge has reached or crossed the checkline:

```
lowest.y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT
```

If it has, `Tick` sets `gameEnd: true` on the state instead of spawning any
further targets that tick, which freezes the game (both `Tick` and `Flip`
short-circuit once `gameEnd` is set) and shows the "Game Over" banner in
`view.ts`. Only the single lowest target is checked each tick, since it is
always the first to reach the checkline. Restarting (`R`) is the only action
that clears `gameEnd`, via `Restart` resetting to `initialState`.

## Implementing features

There are a few files you may wish to modify. The rest should **not** be modified as they are used for configuring the build.

`src/main.ts`

- Code file used as the entry point
- Most of your game logic should go here
- Contains main function that is called on page load

`src/style.css`

- Stylesheet
- You may edit this if you wish

`index.html`

- Main html file
- Contains scaffold of game window and some sample shapes
- Feel free to add to this, but avoid changing the existing code, especially the `id` fields

`test/*.test.ts`

- If you want to add tests, these go here
- Uses [`vitest`](https://vitest.dev/api/)

We expect the core logic of your game to be in `src/main.ts`, however, you may elect to spread your code over multiple files. In this case, please use [TS Modules](https://www.typescriptlang.org/docs/handbook/modules.html).

Avoid separating code into too many files as it makes it hard to mark. The maximum recommended code file structure would be something like

```
src/
  main.ts        -- main code logic inc. core game loop
  types.ts       -- common types and type aliases
  util.ts        -- util functions
  state.ts       -- state processing and transformation
  view.ts        -- rendering
  observable.ts  -- functions to create Observable streams
```
