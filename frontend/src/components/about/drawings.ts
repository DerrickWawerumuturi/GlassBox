import {at, box, FILL as PRODUCT_FILL, GREEN, INK, LIME, puff, t} from "@/components/product/drawings";
import type {Drawing} from "@/components/product/Chapter";
import {ABOUT_PAGE} from "@/lib/site-copy";

/*
 * /about's drawn objects, as SVG strings for the server render (after the
 * approved prototype, docs/local/editorial-sprint/about-page/draw.js). Each
 * carries a claim the page makes: the wall of one ad, the four counting steps,
 * the map with no route, the stamps of what Glassbox is not, The Count still
 * sealed. The helpers and the CV drawing are /product's, so both pages draw
 * with the same hand. Card fills are illustration colours; green still means
 * "on your CV", hatched grey "not yet", lime the one highlight, orange only the
 * box O's dot, the needle and the pen notes. The prototype's dashed spots for a
 * character are left out until the ink cast is drawn.
 */

const D = ABOUT_PAGE.drawn;
const FILL = {...PRODUCT_FILL, peach: "#ffd2b0", grey: "#ecebe6"};
/** The hatching for "not yet", once per page (HATCH_DEFS): drawings on it only point at it. */
const HATCH = "url(#ab-hatch)";
export const HATCH_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="ab-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${FILL.grey}"/><path d="M0 0v5" stroke="#8d8a82" stroke-width="1.6"/></pattern></defs></svg>`;

const mono = (x: number, y: number, s: string, size: number, extra = "") => t(x, y, s, size, `fill="${INK}" letter-spacing=".08em" ${extra}`, "var(--mono)");
const pen = (x: number, y: number, s: string, size: number, extra = "", r = -4) =>
    t(x, y, s, size, `fill="var(--pen)" ${extra} transform="rotate(${r} ${x} ${y})"`, "var(--hand)");
const line = (d: string, w = 2.2, extra = "") =>
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const card = (x: number, y: number, w: number, h: number, fill: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
const sticker = (x: number, y: number, n: number, fill: string) =>
    `<circle cx="${x}" cy="${y}" r="12" fill="${fill}" stroke="${INK}" stroke-width="2"/>${t(x, y + 4.5, n, 13, `text-anchor="middle" font-weight="800" fill="${INK}"`)}`;
const svg = (w: number, h: number, body: string, vb = `0 0 ${w} ${h}`) => `<svg viewBox="${vb}" style="color:var(--ink)" aria-hidden="true">${body}</svg>`;

// Hero: one ad, twenty bricks of the same size, into the box; out comes a count with long and short bars.
const bricks = (x0: number, y0: number, cols: number, rows: number, bw: number, bh: number) => Array.from({length: cols * rows}, (_, i) => {
    const x = x0 + (i % cols) * (bw + 6), y = y0 + Math.floor(i / cols) * (bh + 6);
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${FILL.grey}" stroke="${INK}" stroke-width="1.3"/><path d="M${x + 7} ${y + bh / 2}h${bw - 14}" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
}).join("");
const ad = `${card(-100, -125, 200, 250, FILL.paper)}<rect x="-84" y="-108" width="22" height="22" rx="4" fill="#5b4fe0" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-54 -101h90M-54 -90h56" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${mono(-84, -62, D.hero.ad, 10, `font-weight="700"`)}${bricks(-84, -52, 4, 5, 37, 26)}`;
const counted = `${card(-100, -70, 200, 140, FILL.sky)}${mono(-84, -44, D.hero.counted, 10, `font-weight="700"`)}
    ${[150, 112, 70, 34, 14].map((w, i) => `<rect x="-84" y="${-32 + i * 19}" width="${w}" height="12" rx="2" fill="${i ? FILL.paper : LIME}" stroke="${INK}" stroke-width="1.4"/>`).join("")}`;
