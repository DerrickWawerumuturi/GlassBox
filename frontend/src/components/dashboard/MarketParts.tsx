'use client'

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'

import {cn} from "@/lib/utils";
import {MarketAnalysis} from "@/types/jobradar";
import {significantGaps, SkillMark} from "@/lib/market";

/*
 * The Market tab's chart chrome, docs/brand/charts.html made real: every
 * chart is an object on the desk. A forest green-black panel, a short
 * uppercase title, a mono subtitle split by the orange slash (the only orange
 * in a chart), a legend, a "Good to know" row and a table twin for screen
 * readers. The charts themselves are hand-built SVG in DemandBars, GapTally
 * and SkillStrip; this file is what they share.
 *
 * Colour has one job: green is on your CV, a neutral hatch or hollow ring is
 * not yet, lime is a single highlighter. Nothing here is set below 12px.
 */

/** Chart text is JetBrains Mono, whose advance width is 0.6em: no measuring needed. */
export const monoWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

export const TICK_FS = 12;

/** The host's width, kept current, so an SVG chart can lay itself out in pixels. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
}

/* ---------- tooltip ---------- */

export interface TipContent {
    title: string;
    line: string;
    sub?: string;
}

interface Tip extends TipContent {
    x: number;
    y: number;
}

/** What a mark says on hover or focus: the count first, then the skill and whose it is. */
export function markTip(mark: SkillMark, jobs: number, sub?: string): TipContent {
    return {
        title: `${mark.count} of ${jobs} postings`,
        line: `${mark.label} · ${mark.percent}% · ${mark.have ? "on your CV" : "not on your CV yet"}`,
        sub,
    };
}

/**
 * One tooltip per chart. `bind` gives a mark the pointer and keyboard handlers
 * plus an accessible name, so every hit area is focusable and read aloud.
 */
export function useTip() {
    const [tip, setTip] = useState<Tip | null>(null);
    const bind = (content: TipContent) => ({
        tabIndex: 0,
        role: "img",
        "aria-label": `${content.line}. ${content.title}${content.sub ? `. ${content.sub}` : ""}`,
        onPointerEnter: (e: React.PointerEvent) => setTip({...content, x: e.clientX, y: e.clientY}),
        onPointerMove: (e: React.PointerEvent) => setTip((prev) => prev && {...prev, x: e.clientX, y: e.clientY}),
        onPointerLeave: () => setTip(null),
        onFocus: (e: React.FocusEvent<Element>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTip({...content, x: r.left + Math.min(r.width, 80), y: r.top + r.height / 2});
        },
        onBlur: () => setTip(null),
    });
    return {tip, bind};
}

export function TipBox({tip}: { tip: Tip | null }) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({left: 0, top: 0});
    // Placed after it has a size, so it can flip away from the window's edges.
    useLayoutEffect(() => {
        if (!tip || !ref.current) return;
        const {offsetWidth: w, offsetHeight: h} = ref.current;
        let left = tip.x + 14, top = tip.y + 14;
        if (left + w > window.innerWidth - 8) left = tip.x - w - 14;
        if (left < 8) left = 8;
        if (top + h > window.innerHeight - 8) top = tip.y - h - 14;
        setPos({left, top});
    }, [tip]);
    if (!tip) return null;
    return (
        <div ref={ref} role={"tooltip"} style={pos}
             className={"pointer-events-none fixed z-20 max-w-[260px] rounded-[10px] bg-[var(--panel-chart-ink)] px-3 py-1.5 text-[13px] leading-snug text-[var(--panel-chart)] shadow-xl"}>
            <b className={"block font-heading text-[15px] font-bold tracking-tight"}>{tip.title}</b>
            {tip.line}
            {tip.sub && <div className={"text-[12px] opacity-70"}>{tip.sub}</div>}
        </div>
    )
}

/* ---------- panel chrome ---------- */

export type Swatch = "have" | "hatch" | "dot" | "ring" | "solid" | "faint";

const SWATCH: Record<Swatch, string> = {
    have: "size-3 rounded-[3px] bg-chart-have",
    hatch: "size-3 rounded-[3px] bar-gap",
    dot: "size-[11px] rounded-full bg-chart-have",
    ring: "size-[11px] rounded-full border-2 border-chart-gap opacity-70",
    solid: "size-3 rounded-[3px] bg-chart-gap",
    faint: "size-3 rounded-[3px] bg-chart-gap/30",
};

export function Legend({items}: { items: Array<[Swatch, string]> }) {
    return (
        <div className={"flex flex-wrap justify-center gap-x-5 gap-y-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground"}>
            {items.map(([swatch, label]) => (
                <span key={label} className={"inline-flex items-center gap-2"}>
                    <i aria-hidden className={cn("inline-block", SWATCH[swatch])} />{label}
                </span>
            ))}
        </div>
    )
}

