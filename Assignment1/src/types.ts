export {Viewport, Target, Constants};
export type {TargetRect, State, Action};


/** Constants */

const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 20, // Might need to change this!
    SPAWN_TO_TICK_MIN: 50,
    SPAWN_TO_TICK_MAX: 150,
    VELOCITY: 2,
    SPAWN_Y: 40,
    SEED_VAL: 0,
    SEED_GAP: 1,
    MAX_VAL: 255,
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
    targetRects: ReadonlyArray<TargetRect>;
    tickCount: number;
    seedVal: number;
    seedGap: number;
    nextSpawn: number;
}>;


/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
