'use client'

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";

import t from "@/components/stories/story.module.css";
import {storyInteracted} from "@/lib/analytics";
import {fmt} from "@/lib/market-page";
import {Card as CardData, card as cardFor, lean, Lean, PICK} from "@/lib/stories/pick-a-side";
import {list} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {ICON, RING_PATH} from "./icons";
import s from "./pick.module.css";
import {Foil} from "./scratch";

/*
 * The game: guess a side on a card, rub the foil off, and the two numbers
 * show. One table for the page, so "Reveal all" and the tally see every card.
 * Guesses live in memory for this visit only: nothing is stored or sent. The
 * first play in a page view is one story_interacted event, with no guess in it.
 */

type Side = "entry" | "senior";
type Table = {guess: Record<string, Side>; shown: Record<string, boolean>; pick: (k: string, side: Side) => void;
    reveal: (k: string) => void; revealAll: () => void};

const TableCtx = createContext<Table | null>(null);
const useTable = () => {
    const table = useContext(TableCtx);
    if (!table) throw new Error("useTable must be used inside <PickTable>");
    return table;
};

const LEAN: Record<Lean, string> = {entry: "entry level", senior: "senior", draw: "neither side"};
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PickTable({children}: {children: React.ReactNode}) {
    const [guess, setGuess] = useState<Record<string, Side>>({});
    const [shown, setShown] = useState<Record<string, boolean>>({});
    // Stable actions: a card's foil is set up once per card, not again on every pick elsewhere on the table.
    const pick = useCallback((k: string, side: Side) => setGuess((g) => ({...g, [k]: side})), []);
    const reveal = useCallback((k: string) => setShown((v) => (v[k] ? v : {...v, [k]: true})), []);
    const revealAll = useCallback(() => setShown(Object.fromEntries(PICK.deck.map((d) => [d.key, true]))), []);
    const table: Table = {guess, shown, pick, reveal, revealAll};
    return <TableCtx.Provider value={table}>{children}</TableCtx.Provider>;
}

/** What a revealed card says: both shares for a screen reader, which way it leans, and the reader's pick. */
function outcome(c: CardData, guess: Side | undefined) {
    const l = lean(c);
    const way = l === "draw" ? "A point apart. It leans to neither side." : `Leans to ${LEAN[l]}.`;
    const mine = !guess ? "" : l === "draw" ? ` You picked ${LEAN[guess]}.`
        : guess === l ? ` You picked ${LEAN[guess]}, the way the jobs lean.` : ` You picked ${LEAN[guess]}. The jobs lean the other way.`;
    return {said: `${c.e.share}% of entry level software jobs and ${c.s.share}% of senior software jobs name ${c.name}. `, way: way + mine};
}

