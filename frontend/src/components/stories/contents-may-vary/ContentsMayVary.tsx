import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {MARKET_PAGES} from "@/lib/market-pages";
import {readLine} from "@/lib/market-story";
import {commonBand, CONTENTS, CONTENTS_MAY_VARY, NO_LANGUAGE} from "@/lib/stories/contents-may-vary";
import {inWords, storyWeek} from "@/lib/stories/story";
import {BoxBack, Slips, Stamp} from "./Back";
import b from "./back.module.css";
import {BoxTable, Counter, HeroPack, OpenButton} from "./Box";
import s from "./cmv.module.css";

/*
 * "Contents may vary" (AI), after the approved prototype
 * (docs/local/editorial-sprint/stories/contents-may-vary): an AI job comes in
 * a box, and the side of the box says what is in it. Open it and one piece
 * per job lands on the counter; a line on the label lights that many. Every
 * number is the week's (lib/stories/contents-may-vary.ts).
 */

const story = CONTENTS_MAY_VARY, week = storyWeek(story), {jobs, readable, employers} = CONTENTS;
const named = (k: string) => CONTENTS.label.find((l) => l.key === k)!;

function Caption({children, col = true}: {children: React.ReactNode; col?: boolean}) {
    return (
        <figcaption className={col ? s.col : undefined}>
            <p className={s.cap}>{children}</p>
            <Source story={story} className={s.src} />
        </figcaption>
    );
}

/** The pile read aloud: the lines that light, and the hatched no language line. */
const pileLabel = () => `${fmt(readable)} pieces, one per AI job we could read in the week of ${week}. A line on the label lights that many: `
    + CONTENTS.label.filter((l) => l.jobs !== null).map((l) => `${l.name} ${l.jobs}`).join(", ") + `. No programming language named: ${NO_LANGUAGE}, hatched.`;

function Hero() {
    return (
        <section className={s.hero}>
            <div className={s.shelf}>
                <HeroPack />
                <p className={`${s.note} ${s.shelfNote}`} aria-hidden>read the side</p>
            </div>
            <div className={`${s.col} ${s.heroText}`}>
                <h1>{story.title}</h1>
                <p className={s.dek}>{story.card}</p>
                <p className={s.by}>By the Glassbox team · the week of {week} · a four minute read</p>
                <LiveLine story={story} className={s.live} />
            </div>
            <p className={`${s.cue} ${s.heroCue}`}><OpenButton hero /><span className={s.cueText}>{fmt(readable)} pieces inside</span></p>
        </section>
    );
}

function Ending() {
    const llm = named("llm"), py = named("python"), agents = named("ai agents");
    return (
        <section className={s.col}>
            <h2>So what is in the box?</h2>
            <p>Whatever the side says. In the week of {week}: {llm.name} in {llm.jobs} of the {fmt(readable)} jobs we could read, {py.name} in {py.jobs},
                {" "}{agents.name} in {agents.jobs}, and no programming language at all in {NO_LANGUAGE}. The front says AI on all of them.</p>
            <StoryCvAsk story={story} className={s.cta} />
            <LiveLine story={story} className={s.live} short />
            <details className={s.method} id={"method"}>
                <summary>How we counted</summary>
                <p>{MARKET_PAGES.ai.counts}</p>
                {HOW.role.map((p) => <p key={p}>{p}</p>)}
                <p>{readLine(readable, jobs)}</p>
                <p>Lines on the label that show only a share come from the weekly page&apos;s chart of skills beyond the languages, which publishes shares.
                    We don&apos;t turn a share into a count, so those lines don&apos;t light.</p>
                <Scope />
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
        </section>
    );
}

