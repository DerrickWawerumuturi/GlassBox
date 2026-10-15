import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {MARKET_PAGES} from "@/lib/market-pages";
import {readLine} from "@/lib/market-story";
import {peak, PEAK, PEAK_PYTHON, Ridge} from "@/lib/stories/peak-python";
import {inWords, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {RIDGE_NAME} from "./engrave";
import FivePages from "./FivePages";
import {Ledger, Plates} from "./Ledger";
import Range from "./Range";
import s from "./peak.module.css";

/*
 * "Peak Python" (machine learning), after the approved prototype
 * (docs/local/editorial-sprint/stories/peak-python): the jobs as a mountain
 * range, each skill a peak as tall as its share, read one at a time with a
 * sighting arm on a bronze table. Every number is the week's
 * (lib/stories/peak-python.ts); the words are written from them.
 */

const story = PEAK_PYTHON, week = storyWeek(story);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const mid = (k: string) => peak(k).inline ?? peak(k).name;

function Caption({children}: {children: React.ReactNode}) {
    return (
        <figcaption className={s.col}>
            <p className={s.cap}>{children}</p>
            <Source story={story} className={s.src} />
        </figcaption>
    );
}

/** Every peak as a row: the same numbers the plate reads. */
function PeakList() {
    return (
        <table>
            <caption>The {PEAK.peaks.length} peaks, left to right along the range</caption>
            <thead><tr><th>Skill</th><th>Ridge</th><th>Of {PEAK.readable} jobs</th><th>Share</th><th>Employers</th><th>Of {PEAK.senior} senior jobs</th></tr></thead>
            <tbody>
                {PEAK.peaks.map((p) => (
                    <tr key={p.key}>
                        <th scope={"row"}>{p.name}</th><td>{RIDGE_NAME[p.ridge]}</td><td>{p.jobs !== null ? `${p.jobs} of ${PEAK.readable}` : "share only"}</td>
                        <td>{p.share}%</td><td>{p.employers ?? ""}</td>
                        <td>{p.senior ? (p.senior.jobs !== null ? `${p.senior.jobs} of ${PEAK.senior} · ${p.senior.share}%` : `${p.senior.share}%`) : ""}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** A ridge for the lower ridges' sentence: "Data, 172 jobs: ETL / data pipelines 21%, statistics 21%, Apache Spark 12%." */
const ridgeLine = (r: Ridge) => {
    const jobs = PEAK.ridges.find((d) => d.key === r)!.jobs;
    return `${RIDGE_NAME[r]}, ${jobs} jobs: ${PEAK.peaks.filter((p) => p.ridge === r).map((p) => `${mid(p.key)} ${p.share}%`).join(", ")}.`;
};

function Beats() {
    const py = peak("python"), langs = PEAK.peaks.filter((p) => p.ridge === "lang"), [, ...others] = langs;
    const ml = peak("machine learning"), llm = peak("llm"), torch = peak("pytorch"), aiJobs = PEAK.ridges.find((r) => r.key === "ai")!.jobs!;
    const far = PEAK.peaks.filter((p) => p.senior).length, [rl, mlops, aws, fe] = ["reinforcement learning", "mlops", "aws", "feature engineering"].map(peak);
    return (
        <>
            <section className={s.beat}>
                <div className={s.col}>
                    <h2>{cap(inWords(langs.length))} languages, one tall peak</h2>
                    <p>Python is named in {py.jobs} of the {PEAK.readable} jobs, {py.share}%, by jobs at {py.employers} of the {PEAK.employers} employers. The next
                        language peak is {others[0].name}, {others[0].jobs} jobs.{others.slice(1).map((p) => ` Then ${p.name}, ${p.jobs}.`).join("")} Only {inWords(langs.length)} languages
                        are named by jobs at 10 or more employers, so only {inWords(langs.length)} are drawn.</p>
                    <p>{PEAK.languages.any} of the {PEAK.readable} jobs name at least one language. {PEAK.languages.twoOrMore} name two or more. The
                        other {PEAK.readable - PEAK.languages.any} name none ({PEAK.readable} − {PEAK.languages.any} = {PEAK.readable - PEAK.languages.any}).</p>
                </div>
                <figure className={s.col}>
                    <FivePages />
                    <figcaption>
                        <p className={s.cap}>Python’s peak on each of the five pages we count, to one scale. {PEAK.python.map((p, i) =>
                            `${MARKET_PAGES[p.page].label}: ${fmt(p.jobs)} of ${fmt(p.of)}${i ? "" : " jobs"}.`).join(" ")}</p>
                        <Source story={story} className={s.src} />
                    </figcaption>
                </figure>
            </section>
            <section className={s.beat}>
                <div className={s.col}>
                    <h2>The ridge almost every job stands on</h2>
                    <p>{aiJobs} of the {PEAK.readable} jobs name a skill in AI. The tallest peak is the range’s own name. This page counts machine learning jobs,
                        and {ml.share}% of them name machine learning among their skills. So {100 - ml.share}% don’t (100 − {ml.share} = {100 - ml.share}).</p>
                    <p>Beside it, {llm.name}: {llm.jobs} of {PEAK.readable} jobs, {llm.share}%. And {torch.name}: {torch.jobs} of {PEAK.readable}, {torch.share}%, named by jobs
                        at {torch.employers} employers.</p>
                </div>
            </section>
            <section className={s.beat}>
                <div className={s.col}>
                    <h2>The lower ridges</h2>
                    <p>{(["data", "devops", "cloud"] as Ridge[]).map(ridgeLine).join(" ")}</p>
                    <p>The page gives most of these as shares of the {PEAK.readable} jobs, so those peaks carry a share and no count.</p>
                </div>
            </section>
            <section className={s.beat}>
                <div className={s.col}>
                    <h2>The far range</h2>
                    <p>Behind {inWords(far)} of the peaks stands a paler one: the same skill in the {PEAK.senior} senior machine learning jobs. {torch.name} is {torch.share}% here
                        and {torch.senior!.share}% there. {rl.name}, {rl.share}% and {rl.senior!.share}%. {mlops.name} goes the other way, {mlops.share}% here
                        and {mlops.senior!.share}% there. {aws.name}, {aws.share}% and {aws.senior!.share}%. {fe.name}, {fe.share}% and {fe.senior!.share}%. Python barely
                        moves: {py.share}% and {py.senior!.share}%.</p>
                </div>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>The visitors’ book</h2><p>What the {PEAK.readable} jobs say about themselves, the way a hut keeps a book.</p></div>
                <Ledger />
            </section>
            <section className={s.beat}>
                <div className={s.col}>
                    <h2>Seen from here</h2>
                    <p>{cap(inWords(PEAK.plates.length))} of the {PEAK.readable}, titles and employers only, as the page lists them.</p>
                    <Plates />
                </div>
            </section>
        </>
    );
}

export default function PeakPython({fonts}: {fonts: string}) {
    const compared = PEAK.peaks.filter((p) => p.senior).length;
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            <Crumbs story={story} className={s.crumbs} />
            <section className={cn(s.hero, s.wide)}>
                <div><p className={s.kick}>Market · {MARKET_PAGES[story.page].label}</p><h1>{story.title}</h1></div>
                <div>
                    <p className={s.dek}>{story.card}</p>
                    <p className={s.lead}>The jobs are a mountain range. Each peak is a skill the page charts, and its height is the share of the {PEAK.readable} jobs that
                        name it. Swing the arm on the table to read a peak.</p>
                    <p className={s.by}>By the Glassbox team · the week of {week} · a four minute read</p>
                    <LiveLine story={story} className={s.live} />
                </div>
            </section>
            <section className={cn(s.beat, s.first)}>
                <figure className={cn(s.wide, s.view)}>
                    <Range><PeakList /></Range>
                    <Caption>Every skill the machine learning page charts, to one scale on one baseline. A peak’s height is the share of the {PEAK.readable} jobs
                        that name it. The pale peaks behind are the share in the {PEAK.senior} senior machine learning jobs, for the {inWords(compared)} skills the page
                        compares. A job can name skills on several ridges.</Caption>
                </figure>
            </section>
            <Beats />
            <section className={s.col}>
                <StoryCvAsk story={story} className={s.cta} />
                <LiveLine story={story} className={s.live} short />
                <details className={s.method} id={"method"}>
                    <summary>How we counted</summary>
                    <p>{MARKET_PAGES[story.page].counts}</p>
                    {HOW.role.map((p) => <p key={p}>{p}</p>)}
                    <p>{readLine(PEAK.readable, PEAK.jobs)} The weekly count is published every Monday.</p>
                    <p><b>The range:</b> every skill the page charts is a peak, drawn to one scale on one baseline. Where the page gives a count we print it. Where it
                        gives only a share we print only the share. The pale peaks are the page’s figures for the {PEAK.senior} senior machine learning jobs. Python’s
                        share on the other {inWords(PEAK.python.length - 1)} pages comes from each page’s languages table.</p>
                    <Scope />
                    <p><Link href={"/method"}>How Glassbox counts.</Link></p>
                </details>
            </section>
        </StoryPage>
    );
}

