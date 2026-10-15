import {fmt} from "@/lib/market-page";

/*
 * The hub's own covers (the prototype's market-home/covers.js): the years
 * page's rail of tags, drawn from the live count; how we count, tally marks
 * under a glass; and the CV card's picture. Each story's cover is beside its
 * story (components/stories/covers). SVG strings, decorative: the card's text
 * says the same number in words. Ids start with the cover's key.
 */

const INK = "#22201c";
const svg = (bg: string, inner: string, h = 400) =>
    `<svg viewBox="0 0 400 ${h}" aria-hidden="true" focusable="false"><rect width="400" height="${h}" fill="${bg}"/>${inner}</svg>`;
const T = (x: number, y: number, s: number, txt: string, o: {a?: string; w?: number; f?: string; ff?: string; t?: string} = {}) =>
    `<text x="${x}" y="${y}" font-size="${s}"${o.a ? ` text-anchor="${o.a}"` : ""} font-weight="${o.w || 700}" fill="${o.f || INK}" style="font-family:${o.ff || "var(--essay)"}"${o.t ? ` transform="${o.t}"` : ""}>${txt}</text>`;

/**
 * Night rail: fourteen tags for the software jobs with an early career title;
 * lime ones for the share that give a number (rounded to fourteenths), the
 * rest hatched: no number.
 */
export function yearsCover(unstated: number, total: number): string {
    const tilt = [-4, 3, -2, 5, -3, 2, -5], lime = Math.round((14 * (total - unstated)) / total);
    // The lime tags start at the second row's fifth tag, where the prototype placed its one, and run on from there.
    const on = new Set(Array.from({length: lime}, (_, j) => (11 + j) % 14));
    const lit = (row: number, k: number) => on.has(row * 7 + k);
    const tag = (x: number, y: number, on: boolean, k: number) => `<g transform="rotate(${tilt[k % 7]} ${x + 20} ${y - 22})"><path d="M${x + 20} ${y - 22}V${y + 6}" stroke="#b8afa3" stroke-width="1.5"/><path d="M${x + 9} ${y}H${x + 31}L${x + 40} ${y + 9}V${y + 58}Q${x + 40} ${y + 62} ${x + 36} ${y + 62}H${x + 4}Q${x} ${y + 62} ${x} ${y + 58}V${y + 9}Z" fill="#f4efe6"/><circle cx="${x + 20}" cy="${y + 9}" r="3.2" fill="#2b2723"/><rect x="${x + 7}" y="${y + 28}" width="26" height="14" rx="2" fill="${on ? "#d7ee4c" : "url(#yearsHatch)"}" stroke="${on ? "none" : "#b5ab9d"}" stroke-width="1.2"/></g>`;
    let tags = "";
    for (let row = 0; row < 2; row++) for (let k = 0; k < 7; k++) tags += tag(24 + k * 52, 96 + row * 128, lit(row, k), k + row * 3);
    return svg("#2b2723", `<defs><pattern id="yearsHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="6" fill="#b5ab9d"/></pattern></defs>
      <path d="M14 74H386M14 202H386" stroke="#5b544b" stroke-width="4" stroke-linecap="round"/>${tags}
      ${T(200, 354, 32, `${fmt(unstated)} of ${fmt(total)} give no number`, {a: "middle", w: 500, f: "#efe8df", ff: "var(--hand)"})}`);
}

/** Pencil on graph paper: tally marks under a magnifying glass. */
export function methodCover(): string {
    let tally = "";
    for (let g = 0; g < 9; g++) {
        const x = 42 + (g % 3) * 72, y = 64 + Math.floor(g / 3) * 82;
        for (let k = 0; k < 4; k++) tally += `M${x + k * 11} ${y}l${k % 2 ? 1 : -1} 44`;
        tally += `M${x - 6} ${y + 34}L${x + 44} ${y + 8}`;
    }
    return svg("#f8f6f0", `<defs><pattern id="methodGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#7fa7d9" stroke-width=".8" opacity=".5"/></pattern>
      <filter id="methodPencil"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.4"/></filter></defs><rect width="400" height="400" fill="url(#methodGrid)"/>
      <g filter="url(#methodPencil)" stroke="#4a4744" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="${tally}"/>
        <circle cx="256" cy="196" r="76" stroke-width="5" fill="#ffffff" fill-opacity=".5"/><path d="M310 250L358 298" stroke-width="15"/></g>
      ${T(34, 362, 32, "every job counted once", {w: 500, f: "#4a4744", ff: "var(--hand)", t: "rotate(-3 34 362)"})}`);
}

/** The CV card's picture: a CV, its skills marked in green ("on your CV"). */
export function cvPicture(): string {
    return svg("transparent", `<g transform="translate(-62 0) rotate(7 262 120)"><rect x="210" y="40" width="104" height="138" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/>${T(226, 68, 16, "CV", {w: 800})}
        <rect x="226" y="80" width="70" height="5" fill="#cfc8bb"/><rect x="226" y="94" width="56" height="5" fill="#cfc8bb"/><rect x="224" y="106" width="44" height="11" fill="#5fd39a" opacity=".8"/><rect x="226" y="124" width="64" height="5" fill="#cfc8bb"/><rect x="224" y="136" width="36" height="11" fill="#5fd39a" opacity=".8"/><rect x="226" y="154" width="58" height="5" fill="#cfc8bb"/></g>`, 200);
}
