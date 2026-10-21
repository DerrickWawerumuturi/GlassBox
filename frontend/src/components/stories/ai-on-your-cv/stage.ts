import {LIME, rnd, wline, wrect} from "../is-entry-level-dead/marker";
import {sprites} from "../is-entry-level-dead/sprites";
import {makeLayout, State} from "./states";

/*
 * The stage renderer (the prototype's draw.js): one canvas drawn from a
 * layout state. set(k) tweens every person (feet, size, alpha), the camera,
 * the window lights and the scene's alphas from the current picture to the
 * next, so the reader sees the camera walk down the street, a door open and
 * its people step out onto the pavement. Reduced motion jumps to the end. The
 * crowd is blitted from sprite sheets; the buildings, signs, doors, the lamp
 * post and the two doors by level are marker paths in street coordinates
 * drawn through the camera. Colours and fonts are read from the canvas's CSS
 * variables at draw time, so a theme change redraws (no backing shapes behind
 * anyone in dark mode: the panes are left clear).
 */

const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const F = {small: [13, 400], num: [28, 700], hand: [21, 500]}, FP = {small: [19, 400], num: [38, 700], hand: [29, 500]};
const VARS = {ink: "--ink", muted: "--muted", pen: "--pen", marker: "--marker", lime: "--lit", card: "--card", sign: "--sign", pane: "--pane", door: "--door",
    warm: "--warm", pave: "--pave", f0: "--f0", f1: "--f1", f2: "--f2", f3: "--f3", f4: "--f4", f5: "--f5", essay: "--essay", hand: "--hand", disp: "--neon", mono: "--mono"};
