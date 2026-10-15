import React from "react";
import Link from "next/link";

import {GlassboxWordmark} from "@/components/brand/Logo";
import {Source} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {Card, lean, Lean, PICK, PICK_A_SIDE} from "@/lib/stories/pick-a-side";
import {inWords, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {TOPIC} from "@/lib/years-answer";
import s from "./pick.module.css";

/*
 * The hand face up (eleven small cards sorted by the way they lean, read
 * aloud by its label, with a table twin) and the back of the deck box: what
 * else the count says about these jobs. Server rendered; no script needed.
 */

const GROUPS: Array<[Lean, string]> = [["entry", "Lean to entry level"], ["draw", "A point apart"], ["senior", "Lean to senior"]];
const LEANS: Record<Lean, string> = {entry: "entry level", senior: "senior", draw: "a point apart"};

/** A group's cards, the stronger lean first: by their senior share on the senior side, else by their entry level share. */
const group = (l: Lean) => PICK.deck.filter((d) => lean(d) === l).sort((a, b) => (l === "senior" ? b.s.share - a.s.share : b.e.share - a.e.share));

export function handLabel() {
    return `All ${inWords(PICK.deck.length)} cards face up, as the share of ${fmt(PICK.readable)} entry level software jobs and of ${fmt(PICK.senior)} senior software jobs. `
        + GROUPS.filter(([l]) => group(l).length).map(([l, label]) => `${label}: ${group(l).map((d) => `${d.name} ${d.e.share}% and ${d.s.share}%`).join(", ")}.`).join(" ");
}

const Mini = ({d}: {d: Card}) => (
    <div className={cn(s.mini, d.key === PICK.beats.lime && s.lime)}>
        <span className={s.nm}>{d.name}</span>
        <span className={s.two}><b>{d.e.share}%</b><i /><b className={s.s}>{d.s.share}%</b></span>
    </div>
);

export function Hand() {
    return (
        <div className={s.hand} role={"img"} aria-label={handLabel()}>
            {GROUPS.filter(([l]) => group(l).length).map(([l, label]) => (
                <div key={l} className={cn(s.group, s[l])}>
                    <h4>{label} · {group(l).length}</h4>
                    <div className={s.minis}>{group(l).map((d) => <Mini key={d.key} d={d} />)}</div>
                </div>
            ))}
        </div>
    );
}

export function HandTable() {
    return (
        <details className={s.twin}>
            <summary>View as table</summary>
            <div className={s.scroll}>
                <table>
                    <thead><tr><th>Skill</th><th>Entry level software</th><th>Senior software</th><th>Employers</th><th>Leans</th></tr></thead>
                    <tbody>
                        {PICK.deck.map((d) => (
                            <tr key={d.key}>
                                <td>{d.name}</td>
                                <td className={s.n}>{d.e.jobs}/{fmt(PICK.readable)} · {d.e.share}%</td>
                                <td className={s.n}>{d.s.jobs === null ? `${d.s.share}% (share only)` : `${fmt(d.s.jobs)}/${fmt(PICK.senior)} · ${d.s.share}%`}</td>
                                <td>{d.employers ?? "10 or more"}</td>
                                <td>{LEANS[lean(d)]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}

/** The back of the deck box: the rest of the week's count, as small print. */
export function BoxBack() {
    const {jobs, employers, readable, languages, internships, remote, places, largest, senior, titled} = PICK;
    return (
        <figure>
            <div className={s.box}>
                <div className={s.brandline}><GlassboxWordmark /><h3>Entry level software · week of {storyWeek(PICK_A_SIDE)}</h3></div>
                <dl>
                    <dt>In the box</dt><dd>{fmt(jobs)} jobs at {fmt(employers)} employers. {fmt(readable)} long enough to read.</dd>
                    <dt>Languages</dt><dd>{fmt(languages.any)} of the {fmt(readable)} name at least one language. {fmt(languages.twoOrMore)} name two or more.</dd>
                    <dt>Internships</dt><dd>{fmt(internships.jobs)} of the {fmt(jobs)}, {internships.share}%.</dd>
                    <dt>Remote</dt><dd>{fmt(remote.jobs)} of the {fmt(jobs)}, {remote.share}%.</dd>
                    <dt>Where</dt>
                    <dd><span className={s.where}><span>US · {fmt(places.us)}</span><span>elsewhere · {fmt(places.elsewhere)}</span>
                        <span className={s.gap}>no country we can read · {fmt(places.unknown)}</span></span></dd>
                    <dt>Largest employer</dt><dd>{largest.name}, with {fmt(largest.jobs)} of the {fmt(jobs)}. No single employer dominates.</dd>
                    <dt>The other side</dt><dd>{fmt(senior)} senior software jobs, counted the same way in the same week.</dd>
                </dl>
                <Link className={s.pointer} href={YEARS_PATH}>
                    <span className={s.pk}>Also in the count</span>
                    {fmt(titled.unstated)} of the {fmt(titled.jobs)} software jobs with an early career title state no number of years. <em>{TOPIC}</em>
                </Link>
                <div className={s.barcode} aria-hidden />
            </div>
            <figcaption className={s.col}>
                <p className={s.cap}>The back of the deck box. Hatched: the job names no country we can read. Countries one by one are too few to show.</p>
                <Source story={PICK_A_SIDE} className={s.src} href={"#method"} />
            </figcaption>
        </figure>
    );
}
