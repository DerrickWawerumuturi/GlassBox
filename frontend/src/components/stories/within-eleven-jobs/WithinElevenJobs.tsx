import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import tomas from "@/components/people/art/tomas-reading";
import Person from "@/components/people/Person";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {MARKET_PAGES} from "@/lib/market-pages";
import {readLine} from "@/lib/market-story";
import {inWords, list, storyWeek} from "@/lib/stories/story";
import {ELEVEN, gap, WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";
import s from "./eleven.module.css";
import Plan from "./Plan";
import Yard from "./Yard";
import {LANGS, LEVELS, SHIPS, TOP, YEARS} from "./yards";

/*
 * "Within eleven jobs" (DevOps), after the approved prototype
 * (docs/local/editorial-sprint/stories/within-eleven-jobs): a container port,
 * one container per job, a bay per skill, 6 across and 2 deep, so a layer is
 * 12 jobs and height is the count. Drive the crane; the lime plate on the
 * hook reads the bay. Every number is the week's
 * (lib/stories/within-eleven-jobs.ts); the words are written from them.
 */

const story = WITHIN_ELEVEN_JOBS, week = storyWeek(story), E = ELEVEN;
const R = fmt(E.readable), J = fmt(E.jobs);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const [t0, t1, t2] = E.top;

function Caption({children}: {children: React.ReactNode}) {
    return (
        <figcaption>
            <p className={s.cap}>{children}</p>
            <Source story={story} className={s.src} />
        </figcaption>
    );
}

function Opening() {
    const others = E.languages.length - 1, next = E.languages[1];
    const leaning = E.languages.filter((l) => l.senior !== undefined && l.share > l.senior), python = E.languages[0];
    return (
        <>
            <section className={s.hero}>
                <div className={s.col}>
                    <p className={s.kick}>Market · {MARKET_PAGES.devops.label}</p>
                    <h1>{story.title}</h1>
                    <p className={s.dek}>At the top of DevOps jobs there is no leader. {t0.name}, {t1.name} and {t2.name} are named
                        in {t0.jobs}, {t1.jobs} and {t2.jobs} of the {R} job ads we read.</p>
                    <p className={s.by}>By the Glassbox team · the week of {week} · a four minute read</p>
                    <LiveLine story={story} className={s.live} />
                </div>
                <Yard cfg={TOP}>
                    <Caption>Each container is one job. Every bay is 6 containers across and 2 deep, so height is the count, and the count is
                        painted on the end. A job that names two of these skills stands in two bays.</Caption>
                </Yard>
            </section>
            <section className={s.beat}>
                <div className={s.col}>
                    <p className={s.lead}>We counted {J} DevOps jobs at {fmt(E.employers)} employers in the week of {week}, and could read {R} of them.
                        Each container on the quay is one job. A bay is a skill, and its stack is as high as the number of jobs that name it.</p>
                    <p><strong>{t0.name}, {t0.jobs}. {t1.name}, {t1.jobs}. {t2.name}, {t2.jobs}.</strong> {t0.jobs} minus {t2.jobs} is {gap()}, the number
                        of jobs between first and third. {cap(inWords(gap()))} jobs is less than one row of containers.</p>
                    <p>From the quay, {t0.name} and {t1.name} stand at the same height. The {inWords(t0.jobs - t1.jobs)} jobs between them sit at the
                        back of the top layer. {t2.name} is one row short.</p>
                </div>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>Past {t2.name}, the stacks fall away.</h2>
                    <p>{python.name} is the one language among the three. The page charts {inWords(others)} more, each named by jobs at 10 or more
                        employers. {next.name} is next, at {next.jobs}.</p></div>
                <Yard cfg={LANGS}>
                    <Caption>{python.name}&apos;s stack again, beside the other {inWords(others)} languages the page charts. Only languages named by
                        jobs at 10 or more employers are on the quay. The readout also gives the share in the {fmt(E.seniorJobs)} senior DevOps jobs.</Caption>
                </Yard>
                <div className={s.col}>
                    <p>{fmt(E.named.any)} of the {R} jobs name at least one language, and {fmt(E.named.twoOrMore)} name two or more. {R} minus {fmt(E.named.any)} leaves {fmt(E.readable - E.named.any)} that
                        name none.</p>
                    <p>{cap(inWords(E.leanAll))} of the {inWords(E.languages.length)} languages is named more often across all {R} jobs than in
                        the {fmt(E.seniorJobs)} senior ones: {list(leaning.map((l) => `${l.name}, ${l.share}% against ${l.senior}%`))}. {python.name} goes
                        the other way, {python.share}% against {python.senior}%.</p>
                </div>
            </section>
        </>
    );
}

function Yards() {
    const [devops, cloud] = E.zones, aws = cloud.skills[0], cicd = devops.skills[2];
    const bands = [...E.years.bands].sort((a, b) => b.jobs - a.jobs), most = bands[0];
    const three = E.years.bands.filter((b) => b.from >= 3), low = E.years.bands.find((b) => b.from === 0)!;
    const threeUp = three.reduce((n, b) => n + b.jobs, 0);
    const pages = E.otherInternships.map((o) => `${fmt(o.jobs)} of the ${fmt(o.of)} ${o.subject} jobs`);
    return (
        <>
            <section className={s.beat}>
                <div className={s.col}><h2>Some bays are painted but not stacked.</h2>
                    <p>The page gives the rest of its skills as shares of the {R} jobs, not as counts. A share is not a count, so we won&apos;t
                        stack one. These bays are marked out on the concrete with the share painted on, and left empty.</p></div>
                <figure className={s.wide}>
                    <Plan week={week} />
                    <Caption>Painted length is the share of the {R} DevOps jobs we could read that name each skill. Each zone says how many of
                        the {R} name at least one skill in that group. A job can name skills in several zones.</Caption>
                </figure>
                <div className={s.col}><p>{devops.jobs} of the {R} jobs name a skill in DevOps and operations, and {cloud.jobs} name one in cloud. After
                    the three stacks come {aws.name}, at {aws.share}%, and {cicd.name}, at {cicd.share}%.</p></div>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>On the far quay, one short stack.</h2>
                    <p>{E.internships.jobs} of the {J} DevOps jobs are internships. That is the fewest of the five pages we count: {pages[0]} are
                        internships, {pages.slice(1).join(", ")}.</p></div>
                <Yard cfg={LEVELS}>
                    <Caption>Of the {J} DevOps jobs. Senior means a senior, lead or principal level. Junior means intern, entry level or junior,
                        so the {E.internships.jobs} internships stand in the junior stack too. Hatched: no level stated.</Caption>
                </Yard>
                <div className={s.col}><p>{E.levels.senior} of the {J} jobs are senior, lead or principal. {E.levels.junior} read as intern, entry level or
                    junior, {E.levels.mid} as mid level, and {E.levels.unstated} don&apos;t say.</p></div>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>The years, stacked.</h2>
                    <p>{E.years.stated} of the {J} jobs state a number of years. The other {E.years.unstated} don&apos;t say. Drive to a stack to read some
                        of the titles on its doors.</p></div>
                <Yard cfg={YEARS}>
                    <Caption>Of the {E.years.stated} DevOps jobs that state a number of years. The hatched stack is the {E.years.unstated} of the {J} that
                        state none. The titles come from the {E.listed} the page lists, titles and employers only.</Caption>
                </Yard>
                <div className={s.col}><p>{most.jobs} of the {E.years.stated} ask for {most.from} to {most.to} years. {three.map((b) => b.jobs).join(" plus ")} is {threeUp}:
                    of the {E.years.stated} that state a number, {threeUp} ask for three years or more. {low.jobs} ask for 0 to {low.to}.</p></div>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>Ships and flags.</h2>
                    <p>Where the jobs say they are. {E.places.us} of the {J} name a place in the US, {E.places.elsewhere} a place elsewhere,
                        and {E.places.unknown} no country we can read.</p></div>
                <Yard cfg={SHIPS}>
                    <Caption>Each container is one job, of {J}. Hatched: the job names no country we can read. Countries one by one are too few to show.</Caption>
                </Yard>
                <div className={s.col}><p>{E.remote.jobs} of the {J} jobs, {E.remote.share}%, are marked remote by their job board. {E.employers} employers posted
                    the {J} jobs, and no single one dominates: {E.largest.name} has the most, {E.largest.jobs}.</p></div>
            </section>
        </>
    );
}

function Ending() {
    return (
        <section className={s.col}>
            <h2>{cap(inWords(gap()))} jobs.</h2>
            {/* Tomas reads, beside "What they mean for you is yours to read." */}
            <Person art={tomas} width={140} />
            <p>Three skills within {inWords(gap())} jobs of each other, at the top of the {R} DevOps jobs we could read that week. We count the
                words in the jobs. What they mean for you is yours to read.</p>
            <p>Next Monday we count again.</p>
            <StoryCvAsk story={story} className={s.cta} />
            <LiveLine story={story} className={s.live} short />
            <details className={s.method} id={"method"}>
                <summary>How we counted</summary>
                <p>{MARKET_PAGES.devops.counts}</p>
                {HOW.role.map((p) => <p key={p}>{p}</p>)}
                <p>{readLine(E.readable, E.jobs)}</p>
                <p>The stacks: one container per job, 6 across and 2 deep, so a layer is 12 jobs. A job that names several skills stands in several
                    bays. Skills the page gives only as a share are painted on the concrete and not stacked. Titles and employers are quoted from
                    the page, never the ads.</p>
                <Scope />
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
        </section>
    );
}

export default function WithinElevenJobs({fonts}: {fonts: string}) {
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            <Crumbs story={story} className={s.crumbs} />
            <Opening />
            <Yards />
            <Ending />
        </StoryPage>
    );
}

