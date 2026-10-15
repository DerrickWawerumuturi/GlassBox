'use client'

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";

import {storyInteracted} from "@/lib/analytics";
import {fmt} from "@/lib/market-page";
import {CONTENTS, NO_LANGUAGE} from "@/lib/stories/contents-may-vary";
import {cn} from "@/lib/utils";
import {packshot} from "./pack";
import s from "./cmv.module.css";

/*
 * The box: open it and the pieces fly out onto the counter, one per AI job we
 * could read; tap a line on the label and that many light up. One box for the
 * page, so the hero's "Open the box" and the counter's share it. The count
 * knows how many jobs name a skill, not which, so a line lights the first n
 * pieces and "no language" hatches the last n.
 */

const N = CONTENTS.readable, NONE = "none";
type Lit = string | null | undefined;
type Box = {opened: boolean; torn: boolean; lit: Lit; open: () => void; light: (k: string | null) => void; tear: () => void};
const BoxCtx = createContext<Box | null>(null);
const useBox = () => {
    const box = useContext(BoxCtx);
    if (!box) throw new Error("useBox must be used inside <BoxTable>");
    return box;
};
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const FIRST = CONTENTS.label.find((l) => l.jobs !== null)!.key;

export function BoxTable({children}: {children: React.ReactNode}) {
    const [opened, setOpened] = useState(false), [torn, setTorn] = useState(false), [lit, setLit] = useState<Lit>(undefined);
    const light = useCallback((k: string | null) => setLit(k), []);
    const done = useRef(false);
    const open = useCallback(() => {
        if (done.current) return;
        done.current = true;
        const pile = document.getElementById("cmv-pile"), hole = document.getElementById("cmv-hole");
        // Each piece starts at the mouth of the box and flies to its own cell (layout positions, not transformed ones).
        if (pile && hole && !reduced()) {
            const h = hole.getBoundingClientRect(), pr = pile.getBoundingClientRect();
            const hx = h.left + h.width / 2 - pr.left - pile.clientLeft, hy = h.top + h.height / 2 - pr.top - pile.clientTop;
            for (const p of Array.from(pile.children) as HTMLElement[]) {
                p.style.setProperty("--sx", `${(hx - p.offsetLeft - p.offsetWidth / 2).toFixed(0)}px`);
                p.style.setProperty("--sy", `${(hy - p.offsetTop - p.offsetHeight / 2).toFixed(0)}px`);
            }
            void pile.offsetWidth;
        }
        setOpened(true);
        // The headline line lights by itself once the pieces have landed, unless the reader picked one first.
        setTimeout(() => setLit((l) => (l === undefined ? FIRST : l)), reduced() ? 0 : 1500);
    }, []);
    const tear = useCallback(() => setTorn(true), []);
    return <BoxCtx.Provider value={{opened, torn, lit, open, light, tear}}>{children}</BoxCtx.Provider>;
}

/** The hero's pack shot. The lid tears when the hero's button is pressed. */
export function HeroPack() {
    const {torn} = useBox();
    return (
        <>
            <div className={cn(s.packshot, torn && s.torn)} aria-hidden>
                <svg viewBox={"0 0 400 480"} dangerouslySetInnerHTML={{__html: packshot("cmv", {lidFlat: s.lidFlat, lidTorn: s.lidTorn, pop: s.pop})}} />
            </div>
        </>
    );
}

/** "Open the box": in the hero it tears the lid, then goes to the counter and opens it there. */
export function OpenButton({hero = false}: {hero?: boolean}) {
    const {opened, open, tear} = useBox();
    const go = () => {
        storyInteracted("contents-may-vary", "open_box");
        if (!hero) return open();
        tear();
        setTimeout(() => {
            document.getElementById("counter")?.scrollIntoView({behavior: reduced() ? "auto" : "smooth", block: "start"});
            open();
        }, reduced() ? 0 : 650);
    };
    return <button type={"button"} className={s.open} disabled={opened} onClick={go}>{opened ? "Opened" : "Open the box"}</button>;
}

