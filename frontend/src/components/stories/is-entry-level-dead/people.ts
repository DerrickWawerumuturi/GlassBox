import {ELD} from "@/lib/stories/is-entry-level-dead";
import {LIME, person, PersonOpts, rnd, Rnd, wcircle, wellipse, wline, wpoly, wquad, wrect} from "./marker";

/*
 * The SVG people, as strings the server renders (from the prototype's people.js):
 * the featured characters are cut out photo heads on small marker bodies, as in
 * The Pudding's NBA piece; the four quoted internship titles hang as lime paper
 * slips on a line; the guess is 100 tiny drawn people. No paper shapes behind
 * anyone in dark mode (founder, 19 Oct): the people stand on the ground as
 * drawn. Class names start "eld-" because the story's CSS styles them globally
 * (eld.module.css), and a bare "ring" or "line" would meet Tailwind's.
 */

const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
type Attrs = Record<string, string | number | null | undefined>;
/** el("path", {d}) as an SVG string. A fill goes out as an inline style, so it wins over .eld-line's fill: none. */
const el = (tag: string, attrs: Attrs = {}, kids = "") =>
    `<${tag}${Object.entries(attrs).filter(([, v]) => v != null).map(([k, v]) => (k === "fill" ? ` style="fill:${esc(v!)}"` : ` ${k}="${esc(v!)}"`)).join("")}>${kids}</${tag}>`;
const svg = (w: number, h: number, inner: string) => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const text = (x: number, y: number, t: string, cls: string, sz: number) => el("text", {x, y, class: cls, style: `font-size:${sz}px`}, esc(t));

/** The photo heads: file, pixel size, the head ellipse as fractions of the image box, and who took the photo (CREDITS.md beside them). */
export const HEADS = {
    up: {file: "pexels-24300353.webp", w: 436, h: 480, e: [.45, .51, .30, .31], by: "Jason Carlos Avh", page: "https://www.pexels.com/photo/portrait-of-man-24300353/"},
    grad: {file: "pexels-29852895.webp", w: 480, h: 468, e: [.51, .47, .25, .36], by: "Ifeyinka Adeyemo",
        page: "https://www.pexels.com/photo/professional-corporate-headshot-of-smiling-woman-29852895/"},
    intern: {file: "pexels-6311251.webp", w: 456, h: 480, e: [.52, .47, .34, .37], by: "Monstera Production",
        page: "https://www.pexels.com/photo/serious-young-black-guy-looking-at-camera-against-white-background-6311251/"},
    beard: {file: "pexels-30767572.webp", w: 457, h: 480, e: [.50, .49, .31, .38], by: "Uiliam Nörnberg",
        page: "https://www.pexels.com/photo/professional-portrait-of-a-smiling-man-30767572/"},
};
type Head = keyof typeof HEADS;
export const HEAD_DIR = "/stories/is-entry-level-dead/heads";

/** The clip paths, placed once on the page: every overlay and the ending share them (a clipPath inside a hidden overlay would clip its head away). */
export const DEFS = `<defs>${Object.entries(HEADS).map(([k, h]) =>
    `<clipPath id="eld-clip-${k}" clipPathUnits="objectBoundingBox"><ellipse cx="${h.e[0]}" cy="${h.e[1]}" rx="${h.e[2]}" ry="${h.e[3]}"/></clipPath>`).join("")}</defs>`;

/** A head whose chin sits at (0, 0) of its group, hh tall. It bobs 2.5 degrees about the chin by CSS, so reduced motion stills it. */
function head(id: Head, hh: number, slot: string) {
    const h = HEADS[id], [cx, cy, rx, ry] = h.e, k = hh / (2 * ry * h.h), W = h.w * k, H = h.h * k;
    const img = el("image", {href: `${HEAD_DIR}/${h.file}`, x: (-cx * W).toFixed(1), y: (-(cy + ry) * H).toFixed(1), width: W.toFixed(1), height: H.toFixed(1), "clip-path": `url(#eld-clip-${id})`});
    return el("g", {class: "eld-bob", "data-slot": slot, style: `animation-duration:${(3.2 + (slot.length % 5) * .4).toFixed(1)}s`}, img);
}

/** A tiny person as SVG: the shared geometry, each part a <path>. */
export const tiny = (x: number, y: number, s: number, o: PersonOpts, style?: string) =>
    el("g", {class: "eld-tiny" + (o.lime ? " eld-lime" : ""), style}, person(x, y, s, o).map((p) =>
        el("path", {class: p.cls ? `eld-${p.cls}` : p.lw < 1 ? "eld-line eld-thin" : "eld-line", fill: p.fill, d: p.d})).join(""));

