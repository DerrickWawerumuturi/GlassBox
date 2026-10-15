import React from "react";

import {fmt} from "@/lib/market-page";
import {LOBBY} from "@/lib/stories/the-lobby";
import s from "./lobby.module.css";

/*
 * The facade at night: one window per job, lit by what the title says about
 * level. The windows are sorted bottom up (senior first, since it is most of
 * the building; then mid, junior, and the hatched top floors where no level
 * is stated) so the four counts read as bands, not noise. One path per level
 * keeps thousands of rects cheap. The top row is the penthouse, centred: a
 * deco setback that holds what the full rows leave over.
 */

export const FACADE = {COLS: 46, ROWS: 61, PENTHOUSE: 21};
const C = 10, X0 = 30, Y0 = 50, PENT0 = 12;

export const LEVELS: Array<{id: "senior" | "mid" | "junior" | "gap"; jobs: number; fill: string | null; name: string}> = [
    {id: "senior", jobs: LOBBY.levels.senior, fill: "#f2e8d0", name: "Senior, lead or principal"},
    {id: "mid", jobs: LOBBY.levels.mid, fill: "#8a8f99", name: "Mid level"},
    {id: "junior", jobs: LOBBY.levels.junior, fill: "#d7ee4c", name: "Intern, entry level or junior"},
    {id: "gap", jobs: LOBBY.levels.unstated, fill: null, name: "No level stated"},
];

function windows() {
    const {COLS, ROWS} = FACADE;
    const at = (k: number) => {
        const row = Math.floor(k / COLS);
        return row < ROWS - 1 ? [k % COLS, row] : [PENT0 + (k - (ROWS - 1) * COLS), row];
    };
    const win = (c: number, r: number) => `M${X0 + c * C + 1.5} ${Y0 + (ROWS - 1 - r) * C + 1.5}h7v7h-7z`;
    let k = 0;
    return LEVELS.map(({id, jobs, fill}) => {
        let d = "";
        for (let i = 0; i < jobs; i++, k++) { const [c, r] = at(k); d += win(c, r); }
        return fill ? <path key={id} d={d} fill={fill} /> : <path key={id} d={d} fill={"url(#lb-hatch)"} stroke={"#8a8f99"} strokeWidth={.9} />;
    });
}

const STARS = [[40, 30], [88, 62], [130, 22], [398, 26], [430, 70], [500, 110], [14, 120], [505, 180]];

export function Facade({children}: {children: React.ReactNode}) {
    const {senior, junior, mid, unstated} = LOBBY.levels;
    const label = `${fmt(LOBBY.jobs)} windows, one per software engineering job counted, lit by level: ${fmt(senior)} senior, lead or principal; `
        + `${fmt(junior)} intern, entry level or junior; ${fmt(mid)} mid level; ${fmt(unstated)} with no level stated.`;
    return (
        <figure className={s.facade}>
            <svg viewBox={"0 0 520 720"} role={"img"} aria-label={label}>
                <defs>
                    <pattern id={"lb-hatch"} width={3} height={3} patternUnits={"userSpaceOnUse"} patternTransform={"rotate(45)"}><rect width={1.1} height={3} fill={"#8a8f99"} /></pattern>
                </defs>
                {STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={"#efe8df"} opacity={.7} />)}
                <circle cx={464} cy={40} r={15} fill={"#f2e8d0"} opacity={.9} />
                <path d={"M22 696V54H144V44H366V54H498V696Z"} fill={"#1d2335"} stroke={"#2c3550"} strokeWidth={2} />
                <path d={"M255 44V16"} stroke={"#8a8f99"} strokeWidth={2} /><circle cx={255} cy={13} r={3} fill={"#f2e8d0"} />
                <path d={"M30 59H134M376 59H490M150 49H360M22 660H498"} stroke={"#2c3550"} strokeWidth={2} />
                {windows()}
                <ellipse cx={260} cy={698} rx={80} ry={7} fill={"#fff3c4"} opacity={.22} />
                <rect x={224} y={664} width={72} height={32} fill={"#fff3c4"} /><path d={"M260 664v32"} stroke={"#8a6a2a"} strokeWidth={2} />
                <rect x={220} y={660} width={80} height={36} fill={"none"} stroke={"#c9a24a"} strokeWidth={3} /><path d={"M206 660h108"} stroke={"#c9a24a"} strokeWidth={5} />
                <path d={"M0 696H520"} stroke={"#2c3550"} strokeWidth={3} />
            </svg>
            <figcaption>
                <div className={s.key}>
                    {LEVELS.map(({id, jobs, fill, name}) => (
                        <span key={id}><i className={id === "gap" ? s.gap : undefined} style={fill ? {background: fill} : undefined} />{name} <b>{fmt(jobs)}</b></span>
                    ))}
                </div>
                {children}
            </figcaption>
        </figure>
    );
}
