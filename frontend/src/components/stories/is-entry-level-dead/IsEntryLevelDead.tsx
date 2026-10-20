import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import OpenMethod from "@/components/stories/OpenMethod";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, Source, StoryPage} from "@/components/stories/StoryParts";
import {fmt} from "@/lib/market-page";
import {readLine} from "@/lib/market-story";
import {ELD, FINISHED, IS_ENTRY_LEVEL_DEAD, MID, ONE_IN, PER, PER_100, share, TITLED} from "@/lib/stories/is-entry-level-dead";
import {PICK_A_SIDE} from "@/lib/stories/pick-a-side";
import {inWords, list, storyPath, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import t from "../story.module.css";
import s from "./eld.module.css";
import Guess from "./Guess";
import Ladder, {Step} from "./Ladder";
import {DEFS, ending, HEADS} from "./people";

/*
 * "Is entry level dead?" (entry level software), after the approved prototype
 * (docs/local/editorial-sprint/stories/entry-level-dead, words edited by the
 * founder, 19 Oct 2026): one real ad, a guess, then the week's software jobs
 * as a crowd of drawn people that sorts onto a ladder, and a close look at the
 * bottom step. Every number is the week's (lib/stories/is-entry-level-dead.ts);
 * the words are written from them. Server rendered; the guess and the ladder's
 * drawing are the client parts.
 */

const story = IS_ENTRY_LEVEL_DEAD, week = storyWeek(story);
/** The two asks inside the story. The sheet compares a CV with this week's jobs, not only the 629, so neither names them. */
export const GUESS_ASK = "That\u2019s the count. Curious where your own CV stands against this week\u2019s jobs?";
export const TURN_ASK = "Studying or finished, where does your own CV stand against this week\u2019s jobs?";
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "long", timeZone: "UTC"});
const [first] = ELD.weeks, last = ELD.weeks[ELD.weeks.length - 1];
/** "5, 12 and 19 October 2026": the weeks step 8 shows, in one month. */
const weeksLine = `${list(ELD.weeks.map((w) => String(new Date(w.week).getUTCDate())))} ${new Date(last.week).toLocaleDateString("en-GB", {month: "long", year: "numeric", timeZone: "UTC"})}`;

const src = <Source story={story} className={s.src} href={"#method"} />;
const Sr = ({children}: {children: React.ReactNode}) => <p className={t.sr}>{children}</p>;

