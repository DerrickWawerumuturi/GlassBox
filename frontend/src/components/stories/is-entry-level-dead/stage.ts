import {ELD} from "@/lib/stories/is-entry-level-dead";
import {H, Label, makeLayout, SCALARS, State, W} from "./layouts";
import {ladderParts, rnd, wline, wrect} from "./marker";
import {sprites} from "./sprites";

/*
 * The stage renderer (the prototype's draw.js): one canvas, 640 x 680 units,
 * drawn from a layout state. set(k) tweens every person (feet, size, alpha),
 * the camera and the scene's alphas from the current picture to the next, so
 * the reader sees the crowd sort onto the steps, step aside and turn lime;
 * labels cross fade. Reduced motion jumps to the end. Colours and fonts are
 * read from the frame's CSS variables at draw time, so a theme change redraws.
 */

const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const F = {small: [13, 400], body: [15.5, 600], num: [28, 700], big: [44, 700], hand: [21, 500]}, FP = {small: [22, 400], body: [24, 600], num: [40, 700], big: [56, 700], hand: [30, 500]};
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const VARS = {ink: "--ink", muted: "--muted", pen: "--pen", marker: "--marker", woodA: "--wood-a", woodB: "--wood-b", glow: "--glow", card: "--card", rule: "--rule",
    slip: "--slip", slipInk: "--slip-ink", point: "--point", pointEdge: "--point-edge", essay: "--essay", hand: "--hand"};
