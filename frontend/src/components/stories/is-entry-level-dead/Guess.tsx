'use client'

import React, {useEffect, useMemo, useRef, useState} from "react";

import {storyInteracted} from "@/lib/analytics";
import {cn} from "@/lib/utils";
import s from "./eld.module.css";
import {guessOurs, guessRest, guessRings} from "./people";

/*
 * Guess first: 100 tiny drawn people, one for each of every 100 software jobs.
 * Tap or drag across them, or use the keys (it is a slider), and each pick
 * gets a pen ring; "Show our count" raises our count's hands in lime and
 * shows the sentence (`children`, written by the server). Skippable: the
 * first ladder step coming into view (`revealAt`) shows it anyway, which is
 * not a reader's use, so only the reader's own moves report story_interacted.
 */

export default function Guess({ours, revealAt, after, children}: {ours: number; revealAt: string; after?: React.ReactNode; children: React.ReactNode}) {
    const [guess, setGuess] = useState(0);
    const [shown, setShown] = useState(false);
    const [drag, setDrag] = useState(false);
    const answer = useRef<HTMLParagraphElement>(null);
    const rest = useMemo(() => guessRest(ours), [ours]);
    const said = guess ? `${guess} of 100` : "";

    const pick = (n: number) => { storyInteracted("is-entry-level-dead", "guess"); setGuess(Math.max(0, Math.min(100, n))); };
    const show = () => { storyInteracted("is-entry-level-dead", "show_count"); setShown(true); requestAnimationFrame(() => answer.current?.focus()); };

    useEffect(() => {
        const at = document.getElementById(revealAt);
        if (!at || shown) return;
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown(true); }, {threshold: .2});
        io.observe(at);
        return () => io.disconnect();
    }, [revealAt, shown]);

    // The person under the pointer, from the grid's own box: ten across, ten down.
    const cellAt = (e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect(), col = Math.floor((e.clientX - r.left) / r.width * 10), row = Math.floor((e.clientY - r.top) / r.height * 10);
        return col < 0 || col > 9 || row < 0 || row > 9 ? -1 : row * 10 + col;
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
            <div className={s.grid} role={"slider"} tabIndex={0} aria-valuemin={0} aria-valuemax={100} aria-valuenow={guess}
                 aria-valuetext={shown ? `${said || "no guess"}; our count is ${ours} of 100` : said || "no guess yet"} aria-disabled={shown || undefined}
                 aria-label={"Your guess: how many of 100 software jobs are entry level. Arrow keys change it by one, Page Up and Page Down by ten, Enter shows our count."}
                 onPointerDown={down} onPointerMove={move} onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)} onKeyDown={key}>
                <svg viewBox={"0 0 400 400"} aria-hidden focusable={"false"}>
                    <g dangerouslySetInnerHTML={{__html: guessOurs(ours, shown)}} />
                    <g dangerouslySetInnerHTML={{__html: rest}} />
                    <g dangerouslySetInnerHTML={{__html: guessRings(guess)}} />
                </svg>
            </div>
            <p className={s.cue}>
                {!shown && <button type={"button"} className={s.ghost} onClick={show}>Show our count</button>}
                <span className={cn(s.note, s.yousaid)} aria-hidden>{shown && guess ? `you said ${guess}` : ""}</span>
            </p>
            <div aria-live={"polite"}>
                <p ref={answer} className={s.reveal} tabIndex={-1} hidden={!shown}>
                    <span className={s.big}>{ours}.</span><span>{children}</span>
                </p>
            </div>
            {/* The CV ask, once the reader has met the count: the moment they are paying most attention (20 Oct: no reader clicked the ending's ask). */}
            {shown && after}
        </div>
    );
}
