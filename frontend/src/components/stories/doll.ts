/*
 * The stories' dolls (the two years essay's dolls.js, typed): big heads on
 * small hand drawn bodies, in colour. Skin, hair and shirt vary the cast,
 * seeded by `i`, so a doll always looks the same; the tool it holds and its
 * name tag are what it says. An SVG string, decorative (aria-hidden), for a
 * figure or a cover to place.
 */

type Rng = () => number;
const rng = (seed: number): Rng => () =>
    ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0) / 4294967296;
const pick = <T,>(r: Rng, a: readonly T[]) => a[Math.floor(r() * a.length)];

const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3a21", "#a86b3c"];
const HAIR = ["#1d1a17", "#3b2416", "#6b3f1f", "#b5651d", "#d9b26a", "#8a8a8a", "#2f4f8f"];
const SHIRT = ["#4f7cff", "#ff8fab", "#2bb3a3", "#ffc94d", "#9b7bff", "#ff9f5a", "#58c26b", "#3a3a4a"];
const INK = "#22201c";

const hair = (k: number, c: string) => [
    `<path d="M14 20c0-10 7-15 16-15s16 5 16 15c-3-5-8-7-16-7s-13 2-16 7z" fill="${c}"/>`,
    `<path d="M13 24C12 9 21 4 30 4s18 5 17 20l1 18c-3 2-6 2-8 0V22c-3-4-6-6-10-6s-7 2-10 6v20c-2 2-5 2-8 0z" fill="${c}"/>`,
    `<g fill="${c}"><circle cx="16" cy="17" r="6"/><circle cx="23" cy="10" r="6.5"/><circle cx="31" cy="8" r="6.5"/><circle cx="39" cy="11" r="6"/><circle cx="44" cy="18" r="5.5"/></g>`,
    `<path d="M14 21c0-10 7-16 16-16s16 6 16 16c-5-3-6-8-6-8s-6 5-20 6c-2 0-4 1-6 2z" fill="${c}"/><circle cx="30" cy="4" r="5" fill="${c}"/>`,
    `<path d="M14 22c-1-11 7-17 16-17 10 0 17 6 16 17-4-6-9-9-16-9s-12 3-16 9z" fill="${c}"/><path d="M42 14c5 2 7 8 6 14" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    `<path d="M15 18c2-8 8-12 15-12s13 4 15 12" stroke="${c}" stroke-width="3" fill="none"/>`,
][k];

const TOOL: Record<string, (x: number, y: number) => string> = {
    general: (x, y) => `<rect x="${x - 11}" y="${y - 7}" width="22" height="14" rx="1.5" fill="#e8eef7" stroke="${INK}" stroke-width="1.3"/><path d="M${x - 13} ${y + 7}h26l-2 2.5h-22z" fill="#cfd6e0" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`,
    web: (x, y) => `<rect x="${x - 11}" y="${y - 8}" width="22" height="16" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="1.3"/><path d="M${x - 11} ${y - 4}h22" stroke="${INK}" stroke-width="1.1"/><circle cx="${x - 8.5}" cy="${y - 6}" r=".8" fill="#ff5f57"/><circle cx="${x - 6}" cy="${y - 6}" r=".8" fill="#febc2e"/>`,
    mobile: (x, y) => `<rect x="${x - 5.5}" y="${y - 9}" width="11" height="18" rx="2.2" fill="#2a2a33" stroke="${INK}" stroke-width="1.2"/><rect x="${x - 4}" y="${y - 6.5}" width="8" height="12" rx=".8" fill="#9fd3ff"/>`,
    data: (x, y) => `<path d="M${x - 8} ${y - 6}v12c0 2 3.6 3 8 3s8-1 8-3v-12" fill="#ffe08a" stroke="${INK}" stroke-width="1.2"/><ellipse cx="${x}" cy="${y - 6}" rx="8" ry="2.8" fill="#fff3c4" stroke="${INK}" stroke-width="1.2"/><path d="M${x - 8} ${y}c0 2 3.6 3 8 3s8-1 8-3" fill="none" stroke="${INK}" stroke-width="1"/>`,
    ai: (x, y) => `<path d="M${x} ${y - 10}q1.6 8.4 9.6 10-8 1.6-9.6 10-1.6-8.4-9.6-10 8-1.6 9.6-10z" fill="#c9b8ff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`,
    hardware: (x, y) => `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" rx="2" fill="#7bd389" stroke="${INK}" stroke-width="1.2"/><rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" rx=".8" fill="#2a2a33"/><path d="M${x - 5} ${y - 8}v-2.5M${x} ${y - 8}v-2.5M${x + 5} ${y - 8}v-2.5M${x - 5} ${y + 8}v2.5M${x} ${y + 8}v2.5M${x + 5} ${y + 8}v2.5" stroke="${INK}" stroke-width="1"/>`,
};