/** The table twin of a chart: the same rows, readable without the picture. */
export function ChartTable({marks, jobs}: { marks: SkillMark[]; jobs: number }) {
    return (
        <details className={"group mt-3"}>
            <summary className={"inline-flex cursor-pointer list-none items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-panel-chart-ink-faint hover:text-foreground [&::-webkit-details-marker]:hidden"}>
                <span aria-hidden className={"font-bold group-open:hidden"}>+</span>
                <span aria-hidden className={"hidden font-bold group-open:inline"}>–</span>
                View as table
            </summary>
            <table className={"mt-2.5 w-full max-w-[560px] border-collapse font-mono text-[12px] tabular-nums"}>
                <thead>
                    <tr className={"text-left font-medium uppercase tracking-[0.06em] text-panel-chart-ink-faint"}>
                        <th className={"border-b border-border px-2.5 py-1.5 font-medium"}>Skill</th>
                        <th className={"border-b border-border px-2.5 py-1.5 text-right font-medium"}>Postings</th>
                        <th className={"border-b border-border px-2.5 py-1.5 text-right font-medium"}>Share</th>
                        <th className={"border-b border-border px-2.5 py-1.5 font-medium"}>CV</th>
                    </tr>
                </thead>
                <tbody>
                    {marks.map((mark) => (
                        <tr key={mark.skill}>
                            <td className={"border-b border-border px-2.5 py-1.5"}>{mark.label}</td>
                            <td className={"border-b border-border px-2.5 py-1.5 text-right"}>{mark.count} / {jobs}</td>
                            <td className={"border-b border-border px-2.5 py-1.5 text-right"}>{mark.percent}%</td>
                            <td className={"border-b border-border px-2.5 py-1.5"}>{mark.have ? "Yours" : "Not yet"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </details>
    )
}

/**
 * The panel every chart sits in. `lead` is the finding; the postings chip
 * after the orange slash is the denominator every count is read against.
 */
export function ChartPanel({title, lead, jobs, legend, children, notes, table, action, preview, className}: {
    title: string;
    lead: React.ReactNode;
    jobs: number;
    legend?: Array<[Swatch, string]>;
    children: React.ReactNode;
    /** At most two short bullets. */
    notes?: string[];
    table?: { marks: SkillMark[] };
    /** A control under the chart, like "Show all". */
    action?: React.ReactNode;
    /** The overview's compact version: a link to the full view instead of notes and the table. */
    preview?: React.ReactNode;
    className?: string;
}) {
    return (
        <section aria-label={title}
                 className={cn("chart-panel chart-panel-desk flex min-w-0 flex-col px-4 pb-4 pt-[18px] sm:px-8 sm:pb-[22px] sm:pt-[26px]", className)}>
            <h2 className={"text-balance text-center font-heading text-[18px] font-bold uppercase leading-tight tracking-[0.05em] sm:text-[20px]"}>{title}</h2>
            <p className={"mx-auto mt-1.5 max-w-[640px] text-center font-mono text-[12px] leading-[1.7] text-muted-foreground"}>
                {lead}
                <span aria-hidden className={"mx-[7px] font-bold text-primary"}>/</span>
                <span className={"whitespace-nowrap"}>
                    <span className={"inline-block rounded-full bg-foreground/9 px-2 leading-5 text-foreground"}>{jobs.toLocaleString()} postings</span>
                </span>
            </p>
            {legend && <div className={"mb-1 mt-3.5"}><Legend items={legend} /></div>}
            <div className={"mt-2.5 min-w-0"}>{children}</div>
            {action}
            {notes && (
                <div className={"mt-[18px] grid gap-1.5 border-t border-border pt-3.5 sm:grid-cols-[120px_1fr] sm:gap-x-4"}>
                    <h4 className={"mt-[3px] font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-accent-lime"}>Good to know</h4>
                    <ul className={"flex flex-col gap-1 text-[14px] leading-normal text-muted-foreground"}>
                        {notes.map((point) => (
                            <li key={point} className={"relative pl-3.5 before:absolute before:left-0 before:top-[0.6em] before:size-[5px] before:rounded-full before:bg-panel-chart-ink-faint"}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}
            {table && <ChartTable marks={table.marks} jobs={jobs} />}
            {preview && <div className={"mt-4 flex justify-end border-t border-border pt-3"}>{preview}</div>}
        </section>
    )
}

/* ---------- overview tiles ---------- */

function Tile({label, hero, small, foot, children, className}: {
    label: string;
    hero: React.ReactNode;
    small?: string;
    foot: string;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("chart-panel chart-panel-desk flex min-w-0 flex-col gap-1 px-[18px] pb-3.5 pt-4 sm:px-[22px] sm:pt-[18px]", className)}>
            <span className={"font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-panel-chart-ink-faint"}>{label}</span>
            <div className={"flex flex-wrap items-baseline gap-2.5 font-heading text-[40px] font-bold leading-none tracking-[-0.02em]"}>
                <span>{hero}</span>
                {small && <small className={"font-sans text-[13px] font-medium tracking-normal text-muted-foreground"}>{small}</small>}
            </div>
            {children}
            <span className={"text-[13px] text-muted-foreground"}>{foot}</span>
        </div>
    )
}

/** The numbers the overview leads with: coverage as a hero and a tally of the top skills, then the postings. */
export function StatTiles({market, marks}: { market: MarketAnalysis; marks: SkillMark[] }) {
    const coverage = market.skill_coverage;
    const groups: SkillMark[][] = [];
    for (let i = 0; i < marks.length; i += 5) groups.push(marks.slice(i, i + 5));
    const gaps = significantGaps(market.skill_gaps ?? []).length;
    return (
        <div className={"grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr] sm:gap-4"}>
            <Tile label={"Coverage"} hero={coverage.covered} small={`of the top ${coverage.total} are yours`} foot={"In demand order. Green is yours."}>
                <div aria-hidden className={"my-1.5 flex flex-wrap gap-2 sm:gap-2.5"}>
                    {groups.map((group, g) => (
                        <div key={g} className={"flex gap-[3px]"}>
                            {group.map((mark) => (
                                <i key={mark.skill} title={mark.label}
                                   className={cn("block h-[18px] w-[11px] rounded-[3px] sm:w-3", mark.have ? "bg-chart-have" : "bar-gap")} />
                            ))}
                        </div>
                    ))}
                </div>
            </Tile>
            <Tile label={"Postings"} hero={market.jobs_analyzed.toLocaleString()} foot={"in this scan"} />
            <Tile label={"Gaps"} hero={gaps} foot={"asked for by a fifth of postings or more"} />
        </div>
    )
}
