import {fam, pct} from "@/lib/stories/ai-on-your-cv";
import {rnd, wline, wrect} from "@/components/stories/is-entry-level-dead/marker";

/*
 * Do you need AI on your CV now?'s cover on the market hub, in the story's
 * look: the five doors its words name (AI, machine learning, software
 * engineering, DevOps, embedded) as drawn buildings on paper, each with 100
 * windows, one for every 100 of its jobs, the ones whose job names LLMs lit
 * lime from the bottom, and its share on a sign in Tilt Neon. The share image
 * draws it without the signs (`labels` false) and sets the words itself.
 */

const INK = "#1a1a1a", MUTED = "#5e5b54", FACES = ["#e9c3b4", "#c6d8bd", "#b9cde6", "#ead9a4", "#d2c4ea"];
const KEYS = ["ai", "machine_learning", "software_engineering", "devops", "embedded"];
const BW = 66, GAP = 12, X0 = 9, CW = 6, CH = 13, GF = 24, GROUND = 344;

export function aiStreet(labels: boolean): string {
    const r = rnd(5);
    const T = (x: number, y: number, s: number, t: string, ff: string, o: {w?: number; f?: string} = {}) =>
        `<text x="${x}" y="${y}" font-size="${s}" font-weight="${o.w ?? 400}" fill="${o.f ?? INK}" text-anchor="middle" style="font-family:${ff}">${t}</text>`;
    let g = `<path d="${wline([[0, GROUND + .5], [400, GROUND + .5]], r, .6)}" fill="none" stroke="#8d857a" stroke-width="1.4"/>`;
    KEYS.map(fam).forEach((f, b) => {
        const x = X0 + b * (BW + GAP), top = GROUND - GF - 10 * CH - 6, lit = pct(f.llm, f.jobs), cx = x + BW / 2;
        g += `<path d="${wrect(x, top, BW, GROUND - top, r, .9)}" fill="${FACES[b]}" stroke="${INK}" stroke-width="1.4"/>`;
        for (let i = 0; i < 100; i++) {
            const wx = x + 3 + (i % 10) * CW, wy = GROUND - GF - 3 - (Math.floor(i / 10) + 1) * CH;
            g += `<rect x="${wx + .6}" y="${wy + 1.5}" width="${CW - 1.4}" height="${CH - 3}" fill="${i < lit ? "#d7ee4c" : "#fbf8f3"}" stroke="${INK}" stroke-width=".5"/>`;
        }
        g += `<path d="${wrect(cx - 7, GROUND - GF + 2, 14, GF - 2, r, .5)}" fill="#6b5345" stroke="${INK}" stroke-width="1.1"/>`;
        if (!labels) return;
        const lines = f.sign, sy = top - 62;
        g += `<path d="${wrect(x - 3, sy, BW + 6, 56, r, .8)}" fill="#fffdf9" stroke="${INK}" stroke-width="1.2"/>`;
        lines.forEach((ln, j) => { g += T(cx, sy + (lines.length > 1 ? 15 + j * 13 : 22), lines.length > 1 ? 12 : 13.5, ln, "var(--font-tilt-neon), sans-serif"); });
        g += T(cx, sy + 50, 15, `${lit}%`, "var(--mono)", {w: 700});
    });
    if (labels) g += T(200, 378, 13, "lime windows: jobs naming LLMs, of every 100", "var(--mono)", {f: MUTED, w: 500});
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f7f3ef"/>${g}</svg>`;
}

export const aiOnYourCvCover = () => aiStreet(true);
