'use client'

import React, {useCallback, useEffect, useRef, useState} from "react";

import {useRotor} from "@/lib/use-rotor";

/*
 * The Market charts view selector (decisions/market-navigation.md). The labels never move (fixed positions are what make
 * radial menus fast: Kurtenbach & Buxton); a needle points at the active one.
 *
 * You aim rather than turn: press anywhere on the dial and the needle swings
 * to the view in that direction, drag to slide between views (it clicks from
 * one to the next), release to open it. Hovering glides the needle to the
 * view under the pointer as a preview; leaving returns it. Names only, no
 * numbers (founder's call). Wheel, arrows, Home/End and the number keys
 * work too; underneath it is a plain tablist.
 *
 * Colour (brand): the needle, its tip, the hub and the lit wedge are orange,
 * the colour that acts; labels stay in text tokens; ticks and track are grid
 * grey. Not green (that means "on your CV") and not lime (the one highlight
 * a chart may use).
 */

const NUDGED = "needle-dial-nudged";

export type DialItem = {id: string; name: string};

function layout(w: number, h: number, phone: boolean, radius: number) {
    return phone
        ? {cx: w / 2, cy: h - 22, r: Math.min(110, w / 2 - 85), start: -Math.PI + 0.35, span: Math.PI - 0.7}
        : {cx: 36, cy: h / 2, r: radius, start: -1.2, span: 2.4};
}

export default function NeedleDial({items, w, h, phone, index, onSelect, radius = 168, controls}: {
    items: DialItem[]; w: number; h: number; phone: boolean; index: number; onSelect: (i: number) => void;
    /** The label radius on a desktop. */
    radius?: number;
    /** The id of the panel the tabs control, when there is one. */
    controls?: string;
}) {
    const n = items.length;
    const {cx, cy, r, start, span} = layout(w, h, phone, radius);
    const step = span / (n - 1);
    const angle = (p: number) => start + p * step;
    const track = r - 22, needle = r - 46;
    const at = (a: number, rr: number) => ({x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a)});

    // The selection shows the moment it is made. Where the parent's index arrives
    // later (a URL update), waiting for it lit the old label again for a few frames.
    const [selected, setSelected] = useState(index);
    useEffect(() => setSelected(index), [index]);
    const choose = useCallback((i: number) => { setSelected(i); onSelect(i); }, [onSelect]);
    const rotor = useRotor(n, index, choose, false);
    const box = useRef<HTMLDivElement>(null);
    const [aim, setAim] = useState<number | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const {bindWheel, nudge, aimAt, goTo} = rotor;

    useEffect(() => bindWheel(box.current), [bindWheel]);
    // The teaching nudge plays once per browser, not on every visit, where it read as a twitch.
    useEffect(() => {
        let seen = false;
        try { seen = localStorage.getItem(NUDGED) === "1"; localStorage.setItem(NUDGED, "1"); } catch {}
        if (seen) return;
        const t = setTimeout(nudge, 700);
        return () => clearTimeout(t);
    }, [nudge]);
    useEffect(() => {
        if (box.current?.contains(document.activeElement)) box.current.querySelector<HTMLElement>(`[data-i="${selected}"]`)?.focus();
    }, [selected]);

    /** The view in the direction of the pointer, seen from the hub. */
    const viewAt = (e: React.PointerEvent) => {
        const b = e.currentTarget.getBoundingClientRect();
        const a = Math.atan2(e.clientY - b.top - cy, e.clientX - b.left - cx);
        return Math.min(n - 1, Math.max(0, Math.round((a - start) / step)));
    };

    const live = aim ?? selected;  // the view the needle is aimed at while pressed
    const wedge = (p: number) => {
        const [a0, a1] = [angle(p - 0.5), angle(p + 0.5)];
        const [p0, p1] = [at(a0, track), at(a1, track)];
        return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${track} ${track} 0 0 1 ${p1.x} ${p1.y} Z`;
    };
    const ticks = [];
    for (let k = 0; k <= (n - 1) * 4; k++) {
        const a = angle(k / 4), major = k % 4 === 0;
        const [o, i] = [at(a, track), at(a, track - (major ? 10 : 5))];
        ticks.push(<line key={k} x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke={"var(--foreground)"} strokeOpacity={major ? 0.45 : 0.18} />);
    }
    const [t0, t1] = [at(angle(-0.5), track), at(angle(n - 0.5), track)];
    const tip = at(angle(rotor.pos), needle);

    return (
        <div ref={box} role={"tablist"} aria-orientation={phone ? "horizontal" : "vertical"} aria-label={"Market charts views"}
             onKeyDown={rotor.onKeyDown}
             onPointerDown={(e) => {
                 if (e.button !== 0) return;
                 e.currentTarget.setPointerCapture(e.pointerId);
                 const i = viewAt(e);
                 setAim(i); aimAt(i);
             }}
             onPointerMove={(e) => {
                 const i = viewAt(e);
                 if (aim !== null) { if (i !== aim) { setAim(i); aimAt(i); } }
                 else if (e.pointerType === "mouse" && i !== hover) { setHover(i); aimAt(i); }
             }}
             onPointerUp={() => { if (aim !== null) goTo(aim); setAim(null); }}
             onPointerCancel={() => { setAim(null); goTo(index); }}
             onPointerLeave={() => { setHover(null); if (aim === null) aimAt(rotor.committed()); }}
             className={"relative select-none overflow-hidden"}
             style={{width: w, height: h, touchAction: "none", cursor: aim !== null ? "grabbing" : "pointer"}}>
            <svg aria-hidden width={w} height={h} className={"absolute inset-0"}>
                <path d={wedge(rotor.pos)} fill={"var(--primary)"} fillOpacity={0.09} />
                <path d={`M ${t0.x} ${t0.y} A ${track} ${track} 0 0 1 ${t1.x} ${t1.y}`} fill={"none"} stroke={"var(--foreground)"} strokeOpacity={0.22} />
                {ticks}
                <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={"var(--primary)"} strokeWidth={2} strokeLinecap={"round"} />
                <circle cx={tip.x} cy={tip.y} r={3.5} fill={"var(--primary)"} />
                <circle cx={cx} cy={cy} r={phone ? 9 : 11} fill={"var(--background)"} stroke={"var(--primary)"} strokeWidth={1.5} />
            </svg>
            {items.map((s, i) => {
                const a = angle(i), p = at(a, r);
                const on = i === live, lit = on || i === hover;
                const anchor = phone ? (Math.cos(a) < 0 ? "-100%" : "0") : "0";
                return (
                    <button key={s.id} type={"button"} role={"tab"} id={`tab-${s.id}`} aria-selected={i === selected} aria-controls={controls}
                            data-i={i} tabIndex={i === selected ? 0 : -1} onClick={() => goTo(i)}
                            className={"absolute left-0 top-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"}
                            style={{transform: `translate(${p.x}px, ${p.y}px) translate(${anchor}, -50%)`}}>
                        {/* One face and size for every label: switching them made the text jump on each
                            change. Active is weight and ink only, eased like the needle. */}
                        <span className={"transition-colors duration-200 " + (on ? "font-semibold text-foreground " : lit ? "text-foreground " : "text-muted-foreground ")
                            + (phone ? "text-[14px]" : "text-[15px]")}>
                            <span className={"mr-1.5 font-mono text-[12px] font-normal text-muted-foreground"}>{i + 1}</span>{s.name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
