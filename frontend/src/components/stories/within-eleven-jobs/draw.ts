import {C, INK, iso, shade} from "./iso";

/*
 * One yard drawn for a stage `W` pixels wide (the prototype's yard.js and
 * crane.js): the dusk, the quay, the stacks, and a rail mounted gantry
 * spanning the row with a trolley that carries the cab, the cables, the
 * spreader and the lime plate that reads the bay. Bays sit on a diagonal of
 * the ground so the row runs level across the screen and no stack hides
 * another. The still parts are SVG strings; the moving ones (camera, trolley,
 * hook, cables, plate) are placed by the Yard component, so they can glide.
 */

export type Colour = "blue" | "maroon" | "slate" | "white" | "gap";
export interface YardBay {name: string; n: number; of: number; k: Colour; say: string;
    share?: number; employers?: number; senior?: number}
export interface YardConfig {id: string; title: string; label: string; bays: YardBay[]; ship?: boolean; hero?: boolean;
    /** A line after the fly over table's caption. */
    tableNote?: string}

const PER = 12, PITCH = 6.4, SHIP_PITCH = 10, MAXH = 640;
export const COL: Record<Colour, string> = {blue: "#3c6e9f", maroon: "#8e2d3b", slate: "#5c6670", white: "#f1f1ee", gap: "#cfc9c0"};
const PAINT: Record<Colour, string> = {blue: "#f1f1ee", maroon: "#f1f1ee", slate: "#f1f1ee", white: "#22201c", gap: "#22201c"};
const OW = "#eeece6", DK = "#3a3d46", LIME = "#d7ee4c";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]!);
const g = (v: number) => +v.toFixed(1);
/** Bay names as the port stencils them: capitals, IaC kept. */
export const stencil = (s: string) => s.toUpperCase().replace("IAC", "IaC");

// A far crane on the horizon, for the dusk.
const far = (x: number, h: number, col: string) => `<path d="M${x} ${h}v${-2.2}h1.6v2.2M${x + 4} ${h}v${-2.2}h1.6v2.2M${x - 1} ${h - 2.2}h9M${x + 2.5} ${h - 2.2}v-1.6h2v1.6" transform="scale(4)" fill="none" stroke="${col}" stroke-width=".4" stroke-linejoin="round"/>`;

/** One A frame leg: two struts meeting under the girder, a sill on the rail, a tie bar, foot stripes. */
function leg(u: number, X: number, Yb: number, Yt: number, hex: string) {
    const stripes = [0, 1, 2].map((k) => `<path d="M${g(X - 2.1 * u + k * .5 * u)} ${g(Yb - .3 * u)}l${g(.3 * u)} ${g(-1.1 * u)}" stroke="${INK}" stroke-width="${g(.22 * u)}"/>`).join("");
    return `<path d="M${g(X - 2.2 * u)} ${g(Yb)}L${g(X - .55 * u)} ${g(Yt)}H${g(X + .55 * u)}L${g(X + 2.2 * u)} ${g(Yb)}" fill="none" stroke="${hex}" stroke-width="${g(.62 * u)}" stroke-linejoin="round"/>`
        + `<path d="M${g(X - 1.45 * u)} ${g((Yb + Yt) / 2 + .2 * u)}H${g(X + 1.45 * u)}" stroke="${hex}" stroke-width="${g(.4 * u)}"/>`
        + `<path d="M${g(X - 2.75 * u)} ${g(Yb)}H${g(X + 2.75 * u)}" stroke="${INK}" stroke-width="${g(.42 * u)}" stroke-linecap="round"/>${stripes}`;
}

