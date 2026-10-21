/*
 * The marker line, shared by the canvas crowd and the SVG characters (from the
 * approved prototype, docs/local/editorial-sprint/stories/entry-level-dead/marker.js):
 * a seeded random, points jittered a little and joined by curves so nothing is
 * ruler straight, and the geometry of one tiny drawn person as a list of path
 * strings. The SVG side wraps each part in <path>; the canvas side feeds the same
 * strings to Path2D, so a person looks the same whichever way it is drawn. Seeded,
 * so the server and the browser draw the same lines.
 */

export const SKIN = ["#f6d3b5", "#e9b98f", "#cf905f", "#a66a42", "#6e4529"];
export const SHIRT = ["#f6d14c", "#b79af2", "#79b0f3", "#f3a0bd", "#7fd2c4", "#f6d14c", "#79b0f3"];
export const LIME = "#d7ee4c", PAPER = "#f7f3ef";

type Pt = [number, number];
export type Rnd = () => number;
/** One drawn part: a path, its flat fill if any, its line weight, and a class the SVG side styles it by. */
export type Part = {d: string; fill?: string; lw: number; cls?: string; k?: number};

export const rnd = (seed: number): Rnd => {
    let s = seed;
    return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
};
export const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

const jitter = (pts: Pt[], r: Rnd, amp: number): Pt[] => pts.map(([x, y]) => [x + (r() - .5) * amp, y + (r() - .5) * amp]);

/** Catmull Rom through the points as cubic Beziers, open or closed. */
export function smooth(pts: Pt[], close: boolean): string {
    const n = pts.length, P = (i: number) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < (close ? n : n - 1); i++) {
        const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return close ? d + "Z" : d;
}

/** A wobbly polyline: every segment gets a midpoint, so long edges bow a little too. */
export function wline(pts: Pt[], r: Rnd, amp = .6): string {
    const out: Pt[] = [];
    pts.forEach((p, i) => { out.push(p); if (i < pts.length - 1) out.push([(p[0] + pts[i + 1][0]) / 2, (p[1] + pts[i + 1][1]) / 2]); });
    return smooth(jitter(out, r, amp), false);
}

export function wrect(x: number, y: number, w: number, h: number, r: Rnd, amp = .8): string {
    const C: Pt[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], pts: Pt[] = [];
    C.forEach((a, i) => {
        const b = C[(i + 1) % 4], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 28));
        for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    });
    return jitter(pts, r, amp).map(([px, py], i) => (i ? "L" : "M") + f1(px) + " " + f1(py)).join("") + "Z";
}

export function wcircle(cx: number, cy: number, rad: number, r: Rnd, amp = .5, n = 10): string {
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    return smooth(jitter(pts, r, amp), true);
}

export function wellipse(cx: number, cy: number, rx: number, ry: number, r: Rnd, amp = .8): string {
    const pts: Pt[] = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return smooth(jitter(pts, r, amp), true);
}

/** A closed wobbly quad: a shirt, a mortarboard. */
export const wquad = (pts: Pt[], r: Rnd, amp: number) => smooth(jitter(pts, r, amp), true);
export const wpoly = (pts: Pt[], r: Rnd, amp: number) =>
    jitter(pts, r, amp).map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("") + "Z";

/** `laptops`: 0 to 3 held against the chest, one per programming language the ad names (Do you need AI on your CV now?). */
export type PersonOpts = {seed: number; shirt?: string | null; lime?: boolean; pack?: boolean; hand?: boolean; laptops?: number};
export const LAPTOP = "#4e5d6e";