const STEPS: Step[] = [
    {k: 2, src, body: <>
        <p>Now, as a crowd of {fmt(ELD.jobs)} software jobs advertised this week, from about {ELD.boards} company job boards and a few job sites. Each drawn person
            is <b><span className={s.perWide}>{PER.wide}</span><span className={s.perPhone}>{PER.phone}</span></b> of them, rounded.</p>
        <Sr>Graphic: a loose crowd of tiny drawn people, one for every {PER.wide} jobs ({PER.phone} on a phone), rounded.</Sr>
    </>},
    {k: 3, src, body: <>
        <p>Sort them by the level each ad asks for, and you get a ladder.</p>
        <p>The top step is crowded: {fmt(ELD.senior)} senior jobs. {fmt(MID)} sit in the middle, mid level or not saying.</p>
        <p>The bottom step holds {fmt(ELD.entry)}.</p>
        <p className={s.aside}>Indeed sees the same lean across US software job ads: {ELD.indeed.pct}% of their rise between May 2025 and May 2026 came from senior roles.</p>
        <p className={s.srcline}><a href={ELD.indeed.url}>{ELD.indeed.cite}</a></p>
        <Sr>Graphic: the people sort onto three steps of a wooden ladder. Top step, {fmt(ELD.senior)} senior jobs. Middle step, {fmt(MID)} mid level or not saying.
            Bottom step, {fmt(ELD.entry)} entry level jobs, about 1 in {ONE_IN}. A man with a big photo head stands at the foot of the ladder, pointing up.</Sr>
    </>},
    {k: 4, src, body: <>
        <p>So no, not dead. In one week, {ELD.employers} different employers advertised an entry level software job.</p>
        <p className={s.aside}>One honest note: we went looking. {ELD.gradBoards} of the {ELD.boards} company boards we read were chosen because they post graduate and
            intern jobs, so if anything, our count finds more of them than a random sample would.</p>
        <Sr>Graphic: close up on the bottom step. Its people are lit; the steps above fade. Under the step, {ELD.employers} tally marks, one per employer.</Sr>
    </>},
    {k: 5, src, body: <>
        <p>Look closer, though. {ELD.internships} of the {fmt(ELD.entry)} are internships, for people who are still studying.</p>
        <p>Take those away, and {FINISHED} jobs are left for everyone who has already finished.</p>
        <StoryCvAsk story={story} className={s.midAsk} place={"story_is_entry_level_dead_turn"} question={TURN_ASK} />
        <Sr>Graphic: the people for the {ELD.internships} internships turn lime, put on backpacks and step to the right; the people for the {FINISHED} other jobs
            stay on the left. A graduate with a mortarboard and an intern with a backpack stand at the ends of the step. {cap(inWords(ELD.internTitles.length))} internship
            titles hang above on lime paper slips, in handwriting: {ELD.internTitles.map((t) => `${t.title} at ${t.employer}`).join("; ")}.</Sr>
    </>},
    {k: 6, src, body: <>
        <p>Most of these ads won’t tell you how many years they want.</p>
        <p>Of the {TITLED} jobs with an early career title, {ELD.titled.unstated} state no number of years.</p>
        <p>One of them is called “{ELD.aside.title}”. It asks for {inWords(ELD.aside.years)}.</p>
        <Sr>Graphic: the people for the {TITLED} jobs with an early career title, wearing name tags. The tags for the {ELD.titled.unstated} that state no number of
            years are blank; the tags for the {ELD.titled.stated} that do say “yrs”. One is pulled out: {ELD.aside.title}, {ELD.aside.employer},
            asks for {ELD.aside.years} years.</Sr>
    </>},
    {k: 7, src, body: <>
        <p>When they do list skills, entry level ads ask for less: a median of {ELD.medianSkills.entry} required skills, against {ELD.medianSkills.senior} for senior jobs.</p>
        <p>Which skills, though, is a different story.</p>
        <Sr>Graphic: two piles of skill cards on the step. Entry level, {ELD.medianSkills.entry} cards. Senior, {ELD.medianSkills.senior} cards. A card links to
            chapter two, {PICK_A_SIDE.title}.</Sr>
    </>},
    {k: 8, src: <p className={s.src}>Source: Glassbox count, weeks of {weeksLine} · <a href={"#method"}>how we count</a></p>, body: <>
        <p>Is the bottom step getting thinner? We can’t tell you yet.</p>
        <p>We’ve counted for {inWords(ELD.weeks.length)} weeks, and our collection is still growing: {fmt(first.jobs)} software jobs on {day(first.week)}, {fmt(last.jobs)} this
            week. As new boards come in, the mix shifts. {cap(inWords(ELD.weeks.length))} points are not a trend.</p>
        <p>We count again every Monday, and this line will grow.</p>
        <Sr>Graphic: {inWords(ELD.weeks.length)} weekly points, {ELD.weeks.map((w, i) => `${Math.round(share(w))} percent on ${day(w.week)} (${w.entry} of ${fmt(w.jobs)}${i ? "" : " jobs"})`).join(", ")},
            labelled too early to tell. Empty slots follow for {list(ELD.next.map(day))}.</Sr>
    </>},
];

/** Step 7's card: the story's chapter two. */
const CARD = <>
    <p className={s.lcKick}>Chapter two</p>
    <p className={s.lcTitle}><Link href={storyPath(PICK_A_SIDE)}>{PICK_A_SIDE.title}</Link></p>
    <p className={s.lcSub}>Guess which skills entry level and senior jobs name more.</p>
</>;

function Opening() {
    return (
        <section className={s.open}>
            <figure className={s.pinwrap}>
                <div className={s.ad} role={"img"} aria-label={`A paper job ad pinned to the page: ${ELD.ad.title}, at ${ELD.ad.employer}, as posted this week.`}>
                    <svg className={s.pin} viewBox={"0 0 40 60"} aria-hidden><path d={"M20 30v27"} stroke={"var(--ink)"} strokeWidth={2.2} strokeLinecap={"round"} />
                        <ellipse cx={20} cy={19} rx={13} ry={13} fill={"var(--point)"} stroke={"var(--ink)"} strokeWidth={2} /><ellipse cx={15} cy={14} rx={4} ry={3} fill={"#fff"} opacity={.55} /></svg>
                    <p className={s.adKick}>Job ad · this week</p>
                    <p className={s.adTitle}>{ELD.ad.title}</p>
                    <p className={s.adCo}>{ELD.ad.employer}</p>
                    <div className={s.adLines} aria-hidden>{[94, 82, 88, 60, 0, 90, 74].map((w, i) => <i key={i} className={w ? undefined : s.gap} style={w ? {width: `${w}%`} : undefined} />)}</div>
                    <p className={s.adFoot}>experience...., skills.....</p>
                </div>
                <figcaption className={s.cap}>One of this week’s job ads. The title and the employer are as posted.</figcaption>
            </figure>
            <div className={s.col}>
                <p className={s.lead}>This week, {ELD.ad.employer} advertised a job called <b>{ELD.ad.title}</b>. It got us curious about the state of software jobs.</p>
                <p>If you’re looking for your first software job, you’ve probably heard that jobs like this are disappearing.</p>
                <p>AI writes more of the code now, the story goes, and the bottom steps of the ladder are going.</p>
                <p>It isn’t only a mood. Stanford researchers found that employment of 22 to 25 year olds in the jobs most exposed to AI is {ELD.stanford.pct}% below where it
                    would be had it kept pace with their peers.</p>
                <p className={s.srcline}><a href={ELD.stanford.url}>{ELD.stanford.cite}</a></p>
                <p>We decided to investigate. Glassbox counts public job ads every week, so we looked at that data. Here&apos;s what we found.</p>
            </div>
        </section>
    );
}

