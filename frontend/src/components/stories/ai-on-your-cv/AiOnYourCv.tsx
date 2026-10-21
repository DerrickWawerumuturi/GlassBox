import React from "react";
import Link from "next/link";

import {HOW} from "@/components/market-page/StoryEnd";
import OpenMethod from "@/components/stories/OpenMethod";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {Crumbs, LiveLine, Scope, StoryPage} from "@/components/stories/StoryParts";
import {AI_JOBS, AI_ON_YOUR_CV, AIC, countOf, drawn, fam, fmt, MIN_SHARE, OURS, pct, PER, shareOf} from "@/lib/stories/ai-on-your-cv";
import {IS_ENTRY_LEVEL_DEAD} from "@/lib/stories/is-entry-level-dead";
import {inWords, list, storyPath, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import t from "../story.module.css";
import s from "./aic.module.css";
import {doorPage, PHOTOGRAPHERS, WOOD} from "./doors";
import Guess from "./Guess";
import Intro from "./Intro";
import i from "./intro.module.css";
import Listing from "./Listing";
import {DEFS, HEADS} from "./people";
import Street, {Step} from "./Street";

/*
 * "Do you need AI on your CV now?" (AI), after the approved prototype
 * (docs/local/editorial-sprint/stories/ai-on-your-cv, founder, 21 Oct 2026):
 * one real ad among real doors, a guess, then the week's job families as a
 * street of drawn buildings, every window a person, lime where the job names
 * LLMs; the camera walks to the AI door, the lamp post, two doors by level and
 * the quiet door. Every number is the week's (lib/stories/ai-on-your-cv.ts);
 * the words are written from them. Server rendered; the opening's camera, the
 * guess and the street's drawing are the client parts.
 */

const story = AI_ON_YOUR_CV, week = storyWeek(story);
/** The asks inside the story and at its end. The sheet counts the story's AI skills on a CV, so none claims a count of jobs. */
export const GUESS_ASK = "That’s the count. Curious which AI skills are already on your CV?";
export const STREET_ASK = "Whichever door is yours, curious which AI skills are already on your CV?";
export const END_ASK = "Curious which AI skills, LLMs among them, are already on your CV?";

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const name = (key: string) => fam(key).sign.join(" ");
const [ai, ml, se, devops, emb] = ["ai", "machine_learning", "software_engineering", "devops", "embedded"].map(fam);
const {entry, senior} = AIC.levels, {opening, elastic, airbnb, qualinx} = AIC;
const langs = AIC.languages.map((n) => pct(n, AI_JOBS));
const notAi = (ad: typeof opening) => ad.required.filter((k) => !ad.lime.includes(k));

const src = <p className={s.src}>Source: Glassbox count, week of {week} · LLMs: the ad names large language models or a close term on our list · <a href={"#method"}>how we count</a></p>;
const Sr = ({children}: {children: React.ReactNode}) => <p className={t.sr}>{children}</p>;
const signs = AIC.families.map((f) => `${name(f.key)} ${f.jobs < MIN_SHARE ? countOf(f) : shareOf(f)}`).join(", ");

const STEPS: Step[] = [
    {k: 2, body: <>
        <p className={s.lead}>It depends which door you walk through.</p>
        <p>{pct(ai.llm, ai.jobs)}% of AI jobs name LLMs ({countOf(ai)}). In machine learning, {shareOf(ml)}.</p>
        <p>In software engineering, {shareOf(se)}. In DevOps, {shareOf(devops)}. In embedded jobs, {shareOf(emb)}.</p>
        <StoryCvAsk story={story} className={s.midAsk} place={"story_ai_on_your_cv_street"} question={STREET_ASK} />
        <Sr>Graphic: a street of {AIC.families.length} drawn buildings, one per job family, sorted from the loudest ask for LLMs to the quietest. Every window holds a
            drawn person for {PER} jobs, rounded; the windows of jobs that name LLMs are lit lime. Each sign carries its share and its count: {signs}.</Sr>
    </>},
    {k: 3, card: <Listing ad={elastic} />, body: <>
        <p>Here’s the odd part. {langs[0]}% of AI jobs don’t name a single programming language ({fmt(AIC.languages[0])} of {fmt(AI_JOBS)}).</p>
        <p>{elastic.employer}’s {elastic.title} asks for LLMs and technical writing. {list(elastic.nice.slice(0, 2))} are only nice to have.</p>
        <Sr>Graphic: the AI door opens and its {drawn(AI_JOBS)} drawn people step onto the pavement in four groups, one laptop per programming language their ad
            names: {langs[0]}% of AI jobs name none ({fmt(AIC.languages[0])} of {fmt(AI_JOBS)}), {langs[1]}% one ({AIC.languages[1]}), {langs[2]}% two
            ({AIC.languages[2]}), {langs[3]}% three or more ({AIC.languages[3]}). The {elastic.employer} listing is pinned on the door.</Sr>
    </>},
    {k: 4, card: <Listing ad={airbnb} />, body: <>
        <p>AI is leaking into jobs that aren’t about AI. {airbnb.employer}’s “{airbnb.title}” lists {airbnb.required.length} required skills.
            {" "}{cap(inWords(airbnb.lime.length))} of them are AI: {list(airbnb.lime)}.</p>
        <Sr>Graphic: a notice board on a lamp post at the end of the street, between the doors, with the {airbnb.employer} listing pinned on it: {airbnb.title},
            {" "}{airbnb.required.length} required skills, {list(airbnb.lime)} lit lime.</Sr>
    </>},
    {k: 5, body: <>
        <p>And it’s asked more of senior engineers than of beginners: LLMs in {pct(entry.llm, entry.jobs)}% of entry level software jobs ({countOf(entry)}), and in
            {" "}{pct(senior.llm, senior.jobs)}% of senior ones ({countOf(senior)}).</p>
        <Sr>Graphic: two doors, entry level and senior. In front of the entry level door, {drawn(entry.jobs)} drawn people for {fmt(entry.jobs)} jobs, {drawn(entry.llm)} lime
            for the {entry.llm} that name LLMs. In front of the senior door, {drawn(senior.jobs)} drawn people for {fmt(senior.jobs)} jobs, {drawn(senior.llm)} lime for
            the {senior.llm} that name LLMs.</Sr>
    </>},
    {k: 6, card: <Listing ad={qualinx} />, body: <>
        <p>Where it’s quiet. {pct(emb.llm, emb.jobs)}% of embedded jobs name LLMs ({countOf(emb)}).</p>
        <p>{qualinx.employer}’s {qualinx.title} asks for {list([...qualinx.required.slice(1), qualinx.required[0]])}. Nothing AI.</p>
        <Sr>Graphic: the embedded door opens; its {drawn(emb.jobs)} drawn people stand on the pavement, one of them lime with a pen ring: {pct(emb.llm, emb.jobs)}% of
            embedded jobs name LLMs, {countOf(emb)}. The {qualinx.employer} listing is pinned on the door.</Sr>
    </>},
    {k: 7, body: <>
        <p className={s.lead}>So, do you need AI on your CV? Some doors ask loudly, others barely mention it.</p>
        <Sr>Graphic: the whole street again, every building with its share and count; a woman stands at the AI door, a man at the embedded door.</Sr>
    </>},
];

function GuessFirst() {
    return (
        <section className={s.guess}>
            <div className={s.col}>
                <p className={s.lead}>Out of every 100 software engineering jobs advertised this week, how many name LLMs?</p>
                <p className={s.hint}>Drag up the building to light its windows, or tap one. Or keep scrolling, and we’ll show our count anyway.</p>
            </div>
            <figure className={s.guessfig}>
                <Guess ours={OURS} revealAt={"aic-step-2"}
                       after={<StoryCvAsk story={story} className={s.midAsk} place={"story_ai_on_your_cv_guess"} question={GUESS_ASK} />}>
                    of the software engineering jobs advertised this week name LLMs: {fmt(se.llm)} of the {fmt(se.jobs)} ads we could read.
                </Guess>
                <figcaption className={s.gwrap}>
                    <p className={s.cap}>Each window is 1 of every 100 software engineering jobs advertised this week. The windows you light get a pen ring. Our count,
                        {" "}{OURS} of the 100, lights lime. LLMs means the ad names large language models, or a close term on our list, as required or preferred.</p>
                    {src}
                </figcaption>
            </figure>
        </section>
    );
}

/** The photographers, linked to their photos: the doors (the first door of each), then the heads. */
function Credits() {
    const doors = PHOTOGRAPHERS, heads = Object.values(HEADS);
    const sep = (k: number, n: number) => (k ? (k === n - 1 ? " and " : ", ") : "");
    return (
        <p className={s.credit}>
            Door photos: <a href={"https://www.pexels.com/license/"}>Pexels</a>, by {doors.map((d, k) => (
                <React.Fragment key={d.by}>{sep(k, doors.length)}<a href={doorPage(d)}>{d.by}</a>{d === WOOD ? " (the wooden door)" : ""}</React.Fragment>))}.
            {" "}Photo heads: <a href={"https://www.pexels.com/license/"}>Pexels</a>, by {heads.map((h, k) => (
                <React.Fragment key={h.file}>{sep(k, heads.length)}<a href={h.page}>{h.by}</a></React.Fragment>))}. Drawings: Glassbox. Sign lettering: Tilt Neon (OFL).
        </p>
    );
}

function Ending() {
    return (
        <section className={cn(s.col, s.end)}>
            <h2>Which door are you standing at?</h2>
            <p className={s.lead}>AI is a skill some doors ask for loudly and others barely mention.</p>
            <p>One week of job ads, counted door by door: that is where LLMs are named, and where they barely appear.</p>
            <div className={s.cta}><StoryCvAsk story={story} className={s.ask} question={END_ASK} /></div>
            <LiveLine story={story} className={s.live} short />
            <section className={s.fold} aria-labelledby={"aic-fold"}>
                <h3 id={"aic-fold"}>What we can’t see</h3>
                <ul>
                    <li>A named skill isn’t a hiring rule. We count what ads name, required or preferred.</li>
                    <li>Our boards lean towards AI companies, which pushes these shares up.</li>
                    <li>“LLMs” means the ad names large language models or a close term on our list, not that the job builds them.</li>
                    <li>One week’s count. Not a trend.</li>
                </ul>
            </section>
            <details className={s.method} id={"method"}>
                <summary>How we counted</summary>
                <p>Each building is one job family. {HOW.role[0]}</p>
                <p>LLMs is one skill on our list: the ad names large language models, or a close term such as generative AI or prompt engineering, whether as required,
                    preferred or in passing. Every count here is of the ads long enough to read, and one drawn person is {PER} of them, rounded.</p>
                <p>The two doors by level count the software jobs on the entry level page. {HOW.entry.join(" ")}</p>
                <Scope />
                <p><Link href={"/method"}>How Glassbox counts.</Link></p>
            </details>
            <aside className={s.next}>
                <p className={s.lcKick}>Chapter one</p>
                <p className={s.lcTitle}><Link href={storyPath(IS_ENTRY_LEVEL_DEAD)}>{IS_ENTRY_LEVEL_DEAD.title}</Link></p>
                <p className={s.lcSub}>We sorted this week’s software jobs onto a ladder and looked at the bottom step.</p>
            </aside>
            <Credits />
        </section>
    );
}

export default function AiOnYourCv({fonts}: {fonts: string}) {
    const beats = [
        <><p className={s.lead}>This week, {opening.employer}, a German timber and building supplies company, advertised a student software job.</p>
            <p>It asks for {[...notAi(opening), ...opening.lime].join(", ").replace(/, ([^,]+)$/, ", and $1")}.</p></>,
        <p className={s.lead}>If a timber merchant wants AI, does everyone? We counted.</p>,
        <p className={s.lead}>One door for each job family we count. From here on, we draw them.</p>,
    ];
    return (
        <StoryPage story={story} fonts={fonts} className={s.root}>
            {/* The photo heads' clip paths, once for every overlay. */}
            <svg width={0} height={0} style={{position: "absolute"}} aria-hidden dangerouslySetInnerHTML={{__html: DEFS}} />
            <Crumbs story={story} className={s.crumbs} />
            <section className={cn(s.hero, s.col)}>
                <h1>{story.title}</h1>
                <p className={s.dek}>“Learn AI” is the loudest advice in tech. We counted which job ads actually ask for it.</p>
                <p className={s.by}>By the Glassbox team · the week of {week}</p>
                <LiveLine story={story} className={s.live} />
            </section>
            <Intro card={<Listing ad={opening} where={"Job listing, taped up on the wall beside the door"} className={i.woodCard} />} beats={beats} />
            <GuessFirst />
            <Street steps={STEPS} src={src} />
            <Ending />
            <OpenMethod />
        </StoryPage>
    );
}
