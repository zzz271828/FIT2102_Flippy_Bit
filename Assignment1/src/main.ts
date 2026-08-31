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
import { initialState, reduceState, Tick, Spawn, Flip, Restart } from "./state";
import { createRngStreamFromSource, rangeScale, getIndex } from "./util";
import { render } from "./view";

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
        keyFlip$ = (e: Event, k: Key) =>
            fromEvent<KeyboardEvent>(document, e).pipe(
                filter(({ code }) => code === k),
                filter(({ repeat }) => !repeat),
            ),
        restart$: Observable<Action> = keyFlip$("keydown", "KeyR").pipe(
            map(() => new Restart()),
        ),
        flips$ = merge(
            ...keys.map((key, index) =>
                keyFlip$("keydown", key).pipe(map(() => new Flip(index))),
            ),
            mouseFlip$,
        ),
        state$: Observable<State> = merge(tick$, flips$, restart$).pipe(scan(reduceState, initialState)),
        click$ = fromEvent(document.body, "mousedown").pipe(take(1));

    click$.pipe(switchMap(() => state$)).subscribe(render());
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Observable: wait for first user click

    flippyBit();
}