type Feat = {pose: "up" | "wave" | "hold" | "hip"; head: Head; slot: string; seed?: number; shirt?: string; trousers?: string; pack?: boolean; hat?: boolean};

/** A featured character: a photo head on a small marker body. s: the body's width; feet at (x, y). */
function feat(x: number, y: number, s: number, o: Feat) {
    const r = rnd(o.seed || 5), amp = s * .04, top = y - s * 1.55, bot = y - s * .72, sw = s * .5, shirt = o.shirt || "#79b0f3", skin = "#c98a5a";
    const path = (cls: string, d: string, fill?: string) => el("path", {class: cls, fill, d});
    const arm = (sx: number, sy: number, ex: number, ey: number) => wline([[sx, sy], [ex, ey]], r, amp);
    const hand = (hx: number, hy: number) => path("eld-line", wcircle(hx, hy, s * .11, r, amp, 6), skin);
    let g = "";
    if (o.pack) g += path("eld-pack", wrect(x + s * .25, top + s * .05, s * .45, s * .62, r, amp));
    g += path("eld-line", wquad([[x - sw, top], [x + sw, top], [x + sw * 1.1, bot], [x - sw * 1.1, bot]], r, amp), shirt);
    g += path("eld-line", wrect(x - sw * 1.05, bot - 1, sw * 2.1, s * .3, r, amp), o.trousers || "#f7f3ef");
    g += path("eld-line", wline([[x - s * .22, bot + s * .28], [x - s * .25, y]], r, amp) + wline([[x + s * .22, bot + s * .28], [x + s * .25, y]], r, amp));
    g += path("eld-line", wrect(x - s * .46, y - s * .08, s * .36, s * .14, r, amp) + wrect(x + s * .1, y - s * .08, s * .36, s * .14, r, amp), "#1a1a1a");
    // Drawn only by the poses that use it, so each pose's random stream runs as in the prototype.
    const left = () => arm(x - sw, top + s * .1, x - sw - s * .2, bot - s * .05);
    if (o.pose === "up") g += path("eld-line eld-thin", left() + arm(x + sw, top + s * .12, x + sw + s * .5, top - s * .6)) + hand(x + sw + s * .55, top - s * .68);
    else if (o.pose === "wave") g += path("eld-line eld-thin", left() + arm(x + sw, top + s * .12, x + sw + s * .4, top - s * .4)) + hand(x + sw + s * .45, top - s * .5);
    else if (o.pose === "hold") {
        g += path("eld-line eld-thin", arm(x - sw, top + s * .1, x - sw - s * .3, bot - s * .2) + arm(x + sw, top + s * .1, x + sw + s * .3, bot - s * .2));
        g += path("eld-line eld-slip eld-lime", wrect(x - s * .3, bot - s * .4, s * .6, s * .5, r, amp));
    } else {
        g += path("eld-line eld-thin", wline([[x - sw, top + s * .1], [x - sw - s * .3, top + s * .5], [x - sw * .9, bot - s * .15]], r, amp)
            + wline([[x + sw, top + s * .1], [x + sw + s * .3, top + s * .5], [x + sw * .9, bot - s * .15]], r, amp));
    }
    g += el("g", {transform: `translate(${x.toFixed(1)} ${(top + s * .1).toFixed(1)})`}, head(o.head, s * 1.6, o.slot));
    if (o.hat) {
        const hy = top + s * .1 - s * 1.55;
        g += path("eld-line", wpoly([[x - s * .95, hy], [x - s * .1, hy - s * .34], [x + s * .95, hy - s * .08], [x + s * .1, hy + s * .3]], r, amp), "#1a1a1a");
        g += path("eld-line eld-thin", wline([[x + s * .9, hy - s * .05], [x + s * 1.05, hy + s * .5]], r, amp));
        g += path("eld-line", wcircle(x + s * 1.07, hy + s * .56, s * .07, r, amp * .5, 6), "#f6d14c");
    }
    return el("g", {class: "eld-feat"}, g);
}

/** The titles wrapped by hand to fit the slips; the words and dashes are exactly as posted. */
const WRAP = [["Software Engineer", "Intern - Ads"], ["Werkstudent (w/m/d)", "Software Development"], ["Ground Software", "Engineering Intern", "(Summer 2027)"],
    ["Backend Engineer -", "Internship (6 months)"]];

