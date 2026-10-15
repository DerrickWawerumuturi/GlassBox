import React from "react";
import Link from "next/link";

import BylineActions from "@/components/market-page/BylineActions";
import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import TitleBar from "@/components/market-page/TitleBar";
import {Ringed, Rounds, Specimens} from "@/components/years/Figures";
import Woodpile from "@/components/years/Woodpile";
import s from "@/components/years/years.module.css";
import {marketAskSkills, marketWhat} from "@/lib/cv-ask";
import {fmt, weekDate, weekStart} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {MARKET_PAGES, marketPath} from "@/lib/market-pages";
import {UNAVAILABLE} from "@/lib/market-story";
import {articleStructuredData} from "@/lib/seo";
import {SITE_URL} from "@/lib/site";
import {cn} from "@/lib/utils";
import {
    bucketWords, kicker, pileCaption, ringedHeading, ringedLine, roundsLine, rowLabel, softwareLine, stamp, TOPIC, yardLead, yearsAnswer,
    YearsCounts, yearsFaq, yearsHeadline, yearsLabel, YearsRow, yearsRows, yearsSections, YEARS_METHOD,
} from "@/lib/years-answer";

/*
 * /market/entry-level-software/years-of-experience, as "Count the rings"
 * (founder, 16 Oct 2026; docs/local/editorial-sprint/years-page): a woodpile
 * seen end on, one log end per job, its rings the years the job asks for, a
 * sealed grey end for a job that states no number. Still the weekly page:
 * every number and sentence comes from the entry level page's count
 * (lib/years-answer.ts), and a part the week's counts can't fill is left out
 * (docs/decisions/market-pages.md, "Years of experience").
 */

const INFO = MARKET_PAGES["entry-level-software"];
export const CRUMBS: Array<[string, string]> = [[INFO.label, marketPath(INFO.name)], ["Years of experience", YEARS_PATH]];

function Source({c}: {c: YearsCounts}) {
    return <p className={s.src}>Source: Glassbox count, week of {weekDate(c.page)} · <Link href={"/method"}>how we count</Link></p>;
}

/** A pile under its plank sign, with its caption. */
function Pile({c, row, ...pile}: {c: YearsCounts; row: YearsRow} & Omit<React.ComponentProps<typeof Woodpile>, "row">) {
    return (
        <figure className={cn(s.pile, s.wide)}>
            <div className={s.plank}><span>{row.name}</span><b>{fmt(row.total)} jobs</b></div>
            <Woodpile row={row} {...pile} />
            <figcaption><p className={s.cap}>{pileCaption(row)}</p><Source c={c} /></figcaption>
        </figure>
    );
}

function Table({rows}: {rows: YearsRow[]}) {
    return (
        <details className={s.twin}>
            <summary>View as table</summary>
            <table>
                <thead><tr><th scope={"col"}>Years asked</th>{rows.map((r) => <th key={r.key} scope={"col"}>{r.name}</th>)}</tr></thead>
                <tbody>
                    {rows[0].buckets.map((b, i) => (
                        <tr key={b.from}><th scope={"row"}>{bucketWords(b)}</th>{rows.map((r) => <td key={r.key}>{fmt(r.buckets[i].jobs)}</td>)}</tr>
                    ))}
                    <tr><th scope={"row"}>None stated</th>{rows.map((r) => <td key={r.key}>{fmt(r.unstated)}</td>)}</tr>
                    <tr className={s.sum}><th scope={"row"}>All jobs</th>{rows.map((r) => <td key={r.key}>{fmt(r.total)}</td>)}</tr>
                </tbody>
            </table>
        </details>
    );
}

