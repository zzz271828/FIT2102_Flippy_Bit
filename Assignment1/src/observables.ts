import { Observable, filter, fromEvent, interval, map, merge } from "rxjs";

import { Action, Constants, Event, Key } from "./types";
import { Tick, Flip, Restart, KillMario, Pause } from "./state";
import { getIndex, isKillMario } from "./util";

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
        mouseFlip$ = fromEvent<MouseEvent>(svgCanvas, "mousedown").pipe(
            map(getIndex), // could be number or null
            filter(index => index !== null),
            map(index => new Flip(index)),
        ),
        killMarioClick$: Observable<Action> = fromEvent<MouseEvent>(
            svgCanvas,
            "mousedown",
        ).pipe(
            filter(isKillMario),
            map(() => new KillMario()),
        ),
        keyFlip$ = (e: Event, k: Key) =>
            fromEvent<KeyboardEvent>(document, e).pipe(
                filter(({ code }) => code === k),
                filter(({ repeat }) => !repeat),
            ),
        restart$: Observable<Action> = keyFlip$("keydown", "KeyR").pipe(
            map(() => new Restart()),
        ),
        pause$: Observable<Action> = keyFlip$("keydown", "Space").pipe(
            map(() => new Pause()),
        ),
        flips$ = merge(
            ...KEYS.map((key, index) =>
                keyFlip$("keydown", key).pipe(map(() => new Flip(index))),
            ),
            mouseFlip$,
        ),
        action$: Observable<Action> = merge(
            tick$,
            flips$,
            restart$,
            killMarioClick$,
            pause$,
        );

    return action$;
};
