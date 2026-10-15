import React from "react";

import {fmt} from "@/lib/market-page";
import {commonBand, CONTENTS} from "@/lib/stories/contents-may-vary";
import {cn} from "@/lib/utils";
import b from "./back.module.css";

/*
 * What came out of the box and what's printed on it: ten of the titles the
 * live page lists, on slips; the back of the box (levels and years asked);
 * and the stamp on its bottom (where the jobs are, remote, internships,
 * employers). Server rendered; each figure reads aloud by its label.
 */

const TILT = [-1.6, 1.2, -.8, 1.8, -1.1, .9, -1.9, 1.4, -.6, 1.1];

export function Slips() {
    return (
        <ul className={b.slips}>
            {CONTENTS.slips.map((sl, k) => (
                <li key={sl.title} className={b.slip} style={{"--t": `${TILT[k % TILT.length]}deg`} as React.CSSProperties}>
                    <b>{sl.title}</b><small>{sl.employer}</small>{sl.asks && <span className={b.yrs}>{sl.asks}</span>}
                </li>
            ))}
        </ul>
    );
}

function Bar({name, n, of, tone}: {name: string; n: number; of: number; tone?: "hatch" | "lime"}) {
    return (
        <div className={b.r}>
            <span>{name}</span>
            <span className={cn(b.bar, tone && b[tone])} style={{"--w": `${((n / of) * 100).toFixed(1)}%`} as React.CSSProperties} />
            <span className={b.n}>{fmt(n)}</span>
        </div>
    );
}

/** The back of the box: level and years asked, the most common ask in lime. */
export function BoxBack() {
    const {jobs, levels, years} = CONTENTS, common = commonBand();
    const levelLabel = `Level, of the ${fmt(jobs)} AI jobs: senior, lead or principal ${levels.senior}; junior ${levels.junior}; mid level ${levels.mid}; not stated ${levels.unstated}.`;
    const yearsLabel = `Years asked, of the ${fmt(jobs)} AI jobs: ${years.stated} state a number, ${years.unstated} don’t. Of the ${years.stated}: `
        + years.bands.map((x) => `${x.jobs} ask ${x.label}`).join(", ") + ".";
    return (
        <div className={b.back}>
            <div className={b.inner}>
                <div className={b.mini} role={"img"} aria-label={levelLabel}>
                    <h4>Level · of {fmt(jobs)} jobs</h4>
                    <Bar name={"Senior, lead or principal"} n={levels.senior} of={jobs} />
                    <Bar name={"Junior"} n={levels.junior} of={jobs} />
                    <Bar name={"Mid level"} n={levels.mid} of={jobs} />
                    <Bar name={"Not stated"} n={levels.unstated} of={jobs} tone={"hatch"} />
                </div>
                <div className={b.mini} role={"img"} aria-label={yearsLabel}>
                    <h4>Years asked · of {fmt(jobs)} jobs</h4>
                    <Bar name={"States a number"} n={years.stated} of={jobs} />
                    <Bar name={"Doesn’t say"} n={years.unstated} of={jobs} tone={"hatch"} />
                    <p className={b.sub}>Of the {years.stated} that do</p>
                    {years.bands.map((x) => <Bar key={x.label} name={x.label} n={x.jobs} of={years.stated} tone={x === common ? "lime" : undefined} />)}
                </div>
            </div>
        </div>
    );
}

/** The stamp on the bottom of the box. */
export function Stamp() {
    const {jobs, places, remote, internships, employers, largest} = CONTENTS;
    const label = `Stamp on the bottom of the box. Made in: ${places.us} of the ${fmt(jobs)} jobs name a place in the US, ${places.elsewhere} a place elsewhere, `
        + `${places.unknown} no country we can read. Remote: ${remote.jobs} of ${fmt(jobs)}, ${remote.share}%. Internships: ${internships.jobs} of ${fmt(jobs)}, `
        + `${internships.share}%. Packed by ${employers} employers; ${largest.name} has the most, ${largest.jobs}. Recounted every Monday.`;
    return (
        <div className={b.stamp} role={"img"} aria-label={label}>
            <div className={b.l}><span>Made in</span><span>of {fmt(jobs)} jobs</span></div>
            <div className={b.blocks}><i style={{flex: places.us}} /><i style={{flex: places.elsewhere}} /><i className={b.hatch} style={{flex: places.unknown}} /></div>
            <div className={b.l}><span>US {places.us}</span><span>Elsewhere {places.elsewhere}</span><span>Not stated {places.unknown}</span></div>
            <div className={b.l}><span>Remote</span><span className={b.big}>{remote.jobs} of {fmt(jobs)} · {remote.share}%</span></div>
            <div className={b.l}><span>Internships</span><span>{internships.jobs} of {fmt(jobs)} · {internships.share}%</span></div>
            <div className={b.l}><span>Packed by</span><span>{employers} employers · {largest.name} the most, {largest.jobs}</span></div>
            <div className={b.l}><span>Recounted</span><span>every Monday</span></div>
        </div>
    );
}
