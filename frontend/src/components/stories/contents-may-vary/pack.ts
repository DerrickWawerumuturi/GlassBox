import {fmt} from "@/lib/market-page";
import {CONTENTS, CONTENTS_MAY_VARY} from "@/lib/stories/contents-may-vary";

/*
 * The pack shot (the prototype's pack.js): the closed box in oblique
 * projection, flat pop packaging with thick outlines, Bungee on the front
 * only. An SVG string, so the hero can tear its lid: the lid's two states and
 * the popping pieces carry the classes the story's CSS module names (`cls`).
 * Text in the drawing is never below 14 units: 12px at a 358px wide box.
 */

const INK = "#161411", M = "#ff3d8f", MD = "#d9226f", C = "#1fb6ff", CD = "#0c8fd0", L = "#d7ee4c";
// The front face, and the depth vector (up and right).
const x0 = 40, x1 = 300, y0 = 86, y1 = 440, dx = 62, dy = 38;
const T = (x: number, y: number, s: number, txt: string, o: {a?: string; w?: number; f?: string; ff?: string; ls?: string} = {}) =>
    `<text x="${x}" y="${y}" font-size="${s}"${o.a ? ` text-anchor="${o.a}"` : ""} font-weight="${o.w || 800}" fill="${o.f || "#fff"}" style="font-family:${o.ff || "var(--essay)"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${txt}</text>`;

/** "12 OCT 2026": the week on the barcode strip. */
const weekShort = () => new Date(CONTENTS_MAY_VARY.week)
    .toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}).toUpperCase();

export function packshot(p: string, cls: {lidFlat: string; lidTorn: string; pop: string}): string {
    const side = `${x1},${y0} ${x1 + dx},${y0 - dy} ${x1 + dx},${y1 - dy} ${x1},${y1}`;
    const top = `${x0},${y0} ${x0 + dx},${y0 - dy} ${x1 + dx},${y0 - dy} ${x1},${y0}`;
    let s = `<defs><pattern id="${p}-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.15" fill="#000" opacity=".12"/></pattern></defs>`;

    // The shelf and the box's shadow on it.
    s += `<rect x="0" y="${y1}" width="400" height="16" fill="var(--counter)" stroke="${INK}" stroke-width="3"/><ellipse cx="200" cy="${y1 + 2}" rx="196" ry="8" fill="#000" opacity=".12"/>`;

    // Side face: the label, seen edge on. A black heading bar, a thick rule, grey lines; the first line lime.
    s += `<polygon points="${side}" fill="${MD}"/><polygon points="${side}" fill="url(#${p}-dots)"/>`;
    s += `<g transform="translate(${x1},${y0}) skewY(-31.5)"><rect x="8" y="18" width="46" height="312" fill="#fff"/><rect x="13" y="26" width="36" height="9" fill="${INK}"/><rect x="13" y="40" width="36" height="3" fill="${INK}"/>`;
    [34, 26, 22, 21, 11, 9, 8, 8, 7, 6, 5, 4, 4, 4].forEach((w, k) => {
        s += `<rect x="13" y="${50 + k * 18}" width="${w}" height="5" fill="${k === 0 ? L : "#8a857c"}"/><rect x="13" y="${60 + k * 18}" width="36" height="1" fill="#cfcac0"/>`;
    });
    s += `</g>`;

    // Top face: the cyan lid with a perforation and a pull tab. Two states: flat, and torn open.
    s += `<g class="${cls.lidFlat}"><polygon points="${top}" fill="${C}"/><polygon points="${top}" fill="url(#${p}-dots)"/>`;
    s += `<g transform="translate(${x0},${y0}) skewX(-58.5)"><path d="M14 -19H246" stroke="#fff" stroke-width="2" stroke-dasharray="6 5" opacity=".9"/><rect x="234" y="-27" width="22" height="16" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.6"/></g></g>`;
    let tear = `M${x0} ${y0}H${x1}V${y0 - 40}`;
    for (let x = x1; x > x0; x -= 10) tear += `L${x - 5} ${y0 - 33}L${x - 10} ${y0 - 40}`;
    s += `<g class="${cls.lidTorn}"><polygon points="${top}" fill="${C}"/><polygon points="${top}" fill="url(#${p}-dots)"/>`;
    s += `<polygon points="${x0},${y0} ${x0 + dx / 2},${y0 - dy / 2} ${x1 + dx / 2},${y0 - dy / 2} ${x1},${y0}" fill="#2a2226"/>`;
    for (let k = 0; k < 9; k++) s += `<rect class="${cls.pop}" style="--d:${k * 60}ms" x="${x0 + 24 + k * 28}" y="${y0 - 22 - (k % 3) * 5}" width="12" height="12" rx="3" fill="${INK}"/>`;
    s += `<path d="${tear}Z" fill="${CD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;

    // Front face: what the box claims. The roundel is the readable count, a packaging joke that is also the denominator.
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${M}"/><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#${p}-dots)"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="44" fill="${C}"/>` + T(52, 114, 14, `${fmt(CONTENTS.jobs)} JOBS`, {ls: ".8"})
        + T(288, 114, 14, `${fmt(CONTENTS.employers)} EMPLOYERS`, {a: "end", ls: ".8"});
    s += T(176, 278, 150, "AI", {a: "middle", f: INK, ff: "var(--pack)", w: 400}) + T(170, 272, 150, "AI", {a: "middle", ff: "var(--pack)", w: 400});
    s += T(174, 340, 60, "JOB", {a: "middle", f: INK, ff: "var(--pack)", w: 400}) + T(170, 336, 60, "JOB", {a: "middle", ff: "var(--pack)", w: 400});
    s += `<circle cx="92" cy="382" r="36" fill="${C}" stroke="${INK}" stroke-width="3"/>` + T(92, 370, 14, "NET", {a: "middle", ls: ".8"})
        + T(92, 394, 26, fmt(CONTENTS.readable), {a: "middle", ff: "var(--pack)", w: 400}) + T(92, 410, 14, "JOBS", {a: "middle", ls: ".8"});
    s += T(214, 378, 20, "CONTENTS", {a: "middle", w: 900}) + T(214, 402, 20, "MAY VARY", {a: "middle", w: 900});
    s += `<rect x="${x0}" y="418" width="${x1 - x0}" height="22" fill="#fff"/>`;
    [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2].reduce((x, w) => { s += `<rect x="${x}" y="422" width="${w}" height="14" fill="${INK}"/>`; return x + w + 2; }, 50);
    s += T(116, 433, 14, `WEEK OF ${weekShort()}`, {f: INK, ff: "var(--mono)", w: 700});

    // Outlines last, so every edge is the same thick ink line.
    s += `<g fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"><polygon points="${side}"/><polygon points="${top}"/><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></g>`;
    return s;
}
