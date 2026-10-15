import {FLOORS} from "@/lib/stories/the-lobby";

/*
 * The lift's drawings, from the floors' counts: the indicator's arc, the
 * building's section (floor widths are counts, the lobby the full width) and
 * the corridor behind the doors, one door per job in one point perspective.
 * Pure: the same numbers always draw the same picture.
 */

/** The indicator's angles, bottom floor first, and a point on its arc. */
export const ANGLES = [158, 124, 90, 56, 22];
const rad = Math.PI / 180;
export const arc = (a: number, r: number): [number, number] => [220 + r * Math.cos(a * rad), 126 - r * Math.sin(a * rad)];
export const pt = (a: number, r: number) => arc(a, r).map((v) => v.toFixed(1)).join(" ");

/** The section: the shaft's right edge, the lobby's full width, the ground, the lobby's height, a floor's height. */
export const SEC = {SX: 104, SW: 470, GY: 420, LH: 84, FH: 60};
export const floorY = (i: number) => SEC.GY - SEC.LH - Math.max(0, i) * SEC.FH;
export const floorH = (i: number) => (i ? SEC.FH : SEC.LH);
export const floorW = (i: number) => (FLOORS[i].jobs / FLOORS[0].jobs) * SEC.SW;
/** Where the car rests on floor i, as a translation of its drawing. */
export const carY = (i: number) => floorY(i) + floorH(i) - 48 - 372;

/** The corridor behind the doors for a floor of n jobs: an SVG body for a 300 by 320 view. */
export function corridor(n: number): string {
    const W = 300, H = 320, vx = 150, vy = 150, F = 3, s = (z: number) => F / (F + z);
    const xl = (z: number) => vx - vx * s(z), xr = (z: number) => vx + vx * s(z);
    const yf = (z: number) => vy + (H - vy) * s(z), yt = (z: number) => vy - 36 * s(z), yc = (z: number) => vy - vy * s(z);
    const per = [Math.ceil(n / 2), Math.floor(n / 2)], doors = ["", ""], D = 1.25;
    let plates = "";
    const quad = (X: (z: number) => number, z0: number, z1: number, a: number, b: number) =>
        `M${X(z0).toFixed(1)} ${(yf(z0) - (yf(z0) - yt(z0)) * a).toFixed(1)}L${X(z1).toFixed(1)} ${(yf(z1) - (yf(z1) - yt(z1)) * a).toFixed(1)}`
        + `L${X(z1).toFixed(1)} ${(yf(z1) - (yf(z1) - yt(z1)) * b).toFixed(1)}L${X(z0).toFixed(1)} ${(yf(z0) - (yf(z0) - yt(z0)) * b).toFixed(1)}Z`;
    per.forEach((m, side) => {
        const X = side ? xr : xl;
        for (let i = 0; i < m; i++) {
            const z = i * D;
            doors[side] += quad(X, z, z + .75, 0, 1);
            if (s(z) > .25) plates += `<path d="${quad(X, z + .2, z + .55, .5, .6)}"/>`;
        }
    });
    const zEnd = per[0] * D, ex = xl(zEnd), ey = yc(zEnd);
    let lamps = "";
    for (let z = 1; s(z) > .03; z += 2) {
        const cy = (yc(z) + 6 * s(z)).toFixed(1);
        lamps += `<circle cx="150" cy="${cy}" r="${(14 * s(z)).toFixed(1)}" fill="#fff3c4" opacity=".4"/><circle cx="150" cy="${cy}" r="${(5 * s(z)).toFixed(1)}" fill="#fff3c4"/>`;
    }
    return `<rect width="${W}" height="${H}" fill="#f6efe3"/><path d="M0 0L${vx} ${vy}L0 ${H}Z" fill="#e6dcc8"/><path d="M${W} 0L${vx} ${vy}L${W} ${H}Z" fill="#e6dcc8"/>
      <path d="M0 ${H}L${vx} ${vy}L${W} ${H}Z" fill="#2a2f3f"/><path d="M${W * .3} ${H}L${vx} ${vy}L${W * .7} ${H}Z" fill="#5a3d2b"/>
      <path d="M0 0L${vx} ${vy}L${W} 0Z" fill="#e9e0cf"/><path d="M0 0L${vx} ${vy}L${W} 0M0 ${H}L${vx} ${vy}L${W} ${H}" fill="none" stroke="#3a2518" stroke-width="1" opacity=".5"/>
      <rect x="${ex.toFixed(1)}" y="${ey.toFixed(1)}" width="${(xr(zEnd) - ex).toFixed(1)}" height="${(yf(zEnd) - ey).toFixed(1)}" fill="#d7ee4c"/>
      <g fill="#5a3d2b" stroke="#3a2518" stroke-width=".6" stroke-linejoin="round"><path d="${doors[0]}"/><path d="${doors[1]}"/></g>
      <g fill="#e8c875" stroke="#3d2d0f" stroke-width=".5">${plates}</g>${lamps}`;
}
