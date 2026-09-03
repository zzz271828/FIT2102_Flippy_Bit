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

import { RNG, rangeScale } from "./util";

// This file is the "model" half of the Asteroids-style FRP loop: every
// Action below is a pure State -> State function, and main.ts feeds the
// merged action$ stream into scan(reduceState, initialState) to fold them
// into a stream of States. Nothing in here touches the DOM or does any
// other side effect - that's kept entirely in view.ts's subscribe handler.

const initialState: State = {
    gameEnd: false,
    gamePause: false,
    targetRects: [],
    velocity: Constants.VELOCITY,

    tickCount: 0,
    marioActivatedTick: 0,
    spawnCount: 0,

    marioSeed: Constants.SEED_MARIO,
    penaltySeed: Constants.SEED_PENALTY,
    marioMissStreak: 0,
    playerInput: [0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,

    marioActive: false,
    marioClicked: false,
    marioPos: { x: 0, y: 0 },
};

// the player's digit row only ever gets compared to the target closest to
// the check line - in SVG, y grows downward, so "closest to the line" is
// just the target with the biggest y
const findLowestTarget = (
    targets: ReadonlyArray<TargetRect>,
): TargetRect | undefined =>
    targets.reduce<TargetRect | undefined>(
        (lowest, rect) =>
            lowest === undefined || rect.y > lowest.y ? rect : lowest,
        undefined,
    );

const checkReachLine = (targets: ReadonlyArray<TargetRect>): boolean => {
    const lowest = findLowestTarget(targets);
    return (
        lowest !== undefined &&
        lowest.y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT
    );
};
// check if the user input matches the base 16 target. playerInput is 8 bits
// (binary), so we fold it back into a plain decimal number first (each bit
// shifts the running total left by one, same as reading binary digit by
// digit) and compare that against the target's stored decimal value
const checkInput = (
    playerInput: ReadonlyArray<number>,
    lowest: TargetRect | undefined,
): boolean =>
    lowest !== undefined &&
    playerInput.reduce((acc, bit) => acc * 2 + bit, 0) === lowest.value;

// targets falling position update
const updateTgtPos = (
    targets: ReadonlyArray<TargetRect>,
): ReadonlyArray<TargetRect> =>
    targets.map(rect => ({ ...rect, y: rect.y + rect.velocity }));

// random x/y for mario, inside the canvas
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

// picks a random target on screen to give the penalty to
const genPenaltyIndex = (seed: number, count: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, count - 1));

/**
 * Punishes the player for missing mario: speeds up one random target on
 * screen. The more times in a row mario is missed, the bigger the acceleration
 */
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

// moves every target down one step, then checks if the player's current
// input matches the lowest one. if it does, that target is removed and
// the score goes up
const applyMatch = (s: State): State => {
    const movedRects = updateTgtPos(s.targetRects),
        lowestTarget = findLowestTarget(movedRects),
        matched = checkInput(s.playerInput, lowestTarget);

    return {
        ...s,
        targetRects: matched
            ? movedRects.filter(rect => rect !== lowestTarget)
            : movedRects,
        score: matched ? s.score + 1 : s.score,
        playerInput: matched ? Constants.EMPTY_PLAYER_INPUT : s.playerInput,
    };
};

// expires mario if he's been on screen too long without being clicked. if
// he does time out, that's a "miss": missStreak goes up by one and a fresh
// penaltySeed is hashed out so the next penalty (see applyMarioPenalty)
// picks an independent random target and gets a bigger speed boost than
// last time - consecutive misses punish the player progressively harder
const applyMarioLifeCyc = (s: State): State => {
    const newTickCount = s.tickCount + 1,
        expired =
            s.marioActive &&
            newTickCount - s.marioActivatedTick >= Constants.MARIO_EXPIRE,
        stillActive = s.marioActive && !expired,
        missedUnclicked = expired && !s.marioClicked,
        newMissStreak = missedUnclicked
            ? s.marioMissStreak + 1
            : s.marioMissStreak,
        newPenaltySeed = missedUnclicked
            ? RNG.hash(s.penaltySeed)
            : s.penaltySeed;

    return {
        ...s,
        targetRects: missedUnclicked
            ? applyMarioPenalty(s.targetRects, newPenaltySeed, newMissStreak)
            : s.targetRects,
        tickCount: newTickCount,
        marioActive: stillActive,
        marioMissStreak: newMissStreak,
        penaltySeed: newPenaltySeed,
    };
};