export const heroAbout = () => svg(600, 450, `${at(140, 175, -6, ad)}
    ${puff("M250 250C290 262 315 290 336 316")}${box(330, 318, 150, 112, 18)}
    ${puff("M404 304C404 270 418 240 440 222")}${at(462, 140, 5, counted)}
    ${pen(40, 352, D.hero.pen[0], 27)}${pen(48, 382, D.hero.pen[1], 27)}
    ${pen(395, 266, D.hero.pen[2], 25, `text-anchor="start"`, 3)}${pen(405, 292, D.hero.pen[3], 25, `text-anchor="start"`, 3)}`);

// 01: the wall. Twenty real skill names, one size each.
const NAMES = ["Python", "SQL", "React", "Docker", "AWS", "Kubernetes", "Go", "TypeScript", "Java", "Terraform", "Kafka", "GraphQL", "Redis",
    "Spark", "Linux", "Git", "CI/CD", "Rust", "Scala", "Figma"];
const wall = NAMES.map((n, i) => {
    const r = Math.floor(i / 4), x = 34 + (i % 4) * 112 + (r % 2 ? 40 : 0), y = 28 + r * 50;
    return `<rect x="${x}" y="${y}" width="106" height="44" rx="4" fill="${FILL.paper}" stroke="${INK}" stroke-width="2"/>${t(x + 53, y + 28, n, 16, `text-anchor="middle" font-weight="700" fill="${INK}"`)}`;
}).join("");
const wallPic = () => svg(540, 420, `${wall}${line("M20 284H520", 2.4)}
    ${pen(270, 336, D.why.pen[0], 26, `text-anchor="middle"`)}${pen(280, 372, D.why.pen[1], 26, `text-anchor="middle"`)}`);

// 02: the four steps, one small drawing each.
const S = D.steps;
const board = (x: number, y: number, r: number, fill: string) => at(x, y, r, `${card(-34, -40, 68, 80, fill)}<path d="M-22 -24h44M-22 -12h30M-22 0h38M-22 12h24M-22 24h34" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`);
const dial = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FILL.paper}" stroke="${INK}" stroke-width="2"/>
    ${[0, 90, 180, 270].map((a) => `<path d="M${cx} ${cy - r + 4}v10" stroke="${INK}" stroke-width="3" stroke-linecap="round" transform="rotate(${a} ${cx} ${cy})"/>`).join("")}
    ${mono(cx, cy + r - 12, S.day, 9, `text-anchor="middle"`)}<path d="M${cx} ${cy}l${r * .5} ${-r * .55}" stroke="var(--orange)" stroke-width="3.4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4" fill="${INK}"/>`;
const read = svg(260, 180, `${board(52, 92, -8, FILL.mint)}${board(86, 86, -2, FILL.butter)}${board(120, 92, 5, FILL.paper)}${dial(204, 82, 40)}`);

const jobCard = (x: number, y: number, r: number, fill: string) => at(x, y, r, `${card(-34, -22, 68, 44, fill)}<path d="M-24 -8h48M-24 4h30" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`);
const once = svg(260, 180, `${jobCard(56, 50, -5, FILL.sky)}${jobCard(56, 132, 4, FILL.lav)}${t(22, 98, S.sameJob, 9, `fill="currentColor" letter-spacing=".08em"`, "var(--mono)")}
    ${line("M96 54C130 58 146 76 160 86")}${line("M96 128C130 124 146 106 160 96")}${line("M150 79l12 8-10 10")}
    ${jobCard(206, 90, 0, FILL.paper)}${sticker(176, 70, 1, LIME)}`);

const tag = (x: number, y: number, s: string, w: number, fill: string = FILL.paper) => `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${fill}" stroke="${INK}" stroke-width="1.6"/>${t(x + w / 2, y + 16.5, s, 13, `text-anchor="middle" font-weight="700" fill="${INK}"`)}`;
// The fixed list as a sieve: real skill names fall through their slots, "custom backend" finds none.
const sieve = svg(260, 180, `${tag(14, 20, "Python", 72)}${tag(98, 20, "SQL", 52)}${tag(150, 8, "custom backend", 106, FILL.grey)}
    <rect x="10" y="70" width="240" height="30" rx="5" fill="${FILL.butter}" stroke="${INK}" stroke-width="2"/>
    <rect x="20" y="78" width="60" height="14" rx="3" fill="${FILL.paper}" stroke="${INK}" stroke-width="1.4"/><rect x="102" y="78" width="44" height="14" rx="3" fill="${FILL.paper}" stroke="${INK}" stroke-width="1.4"/>
    ${mono(164, 89, S.names, 9, `font-weight="700"`)}${line("M50 48v20M124 48v20", 2, `stroke-dasharray="3 5"`)}
    ${line("M204 34C206 48 214 56 226 56", 2)}${t(232, 62, "×", 22, `font-weight="700" fill="currentColor"`)}
    ${line("M62 104v18M126 104v18", 2, `stroke-dasharray="3 5"`)}${tag(26, 128, "Python", 72)}${tag(100, 128, "SQL", 52)}`);

