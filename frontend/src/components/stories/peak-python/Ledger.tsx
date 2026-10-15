import React from "react";

import {Source} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {PEAK, PEAK_PYTHON} from "@/lib/stories/peak-python";
import {cn} from "@/lib/utils";
import s from "./peak.module.css";

/*
 * The visitors' book (what the jobs say about themselves, the way a hut
 * keeps a book: years, level, place, remote, internships, employers, as bands
 * whose width is the count) and the titles seen from here, as brass plates.
 */

type Band = {label: string; jobs: number; lime?: boolean; none?: boolean};

function Row({title, note, bands, aria}: {title: string; note: string; bands: Band[]; aria: string}) {
    return (
        <div className={s.row}>
            <h3>{title}</h3>
            <p>{note}</p>
            <div className={s.bar} role={"img"} aria-label={aria}>
                {bands.map((b) => <i key={b.label} className={cn(b.lime && s.lime, b.none && s.none)} style={{flex: b.jobs}} />)}
            </div>
            <ul className={s.key}>
                {bands.map((b) => <li key={b.label}><i className={cn(b.lime && s.lime, b.none && s.none)} />{b.label} · <b>{fmt(b.jobs)}</b></li>)}
            </ul>
        </div>
    );
}

export function Ledger() {
    const {years, levels, places, jobs} = PEAK, stated = years.bands.reduce((n, b) => n + b.jobs, 0);
    const most = Math.max(...years.bands.map((b) => b.jobs)), mode = years.bands.find((b) => b.jobs === most)!;
    return (
        <figure className={s.col}>
            <div className={s.ledger}>
                <Row title={"Years asked"} note={`${fmt(stated)} of the ${fmt(jobs)} jobs state a number of years. ${fmt(years.unstated)} don’t.`}
                     bands={[...years.bands.map((b) => ({label: b.label, jobs: b.jobs, lime: b === mode})), {label: "no number", jobs: years.unstated, none: true}]}
                     aria={`Of the ${fmt(stated)} jobs that state a number: ${years.bands.map((b, i) => (i ? `${fmt(b.jobs)} for ${b.label}` : `${fmt(b.jobs)} ask for ${b.label} years`)).join(", ")}. ${fmt(years.unstated)} of the ${fmt(jobs)} state no number.`} />
                <Row title={"Level"} note={"Senior means a senior, lead or principal level."}
                     bands={[{label: "senior", jobs: levels.senior}, {label: "junior", jobs: levels.junior}, {label: "mid", jobs: levels.mid}, {label: "not stated", jobs: levels.unstated, none: true}]}
                     aria={`Of ${fmt(jobs)} jobs: ${fmt(levels.senior)} senior, ${fmt(levels.junior)} junior, ${fmt(levels.mid)} mid level, ${fmt(levels.unstated)} state no level.`} />
                <Row title={"Where"} note={"The place each job names."}
                     bands={[{label: "US", jobs: places.us}, {label: "elsewhere", jobs: places.elsewhere}, {label: "no country we can read", jobs: places.unknown, none: true}]}
                     aria={`Of ${fmt(jobs)} jobs: ${fmt(places.us)} name a place in the US, ${fmt(places.elsewhere)} a place elsewhere, ${fmt(places.unknown)} no country we can read.`} />
                <dl className={s.facts}>
                    <div><dt>Remote</dt><dd>{fmt(PEAK.remote.jobs)} of {fmt(jobs)} · {PEAK.remote.share}%</dd></div>
                    <div><dt>Internships</dt><dd>{fmt(PEAK.internships.jobs)} of {fmt(jobs)} · {PEAK.internships.share}%</dd></div>
                    <div><dt>Employers</dt><dd>{fmt(PEAK.employers)} · {PEAK.largest.name} has the most, {fmt(PEAK.largest.jobs)} of the {fmt(jobs)}</dd></div>
                </dl>
            </div>
            <figcaption>
                <p className={s.cap}>Each band’s width is its count of the {fmt(jobs)} jobs. Hatched: the job states no number, no level or no country we can read.
                    Lime: the most common ask, {mode.label} years.</p>
                <Source story={PEAK_PYTHON} className={s.src} />
            </figcaption>
        </figure>
    );
}

export function Plates() {
    return (
        <ul className={s.plates}>
            {PEAK.plates.map((p) => (
                <li key={p.title}><b>{p.title}</b><span>{p.employer}{p.years !== null && ` · asks ${p.years} years`}</span></li>
            ))}
        </ul>
    );
}
