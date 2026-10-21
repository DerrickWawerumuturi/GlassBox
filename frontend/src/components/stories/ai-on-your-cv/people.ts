import {LIME, person, rnd, wcircle, wline, wquad, wrect} from "../is-entry-level-dead/marker";
import type {Anchors, CharAt} from "./states";

/*
 * The SVG people, as strings the server renders (the prototype's people.js):
 * a featured character is a cut out photo head on a small marker body, as in
 * chapter one. Two walk this story: the woman who reads each listing, and the
 * man at the quiet door at the end. Also here: the guess, a façade of 100
 * windows with a person in each, ringed from the bottom as the reader picks,
 * and the dimmer beside it. No paper shapes behind anyone in dark mode.
 * Class names start "aic-" because the story's CSS styles them globally
 * (aic.module.css), and a bare "ring" or "line" would meet Tailwind's.
 */

const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
type Attrs = Record<string, string | number | null | undefined>;
/** el("path", {d}) as an SVG string. A fill goes out as an inline style, so it wins over .aic-line's fill: none. */
const el = (tag: string, attrs: Attrs = {}, kids = "") =>
    `<${tag}${Object.entries(attrs).filter(([, v]) => v != null).map(([k, v]) => (k === "fill" ? ` style="fill:${esc(v!)}"` : ` ${k}="${esc(v!)}"`)).join("")}>${kids}</${tag}>`;
const svg = (w: number, h: number, inner: string) => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const text = (x: number, y: number, t: string, cls: string, sz: number) => el("text", {x, y, class: cls, "text-anchor": "middle", style: `font-size:${sz}px`}, esc(t));

/** The photo heads: file, pixel size, the head ellipse as fractions of the image box, and who took the photo (CREDITS.md beside them). */
export const HEADS = {
    curls: {file: "pexels-3765151.webp", w: 457, h: 480, e: [.52, .48, .46, .37], by: "Andrea Piacquadio",
        page: "https://www.pexels.com/photo/woman-in-black-crew-neck-shirt-wearing-silver-framed-eyeglasses-3765151/"},
    glasses: {file: "pexels-34514521.webp", w: 398, h: 480, e: [.52, .50, .29, .27], by: "Ventara Films",
        page: "https://www.pexels.com/photo/smiling-young-man-with-glasses-in-studio-portrait-34514521/"},
};
export const HEAD_DIR = "/stories/ai-on-your-cv/heads";
const SHIRTS = {curls: "#f6d14c", glasses: "#b79af2"};

/** The clip paths, placed once on the page: every overlay shares them (a clipPath inside a hidden overlay would clip its head away). */
export const DEFS = `<defs>${Object.entries(HEADS).map(([k, h]) =>
    `<clipPath id="aic-clip-${k}" clipPathUnits="objectBoundingBox"><ellipse cx="${h.e[0]}" cy="${h.e[1]}" rx="${h.e[2]}" ry="${h.e[3]}"/></clipPath>`).join("")}</defs>`;

/** A head whose chin sits at (0, 0) of its group, hh tall. It bobs 2.5 degrees about the chin by CSS, so reduced motion stills it. */
function head(id: CharAt["head"], hh: number, slot: string) {
    const h = HEADS[id], [cx, cy, , ry] = h.e, k = hh / (2 * ry * h.h), W = h.w * k, H = h.h * k;
    const img = el("image", {href: `${HEAD_DIR}/${h.file}`, x: (-cx * W).toFixed(1), y: (-(cy + ry) * H).toFixed(1), width: W.toFixed(1), height: H.toFixed(1), "clip-path": `url(#aic-clip-${id})`});
    return el("g", {class: "aic-bob", "data-slot": slot, style: `animation-duration:${(3.2 + (slot.length % 5) * .4).toFixed(1)}s`}, img);
}

