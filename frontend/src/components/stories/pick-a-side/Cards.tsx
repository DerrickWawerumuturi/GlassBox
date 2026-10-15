'use client'

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";

import t from "@/components/stories/story.module.css";
import {storyInteracted} from "@/lib/analytics";
import {Card as CardData, card as cardFor, lean, Lean, PICK} from "@/lib/stories/pick-a-side";
import {list} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import {Face} from "./Face";
import {RING_PATH} from "./icons";
import s from "./pick.module.css";
import {ScratchPanel} from "./scratch";

/*
 * The game: guess a side under a card, scratch its panel, and the two
 * numbers show. One table for the page, so "Reveal all" and the tally see every card.
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
    // Stable actions: a card's panel is set up once per card, not again on every pick elsewhere on the table.
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

function Seat({c, delay}: {c: CardData; delay: number}) {
    const {guess, shown, pick, reveal} = useTable();
    const g = guess[c.key], open = Boolean(shown[c.key]);
    const canvas = useRef<HTMLCanvasElement>(null), panel = useRef<ScratchPanel | null>(null);

    useEffect(() => {
        const cv = canvas.current;
        if (open || !cv) return;
        panel.current = new ScratchPanel(cv, () => reveal(c.key));
        const watch = new ResizeObserver(() => panel.current?.resized());
        watch.observe(cv.parentElement!);
        return () => { watch.disconnect(); panel.current = null; };
    }, [open, c.key, reveal]);

    const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (open) return;
        e.preventDefault();
        storyInteracted("pick-a-side", "scratch");
        if (reduced()) return reveal(c.key);
        panel.current?.start(e);
    };
    const said = open ? outcome(c, g) : null;
    const scratch = (
        <canvas ref={canvas} className={cn(s.scratch, open && s.gone)} tabIndex={open ? -1 : 0} role={"button"} aria-hidden={open || undefined}
                aria-label={`Scratch panel over the two numbers for ${c.name}. Rub it with a finger or the mouse, or press Enter, to show them.`}
                onPointerDown={down} onPointerMove={(e) => panel.current?.move(e)}
                onPointerUp={() => panel.current?.stop()} onPointerCancel={() => panel.current?.stop()} onLostPointerCapture={() => panel.current?.stop()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); storyInteracted("pick-a-side", "scratch"); reveal(c.key); } }} />
    );
    return (
        <article className={cn(s.seat, open && s.shown)} style={{"--d": `${delay}ms`} as React.CSSProperties} aria-label={c.name}>
            <div className={s.pc}><div className={s.flip}><Face c={c} panel={scratch} hidden={!open} /><div className={s.back} /></div></div>
            {/* The two betting spots, printed on the felt under the card. */}
            <div className={s.bet}>
                <p className={s.ask} hidden={open}>{g ? "Now scratch the panel." : "Which side names it more? Tap one."}</p>
                <div className={s.spots}>
                    {(["entry", "senior"] as const).map((side) => (
                        <button key={side} type={"button"} className={s.spot} aria-pressed={g === side} disabled={open} onClick={() => { storyInteracted("pick-a-side", "pick_side"); pick(c.key, side); }}>
                            {side === "entry" ? "Entry level" : "Senior"}
                            <svg className={s.ring} viewBox={"0 0 120 50"} preserveAspectRatio={"none"} aria-hidden>
                                <path d={RING_PATH} fill={"none"} stroke={"var(--pen)"} strokeWidth={2.6} strokeLinecap={"round"} />
                            </svg>
                        </button>
                    ))}
                </div>
                <p className={s.out} aria-live={"polite"}>{said && <><span className={t.sr}>{said.said}</span>{said.way}</>}</p>
            </div>
        </article>
    );
}

/**
 * Cards dealt where a beat asks for them, on one table (a wooden rail round
 * green baize): face down, each turning over as the table scrolls into view.
 */
export function Deal({keys}: {keys: string[]}) {
    const {shown} = useTable();
    const ref = useRef<HTMLDivElement>(null);
    const [dealt, setDealt] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || reduced() || !("IntersectionObserver" in window)) return setDealt(true);
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDealt(true); io.disconnect(); } }, {threshold: .2});
        io.observe(el);
        return () => io.disconnect();
    }, []);
    // "Reveal all" turns a table over even before the reader scrolls to it.
    const up = dealt || keys.every((k) => shown[k]);
    return (
        <div className={s.rail}>
            <div ref={ref} className={cn(s.felt, s.deal, up && s.in)}>
                {keys.map((k, i) => <Seat key={k} c={cardFor(k)} delay={i * 140} />)}
            </div>
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
                ? "No sides picked yet. Tap a side under a card and scratch it, and the count of your picks appears here. It counts the way the jobs lean, not you."
                : <>You picked a side on <b>{picked.length}</b> of the {leaning.length} cards that lean one way, and <b>{matched}</b> of your picks went the way the jobs lean.{neither}</>}
        </p>
    );
}