export interface DollOptions {
    /** The seed: the same `i` is always the same person. */
    i?: number;
    /** What it holds: general, web, mobile, data, ai, hardware. */
    role?: string;
    /** A name tag: "blank", "level" or "junior"; `label` is its text. */
    tag?: "blank" | "level" | "junior" | null;
    label?: string;
    cap?: boolean;
    wave?: boolean;
    fill?: string | null;
}

/** One doll, 60 by 112, as an SVG string with class "d". */
export function dollSvg({i = 0, role = "general", tag = null, label = "", cap = false, wave = false, fill = null}: DollOptions = {}): string {
    const r = rng(i * 7919 + 31), skin = pick(r, SKIN), hc = pick(r, HAIR), shirt = pick(r, SHIRT), hk = Math.floor(r() * 6);
    const pants = pick(r, ["#3d4a6b", "#5a4a3a", "#2e2e36", "#6c7a8c"]);
    const glasses = r() < .3, w = (r() - .5) * 1.5;
    const head = `${hk === 1 ? hair(1, hc) : ""}<ellipse cx="30" cy="25" rx="15.5" ry="17" fill="${skin}" stroke="${INK}" stroke-width="1.4"/>${hk !== 1 ? hair(hk, hc) : hair(0, hc)}
         <circle cx="24.5" cy="27" r="1.6" fill="${INK}"/><circle cx="35.5" cy="27" r="1.6" fill="${INK}"/><path d="M26 33.5q4 3 8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
         <circle cx="21.5" cy="31.5" r="2.3" fill="#ff8a8a" opacity=".35"/><circle cx="38.5" cy="31.5" r="2.3" fill="#ff8a8a" opacity=".35"/>
         ${glasses ? `<g fill="none" stroke="${INK}" stroke-width="1.2"><circle cx="24.5" cy="27" r="4"/><circle cx="35.5" cy="27" r="4"/><path d="M28.5 27h3"/></g>` : ""}`;
    const capSvg = cap ? `<path d="M12 12 30 5l18 7-18 7z" fill="#22201c"/><path d="M20 15v6c6 3 14 3 20 0v-6" fill="#22201c"/><path d="M46 13v9" stroke="#ffc94d" stroke-width="1.4"/><circle cx="46" cy="23" r="1.6" fill="#ffc94d"/>` : "";
    const tagFill = fill || (tag === "junior" ? "#d7ee4c" : tag === "level" ? "#cbd5e1" : "#fff");
    const t = tag ? `<g><rect x="${label ? 30 : 34}" y="57" width="${label ? 22 : 12}" height="${label ? 9 : 7.5}" rx="1.5" fill="${tagFill}" stroke="${INK}" stroke-width="1"/>${label ? `<text x="41" y="63.6" text-anchor="middle" font-size="5.6" font-weight="700" fill="${INK}" style="font-family:var(--essay)">${label}</text>` : ""}</g>` : "";
    const arm = wave
        ? `<path d="M43 52q8-6 9-16" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="52" cy="35" r="2.6" fill="${skin}" stroke="${INK}" stroke-width="1.1"/>`
        : `<path d="M43 53q4 8 0 15" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    return `<svg class="d" viewBox="0 0 60 112" aria-hidden="true"><g transform="rotate(${w} 30 110)">
      <path d="M24 84l-3 22M36 84l3 22" stroke="${pants}" stroke-width="5" stroke-linecap="round"/><path d="M15 107h9M36 107h9" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M18 50q12-6 24 0l3 34H15z" fill="${shirt}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M17 53q-5 8-1 15" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>${arm}
      <rect x="26" y="40" width="8" height="11" rx="3" fill="${skin}" stroke="${INK}" stroke-width="1.2"/>
      ${head}${capSvg}${(TOOL[role] ?? TOOL.general)(21, 68)}${t}</g></svg>`;
}

/** The same doll placed inside another SVG: at x, y, `w` wide. */
export const dollAt = (o: DollOptions, x: number, y: number, w: number) =>
    dollSvg(o).replace('<svg class="d"', `<svg x="${x}" y="${y}" width="${w}" height="${(w * 112 / 60).toFixed(1)}"`);