function Card({c, delay}: {c: CardData; delay: number}) {
    const {guess, shown, pick, reveal} = useTable();
    const g = guess[c.key], open = Boolean(shown[c.key]);
    const lime = c.key === PICK.beats.lime, index = PICK.deck.indexOf(c);
    const canvas = useRef<HTMLCanvasElement>(null), foil = useRef<Foil | null>(null);

    useEffect(() => {
        const cv = canvas.current;
        if (open || !cv) return;
        foil.current = new Foil(cv, index * 977 + 13, () => reveal(c.key));
        const watch = new ResizeObserver(() => foil.current?.resized());
        watch.observe(cv.parentElement!);
        return () => { watch.disconnect(); foil.current = null; };
    }, [open, index, c.key, reveal]);

    const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (open) return;
        e.preventDefault();
        storyInteracted("pick-a-side", "scratch");
        if (reduced()) return reveal(c.key);
        foil.current?.start(e);
    };
    const said = open ? outcome(c, g) : null;
    const senior = c.s.jobs === null
        ? <><b>{c.s.share}%</b><small className={s.only}>share only</small></>
        : <><b>{c.s.share}%</b><small>{fmt(c.s.jobs)} jobs</small></>;
    return (
        <article className={cn(s.card, lime && s.lime)} style={{"--d": `${delay}ms`} as React.CSSProperties} aria-label={c.name}>
            <header className={s.cHead}>
                <h3>{c.name}</h3>
                <span className={s.coin} aria-hidden>
                    <svg viewBox={"0 0 28 28"} fill={"none"} stroke={"#1a1a1a"} strokeWidth={1.9} strokeLinecap={"round"} strokeLinejoin={"round"}
                         dangerouslySetInnerHTML={{__html: ICON[c.key] ?? ""}} />
                </span>
            </header>
            <p className={s.cSub}>named in</p>
            <p className={s.cAsk} hidden={open}>{g ? "Now rub the foil off." : "Which side names it more? Tap one."}</p>
            <div className={s.sides}>
                {(["entry", "senior"] as const).map((side) => (
                    <button key={side} type={"button"} className={s.side} aria-pressed={g === side} disabled={open} onClick={() => { storyInteracted("pick-a-side", "pick_side"); pick(c.key, side); }}>
                        {side === "entry" ? "Entry level" : "Senior"}
                        <svg className={s.ring} viewBox={"0 0 120 50"} preserveAspectRatio={"none"} aria-hidden>
                            <path d={RING_PATH} fill={"none"} stroke={"var(--pen)"} strokeWidth={2.6} strokeLinecap={"round"} />
                        </svg>
                    </button>
                ))}
            </div>
            <div className={s.panel}>
                <div className={s.nums} aria-hidden={!open}>
                    <div className={cn(s.num, s.entry)}><b>{c.e.share}%</b><small>{c.e.jobs} jobs</small></div>
                    <div className={cn(s.num, s.senior)}>{senior}</div>
                </div>
                <canvas ref={canvas} className={cn(s.foil, open && s.gone)} tabIndex={open ? -1 : 0} role={"button"} aria-hidden={open || undefined}
                        aria-label={`Foil over the two numbers for ${c.name}. Rub it with a finger or the mouse, or press Enter, to show them.`}
                        onPointerDown={down} onPointerMove={(e) => foil.current?.move(e)}
                        onPointerUp={() => foil.current?.stop()} onPointerCancel={() => foil.current?.stop()} onLostPointerCapture={() => foil.current?.stop()}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); storyInteracted("pick-a-side", "scratch"); reveal(c.key); } }} />
            </div>
            <p className={s.cDen}>of {fmt(PICK.readable)} entry level software jobs<br />of {fmt(PICK.senior)} senior software jobs</p>
            <p className={s.cEmp}>{c.employers ? `named by jobs at ${c.employers} employers` : "named by jobs at 10 or more employers"}</p>
            <p className={s.cOut} aria-live={"polite"}>{said && <><span className={t.sr}>{said.said}</span>{said.way}</>}</p>
            {lime && c.employers && <p className={cn(s.note, s.pen)} aria-hidden>at {c.employers} employers, so not one company&apos;s habit</p>}
        </article>
    );
}

/** Cards dealt where a beat asks for them: they slide onto the table as it scrolls into view. */
export function Deal({keys}: {keys: string[]}) {
    const ref = useRef<HTMLDivElement>(null);
    const [dealt, setDealt] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || reduced() || !("IntersectionObserver" in window)) return setDealt(true);
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDealt(true); io.disconnect(); } }, {threshold: .2});
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return (
        <div ref={ref} className={cn(s.deal, dealt && s.in)}>
            {keys.map((k, i) => <Card key={k} c={cardFor(k)} delay={i * 120} />)}
        </div>
    );
}

/** "Reveal all": turns every card over, for a reader who would rather read than play. */
export function RevealAll() {
    const {shown, revealAll} = useTable();
    const all = PICK.deck.every((d) => shown[d.key]);
    return <button type={"button"} className={s.ghost} disabled={all} onClick={() => { storyInteracted("pick-a-side", "reveal_all"); revealAll(); }}>{all ? "All revealed" : "Reveal all"}</button>;
}

/** The count of the reader's own picks against the way the jobs lean. Draws count for neither. */
export function Tally() {
    const {guess, shown} = useTable();
    const leaning = PICK.deck.filter((d) => lean(d) !== "draw"), draws = PICK.deck.filter((d) => lean(d) === "draw");
    const picked = leaning.filter((d) => shown[d.key] && guess[d.key]);
    const matched = picked.filter((d) => guess[d.key] === lean(d)).length;
    const neither = draws.length === 0 ? "" : ` ${list(draws.map((d) => d.name))} ${draws.length === 1 ? "is a point apart, so it goes" : "are a point apart, so they go"} to neither side.`;
    return (
        <p className={s.tally} aria-live={"polite"}>
            {picked.length === 0
                ? "No sides picked yet. Tap a side on a card and scratch it, and the count of your picks appears here. It counts the way the jobs lean, not you."
                : <>You picked a side on <b>{picked.length}</b> of the {leaning.length} cards that lean one way, and <b>{matched}</b> of your picks went the way the jobs lean.{neither}</>}
        </p>
    );
}