/** A featured character: a photo head on a small marker body. s: the body's width; feet at (x, y). */
function feat({x, y, s, head: id, pose, slot}: CharAt) {
    const r = rnd(slot.length), amp = s * .04, top = y - s * 1.55, bot = y - s * .72, sw = s * .5, skin = "#c98a5a";
    const path = (cls: string, d: string, fill?: string) => el("path", {class: cls, fill, d});
    const arm = (sx: number, sy: number, ex: number, ey: number) => wline([[sx, sy], [ex, ey]], r, amp);
    const hand = (hx: number, hy: number) => path("aic-line", wcircle(hx, hy, s * .11, r, amp, 6), skin);
    let g = path("aic-line", wquad([[x - sw, top], [x + sw, top], [x + sw * 1.1, bot], [x - sw * 1.1, bot]], r, amp), SHIRTS[id]);
    g += path("aic-line", wrect(x - sw * 1.05, bot - 1, sw * 2.1, s * .3, r, amp), "#f7f3ef");
    g += path("aic-line", wline([[x - s * .22, bot + s * .28], [x - s * .25, y]], r, amp) + wline([[x + s * .22, bot + s * .28], [x + s * .25, y]], r, amp));
    g += path("aic-line", wrect(x - s * .46, y - s * .08, s * .36, s * .14, r, amp) + wrect(x + s * .1, y - s * .08, s * .36, s * .14, r, amp), "#1a1a1a");
    // Drawn only by the poses that use it, so each pose's random stream runs as in the prototype.
    const left = () => arm(x - sw, top + s * .1, x - sw - s * .2, bot - s * .05);
    if (pose === "up") g += path("aic-line aic-thin", left() + arm(x + sw, top + s * .12, x + sw + s * .5, top - s * .6)) + hand(x + sw + s * .55, top - s * .68);
    else if (pose === "wave") g += path("aic-line aic-thin", left() + arm(x + sw, top + s * .12, x + sw + s * .4, top - s * .4)) + hand(x + sw + s * .45, top - s * .5);
    else g += path("aic-line aic-thin", wline([[x - sw, top + s * .1], [x - sw - s * .3, top + s * .5], [x - sw * .9, bot - s * .15]], r, amp)
        + wline([[x + sw, top + s * .1], [x + sw + s * .3, top + s * .5], [x + sw * .9, bot - s * .15]], r, amp));
    g += el("g", {transform: `translate(${x.toFixed(1)} ${(top + s * .1).toFixed(1)})`}, head(id, s * 1.6, slot));
    return el("g", {class: "aic-feat"}, g);
}

/** The characters of a state, from its anchors (stage units), as one SVG over the canvas. */
export const overlay = (a: Anchors | null, W: number, H: number) => (a?.chars.length ? svg(W, H, a.chars.map(feat).join("")) : null);

/* The guess: a façade of 100 windows, ten by ten, a person in each. Window i counts from the bottom left (0) to the top right (99). */
const C = 40, cell = (i: number) => [(i % 10) * C, (9 - Math.floor(i / 10)) * C];
const tiny = (x: number, y: number, seed: number, lime: boolean, style?: string) => el("g", {class: "aic-tiny" + (lime ? " aic-lime" : ""), style},
    person(x, y, 14, {seed, lime, hand: lime, shirt: lime ? LIME : null}).map((p) => el("path", {class: p.lw < 1 ? "aic-line aic-thin" : "aic-line", fill: p.fill, d: p.d})).join(""));

/** The building: its sign, its windows and people; once shown, our count's lowest windows lit lime, the people raising a hand. */
export function facade(shown: boolean, ours: number) {
    const r = rnd(9);
    let g = el("path", {class: "aic-line aic-facade", d: wrect(-14, -12, 428, 424, r, 1)});
    g += el("path", {class: "aic-line aic-sign", d: wrect(100, -62, 200, 44, r, .8)}) + text(200, -34, "software engineering", "aic-signname", 17) + text(200, -22, "100 jobs, as windows", "aic-signcount", 10);
    for (let i = 0; i < 100; i++) {
        const [x, y] = cell(i), lit = shown && i < ours;
        g += el("path", {class: "aic-line aic-win" + (lit ? " aic-lime" : ""), d: wrect(x + 5, y + 3, 30, 35, rnd(20 + i), .7)});
        g += tiny(x + 20, y + 36, 300 + i, lit, lit ? `animation-delay:${i * 50}ms` : undefined);
    }
    return g;
}
/** The reader's picks: a pen ring round each of the lowest n windows. */
export function rings(n: number) {
    let g = "";
    for (let i = 0; i < n; i++) { const [x, y] = cell(i); g += el("path", {class: "aic-ring", d: wrect(x + 2, y, 36, 40, rnd(i + 1), 1.6)}); }
    return g;
}
/** The dimmer beside the façade: a track from 0 to 100 and a knob at the guess; a readout, not a second control. */
export function dimmer(n: number) {
    const r = rnd(4), y = 400 - n * 4;
    let g = el("path", {class: "aic-track", d: wline([[30, 0], [30, 400]], r, .8)});
    [0, 50, 100].forEach((v) => { g += el("path", {class: "aic-line aic-thin", d: wline([[24, 400 - v * 4], [36, 400 - v * 4]], r, .5)}) + el("text", {x: 44, y: 404 - v * 4, class: "aic-tick"}, String(v)); });
    return g + el("path", {class: "aic-line aic-knob", d: wrect(16, y - 8, 28, 16, r, .9)}) + el("path", {class: "aic-line aic-thin", d: wline([[22, y], [38, y]], r, .4)});
}