export function drawYard(cfg: YardConfig, W: number) {
    const {bays, id} = cfg, n = bays.length, p = cfg.ship ? SHIP_PITCH : PITCH, z0 = cfg.ship ? .8 : 0;
    const top = (b: YardBay) => z0 + Math.floor(b.n / PER) + (b.n % PER ? 1 : 0), Lmax = Math.max(...bays.map(top));
    const phone = W < 620, wide = cfg.ship ? 17.4 : 13.4, spanU = (n - 1) * 2 * p * C + 2 * wide + 7.2;
    const u = phone ? 9 : Math.max(9, Math.min(13, Math.floor((W - 16) / spanU), Math.floor((MAXH - 96) / (Lmax + 20.4))));
    const I = iso(u, id), pitchPx = 2 * p * C * u, worldW = Math.round(spanU * u);
    const Xl = 3.6 * u, X0 = Xl + wide * u, Xs = (i: number) => X0 + i * pitchPx, Xr = Xs(n - 1) + wide * u;
    const Yb = Lmax * u + 12.5 * u + 62, Ysp = Yb - 9.5 * u - Lmax * u - 54, Hpx = Math.round(Yb + 7.9 * u + 34);
    const len = bays.map((b) => Yb - 6.4 * u - top(b) * u - 54 - Ysp);
    // Ships moor in front of the quay, so their yard's rails and quay wall sit behind them.
    const Ygnd = Yb - 9.4 * u, Yq = cfg.ship ? Yb - 7.4 * u : Yb + 3.2 * u + 34;
    const Yback = cfg.ship ? Yb - 8.7 * u : Yb - 6.9 * u, Yfront = cfg.ship ? Yb - 7.9 * u : Yb + .8 * u;

    let ripples = "";
    for (let y = Yq + 1.6 * u; y < Hpx; y += 1.1 * u) for (let x = (y * 7) % 40; x < W; x += 54) ripples += `M${g(x)} ${g(y)}h${g(1.4 * u)}`;
    const cabX = X0 + 1.1 * u, cabY = Ysp + .1 * u;
    const defs = `<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3bce0"/><stop offset="1" stop-color="#f0dccf"/></linearGradient>${I.patterns(COL)}</defs>`;
    const sky = `${defs}<rect width="${W}" height="${Hpx}" fill="url(#${id}-sky)"/><circle cx="${g(W * .8)}" cy="${g(Ygnd - 3.4 * u)}" r="${g(2.1 * u)}" fill="#f6e3a6"/>
        <g transform="translate(0 ${g(Ygnd)})">${[.06, .3, .62, .9].map((k) => far(k * W / 4 - 4, 0, "#a9a2c6")).join("")}</g>
        <rect y="${g(Ygnd)}" width="${W}" height="${g(Yq - Ygnd)}" fill="#c9c4bb"/>
        <path d="M0 ${g(Yq - .55 * u)}H${W}" stroke="#f1f1ee" stroke-width="2" stroke-dasharray="${g(2 * u)} ${g(u)}" opacity=".85"/>
        <rect y="${g(Yq)}" width="${W}" height="${g(.7 * u)}" fill="#8e8a80"/><path d="M0 ${g(Yq)}H${W}" stroke="#aaa69c" stroke-width="1.5"/>
        <rect y="${g(Yq + .7 * u)}" width="${W}" height="${g(Hpx - Yq)}" fill="#1f4f8f"/><path d="${ripples}" stroke="#3a70b5" stroke-width="1.2" stroke-linecap="round"/>`;
    const rail = (Y: number) => `<path d="M0 ${g(Y - .18 * u)}H${worldW}M0 ${g(Y + .18 * u)}H${worldW}" stroke="#55514a" stroke-width="1.5"/>`;
    const scene = bays.map((b, i) => (cfg.ship ? I.hull(i * p, -i * p) : "") + I.stack(i * p, -i * p, z0, b.n, b.k, {hatched: b.k === "gap", paint: PAINT[b.k]})).join("");
    let bollards = "";
    for (let x = 2.2 * u; x < worldW; x += 11 * u) bollards += `<rect x="${g(x)}" y="${g(Yq - .3 * u)}" width="${g(.7 * u)}" height="${g(.9 * u)}" rx="${g(.2 * u)}" fill="#3a3d46"/>`;
    const labels = bays.map((b, i) => `<text class="bay-name" x="${g(Xs(i))}" y="${g(Yb + 2 * u + 13)}" text-anchor="middle">${esc(stencil(b.name))}</text><text class="bay-sub" x="${g(Xs(i))}" y="${g(Yb + 2 * u + 29)}" text-anchor="middle">${b.n} of ${b.of}</text>`).join("");
    const cue = cfg.hero && n > 1 ? `<text class="pen" x="${g(Xs(1) - 3.6 * u)}" y="${g(Ysp + 5.4 * u)}">← drive ${phone ? "me" : "the crane"}</text>` : "";
    const backLegs = leg(u, Xl, Yback, Ysp - 1.6 * u, shade(OW, .84)) + leg(u, Xr, Yback, Ysp - 1.6 * u, shade(OW, .84));
    const under = `${rail(Yback)}${rail(Yfront)}${backLegs}<g transform="translate(${g(X0 - .6 * C * u)} ${g(Yb - 5.4 * u)})">${scene}</g>${bollards}${labels}${cue}`;

    const bx0 = Xl - 3 * u, bw = Xr - Xl + 6 * u;
    const bridge = `<rect x="${g(bx0)}" y="${g(Ysp - 2 * u)}" width="${g(bw)}" height="${g(.8 * u)}" fill="${shade(OW, 1.05)}" stroke="${INK}" stroke-width=".8"/>`
        + `<rect x="${g(bx0)}" y="${g(Ysp - 1.2 * u)}" width="${g(bw)}" height="${g(1.2 * u)}" fill="${OW}" stroke="${INK}" stroke-width=".8"/>`
        + `<path d="M${g(bx0 + 1.5 * u)} ${g(Ysp - .6 * u)}H${g(bx0 + bw - 1.5 * u)}" stroke="${INK}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="${g(3 * u)} ${g(u)}"/>`
        + [bx0, bx0 + bw - 1.2 * u].map((x) => [0, 1, 2].map((k) => `<path d="M${g(x + k * .45 * u)} ${g(Ysp)}l${g(.35 * u)} ${g(-1.2 * u)}" stroke="${INK}" stroke-width="${g(.2 * u)}"/>`).join("")).join("");
    const craneFront = leg(u, Xl, Yfront, Ysp, OW) + leg(u, Xr, Yfront, Ysp, OW) + bridge;

    // The trolley: its carriage, the cab hanging beside the cables, the spreader and plate.
    const carriage = `<rect x="${g(X0 - 1.5 * u)}" y="${g(Ysp - 3 * u)}" width="${g(3 * u)}" height="${g(1.1 * u)}" rx="2" fill="${DK}"/>`
        + `<rect x="${g(X0 - 1.1 * u)}" y="${g(Ysp - 3.2 * u)}" width="${g(.5 * u)}" height="${g(.3 * u)}" fill="${DK}"/><rect x="${g(X0 + .6 * u)}" y="${g(Ysp - 3.2 * u)}" width="${g(.5 * u)}" height="${g(.3 * u)}" fill="${DK}"/>`;
    const cab = `<rect x="${g(cabX)}" y="${g(cabY)}" width="${g(2.6 * u)}" height="${g(2.5 * u)}" rx="2" fill="${OW}" stroke="${INK}" stroke-width=".8"/>`
        + `<rect x="${g(cabX + .2 * u)}" y="${g(cabY + .4 * u)}" width="${g(2.2 * u)}" height="${g(1.3 * u)}" fill="#2a2e38"/>`
        + `<path d="M${g(cabX)} ${g(cabY + 2.05 * u)}H${g(cabX + 2.6 * u)}" stroke="${INK}" stroke-width="${g(.2 * u)}"/>`;
    const py = Ysp + .5 * u + 8;
    const spreader = `<rect x="${g(X0 - 1.6 * u)}" y="${g(Ysp)}" width="${g(3.2 * u)}" height="${g(.5 * u)}" rx="1.5" fill="${DK}"/>`
        + `<path d="M${g(X0 - 1.3 * u)} ${g(Ysp + .5 * u)}L${g(X0 - 66)} ${g(py)}M${g(X0 + 1.3 * u)} ${g(Ysp + .5 * u)}L${g(X0 + 66)} ${g(py)}" stroke="${DK}" stroke-width="1.2"/>`
        + `<rect x="${g(X0 - 70)}" y="${g(py)}" width="140" height="46" rx="4" fill="${LIME}" stroke="${INK}" stroke-width="1.2"/>`;
    const note = cfg.hero ? `<text class="pen" x="14" y="${g(Hpx - 13)}">jobs, not the Docker kind</text>` : "";

    return {
        u, Hpx, X0, pitchPx, worldW, len, Xs,
        svg: {sky, under, craneFront, carriage, cab, spreader, note},
        cables: [g(X0 - .6 * u - .7), g(X0 + .6 * u - .7)], Ysp: g(Ysp),
        plate: {x: g(X0), name: g(py + 19), n: g(py + 37)},
    };
}
export type Drawn = ReturnType<typeof drawYard>;