const cal = `${card(-46, -54, 92, 108, FILL.paper)}<rect x="-46" y="-54" width="92" height="28" rx="7" fill="${FILL.pink}" stroke="${INK}" stroke-width="2"/>
    ${mono(0, -35, S.monday, 11, `text-anchor="middle" font-weight="700"`)}${t(0, 30, S.mon, 40, `text-anchor="middle" font-weight="800" fill="${INK}"`)}
    ${[-30, -12, 6, 24].map((x) => `<circle cx="${x + 3}" cy="-54" r="3.5" fill="${INK}"/>`).join("")}`;
const slip = `<path d="M-40 -60h80v112l-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6z" fill="${FILL.paper}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    ${mono(-30, -42, S.count, 9, `font-weight="700"`)}<path d="M-30 -30h60" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>
    ${[44, 30, 52, 22].map((w, i) => `<path d="M-30 ${-14 + i * 15}h${w}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`).join("")}`;
const monday = svg(260, 180, `${at(80, 92, -5, cal)}${at(186, 88, 6, slip)}`);

/** The four steps' drawings, in ABOUT_PAGE.steps order. */
export const STATIONS = [read, once, sieve, monday];

// 03: a map of skills. Green islands are on your CV, hatched ones are not yet; a pin, and no route.
const blob = (cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string) => `<path d="M${cx - rx} ${cy}C${cx - rx} ${cy - ry * 1.1} ${cx + rx * .5} ${cy - ry * 1.25} ${cx + rx} ${cy - ry * .2}C${cx + rx * 1.1} ${cy + ry * .9} ${cx - rx * .3} ${cy + ry * 1.3} ${cx - rx} ${cy}z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const isle = (cx: number, cy: number, rx: number, ry: number, name: string, have: boolean) => `${blob(cx, cy, rx, ry, have ? "#d9f2e5" : HATCH, have ? GREEN : INK)}
    <rect x="${cx - name.length * 4.6 - 12}" y="${cy - 12}" width="${name.length * 9.2 + 24}" height="24" rx="12" fill="${FILL.paper}" stroke="${have ? GREEN : INK}" stroke-width="1.6"/>
    ${t(cx, cy + 5, (have ? "✓ " : "") + name, 14, `text-anchor="middle" font-weight="700" fill="${have ? "#1d6b48" : INK}"`)}`;
const pin = (x: number, y: number) => `<path d="M${x} ${y}c-16-22-16-44 0-44s16 22 0 44z" fill="var(--orange)" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y - 30}" r="5.5" fill="${FILL.paper}"/>`;
// Framed tight round the map (the prototype's phone frame), now that no character stands beside it.
const mapPic = () => svg(540, 430, `<g transform="rotate(-2 230 190)">${card(20, 20, 420, 330, FILL.paper)}
    ${line("M160 22v326M300 22v326", 1.2, `stroke-dasharray="4 6" opacity=".35" style="color:${INK}"`)}
    ${isle(108, 96, 64, 40, "Python", true)}${isle(96, 236, 56, 38, "SQL", true)}${isle(226, 168, 52, 34, "React", true)}
    ${isle(360, 86, 52, 34, "Go", false)}${isle(352, 270, 66, 40, "Kubernetes", false)}${isle(236, 296, 44, 30, "AWS", false)}
    ${pin(158, 182)}<g transform="translate(400 46)"><path d="M0 -16l5 16-5 16-5-16z" fill="${INK}"/>${t(0, -21, "N", 11, `text-anchor="middle" font-weight="800" fill="${INK}"`)}</g></g>
    ${pen(190, 128, D["we-show"].here, 24, `text-anchor="start"`)}${line("M196 136C186 146 178 150 172 152", 1.8)}
    ${pen(36, 400, D["we-show"].pen, 27)}`, "10 6 446 412");