// runs a list of T -> T functions in order, left to right - this is what
// lets Tick's apply below read as a straight-line sequence of steps instead
// of one big nested function
const pipe =
    <T>(...fns: ReadonlyArray<(t: T) => T>) =>
    (t: T): T =>
        fns.reduce((acc, f) => f(acc), t);

// wraps a T -> T function so it does nothing when blocked is true. this is
// a small curried HOF so every Action that should freeze during game-over/
// pause can just wrap its logic in whilePlaying(...) instead of every one
// of them repeating an `if (s.gameEnd) return s` guard at the top
const guardBy =
    <T>(blocked: (t: T) => boolean) =>
    (f: (t: T) => T) =>
    (t: T): T =>
        blocked(t) ? t : f(t);

const whilePlaying = guardBy((s: State) => s.gameEnd || s.gamePause);

// runs once per clock tick (see tick$ in observables.ts): move targets,
// check for a match, update mario, then check if a target has reached the
// line (game over). order matters here - matching has to happen against
// the targets' *new* position, and the reach-line check has to happen
// last so it sees this tick's final targetRects
class Tick implements Action {
    apply = whilePlaying(
        pipe(applyMatch, applyMarioLifeCyc, s =>
            checkReachLine(s.targetRects) ? { ...s, gameEnd: true } : s,
        ),
    );
}

// adds one new falling target. The value is generated by the spawn$
// stream in observables.ts. also handles the two things that are tied to
// "how many targets have spawned so far": every ACC_COUNT-th spawn speeds
// the game up a notch, and every MARIO_SPAWN_COUNT-th spawn brings mario
// on screen at a freshly-hashed random position
class Spawn implements Action {
    constructor(private readonly value: number) {}

    apply = whilePlaying((s: State): State => {
        const newSpawnCount = s.spawnCount + 1,
            checkAccRes = newSpawnCount % Constants.ACC_COUNT === 0,
            checkMarioSpawnRes =
                newSpawnCount % Constants.MARIO_SPAWN_COUNT === 0,
            newMarioSeed = RNG.hash(s.marioSeed),
            marioSeedX = RNG.hash(newMarioSeed),
            marioSeedY = RNG.hash(marioSeedX),
            newVelocity = checkAccRes
                ? s.velocity + Constants.ACCELERATION
                : s.velocity,
            newTarget: TargetRect = {
                y: Constants.SPAWN_Y,
                value: this.value,
                velocity: newVelocity,
            };

        return {
            ...s,
            targetRects: [...s.targetRects, newTarget],
            velocity: newVelocity,
            spawnCount: newSpawnCount,
            marioSeed: newMarioSeed,
            marioActivatedTick: checkMarioSpawnRes
                ? s.tickCount
                : s.marioActivatedTick,
            marioActive: checkMarioSpawnRes || s.marioActive,
            marioClicked: checkMarioSpawnRes ? false : s.marioClicked,
            marioPos: checkMarioSpawnRes
                ? {
                      x: genMarioX(marioSeedX),
                      y: genMarioY(marioSeedY),
                  }
                : s.marioPos,
        };
    });
}

// player clicked mario in time: it removes the oldest target on screen as a
// reward (if there is one), and resets the miss streak so the penalty
// stops growing
class KillMario implements Action {
    apply = guardBy(
        (s: State) =>
            s.gameEnd || s.gamePause || !s.marioActive || s.marioClicked,
    )(s => ({
        ...s,
        targetRects: s.targetRects.slice(1),
        marioClicked: true,
        marioMissStreak: 0,
    }));
}

class Flip implements Action {
    constructor(private readonly index: number) {} // starts from 0

    apply(s: State): State {
        return whilePlaying(state => ({
            ...state,
            playerInput: state.playerInput.map((bit, index) =>
                index === this.index ? 1 - bit : bit,
            ),
        }))(s);
    }
}

// if refresh, then back to the initial state
class Restart implements Action {
    apply(_: State): State {
        return initialState;
    }
}

// toggles pause, but not once the game has already ended
class Pause implements Action {
    apply = guardBy((s: State) => s.gameEnd)(s => ({
        ...s,
        gamePause: !s.gamePause,
    }));
}

const reduceState = (s: State, action: Action): State => action.apply(s);
