import {fmt} from "@/lib/market-page";
import {drawn, ELD, MID, ONE_IN, PER} from "@/lib/stories/is-entry-level-dead";
import {ladderParts, LIME, person, rnd} from "@/components/stories/is-entry-level-dead/marker";

/*
 * Is entry level dead?'s cover on the market hub, in the story's look: the
 * naive wooden ladder on paper with the week's software jobs piled on its
 * three steps, one drawn person to 25 jobs as on a phone, the bottom step in
 * lime, and the counts beside each step. Each person is one of a few drawn
 * symbols placed with <use>, so the hub's page stays light. Ids start with
 * "eldc": every cover shares the hub's page. The share image draws it without
 * the words (`labels` false) and sets them itself.
 */

const INK = "#1a1a1a", MUTED = "#5e5b54", ESSAY = "var(--essay), system-ui, sans-serif", HAND = "var(--hand), cursive";
const V = 12, S = 8.5, PERROW = 20, PX = 10.8, PY = 20;

/** One drawn person as a symbol, feet at its origin: plain shirts by seed, or lime. */
const symbol = (id: string, seed: number, lime: boolean) =>
    `<symbol id="${id}" overflow="visible">${person(0, 0, S, {seed, shirt: lime ? LIME : null}).map((p) =>
        `<path d="${p.d}" fill="${p.fill ?? "none"}" stroke-width="${p.lw < 1 ? .7 : .9}"/>`).join("")}</symbol>`;

export function entryLadder(labels: boolean): string {
    const counts = [ELD.senior, MID, ELD.entry].map((n) => drawn(n, PER.phone));
    const hs = counts.map((c) => Math.ceil(c / PERROW) * PY), gap = 14, rungH = 8, left = 34, right = 278, rail = 10;
    const r2 = 352, r1 = r2 - hs[2] - gap - rungH, r0 = r1 - hs[1] - gap - rungH, rungs = [r0, r1, r2];
    const L = {left, right, rail, rungH, foot: 374, rungs, top: r0 - hs[0] - 24, W: 400};
    const wood = ladderParts(L, rnd(2)).map((p) => p.cls === "wood" ? `<path d="${p.d}" fill="#d39a5f" stroke="${INK}" stroke-width="1.4"/>`
        : p.cls === "grain" ? `<path d="${p.d}" fill="none" stroke="#8a5a2b" stroke-width=".9" opacity=".7"/>`
            : p.cls === "knot" ? `<path d="${p.d}" fill="#8a5a2b"/>` : `<path d="${p.d}" fill="none" stroke="${MUTED}" stroke-width="1.1"/>`).join("");
    const x0 = left + rail + 2 + (right - left - rail * 2 - 4 - PERROW * PX) / 2;
    let people = "";
    counts.forEach((n, lv) => {
        for (let i = 0; i < n; i++) {
            const x = x0 + (i % PERROW) * PX + PX / 2, y = rungs[lv] - Math.floor(i / PERROW) * PY, v = (i * 7 + lv * 5 + 3) % V;
            people += `<use href="#eldc${lv === 2 ? "L" : "P"}${v % (lv === 2 ? 6 : V)}" x="${x.toFixed(1)}" y="${y}"/>`;
        }
    });
    const T = (x: number, y: number, s: number, t: string, o: {w?: number; f?: string; ff?: string; rot?: number} = {}) =>
        `<text x="${x}" y="${y}" font-size="${s}" font-weight="${o.w ?? 700}" fill="${o.f ?? INK}" style="font-family:${o.ff ?? ESSAY}"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${t}</text>`;
    const mid = (lv: number) => rungs[lv] - hs[lv] / 2, lx = right + 12;
    const words = labels ? T(lx, mid(0), 26, fmt(ELD.senior)) + T(lx, mid(0) + 17, 13, "senior", {w: 500, f: MUTED})
        + T(lx, mid(1), 26, fmt(MID)) + T(lx, mid(1) + 17, 13, "mid level or", {w: 500, f: MUTED}) + T(lx, mid(1) + 32, 13, "not saying", {w: 500, f: MUTED})
        + T(lx, mid(2) - 4, 26, fmt(ELD.entry)) + T(lx, mid(2) + 13, 13, "entry level", {w: 500, f: MUTED})
        + T(lx - 2, 396, 22, `about 1 in ${ONE_IN}`, {w: 600, f: "#e0471f", ff: HAND, rot: -3}) : "";
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>${Array.from({length: V}, (_, v) => symbol(`eldcP${v}`, v + 1, false)).join("")}${Array.from({length: 6}, (_, v) => symbol(`eldcL${v}`, v + 1, true)).join("")}</defs>
    <rect width="400" height="400" fill="#f7f3ef"/>
    ${wood}<g stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">${people}</g>${words}
  </svg>`;
}

export const isEntryLevelDeadCover = () => entryLadder(true);
