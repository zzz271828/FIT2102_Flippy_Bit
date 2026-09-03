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

import { Action, Constants, KeyEventName, Key, SpawnSeed } from "./types";
import { Tick, Spawn, Flip, Restart, KillMario, Pause } from "./state";
import { RNG, getIndex, isKillMario, rangeScale } from "./util";

export { createActionStream };

// This is the "input" half of the FRP loop: every source of change in the
// game (the clock, keyboard, mouse) gets turned into its own
// Observable<Action> stream, and they're all merge()'d together at the
// bottom into one action$. main.ts pipes action$ into scan(reduceState, ...)
// so state.ts never has to know or care where an Action came from.

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

// turns a seed into a random target value (0-255)
const genSpawnValue = (seed: number): number =>
    Math.floor(rangeScale(RNG.scale(seed), 0, Constants.MAX_VAL));

// turns a seed into how many ms to wait before the next spawn (1-3s)
const genSpawnGapMs = (seed: number): number =>
    Math.floor(
        rangeScale(
            RNG.scale(seed),
            Constants.SPAWN_TO_TICK_MIN * Constants.TICK_RATE_MS,
            Constants.SPAWN_TO_TICK_MAX * Constants.TICK_RATE_MS,
        ),
    );

/**
 * Combines every input source
 */
const createActionStream = (svgCanvas: SVGSVGElement): Observable<Action> => {
    const tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
            map(() => new Tick()),
        ),
        // share() so both mouseFlip$ and killMarioClick$ read from the same
        // click events instead of each attaching their own subscriber
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
        // curried: keyFlip$("keydown") gives back a reusable "listen for
        // this one key" function, so keydown$("KeyR") / keydown$("Digit1")
        // etc below can all share the same filtering logic without
        // re-attaching a fresh fromEvent listener by hand each time.
        // repeat events are dropped so holding a key down doesn't spam flips
        keyFlip$ = (e: KeyEventName) => (k: Key) =>
            fromEvent<KeyboardEvent>(document, e).pipe(
                filter(({ code }) => code === k),
                filter(({ repeat }) => !repeat),
            ),
        keydown$ = keyFlip$("keydown"),
        // shared so both merge() below and spawn$'s switchMap read from one
        // "R" keydown listener instead of each attaching their own
        restart$: Observable<Action> = keydown$("KeyR").pipe(
            map(() => new Restart()),
            share(),
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
        // Keeps spawning targets forever, with a random 1-3s gap each time.
        // expand() is used because each wait time depends on the *previous*
        // one's random seed (it recursively feeds its own output (the next
        // SpawnSeed) back in as the input for the next timer())
        //  the whole thing is wrapped in restart$.pipe(switchMap
        // (...)) so pressing R cancels whatever timer was pending and starts
        // a brand new spawn chain from scratch
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
