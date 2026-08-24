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
} from "rxjs";

import { Action, State, TargetRect, Constants } from "./types";
import { initialState, reduceState, Tick, Spawn } from "./state";
import { createRngStreamFromSource, rangeScale } from "./util";
import { render } from "./view";


// Rendering (side effects)

/**
 * Brings an SVG element to the foreground.
 * @param elem SVG element to bring to the foreground
 */
const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
};

function flippyBit() {
    const tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
        map(() => new Tick()),
    );

    const state$: Observable<State> = tick$.pipe(
        scan(reduceState, initialState),
    );

    const click$ = fromEvent(document.body, "mousedown").pipe(take(1));
    click$.pipe(switchMap(() => state$)).subscribe(render());
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Observable: wait for first user click

    flippyBit();
}
