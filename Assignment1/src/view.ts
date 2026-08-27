import { State, Viewport, Target, Constants } from "./types";

export { render };

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

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

const render = (): ((s: State) => void) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;

    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    const targets = createSvgElement(svg.namespaceURI, "g"), // group
          bits = createSvgElement(svg.namespaceURI, "g"), // the thing is that if we don't add this, then we are creating a et of bits everytick and never remove
          digitWidth = Viewport.CANVAS_WIDTH / Constants.DIGIT_COUNT,
          score = document.getElementById("scoreText");


    svg.appendChild(targets);
    svg.appendChild(bits);

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    return (s: State) => {
        targets.replaceChildren();
        bits.replaceChildren();
        // Draw rectangle
        s.targetRects.forEach(rect => {
            const shape = createSvgElement(svg.namespaceURI, "rect", {
                x: `${Viewport.CANVAS_WIDTH / 2 - Target.WIDTH / 2}`,
                y: rect.y.toString(),
                width: `${Target.WIDTH}`,
                height: `${Target.HEIGHT}`,
                rx: "6",
                fill: "white",
                stroke: "black",
                "stroke-width": "2",
            });

            const text = createSvgElement(svg.namespaceURI, "text", {
                x: `${Viewport.CANVAS_WIDTH / 2}`,
                y: `${rect.y + Target.HEIGHT / 2 + 8}`,
                "text-anchor": "middle",
                "font-family": "monospace",
                fill: "black",
            });

            text.textContent = rect.value.toString(16).toUpperCase();

            targets.appendChild(shape);
            targets.appendChild(text);
        });


        Array.from({ length: Constants.DIGIT_COUNT }).forEach((_, i) => {
            const bit = createSvgElement(svg.namespaceURI, "rect", {
                x: `${i * digitWidth + 4}`,
                y: `${Viewport.CANVAS_HEIGHT - 50}`,
                width: `${digitWidth - 8}`,
                height: "40",
                fill: "#ef9a9a",
                stroke: "black",
                "stroke-width": "2",
                "index": i.toString(),
            });
            const bitText = createSvgElement(svg.namespaceURI, "text", {
                x: `${i * digitWidth + digitWidth / 2}`,
                y: `${Viewport.CANVAS_HEIGHT - 22}`,
                "text-anchor": "middle",
                "font-family": "monospace",
                fill: "black",
                "pointer-events": "none",
            });
            bitText.textContent = s.playerInput[i].toString();
            bits.appendChild(bit);
            bits.appendChild(bitText);
        });

        score!.innerHTML = s.score.toString();

        const gameOver = document.querySelector("#gameOver") as SVGGElement;

        if (s.gameEnd) {
            show(gameOver);
        } else {
            hide(gameOver);
        }
    };
};