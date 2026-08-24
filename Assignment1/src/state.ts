export { initialState, reduceState, Tick, Spawn, Flip };

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
    seedVal: Constants.SEED_VAL,
    seedGap: Constants.SEED_GAP,
    tickCount: 0,
    nextSpawn: Constants.SPAWN_TO_TICK_MIN,
    playerInput: [0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,
};

const reachCheckLine = (targets: ReadonlyArray<TargetRect>) => 
    targets.length > 0 && targets[0].y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT



const rectsUpdatePos = (
    targets: ReadonlyArray<TargetRect>,
): ReadonlyArray<TargetRect> =>
    targets
        .map(rect => ({ ...rect, y: rect.y + Constants.VELOCITY }));

const generateValue = (seed: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, Constants.MAX_VAL));

/**
 * Turns a seed into a random spawn gap in [MIN, MAX] ticks.
 */
const generateGap = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            Constants.SPAWN_TO_TICK_MIN,
            Constants.SPAWN_TO_TICK_MAX,
        ),
    );

function check(
    playerInput: ReadonlyArray<number>,
    rects: ReadonlyArray<TargetRect>,
): boolean {
    if (rects.length === 0) return false;
    const playerInputVal = playerInput.reduce((acc, bit) => acc * 2 + bit, 0);
    const lowestRectVal = rects[0].value;

    return playerInputVal === lowestRectVal;
}

class Tick implements Action {
    apply(s: State): State {
        if (s.gameEnd) return s;

        const newPosRects = rectsUpdatePos(s.targetRects);

        if (reachCheckLine(newPosRects)) return {...s, gameEnd: true};

        const checkRes = check(s.playerInput, newPosRects),
            newScore = checkRes ? s.score + 1 : s.score,
            filterRects = checkRes
                ? newPosRects.slice(1)
                : newPosRects,
            newTickCount = s.tickCount + 1,
            newPlayerInput = checkRes? Constants.EMPTY_PLAYER_INPUT : s.playerInput;

        if (newTickCount < s.nextSpawn) {
            const newState = {
                ...s,
                targetRects: filterRects,
                tickCount: newTickCount,
                score: newScore,
                playerInput: newPlayerInput,
            };
            return newState;
        }

        const newSeedVal = RNG.hash(s.seedVal),
            newSeedGap = RNG.hash(s.seedGap),
            newTarget: TargetRect = {
                y: Constants.SPAWN_Y,
                value: generateValue(newSeedVal),
            },
            newState = {
                ...s,
                targetRects: [...filterRects, newTarget],
                seedVal: newSeedVal,
                seedGap: newSeedGap,
                tickCount: 0,
                nextSpawn: generateGap(newSeedGap),
                score: newScore,
                playerInput: newPlayerInput,
            };

        return newState;
    }
}

class Spawn implements Action {
    constructor(private readonly target: TargetRect) {}

    apply(s: State): State {
        return { ...s, targetRects: [...s.targetRects, this.target] };
    }
}

class Flip implements Action {
    constructor(private readonly index: number) {} // starts from 0 mf
    apply(s: State): State {
        const newbits = s.playerInput.map((bit, index) =>
            index === this.index ? 1 - bit : bit,
        );
        return { ...s, playerInput: newbits };
    }
}

// TODO: i don't know why add this but it's from the workshop game. they added this and it works nice
const reduceState = (s: State, action: Action): State => action.apply(s);

/**
 * 23: 00100011 (3, 7, 8)
 * DB: 11011011 (1, 2, 4, 5, 7, 8)
 * 2:  00000010 (7)
 */
