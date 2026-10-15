import type {LogKind} from "@/lib/years-answer";

/*
 * One log end. The face is the reading: rings count the years a job asks for,
 * paint groups them (lime two or less, bare wood three or four, dark heartwood
 * five or more), and a sealed grey end, hatched like any number we don't have,
 * is a job that states no number at all. A job asking for no experience is a
 * bare log with only its pith: never the same as a sealed end. Drawn on a
 * canvas for the piles (thousands of logs) and as SVG for the small figures,
 * which render on the server. Ported from the prototype's logs.js.
 */

/** The wood's colours, as the page's CSS variables name them (years.module.css). */
const VARS = ["bark", "shadow", "sealed", "hatch", "lime", "ring-lime", "tan", "ring-tan", "dark", "ring-dark", "post", "beam"] as const;
export type Palette = Record<(typeof VARS)[number], string>;

/** The palette as the element sees it now: the theme decides it. */
export function palette(el: Element): Palette {
    const s = getComputedStyle(el);
    return Object.fromEntries(VARS.map((k) => [k, s.getPropertyValue(`--w-${k}`).trim()])) as Palette;
}

/** A small seeded random, so a pile looks the same on every load and every week's pile is its own. */
export function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Role = "sealed" | "lime" | "tan" | "dark";
export const faceRole = (t: LogKind): Role => (t < 0 ? "sealed" : t <= 2 ? "lime" : t <= 4 ? "tan" : "dark");
const ringRole = (t: LogKind): "ring-lime" | "ring-tan" | "ring-dark" => (t <= 2 ? "ring-lime" : t <= 4 ? "ring-tan" : "ring-dark");
/** The face's radius inside the bark. */
const faceOf = (r: number) => r * (r < 5 ? 0.76 : 0.84);
/** The rings' radii: one per year, up to five; heartwood (five or more) gets fainter rings between them once big enough. */
function rings(f: number, t: LogKind) {
    const n = Math.min(t, 5), main = Array.from({length: n}, (_, j) => (f * 0.94 * (j + 1)) / (n + 0.35));
    const faint = t >= 5 && f >= 9 ? [1, 2, 3, 4, 5].map((j) => (f * 0.94 * (j + 0.5)) / 5.35).filter((rr) => rr < f * 0.92) : [];
    return {main, faint};
}

/** A log on a canvas. t: -1 sealed, 0 to 4 years, 5 for five or more. wob: 0..1, a log's own irregularity. */
export function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: LogKind, p: Palette, wob = 0.5) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = p.bark; ctx.fill();
    const f = faceOf(r);
    ctx.beginPath(); ctx.arc(x, y, f, 0, 6.2832); ctx.fillStyle = p[faceRole(t)]; ctx.fill();
    if (t < 0) {
        if (f < 2.6) return;
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, f, 0, 6.2832); ctx.clip();
        const gap = Math.max(2.4, f / 3.2);
        ctx.strokeStyle = p.hatch; ctx.lineWidth = Math.max(0.8, f * 0.09);
        ctx.beginPath();
        for (let k = -f * 2; k <= f * 2; k += gap) { ctx.moveTo(x + k - f, y + f); ctx.lineTo(x + k + f, y - f); }
        ctx.stroke(); ctx.restore();
        return;
    }
    const ink = p[ringRole(t)];
    // The off centre pith every real log has, a touch towards one side.
    const cx = x + (wob - 0.5) * f * 0.16, cy = y + (0.5 - wob) * f * 0.1;
    if (f >= 4.2) {
        const {main, faint} = rings(f, t);
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.7, f * 0.05);
        for (const rr of main) { ctx.beginPath(); ctx.ellipse(cx, cy, rr * (1 + wob * 0.04), rr * (1 - wob * 0.03), wob, 0, 6.2832); ctx.stroke(); }
        ctx.globalAlpha = 0.45; ctx.lineWidth = Math.max(0.5, f * 0.025);
        for (const rr of faint) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke(); }
        ctx.globalAlpha = 1;
    }
    if (f >= 2.4) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.8, f * 0.08), 0, 6.2832); ctx.fillStyle = ink; ctx.fill(); }
}

/** A canvas sized for the device's pixels; returns its 2d context in CSS pixels. */
export function fit(canvas: HTMLCanvasElement, w: number, h: number) {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

const v = (role: string) => `var(--w-${role})`;
const n2 = (n: number) => Math.round(n * 100) / 100;

/** The same log as SVG markup, coloured by the page's variables. `hatch` is the id of a hatch pattern in the same svg. */
export function logSvg(x: number, y: number, r: number, t: LogKind, wob: number, hatch: string): string {
    const f = faceOf(r);
    let out = `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" style="fill:${v("bark")}"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(f)}" style="fill:${v(faceRole(t))}"/>`;
    if (t < 0) return f < 2.6 ? out : out + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(f)}" fill="url(#${hatch})"/>`;
    const ink = v(ringRole(t)), cx = n2(x + (wob - 0.5) * f * 0.16), cy = n2(y + (0.5 - wob) * f * 0.1);
    if (f >= 4.2) {
        const {main, faint} = rings(f, t), w = n2(Math.max(0.7, f * 0.05));
        out += main.map((rr) => `<ellipse cx="${cx}" cy="${cy}" rx="${n2(rr * (1 + wob * 0.04))}" ry="${n2(rr * (1 - wob * 0.03))}" transform="rotate(${n2(wob * 57.3)} ${cx} ${cy})" fill="none" style="stroke:${ink}" stroke-width="${w}"/>`).join("");
        out += faint.map((rr) => `<circle cx="${cx}" cy="${cy}" r="${n2(rr)}" fill="none" style="stroke:${ink}" stroke-width="${n2(Math.max(0.5, f * 0.025))}" opacity=".45"/>`).join("");
    }
    if (f >= 2.4) out += `<circle cx="${cx}" cy="${cy}" r="${n2(Math.max(0.8, f * 0.08))}" style="fill:${ink}"/>`;
    return out;
}

/** The hatch a sealed end is filled with, for an svg's defs. */
export const hatchDef = (id: string, size = 5) =>
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${n2(size * 0.24)}" height="${size}" style="fill:${v("hatch")}"/></pattern>`;
