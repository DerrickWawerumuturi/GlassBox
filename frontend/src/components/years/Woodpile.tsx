'use client'

import React, {useEffect, useRef, useState} from "react";

import {fmt} from "@/lib/market-page";
import {pileGroups, rowLabel, type YearsRow} from "@/lib/years-answer";
import {mountPile} from "./pile";
import s from "./years.module.css";

/*
 * One woodpile: the rack (a canvas, one log end per job), its key, "Stack by
 * rings" and the readout that says one log aloud. The key, the button and the
 * readout render on the server; the logs draw once script runs (pile.ts). The
 * same counts are in the stage's label and the table twin, so nothing is
 * lost without script. Touch, mouse and arrow keys all read a log.
 */

const LOG_ICON = (
    <svg viewBox={"0 0 20 20"} aria-hidden><circle cx={10} cy={10} r={8.5} fill={"none"} stroke={"currentColor"} strokeWidth={1.6} />
        <circle cx={10} cy={10} r={4.6} fill={"none"} stroke={"currentColor"} strokeWidth={1.4} /><circle cx={10} cy={10} r={1.3} fill={"currentColor"} /></svg>
);
const FIRST = "Tap a log end to read its rings.";

export default function Woodpile({row, seed, aspect, sorted: start = false, note = null, pen}: {
    row: YearsRow; seed: number; aspect: [number, number]; sorted?: boolean;
    /** Which log the pen note points at, and what it says; hidden when the pile has none near its top. */
    note?: "sealed" | "five" | null; pen?: string;
}) {
    const refs = {root: useRef<HTMLDivElement>(null), rack: useRef<HTMLDivElement>(null), stage: useRef<HTMLDivElement>(null), canvas: useRef<HTMLCanvasElement>(null),
        over: useRef<SVGSVGElement>(null), key: useRef<HTMLOListElement>(null), loupe: useRef<HTMLCanvasElement>(null), pen: useRef<HTMLParagraphElement>(null)};
    const pile = useRef<ReturnType<typeof mountPile> | null>(null);
    const [sorted, setSorted] = useState(start), [said, setSaid] = useState(FIRST), [reading, setReading] = useState(false);
    const groups = pileGroups(row);

    useEffect(() => {
        const r = refs;
        pile.current = mountPile({root: r.root.current!, rack: r.rack.current!, stage: r.stage.current!, canvas: r.canvas.current!, over: r.over.current!,
            key: r.key.current!, loupe: r.loupe.current!, pen: r.pen.current}, row, {seed, aspect, sorted: start, note, onRead: (t) => { setSaid(t); setReading(true); }});
        return () => pile.current?.destroy();
        // The pile is laid out once per row; its own observers handle size and theme.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row, seed]);

    const toggle = () => { const to = !sorted; setSorted(to); pile.current?.sort(to); };
    return (
        <div ref={refs.root} className={s.pileBox}>
            <div ref={refs.rack} className={s.rack}>
                <div ref={refs.stage} className={s.stage} tabIndex={0} role={"group"} aria-describedby={`ro-${row.key}`}
                     aria-label={`${row.name}: a pile of ${fmt(row.total)} log ends, one per job. Arrow keys read one log at a time.`}>
                    <canvas ref={refs.canvas} role={"img"} aria-label={rowLabel(row)} />
                    {note && pen && <p ref={refs.pen} className={s.pen} hidden>{pen}<svg width={20} aria-hidden /></p>}
                </div>
                <ol ref={refs.key} className={s.key} aria-label={"Key"}>
                    {groups.map((g) => <li key={g.key}><canvas aria-hidden /><b>{fmt(g.n)}</b><span>{g.name}</span></li>)}
                </ol>
                <svg ref={refs.over} className={s.over} aria-hidden />
            </div>
            <div className={s.tools}>
                {/* One kind of log has nothing to sort. */}
                {groups.length > 1 && <button type={"button"} className={s.stack} aria-pressed={sorted} onClick={toggle}>{LOG_ICON}<span>{sorted ? "Mix them back" : "Stack by rings"}</span></button>}
                <div className={s.readout} id={`ro-${row.key}`} aria-live={"polite"}>
                    <canvas ref={refs.loupe} hidden={!reading} aria-hidden /><p>{said}</p>
                </div>
            </div>
        </div>
    );
}
