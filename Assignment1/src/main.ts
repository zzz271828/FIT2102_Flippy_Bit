/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import {
    Observable,
    Subscription,
    catchError,
    filter,
    fromEvent,
    interval,
    map,
    scan,
    switchMap,
    take,
    merge,
    startWith,
} from "rxjs";

import { Action, State, TargetRect, Event, Key, Constants } from "./types";
import { initialState, reduceState, Tick, Spawn, Flip, Restart, KillMario, Pause } from "./state";
import { createRngStreamFromSource, rangeScale, getIndex, isKillMario } from "./util";
import { render } from "./view";

// this function exist because it's in the template of the test files to test if state exist
export const createStateStream = (actions$: Observable<Action>): Observable<State> =>
    actions$.pipe(scan((acc, action) => reduceState(acc, action), initialState));

function flippyBit() {
    const svgCanvas = document.querySelector("#svgCanvas") as SVGSVGElement;
    const keys: ReadonlyArray<Key> = [
        "Digit1",
        "Digit2",
        "Digit3",
        "Digit4",
        "Digit5",
        "Digit6",
        "Digit7",
        "Digit8",
    ];

    const 
        tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
            map(() => new Tick()),
        ),
        mouseFlip$ = fromEvent<MouseEvent>(svgCanvas, "mousedown").pipe(
            map(getIndex), // could be number or null
            filter(index => index !== null),
            map(index => new Flip(index))
        ),
        killMarioClick$: Observable<Action> = fromEvent<MouseEvent>(svgCanvas, "mousedown").pipe(
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
            ...keys.map((key, index) =>
                keyFlip$("keydown", key).pipe(map(() => new Flip(index))),
            ),
            mouseFlip$,
        ),
        action$: Observable<Action> = merge(tick$, flips$, restart$, killMarioClick$, pause$),
        state$: Observable<State> = createStateStream(action$),
        click$ = fromEvent(document.body, "mousedown").pipe(take(1));

    const subscription: Subscription = click$
        .pipe(switchMap(() => state$))
        .subscribe(render());
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Observable: wait for first user click

    flippyBit();
}