/** The four quoted titles on lime slips, pegged on a line between the rails. */
function slips(ph: boolean, r: Rnd) {
    const G = ph ? {qw: 280, qh: 112, qpx: 292, qx0: 28, rows: [116, 240], cols: 2, fs: 24, lh: 24, y0: 32, xa: 32, xb: 608}
        : {qw: 136, qh: 74, qpx: 138, qx0: 50, rows: [190], cols: 4, fs: 15, lh: 15, y0: 20, xa: 44, xb: 596};
    let g = "";
    G.rows.forEach((y) => { g += el("path", {class: "eld-string", d: wline([[G.xa, y], [(G.xa + G.xb) / 2, y + 2.5], [G.xb, y]], r, .6)}); });
    ELD.internTitles.forEach(({title, employer}, k) => {
        const col = k % G.cols, row = Math.floor(k / G.cols), x = G.qx0 + col * G.qpx + G.qw / 2, y = G.rows[row], rr = rnd(77 + k), tilt = (rr() - .5) * 4;
        let s = el("path", {class: "eld-line eld-slip eld-lime", d: wrect(-G.qw / 2, 3, G.qw, G.qh, rr, .8)}) + el("path", {class: "eld-peg", d: wrect(-5, -4, 10, 10, rr, .5)});
        // The wrap must say exactly the posted title.
        const lines = WRAP[k].join(" ") === title ? WRAP[k] : [title];
        lines.forEach((ln, j) => { s += text(-G.qw / 2 + 8, G.y0 + j * G.lh, ln, "eld-hand eld-onpaper", G.fs); });
        s += text(-G.qw / 2 + 8, G.qh - 7, employer, "eld-hand eld-onpaper eld-mute", G.fs - 1);
        g += el("g", {transform: `translate(${x} ${y}) rotate(${tilt.toFixed(1)})`}, s);
    });
    return g;
}

/** The overlays on the stage (640 x 680 units): the characters and the slips, for the steps that have them. */
export function overlay(k: number, ph: boolean): string | null {
    const r = rnd(40 + k);
    if (k === 3) return svg(640, 680, feat(ph ? 36 : 46, 636, ph ? 26 : 30, {pose: "up", head: "up", slot: "ladder-foot", shirt: "#f6d14c"}));
    if (k !== 5) return null;
    return svg(640, 680, slips(ph, r)
        + feat(ph ? 56 : 68, 590, ph ? 28 : 26, {pose: "hip", head: "grad", slot: "step-graduate", hat: true, shirt: "#b79af2", trousers: "#1a1a1a"})
        + feat(ph ? 578 : 559, 590, ph ? 28 : 26, {pose: "hold", head: "intern", slot: "step-intern", pack: true, shirt: LIME}));
}

/* The guess: 100 people in ten rows of a 400 x 400 box. Picks get a pen ring; our count raises a hand in lime. */
const C = 40, at = (i: number) => [(i % 10) * C + C / 2, Math.floor(i / 10) * C + C - 3];
/** The first `ours` people, plain or, once shown, in lime with a hand up (popping in one after another). */
export function guessOurs(ours: number, shown: boolean) {
    let g = "";
    for (let i = 0; i < ours; i++) {
        const [x, y] = at(i);
        g += tiny(x, y, 18, {seed: 300 + i, hand: shown, shirt: shown ? LIME : null, lime: shown}, shown ? `animation-delay:${i * 60}ms` : undefined);
    }
    return g;
}
/** Everyone else, who never changes. */
export function guessRest(ours: number) {
    let g = "";
    for (let i = ours; i < 100; i++) { const [x, y] = at(i); g += tiny(x, y, 18, {seed: 300 + i}); }
    return g;
}
/** The reader's picks, a pen ring each. Photo heads stay out of the guess: over a grid of small people they read as floating heads (review, 19 Oct). */
export function guessRings(n: number) {
    let g = "";
    for (let i = 0; i < n; i++) { const [x, y] = at(i); g += el("path", {class: "eld-ring", d: wellipse(x, y - 15, 14, 19, rnd(i + 1), 1.4)}); }
    return g;
}

/** The ending: one character beside the CV ask, waving. */
export const ending = () => svg(110, 132, feat(50, 124, 30, {pose: "wave", head: "beard", slot: "end-beard", shirt: "#f6d14c"}));
