export { initialState, reduceState, Tick, Spawn };

    import { C } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";
import {
    State,
    Action,
    TargetRect,
    Constants,
    Target,
    Viewport,
} from "./types";

import { RNG, createRngStreamFromSource, rangeScale } from "./util";

const initialState: State = {
    gameEnd: false,
    targetRects: [],
    seed: Constants.SEED,
    tickCount: 0,
    nextSpawn: Constants.SPAWN_TO_TICK_MIN,
};

const rectsUpdtaes = (targets: ReadonlyArray<TargetRect>): ReadonlyArray<TargetRect> =>
    targets
        .map(rect => ({ ...rect, y: rect.y + Constants.VELOCITY }))
        .filter(rect => rect.y + Target.HEIGHT < Viewport.CANVAS_HEIGHT);


const generateValue = (seed: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, Constants.MAX_VAL));

/**
 * Turns a seed into a random spawn gap in [MIN, MAX] ticks.
 */
const generateGap = (seed: number): number =>
    Math.floor(
        rangeScale(RNG.scale(seed), Constants.SPAWN_TO_TICK_MIN, Constants.SPAWN_TO_TICK_MAX),
    );



class Tick implements Action {
    apply(s: State): State {
        if (s.gameEnd) return s;

        const filteredRects = rectsUpdtaes(s.targetRects);
        const newtickCount = s.tickCount + 1;

        if(newtickCount < s.nextSpawn) {
            const newState = { ...s, targetRects: filteredRects, tickCount: newtickCount };
            return newState;
        }

        const newSeed = RNG.hash(s.seed);
        const newTarget: TargetRect = {y: Constants.SPAWN_Y, value: generateValue(newSeed)};
        const newState = { ...s, targetRects: [...filteredRects, newTarget], seed: newSeed, tickCount: 0, nextSpawn: generateGap(newSeed)};

        return newState;
    }
}

class Spawn implements Action {
    constructor(private readonly target: TargetRect) {}

    apply(s: State): State {
        return { ...s, targetRects: [...s.targetRects, this.target] };
    }
}

// TODO: i don't know why add this but it's from the workshop game. they added this and it works nice
const reduceState = (s: State, action: Action): State => action.apply(s);