function GuessFirst() {
    return (
        <section className={s.guess}>
            <div className={s.col}>
                <p className={s.lead}>Out of every 100 software jobs advertised this week, how many do you think were entry level?</p>
                <p className={s.hint}>Tap or drag one person across the people to set your guess. Or keep scrolling, and we’ll show our count anyway.</p>
            </div>
            <figure className={s.guessfig}>
                <Guess ours={PER_100} revealAt={"eld-step-2"}
                       after={<StoryCvAsk story={story} className={s.midAsk} place={"story_is_entry_level_dead_guess"} question={GUESS_ASK} />}>
                    {PER_100} of every 100 software jobs advertised this week were entry level: {fmt(ELD.entry)} of the {fmt(ELD.jobs)}.
                </Guess>
                <figcaption className={s.gwrap}>
                    <p className={s.cap}>Each drawn person is 1 of every 100 software jobs advertised this week. Your picks get a pen ring. Our count, {PER_100} of the 100,
                        raises a hand and turns lime. Software jobs are the five software families on the entry level page: software engineering, backend, frontend, full
                        stack and mobile.</p>
                    {src}
                </figcaption>
            </figure>
        </section>
    );
}

function Ending() {
    const heads = [HEADS.up, HEADS.grad, HEADS.intern, HEADS.beard];
    return (
        <section className={cn(s.col, s.end)}>
            <h2>So, is entry level dead?</h2>
            <p className={s.lead}>Short answer: <b>No</b>, at least not in what we counted.</p>
            <p>To be honest, the bottom step is thin: about 1 in {ONE_IN} software jobs. And our count is young, three weeks so far. It&apos;s a starting point though.</p>
            <p>That’s the bottom step, as advertised this week. How does it compare with what you’re seeing?</p>
            <div className={s.cta}>
                <div className={s.endchar} aria-hidden dangerouslySetInnerHTML={{__html: ending()}} />
                <StoryCvAsk story={story} className={s.ask} question={"Thanks for reading. Curious where your own CV stands against this week\u2019s jobs?"} />
            </div>
            <LiveLine story={story} className={s.live} short />
            <section className={s.fold} aria-labelledby={"eld-fold"}>
                <h3 id={"eld-fold"}>What we can’t see</h3>
                <ul>
                    <li>We count job ads, not hires or applicants. A role posted twice by one employer counts once.</li>
                    <li>About {ELD.boards} company boards, picked by hand, lean US, AI companies and senior roles; {ELD.gradBoards} of them were added because they post
                        graduate and intern jobs. Small employers and many countries are missing.</li>
                    <li>Entry level means: an intern, graduate or junior title, or an ad that asks for 2 years or fewer and isn’t senior.</li>
                    <li>Skills are matched by fixed rules against a list of about 250, not by a language model.</li>
                    <li>{cap(inWords(ELD.weeks.length))} weeks are not a trend. Our collection is still filling up.</li>
                </ul>
            </section>
            <details className={s.method} id={"method"}>
                <summary>How we counted</summary>
                {HOW.entry.map((p) => <p key={p}>{p}</p>)}
                <p>{readLine(ELD.readable, ELD.entry)}</p>
                <Scope />
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
            <p className={s.credit}>Photos: <a href={"https://www.pexels.com/license/"}>Pexels</a>, by {heads.map((h, i) => (
                <React.Fragment key={h.file}>{i ? (i === heads.length - 1 ? " and " : ", ") : ""}<a href={h.page}>{h.by}</a></React.Fragment>))}. Drawings: Glassbox.</p>
        </section>
    );
}

export default function IsEntryLevelDead({fonts}: {fonts: string}) {
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            {/* The photo heads' clip paths, once for every overlay and the ending. */}
            <svg width={0} height={0} style={{position: "absolute"}} aria-hidden dangerouslySetInnerHTML={{__html: DEFS}} />
            <Crumbs story={story} className={s.crumbs} />
            <section className={cn(s.hero, s.col)}>
                <h1>{story.title}</h1>
                <p className={s.dek}>We sorted this week’s {fmt(ELD.jobs)} software jobs into a ladder, and looked at the bottom step.</p>
                <p className={s.by}>By the Glassbox team · the week of {week}</p>
                <LiveLine story={story} className={s.live} />
            </section>
            <Opening />
            <GuessFirst />
            <Ladder steps={STEPS} card={CARD} />
            <Ending />
            <OpenMethod />
        </StoryPage>
    );
}