function Rings({c}: {c: YearsCounts}) {
    const rows = yearsRows(c), [titled, software] = rows, show = yearsSections(c), faq = yearsFaq(c), line = softwareLine(c);
    return (
        <>
            <Pile c={c} row={titled} seed={1012} aspect={[0.42, 1.0]} note={"sealed"} pen={"sealed: no number given"} />
            <section className={cn(s.col, s.beat)}>
                <div id={"lead-visual"} className={s.stampbox}>
                    <span className={s.stamp} style={{"--len": stamp(c).length} as React.CSSProperties}>{stamp(c)}</span>
                    <p>software jobs with an early career title state no number of years.</p>
                </div>
                <p className={s.lead}>A sealed end doesn&apos;t mean no experience. It means the job gave no number.</p>
                <Specimens />
                <p>Early career titles take in intern and graduate roles as well as junior ones. Many say what the work is and leave the years out.</p>
            </section>
            {show.ringed && (
                <section className={cn(s.col, s.beat)}>
                    <h2>{ringedHeading(c)}</h2>
                    <p>{ringedLine(c)}</p>
                    <figure role={"img"} aria-label={rowLabel(titled)}>
                        <Ringed c={c} />
                        <figcaption><p className={s.cap}>Every early career job that states a number, one log each, grouped by the years it asks for.</p><Source c={c} /></figcaption>
                    </figure>
                </section>
            )}
            {show.yard && software && (
                <section className={s.beat}>
                    <div className={s.col}><h2>Now every software job</h2><p>{yardLead(c)}</p></div>
                    <Pile c={c} row={software} seed={3595} aspect={[0.52, 1.05]} sorted note={"five"} pen={"five rings or more"} />
                    {line && <div className={cn(s.col, s.after)}><p className={s.lead}>{line}</p></div>}
                </section>
            )}
            <section className={cn(s.col, s.beat)}>
                <h2>Only the jobs that state a number</h2>
                <div className={s.lines}>{rows.map((r) => <p key={r.key}>{roundsLine(r)}</p>)}</div>
                <figure role={"img"} aria-label={yearsLabel(c)}>
                    <Rounds c={c} />
                    <figcaption><p className={s.cap}>Each log is cut by share of the jobs that state a number. Lime paint: two years or less. Bare wood: three or four. Dark heartwood: five or more.</p><Source c={c} /></figcaption>
                </figure>
                <Table rows={rows} />
            </section>
            <section className={cn(s.col, s.beat, s.faq)} aria-labelledby={"questions"}>
                <h2 id={"questions"}>Questions the weekly count answers</h2>
                <p className={s.small}>Answers from the week of {weekDate(c.page)}.</p>
                <dl>{faq.map(({q, a}) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl>
            </section>
        </>
    );
}

export default function YearsArticle({c, fonts = ""}: {c: YearsCounts | null; fonts?: string}) {
    const h = c ? yearsHeadline(c) : TOPIC, faq = c ? yearsFaq(c) : [];
    const cite = c ? `Glassbox. "${h}" Counted in the week of ${weekDate(c.page)}. ${new URL(SITE_URL).host}${YEARS_PATH}` : "";
    const body = (
        <div className={cn(s.page, fonts)}>
            {c && <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(articleStructuredData(YEARS_PATH, CRUMBS, c.page, h, yearsAnswer(c), faq))}} />}
            {c && <TitleBar title={h} />}
            <section className={cn(s.col, s.hero)}>
                <nav aria-label={"Breadcrumb"} className={s.crumbs}>
                    <Link href={"/market"}>Market</Link> / <Link href={CRUMBS[0][1]}>{CRUMBS[0][0]}</Link> / <span aria-current={"page"}>{CRUMBS[1][0]}</span>
                </nav>
                {c && <p className={s.kick}>{kicker(c)}</p>}
                <h1>{h}</h1>
                <p className={s.dek}>{c ? yearsAnswer(c) : UNAVAILABLE}</p>
                {c && (
                    <div className={s.by}>
                        <p>Counted by <b>Glassbox</b><span><time dateTime={weekStart(c.page)}>Week of {weekDate(c.page)}</time> · a new count every Monday</span></p>
                        <BylineActions url={`${SITE_URL}${YEARS_PATH}`} title={h} cite={cite} />
                    </div>
                )}
            </section>
            {c && <Rings c={c} />}
            {c && <section className={cn(s.col, s.cta)}><MarketCvAsk lead /></section>}
            {c && <section id={"method"} aria-labelledby={"method-h"} className={cn(s.col, s.howto)}>
                <h2 id={"method-h"}>How we counted</h2>
                {YEARS_METHOD.map((p) => <p key={p}>{p}</p>)}
                <p><Link href={"/method"}>How Glassbox counts</Link> · <Link href={marketPath(INFO.name)}>What entry level software jobs ask for</Link></p>
                <p className={s.cite}>{cite}</p>
            </section>}
        </div>
    );
    if (!c) return body;
    const ask = {skills: marketAskSkills(c.page), what: marketWhat(INFO.subject), jobs: c.page.readable, subject: INFO.subject};
    return <MarketAskProvider ask={ask} page={INFO.name} where={"years"}>{body}</MarketAskProvider>;
}
