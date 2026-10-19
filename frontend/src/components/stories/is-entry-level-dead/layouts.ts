import {fmt} from "@/lib/market-page";
import {drawn, ELD, FINISHED, MID, ONE_IN, PER, share, TITLED} from "@/lib/stories/is-entry-level-dead";
import {LadderFrame, rnd} from "./marker";

/*
 * Where every drawn person stands in each step (2 to 8), and what else is on
 * the stage: the ladder's camera, the glow, the employer tally, the skill
 * cards, the weekly points, the labels (the prototype's layouts.js). The stage
 * is 640 x 680 units. One drawn person is 10 jobs on a wide screen and 25 on a
 * phone, rounded, so the counts come from the week's numbers
 * (lib/stories/is-entry-level-dead.ts): 282 / 109 / 63 on the steps, or 113 / 44 / 25.
 */

export const W = 640, H = 680;

export type Font = "small" | "body" | "num" | "big" | "hand";
export type Label = {x: number; y: number; t: string; f: Font; c: "ink" | "muted" | "pen"; al: CanvasTextAlign; box: boolean; rot: number};
export type Cam = {s: number; ax: number; ay: number};
export type WeekPoint = {x: number; pct: number; big: string; of: string; lab: string};
export type Aside = {x: number; y: number; w: number; h: number; dx: number; dy: number; rx: number; ry: number; title: string; sub: string};

/** A picture: every person's feet, size, alpha, shirt (0 plain, 1 lime with a backpack) and tag (0 none, 1 blank, 2 a number is stated); the scene's alphas. */
export interface State {
    X: Float32Array; Y: Float32Array; S: Float32Array; A: Float32Array; COL: Uint8Array; TAG: Uint8Array;
    cam: Cam; ladder: number; upper: number; ground: number; glow: number; tally: number; chips: number; band: number; aside: number;
    labels: Label[]; stagger: "slide" | "fall"; asideBox: Aside | null; weeks: WeekPoint[] | null; future: Array<{x: number; lab: string}> | null;
}
export const SCALARS = ["ladder", "upper", "ground", "glow", "tally", "chips", "band", "aside"] as const;

const L = (x: number, y: number, t: string, f: Font, o: {al?: CanvasTextAlign; box?: boolean; rot?: number} = {}): Label =>
    ({x, y, t, f, c: f === "hand" ? "pen" : f === "small" ? "muted" : "ink", al: o.al || "left", box: !!o.box, rot: o.rot || 0});
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});

