import {fmt} from "@/lib/market-page";
import {card, PICK} from "@/lib/stories/pick-a-side";
import {ICON} from "@/components/stories/pick-a-side/icons";

/*
 * Pick a side's cover on the market hub (the prototype's cover.js): the lime
 * card face up on the navy table, tilted, its foil half scratched, with the
 * week's numbers. Ids start with "entry": every cover shares the hub's page.
 */

const INK = "#1a1a1a", MUTED = "#5e5b54", STAT = "var(--font-bebas-neue), var(--essay), sans-serif";
const ESSAY = "var(--essay), system-ui, sans-serif", MONO = "var(--mono), ui-monospace, monospace";
const T = (x: number, y: number, s: number, txt: string, o: {a?: string; w?: number; f?: string; ff?: string; ls?: string} = {}) =>
    `<text x="${x}" y="${y}" font-size="${s}"${o.a ? ` text-anchor="${o.a}"` : ""} font-weight="${o.w || 700}" fill="${o.f || INK}" style="font-family:${o.ff || ESSAY}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${txt}</text>`;

export function pickASideCover(): string {
    const c = card(PICK.beats.lime);
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="entryLamp" cx="50%" cy="30%" r="65%"><stop offset="0" stop-color="#1f2a5e"/><stop offset="1" stop-color="#0f1630"/></radialGradient>
      <linearGradient id="entryFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd3ff"/><stop offset=".4" stop-color="#c9b8ff"/><stop offset=".72" stop-color="#ffd6e5"/><stop offset="1" stop-color="#9fd3ff"/></linearGradient>
      <pattern id="entryEtch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1" height="5" fill="#fff" opacity=".35"/></pattern>
      <pattern id="entryHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="6" fill="#8a8f99" opacity=".3"/></pattern>
      <filter id="entryShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity=".6"/></filter>
    </defs>
    <rect width="400" height="400" fill="url(#entryLamp)"/>
    <g transform="rotate(-6 200 206) translate(78 42)">
      <rect width="244" height="332" rx="12" fill="#d7ee4c" filter="url(#entryShadow)"/>
      ${T(16, 36, 25, c.name, {w: 800})}${T(16, 56, 13, "named in", {w: 500, f: MUTED})}
      <circle cx="209" cy="32" r="19" fill="url(#entryFoil)" stroke="#fff" stroke-width="1.2"/><circle cx="209" cy="32" r="15" fill="none" stroke="#fff" stroke-opacity=".7"/>
      <g fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(197 20) scale(.86)">${ICON[c.key] ?? ""}</g>
      <rect x="16" y="68" width="104" height="30" rx="9" fill="${INK}"/>${T(68, 88, 13, "ENTRY LEVEL", {a: "middle", f: "#f4f1ea", ls: ".3"})}
      <rect x="124" y="68" width="104" height="30" rx="9" fill="none" stroke="${INK}" stroke-width="1.5"/>${T(176, 88, 13, "SENIOR", {a: "middle", ls: ".3"})}
      <path d="M12 84C8 70 36 61 68 62S128 71 126 85 100 106 66 105 8 100 14 78" fill="none" stroke="#f5532a" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="16" y="108" width="212" height="120" rx="10" fill="#fff"/>
      <rect x="124" y="114" width="98" height="108" rx="8" fill="url(#entryHatch)"/>
      ${T(68, 182, 78, `${c.e.share}%`, {a: "middle", w: 400, ff: STAT})}${T(173, 182, 78, `${c.s.share}%`, {a: "middle", w: 400, f: "#8a8f99", ff: STAT})}
      ${T(68, 208, 13, `${fmt(c.e.jobs)} jobs`, {a: "middle", w: 500, f: MUTED, ff: MONO})}${T(173, 208, 13, `${fmt(c.s.jobs ?? 0)} jobs`, {a: "middle", w: 500, f: MUTED, ff: MONO})}
      <path d="M150 108H228V168c-10 4-16-6-26-2s-14 12-24 6-8-16-18-14-10-6-14-14 2-24 4-36z" fill="url(#entryFoil)"/><path d="M150 108H228V168c-10 4-16-6-26-2s-14 12-24 6-8-16-18-14-10-6-14-14 2-24 4-36z" fill="url(#entryEtch)"/>
      <circle cx="140" cy="180" r="3" fill="#c9b8ff"/><circle cx="130" cy="190" r="2.2" fill="#ffd6e5"/><circle cx="147" cy="194" r="1.8" fill="#9fd3ff"/>
      ${T(16, 254, 12, `of ${fmt(PICK.readable)} entry level software jobs`, {w: 500, f: MUTED, ff: MONO})}${T(16, 272, 12, `of ${fmt(PICK.senior)} senior software jobs`, {w: 500, f: MUTED, ff: MONO})}
      ${c.employers ? T(16, 300, 14, `named by jobs at ${c.employers} employers`, {w: 500, f: MUTED}) : ""}
    </g>
    ${T(26, 382, 27, "scratch to see", {w: 500, f: "#f5532a", ff: "var(--hand), cursive"})}
  </svg>`;
}