type Paint = Record<keyof typeof VARS, string>;
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
/** The crowd's five kinds: plain, lime (the job names LLMs), and one, two or three laptops (languages the ad names). */
const KINDS = [{}, {shirt: LIME, lime: true}, {laptops: 1}, {laptops: 2}, {laptops: 3}];
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function stage(cv: HTMLCanvasElement, ph: boolean) {
    const LY = makeLayout(ph), ST = LY.ST, {G, B, board, house, LV} = ST, N = LY.N, W = LY.W, FS = ph ? FP : F;
    const draw1 = sprites(LY.sizes, KINDS, {w: 1.5, at: .42});
    const c = cv.getContext("2d")!;
    let cur: State | null = null, from: State | null = null, to: State | null = null, t0 = 0, raf = 0, H = ST.H;
    const css = (): Paint => { const s = getComputedStyle(cv); return Object.fromEntries(Object.entries(VARS).map(([k, v]) => [k, s.getPropertyValue(v).trim()])) as Paint; };
    const size = () => {
        const r = cv.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1);
        cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    };

    /* The fixed marker drawings in street coordinates, made once. */
    const r0 = rnd(3);
    const BLD = B.map((b) => {
        const win = new Path2D(), lit = new Path2D();
        for (let i = 0; i < b.n; i++) {
            const [hx, hy] = ST.home(b.i0 + i), rc = [hx - G.px / 2 + .5, hy - G.py + 1.2, G.px - 1, G.py - 1.4] as const;
            win.rect(...rc);
            if (ST.ID.lime[b.i0 + i]) lit.rect(...rc);
        }
        const dx = b.x + b.w / 2 - G.doorW / 2, door = new Path2D(wrect(dx, b.ground - G.gf + 1, G.doorW, G.gf - 1, r0, .5));
        return {face: new Path2D(wrect(b.x, b.top, b.w, b.h, r0, .9)), win, lit, door, knob: [dx + G.doorW * .78, b.ground - G.gf * .5],
            sign: new Path2D(wrect(b.x - 4, b.top - b.signH - 2, b.w + 8, b.signH, r0, .8)), signTop: b.top - b.signH - 2};
    });
    const GROUND = ST.rows.map((r) => new Path2D(wline([[-3000, r.ground + .5], [4000, r.ground + .5]], r0, .6)));
    const bb = {x: board.x, y: board.ground - board.post - board.h}, mid = board.x + board.w / 2;
    const BOARD = {post: new Path2D(wline([[mid, board.ground], [mid, bb.y + board.h]], r0, .6)), face: new Path2D(wrect(bb.x, bb.y, board.w, board.h, r0, .8)),
        arm: new Path2D(wline([[mid, bb.y + board.h * .5], [mid + board.w * .3, bb.y - 18], [mid + board.w * .55, bb.y - 10]], r0, .6)), lamp: [mid + board.w * .55, bb.y - 10],
        paper: new Path2D(wrect(bb.x + board.w * .2, bb.y + board.h * .14, board.w * .6, board.h * .72, r0, .6)),
        lines: new Path2D([.34, .5, .64].map((f) => wline([[bb.x + board.w * .28, bb.y + board.h * f], [bb.x + board.w * (f > .6 ? .6 : .72), bb.y + board.h * f]], r0, .4)).join(""))};
    const signTop = house.y - 6 - (ph ? 66 : 48);
    const HOUSE = house.doors.map((d) => ({frame: new Path2D(wrect(d.x - 6, house.y - 6, d.w + 12, d.h + 6, r0, .9)), door: new Path2D(wrect(d.x, house.y, d.w, d.h, r0, .7)),
        knob: [d.x + d.w * .8, house.y + d.h * .52], sign: new Path2D(wrect(d.x - 18, signTop, d.w + 36, ph ? 60 : 44, r0, .8))}));
    const HGROUND = new Path2D(wline([[-3000, house.y + house.doors[0].h + .5], [4000, house.y + house.doors[0].h + .5]], r0, .6));

    /* The pieces */
    const withCam = (S: State, fn: (k: number) => void) => {
        c.save(); c.transform(S.cam.s, 0, 0, S.cam.s, S.cam.tx, S.cam.ty); c.lineJoin = "round"; c.lineCap = "round"; fn(1 / Math.sqrt(S.cam.s)); c.restore(); c.globalAlpha = 1;
    };
    const dot = (x: number, y: number, r: number) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
    // A sign: the family's name, its share (percent first) and its count; a small family its count only.
    function signText(P: Paint, lines: string[], share: string, count: string, cx: number, top: number, h: number) {
        c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillStyle = P.ink; c.font = `400 ${G.nameSz}px ${P.disp}`;
        lines.forEach((ln, j) => c.fillText(ln, cx, top + 6 + (j + 1) * G.nameSz * 1.08 - G.nameSz * .12));
        if (share) { c.font = `700 ${G.pctSz}px ${P.mono}`; c.fillText(share, cx, top + 6 + lines.length * G.nameSz * 1.08 + G.pctSz * .96); }
        c.fillStyle = P.muted; c.font = `500 ${G.countSz}px ${P.mono}`; c.fillText(count, cx, top + h - 7);
    }
    function street(P: Paint, S: State) {
        if (S.street <= 0) return;
        const pal = [P.f0, P.f1, P.f2, P.f3, P.f4, P.f5];
        withCam(S, (k) => {
            c.strokeStyle = P.pave; c.lineWidth = 1.2 * k;
            GROUND.forEach((g, ri) => { const a = Math.max(...ST.rows[ri].bs.map((b) => S.balpha[b.k])); if (a > .01) { c.globalAlpha = S.street * a; c.stroke(g); } });
            B.forEach((b, i) => {
                const D = BLD[i], ba = S.street * S.balpha[i];
                if (ba <= .01) return;
                c.globalAlpha = ba; c.fillStyle = pal[b.pal]; c.fill(D.face); c.strokeStyle = P.marker; c.lineWidth = 1.3 * k; c.stroke(D.face);
                if (P.pane !== "none") { c.fillStyle = P.pane; c.fill(D.win); }
                c.strokeStyle = P.marker; c.lineWidth = .6 * k; c.stroke(D.win);
                if (S.lit[i] > 0) {
                    c.globalAlpha = ba * S.lit[i]; c.fillStyle = P.lime; c.fill(D.lit); c.strokeStyle = P.lime; c.lineWidth = 2.2 * k;
                    c.globalAlpha = ba * S.lit[i] * .35; c.stroke(D.lit); c.globalAlpha = ba;
                }
                c.fillStyle = S.open[i] ? P.warm : P.door; c.fill(D.door); c.strokeStyle = P.marker; c.lineWidth = 1.1 * k; c.stroke(D.door);
                if (!S.open[i]) { c.fillStyle = P.marker; dot(D.knob[0], D.knob[1], .9); }
                c.fillStyle = P.sign; c.fill(D.sign); c.strokeStyle = P.marker; c.lineWidth = 1.1 * k; c.stroke(D.sign); signText(P, b.sign, b.pct, b.count, b.x + b.w / 2, D.signTop, b.signH);
            });
            // The lamp post and its notice board at the end of the street.
            if (S.board <= .01) return;
            c.globalAlpha = S.street * S.board; c.strokeStyle = P.marker; c.lineWidth = 2 * k; c.stroke(BOARD.post); c.stroke(BOARD.arm);
            c.fillStyle = P.sign; c.fill(BOARD.face); c.lineWidth = 1.2 * k; c.stroke(BOARD.face);
            c.fillStyle = P.card; c.fill(BOARD.paper); c.lineWidth = .8 * k; c.stroke(BOARD.paper); c.strokeStyle = P.muted; c.stroke(BOARD.lines);
            const [lx, ly] = BOARD.lamp, g = c.createRadialGradient(lx, ly, 2, lx, ly, 28);
            g.addColorStop(0, rgba(P.warm, .55)); g.addColorStop(1, rgba(P.warm, 0)); c.fillStyle = g; dot(lx, ly, 28);
            c.fillStyle = P.warm; dot(lx, ly, 4); c.lineWidth = k; c.stroke();
        });
    }
    function houseDoors(P: Paint, S: State) {
        if (S.house <= 0) return;
        withCam(S, (k) => {
            c.globalAlpha = S.house; c.strokeStyle = P.pave; c.lineWidth = 1.2 * k; c.stroke(HGROUND);
            HOUSE.forEach((D, j) => {
                const d = house.doors[j], lv = LV[j], sz = ph ? 24 : 17;
                c.fillStyle = P.sign; c.fill(D.frame); c.strokeStyle = P.marker; c.lineWidth = 1.4; c.stroke(D.frame); c.fillStyle = P.door; c.fill(D.door); c.stroke(D.door);
                c.fillStyle = P.marker; dot(D.knob[0], D.knob[1], 2);
                c.fillStyle = P.sign; c.fill(D.sign); c.stroke(D.sign);
                c.textAlign = "center"; c.fillStyle = P.ink; c.font = `400 ${sz}px ${P.disp}`; c.fillText(lv.name, d.x + d.w / 2, signTop + sz + 7);
                c.fillStyle = P.muted; c.font = `500 ${ph ? 17 : 12}px ${P.mono}`; c.fillText(`${lv.jobs.toLocaleString("en")} jobs`, d.x + d.w / 2, signTop + (ph ? 52 : 38));
            });
        });
    }
    function pave2(P: Paint, S: State) {
        if (S.pave2 == null) return;
        c.strokeStyle = P.pave; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, S.pave2 + .5); c.lineTo(W, S.pave2 + .5); c.stroke();
    }
    function spill(P: Paint, S: State) {
        if (!S.spill || S.spillA <= 0) return;
        const {x, y, w} = S.spill;
        c.globalAlpha = S.spillA * .5; c.fillStyle = P.warm; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.lineTo(x + w * 1.7, y + 15); c.lineTo(x - w * 1.7, y + 15);
        c.closePath(); c.fill(); c.globalAlpha = 1;
    }
    function crowd(P: Paint, S: State) {
        for (let i = 0; i < N; i++) { const a = S.A[i]; if (a < .01) continue; c.globalAlpha = a; draw1(c, P.marker, ST.VAR[i], S.KIND[i], S.X[i], S.Y[i], S.S[i]); }
        c.globalAlpha = 1;
    }
    function ring(P: Paint, S: State) {
        if (!S.ring || S.ringA <= 0) return;
        const b = S.ring;
        c.globalAlpha = S.ringA; c.strokeStyle = P.pen; c.lineWidth = 2.2; c.lineCap = "round"; c.beginPath(); c.ellipse(b.x, b.y, b.rx + 3, b.ry + 3, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    function labels(P: Paint, S: State, a: number) {
        if (a <= 0) return;
        const col = {ink: P.ink, muted: P.muted, pen: P.pen};
        for (const l of S.labels) {
            const [sz, wt] = FS[l.f];
            c.save(); c.globalAlpha = a; c.translate(l.x, l.y); c.rotate(l.rot * Math.PI / 180); c.font = `${wt} ${sz}px ${l.f === "hand" ? P.hand : P.essay}`;
            c.textAlign = l.al; c.textBaseline = "alphabetic"; c.fillStyle = col[l.c]; c.fillText(l.t, 0, 0); c.restore();
        }
    }
    function draw(S: State, prev: State | null, t: number) {
        const P = css();
        c.clearRect(0, 0, W, H);
        street(P, S); houseDoors(P, S); pave2(P, S); spill(P, S); crowd(P, S); ring(P, S);
        if (prev && t < 1) { labels(P, prev, Math.max(0, 1 - t * 2.6)); labels(P, S, Math.max(0, (t - .55) / .45)); } else labels(P, S, 1);
    }

    /* The tween */
    const snapshot = (S: State): State => ({...S, X: S.X.slice(), Y: S.Y.slice(), S: S.S.slice(), A: S.A.slice(), KIND: S.KIND.slice(), cam: {...S.cam},
        lit: S.lit.slice(), open: S.open.slice(), balpha: S.balpha.slice()});
    function step(now: number) {
        if (!from || !to) return;
        // People leaving or returning to their windows stagger a little by column, so a building empties in a wave; a camera move alone carries everyone at once.
        const T = Math.min(1, (now - t0) / 1500), M = snapshot(to), carry = from.cam.s !== to.cam.s || from.cam.tx !== to.cam.tx, span = .18;
        for (let i = 0; i < N; i++) {
            const moved = from.S[i] !== to.S[i] || from.A[i] !== to.A[i], d = moved ? (from.X[i] / W) * span : 0, u = ease(Math.max(0, Math.min(1, (T - d) / (1 - span))));
            const v = carry && !moved ? ease(T) : u;
            M.X[i] = lerp(from.X[i], to.X[i], v); M.Y[i] = lerp(from.Y[i], to.Y[i], v); M.S[i] = lerp(from.S[i], to.S[i], u); M.A[i] = lerp(from.A[i], to.A[i], u);
            M.KIND[i] = u < .5 ? from.KIND[i] : to.KIND[i];
        }
        const e = ease(T);
        M.cam = {s: lerp(from.cam.s, to.cam.s, e), tx: lerp(from.cam.tx, to.cam.tx, e), ty: lerp(from.cam.ty, to.cam.ty, e)};
        for (let i = 0; i < M.lit.length; i++) { M.lit[i] = lerp(from.lit[i], to.lit[i], e); M.balpha[i] = lerp(from.balpha[i], to.balpha[i], e); M.open[i] = e < .5 ? from.open[i] : to.open[i]; }
        M.board = lerp(from.board, to.board, e); M.street = lerp(from.street, to.street, e); M.house = lerp(from.house, to.house, e);
        M.spill = to.spill || from.spill; M.spillA = lerp(from.spill ? 1 : 0, to.spill ? 1 : 0, e);
        M.ring = to.ring || from.ring; M.ringA = lerp(from.ring ? 1 : 0, to.ring ? 1 : 0, Math.max(0, (T - .6) / .4));
        cur = M; draw(M, from, T);
        if (T < 1) raf = requestAnimationFrame(step); else { cur = to; draw(to, null, 1); }
    }

    return {
        /** Show step k: tweened from the current picture, or at once (the first picture, a jump, reduced motion). */
        set(k: number, animate = true) {
            to = LY.state(k); cancelAnimationFrame(raf);
            H = to.H; size();
            if (!cur || !animate || reduced()) { cur = to; draw(to, null, 1); return; }
            from = snapshot(cur); t0 = performance.now(); raf = requestAnimationFrame(step);
        },
        /** After a resize or a theme change. */
        redraw() { size(); if (cur) draw(cur, null, 1); },
        stop() { cancelAnimationFrame(raf); },
    };
}
export type Stage = ReturnType<typeof stage>;