/** One tiny person, feet at (x, y), s wide; the seed picks skin, hair and shirt. */
export function person(x: number, y: number, s: number, o: PersonOpts): Part[] {
    const r = rnd(o.seed * 7919 + 11), skin = SKIN[Math.floor(r() * 5)], shirt = o.shirt || SHIRT[Math.floor(r() * 7)], hair = Math.floor(r() * 6), amp = s * .05;
    const hr = s * .3, hy = y - s * 1.58, top = y - s * 1.26, bot = y - s * .62, sw = s * .42, parts: Part[] = [];
    if (o.pack) parts.push({d: wrect(x + s * .2, top + s * .06, s * .36, s * .5, r, amp), fill: o.lime ? "#fffdf9" : PAPER, lw: 1, cls: "pack"});
    parts.push({d: wquad([[x - sw, top], [x + sw, top], [x + sw * 1.05, bot], [x - sw * 1.05, bot]], r, amp), fill: shirt, lw: 1});
    parts.push({d: wline([[x - s * .17, bot], [x - s * .19, y]], r, amp) + wline([[x + s * .17, bot], [x + s * .19, y]], r, amp)
        + wline([[x - s * .32, y], [x - s * .1, y]], r, amp) + wline([[x + s * .08, y], [x + s * .32, y]], r, amp), lw: 1});
    // A dark slate block per laptop, stacked: it reads even at 12 units.
    for (let k = 0; k < (o.laptops ?? 0); k++) parts.push({d: wrect(x - s * .3, bot - s * .56 + k * s * .19, s * .6, s * .15, r, amp * .5), fill: LAPTOP, lw: .8, cls: "lap"});
    const armL = wline([[x - sw, top + s * .08], [x - sw - s * .12, bot - s * .1]], r, amp);
    const armR = o.hand ? wline([[x + sw, top + s * .08], [x + sw + s * .22, top - s * .55]], r, amp) : wline([[x + sw, top + s * .08], [x + sw + s * .12, bot - s * .1]], r, amp);
    parts.push({d: armL + armR, lw: .8});
    if (o.hand) parts.push({d: wcircle(x + sw + s * .24, top - s * .62, s * .1, r, amp, 6), fill: skin, lw: 1});
    parts.push({d: wcircle(x, hy, hr, r, amp, 8), fill: skin, lw: 1});
    // Six hairs, two or three marker strokes each. All six are drawn so the random stream runs as in the prototype; one is kept.
    const H = [
        () => wline([[x - hr * .8, hy - hr * .5], [x - hr * .3, hy - hr * 1.05], [x + hr * .4, hy - hr], [x + hr * .85, hy - hr * .5]], r, amp),
        () => wline([[x - hr, hy - hr * .2], [x - hr * .6, hy - hr * 1.1], [x + hr * .9, hy - hr * .7]], r, amp) + wline([[x - hr * 1.05, hy - hr * .2], [x - hr * 1.1, hy + hr * .9]], r, amp),
        () => wcircle(x + hr * .1, hy - hr * 1.2, hr * .38, r, amp, 6) + wline([[x - hr * .9, hy - hr * .4], [x, hy - hr * .95], [x + hr * .9, hy - hr * .4]], r, amp),
        () => wline([[x - hr * .95, hy - hr * .3], [x - hr * .4, hy - hr * 1.05], [x + hr * .95, hy - hr * .35]], r, amp)
            + wline([[x - hr * 1.05, hy - hr * .2], [x - hr * 1.15, hy + hr * 1.3]], r, amp) + wline([[x + hr * 1.05, hy - hr * .2], [x + hr * 1.15, hy + hr * 1.3]], r, amp),
        () => wline([[x - hr * .9, hy - hr * .35], [x - hr * .5, hy - hr * .95], [x, hy - hr * .7], [x + hr * .5, hy - hr], [x + hr * .9, hy - hr * .35]], r, amp),
        () => wline([[x - hr * 1.05, hy - hr * .35], [x + hr * 1.05, hy - hr * .35]], r, amp)
            + wline([[x - hr * .9, hy - hr * .35], [x - hr * .5, hy - hr * 1.05], [x + hr * .5, hy - hr * 1.05], [x + hr * .9, hy - hr * .35]], r, amp)].map((f) => f());
    parts.push({d: H[hair], lw: 1});
    return parts;
}

/** The ladder's frame in stage units: rails from `top` to `foot`, rungs at the top edge of each step, `W` the ground's width. */
export type LadderFrame = {left: number; right: number; rail: number; top: number; foot: number; rungs: number[]; rungH: number; W: number};

/** The ladder in the same naive line: flat wood, marker edges, a grain line, knots at the joins. `k` is the rung a part belongs to (-1 a rail). */
export function ladderParts(L: LadderFrame, r: Rnd): Part[] {
    const parts: Part[] = [];
    const bar = (x: number, y: number, w: number, h: number, k: number) => {
        parts.push({cls: "wood", d: wrect(x, y, w, h, r, 1), lw: 1.6, k});
        parts.push({cls: "grain", lw: 1, k, d: w > h ? wline([[x + 10, y + h * .62], [x + w - 10, y + h * .58]], r, .6) : wline([[x + w * .6, y + 10], [x + w * .62, y + h - 10]], r, .6)});
    };
    parts.push({cls: "ground", lw: 1.2, d: wline([[0, L.foot + 2], [L.W, L.foot + 2]], r, .8)});
    bar(L.left, L.top, L.rail, L.foot - L.top, -1);
    bar(L.right - L.rail, L.top, L.rail, L.foot - L.top, -1);
    L.rungs.forEach((y, k) => {
        bar(L.left + L.rail - 2, y, L.right - L.left - L.rail * 2 + 4, L.rungH, k);
        [L.left + L.rail / 2, L.right - L.rail / 2].forEach((x) => parts.push({cls: "knot", lw: 0, k, d: wcircle(x, y + L.rungH / 2, 2.4, r, .3, 6)}));
    });
    return parts;
}
