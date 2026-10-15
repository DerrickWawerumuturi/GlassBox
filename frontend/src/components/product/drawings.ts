import {PRODUCT_PAGE} from "@/lib/site-copy";

/*
 * /product's drawn objects, as SVG strings for the server render (after the
 * approved prototype, docs/local/editorial-sprint/product-page/objects.js).
 * The hero: the wordmark's box O, open, its dot over the rim; a CV goes in and
 * the four pages come out, one small card each. The CV chapter: what happens
 * to a PDF, drawn as it is in the code today (the words: PRODUCT_PAGE.drawn).
 * Card fills are illustration colours; green still means "on your CV",
 * hatched grey "not yet", lime the one highlight, orange only the dot and the pen notes.
 * /about draws with the same hand (components/about/drawings.ts) and shows the CV drawing too.
 */

const D = PRODUCT_PAGE.drawn;
export const INK = "#22201c", GREEN = "#2f9e6e", LIME = "#d7ee4c";
const RED = "#d9534f";
export const FILL = {sky: "#bfe1fb", lav: "#d8cdfb", butter: "#ffe48f", mint: "#bdeadb", pink: "#ffc9d7", paper: "#fffdf9"};

export const t = (x: number, y: number, s: string | number, size: number, extra = "", font = "var(--essay)") =>
    `<text x="${x}" y="${y}" font-size="${size}" style="font-family:${font}" ${extra}>${s}</text>`;
const pen = (x: number, y: number, s: string, size: number, extra = "") =>
    t(x, y, s, size, `fill="var(--pen)" ${extra} transform="rotate(-4 ${x} ${y})"`, "var(--hand)");
const hatch = `<pattern id="pp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#ecebe6"/><path d="M0 0v5" stroke="#8d8a82" stroke-width="1.6"/></pattern>`;

// A card of 128 x 92, centred on 0,0, with its chapter number in a sticker at the corner.
const card = (fill: string, n: number, body: string) => `<rect x="-64" y="-46" width="128" height="92" rx="8" fill="${fill}" stroke="${INK}" stroke-width="2"/>${body}
    <circle cx="-60" cy="-42" r="12" fill="${FILL.paper}" stroke="${INK}" stroke-width="2"/>${t(-60, -37.5, n, 13, `text-anchor="middle" font-weight="800" fill="${INK}"`)}`;

const bars = card(FILL.sky, 1, `<rect x="-46" y="-22" width="88" height="10" rx="2" fill="${GREEN}" stroke="${INK}" stroke-width="1.4"/>
    <rect x="-46" y="-4" width="70" height="10" rx="2" fill="url(#pp-hatch)" stroke="${INK}" stroke-width="1.4"/>
    <rect x="-46" y="14" width="50" height="10" rx="2" fill="${GREEN}" stroke="${INK}" stroke-width="1.4"/>`);

const bridge = (y1: number, y2: number, w: number) =>
    `<path d="M-30 ${y1}C0 ${y1} 0 ${y2} 30 ${y2}" fill="none" stroke="#7d8f86" stroke-width="${w}" stroke-linecap="round" opacity=".8"/>`;
const skills = card(FILL.lav, 2, `${bridge(-20, -20, 5)}${bridge(-20, 4, 2.5)}${bridge(4, -20, 3.5)}${bridge(26, 4, 1.8)}${bridge(26, 26, 2.5)}
    ${[-20, 4, 26].map((y) => `<circle cx="-34" cy="${y}" r="6" fill="${GREEN}" stroke="${INK}" stroke-width="1.4"/>`).join("")}
    <circle cx="34" cy="-20" r="7" fill="${LIME}" stroke="${INK}" stroke-width="1.6"/>
    ${[4, 26].map((y) => `<circle cx="34" cy="${y}" r="6" fill="${FILL.paper}" stroke="${INK}" stroke-width="1.4" stroke-dasharray="2.4 2"/>`).join("")}`);

// A skill on a job: a tick when it's on the CV, a soft red minus when it isn't (Opportunities' own marks).
const chip = (x: number, y: number, w: number, ok: boolean) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="${ok ? "#d9f2e5" : "#fbe3e1"}" stroke="${ok ? GREEN : RED}" stroke-width="1.4"/>
    ${t(x + 6, y + 12.5, ok ? "✓" : "−", 12, `font-weight="800" fill="${ok ? GREEN : RED}"`)}<path d="M${x + 16} ${y + 8}h${w - 22}" stroke="${ok ? GREEN : RED}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
const job = card(FILL.butter, 3, `<rect x="-46" y="-26" width="16" height="16" rx="3" fill="#5b4fe0" stroke="${INK}" stroke-width="1.4"/>
    <path d="M-24 -21h56M-24 -12h34" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-24 -12h34" stroke="${FILL.butter}" stroke-width="1.4"/>
    ${chip(-46, 4, 40, true)}${chip(-2, 4, 40, true)}${chip(-46, 24, 46, false)}`);

