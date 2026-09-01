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

const checkReachLine = (targets: ReadonlyArray<TargetRect>) =>
    targets.length > 0 &&
    targets[0].y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT;

function checkInput(
    playerInput: ReadonlyArray<number>,
    rects: ReadonlyArray<TargetRect>,
): boolean {
    if (rects.length === 0) return false;
    const playerInputVal = playerInput.reduce((acc, bit) => acc * 2 + bit, 0);
    const lowestRectVal = rects[0].value;

    return playerInputVal === lowestRectVal;
}

const updateTgtPos = (
    targets: ReadonlyArray<TargetRect>,
    velocity: number,
): ReadonlyArray<TargetRect> =>
    targets.map(rect => ({ ...rect, y: rect.y + velocity }));


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

class Tick implements Action {
    apply(s: State): State {
        if (s.gameEnd || s.gamePause) {
            return s;
        }

        const 
            newRectsPos = updateTgtPos(s.targetRects, s.velocity),
            checkInputRes = checkInput(s.playerInput, newRectsPos),
            newScore = checkInputRes ? s.score + 1 : s.score, 
            filterRects = checkInputRes ? newRectsPos.slice(1) : newRectsPos, 
            newPlayerInput = checkInputRes
                ? Constants.EMPTY_PLAYER_INPUT
                : s.playerInput,
            
            newTickCntSpawn = s.tickCountSpawn + 1,
            newTickCntMario = s.marioActive ? s.tickCountMario + 1 : 0,
            checkMarioExpRes =
                s.marioActive && newTickCntMario >= Constants.MARIO_EXPIRE,
            checkMarioActRes = s.marioActive && !checkMarioExpRes;

        if (checkReachLine(filterRects)) return { ...s, gameEnd: true };

        if (newTickCntSpawn < s.nextSpawn) {
            const newState = {
                ...s,
                targetRects: filterRects,
                tickCountSpawn: newTickCntSpawn,
                score: newScore,
                playerInput: newPlayerInput,
                tickCountMario: checkMarioActRes ? newTickCntMario : 0,
                marioActive: checkMarioActRes,
            };
            return newState;
        }

        const newSpawnCount = s.spawnCount + 1,
            checkAccRes = newSpawnCount >= Constants.ACC_COUNT,
            checkMarioSpawnRes = newSpawnCount >= Constants.MARIO_SPAWN_COUNT,
            newSeedVal = RNG.hash(s.seedVal),
            newSeedGap = RNG.hash(s.seedGap),
            marioSeedX = RNG.hash(newSeedGap),
            marioSeedY = RNG.hash(marioSeedX),
            newTarget: TargetRect = {
                y: Constants.SPAWN_Y,
                value: genTgtVal(newSeedVal),
            },
            newState = {
                ...s,
                targetRects: [...filterRects, newTarget],
                seedVal: newSeedVal,
                seedGap: newSeedGap,
                tickCountSpawn: 0,
                nextSpawn: genTgtGap(newSeedGap),
                score: newScore,
                playerInput: newPlayerInput,
                velocity: checkAccRes
                    ? s.velocity + Constants.ACCELERATION
                    : s.velocity,
                spawnCount:
                    checkAccRes && checkMarioSpawnRes ? 0 : newSpawnCount,
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
