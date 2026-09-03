import {
    Observable,
    expand,
    filter,
    fromEvent,
    interval,
    map,
    merge,
    share,
    startWith,
    switchMap,
    timer,
} from "rxjs";

import { Action, Constants, Event, Key, SpawnSeed } from "./types";
import { Tick, Spawn, Flip, Restart, KillMario, Pause } from "./state";
import { RNG, getIndex, isKillMario, rangeScale } from "./util";

export { createActionStream };

const KEYS: ReadonlyArray<Key> = [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
];

const genSpawnValue = (seed: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, Constants.MAX_VAL));

const genSpawnGapMs = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            Constants.SPAWN_TO_TICK_MIN * Constants.TICK_RATE_MS,
            Constants.SPAWN_TO_TICK_MAX * Constants.TICK_RATE_MS,
        ),
    );

/**
 * Combines every input source -- the game clock, keyboard, and mouse -- into
 * the single Action stream that drives the game. Everything is built inside
 * this function, not as module-level constants, so that importing this
 * module never touches `document` before the browser is ready.
 */
const createActionStream = (svgCanvas: SVGSVGElement): Observable<Action> => {
    const tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
            map(() => new Tick()),
        ),
        mousedown$ = fromEvent<MouseEvent>(svgCanvas, "mousedown").pipe(
            share(),
        ),
        mouseFlip$ = mousedown$.pipe(
            map(getIndex), // could be number or null
            filter(index => index !== null),
            map(index => new Flip(index)),
        ),
        killMarioClick$: Observable<Action> = mousedown$.pipe(
            filter(isKillMario),
            map(() => new KillMario()),
        ),
        keyFlip$ = (e: Event) => (k: Key) =>
            fromEvent<KeyboardEvent>(document, e).pipe(
                filter(({ code }) => code === k),
                filter(({ repeat }) => !repeat),
            ),
        keydown$ = keyFlip$("keydown"),
        restart$: Observable<Action> = keydown$("KeyR").pipe(
            map(() => new Restart()),
        ),
        pause$: Observable<Action> = keydown$("Space").pipe(
            map(() => new Pause()),
        ),
        flips$ = merge(
            ...KEYS.map((key, index) =>
                keydown$(key).pipe(map(() => new Flip(index))),
            ),
            mouseFlip$,
        ),
        // re-subscribes on every Restart, so the spawn sequence replays from
        // the same starting seeds instead of continuing where it left off
        spawn$: Observable<Action> = restart$.pipe(
            startWith(null),
            switchMap(() =>
                timer(
                    Constants.SPAWN_TO_TICK_MIN * Constants.TICK_RATE_MS,
                ).pipe(
                    map(
                        (): SpawnSeed => ({
                            valSeed: RNG.hash(Constants.SEED_VAL),
                            gapSeed: RNG.hash(Constants.SEED_GAP),
                        }),
                    ),
                    expand(seed =>
                        timer(genSpawnGapMs(seed.gapSeed)).pipe(
                            map(
                                (): SpawnSeed => ({
                                    valSeed: RNG.hash(seed.valSeed),
                                    gapSeed: RNG.hash(seed.gapSeed),
                                }),
                            ),
                        ),
                    ),
                    map(seed => new Spawn(genSpawnValue(seed.valSeed))),
                ),
            ),
        ),
        action$: Observable<Action> = merge(
            tick$,
            flips$,
            restart$,
            spawn$,
            killMarioClick$,
            pause$,
        );

    return action$;
};