function Readout() {
    const {opened, lit} = useBox();
    const line = CONTENTS.label.find((l) => l.key === lit);
    return (
        <p className={s.readout} aria-live={"polite"}>
            {!opened ? `The box is closed. ${fmt(N)} pieces inside.`
                : lit === undefined ? `Opened. ${fmt(N)} pieces on the counter.`
                : lit === null ? <>Nothing lit. <b>{fmt(N)}</b> pieces, one per job we could read.</>
                : lit === NONE ? <><b>No programming language named</b>: {NO_LANGUAGE} of the {fmt(N)} pieces hatched. {fmt(N)} − {fmt(CONTENTS.languages)} = {NO_LANGUAGE}.</>
                : line && <><b>{line.name}</b>: {line.jobs} of the {fmt(N)} pieces lit, {line.share}%.</>}
        </p>
    );
}

/** The opened box on the counter: the label on its side, the pile beside it. */
export function Counter({pileLabel}: {pileLabel: string}) {
    const {opened, lit, open, light} = useBox();
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced() || !("IntersectionObserver" in window)) return open();
        // Scrolling to the counter opens the box too.
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { open(); io.disconnect(); } }, {threshold: .3});
        io.observe(el);
        return () => io.disconnect();
    }, [open]);
    const press = (k: string) => { if (!opened) open(); light(lit === k ? null : k); };
    const n = lit === NONE ? NO_LANGUAGE : CONTENTS.label.find((l) => l.key === lit)?.jobs ?? 0;
    return (
        <div className={s.scene} ref={ref}>
            <div className={cn(s.pack, opened && s.opened)}>
                <div className={s.top} aria-hidden><div className={s.hole} id={"cmv-hole"} /><div className={s.lid} /></div>
                <div className={s.face}>
                    <div className={s.label}>
                        <h3>Ingredients</h3>
                        <p className={s.of}>Of the {fmt(N)} AI jobs we could read, the number that name each skill. A job can name several, so the shares don&apos;t add up to 100.</p>
                        <div className={s.cols}><span>Skill</span><span>Jobs</span><span>Share</span></div>
                        {CONTENTS.label.map((l) => l.jobs === null
                            ? <div key={l.key} className={cn(s.row, s.share)}><span className={s.nm}>{l.name}</span><span className={s.ct}>–</span><span className={s.sh}>{l.share}%</span></div>
                            : <button key={l.key} type={"button"} className={s.row} aria-pressed={lit === l.key} onClick={() => { storyInteracted("contents-may-vary", "ingredient"); press(l.key); }}>
                                <span className={s.nm}>{l.name}</span><span className={s.ct}>{l.jobs}</span><span className={s.sh}>{l.share}%</span></button>)}
                        <button type={"button"} className={cn(s.row, s.warn)} aria-pressed={lit === NONE} onClick={() => { storyInteracted("contents-may-vary", "ingredient"); press(NONE); }}>
                            <span className={s.wh}>Programming language</span>
                            <span className={s.wt}>None named in {NO_LANGUAGE} of the {fmt(N)} jobs.</span>
                            <span className={s.wm}>{CONTENTS.languages} name at least one · {fmt(N)} − {CONTENTS.languages} = {NO_LANGUAGE} · {CONTENTS.twoOrMore} name two or more</span>
                        </button>
                        <p className={s.foot}>* Share only. The weekly page gives no count for this line, so it doesn&apos;t light.</p>
                    </div>
                </div>
            </div>
            <div className={s.pilewrap}>
                <div className={s.bar}><Readout /><button type={"button"} className={s.ghost} onClick={() => { storyInteracted("contents-may-vary", "show_none"); light(null); }}>Show none</button></div>
                <div className={cn(s.pile, opened && s.out)} id={"cmv-pile"} role={"img"} aria-label={pileLabel} style={{"--across": CONTENTS.across} as React.CSSProperties}>
                    {Array.from({length: N}, (_, i) => (
                        <i key={i} className={lit === NONE ? (i >= N - n ? s.gap : undefined) : i < n ? s.on : undefined}
                           style={{"--d": `${(i * 1.1).toFixed(0)}ms`, "--r": `${((i * 37) % 90) - 45}deg`} as React.CSSProperties} />
                    ))}
                </div>
                <p className={s.tools}><span className={s.key}><i className={cn(s.sw, s.on)} />names the lit line</span><span className={s.key}><i className={cn(s.sw, s.gap)} />names no language</span></p>
            </div>
        </div>
    );
}
