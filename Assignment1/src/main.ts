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

import { Observable, fromEvent, scan, switchMap, take } from "rxjs";

import { Action, State } from "./types";
import { initialState, reduceState } from "./state";
import { createActionStream } from "./observables";
import { render } from "./view";

/**
 * Turns a stream of Actions into a stream of States, by folding each
 * Action onto the previous State with `reduceState`, starting from
 * `initialState`. This is the "scan" step of the FRP pipeline.
 *
 * Exported separately (not just inlined in flippyBit) because the test
 * template imports it directly to check state.
 */
export const createStateStream = (
    actions$: Observable<Action>,
): Observable<State> => actions$.pipe(scan(reduceState, initialState));

function flippyBit() {
    const svgCanvas = document.querySelector("#svgCanvas") as SVGSVGElement;

    const action$ = createActionStream(svgCanvas),
        state$: Observable<State> = createStateStream(action$),
        // wait for the player's first click before the game starts, so the
        // clock/spawn timers don't run in the background before they can see it
        click$ = fromEvent(document.body, "mousedown").pipe(take(1));

    click$.pipe(switchMap(() => state$)).subscribe(render());
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Observable: wait for first user click

    flippyBit();
}
