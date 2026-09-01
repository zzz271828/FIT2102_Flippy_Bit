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

Beyond the Full Game requirements, this implementation adds two features:

### Pause

Press `Space` at any time during play to pause/unpause the game. This is
handled as a `Pause` action ([`src/state.ts`](src/state.ts)) that toggles a
`gamePause` flag on `State`. The `Tick` action checks this flag first and, if
set, returns the state unchanged — so target movement, spawning, scoring, and
difficulty scaling all freeze without needing a separate branch in every other
reducer. A "Game Paused" banner is shown/hidden in `view.ts` based on this
flag. Restarting (`R`) works regardless of pause state.

### Mario power-up

Every 5 target spawns (`Constants.MARIO_SPAWN_COUNT`), a Mario sprite spawns
at a random position on the canvas (`marioPos`, generated with its own RNG
seed chain, independent of the seeds used for target values/gaps). Mario
stays on screen for a limited number of ticks (`Constants.MARIO_EXPIRE`,
~2 seconds) before disappearing if not interacted with.

Clicking Mario fires a `KillMario` action that immediately removes the
current lowest (i.e. next-to-resolve) falling target from `targetRects`,
letting the player skip it without matching its value. This is tracked via
three extra fields on `State` — `marioActive`, `marioClicked`, `marioPos` —
and its own tick counter (`tickCountMario`) for the expiry countdown, all
threaded through the same `Tick` reducer that drives the rest of the game
loop.

### TODO: unit test plan

The spec requires tests to be **comprehensive** and to **guide development**,
not just simple/random cases. `test/state.test.ts` is currently empty. Planned
coverage, grouped by the requirement each area maps back to:

**Digit input (`Flip`) — minimum requirement: 8-bit binary answer**
- [ ] Flipping index `i` toggles only bit `i`, leaves the rest untouched
- [ ] Flipping the same index twice returns it to its original value
- [ ] Flipping every index produces the bitwise complement of `playerInput`

**Target matching (`Tick`, `check`) — minimum requirement: compare only
against the lowest unresolved target**
- [ ] Correct `playerInput` against the front-of-queue target scores a match
- [ ] Incorrect `playerInput` does not score a match
- [ ] A correct `playerInput` that only matches a target *behind* the front
      one does **not** count as a match (targets above the front are ignored)
- [ ] A matched target is removed from `targetRects`, and only that one
- [ ] `playerInput` resets to all zeros after a successful match

**Check line / game-over (`Tick`, `reachCheckLine`) — minimum requirement:
game ends only on an unmatched target crossing the line**
- [ ] An unmatched target crossing the check line sets `gameEnd = true`
- [ ] A target matched on the exact tick it reaches the check line does
      **not** end the game (regression test — this was a real bug fixed in
      commit `6fe9eae`)
- [ ] Once `gameEnd` is true, further `Tick`s do not change state

**Scoring — full game requirement: 1 point per matched target**
- [ ] Score increments by exactly 1 per match, not per tick
- [ ] Score does not increment on a miss or on an unrelated action (`Flip`,
      `Pause`)

**Difficulty scaling — full game requirement: game speeds up over time**
- [ ] `velocity` increases by `Constants.ACCELERATION` every
      `Constants.ACC_COUNT` spawns
- [ ] `velocity` does not change between acceleration thresholds

**Target spawning (`Tick`, `generateValue`, `generateGap`) — full game
requirement: random target every 1–3s**
- [ ] A new target is appended only once `tickCountSpawn` reaches `nextSpawn`
- [ ] `generateGap` always produces a value within
      `[SPAWN_TO_TICK_MIN, SPAWN_TO_TICK_MAX]`
- [ ] `generateValue` always produces a value within `[0, Constants.MAX_VAL]`
      (i.e. a valid base-16 target)
- [ ] Spawning advances the RNG seed so consecutive spawns aren't identical

**Restart — full game requirement: restart at any point without refresh**
- [ ] `Restart` returns exactly `initialState`, from any prior state
      (mid-game, paused, or game-over)

**Pause — advanced feature**
- [ ] `Pause` toggles `gamePause` on, then off again
- [ ] While `gamePause` is true, `Tick` is a no-op (state unchanged)
- [ ] Current gap: `Flip`/`KillMario` are **not** frozen by pause — decide
      whether that's intended behaviour or a bug, then test whichever is
      correct

**Mario power-up — advanced feature**
- [ ] Mario becomes active after `Constants.MARIO_SPAWN_COUNT` spawns
- [ ] Clicking Mario (`KillMario`) while active and unclicked removes the
      front-of-queue target and sets `marioClicked = true`
- [ ] Clicking Mario again this spawn (already `marioClicked`) is a no-op
- [ ] `KillMario` while `marioActive` is false is a no-op
- [ ] Mario expires (`marioActive → false`) after `Constants.MARIO_EXPIRE`
      ticks if never clicked
- [ ] `marioPos` stays within canvas bounds
      (`[0, Viewport.CANVAS_WIDTH - Mario.WIDTH]` / height equivalent)

**RNG utilities (`util.ts`)**
- [ ] `RNG.hash` is deterministic (same seed → same output) — needed so the
      above spawn/Mario tests are reproducible
- [ ] `rangeScale` maps `-1 → floor`, `1 → ceiling`, `0 → midpoint` (already
      covered in `test/util.test.ts`)
- [ ] `getIndex` returns the correct digit index for a click on a digit
      element, and `null` for a click elsewhere
- [ ] `isKillMario` returns `true` only for clicks on the Mario element

**Stream wiring (`main.ts`) — integration level, lower priority**
- [ ] Keydown on `Digit1`–`Digit8` dispatches `Flip` with the matching index
- [ ] Held-down keys (`repeat: true`) do not dispatch duplicate `Flip`s
- [ ] `action$` merges all sources without one source starving another

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