export default function ContentsMayVary({fonts}: {fonts: string}) {
    const {levels, years, places, remote, others, slips} = CONTENTS, common = commonBand();
    const remotes = others.map((o) => `${o.name} ${o.remote}%`);
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            <Crumbs story={story} className={s.crumbs} />
            <BoxTable>
                <Hero />
                <section className={s.col}>
                    <p className={s.lead}>An AI job comes in a box. The front says AI in the biggest letters the printer had. The side of the box says what is in it.</p>
                    <p>We counted {fmt(jobs)} AI jobs at {fmt(employers)} employers in the week of {week}. {fmt(readable)} of them were long enough to read;
                        the other {jobs - readable} ({fmt(jobs)} − {fmt(readable)}) were not. We read the side of all {fmt(readable)} and printed the count the way a
                        packet prints its ingredients.</p>
                </section>
                <section className={s.beat}>
                    <div className={s.col}><h2>We read the side.</h2>
                        <p>The front of a box is a claim. The side is a list. Each line on this label is a skill and how many of the {fmt(readable)} jobs name it.
                            Tap a line and that many pieces light up on the counter.</p>
                        <p className={s.cue}><OpenButton /></p></div>
                    <figure className={s.wide} id={"counter"}>
                        <Counter pileLabel={pileLabel()} />
                        <Caption col={false}>Each piece is one of the {fmt(readable)} AI jobs we could read. One line lights at a time: the count knows how many jobs
                            name a skill, not which jobs name two. Lines that give only a share stay unlit, because the weekly page gives no count for them.</Caption>
                    </figure>
                </section>
                <section className={s.beat}>
                    <div className={s.col}><h2>May contain no code.</h2>
                        <div className={s.stat}><b>{NO_LANGUAGE}</b><span>of the {fmt(readable)} jobs name no programming language in the ad.</span></div>
                        <p>{CONTENTS.languages} of the {fmt(readable)} name at least one language, so {fmt(readable)} − {CONTENTS.languages} = {NO_LANGUAGE} name
                            none. {CONTENTS.twoOrMore} name two or more.</p>
                        <p>A job that names no language may still involve code. We count the words in the ad, not the work. On the label, this line sits in a box
                            of its own. Tap it and {NO_LANGUAGE} pieces turn grey and hatched: the count knows how many, not which.</p>
                    </div>
                </section>
                <section className={s.beat}>
                    <div className={s.col}><h2>What came out.</h2>
                        <p>The weekly page lists {CONTENTS.listed} of the {fmt(jobs)} titles, one employer at a time. Here are {inWords(slips.length)} of them, on the
                            slips they came with.</p></div>
                    <figure className={s.wide}>
                        <Slips />
                        <Caption>Titles and employers as the weekly page lists them, without the (m/w/d) tags and city brackets. Never the ads. “Asks 3 years” is the
                            number of years the ad states.</Caption>
                    </figure>
                    <div className={s.col}><p>One box. A compiler engineer, a seminar trainer, a category manager, a governance engineer and a head of data. The
                        front says AI on every one of them.</p></div>
                </section>
                <section className={s.beat}>
                    <div className={s.col}><h2>Serving suggestion.</h2>
                        <p>The back of the box carries the small print: what level the jobs are, and how many years they ask for.</p></div>
                    <figure className={b.backwrap}>
                        <BoxBack />
                        <Caption>Senior means a senior, lead or principal level. Hatched: the job states no level, or no number of years. Lime: the most common ask.</Caption>
                    </figure>
                    <div className={s.col}><p>{levels.senior} of the {fmt(jobs)} AI jobs are senior, lead or principal. {common.label.replace(/ years$/, "")} years is the
                        most common ask: {common.jobs} of the {years.stated} jobs that state a number. The other {years.unstated} don&apos;t say.</p></div>
                </section>
                <section className={s.beat}>
                    <div className={s.col}><h2>Made in.</h2><p>The stamp on the bottom of the box.</p></div>
                    <figure className={b.stampwrap}>
                        <Stamp />
                        <p className={`${s.note} ${b.stampNote}`} aria-hidden>next count: Monday</p>
                        <Caption>Hatched: the job names no country we can read. Countries one by one are too few to show.</Caption>
                    </figure>
                    <div className={s.col}>
                        <p>{places.us} of the {fmt(jobs)} jobs name a place in the US and {places.elsewhere} a place elsewhere. Of the {inWords(others.length + 1)} pages
                            we count, this is the only one where elsewhere nearly matches the US.</p>
                        <p>{remote.jobs} of the {fmt(jobs)} are remote, {remote.share}%. That is the highest remote share of the {inWords(others.length + 1)} pages: {remotes.join(", ")}.</p>
                    </div>
                </section>
                <Ending />
            </BoxTable>
        </StoryPage>
    );
}

