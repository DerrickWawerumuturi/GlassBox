import {AIC, AI_JOBS, fam, fmt, pct, PER} from "@/lib/stories/ai-on-your-cv";
import {Building, makeStreet} from "./buildings";

/*
 * Where every drawn person stands in each step (2 to 7), where the camera
 * looks, what the labels say, and where the overlays (the pinned listings,
 * the photo head characters) are anchored (the prototype's states.js).
 * Stage: 720 x 600 units on a wide screen; 640 wide on a phone, as tall as the
 * state needs (H). cam {s, tx, ty} maps street coordinates to the stage:
 * stage = street * s + t. People in windows are placed through the camera;
 * people on the pavement in stage units directly. Pure, so the server places
 * the overlays where the canvas will draw.
 */

export type Font = "small" | "num" | "hand";
export type Label = {x: number; y: number; t: string; f: Font; c: "ink" | "muted" | "pen"; al: CanvasTextAlign; rot: number};
export type Cam = {s: number; tx: number; ty: number};
export type Ad = "elastic" | "airbnb" | "qualinx";
/** A listing pinned in the frame (wide; fs: its type size in cqw), and the characters standing in it. */
export type CardAt = {x: number; y: number; w: number; rot: number; ad: Ad; fs: number};
export type CharAt = {x: number; y: number; s: number; head: "curls" | "glasses"; pose: "up" | "wave" | "hip"; slot: string};
export type Anchors = {card?: CardAt; chars: CharAt[]};

export interface State {
    X: Float32Array; Y: Float32Array; S: Float32Array; A: Float32Array; KIND: Uint8Array;
    cam: Cam; lit: Float32Array; balpha: Float32Array; open: Uint8Array; board: number; street: number; house: number;
    spill: {x: number; y: number; w: number} | null; ring: {x: number; y: number; rx: number; ry: number} | null;
    spillA: number; ringA: number; pave2: number | null; labels: Label[]; H: number; anchors: Anchors | null;
}
export const STEPS = [2, 3, 4, 5, 6, 7] as const;

const L = (x: number, y: number, t: string, f: Font, o: {al?: CanvasTextAlign; rot?: number} = {}): Label =>
    ({x, y, t, f, c: f === "hand" ? "pen" : f === "small" ? "muted" : "ink", al: o.al || "left", rot: o.rot || 0});
const camAt = (s: number, sx: number, sy: number, tx: number, ty: number): Cam => ({s, tx: tx - sx * s, ty: ty - sy * s});

