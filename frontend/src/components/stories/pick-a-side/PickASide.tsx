import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import OpenMethod from "@/components/stories/OpenMethod";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {readLine} from "@/lib/market-story";
import {card, Card, lean, Lean, PICK, PICK_A_SIDE, suit} from "@/lib/stories/pick-a-side";
import {inWords, list, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {Deal, PickTable, RevealAll, Tally} from "./Cards";
import {Face, Pip} from "./Face";
import {BoxBack, Hand, HandTable} from "./Hand";
import s from "./pick.module.css";

/*
 * "Pick a side" (entry level software), after the approved prototypes
 * (docs/local/editorial-sprint/stories/pick-a-side, then pick-a-side-deck,
 * founder 16 Oct 2026): eleven skills, each a real playing card dealt on a
 * green baize table. Guess which side names it more, scratch the panel, and
 * both shares show. Every number is the week's (lib/stories/pick-a-side.ts); the words
 * are written from them, so a refresh is a data edit.
 */

const story = PICK_A_SIDE, week = storyWeek(story);
const {first, lime, same, turn, more} = PICK.beats;
/** Where the deck's back and pips come from (CC0; public/stories/pick-a-side/LICENSES.md). */
const DECK_SOURCE = "https://commons.wikimedia.org/wiki/File:English_pattern_playing_cards_deck_PLUS_CC0.svg";
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const mid = (c: Card) => c.inline ?? c.name;
/** Cards by the way they lean, in the order the story dealt them (the five languages before the turn on the senior side). */
const leaning = (l: Lean) => (l === "senior" ? [...more, ...turn, first, lime, same] : [first, lime, same, ...more, ...turn])
    .map(card).filter((c) => lean(c) === l);

/** How a set of cards splits: "JavaScript and C lean to entry level, TypeScript and Go to senior, and Java is a point apart." */
function splitLine(cards: Card[]): string {
    const by = (l: Lean) => cards.filter((c) => lean(c) === l).map(mid);
    const verb = (names: string[], one: string, many: string) => (names.length === 1 ? one : many);
    const [entry, senior, draw] = [by("entry"), by("senior"), by("draw")];
    const parts = [
        entry.length ? `${list(entry)} ${verb(entry, "leans", "lean")} to entry level` : "",
        senior.length ? `${list(senior)} to senior` : "",
        draw.length ? `${list(draw)} ${verb(draw, "is", "are")} a point apart` : "",
    ].filter(Boolean);
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.` : `${parts[0] ?? ""}.`;
}

/** What the suits mean, in one line: a fact about each skill, never the answer. */
function Suits() {
    const spades = PICK.deck.filter((c) => suit(c) === "spade"), clubs = PICK.deck.filter((c) => suit(c) === "club");
    return (
        <p className={s.suits}><Pip c={spades[0]} className={s.pipK} />Spades are the {inWords(spades.length)} languages the weekly page
            charts. <Pip c={clubs[0]} className={s.pipK} />Clubs are the other {inWords(clubs.length)} skills.</p>
    );
}

function Caption({children}: {children: React.ReactNode}) {
    return (
        <figcaption className={s.col}>
            <p className={s.cap}>{children}</p>
            <Source story={story} className={s.src} href={"#method"} />
        </figcaption>
    );
}

/** The hero: the eleven backs fanned on the baize, the lime card lying face up in front with its panel still on. */
function Hero() {
    const n = PICK.deck.length;
    return (
        <section className={s.hero}>
            <div className={cn(s.rail, s.heroRail)} aria-hidden>
                <div className={cn(s.felt, s.heroFelt)}>
                    <div className={s.fan}>
                        {PICK.deck.map((d, i) => <div key={d.key} className={s.fb} style={{"--i": i - (n - 1) / 2} as React.CSSProperties} />)}
                    </div>
                    <div className={s.coverCard}><div className={s.pc}><Face c={card(lime)} panel={<div className={s.shut} />} /></div></div>
                </div>
            </div>
            <p className={cn(s.note, s.heroNote)} aria-hidden>guess, then scratch</p>
            <div className={s.col}>
                <h1>{story.title}</h1>
                <p className={s.dek}>Do entry level jobs just ask for less than senior ones? {cap(inWords(n))} cards to find out.</p>
                <p className={s.by}>By the Glassbox team · the week of {week} · a four minute play</p>
                <LiveLine story={story} className={s.live} />
            </div>
        </section>
    );
}

function Beats() {
    const py = card(first), cpp = card(lime), git = card(same), turned = turn.map(card), langs = more.map(card);
    const [head, ...rest] = turned;
    return (
        <>
            <section className={s.beat}>
                <div className={s.col}><h2>Start with the favourite.</h2>
                    <p>Tap the side you think names it more. Then scratch each side of the panel with a finger or the mouse: entry level on the left, senior on the right.</p>
                    <Suits /></div>
                <figure><Deal keys={[first]} />
                    <Caption>{py.name}: {py.e.jobs} of the {fmt(PICK.readable)} entry level software jobs we read, and {fmt(py.s.jobs!)} of the {fmt(PICK.senior)} senior
                        ones. Mentioned by jobs at {py.employers} employers. {py.name} is the most named of the {inWords(PICK.charted.languages.length)} languages on both sides.</Caption></figure>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>Next, the hard one.</h2><p>{cpp.name} has a reputation. Pick a side anyway.</p></div>
                <figure className={s.withPen}><Deal keys={[lime]} />
                    {cpp.employers && <p className={cn(s.note, s.pen)} aria-hidden>at {cpp.employers} employers, so not one company&apos;s habit</p>}
                    <Caption>{cpp.name}: {cpp.e.jobs} of the {fmt(PICK.readable)} entry level software jobs we read, and {fmt(cpp.s.jobs!)} of the {fmt(PICK.senior)} senior
                        ones: {cpp.e.share}% against {cpp.s.share}%, about twice the share. The senior count is the bigger number. The share is what leans. The jobs show that it leans. They don&apos;t say why.</Caption></figure>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>{git.name} leans the same way.</h2></div>
                <figure><Deal keys={[same]} />
                    <Caption>{git.name}: {git.e.jobs} of the {fmt(PICK.readable)} entry level software jobs we read, and {fmt(git.s.jobs!)} of the {fmt(PICK.senior)} senior ones.</Caption></figure>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>Then the turn.</h2><p>{cap(inWords(turned.length))} cards dealt together. All {inWords(turned.length)} lean the other way.</p>
                    <p>They are systems skills: software spread over many machines, the tool that runs it there, and Amazon&apos;s cloud.</p></div>
                <figure><Deal keys={turn} />
                    <Caption>{head.name}: {head.e.jobs} of the {fmt(PICK.readable)} entry level software jobs we read, and {fmt(head.s.jobs!)} of the {fmt(PICK.senior)} senior ones.
                        {rest.map((c) => <React.Fragment key={c.key}> {c.name}: {c.e.jobs} and {fmt(c.s.jobs!)}{c.s.jobs === PICK.readable && ", which happens to match the entry level total"}.</React.Fragment>)}</Caption></figure>
            </section>
            <section className={s.beat}>
                <div className={s.col}><h2>{cap(inWords(langs.length))} more languages.</h2>
                    <p>For these the weekly page gives the senior side as a share only, so the senior slot shows the share and no count.</p></div>
                <figure><Deal keys={more} />
                    <Caption>Of the {fmt(PICK.readable)} entry level software jobs we could read: {langs.map((c) => `${c.name} ${c.e.jobs}`).join(", ")}. Of
                        the {fmt(PICK.senior)} senior software jobs, as shares: {langs.map((c) => `${c.s.share}%`).join(", ")}. Jobs
                        at {list(langs.map((c) => String(c.employers)))} employers name them. Here the languages split: {splitLine(langs)}</Caption></figure>
            </section>
        </>
    );
}

function WholeHand() {
    const entry = leaning("entry"), senior = leaning("senior"), draw = leaning("draw");
    return (
        <section className={s.beat}>
            <div className={s.col}><h2>The whole hand, face up.</h2>
                <p>{entry.length} of the {PICK.deck.length} cards lean to entry level: {list(entry.map((c) => c.name))}. {senior.length} lean to
                    senior: {list(senior.map(mid))}.{draw.length > 0 && ` ${list(draw.map((c) => c.name))} ${draw.length === 1 ? "is" : "are"} a point apart.`}</p>
                <p>The weekly page charts {PICK.charted.languages.length} languages, the spades. {PICK.charted.leanEntry} of them are named more often in entry level software jobs than in
                    senior software jobs. Entry level jobs don&apos;t ask for a smaller version of what senior jobs ask for. They lean towards languages, and senior jobs lean towards systems.</p></div>
            <figure><Hand />
                <Caption>Each small card: the share of the {fmt(PICK.readable)} entry level software jobs we could read in ink, the share of {fmt(PICK.senior)} senior
                    software jobs in grey. Sorted by the way they lean.</Caption></figure>
            <div className={s.col}>
                <Tally />
                <p className={s.cue}><RevealAll /><span>turns every card over</span></p>
                <HandTable />
            </div>
        </section>
    );
}

function Ending() {
    const entry = leaning("entry").length, senior = leaning("senior").length, draw = leaning("draw").length;
    return (
        <section className={s.col}>
            <h2>So, less or different?</h2>
            <p>Different. Of the {inWords(PICK.deck.length)} skills on these cards, {inWords(entry)} are named more often in entry level software
                jobs and {inWords(senior)} in senior ones.{draw > 0 && ` ${cap(inWords(draw))} ${draw === 1 ? "is" : "are"} a point apart.`}</p>
            <p>What the cards show is what this week&apos;s jobs name at each end. What they can&apos;t show is what gets anyone hired, how strictly a job
                holds to its list, or why {card(lime).name} leans to entry level. This is one week&apos;s count. We deal again every Monday.</p>
            <p className={s.lead}>So, which side have you been preparing for?</p>
            <StoryCvAsk story={story} className={s.cta} />
            <LiveLine story={story} className={s.live} short />
            <details className={s.method} id={"method"}>
                <summary>How we counted</summary>
                {HOW.entry.map((p) => <p key={p}>{p}</p>)}
                <p>{readLine(PICK.readable, PICK.jobs)} The senior side
                    is {fmt(PICK.senior)} senior software jobs, counted the same way in the same week. Only skills named by jobs at 10 or more employers are
                    shown, so one company&apos;s hiring can&apos;t make a pattern.</p>
                <Scope />
                <p>The cards are the English pattern deck from <a href={DECK_SOURCE}>Wikimedia Commons</a>, dedicated to the public domain (CC0) by Dmitry
                    Fomin and Loren Osborn.</p>
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
        </section>
    );
}

export default function PickASide({fonts}: {fonts: string}) {
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            <Crumbs story={story} className={s.crumbs} />
            <PickTable>
                <Hero />
                <section className={s.col}>
                    <p className={s.lead}>If you&apos;re aiming for a first software job, it&apos;s easy to assume you need a smaller copy of what senior engineers know. We counted what the jobs name, at both ends.</p>
                    <p>In the week of {week} we counted <strong>{fmt(PICK.jobs)} entry level software jobs</strong> at {fmt(PICK.employers)} employers, and
                        read {fmt(PICK.readable)} of them for the skills each one names. The senior side of every card is {fmt(PICK.senior)} senior software jobs,
                        counted the same way. {fmt(PICK.internships.jobs)} of the {fmt(PICK.jobs)} entry level jobs are internships.</p>
                    <p>{cap(inWords(PICK.deck.length))} skills, one per card. Guess whether entry level or senior software jobs name it more, then scratch the panel.
                        A guess is about the jobs, not about you. Nothing is stored and nothing is ranked.</p>
                    <p className={s.cue}><RevealAll /><span>every card at once, if you would rather read than play</span></p>
                </section>
                <Beats />
                <WholeHand />
                <section className={s.beat}>
                    <div className={s.col}><h2>The back of the box.</h2>
                        <p>Small print for collectors: what else the count says about these {fmt(PICK.jobs)} jobs.</p></div>
                    <BoxBack />
                </section>
                <Ending />
            </PickTable>
            <OpenMethod />
        </StoryPage>
    );
}
