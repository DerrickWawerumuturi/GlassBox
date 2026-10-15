import {fmt} from "@/lib/market-page";
import {commonest, FLOORS, LOBBY} from "@/lib/stories/the-lobby";

/*
 * The lobby's cover on the market hub (the prototype's cover.js): the brass
 * floor indicator over the lift doors, the needle resting on the most common
 * band, and its count on a plate across the doors, from the week's numbers.
 * Ids start with "swe": every cover shares the hub's page.
 */

const ANG = [158, 124, 90, 56, 22], cx = 200, cy = 232, rad = Math.PI / 180;
const xy = (a: number, r: number) => [cx + r * Math.cos(a * rad), cy - r * Math.sin(a * rad)];
const pt = (a: number, r: number) => xy(a, r).map((v) => v.toFixed(1)).join(" ");
const DECO = "var(--font-limelight), var(--font-space-grotesk), serif";

export function theLobbyCover(): string {
    const top = commonest(), at = ANG[FLOORS.indexOf(top)];
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <defs><linearGradient id="sweBrass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8c875"/><stop offset=".6" stop-color="#c9a24a"/><stop offset="1" stop-color="#8a6a2a"/></linearGradient>
    <linearGradient id="sweWood" x1="0" x2="1"><stop offset="0" stop-color="#3a2518"/><stop offset=".15" stop-color="#5a3d2b"/><stop offset=".85" stop-color="#5a3d2b"/><stop offset="1" stop-color="#3a2518"/></linearGradient></defs>
    <rect width="400" height="400" fill="#141a2b"/>
    <rect x="36" y="248" width="164" height="152" fill="url(#sweWood)"/><rect x="200" y="248" width="164" height="152" fill="url(#sweWood)"/>
    <rect x="54" y="266" width="128" height="134" fill="none" stroke="#c9a24a" stroke-width="2" opacity=".85"/><rect x="218" y="266" width="128" height="134" fill="none" stroke="#c9a24a" stroke-width="2" opacity=".85"/>
    <path d="M200 248V400" stroke="#8a6a2a" stroke-width="3"/>
    <rect x="26" y="236" width="348" height="14" fill="#c9a24a" stroke="#8a6a2a" stroke-width="2"/>
    <path d="M${pt(180, 150)}A150 150 0 0 1 ${pt(0, 150)}Z" fill="url(#sweBrass)" stroke="#8a6a2a" stroke-width="3"/>
    <path d="M${pt(180, 126)}A126 126 0 0 1 ${pt(0, 126)}" fill="none" stroke="#3d2d0f" stroke-width="1.5" opacity=".55"/>
    ${FLOORS.map((f, i) => { const [x, y] = xy(ANG[i], 134);
        return `<path d="M${pt(ANG[i], 108)}L${pt(ANG[i], 118)}" stroke="#3d2d0f" stroke-width="2.5"/><text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle" font-size="26" fill="#3d2d0f" style="font-family:${DECO}">${f.k}</text>`; }).join("")}
    <path d="M${pt(at, 100)}L${pt(at + 90, 10)}L${pt(at + 180, 10)}L${pt(at - 90, 10)}Z" fill="#21201c"/>
    <circle cx="${cx}" cy="${cy}" r="11" fill="#3d2d0f"/><circle cx="${cx}" cy="${cy}" r="5" fill="#e8c875"/>
    <rect x="70" y="302" width="260" height="52" rx="3" fill="url(#sweBrass)" stroke="#3d2d0f" stroke-width="1.5"/>
    <text x="200" y="326" text-anchor="middle" font-size="19" font-weight="700" fill="#3d2d0f" style="font-family:var(--mono)">${fmt(top.jobs)} of ${fmt(LOBBY.years.stated)}</text>
    <text x="200" y="345" text-anchor="middle" font-size="13" fill="#3d2d0f" style="font-family:var(--mono)">that state a number</text>
  </svg>`;
}
