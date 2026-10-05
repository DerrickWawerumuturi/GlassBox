import type {DragMode} from "@/lib/use-rotor";

/*
 * The four rotary concepts as geometry. Each places a section, given its
 * signed distance from the active slot (`o`, in sections), inside a nav box
 * of w × h. Desktop runs down the left of the charts; phone is a band.
 */

export type ConceptId = "arc" | "dial" | "orbit" | "edge";
export type Anchor = "start" | "end" | "middle";
export type Placed = {x: number; y: number; anchor: Anchor; opacity: number; scale: number; z: number; mark?: {x: number; y: number}};

export type Geometry = {
    w: number; h: number;
    wrap: boolean;
    drag: DragMode;
    /** o: signed distance from the active slot, in sections; i: the section's own index. */
    place: (o: number, i: number) => Placed;
    /** Where the selection points at the chart: a line from (x1,y1) to (x2,y2). */
    pointer: {x1: number; y1: number; x2: number; y2: number};
    circle?: {cx: number; cy: number; r: number; base: number; step: number};
};

export const CONCEPTS: {id: ConceptId; name: string; label: string; how: string; mobile: string}[] = [
    {id: "arc", name: "A", label: "Left arc",
        how: "A large arc on the left edge. Drag it up or down, scroll, use the arrow keys, or click a label.",
        mobile: "On a phone the arc moves to the bottom of the screen and you swipe it sideways."},
    {id: "dial", name: "B", label: "Needle dial",
        how: "The labels never move; the needle points at the active view. Press anywhere on the dial to aim, drag to slide between views, release to open. Scroll and arrow keys work too.",
        mobile: "On a phone the dial is a half circle on the bottom edge. Touch and slide your thumb to aim, lift to open."},
    {id: "orbit", name: "C", label: "Orbit",
        how: "The views orbit an invisible centre. The front one is active and the rest recede. Drag up or down, scroll, or click.",
        mobile: "On a phone the orbit lies flat across the bottom. Swipe it sideways."},
    {id: "edge", name: "D", label: "Edge wheel",
        how: "Most of a huge wheel sits off-screen. Turn the visible rim like a ruler. Drag, scroll, or click.",
        mobile: "On a phone the rim rises from the bottom edge and you swipe it sideways."},
];

const fade = (o: number, per: number, floor = 0) => Math.max(floor, 1 - Math.abs(o) * per);

function onCircle(cx: number, cy: number, r: number, a: number) {
    return {x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)};
}

/** A circle's sections: angle = base + o × step, the label `labelDr` beyond the mark (negative: inside). */
function ring(w: number, h: number, cx: number, cy: number, r: number, base: number, step: number, wrap: boolean,
              labelDr: number, anchorFor: (a: number) => Anchor, opacityFor: (o: number, a: number) => number): Geometry {
    const tip = onCircle(cx, cy, r, base);
    const out = onCircle(cx, cy, r + 2000, base);
    return {
        w, h, wrap,
        drag: {kind: "angle", cx, cy, step},
        circle: {cx, cy, r, base, step},
        pointer: {x1: tip.x, y1: tip.y, x2: Math.min(w, Math.max(0, out.x)), y2: Math.min(h, Math.max(0, out.y))},
        place: (o) => {
            const a = base + o * step;
            const mark = onCircle(cx, cy, r, a);
            const at = onCircle(cx, cy, r + labelDr, a);
            const op = opacityFor(o, a);
            return {...at, anchor: anchorFor(a), opacity: op, scale: 1, z: Math.round(op * 10), mark};
        },
    };
}

/** Geometry for the turning concepts. B, the needle dial, has its own component (NeedleDial.tsx). */
export function geometry(id: Exclude<ConceptId, "dial">, w: number, h: number, phone: boolean): Geometry {
    if (id === "arc") {
        if (phone) {
            const r = 420;
            return ring(w, h, w / 2, 58 + r, r, -Math.PI / 2, 0.25, false, 18, () => "middle", (o) => fade(o, 0.3, 0));
        }
        const r = 340;
        return ring(w, h, -150, h / 2, r, 0, 0.3, false, 20, () => "start", (o) => fade(o, 0.24, 0.12));
    }
    if (id === "edge") {
        const r = 1100;
        if (phone) return ring(w, h, w / 2, 46 + r, r, -Math.PI / 2, 0.09, false, -22, () => "middle", (o) => fade(o, 0.3, 0));
        return ring(w, h, 176 - r, h / 2, r, 0, 0.095, false, -22, () => "end", (o) => fade(o, 0.22, 0.1));
    }
    // Orbit: an ellipse seen edge-on. The front of the orbit is active; depth sets size and fade.
    const n = 6, step = (2 * Math.PI) / n;
    if (phone) {
        const cx = w / 2, cy = h / 2 - 6, rx = w * 0.38, ry = 22;
        return {
            w, h, wrap: true, drag: {kind: "linear", axis: "x", px: 72},
            pointer: {x1: cx, y1: cy - ry - 10, x2: cx, y2: 0},
            place: (o) => {
                const t = o * step, depth = (Math.cos(t) + 1) / 2;
                return {x: cx + rx * Math.sin(t), y: cy + ry * Math.cos(t) - 6, anchor: "middle",
                    opacity: 0.12 + 0.88 * depth ** 1.6, scale: 0.7 + 0.3 * depth, z: Math.round(depth * 10)};
            },
        };
    }
    const cx = 120, cy = h / 2, rx = 110, ry = Math.min(230, h * 0.38);
    return {
        w, h, wrap: true, drag: {kind: "linear", axis: "y", px: 84},
        pointer: {x1: cx + rx + 130, y1: cy, x2: w, y2: cy},
        place: (o) => {
            const t = o * step, depth = (Math.cos(t) + 1) / 2;
            return {x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t), anchor: "start",
                opacity: 0.12 + 0.88 * depth ** 1.6, scale: 0.7 + 0.3 * depth, z: Math.round(depth * 10)};
        },
    };
}
