export { Viewport, Target, Mario, Constants };
export type { TargetRect, State, KeyEventName, Key, Action, SpawnSeed };

/** Constants */

const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

const Mario = {
    WIDTH: 48,
    HEIGHT: 48,
} as const;

const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 20,
    // these two are in "ticks", not ms - observables.ts multiplies them by
    // TICK_RATE_MS to get the actual random spawn-gap range (1s - 3s)
    SPAWN_TO_TICK_MIN: 50,
    SPAWN_TO_TICK_MAX: 150,
    VELOCITY: 0.7, // px per tick that a fresh target falls at
    SPAWN_Y: 40, // y a new target is born at, just under the top edge
    // starting seeds for each independent RNG stream (value/gap/mario/
    // penalty) - kept separate so e.g. rerolling mario doesn't change which
    // target value comes next
    SEED_VAL: 10,
    SEED_GAP: 11,
    SEED_PENALTY: 13,
    SEED_MARIO: 17,
    MAX_VAL: 255, // 0xFF, since targets are base-16 and hold in one byte
    EMPTY_PLAYER_INPUT: [0, 0, 0, 0, 0, 0, 0, 0],
    ACC_COUNT: 5, // the accelaration happens every ACC_COUNT spawn
    MARIO_SPAWN_COUNT: 3, // mario shows up every 3rd spawn
    MARIO_EXPIRE: 100, // ticks before mario vanishes (2s @ 20ms/tick)
    DIGIT_HEIGHT: 50,
    ACCELERATION: 0.1, // px/tick added to velocity, on speed-up & penalty
} as const;

/** Types */
type TargetRect = Readonly<{
    y: number;
    value: number;
    velocity: number;
}>;

// Everything the game needs to redraw itself lives here - one big immutable
// snapshot, grouped roughly by what it's for (core game loop / counters used
// to time spawns & mario / RNG seeds carried forward tick to tick / player's
// answer & score / mario's own on-screen state). state.ts only ever returns
// a brand new State object, never mutates this one, so the RNG seeds are how
// "randomness" stays reproducible from a given seed rather than relying on
// hidden global mutable state.
type State = Readonly<{
    gameEnd: boolean;
    gamePause: boolean;
    targetRects: ReadonlyArray<TargetRect>;
    velocity: number;

    tickCount: number;
    marioActivatedTick: number;
    spawnCount: number;

    marioSeed: number;
    penaltySeed: number;
    marioMissStreak: number;

    playerInput: ReadonlyArray<number>;
    score: number;

    marioActive: boolean;
    marioClicked: boolean;
    marioPos: Readonly<{ x: number; y: number }>;
}>;

type SpawnSeed = Readonly<{ valSeed: number; gapSeed: number }>;

type KeyEventName = "keydown" | "keyup";

type Key =
    | "Digit1"
    | "Digit2"
    | "Digit3"
    | "Digit4"
    | "Digit5"
    | "Digit6"
    | "Digit7"
    | "Digit8"
    | "KeyR"
    | "Space";

/**
 * Actions modify state
 */
interface Action {
    apply(s: State): State;
}
