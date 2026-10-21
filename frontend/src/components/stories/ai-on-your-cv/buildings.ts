import {AIC, countOf, drawn, Family, fmt, MIN_SHARE, pct} from "@/lib/stories/ai-on-your-cv";
import {rnd} from "../is-entry-level-dead/marker";

/*
 * The street (the prototype's street.js): one building per job family, in
 * the data module's order (loudest ask for LLMs to the quietest), packed into
 * rows of the street. Every drawn person is 5 jobs, rounded; each stands in a
 * window of their family's building, and the ones whose job names LLMs wear
 * lime and light their window. Street coordinates are the overview's stage
 * units on a wide screen (720 x 600); the camera in states.ts zooms into them.
 * The phone packs the same buildings into narrower rows with bigger signs.
 */

export type Building = Family & {
    k: number; count: string; pct: string; n: number; lime: number; cols: number; w: number; h: number; signH: number; i0: number; pal: number;
    x: number; x1: number; row: number; ground: number; top: number;
};
export type Row = {ground: number; signH: number; maxH: number; bs: Building[]};
export type Level = {name: string; jobs: number; llm: number; n: number; lime: number; i0: number; count: string};

/** The two doors by level, and the software jobs behind each (a different base from the street). */
const LEVELS: Array<[string, {jobs: number; llm: number}]> = [["entry level", AIC.levels.entry], ["senior", AIC.levels.senior]];

export function makeStreet(ph: boolean) {
    // px, py: a window cell; s: the person in it; gf: the ground floor (door) height; cn, cc: units per character of a sign's name and count lines.
    const G = ph ? {W: 640, px: 6.5, py: 10.5, s: 5, wall: 3, gf: 22, doorW: 20, gap: 12, rowGap: 30, maxW: 600, x0: 20, top: 56, cn: 10, cc: 9, nameSz: 17, pctSz: 20, countSz: 15, zoom: 2.4}
        : {W: 720, px: 4.5, py: 7.5, s: 3.5, wall: 2.5, gf: 16, doorW: 12, gap: 10, rowGap: 14, maxW: 680, x0: 20, top: 30, cn: 6.4, cc: 6.2, nameSz: 11, pctSz: 13, countSz: 10, zoom: 2.2};
    // A sign: its name lines, its share on a line of its own (so no building changes width) and its count; a small family its count only.
    const signH = (lines: number, share: string) => lines * G.nameSz * 1.08 + (share ? G.pctSz * 1.08 : 0) + G.countSz * 1.3 + 10;
    const B: Building[] = [], rows: Row[] = [];
    let N = 0;
    AIC.families.forEach((f, k) => {
        const n = drawn(f.jobs), count = countOf(f), share = f.jobs < MIN_SHARE ? "" : `${pct(f.llm, f.jobs)}%`;
        let cols = Math.max(5, Math.min(40, Math.round(Math.sqrt(n * 2.5))));
        const need = Math.max(Math.max(...f.sign.map((l) => l.length)) * G.cn, count.length * G.cc) + 14;
        let w = cols * G.px + 2 * G.wall;
        if (need > w) { w = need; cols = Math.floor((w - 2 * G.wall) / G.px); }
        const h = G.gf + Math.max(1, Math.ceil(n / cols)) * G.py + 4;
        B.push({...f, k, count, pct: share, n, lime: drawn(f.llm), cols, w, h, signH: signH(f.sign.length, share), i0: N, pal: k % 6, x: 0, x1: 0, row: 0, ground: 0, top: 0});
        N += n;
    });
    // Pack into rows, left to right, in the sorted order; a row breaks when the next building would not fit.
    let x = G.x0, row: Row | null = null;
    for (const b of B) {
        if (!row || x + b.w > G.x0 + G.maxW) { row = {ground: 0, maxH: 0, signH: 0, bs: []}; rows.push(row); x = G.x0; }
        b.x = x; b.row = rows.length - 1; row.bs.push(b); row.maxH = Math.max(row.maxH, b.h); row.signH = Math.max(row.signH, b.signH); x += b.w + G.gap;
    }
    let yy = G.top;
    for (const r of rows) {
        r.ground = yy + r.signH + 6 + r.maxH;
        for (const b of r.bs) { b.ground = r.ground; b.top = r.ground - b.h; b.x1 = b.x + b.w; }
        yy = r.ground + G.rowGap;
    }
    const H = ph ? yy - G.rowGap + 80 : 600;
    // The notice board on a lamp post at the end of the last row; the two doors by level, far below the street (seen only in step 5).
    const last = rows[rows.length - 1], lb = last.bs[last.bs.length - 1];
    const board = {x: lb.x1 + 26, ground: last.ground, w: ph ? 110 : 72, h: ph ? 76 : 50, post: ph ? 100 : 70};
    const house = {y: 1200, doors: ph ? [{x: 110, w: 100, h: 150}, {x: 410, w: 100, h: 150}] : [{x: 70, w: 66, h: 96}, {x: 400, w: 66, h: 96}]};

    // Per person: family (100 + j for the level people), lime (the job names LLMs), lang (AI only: laptops), window cell.
    const total = N + LEVELS.reduce((a, [, l]) => a + drawn(l.jobs), 0);
    const ID = {fam: new Uint8Array(total), lime: new Uint8Array(total), lang: new Uint8Array(total), col: new Uint16Array(total), fl: new Uint16Array(total)};
    const shuffle = (n: number, seed: number) => {
        const r = rnd(seed), a = Array.from({length: n}, (_, i) => i);
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    };
    for (const b of B) {
        const order = shuffle(b.n, 101 + b.k);
        for (let i = 0; i < b.n; i++) { const id = b.i0 + i; ID.fam[id] = b.k; ID.col[id] = i % b.cols; ID.fl[id] = Math.floor(i / b.cols); ID.lime[id] = order[i] < b.lime ? 1 : 0; }
        if (b.key !== "ai") continue;
        // The AI people, by how many languages their ad names: 76, 39, 27 and 18 at one for 5.
        const o2 = shuffle(b.n, 7), edge: number[] = [];
        AIC.languages.reduce((acc, c) => { edge.push(acc + drawn(c)); return acc + drawn(c); }, 0);
        for (let i = 0; i < b.n; i++) { const rk = o2[i]; ID.lang[b.i0 + i] = rk < edge[0] ? 0 : rk < edge[1] ? 1 : rk < edge[2] ? 2 : 3; }
    }
    // The level people, appended after the street.
    const LV: Level[] = LEVELS.map(([name, {jobs, llm}], j) => {
        const n = drawn(jobs), lime = drawn(llm), i0 = N, order = shuffle(n, 55 + j);
        for (let i = 0; i < n; i++) { ID.fam[i0 + i] = 100 + j; ID.lime[i0 + i] = order[i] < lime ? 1 : 0; }
        N += n;
        return {name, jobs, llm, n, lime, i0, count: `${fmt(llm)} of ${fmt(jobs)}`};
    });
    const VAR = new Uint8Array(N).map((_, i) => (i * 7 + 3) % 32);
    const byKey = Object.fromEntries(B.map((b) => [b.key, b])) as Record<string, Building>;
    /** A person's feet in street coordinates: their window's sill. */
    const home = (id: number): [number, number] => {
        const b = B[ID.fam[id]];
        return [b.x + G.wall + ID.col[id] * G.px + G.px / 2, b.ground - G.gf - ID.fl[id] * G.py - 1.5];
    };
    return {G, W: G.W, H, B, rows, N, ID, VAR, LV, board, house, byKey, home};
}
export type Street = ReturnType<typeof makeStreet>;
