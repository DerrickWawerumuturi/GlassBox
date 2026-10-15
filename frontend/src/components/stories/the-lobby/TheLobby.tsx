import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {MARKET_PAGES} from "@/lib/market-pages";
import {readLine} from "@/lib/market-story";
import {bandWords, commonest, FLOORS, LOBBY, THE_LOBBY} from "@/lib/stories/the-lobby";
import {storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {Facade} from "./Facade";
import {AllFloors, CallLift, LiftCar, LiftFrame, LiftProvider, Section} from "./Lift";
import l from "./lift.module.css";
import s from "./lobby.module.css";

/*
 * "The lobby is the biggest floor" (software engineering), after the approved
 * prototype (docs/local/editorial-sprint/stories/the-lobby): the jobs as a
 * building, one window each, and a lift whose floors are the bands of years
 * the jobs ask for. The lobby is where the jobs that state no number wait.
 * Every number is the week's (lib/stories/the-lobby.ts); the words are written
 * from them, so a refresh is a data edit.
 */

const story = THE_LOBBY, week = storyWeek(story);
const {jobs, years, levels} = LOBBY;
const top = commonest();

function Caption({children, dark}: {children: React.ReactNode; dark?: boolean}) {
    return (
        <>
            <p className={cn(s.cap, dark && s.dark)}>{children}</p>
            <Source story={story} className={cn(s.src, dark && s.dark)} />
        </>
    );
}

function Hero() {
    return (
        <section className={s.hero}>
            <div className={s.text}>
                <p className={s.kick}>{MARKET_PAGES[story.page].label} · week of {week}</p>
                <h1>{story.title}</h1>
                <p className={s.dek}>{fmt(years.unstated)} of the {fmt(jobs)} software engineering jobs we counted state no number of years. Of
                    the {fmt(years.stated)} that do, {fmt(top.jobs)} ask for {bandWords(top)}.</p>
                <p className={s.lead}>It’s a building of {fmt(jobs)} jobs, one window each. Press a floor on the lift and see how many ask for that many years.</p>
                <CallLift />
                <p className={s.by}>By the Glassbox team · the week of {week}</p>
                <LiveLine story={story} className={s.live} />
            </div>
            <Facade>
                <Caption dark>Each window is one of the {fmt(jobs)} software engineering jobs we counted, lit by what its title says about level. Hatched: the
                    title says nothing about level.</Caption>
            </Facade>
        </section>
    );
}

function Directory() {
    const rows = (list: Array<[string, number]>) => list.map(([name, n]) => <tr key={name}><td>{name}</td><td className={s.n}>{fmt(n)}</td></tr>);
    return (
        <section className={cn(s.beat, s.first)}>
            <div className={s.col}><h2>The lobby directory.</h2><p>What the jobs name, by wing and by name. A job can name several skills, so the wings overlap.</p></div>
            <figure>
                <div className={s.board}>
                    <table>
                        <caption>Directory</caption>
                        <tbody><tr><th colSpan={2}>Wings · jobs naming a skill there</th></tr>{rows(LOBBY.wings)}</tbody>
                        <tbody><tr><th colSpan={2}>By name · jobs naming it</th></tr>{rows(LOBBY.named)}</tbody>
                        <tbody><tr><th colSpan={2}>Languages</th></tr>{rows([["Name at least one", LOBBY.languages.any], ["Name two or more", LOBBY.languages.twoOrMore]])}</tbody>
                    </table>
                </div>
                <figcaption className={s.col}>
                    <Caption>Counts are of the {fmt(LOBBY.readable)} jobs long enough to read. Only skills named by jobs at 10 or more employers are on the board, so
                        one company’s hiring can’t make a pattern.</Caption>
                </figcaption>
            </figure>
        </section>
    );
}

function Floors() {
    return (
        <section className={s.beat}>
            <div className={s.col}><h2>Press a floor.</h2><p>Each floor is a band of years the weekly page publishes, and its width is how many jobs ask for it. The
                lobby is where the jobs that state no number wait. It’s the biggest floor.</p></div>
            <LiftFrame>
                <div className={l.liftGrid}><LiftCar /><Section /></div>
                <figcaption>
                    <Caption>Floor widths are counts: {fmt(FLOORS[0].jobs)} state no number, {FLOORS.slice(1).map((f, i) => `${fmt(f.jobs)} ${i ? "" : "ask "}for ${bandWords(f)}${i ? "" : " years"}`).join(", ")}.
                        The bands are the weekly page’s: 0 to 2 spans three values and 8+ is open ended. Behind the doors, each door is one job; the plates are titles
                        from the {LOBBY.listed} the page lists.</Caption>
                    <AllFloors />
                </figcaption>
            </LiftFrame>
        </section>
    );
}

function TwoLists() {
    const byYears = [...FLOORS.slice(1)].sort((a, b) => b.jobs - a.jobs);
    return (
        <section className={s.beat}>
            <div className={s.col}><h2>A level is a word. Years are a number.</h2><p>The facade lit its windows by what a title says. The lift stops at what the ad
                counts. They’re different lists, and a job can be on one, both or neither.</p></div>
            <figure className={s.col}>
                <div className={s.twolists}>
                    <div className={s.plaque}><h3>By level · the facade</h3><dl>
                        <dt>{fmt(levels.senior)}</dt><dd>senior, lead or principal</dd><dt>{fmt(levels.junior)}</dt><dd>intern, entry level or junior</dd>
                        <dt>{fmt(levels.mid)}</dt><dd>mid level</dd><dt>{fmt(levels.unstated)}</dt><dd>state no level</dd></dl></div>
                    <div className={s.plaque}><h3>By years · the lift</h3><dl>
                        {byYears.map((f) => <React.Fragment key={f.k}><dt>{fmt(f.jobs)}</dt><dd>{f.says.replace(" years or more", " or more").replace(/ years$/, "")}</dd></React.Fragment>)}
                        <dt>{fmt(years.unstated)}</dt><dd>state no number</dd></dl></div>
                    <p className={cn(s.note, s.twonote)} aria-hidden>different lists</p>
                </div>
                <figcaption><Caption>Both plaques count the same {fmt(jobs)} jobs. {fmt(levels.unstated)} state no level and {fmt(years.unstated)} state no number of
                    years. Stating no number isn’t asking for none.</Caption></figcaption>
            </figure>
        </section>
    );
}

function Where() {
    const {places, remote, internships, largest} = LOBBY, w = (n: number) => `${((n / jobs) * 100).toFixed(1)}%`;
    return (
        <section className={s.beat}>
            <div className={s.col}><h2>Back in the lobby.</h2><p>{fmt(remote.jobs)} of the {fmt(jobs)} jobs are marked remote by their job board. You may never visit the
                building.</p></div>
            <figure className={s.col}>
                <div className={s.plaque}>
                    <h3>Where the {fmt(jobs)} jobs are</h3>
                    <div className={s.where} aria-hidden><span className={s.us} style={{width: w(places.us)}} /><span className={s.el} style={{width: w(places.elsewhere)}} /><span className={s.nc} /></div>
                    <dl>
                        <dt>{fmt(places.us)}</dt><dd>name a place in the US</dd>
                        <dt>{fmt(places.elsewhere)}</dt><dd>name a place elsewhere</dd>
                        <dt>{fmt(places.unknown)}</dt><dd>name no country we can read</dd>
                        <dt>{fmt(remote.jobs)}</dt><dd>are remote, {remote.share}% of the {fmt(jobs)}</dd>
                        <dt>{fmt(internships.jobs)}</dt><dd>are internships, {internships.share}%</dd>
                        <dt>{fmt(LOBBY.employers)}</dt><dd>employers posted them. {largest.name} has the most, {fmt(largest.jobs)}.</dd>
                    </dl>
                </div>
                <figcaption><Caption>Hatched: the job names no country we can read. Countries one by one are too few to show.</Caption></figcaption>
            </figure>
        </section>
    );
}

function Ending() {
    return (
        <section className={s.col}>
            <h2>Going up?</h2>
            <p>The plainest title in software mostly means senior: {fmt(levels.senior)} of the {fmt(jobs)} jobs. Among the {fmt(years.stated)} that state a number of
                years, the most common ask is {bandWords(top)}: {fmt(top.jobs)} of them. And the biggest floor states no number at all: {fmt(years.unstated)} jobs,
                waiting in the lobby.</p>
            <p>We can’t see how any employer reads an application, and we won’t guess. We can show what the ads write down. That’s where every applicant starts.</p>
            <StoryCvAsk story={story} className={s.cta} />
            <LiveLine story={story} className={s.live} short />
            <details className={s.method}>
                <summary>How we counted</summary>
                <p>{MARKET_PAGES[story.page].counts}</p>
                {HOW.role.map((p) => <p key={p}>{p}</p>)}
                <p>{readLine(LOBBY.readable, jobs)}</p>
                <p><b>The floors</b> are the years bands the weekly page publishes: 0 to 2, 3 to 4, 5 to 7, and 8 or more. {fmt(years.stated)} of the {fmt(jobs)} jobs
                    state a number; the other {fmt(years.unstated)} don’t. The level in a title (senior, junior, mid) is a separate count and never decides a floor.</p>
                <p><b>The door plates</b> quote titles and employers from the {LOBBY.listed} the page lists, never the ads. Gender notes in titles, like (m/w/d), are
                    left off the plates.</p>
                <Scope />
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
        </section>
    );
}

export default function TheLobby({fonts}: {fonts: string}) {
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            <Crumbs story={story} className={s.crumbs} />
            <LiftProvider>
                <Hero />
                <section className={s.col}>
                    <p className={s.lead}>Software engineer is the plainest job title there is. In the week of {week} it mostly meant senior.</p>
                    <p>{fmt(levels.senior)} of the {fmt(jobs)} jobs are senior, lead or principal. {fmt(levels.junior)} read as intern, entry level or
                        junior, {fmt(levels.mid)} as mid level, and {fmt(levels.unstated)} don’t say. That’s the facade. The years a job asks for are a different list,
                        and they’re what the lift stops at.</p>
                    <p>Let’s go in.</p>
                </section>
                <div className={s.inside}>
                    <Directory />
                    <Floors />
                    <TwoLists />
                    <Where />
                    <Ending />
                </div>
            </LiftProvider>
        </StoryPage>
    );
}
