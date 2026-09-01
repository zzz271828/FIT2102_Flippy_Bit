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

    spawnCountdown: Constants.SPAWN_TO_TICK_MIN,
    tickCountMario: 0,
    spawnCount: 0,

    penaltySeed: Constants.SEED_PENALTY,
    marioMissStreak: 0,
    playerInput: [0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,

    marioActive: false,
    marioClicked: false,
    marioPos: { x: 0, y: 0 },
};

const findLowestTarget = (
    targets: ReadonlyArray<TargetRect>,
): TargetRect | undefined =>
    targets.reduce<TargetRect | undefined>(
        (lowest, rect) => (lowest === undefined || rect.y > lowest.y ? rect : lowest),
        undefined,
    );

const checkReachLine = (targets: ReadonlyArray<TargetRect>): boolean => {
    const lowest = findLowestTarget(targets);
    return (
        lowest !== undefined &&
        lowest.y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT
    );
};

function checkInput(
    playerInput: ReadonlyArray<number>,
    lowest: TargetRect | undefined,
): boolean {
    if (lowest === undefined) return false;
    const playerInputVal = playerInput.reduce((acc, bit) => acc * 2 + bit, 0);

    return playerInputVal === lowest.value;
}

const updateTgtPos = (
    targets: ReadonlyArray<TargetRect>,
): ReadonlyArray<TargetRect> =>
    targets.map(rect => ({ ...rect, y: rect.y + rect.velocity }));


const genTgtVal = (seed: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, Constants.MAX_VAL));


const genTgtGap = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            Constants.SPAWN_TO_TICK_MIN,
            Constants.SPAWN_TO_TICK_MAX,
        ),
    );

const genMarioX = (seed: number): number =>
    Math.floor(
        rangeScale(RNG.scale(seed), 0, Viewport.CANVAS_WIDTH - Mario.WIDTH),
    );

const genMarioY = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            0,
            Viewport.CANVAS_HEIGHT - Constants.DIGIT_HEIGHT - Mario.HEIGHT,
        ),
    );

const genPenaltyIndex = (seed: number, count: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, count - 1));

const applyMarioPenalty = (
    targets: ReadonlyArray<TargetRect>,
    seed: number,
    missStreak: number,
): ReadonlyArray<TargetRect> => {
    if (targets.length === 0) return targets;

    const accRectIndex = genPenaltyIndex(seed, targets.length);
    const boost = missStreak * Constants.ACCELERATION;

    return targets.map((rect, index) =>
        index === accRectIndex
            ? { ...rect, velocity: rect.velocity + boost }
            : rect,
    );
};

class Tick implements Action {
    apply(s: State): State {
        if (s.gameEnd || s.gamePause) {
            return s;
        }

        const
            newRectsPos = updateTgtPos(s.targetRects),
            lowestTarget = findLowestTarget(newRectsPos),
            checkInputRes = checkInput(s.playerInput, lowestTarget),
            newScore = checkInputRes ? s.score + 1 : s.score,
            matchRemovedRects = checkInputRes
                ? newRectsPos.filter(rect => rect !== lowestTarget)
                : newRectsPos,
            newPlayerInput = checkInputRes
                ? Constants.EMPTY_PLAYER_INPUT
                : s.playerInput,

            newSpawnCountdown = s.spawnCountdown - 1,
            newTickCntMario = s.marioActive ? s.tickCountMario + 1 : 0,
            checkMarioExpRes =
                s.marioActive && newTickCntMario >= Constants.MARIO_EXPIRE,
            checkMarioActRes = s.marioActive && !checkMarioExpRes,
            marioExpiredUnclicked = checkMarioExpRes && !s.marioClicked,

            newMarioMissStreak = marioExpiredUnclicked
                ? s.marioMissStreak + 1
                : s.marioMissStreak,
            newPenaltySeed = marioExpiredUnclicked
                ? RNG.hash(s.penaltySeed)
                : s.penaltySeed,
            filterRects = marioExpiredUnclicked
                ? applyMarioPenalty(
                      matchRemovedRects,
                      newPenaltySeed,
                      newMarioMissStreak,
                  )
                : matchRemovedRects;

        if (checkReachLine(filterRects)) return { ...s, gameEnd: true };

        if (newSpawnCountdown > 0) {
            const newState = {
                ...s,
                targetRects: filterRects,
                spawnCountdown: newSpawnCountdown,
                score: newScore,
                playerInput: newPlayerInput,
                tickCountMario: checkMarioActRes ? newTickCntMario : 0,
                marioActive: checkMarioActRes,
                penaltySeed: newPenaltySeed,
                marioMissStreak: newMarioMissStreak,
            };
            return newState;
        }

        const newSpawnCount = s.spawnCount + 1,
            checkAccRes = newSpawnCount % Constants.ACC_COUNT === 0,
            checkMarioSpawnRes =
                newSpawnCount % Constants.MARIO_SPAWN_COUNT === 0,
            newSeedVal = RNG.hash(s.seedVal),
            newSeedGap = RNG.hash(s.seedGap),
            marioSeedX = RNG.hash(newSeedGap),
            marioSeedY = RNG.hash(marioSeedX),
            newVelocity = checkAccRes
                ? s.velocity + Constants.ACCELERATION
                : s.velocity,
            newTarget: TargetRect = {
                y: Constants.SPAWN_Y,
                value: genTgtVal(newSeedVal),
                velocity: newVelocity,
            },
            newState = {
                ...s,
                targetRects: [...filterRects, newTarget],
                seedVal: newSeedVal,
                seedGap: newSeedGap,
                spawnCountdown: genTgtGap(newSeedGap),
                score: newScore,
                playerInput: newPlayerInput,
                velocity: newVelocity,
                spawnCount: newSpawnCount,
                tickCountMario: checkMarioSpawnRes
                    ? 0
                    : checkMarioActRes
                      ? newTickCntMario
                      : 0,
                marioActive: checkMarioSpawnRes || checkMarioActRes,
                marioClicked: checkMarioSpawnRes ? false : s.marioClicked,
                marioPos: checkMarioSpawnRes
                    ? {
                          x: genMarioX(marioSeedX),
                          y: genMarioY(marioSeedY),
                      }
                    : s.marioPos,
                penaltySeed: newPenaltySeed,
                marioMissStreak: newMarioMissStreak,
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
            s.gamePause ||
            !s.marioActive ||
            s.marioClicked ||
            s.targetRects.length === 0
        )
            return s;

        return {
            ...s,
            targetRects: s.targetRects.slice(1),
            marioClicked: true,
            marioMissStreak: 0,
        };
    }
}

class Flip implements Action {
    constructor(private readonly index: number) {} // starts from 0
    apply(s: State): State {
        if (s.gamePause) return s;

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
        if (s.gameEnd) return s;

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
 * 44: 01000100 (2, 6)
 * */