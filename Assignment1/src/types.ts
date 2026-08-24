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
    SPAWN_RATE_MS: 1000,
    VELOCITY: 2,
    SPAWN_Y: 40,
    SEED: 2102
} as const;


/** Types */
type TargetRect = Readonly<{
    // x: number;
    y: number;
    value: number;
    onGround: boolean;
}>;

// State processing
type State = Readonly<{
    gameEnd: boolean;
    targetRects: ReadonlyArray<TargetRect>;
}>;


/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
