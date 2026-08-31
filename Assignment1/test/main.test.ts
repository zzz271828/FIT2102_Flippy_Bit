import { describe, expect, it } from "vitest";
import { Subject } from "rxjs";
import { createStateStream } from "../src/main";
import { initialState, Flip, Tick, Restart } from "../src/state";
import type { Action, State } from "../src/types";
const collectStates = (actions: ReadonlyArray<Action>): State[] => {
    const actions$ = new Subject<Action>();
    const states: State[] = [];
    createStateStream(actions$).subscribe(s => states.push(s));

    actions.forEach(a => actions$.next(a));
    actions$.complete();

    return states;
};

describe("createStateStream", () => {
    it("starts reducing from initialState and applies each action in order", () => {
        const states = collectStates([new Flip(0), new Flip(1)]);

        expect(states).toHaveLength(2);
        expect(states[0]).toEqual(new Flip(0).apply(initialState));
        expect(states[1]).toEqual(
            new Flip(1).apply(new Flip(0).apply(initialState)),
        );
    });

    it("emits one State per action, reflecting Tick/Flip/Restart mixed together", () => {
        const states = collectStates([new Tick(), new Flip(3), new Restart()]);

        expect(states).toHaveLength(3);
        expect(states[2]).toEqual(initialState);
    });

    it("does not emit anything before any action arrives", () => {
        const states = collectStates([]);
        expect(states).toHaveLength(0);
    });
});
