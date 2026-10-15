import {fmt} from "@/lib/market-page";
import {storyWeek} from "@/lib/stories/story";
import {ELEVEN, WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";

/*
 * Within eleven jobs' cover on the market hub (the prototype's cover.js):
 * the three stacks at the top under the gantry, one container per job, each
 * count painted on its end, from the week's numbers. Its own small iso drawer;
 * ids start with "devops": every cover shares the hub's page.
 */

const C = 0.8660254, S = 0.5, LEN = 2.4, u = 10, INK = "#22201c";
const STENCIL = "var(--font-allerta-stencil), var(--font-space-grotesk), sans-serif";
const COLOURS = ["#3c6e9f", "#8e2d3b", "#5c6670"];
const f = (v: number) => +v.toFixed(2);
const shade = (hex: string, k: number) => "#" + [1, 3, 5].map((i) =>
    Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, "0")).join("");
const P = (x: number, y: number, z: number) => [f((x - y) * C * u), f((x + y) * S * u - z * u)];
const tf = (x: number, y: number, z: number, a: number, b: number, c: number, d: number) => {
    const [X, Y] = P(x, y, z);
    return `matrix(${a} ${b} ${c} ${d} ${X} ${Y})`;
};
const E = `fill="none" stroke="${INK}" stroke-opacity=".42"`, w = f(LEN * u);
const pat = (k: string, hex: string) => `<pattern id="devops-e-${k}" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><rect width="${u}" height="${u}" fill="${hex}"/><path d="M${u / 2} 1.5V${u - 1.5}" ${E}/><rect width="${u}" height="${u}" ${E}/></pattern>
    <pattern id="devops-s-${k}" width="${w}" height="${u}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${u}" fill="${shade(hex, .8)}"/><rect width="${w}" height="${u}" ${E}/></pattern>
    <pattern id="devops-t-${k}" width="${u}" height="${w}" patternUnits="userSpaceOnUse"><rect width="${u}" height="${w}" fill="${shade(hex, 1.14)}"/><rect width="${u}" height="${w}" ${E}/></pattern>`;
const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: string) =>
    `<g transform="${tf(x0, y0, z1, C, S, -C, S)}"><rect width="${f((x1 - x0) * u)}" height="${f((y1 - y0) * u)}" fill="url(#devops-t-${k})"/></g>`
    + `<g transform="${tf(x0, y1, z1, C, S, 0, 1)}"><rect width="${f((x1 - x0) * u)}" height="${f((z1 - z0) * u)}" fill="url(#devops-e-${k})"/></g>`
    + `<g transform="${tf(x1, y1, z1, C, -S, 0, 1)}"><rect width="${f((y1 - y0) * u)}" height="${f((z1 - z0) * u)}" fill="url(#devops-s-${k})"/></g>`;
// A stack of n in a bay 6 across and 2 deep, the front row of the top layer filled first.
const stack = (bx: number, by: number, n: number, k: string) => {
    const L = Math.floor(n / 12), m = n % 12, front = Math.min(m, 6), back = m - front;
    let s = skin(bx, bx + 6, by, by + 4.8, 0, L, k);
    s += `<g transform="${tf(bx, by + 4.8, L, C, S, 0, 1)}"><text x="${3 * u}" y="${f((L - .5) * u)}" font-size="${2.3 * u}" text-anchor="middle" fill="#f1f1ee" opacity=".92" style="font-family:${STENCIL}">${n}</text></g>`;
    for (let i = 0; i < back; i++) s += skin(bx + i, bx + i + 1, by, by + LEN, L, L + 1, k);
    for (let i = 0; i < front; i++) s += skin(bx + i, bx + i + 1, by + LEN, by + 4.8, L, L + 1, k);
    return s;
};
const label = (x: number, y: number, name: string, n: number) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12.5" fill="#2b2a26" style="font-family:${STENCIL}">${name}</text>`
    + `<text x="${x}" y="${y + 15}" text-anchor="middle" font-size="12" font-weight="700" fill="#4a463f" style="font-family:var(--mono)">${fmt(n)} of ${fmt(ELEVEN.readable)}</text>`;

export function withinElevenJobsCover(): string {
    const bays = ELEVEN.top.map((t, i) => ({name: t.name, n: t.jobs, hex: COLOURS[i]})), p = 6.4;
    const ox = 73, oy = 308, Xc = (i: number) => ox + i * 2 * p * C * u; // bay i's centre on screen
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false"><defs><linearGradient id="devops-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3bce0"/><stop offset="1" stop-color="#f0dccf"/></linearGradient>${bays.map((b) => pat(b.hex.slice(1), b.hex)).join("")}</defs>
      <rect width="400" height="400" fill="url(#devops-sky)"/><circle cx="330" cy="236" r="22" fill="#f6e3a6"/>
      <rect y="250" width="400" height="98" fill="#c9c4bb"/><rect y="348" width="400" height="7" fill="#8e8a80"/><rect y="355" width="400" height="45" fill="#1f4f8f"/>
      <path d="M0 341H400" stroke="#f1f1ee" stroke-width="2" stroke-dasharray="20 10" opacity=".85"/>
      <path d="M22 28H378" stroke="#eeece6" stroke-width="14"/><path d="M22 28H378" stroke="${INK}" stroke-width="1" fill="none" transform="translate(0 7)"/><path d="M22 28H378" stroke="${INK}" stroke-width="1" transform="translate(0 -7)"/>
      <path d="M14 250L28 36M44 250L30 36M386 250L372 36M356 250L370 36" stroke="#eeece6" stroke-width="6" stroke-linecap="round"/>
      <g transform="translate(${f(ox - .6 * C * u)} ${f(oy - 5.4 * u)})">${bays.map((b, i) => stack(i * p, -i * p, b.n, b.hex.slice(1))).join("")}</g>
      ${bays.map((b, i) => label(f(Xc(i)), 326, b.name.toUpperCase().replace("IAC", "IaC"), b.n)).join("")}
      <text x="200" y="384" text-anchor="middle" font-size="13" fill="#f1f1ee" style="font-family:var(--mono)">of ${fmt(ELEVEN.readable)} DevOps jobs · week of ${storyWeek(WITHIN_ELEVEN_JOBS)}</text></svg>`;
}
