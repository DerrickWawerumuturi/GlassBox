'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {useAskInView} from "@/components/cv-ask/StickyAsk";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {track} from "@/lib/analytics";
import {weekDay} from "@/lib/market-page";
import {Ask, familyAskSkills, stickyShows, StickyContext} from "@/lib/cv-ask";
import {adAsks, adFor, askRows, CYCLE, familyOrder, getLook, Level, LEVELS, Look, lookJobs} from "@/lib/landing/look";
import {COPY, FAMILY_LABEL} from "./copy";
import CountCard from "./CountCard";
import CvSection, {PreviewAsk} from "./CvSection";
import GlassSection from "./GlassSection";
import LowerSections from "./LowerSections";
import Showcase from "./Showcase";
import StickyCta from "./StickyCta";
import {useHave} from "./useHave";
import {useReducedMotion, useStepper} from "./useStepper";
import Wall from "./Wall";
import "./landing.css";

/*
 * The landing page, "Look around first" (docs/local/look-around-prototype.html,
 * round 3; the founder's picks in docs/changelog/2026-10-05-landing-look-around.md).
 * This week's published count, the jobs behind it, a job ad on the glass,
 * then the CV. The CV is asked as a question about what the visitor just
 * looked at (docs/decisions/cv-ask.md): in the count card, inside, the closing
 * section, and a sticky line while none of those is on screen. After a scan
 * the page lights up with what the visitor's own scan found, never a simulation.
 */

const H = COPY.hero;
const cap = (f: string) => { const l = FAMILY_LABEL[f] ?? f; return l === "QA" || l === "DevOps" ? l : l[0].toUpperCase() + l.slice(1); };

