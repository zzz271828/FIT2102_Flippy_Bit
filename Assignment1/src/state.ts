export { initialState, reduceState, Tick, Spawn };

import {
    State,
    Action,
    TargetRect,
    Constants,
    Target,
    Viewport,
} from "./types";

const initialState: State = {
    gameEnd: false,
    targetRects: [],
};

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
class Tick implements Action {
    apply(s: State): State {
        if (s.gameEnd) return s;

        const newRects = s.targetRects.map(rect => {
            const hit = rect.y + Target.HEIGHT >= Viewport.CANVAS_HEIGHT;
            return hit
                ? { ...rect, onGround: hit }
                : { ...rect, y: rect.y + Constants.VELOCITY, onGround: hit };
        });
        const newState = { ...s, targetRects: newRects };

        return newState;
    }
}

class Spawn implements Action {
    constructor(private readonly target: TargetRect) {}

    apply(s: State): State {
        return { ...s, targetRects: [...s.targetRects, this.target] };
    }
}

// TODO: i don't know why add this but it's from the workshop game. they added this and it works nice
const reduceState = (s: State, action: Action): State => action.apply(s);
