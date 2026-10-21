'use client'

import React, {useEffect, useMemo, useRef, useState} from "react";

import {storyInteracted} from "@/lib/analytics";
import {cn} from "@/lib/utils";
import s from "./aic.module.css";
import {dimmer, facade, rings} from "./people";

/*
 * Guess first: a building of 100 windows, one for each of every 100 software
 * engineering jobs. Drag up it, tap a window, or use the keys (it is a
 * slider), and the windows up to the guess get a pen ring, counted from the
 * bottom; the dimmer beside it reads the guess. "Show our count" lights our
 * count's windows lime and shows the sentence (`children`, written by the
 * server). Skippable: the street coming into view (`revealAt`) shows it
 * anyway, which is not a reader's use, so only the reader's own moves report
 * story_interacted.
 */

export default function Guess({ours, revealAt, after, children}: {ours: number; revealAt: string; after?: React.ReactNode; children: React.ReactNode}) {
    const [guess, setGuess] = useState(0);
    const [shown, setShown] = useState(false);
    const [drag, setDrag] = useState(false);
    const answer = useRef<HTMLParagraphElement>(null);
    const building = useMemo(() => facade(shown, ours), [shown, ours]);
    const said = guess ? `${guess} of 100` : "";

    const pick = (n: number) => { storyInteracted("ai-on-your-cv", "guess"); setGuess(Math.max(0, Math.min(100, n))); };
    const show = () => { storyInteracted("ai-on-your-cv", "show_count"); setShown(true); requestAnimationFrame(() => answer.current?.focus()); };

    useEffect(() => {
        const at = document.getElementById(revealAt);
        if (!at || shown) return;
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown(true); }, {threshold: .2});
        io.observe(at);
        return () => io.disconnect();
    }, [revealAt, shown]);

    // The window under the pointer, from the grid's own box, counted from the bottom left.
    const cellAt = (e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect(), col = Math.floor((e.clientX - r.left) / r.width * 10), row = Math.floor((e.clientY - r.top) / r.height * 10);
        return col < 0 || col > 9 || row < 0 || row > 9 ? -1 : (9 - row) * 10 + col;
    };
    const down = (e: React.PointerEvent<HTMLDivElement>) => {
        if (shown) return;
        e.currentTarget.setPointerCapture(e.pointerId); setDrag(true);
        const i = cellAt(e);
        if (i >= 0) pick(i + 1);
        e.preventDefault();
    };
    const move = (e: React.PointerEvent<HTMLDivElement>) => { if (drag) { const i = cellAt(e); if (i >= 0) pick(i + 1); } };
    const key = (e: React.KeyboardEvent) => {
        if (shown) return;
        const d = ({ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10} as Record<string, number>)[e.key];
        if (d) pick(guess + d);
        else if (e.key === "Home") pick(0);
        else if (e.key === "End") pick(100);
        else if (e.key === "Enter" || e.key === " ") show();
        else return;
        e.preventDefault();
    };

    return (
        <div className={cn(s.gwrap, shown && s.shown)}>
            <p className={s.glab}>Your guess <b>{said || "none yet"}</b></p>
            <div className={s.grow}>
                <div className={s.grid} role={"slider"} tabIndex={0} aria-valuemin={0} aria-valuemax={100} aria-valuenow={guess}
                     aria-valuetext={shown ? `${said || "no guess"}; our count is ${ours} of 100` : said || "no guess yet"} aria-disabled={shown || undefined}
                     aria-label={"Your guess: how many of 100 software engineering jobs name LLMs. Arrow keys change it by one, Page Up and Page Down by ten, Enter shows our count."}
                     onPointerDown={down} onPointerMove={move} onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)} onKeyDown={key}>
                    <svg viewBox={"0 0 400 400"} aria-hidden focusable={"false"}>
                        <g dangerouslySetInnerHTML={{__html: building}} />
                        <g dangerouslySetInnerHTML={{__html: rings(guess)}} />
                    </svg>
                </div>
                <div className={s.dimmer} aria-hidden><svg viewBox={"0 0 70 400"} focusable={"false"} dangerouslySetInnerHTML={{__html: dimmer(guess)}} /></div>
            </div>
            <p className={s.cue}>
                {!shown && <button type={"button"} className={s.ghost} onClick={show}>Show our count</button>}
                <span className={cn(s.note, s.yousaid)} aria-hidden>{shown && guess ? `you said ${guess}` : ""}</span>
            </p>
            <div aria-live={"polite"}>
                <p ref={answer} className={s.reveal} tabIndex={-1} hidden={!shown}>
                    <span className={s.big}>{ours}%</span><span>{children}</span>
                </p>
            </div>
            {/* The CV ask, once the reader has met the count. */}
            {shown && after}
        </div>
    );
}
