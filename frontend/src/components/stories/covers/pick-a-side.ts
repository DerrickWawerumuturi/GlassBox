import {fmt} from "@/lib/market-page";
import {card, PICK, suit} from "@/lib/stories/pick-a-side";
import {BACK_SRC, ICON, NAVY, PIP, PIP_BOX} from "@/components/stories/pick-a-side/icons";

/*
 * Pick a side's cover on the market hub, in the deck's look (founder, 16 Oct
 * 2026): a card table (green baize, a wooden rail), two of the deck's blue
 * backs face down, and the lime card face up and tilted, its scratch panel
 * half rubbed off over the week's numbers. Ids start with "entry": every
 * cover shares the hub's page. No orange on the cloth.
 */

const INK = "#1a1a1a", MUTED = "#5e5b54", SENIOR = "#8a8f99", STOCK = "#fffdf8";
const STAT = "var(--font-bebas-neue), var(--essay), sans-serif";
const ESSAY = "var(--essay), system-ui, sans-serif", MONO = "var(--mono), ui-monospace, monospace";
const T = (x: number, y: number, s: number, txt: string, o: {a?: string; w?: number; f?: string; ff?: string; ls?: string} = {}) =>
    `<text x="${x}" y="${y}" font-size="${s}"${o.a ? ` text-anchor="${o.a}"` : ""} font-weight="${o.w || 700}" fill="${o.f || INK}" style="font-family:${o.ff || ESSAY}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${txt}</text>`;

/** A back lying face down, 120 by 180. */
const back = (x: number, y: number, deg: number) =>
    `<g transform="translate(${x} ${y}) rotate(${deg} 60 90)"><rect width="120" height="180" rx="9" fill="${NAVY}" filter="url(#entryShadow)"/><image href="${BACK_SRC}" width="120" height="180" preserveAspectRatio="none"/></g>`;

export function pickASideCover(): string {
    const c = card(PICK.beats.lime);
    const pip = (x: number, y: number) => `<svg x="${x}" y="${y}" width="11" height="16" viewBox="${PIP_BOX}"><path d="${PIP[suit(c)]}" fill="${INK}"/></svg>`;
    const index = `${T(16, 28, 20, c.rank, {a: "middle", w: 400, ff: STAT})}${pip(10.5, 33)}`;
    const senior = c.s.jobs === null ? "share only" : `${fmt(c.s.jobs)} of ${fmt(PICK.senior)}`;
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="entryWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b4b27"/><stop offset="1" stop-color="#4c2b14"/></linearGradient>
      <radialGradient id="entryFelt" cx="50%" cy="32%" r="75%"><stop offset="0" stop-color="#377b57"/><stop offset=".58" stop-color="#2b6a4a"/><stop offset="1" stop-color="#1d4f36"/></radialGradient>
      <pattern id="entryBack" width="144" height="215" patternUnits="userSpaceOnUse" x="38" y="142"><rect width="144" height="215" fill="${NAVY}"/><image href="${BACK_SRC}" width="144" height="215" preserveAspectRatio="none"/></pattern>
      <pattern id="entryHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="6" fill="${SENIOR}" opacity=".3"/></pattern>
      <filter id="entryShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".5"/></filter>
    </defs>
    <rect width="400" height="400" rx="34" fill="url(#entryWood)"/>
    <rect x="12" y="12" width="376" height="376" rx="25" fill="url(#entryFelt)"/>
    ${back(46, 70, -16)}${back(236, 62, 13)}
    <g transform="translate(90 36) rotate(-6 110 165)">
      <rect width="220" height="330" rx="18" fill="${STOCK}" stroke="#2a2a2a" stroke-width="1.5" filter="url(#entryShadow)"/>
      ${index}<g transform="rotate(180 110 165)">${index}</g>
      <rect x="31" y="14" width="158" height="302" rx="5" fill="#d7ee4c" stroke="${INK}" stroke-opacity=".55"/>
      <circle cx="110" cy="58" r="22" fill="#d7ee4c" stroke="${INK}" stroke-width="1.5"/><circle cx="110" cy="58" r="18" fill="none" stroke="${INK}" stroke-opacity=".35"/>
      <g fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(98 46) scale(.86)">${ICON[c.key] ?? ""}</g>
      ${T(110, 108, 22, c.name, {a: "middle", w: 700})}${T(110, 127, 11, "named in", {a: "middle", w: 500, f: MUTED})}
      <rect x="38" y="142" width="144" height="92" rx="7" fill="#fff"/>
      <rect x="111" y="146" width="68" height="84" rx="5" fill="url(#entryHatch)"/>
      ${T(74, 158, 7.5, "ENTRY LEVEL", {a: "middle", w: 600, f: MUTED, ff: MONO, ls: ".6"})}${T(145, 158, 7.5, "SENIOR", {a: "middle", w: 600, f: MUTED, ff: MONO, ls: ".6"})}
      ${T(74, 199, 44, `${c.e.share}%`, {a: "middle", w: 400, ff: STAT})}${T(145, 199, 44, `${c.s.share}%`, {a: "middle", w: 400, f: SENIOR, ff: STAT})}
      ${T(74, 220, 9, `${fmt(c.e.jobs)} of ${fmt(PICK.readable)}`, {a: "middle", w: 500, f: MUTED, ff: MONO})}${T(145, 220, 9, senior, {a: "middle", w: 500, f: MUTED, ff: MONO})}
      <path d="M152 142H182V178c-6 3-10-4-16-1s-8 8-14 4-4-10-10-9-6-4-5-10 5-8 3-14 0-8 10-6z" fill="url(#entryBack)" stroke="${NAVY}" stroke-width="1.5"/>
      ${c.employers ? T(110, 256, 10.5, `named by jobs at ${c.employers} employers`, {a: "middle", w: 500, f: MUTED}) : ""}
    </g>
  </svg>`;
}
