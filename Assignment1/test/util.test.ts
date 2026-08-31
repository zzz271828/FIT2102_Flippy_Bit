import { describe, expect, it } from "vitest";
import { of, firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { RNG, createRngStreamFromSource, rangeScale } from "../src/util";

// Since the abstract class RNG and  function createRngStreamFromSource is from the 
// workshop, i didn't test it

describe("rangeScale", () => {
    it("maps -1 to the floor", () => {
        expect(rangeScale(-1, 10, 20)).toBe(10);
    });

    it("maps 1 to the ceiling", () => {
        expect(rangeScale(1, 10, 20)).toBe(20);
    });

    it("maps 0 to the midpoint 15", () => {
        expect(rangeScale(0, 10, 20)).toBe(15);
    });
});