type Paint = Record<keyof typeof VARS, string>;
/** "#ffe9a3" at alpha a: the glow's colour token is a hex. */
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function stage(cv: HTMLCanvasElement, ph: boolean) {
    const LY = makeLayout(ph), N = LY.N, LAD = LY.LAD, draw1 = sprites(LY.sizes), FS = ph ? FP : F;
    const c = cv.getContext("2d")!;
    let cur: State | null = null, from: State | null = null, to: State | null = null, t0 = 0, raf = 0;
    const css = (): Paint => { const s = getComputedStyle(cv); return Object.fromEntries(Object.entries(VARS).map(([k, v]) => [k, s.getPropertyValue(v).trim()])) as Paint; };
    const size = () => {
        const r = cv.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1);
        cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    };

    /* The fixed marker drawings, made once: the ladder, the employer tally (one mark each, crossed in fives), the skill cards. */
    const LADDER = ladderParts(LAD, rnd(2)).map((p) => ({...p, path: new Path2D(p.d)}));
    const T = LY.tally, tallyPath = (() => {
        const r = rnd(7);
        let d = "";
        for (let g = 0; g * 5 < ELD.employers; g++) {
            const gx = T.x0 + (g % T.per) * T.px, gy = T.y0 + Math.floor(g / T.per) * T.py, marks = Math.min(5, ELD.employers - g * 5);
            for (let k = 0; k < Math.min(4, marks); k++) d += wline([[gx + k * T.sp, gy], [gx + k * T.sp - .4, gy + T.h]], r, .7);
            if (marks === 5) d += wline([[gx - 2, gy + T.h - 1], [gx + T.sp * 3.6, gy + 1]], r, .7);
        }
        return new Path2D(d);
    })();
    const CARDS = [[190, ELD.medianSkills.entry], [450, ELD.medianSkills.senior]].map(([cx, n]) => Array.from({length: n}, (_, i) => {
        const r = rnd(cx + i), y = 590 - (i + 1) * 18 - 4, x = cx - 75 + ((i * 37) % 7 - 3);
        return {face: new Path2D(wrect(x, y, 150, 20, r, .8)), ink: new Path2D(wline([[x + 22, y + 10], [x + 96 + (i * 13) % 30, y + 10]], r, .5))};
    }));

    function ladder(P: Paint, S: State) {
        if (S.ladder <= 0) return;
        const cam = S.cam;
        c.save(); c.translate(cam.ax, cam.ay); c.scale(cam.s, cam.s); c.translate(-LAD.cx, -LAD.rungs[2]); c.lineJoin = "round"; c.lineCap = "round";
        for (const p of LADDER) {
            const a = p.cls === "ground" ? S.ladder * S.ground : p.k == null || p.k < 0 || p.k === 2 ? S.ladder : S.ladder * S.upper;
            if (a <= 0) continue;
            c.globalAlpha = a * (p.cls === "grain" ? .7 : 1);
            if (p.cls === "wood") { c.fillStyle = P.woodA; c.fill(p.path); c.strokeStyle = P.marker; c.lineWidth = 1.6 / cam.s; c.stroke(p.path); }
            else if (p.cls === "grain") { c.strokeStyle = P.woodB; c.lineWidth = 1 / cam.s; c.stroke(p.path); }
            else if (p.cls === "knot") { c.fillStyle = P.woodB; c.fill(p.path); }
            else { c.strokeStyle = P.muted; c.lineWidth = 1.2 / cam.s; c.stroke(p.path); }
        }
        c.restore(); c.globalAlpha = 1;
    }
    function glow(P: Paint, S: State) {
        if (S.glow <= 0) return;
        c.save(); c.scale(1, .3);
        const cy = LY.glowY / .3, g = c.createRadialGradient(320, cy, 10, 320, cy, 330), tint = (a: number) => rgba(P.glow, a);
        g.addColorStop(0, tint(.95)); g.addColorStop(.6, tint(.45)); g.addColorStop(1, tint(0));
        c.globalAlpha = S.glow; c.fillStyle = g; c.beginPath(); c.arc(320, cy, 340, 0, Math.PI * 2); c.fill(); c.restore(); c.globalAlpha = 1;
    }
    function crowd(P: Paint, S: State) {
        for (let i = 0; i < N; i++) {
            const a = S.A[i];
            if (a < .01) continue;
            const s = S.S[i], x = S.X[i], y = S.Y[i];
            c.globalAlpha = a; draw1(c, P.marker, LY.VAR[i], S.COL[i], x, y, s);
            if (!S.TAG[i]) continue;
            // A name tag on the chest: blank, or "yrs" where the ad states a number. A person is 10 jobs, so the tag says a number is stated, not which (review, 19 Oct).
            const tx = x - s * .22, ty = y - s * 1.26 + s * .1, tw = s * .44, th = s * .3;
            c.fillStyle = "#fffdf9"; c.strokeStyle = P.marker; c.lineWidth = .8; rr(c, tx, ty, tw, th, 1); c.fill(); c.stroke();
            if (S.TAG[i] > 1) { c.fillStyle = "#1a1a1a"; c.font = `700 ${s * .17}px ${P.essay}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("yrs", x, ty + th / 2 + s * .01); }
        }
        c.globalAlpha = 1;
    }
    function tally(P: Paint, S: State) {
        if (S.tally <= 0) return;
        c.globalAlpha = S.tally; c.strokeStyle = P.marker; c.lineWidth = 1.4; c.lineCap = "round"; c.stroke(tallyPath); c.globalAlpha = 1;
    }
    function cards(P: Paint, S: State) {
        if (S.chips <= 0) return;
        c.lineJoin = "round";
        CARDS.forEach((pile) => pile.forEach((card, i) => {
            const a = Math.max(0, Math.min(1, S.chips * pile.length - i));
            if (a <= 0) return;
            c.globalAlpha = a; c.fillStyle = P.slip; c.fill(card.face); c.strokeStyle = P.marker; c.lineWidth = 1.1; c.stroke(card.face);
            c.strokeStyle = P.slipInk; c.lineWidth = 1.2; c.stroke(card.ink);
        }));
        c.globalAlpha = 1;
    }
    function band(P: Paint, S: State) {
        if (S.band <= 0 || !S.weeks || !S.future) return;
        const Y = (p: number) => 560 - p * 12;
        // No shaded range: a box here read as a computed uncertainty band, and we have none (review, 19 Oct).
        c.globalAlpha = S.band; c.strokeStyle = P.rule; c.lineWidth = 1.2; c.beginPath(); c.moveTo(60, 560); c.lineTo(620, 560); c.stroke();
        c.fillStyle = P.muted; c.textAlign = "right"; c.textBaseline = "middle"; c.font = `400 ${FS.small[0]}px ${P.essay}`;
        [0, 10, 20, 30].forEach((p) => { c.fillText(p + "%", 50, Y(p)); c.beginPath(); c.moveTo(56, Y(p)); c.lineTo(62, Y(p)); c.stroke(); });
        c.textAlign = "center";
        S.future.forEach((f) => { c.fillStyle = P.muted; c.fillText(f.lab, f.x, 586); c.setLineDash([3, 4]); c.strokeStyle = P.muted; rr(c, f.x - 9, Y(16) - 6, 18, 12, 3); c.stroke(); c.setLineDash([]); });
        S.weeks.forEach((w) => {
            c.fillStyle = P.point; rr(c, w.x - 9, Y(w.pct) - 6, 18, 12, 3); c.fill(); c.strokeStyle = P.pointEdge; c.stroke();
            c.fillStyle = P.ink; c.font = `700 ${FS.num[0]}px ${P.essay}`; c.fillText(w.big, w.x, Y(w.pct) - 26);
            c.font = `400 ${FS.small[0]}px ${P.essay}`; c.fillStyle = P.muted;
            w.of.split("\n").forEach((ln, k) => c.fillText(ln, w.x, Y(w.pct) + 20 + k * FS.small[0] * 1.1)); c.fillText(w.lab, w.x, 586);
        });
        c.globalAlpha = 1;
    }
    function aside(P: Paint, S: State) {
        if (S.aside <= 0 || !S.asideBox) return;
        const b = S.asideBox;
        c.globalAlpha = S.aside; c.strokeStyle = P.pen; c.lineWidth = 2; c.beginPath(); c.ellipse(b.dx, b.dy, b.rx + 4, b.ry + 4, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(b.dx + 2, b.dy - b.ry - 5); c.quadraticCurveTo(b.dx + 30, b.y + b.h + 30, b.x + b.w * .6, b.y + b.h + 2); c.stroke();
        c.fillStyle = P.card; c.strokeStyle = P.ink; c.lineWidth = 1.2; c.save();
        c.translate(b.x + b.w / 2, b.y + b.h / 2); c.rotate(-.025); c.translate(-(b.x + b.w / 2), -(b.y + b.h / 2)); rr(c, b.x, b.y, b.w, b.h, 4); c.fill(); c.stroke();
        c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillStyle = P.ink; c.font = `700 ${FS.body[0]}px ${P.essay}`; c.fillText(b.title, b.x + 16, b.y + (ph ? 46 : 34));
        c.fillStyle = P.muted; c.font = `400 ${FS.small[0]}px ${P.essay}`; c.fillText(b.sub, b.x + 16, b.y + (ph ? 84 : 60)); c.restore(); c.globalAlpha = 1;
    }
    function labels(P: Paint, ls: Label[], a: number) {
        if (a <= 0) return;
        const col = {ink: P.ink, muted: P.muted, pen: P.pen};
        for (const l of ls) {
            const [sz, wt] = FS[l.f], fam = l.f === "hand" ? P.hand : P.essay, lines = l.t.split("\n"), lh = sz * 1.15;
            c.save(); c.globalAlpha = a; c.translate(l.x, l.y); c.rotate(l.rot * Math.PI / 180); c.font = `${wt} ${sz}px ${fam}`; c.textAlign = l.al; c.textBaseline = "alphabetic";
            if (l.box) {
                const w = Math.max(...lines.map((s) => c.measureText(s).width)) + 20, x = l.al === "center" ? -w / 2 : l.al === "right" ? -w : -10;
                c.fillStyle = P.card; c.globalAlpha = a * .92; rr(c, x, -sz * .95, w, lh * lines.length + sz * .35, 5); c.fill(); c.globalAlpha = a;
            }
            c.fillStyle = col[l.c]; lines.forEach((s, k) => c.fillText(s, 0, k * lh)); c.restore();
        }
    }
    function draw(S: State, prev: State | null, t: number) {
        const P = css();
        c.clearRect(0, 0, W, H);
        ladder(P, S); glow(P, S); crowd(P, S); tally(P, S); cards(P, S); band(P, S); aside(P, S);
        if (prev && t < 1) { labels(P, prev.labels, Math.max(0, 1 - t * 2.6)); labels(P, S.labels, Math.max(0, (t - .55) / .45)); } else labels(P, S.labels, 1);
    }

    /* The tween */
    const snapshot = (S: State): State => ({...S, X: S.X.slice(), Y: S.Y.slice(), S: S.S.slice(), A: S.A.slice(), COL: S.COL.slice(), TAG: S.TAG.slice(), cam: {...S.cam}});
    function step(now: number) {
        if (!from || !to) return;
        // The fall staggers by row so the crowd rains onto the steps; a camera move carries everyone with the ladder, no stagger; otherwise a small stagger by column.
        const T = Math.min(1, (now - t0) / 1500), M = snapshot(to), fall = to.stagger === "fall" && from.ladder < .5, carry = from.cam.s !== to.cam.s, span = fall ? .4 : carry ? 0 : .15;
        for (let i = 0; i < N; i++) {
            const d = fall ? (from.Y[i] / H) * span : carry ? 0 : (from.X[i] / W) * span, u = ease(Math.max(0, Math.min(1, (T - d) / (1 - span))));
            M.X[i] = lerp(from.X[i], to.X[i], u); M.Y[i] = lerp(from.Y[i], to.Y[i], u); M.S[i] = lerp(from.S[i], to.S[i], u); M.A[i] = lerp(from.A[i], to.A[i], u);
            M.COL[i] = u < .5 ? from.COL[i] : to.COL[i]; M.TAG[i] = u < .5 ? from.TAG[i] : to.TAG[i];
        }
        const e = ease(T);
        for (const k of SCALARS) M[k] = lerp(from[k], to[k], e);
        M.cam = {s: lerp(from.cam.s, to.cam.s, e), ax: lerp(from.cam.ax, to.cam.ax, e), ay: lerp(from.cam.ay, to.cam.ay, e)};
        if (M.aside > 0 && !M.asideBox) M.asideBox = from.asideBox;
        if (M.band > 0 && !M.weeks) { M.weeks = from.weeks; M.future = from.future; }
        cur = M; draw(M, from, T);
        if (T < 1) raf = requestAnimationFrame(step); else { cur = to; draw(to, null, 1); }
    }

    size();
    return {
        /** Show step k: tweened from the current picture, or at once (the first picture, a jump, reduced motion). */
        set(k: number, animate = true) {
            to = LY.state(k); cancelAnimationFrame(raf);
            if (!cur || !animate || reduced()) { cur = to; draw(to, null, 1); return; }
            from = snapshot(cur); t0 = performance.now(); raf = requestAnimationFrame(step);
        },
        /** After a resize or a theme change. */
        redraw() { size(); if (cur) draw(cur, null, 1); },
        stop() { cancelAnimationFrame(raf); },
    };
}
export type Stage = ReturnType<typeof stage>;
