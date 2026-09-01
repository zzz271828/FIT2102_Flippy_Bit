import { Observable } from "rxjs";
import { scan, map } from "rxjs/operators";
import { State } from "./types";

export { RNG, createRngStreamFromSource, rangeScale, getIndex, isKillMario };

/** random number **/
/**
 * A random number generator which provides two pure functions
 * `hash` and `scale`. Call `hash` repeatedly to generate the
 * sequence of hashes.
 */
abstract class RNG {
    private static m = 0x80000000; // 2^31
    private static a = 1103515245;
    private static c = 12345;

    public static hash = (seed: number): number =>
        (RNG.a * seed + RNG.c) % RNG.m;

    public static scale = (hash: number): number =>
        (2 * hash) / (RNG.m - 1) - 1; // in [-1, 1]
}

/**
 * Converts values in a stream to random numbers in the range [-1, 1]
 *
 * This usually would be implemented as an RxJS operator, but that is currently
 * beyond the scope of this course.
 *
 * @param source$ The source Observable, elements of this are replaced with random numbers
 * @param seed The seed for the random number generator
 */
function createRngStreamFromSource<T>(source$: Observable<T>) {
    return function createRngStream(seed: number = 0): Observable<number> {
        const randomNumberStream = source$.pipe(
            scan(oldSeed => RNG.hash(oldSeed), seed),
            map(val => RNG.scale(val)),
        );
        return randomNumberStream;
    };
}

function rangeScale(num: number, floor: number, ceiling: number): number {
    return floor + ((num + 1) / 2) * (ceiling - floor);
}

function getIndex(event: MouseEvent): number | null {
    const target = event.target;
    if (target instanceof SVGElement) {
        const index = target.getAttribute("index");
        return index === null ? null : Number(index);
    }
    return null;
}

function isKillMario(event: MouseEvent): boolean {
    const target = event.target;
    return (
        target instanceof SVGElement && target.getAttribute("mario") === "true"
    );
}