const pill = (y: number, c: string) => `<path d="M-30 ${y}h34" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".7"/><rect x="12" y="${y - 6}" width="30" height="12" rx="6" fill="${c}" stroke="${INK}" stroke-width="1.2"/>`;
const apps = card(FILL.mint, 4, `<rect x="-40" y="-36" width="80" height="78" rx="4" fill="${FILL.paper}" stroke="${INK}" stroke-width="1.6"/>
    <rect x="-14" y="-42" width="28" height="12" rx="3" fill="#b9b2a6" stroke="${INK}" stroke-width="1.6"/>
    ${pill(-14, "#d9f2e5")}${pill(4, "#cfe9ff")}${pill(22, "#ffe8a3")}`);

const pdf = (fill: string) => `<path d="M-34 -44h48l20 20v68h-68z" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M14 -44v20h20" fill="#f1ece4" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    ${t(-24, -16, "CV.pdf", 13, `font-weight="800" fill="${INK}"`)}<path d="M-24 0h44M-24 12h36M-24 24h40" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`;
const cv = `${pdf(FILL.paper)}<circle cx="-34" cy="-42" r="12" fill="${FILL.pink}" stroke="${INK}" stroke-width="2"/>${t(-34, -37.5, 5, 13, `text-anchor="middle" font-weight="800" fill="${INK}"`)}`;

// The box O, open: a thick rim in the text colour, the orange dot rising over its top edge.
export const box = (x: number, y: number, w: number, h: number, s: number, bg = "var(--paper)") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * .24}" fill="${bg}" stroke="currentColor" stroke-width="${s}"/>
    <rect x="${x + s * .9}" y="${y - s * .55}" width="${w - s * 1.8}" height="${s * 1.1}" fill="${bg}"/>
    <circle cx="${x + w / 2}" cy="${y + h * .08}" r="${h * .2}" fill="var(--orange)"/>`;
export const at = (x: number, y: number, r: number, body: string) => `<g transform="translate(${x} ${y}) rotate(${r})">${body}</g>`;
export const puff = (d: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round" opacity=".55"/>`;

/** The hero: one PDF into the open box, the four pages out of it. */
export const heroBox = () => `<svg viewBox="0 0 600 440" style="color:var(--ink)" aria-hidden="true"><defs>${hatch}</defs>
    ${puff("M250 300C200 260 150 220 120 200")}${puff("M280 290C270 220 250 160 230 125")}${puff("M320 290C335 220 355 160 370 115")}${puff("M350 300C410 270 460 230 490 200")}
    ${box(220, 290, 160, 120, 18)}
    ${at(95, 165, -12, bars)}${at(220, 82, -5, skills)}${at(380, 68, 6, job)}${at(505, 160, 11, apps)}
    ${at(80, 360, -14, cv)}<path d="M128 372C160 382 185 376 206 362" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M196 356l12 5-8 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pen(470, 330, D.hero[0], 28)}${pen(470, 360, D.hero[1], 28)}</svg>`;

// What happens to a CV: in, read, deleted; only the skills stay, and only when signed in.
const arrow = (d: string, head: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="${head}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const skill = (y: number, s: string) => `<rect x="352" y="${y}" width="112" height="34" rx="6" fill="#d9f2e5" stroke="${GREEN}" stroke-width="2"/>${t(366, y + 23, `✓ ${s}`, 18, `font-weight="700" fill="#1d6b48"`)}`;
const shreds = [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${202 + i * 14} 318q${i % 2 ? 4 : -4} 14 0 28" stroke="${INK}" stroke-width="1.4" fill="${FILL.paper}" opacity=".9"/>`).join("");

/** The CV chapter's picture: its text to Groq, the skills kept when signed in, the PDF deleted. */
export const cvFlow = () => `<svg viewBox="0 0 480 430" style="color:var(--ink)" aria-hidden="true">
    <rect x="70" y="8" width="340" height="40" rx="20" fill="${FILL.paper}" stroke="currentColor" stroke-width="2"/>${t(240, 34, D.groq, 17, `text-anchor="middle" font-weight="600" fill="${INK}"`)}
    <path d="M240 50v62" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 6"/>
    ${at(70, 190, -6, pdf(FILL.paper))}${arrow("M120 196C145 196 160 192 176 186", "M166 179l11 7-9 9")}
    ${box(184, 130, 112, 96, 14, "var(--stage)")}
    ${arrow("M300 170C318 160 330 150 346 146", "M336 140l11 6-8 10")}${skill(118, "Python")}${skill(160, "SQL")}${skill(202, "React")}
    ${pen(408, 270, D.kept[0], 25, `text-anchor="middle"`)}${pen(408, 296, D.kept[1], 25, `text-anchor="middle"`)}
    ${arrow("M240 240v40", "M232 272l8 10 8-10")}
    <path d="M186 296h108l-10 70h-88z" fill="${FILL.paper}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><rect x="180" y="288" width="120" height="14" rx="4" fill="#b9b2a6" stroke="currentColor" stroke-width="2"/>${shreds}
    ${pen(240, 410, D.deleted, 27, `text-anchor="middle"`)}</svg>`;
