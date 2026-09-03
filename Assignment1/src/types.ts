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
    // these two are in "ticks", correcsponding to 1 - 3 second
    SPAWN_TO_TICK_MIN: 50,
    SPAWN_TO_TICK_MAX: 150,
    VELOCITY: 0.7, // px per tick that a initial target start with
    SPAWN_Y: 40, 

    SEED_VAL: 10,
    SEED_GAP: 11,
    SEED_PENALTY: 13,
    SEED_MARIO: 17,
    MAX_VAL: 255,
    EMPTY_PLAYER_INPUT: [0, 0, 0, 0, 0, 0, 0, 0],
    ACC_COUNT: 5, // the accelaration happens every ACC_COUNT spawn
    MARIO_SPAWN_COUNT: 3, // mario shows up every 3 spawns
    MARIO_EXPIRE: 100, // ticks before mario vanishes (2 s)
    DIGIT_HEIGHT: 50,
    ACCELERATION: 0.1, // px/tick added to velocity, on speed-up & penalty
} as const;

/** Types */
type TargetRect = Readonly<{
    y: number;
    value: number;
    velocity: number;
}>;

// Everything the game needs to redraw itself lives here 
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