// 05: three stamps, each crossed out by the pen. A phone stacks them.
const stamp = (x: number, y: number, r: number, [word, note]: string[]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-76" y="-40" width="152" height="80" rx="10" fill="none" stroke="currentColor" stroke-width="3"/>
    <rect x="-68" y="-32" width="136" height="64" rx="6" fill="${FILL.paper}" stroke="${INK}" stroke-width="1.4"/>${mono(0, -10, D.not.notA, 10, `text-anchor="middle" font-weight="700"`)}
    ${t(0, 18, word, 21, `text-anchor="middle" font-weight="800" fill="${INK}" letter-spacing="-.01em"`)}</g>${pen(x, y + 76, note, 22, `text-anchor="middle"`, r / 2)}`;
const [board1, recruiter, coach] = D.not.stamps;
const stamps = () => svg(540, 370, `${stamp(100, 70, -5, board1)}${stamp(320, 90, 3, recruiter)}${stamp(210, 244, -2, coach)}`);
const stampsPhone = () => svg(330, 520, `${stamp(110, 60, -5, board1)}${stamp(216, 220, 3, recruiter)}${stamp(110, 384, -2, coach)}`);

// 06: The Count, still sealed: its number is hatched grey until it is out.
const countPic = () => svg(540, 380, `<g transform="rotate(-4 250 190)"><rect x="60" y="70" width="380" height="230" rx="8" fill="${FILL.paper}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M62 72L250 196L438 72" fill="none" stroke="${INK}" stroke-width="2"/><rect x="94" y="208" width="150" height="62" rx="6" fill="${HATCH}" stroke="${INK}" stroke-width="2"/>
    ${mono(268, 228, D.next.count, 14, `font-weight="700"`)}${t(268, 252, D.next.lines[0], 15, `font-weight="600" fill="${INK}"`)}${t(268, 272, D.next.lines[1], 15, `font-weight="600" fill="${INK}"`)}
    <circle cx="250" cy="196" r="24" fill="${FILL.peach}" stroke="${INK}" stroke-width="2"/>${box(236, 186, 28, 22, 4, FILL.peach)}</g>
    ${pen(330, 52, D.next.pen, 30, `text-anchor="middle"`)}${line("M330 62C320 90 300 108 280 120", 2)}${line("M286 108l-7 12 13 1")}`);

/** Each picture chapter's drawing, by chapter id. 04 draws the CV as /product does (Chapter's default). */
export const DRAWINGS: Record<string, Drawing | undefined> = {
    why: {svg: wallPic(), label: D.why.label},
    "we-show": {svg: mapPic(), label: D["we-show"].label},
    not: {svg: stamps(), phone: stampsPhone(), label: D.not.label},
    next: {svg: countPic(), label: D.next.label},
};

/** The four values, one small sign each, in ABOUT_PAGE.values order. */
export const VALUE_ICONS = [
    svg(80, 48, `${[8, 18, 28, 38].map((x) => line(`M${x} 8v32`, 3)).join("")}${line("M2 34L46 12", 3)}${line("M60 8v32", 3)}`),
    svg(80, 48, `<rect x="2" y="8" width="50" height="14" rx="3" fill="${GREEN}" stroke="${INK}" stroke-width="1.4"/><rect x="2" y="28" width="70" height="14" rx="3" fill="${HATCH}" stroke="${INK}" stroke-width="1.4"/>`),
    svg(80, 48, `<rect x="2" y="16" width="62" height="16" rx="3" fill="${LIME}" stroke="${INK}" stroke-width="1.4"/>`),
    svg(80, 48, box(14, 12, 44, 32, 6, "var(--card-bg)")),
];
