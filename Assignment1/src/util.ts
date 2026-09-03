export { RNG, rangeScale, getIndex, isKillMario };

/** random number **/
/**
 * A random number generator which provides two pure functions
 * `hash` and `scale`. Call `hash` repeatedly to generate the
 * sequence of hashes.
 *
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

// stretches a number from [-1, 1] (RNG.scale's output) out to [floor, ceiling]
function rangeScale(num: number, floor: number, ceiling: number): number {
    return floor + ((num + 1) / 2) * (ceiling - floor);
}

// reads the "index" attribute view.ts puts on each digit, so a click on a
// digit can be turned into "which digit was clicked"
function getIndex(event: MouseEvent): number | null {
    const target = event.target;
    if (target instanceof SVGElement) {
        const index = target.getAttribute("index");
        return index === null ? null : Number(index);
    }
    return null;
}

// true if the click landed on the mario image
function isKillMario(event: MouseEvent): boolean {
    const target = event.target;
    return (
        target instanceof SVGElement && target.getAttribute("mario") === "true"
    );
}