export default function LookAround({initial}: {initial?: Look}) {
    const [look, setLook] = useState<Look | null>(initial ?? null);
    const [failed, setFailed] = useState(false);
    const reduce = useReducedMotion();
    const scan = useCvScan();

    useEffect(() => {
        if (initial) return;
        const controller = new AbortController();
        getLook(controller.signal).then(setLook).catch((e) => { if (!controller.signal.aborted) { console.error(e); setFailed(true); } });
        return () => controller.abort();
    }, [initial]);

    // The visitor's own skills, from their scan: the only thing the page lights up with.
    const have = useHave();

    // The main ten step on their own; the rest wait behind "More" until picked.
    const families = useMemo(() => (look ? familyOrder(look) : []), [look]);
    const main = useMemo(() => families.filter((f) => CYCLE.includes(f)), [families]);
    const more = useMemo(() => families.filter((f) => !CYCLE.includes(f)), [families]);
    const [extra, setExtra] = useState<string | null>(null);
    const [hover, setHover] = useState(false);
    const [glassHeld, setGlassHeld] = useState(false);
    const stepper = useStepper({steps: Math.max(1, main.length * LEVELS.length), held: hover || glassHeld || scan.scanning || scan.isOpen, reduce});
    const cycleFamily = main[Math.floor(stepper.step / LEVELS.length)] ?? "backend";
    const family = extra ?? cycleFamily;
    const level: Level = LEVELS[stepper.step % LEVELS.length];
    const pick = useCallback((f: string, l: Level) => {
        if (main.includes(f)) {
            setExtra(null);
            stepper.jump(main.indexOf(f) * LEVELS.length + LEVELS.indexOf(l));
        } else {
            // One of the others: it stays until the visitor picks again or presses play.
            setExtra(f);
            stepper.jump(main.indexOf(cycleFamily) * LEVELS.length + LEVELS.indexOf(l));
            stepper.setPlaying(false);
        }
    }, [main, cycleFamily, stepper]);
    const setPlaying = useCallback((p: boolean) => { if (p) setExtra(null); stepper.setPlaying(p); }, [stepper]);

    // The sticky ask: once the hero is scrolled past, while no other ask is on screen.
    const [pastHero, setPastHero] = useState(false);
    const askInView = useAskInView(look);
    // The last of the count and the glass the visitor looked at, for the sticky bar's question.
    const [lastSeen, setLastSeen] = useState<"look" | "glass" | null>(null);
    const heroRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), {threshold: 0});
        if (heroRef.current) observer.observe(heroRef.current);
        const sections = new IntersectionObserver((entries) => entries.forEach((e) => {
            if (e.isIntersecting) setLastSeen((e.target as HTMLElement).id === "glass" ? "glass" : "look");
        }), {threshold: 0.4});
        ["look", "glass"].forEach((id) => { const el = document.getElementById(id); if (el) sections.observe(el); });
        return () => { observer.disconnect(); sections.disconnect(); };
    }, [look]);

    // Pause while the pointer or focus is inside the count or the glass.
    const hoverProps = {
        onPointerEnter: () => setHover(true), onPointerLeave: () => setHover(false),
        onFocus: () => setHover(true), onBlur: (e: React.FocusEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); },
    };

    // Today's first ad's asks from the start, so the closing preview is in the server HTML too.
    const [asks, setAsks] = useState<{list: PreviewAsk[]; family: string}>(() => {
        const f = initial ? familyOrder(initial).find((x) => CYCLE.includes(x)) ?? "backend" : "backend";
        const data = initial?.families[f];
        return {family: f, list: data ? askRows(adAsks(adFor(data, "junior"), initial.skills), data)
            .map((r) => ({key: r.key, name: initial.skills[r.key] ?? r.name, n: r.n})) : []};
    });
    const onAsks = useCallback((list: PreviewAsk[], f: string) => setAsks({list, family: f}), []);
    // What each ask is about: a job type's 10 most asked skills, or the asks in the ad on the glass.
    const familyAsk = useCallback((f: string): Ask | null => {
        const data = look?.families[f];
        if (!look || !data) return null;
        const label = FAMILY_LABEL[f] ?? f;
        return {skills: familyAskSkills(data, look.skills), what: `skills ${label} jobs ask for most`, jobs: data.readable, subject: label};
    }, [look]);
    const countAsk = familyAsk(family);
    const adAsk: Ask | null = countAsk && asks.list.length
        ? {...countAsk, skills: asks.list.map((a) => ({key: a.key, name: a.name})), what: "asks in this ad"} : null;
    const onAd = lastSeen === "glass" && adAsk !== null;
    const cvAsk = (where: "sticky" | "closing" | "inside" | "count", ask: Ask | null) => () => { track("cta_clicked", {where}); scan.open(ask); };

    const stickyContext: StickyContext | null = onAd ? {kind: "ad", n: asks.list.length} : countAsk ? {kind: "count", ask: countAsk} : null;
    const stickyOn = stickyShows({past: pastHero, askInView, sheetOpen: scan.isOpen, scanning: scan.scanning, answered: have !== null});

    const nextFamily = stepper.step % LEVELS.length === LEVELS.length - 1 ? main[(main.indexOf(cycleFamily) + 1) % main.length] : null;
    const state = !stepper.playing ? COPY.count.stopped : glassHeld ? COPY.count.pausedAd : hover ? COPY.count.paused
        : COPY.count.next(nextFamily ? `${cap(nextFamily)}, junior` : `${cap(family)}, ${["junior", "mid level", "senior"][LEVELS.indexOf(level) + 1]}`);

    return (
        <main className={`la desk ${have ? "cv-on" : ""}`}>
            <div className={"wrap"}>
                <header className={"hero"} ref={heroRef}>
                    <div className={"kick"}>{H.eyebrow(look ? lookJobs(look).toLocaleString("en") : null)}</div>
                    <h1>{H.title}</h1>
                    <p className={"lede"}>{H.lede}</p>
                </header>

                <section className={"blk"} id={"look"} aria-labelledby={"hiring-h"} {...hoverProps}>
                    <div className={"sec-hd"}>
                        <div className={"chapter on"}><span className={"n"}>01</span><h2 id={"hiring-h"}>{COPY.hiring.title}</h2></div>
                        <p className={"sec-line"}>{COPY.hiring.line}</p>
                    </div>
                    {!look ? (
                        // Only when the server render couldn't get this week's count: the shape, never blank space.
                        <div className={"look"} aria-busy={!failed}>
                            <div className={"card skel"} style={{height: 560}}>{failed && <p className={"sub"}>{COPY.count.unavailable}</p>}</div>
                            <div className={"card skel"} style={{height: 560}} />
                        </div>
                    ) : (
                            <div className={"look"}>
                                <div>
                                    <CountCard families={main} more={more} data={look.families} family={family} level={level} date={weekDay(look)}
                                               onPick={pick} subscribe={stepper.subscribe} playing={stepper.playing} onPlaying={setPlaying}
                                               state={state} reduce={reduce} ask={countAsk!} scanning={scan.scanning} onFind={cvAsk("count", countAsk)} />
                                </div>
                                <div>
                                    <Wall family={family} data={look.families[family]} level={level} reduce={reduce} />
                                </div>
                            </div>
                    )}
                </section>
                {look && (
                    <>
                        <div {...hoverProps}>
                            <GlassSection look={look} family={family} level={level} have={have} subscribe={stepper.subscribe}
                                          onHold={setGlassHeld} onAsks={onAsks} reduce={reduce} />
                        </div>
                        <Showcase look={look} reduce={reduce} onCv={cvAsk("inside", countAsk)} />
                        <CvSection asks={asks.list} data={look.families[asks.family] ?? look.families[family]} have={have}
                                   scanning={scan.scanning} onCv={cvAsk("closing", familyAsk(asks.family) ?? countAsk)} />
                    </>
                )}
                <LowerSections look={look} />
            </div>
            {stickyContext && <StickyCta show={stickyOn} context={stickyContext} onFind={cvAsk("sticky", onAd ? adAsk : countAsk)} />}
            {scan.sheet}
        </main>
    );
}
