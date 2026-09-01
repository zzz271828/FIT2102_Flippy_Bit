export {
    initialState,
    reduceState,
    Tick,
    Spawn,
    Flip,
    Restart,
    KillMario,
    Pause,
};

import {
    State,
    Action,
    TargetRect,
    Constants,
    Target,
    Mario,
    Viewport,
} from "./types";

import { RNG, createRngStreamFromSource, rangeScale } from "./util";

const initialState: State = {
    gameEnd: false,
    gamePause: false,
    targetRects: [],
    velocity: Constants.VELOCITY,

    seedVal: Constants.SEED_VAL,
    seedGap: Constants.SEED_GAP,

    tickCountSpawn: 0,
    tickCountMario: 0,
    spawnCount: 0,

    nextSpawn: Constants.SPAWN_TO_TICK_MIN,
    playerInput: [0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,

    marioActive: false,
    marioClicked: false,
    marioPos: { x: 0, y: 0 },
};

const reachCheckLine = (targets: ReadonlyArray<TargetRect>) =>
    targets.length > 0 &&
    targets[0].y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT;

const rectsUpdatePos = (
    targets: ReadonlyArray<TargetRect>,
    velocity: number,
): ReadonlyArray<TargetRect> =>
    targets.map(rect => ({ ...rect, y: rect.y + velocity }));

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

const generateMarioX = (seed: number): number =>
    Math.floor(
        rangeScale(RNG.scale(seed), 0, Viewport.CANVAS_WIDTH - Mario.WIDTH),
    );

const generateMarioY = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            0,
            Viewport.CANVAS_HEIGHT - Constants.DIGIT_HEIGHT - Mario.HEIGHT,
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
        if (s.gameEnd || s.gamePause) {
            return s;
        }

        const newPosRects = rectsUpdatePos(s.targetRects, s.velocity),
            checkInputRes = check(s.playerInput, newPosRects),
            newScore = checkInputRes ? s.score + 1 : s.score,
            filterRects = checkInputRes ? newPosRects.slice(1) : newPosRects,
            newPlayerInput = checkInputRes
                ? Constants.EMPTY_PLAYER_INPUT
                : s.playerInput,
            newTickCountSpawn = s.tickCountSpawn + 1,
            newTickCountMario = s.marioActive ? s.tickCountMario + 1 : 0,
            marioExpired =
                s.marioActive && newTickCountMario >= Constants.MARIO_EXPIRE,
            marioStillActive = s.marioActive && !marioExpired;

        if (reachCheckLine(filterRects)) return { ...s, gameEnd: true };

        if (newTickCountSpawn < s.nextSpawn) {
            const newState = {
                ...s,
                targetRects: filterRects,
                tickCountSpawn: newTickCountSpawn,
                score: newScore,
                playerInput: newPlayerInput,
                tickCountMario: marioStillActive ? newTickCountMario : 0,
                marioActive: marioStillActive,
            };
            return newState;
        }

        const newSpawnCount = s.spawnCount + 1,
            checkAccRes = newSpawnCount >= Constants.ACC_COUNT,
            chackMarioSpawnRes = newSpawnCount >= Constants.MARIO_SPAWN_COUNT,
            newSeedVal = RNG.hash(s.seedVal),
            newSeedGap = RNG.hash(s.seedGap),
            marioSeedX = RNG.hash(newSeedGap),
            marioSeedY = RNG.hash(marioSeedX),
            newTarget: TargetRect = {
                y: Constants.SPAWN_Y,
                value: generateValue(newSeedVal),
            },
            newState = {
                ...s,
                targetRects: [...filterRects, newTarget],
                seedVal: newSeedVal,
                seedGap: newSeedGap,
                tickCountSpawn: 0,
                nextSpawn: generateGap(newSeedGap),
                score: newScore,
                playerInput: newPlayerInput,
                velocity: checkAccRes
                    ? s.velocity + Constants.ACCELERATION
                    : s.velocity,
                spawnCount:
                    checkAccRes && chackMarioSpawnRes ? 0 : newSpawnCount,
                tickCountMario: chackMarioSpawnRes
                    ? 0
                    : marioStillActive
                      ? newTickCountMario
                      : 0,
                marioActive: chackMarioSpawnRes || marioStillActive,
                marioClicked: chackMarioSpawnRes ? false : s.marioClicked,
                marioPos: chackMarioSpawnRes
                    ? {
                          x: generateMarioX(marioSeedX),
                          y: generateMarioY(marioSeedY),
                      }
                    : s.marioPos,
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

class KillMario implements Action {
    apply(s: State): State {
        if (
            s.gameEnd ||
            !s.marioActive ||
            s.marioClicked ||
            s.targetRects.length === 0
        )
            return s;

        return {
            ...s,
            targetRects: s.targetRects.slice(1),
            marioClicked: true,
        };
    }
}

class Flip implements Action {
    constructor(private readonly index: number) {} // starts from 0
    apply(s: State): State {
        const newbits = s.playerInput.map((bit, index) =>
            index === this.index ? 1 - bit : bit,
        );
        return { ...s, playerInput: newbits };
    }
}

class Restart implements Action {
    apply(_: State): State {
        return initialState;
    }
}

class Pause implements Action {
    apply(s: State): State {
        return {
            ...s,
            gamePause: !s.gamePause,
        };
    }
}

const reduceState = (s: State, action: Action): State => action.apply(s);

/**
 * 23: 00100011 (3, 7, 8)
 * DB: 11011011 (1, 2, 4, 5, 7, 8)
 * 2:  00000010 (7)
 * B5: 10110101 (1, 3, 4, 6, 8)
 * 99: 10011001 (1, 4, 5, 8)
 * 78: 01111000 (2, 3, 4, 5)
 */
