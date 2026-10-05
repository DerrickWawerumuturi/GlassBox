'use client'

import React, {useEffect, useRef} from "react";

import {ConceptId, geometry} from "./concepts";
import {SECTIONS} from "./sections";
import {useRotor} from "@/lib/use-rotor";

/*
 * Every rotary concept is the same accessible structure, a vertical tablist
 * of real buttons, laid out on a curve. The SVG behind it is decoration
 * only (aria-hidden). The arc has no pointer line: its labels sit on the
 * chart side of the curve, so a line would run through the active one. Screen readers and the keyboard get plain tabs:
 * arrows, Home/End and 1–6 all work, and selection follows focus.
 */

export default function RingNav({concept, w, h, phone, index, onSelect}: {
    concept: Exclude<ConceptId, "dial">; w: number; h: number; phone: boolean;
    index: number; onSelect: (i: number) => void;
}) {
    const n = SECTIONS.length;
    const g = geometry(concept, w, h, phone);
    const rotor = useRotor(n, index, onSelect, g.wrap);
    const list = useRef<HTMLDivElement>(null);
    const {bindWheel, nudge} = rotor;

    useEffect(() => bindWheel(list.current), [bindWheel]);
    // Teach that it turns: one small turn and back, a moment after the concept appears.
    useEffect(() => { const t = setTimeout(nudge, 700); return () => clearTimeout(t); }, [concept, nudge]);
    // Keyboard focus rides with the selection.
    useEffect(() => {
        if (list.current?.contains(document.activeElement)) list.current.querySelector<HTMLElement>(`[data-i="${index}"]`)?.focus();
    }, [index]);

    const c = g.circle;
    return (
        <div ref={list} role={"tablist"} aria-orientation={phone ? "horizontal" : "vertical"} aria-label={"Market charts views"}
             onKeyDown={rotor.onKeyDown} {...rotor.pointerHandlers(g.drag)}
             className={"relative select-none overflow-hidden"} style={{width: w, height: h, touchAction: "none",
                cursor: rotor.dragging ? "grabbing" : "grab"}}>
            <svg aria-hidden width={w} height={h} className={"absolute inset-0"}>
                {concept !== "arc" && <line x1={g.pointer.x1} y1={g.pointer.y1} x2={g.pointer.x2} y2={g.pointer.y2}
                                    stroke={"var(--foreground)"} strokeOpacity={0.35} strokeDasharray={"2 4"} />}
                {concept === "edge" && c && <Rim c={c} pos={rotor.pos} n={n} />}
                {concept === "arc" && c && <circle cx={c.cx} cy={c.cy} r={c.r} fill={"none"} stroke={"var(--foreground)"} strokeOpacity={0.18} />}
                {concept === "orbit" && <Orbit g={g} />}
                {SECTIONS.map((s, i) => {
                    const p = g.place(rotor.offset(i), i);
                    if (!p.mark || p.opacity <= 0.01) return null;
                    const on = i === index;
                    return <circle key={s.id} cx={p.mark.x} cy={p.mark.y} r={on ? 5 : 3} opacity={p.opacity}
                                   fill={on ? "var(--foreground)" : "var(--muted-foreground)"} />;
                })}
            </svg>
            {SECTIONS.map((s, i) => {
                const p = g.place(rotor.offset(i), i);
                const on = i === index;
                const tx = p.anchor === "start" ? "0" : p.anchor === "end" ? "-100%" : "-50%";
                return (
                    <button key={s.id} type={"button"} role={"tab"} id={`tab-${s.id}`} aria-selected={on} aria-controls={"lab-stage"}
                            data-i={i} tabIndex={on ? 0 : -1} aria-hidden={p.opacity <= 0.01 || undefined}
                            onClick={() => rotor.goTo(i)}
                            className={"absolute left-0 top-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 "
                                + (on ? `font-heading ${phone ? "text-[16px]" : "text-[20px]"} font-semibold text-foreground` : `${phone ? "text-[13px]" : "text-[14px]"} text-muted-foreground hover:text-foreground`)}
                            style={{transform: `translate(${p.x}px, ${p.y}px) translate(${tx}, -50%) scale(${p.scale})`,
                                transformOrigin: p.anchor === "end" ? "right center" : p.anchor === "start" ? "left center" : "center",
                                opacity: p.opacity, zIndex: p.z, pointerEvents: p.opacity < 0.08 ? "none" : undefined}}>
                        <span className={"mr-1.5 font-mono text-[12px] text-muted-foreground"}>{i + 1}</span>{s.name}
                    </button>
                );
            })}
        </div>
    );
}

/** Concept D's rim: a ruler on the edge of a wheel far larger than the screen. Ten ticks a section. */
function Rim({c, pos, n}: {c: {cx: number; cy: number; r: number; base: number; step: number}; pos: number; n: number}) {
    const ticks = [];
    for (let k = -40; k <= (n + 4) * 10; k++) {
        const a = c.base + (k / 10 - pos) * c.step;
        const major = k % 10 === 0 && k >= 0 && k < n * 10;
        const len = major ? 14 : k % 5 === 0 ? 8 : 4;
        const [cos, sin] = [Math.cos(a), Math.sin(a)];
        ticks.push(<line key={k} x1={c.cx + c.r * cos} y1={c.cy + c.r * sin} x2={c.cx + (c.r - len) * cos} y2={c.cy + (c.r - len) * sin}
                         stroke={"var(--foreground)"} strokeOpacity={major ? 0.7 : 0.25} />);
    }
    return (
        <g>
            <circle cx={c.cx} cy={c.cy} r={c.r} fill={"var(--card)"} stroke={"var(--foreground)"} strokeOpacity={0.3} />
            {ticks}
        </g>
    );
}

function Orbit({g}: {g: ReturnType<typeof geometry>}) {
    const pts = Array.from({length: 73}, (_, k) => g.place(k / 12 - 3, 0)).map((p) => `${p.x},${p.y}`).join(" ");
    return <polyline points={pts} fill={"none"} stroke={"var(--foreground)"} strokeOpacity={0.12} strokeDasharray={"3 5"} />;
}
