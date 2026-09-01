export {Viewport, Target, Mario, Constants};
export type {TargetRect, State, Event, Key, Action};


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
    TICK_RATE_MS: 20, // Might need to change this!
    SPAWN_TO_TICK_MIN: 50,
    SPAWN_TO_TICK_MAX: 150,
    VELOCITY: 0.7,
    SPAWN_Y: 40,
    SEED_VAL: 10,
    SEED_GAP: 11,
    MAX_VAL: 255,
    EMPTY_PLAYER_INPUT: [0, 0, 0, 0, 0, 0, 0, 0],
    ACC_COUNT: 5, // the accelaration happens every ACC_COUNT spawn
    MARIO_SPAWN_COUNT: 5,
    MARIO_EXPIRE: 100,
    DIGIT_HEIGHT: 50,
    ACCELERATION: 0.1,
} as const;


/** Types */
type TargetRect = Readonly<{
    // x: number;
    y: number;
    value: number;
}>;

// State processing
type State = Readonly<{
    gameEnd: boolean;
    gamePause: boolean;
    targetRects: ReadonlyArray<TargetRect>;
    velocity: number;

    tickCountSpawn: number;
    tickCountMario: number;
    spawnCount: number;
    seedVal: number;

    seedGap: number;
    nextSpawn: number;

    playerInput: ReadonlyArray<number>;
    score: number;

    marioActive: boolean;
    marioClicked: boolean;
    marioPos: Readonly<{ x: number; y: number }>;
}>;

type Event = 'keydown' | 'keyup';

type Key = 'Digit1' | 'Digit2' | 'Digit3' | 'Digit4' | 'Digit5' | 'Digit6' | 'Digit7' | 'Digit8' | 'KeyR' | 'Space';

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}