export function makeLayout(ph: boolean) {
    const ST = makeStreet(ph), {G, B, N, ID, board, house, LV} = ST, W = ST.W, NB = B.length;
    const ai = ST.byKey.ai, emb = ST.byKey.embedded, zoom = G.zoom, scale = `one drawn person is ${PER} jobs, rounded`;
    const fresh = (H = ST.H): State => ({X: new Float32Array(N), Y: new Float32Array(N), S: new Float32Array(N), A: new Float32Array(N), KIND: new Uint8Array(N),
        cam: {s: 1, tx: 0, ty: 0}, lit: new Float32Array(NB).fill(1), balpha: new Float32Array(NB).fill(1), open: new Uint8Array(NB), board: 1, street: 1, house: 0,
        spill: null, ring: null, spillA: 1, ringA: 1, pave2: null, labels: [], H, anchors: null});
    const put = (S: State, i: number, x: number, y: number, s: number, a: number, kind: number) => { S.X[i] = x; S.Y[i] = y; S.S[i] = s; S.A[i] = a; S.KIND[i] = kind; };
    // Everyone in their window, seen through the camera, lime where the job names LLMs; the level people hidden.
    function atHome(S: State, cam: Cam) {
        for (let i = 0; i < N; i++) {
            if (ID.fam[i] >= 100) { S.A[i] = 0; continue; }
            const [hx, hy] = ST.home(i);
            put(S, i, hx * cam.s + cam.tx, hy * cam.s + cam.ty, G.s * cam.s, S.balpha[ID.fam[i]], ID.lime[i]);
        }
    }
    // A block of people on a pavement: rank i, `per` to a row, feet on `ground`, rows stacking upward.
    const block = (i: number, x0: number, ground: number, per: number, px: number, py: number) => [x0 + (i % per) * px + px / 2, ground - Math.floor(i / per) * py];
    const doorX = (b: Building) => b.x + b.w / 2;
    // A close up keeps only the building it is about (or one row of the street), so labels and people have the pavement to themselves.
    const only = (S: State, keep: (b: Building) => boolean) => B.forEach((b) => { S.balpha[b.k] = keep(b) ? 1 : 0; });
    // A listing pinned on a façade, under its sign, over the door, and the walker just right of it. On a phone the listing stands in the step instead.
    const pinned = (b: Building, cam: Cam, gx: number, ad: Ad, rot: number) => {
        const x = gx + 6, w = 172;
        return {card: {x, y: (b.top + 4) * cam.s + cam.ty, w, rot, ad, fs: 1.3}, walker: ph ? b.x1 * cam.s + cam.tx + 28 : x + w + 22};
    };
    const walker = (x: number, y: number, slot: string): CharAt => ({x, y, s: ph ? 26 : 20, head: "curls", pose: "up", slot});

    const states: Record<number, () => State> = {
        // 2. The street: every family in its building, the lime windows lit.
        2() {
            const S = fresh();
            atHome(S, S.cam);
            S.labels = ph ? [L(20, 22, "one building per job family, sorted from the", "small"), L(20, 44, "loudest ask for LLMs to the quietest", "small"),
                L(20, 66, scale, "small"), L(W - 20, S.H - 14, "every lime window: a job that names LLMs", "hand", {al: "right", rot: -2})]
                : [L(20, 20, "one building per job family, sorted from the loudest ask for LLMs to the quietest", "small"),
                    L(W - 20, S.H - 10, "every lime window: a job that names LLMs", "hand", {al: "right", rot: -2}), L(20, S.H - 6, scale, "small")];
            return S;
        },
        // 3. The AI door opens: its people step onto the pavement and sort by how many programming languages their ad names (one laptop each).
        3() {
            const P = ph ? {H: 860, gx: 16, ground: 330, zoom: 1.9, g2: 660, s: 13, px: 15, py: 17, per: [6, 4, 3, 3], x: [50, 215, 335, 445], ly: 704, lh: 22}
                : {H: 600, gx: 30, ground: 410, zoom, g2: 410, s: 12, px: 14, py: 15.5, per: [8, 5, 4, 3], x: [275, 405, 495, 585], ly: 442, lh: 15};
            const S = fresh(P.H), cam = camAt(P.zoom, ai.x, ai.ground, P.gx, P.ground);
            S.cam = cam; only(S, (b) => b === ai); S.board = 0; atHome(S, cam);
            const rank = [0, 0, 0, 0];
            for (let i = ai.i0; i < ai.i0 + ai.n; i++) { const g = ID.lang[i], [x, y] = block(rank[g]++, P.x[g], P.g2, P.per[g], P.px, P.py); put(S, i, x, y, P.s, 1, g ? g + 1 : 0); }
            S.lit[ai.k] = 0; S.open[ai.k] = 1; S.spill = {x: doorX(ai) * cam.s + cam.tx, y: P.ground, w: G.doorW * cam.s};
            if (ph) S.pave2 = P.g2;
            const cx = P.x.map((x, g) => x + P.per[g] * P.px / 2), of = (n: number) => `${fmt(n)} of ${fmt(AI_JOBS)}`, [n0, n1, n2, n3] = AIC.languages;
            const p = AIC.languages.map((n) => `${pct(n, AI_JOBS)}%`);
            const T = ph ? [[p[0], "name no", "programming", "language", of(n0)], [p[1], "name one", of(n1)], [p[2], "name two", of(n2)], [p[3], "name three", "or more", of(n3)]]
                : [[p[0], "name no", "programming language", of(n0)], [p[1], "name one", of(n1)], [p[2], "name two", of(n2)], [p[3], "name three", "or more", of(n3)]];
            T.forEach((t, g) => t.forEach((s, j) => S.labels.push(L(cx[g], P.ly + (j ? P.lh * j + (ph ? 8 : 6) : 0), s, j ? "small" : "num", {al: "center"}))));
            if (ph) S.labels.push(L(350, 150, "one laptop per", "hand", {rot: -3}), L(354, 184, "language the ad names", "hand", {rot: -3}));
            else S.labels.push(L(P.x[1], P.ground - 150, "one laptop per language the ad names", "hand", {rot: -3}));
            S.labels.push(L(20, S.H - 8, `${fmt(AI_JOBS)} AI jobs we could read this week; ${scale}`, "small"));
            const pin = pinned(ai, cam, P.gx, "elastic", -2);
            S.anchors = {card: pin.card, chars: [walker(pin.walker, P.ground, "ai-door")]};
            return S;
        },
        // 4. The notice board on the lamp post at the end of the street: Airbnb's listing, pinned between the doors.
        4() {
            const P = ph ? {H: 540, cx: 330, cy: 140} : {H: 600, cx: 440, cy: 150};
            const S = fresh(P.H), bx = board.x + board.w / 2, by = board.ground - board.post - board.h / 2, cam = camAt(zoom, bx, by, P.cx, P.cy);
            S.cam = cam; only(S, (b) => b.row === ST.rows.length - 1); atHome(S, cam);
            const gy = board.ground * cam.s + cam.ty, bx0 = board.x * cam.s + cam.tx, by0 = (board.ground - board.post - board.h) * cam.s + cam.ty;
            S.labels = [ph ? L(20, 44, "pinned between the doors", "hand", {rot: -2}) : L(bx0 - 24, 552, "pinned between the doors", "hand", {rot: -2}),
                L(20, S.H - 8, "one job ad, as posted this week; titles and employers as posted", "small")];
            S.anchors = {card: {x: bx0 - 30, y: by0 + 6, w: 300, rot: 1.2, ad: "airbnb", fs: 1.28}, chars: [walker(bx0 - (ph ? 60 : 64), gy, "board")]};
            return S;
        },
        // 5. Two doors by level: entry level software jobs and senior ones, each crowd in front of its door, lime where the ad names LLMs.
        5() {
            // On a phone the doors' signs need the room above them, and the street, taller than the gap to the doors, is put away.
            const P = ph ? {H: 700, top: 90, ground: 500, s: 7.5, px: 9, py: 10, per: [12, 28], ly: 550, lh: 26} : {H: 600, top: 60, ground: 440, s: 8, px: 9.5, py: 10.5, per: [12, 28], ly: 478, lh: 18};
            const S = fresh(P.H), cam = camAt(1, 0, house.y, 0, P.top);
            S.cam = cam; if (ph) only(S, () => false); atHome(S, cam); S.street = 0; S.board = 0; S.house = 1;
            LV.forEach((lv, j) => {
                const d = house.doors[j], cx = d.x + d.w / 2, x0 = cx - P.per[j] * P.px / 2;
                for (let i = 0; i < lv.n; i++) { const [x, y] = block(i, x0, P.ground, P.per[j], P.px, P.py); put(S, lv.i0 + i, x, y, P.s, 1, ID.lime[lv.i0 + i]); }
                S.labels.push(L(cx, P.ly, `${pct(lv.llm, lv.jobs)}%`, "num", {al: "center"}), L(cx, P.ly + P.lh, `${lv.count} name LLMs`, "small", {al: "center"}),
                    L(cx, P.ly + P.lh * 2, `${lv.n} drawn people`, "small", {al: "center"}));
            });
            S.labels.push(L(20, S.H - 8, `software jobs on the entry level page, five families; ${scale}`, "small"));
            return S;
        },
        // 6. The quiet door: embedded. Its people step out; one of them, for 5 of the 366 jobs, is lime, with a pen ring.
        6() {
            const P = ph ? {H: 560, gx: 16, ground: 430, s: 14, px: 16.5, py: 18, per: 7, x0: 380, nx: 345, ny: 150} : {H: 600, gx: 30, ground: 410, s: 14, px: 16.5, py: 18, per: 9, x0: 300, nx: 470, ny: 260};
            const S = fresh(P.H), cam = camAt(zoom, emb.x, emb.ground, P.gx, P.ground);
            S.cam = cam; only(S, (b) => b === emb); S.board = 0; atHome(S, cam);
            let limeAt: number[] | null = null;
            for (let i = emb.i0, k = 0; i < emb.i0 + emb.n; i++, k++) { const [x, y] = block(k, P.x0, P.ground, P.per, P.px, P.py); put(S, i, x, y, P.s, 1, ID.lime[i]); if (ID.lime[i]) limeAt = [x, y]; }
            S.lit[emb.k] = 0; S.open[emb.k] = 1; S.spill = {x: doorX(emb) * cam.s + cam.tx, y: P.ground, w: G.doorW * cam.s};
            if (limeAt) S.ring = {x: limeAt[0], y: limeAt[1] - P.s * 1.05, rx: P.s * .95, ry: P.s * 1.25};
            const e = fam("embedded"), quiet = `${pct(e.llm, e.jobs)}% name LLMs (${e.llm} of ${fmt(e.jobs)}):`;
            S.labels = [L(P.nx, P.ny, quiet, "hand", {rot: -2}), L(P.nx + 4, P.ny + (ph ? 32 : 24), ph ? "one person, ringed" : "one drawn person, ringed", "hand", {rot: -2}),
                L(P.x0, P.ground + (ph ? 36 : 26), `${emb.n} drawn people for ${fmt(e.jobs)} embedded jobs`, "small"),
                L(20, S.H - 8, `${fmt(e.jobs)} embedded jobs we could read this week; ${scale}`, "small")];
            const pin = pinned(emb, cam, P.gx, "qualinx", 2);
            S.anchors = {card: pin.card, chars: [walker(pin.walker, P.ground, "embedded-door")]};
            return S;
        },
        // 7. The street again, two people standing at two doors.
        7() {
            const S = states[2]();
            S.labels = S.labels.filter((l) => l.f !== "hand");
            S.anchors = {chars: [{x: doorX(ai) + (ph ? 22 : 14), y: ai.ground, s: ph ? 22 : 15, head: "curls", pose: "hip", slot: "end-ai"},
                {x: doorX(emb) + (ph ? 22 : 14), y: emb.ground, s: ph ? 22 : 15, head: "glasses", pose: "wave", slot: "end-embedded"}]};
            return S;
        },
    };
    const sizes = ph ? [G.s, G.s * zoom, 7.5, 12, 14] : [G.s, G.s * zoom, 8, 11, 14];
    return {W, N, ST, sizes, state: (k: number) => states[k]()};
}
export type Layout = ReturnType<typeof makeLayout>;