export function makeLayout(ph: boolean) {
    const per = ph ? PER.phone : PER.wide, u = (n: number) => drawn(n, per);
    const SENIOR = u(ELD.senior), MIDN = u(MID), ENTRY = u(ELD.entry), INTERN = u(ELD.internships), TITLEDN = u(TITLED), YEARS = u(ELD.titled.stated);
    const N = SENIOR + MIDN + ENTRY;
    // A seeded shuffle gives every person a level, so the field is mixed and the fall onto the ladder really sorts.
    const r = rnd(19), order = Array.from({length: N}, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const LEVEL = new Uint8Array(N), RANK = new Int32Array(N), VAR = new Uint8Array(N), counts = [0, 0, 0];
    order.forEach((id, k) => { const lv = k < SENIOR ? 0 : k < SENIOR + MIDN ? 1 : 2; LEVEL[id] = lv; RANK[id] = counts[lv]++; VAR[id] = (id * 7 + 3) % 32; });
    // Entry level ranks: the internships first (all have an early career title), then the other early career titles, then entry level by years only.
    // The last titled ranks state a number of years; the very last is the aside, "Senior Back-End Engineer Intern".
    const isIntern = (rk: number) => rk < INTERN, isTitled = (rk: number) => rk < TITLEDN, statesYears = (rk: number) => rk >= TITLEDN - YEARS && rk < TITLEDN, ASIDE = TITLEDN - 1;

    // The ladder in stage units at the near camera; piles fill each step from the rung upward, `per` to a row.
    const G = ph ? {s: 20, px: 23, py: 37, per: 22, left: 72, right: 620, rail: 10, rungH: 9, zoom: 1.1, big: 30}
        : {s: 11.5, px: 13.2, py: 22, per: 32, left: 76, right: 526, rail: 12, rungH: 10, zoom: 1.3, big: 22};
    const hs = [SENIOR, MIDN, ENTRY].map((c) => Math.ceil(c / G.per) * G.py), gap = 14;
    const r1 = 612 - hs[2] - gap - G.rungH, r0 = r1 - hs[1] - gap - G.rungH;
    const LAD: LadderFrame & {cx: number} = {W, left: G.left, right: G.right, rail: G.rail, rungH: G.rungH, foot: 636, rungs: [r0, r1, 612], top: r0 - hs[0] - 22, cx: (G.left + G.right) / 2};
    const inner = G.right - G.left - G.rail * 2 - 4, x0 = G.left + G.rail + 2 + (inner - G.per * G.px) / 2;
    const NEAR: Cam = {s: 1, ax: LAD.cx, ay: 612}, ZOOM: Cam = {s: G.zoom, ax: 320, ay: ph ? 540 : 590}, RUNG: Cam = {s: G.zoom, ax: 320, ay: 590};
    const map = (cam: Cam, x: number, y: number) => [cam.ax + (x - LAD.cx) * cam.s, cam.ay + (y - LAD.rungs[2]) * cam.s];
    const pileXY = (rk: number, lv: number) => [x0 + (rk % G.per) * G.px + G.px / 2, LAD.rungs[lv] - Math.floor(rk / G.per) * G.py];
    const grp = (i: number, gx: number, n: number, px: number, py: number) => [gx + (i % n) * px + px / 2, 590 - Math.floor(i / n) * py];
    const scaleNote = `one drawn person is ${per} jobs, rounded`;

    const fresh = (): State => ({X: new Float32Array(N), Y: new Float32Array(N), S: new Float32Array(N), A: new Float32Array(N), COL: new Uint8Array(N), TAG: new Uint8Array(N),
        cam: {...NEAR}, ladder: 0, upper: 0, ground: 0, glow: 0, tally: 0, chips: 0, band: 0, aside: 0, labels: [], stagger: "slide", asideBox: null, weeks: null, future: null});
    const put = (S: State, i: number, x: number, y: number, s: number, a: number, col = 0, tag = 0) => { S.X[i] = x; S.Y[i] = y; S.S[i] = s; S.A[i] = a; S.COL[i] = col; S.TAG[i] = tag; };
    // Everyone on their step, seen through a camera; the people above the bottom step at alpha `dim`.
    const onLadder = (S: State, cam: Cam, dim: number) => {
        for (let i = 0; i < N; i++) { const lv = LEVEL[i], [lx, ly] = pileXY(RANK[i], lv), [x, y] = map(cam, lx, ly); put(S, i, x, y, G.s * cam.s, lv === 2 ? 1 : dim); }
    };
    // The titled people with name tags (step 6), where step 7 and 8 start from.
    const tagged = (S: State) => {
        const Q = ph ? {x0: 176, per: 8, px: 36, py: 60} : {x0: 200, per: 10, px: 26, py: 44}, s = G.big;
        let ax = 0, ay = 0;
        for (let i = 0; i < N; i++) {
            if (LEVEL[i] !== 2) continue;
            const rk = RANK[i];
            if (!isTitled(rk)) { S.A[i] = 0; continue; }
            const [x, y] = grp(rk, Q.x0, Q.per, Q.px, Q.py);
            put(S, i, x, y, s, 1, 0, statesYears(rk) ? 2 : 1);
            if (rk === ASIDE) { ax = x; ay = y - s * 1.26 + s * .25; }
        }
        return {x: ph ? 228 : 330, y: ph ? 190 : 250, w: ph ? 392 : 290, h: ph ? 110 : 82, dx: ax, dy: ay, rx: s * .3, ry: s * .22,
            title: ELD.aside.title, sub: `${ELD.aside.employer}. Asks for ${ELD.aside.years} years${ph ? "" : " of experience"}.`};
    };

    const states: Record<number, () => State> = {
        // 2. The field: everyone in a loose grid, nothing sorted yet.
        2() {
            const S = fresh(), F = ph ? {cols: 24, px: 24, py: 38, y0: 240} : {cols: 36, px: 16, py: 26, y0: 226};
            for (let i = 0; i < N; i++) put(S, i, 32 + (i % F.cols) * F.px + F.px / 2, F.y0 + Math.floor(i / F.cols) * F.py, G.s, 1);
            const jobs = `${fmt(ELD.jobs)} software jobs`;
            S.labels = ph ? [L(32, 86, jobs, "num"), L(32, 118, "advertised this week", "body"), L(32, 150, `${N} drawn people`, "small")]
                : [L(32, 128, `${jobs} advertised this week`, "body"), L(32, 152, `${N} drawn people`, "small")];
            S.labels.push(L(608, ph ? 600 : 596, `each one is ${per} jobs, rounded`, "hand", {al: "right", rot: -2}));
            return S;
        },
        // 3. The ladder: everyone sorts onto three steps. A man at the foot, pointing up (an overlay, people.ts).
        3() {
            const S = fresh(); onLadder(S, NEAR, 1); S.ladder = S.upper = S.ground = 1; S.stagger = "fall";
            const mid = (lv: number) => LAD.rungs[lv] - hs[lv] / 2, rx = LAD.right + 14, about = `about 1 in ${ONE_IN}`;
            if (ph) S.labels = [L(346, mid(0) - 6, fmt(ELD.senior), "num", {al: "center", box: true}), L(346, mid(0) + 24, "senior", "small", {al: "center", box: true}),
                L(346, mid(1) - 6, fmt(MID), "num", {al: "center", box: true}), L(346, mid(1) + 24, "mid level or not saying", "small", {al: "center", box: true}),
                L(72, 668, fmt(ELD.entry), "num"), L(150, 668, "entry level", "small"), L(620, 668, about, "hand", {al: "right", rot: -3})];
            else S.labels = [L(rx, mid(0) - 4, fmt(ELD.senior), "num"), L(rx, mid(0) + 18, "senior", "small"),
                L(rx, mid(1) - 4, fmt(MID), "num"), L(rx, mid(1) + 18, "mid level or\nnot saying", "small"),
                L(rx, mid(2) - 2, fmt(ELD.entry), "num"), L(rx, mid(2) + 20, "entry level", "small"), L(rx, 634, about, "hand", {rot: -3}), L(236, 672, scaleNote, "small")];
            return S;
        },
        // 4. Not dead: close up on the bottom step, lit; the steps above fade; one tally mark per employer under it.
        4() {
            const S = fresh(); onLadder(S, ZOOM, .14); S.cam = {...ZOOM}; S.ladder = S.upper = S.ground = 1; S.glow = 1; S.tally = 1;
            const emp = `${ELD.employers} employers`;
            // The step's label sits on a card: without one it would cross the faded crowd on the step above.
            S.labels = ph ? [L(44, 398, `the bottom step: ${ELD.entry} jobs`, "body", {box: true}), L(372, 600, emp, "body"), L(372, 626, "one mark each", "small")]
                : [L(44, 470, `the bottom step: ${ELD.entry} entry level jobs`, "body", {box: true}), L(360, 632, emp, "body"), L(360, 650, "one mark each", "small"), L(360, 672, scaleNote, "small")];
            return S;
        },
        // 5. The turn: the internships turn lime, put on backpacks and step to the right; the rest stay. Slips and two characters are overlays.
        5() {
            const S = fresh(); onLadder(S, RUNG, 0); S.cam = {...RUNG}; S.ladder = 1; S.ground = 1;
            const Q = ph ? {xL: 100, perL: 7, xR: 380, perR: 6, px: 36, py: 60} : {xL: 112, perL: 10, xR: 390, perR: 7, px: 26, py: 44};
            for (let i = 0; i < N; i++) {
                if (LEVEL[i] !== 2) continue;
                const rk = RANK[i], intern = isIntern(rk);
                const [x, y] = intern ? grp(rk, Q.xR, Q.perR, Q.px, Q.py) : grp(rk - INTERN, Q.xL, Q.perL, Q.px, Q.py);
                put(S, i, x, y, G.big, 1, intern ? 1 : 0);
            }
            const left = `${FINISHED} jobs`, ints = ELD.internships;
            S.labels = ph ? [L(100, 400, left, "num"), L(100, 424, "for everyone", "small"), L(100, 448, "who has finished", "small"), L(380, 400, String(ints), "num"),
                L(380, 424, "internships, for", "small"), L(380, 448, "people still studying", "small"), L(28, 100, `four of the ${ints} internships, as posted`, "small")]
                : [L(112, 325, left, "num"), L(112, 345, "for everyone who has already finished", "small"), L(390, 325, `${ints} internships`, "num"),
                    L(390, 345, "for people who are still studying", "small"), L(52, 178, `four of the ${ints}, as posted`, "small"), L(32, 672, scaleNote, "small")];
            return S;
        },
        // 6. The fine print: the people with an early career title put on name tags; most tags stay blank. One is pulled out.
        6() {
            const S = fresh(); onLadder(S, RUNG, 0); S.cam = {...RUNG}; S.ladder = 1; S.ground = 1; S.aside = 1; S.asideBox = tagged(S);
            const none = String(ELD.titled.unstated), some = `${ELD.titled.stated} state`;
            S.labels = ph ? [L(176, 405, none, "big"), L(176, 432, "state no number of years", "small"), L(440, 496, `${some}\na number`, "small")]
                : [L(200, 376, none, "big"), L(200, 400, "state no number of years", "small"), L(392, 444, `${some} a number`, "small"), L(32, 672, scaleNote, "small")];
            return S;
        },
        // 7. What they ask for: two small piles of skill cards on the step, 4 against 6. The people step out.
        7() {
            const S = fresh(); onLadder(S, RUNG, 0); S.cam = {...RUNG}; S.ladder = 1; S.ground = 1; tagged(S); S.A.fill(0); S.chips = 1;
            const sub = (x: number, a: string, b: string) => ph ? [L(x, 442, a, "small", {al: "center"}), L(x, 464, b, "small", {al: "center"})] : [L(x, 452, `${a} ${b}`, "small", {al: "center"})];
            const by = ph ? 404 : 430;
            S.labels = [L(190, by, String(ELD.medianSkills.entry), "big", {al: "center"}), ...sub(190, "required skills,", "median, entry level"),
                L(450, by, String(ELD.medianSkills.senior), "big", {al: "center"}), ...sub(450, "required skills,", "median, senior")];
            return S;
        },
        // 8. Three weekly points and two empty slots: too early to tell. No shaded range (review, 19 Oct).
        8() {
            const S = fresh(); onLadder(S, RUNG, 0); S.cam = {...RUNG}; S.ground = 1; tagged(S); S.A.fill(0); S.band = 1;
            S.weeks = ELD.weeks.map((w, i) => ({x: 100 + i * 120, pct: share(w), big: `${Math.round(share(w))}%`,
                of: `${w.entry} of${ph ? "\n" : " "}${fmt(w.jobs)} jobs`, lab: short(w.week)}));
            S.future = ELD.next.map((d, i) => ({x: 100 + (ELD.weeks.length + i) * 120, lab: short(d)}));
            S.labels = [L(100, ph ? 150 : 170, ph ? "entry level, as a share\nof the software jobs counted" : "entry level, as a share of the software jobs counted each week", "body"),
                L(ph ? 400 : 110, ph ? 296 : 300, "too early to tell", "hand", {rot: -2}), L(470, ph ? 632 : 626, "we count again every Monday", "hand", {al: "center", rot: -2})];
            return S;
        },
    };

    const tally = ph ? {x0: 24, per: 9, px: 36, y0: 566, py: 17, h: 12, sp: 5.5} : {x0: 24, per: 10, px: 32, y0: 612, py: 11.5, h: 9, sp: 4.4};
    return {N, state: (k: number) => states[k](), LAD, VAR, tally, glowY: ZOOM.ay - 40, sizes: [G.s, G.s * G.zoom, G.big]};
}
export type Layout = ReturnType<typeof makeLayout>;
