import React from "react";

import {cn} from "@/lib/utils";
import SkillName from "@/components/market-page/SkillName";

/*
 * The editorial figure grammar (docs/decisions/design-system.md): a card with
 * an uppercase title, a mono subtitle with the orange slash and a job chip,
 * the picture as server HTML with role="img" and a data aria-label, and a
 * caption with its source line, so a screenshot or a quote still makes sense.
 * Bars are neutral ink, the comparison is a grey tick, lime marks one row.
 */

export function Source({date}: {date: string}) {
    return (
        <span className={"mt-1 block font-mono text-[12px] text-muted-foreground"}>
            Source: Glassbox count, {date} · <a href={"#method"} className={"text-primary underline-offset-2 hover:underline"}>how we count</a>
        </span>
    );
}

export function Figure({title, sub, chips, caption, date, children}: {
    title: string; sub: string; chips: string[]; caption: string; date: string; children: React.ReactNode;
}) {
    return (
        <figure className={"mx-0 my-9 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-[22px]"}>
            <p className={"m-0 font-heading text-[16px] font-bold uppercase leading-tight tracking-[0.04em]"}>{title}</p>
            <p className={"mt-1 mb-[18px] font-mono text-[12px] text-muted-foreground"}>
                {sub}<span aria-hidden className={"mx-1.5 font-bold text-primary"}>/</span>
                {chips.map((chip, i) => (
                    <React.Fragment key={chip}>{i > 0 && " · "}<span className={"rounded-full bg-foreground/[0.06] px-2 py-px text-foreground"}>{chip}</span></React.Fragment>
                ))}
            </p>
            {children}
            <figcaption className={"mt-3 font-read text-[14px] leading-[1.55] text-muted-foreground"}>
                {caption}<Source date={date} />
            </figcaption>
        </figure>
    );
}

export interface Bar {key: string; name: string; share: number; compare: number | null; count?: number; lime?: boolean;
    /** A row that is not a skill (Remote, Internships): never marked by a scan. */
    plain?: boolean}

const LIME = "bg-accent-lime shadow-[inset_0_0_0_1px_var(--accent-lime-edge)]";

/** Horizontal bars, one skill a row: the share, and the comparison's share as a grey tick. */
export function BarRows({rows, label, narrow}: {rows: Bar[]; label: string; narrow?: boolean}) {
    return (
        <div role={"img"} aria-label={label}>
            {rows.map((r) => (
                <div key={r.key} className={cn("my-[9px] grid items-center gap-2.5 text-[14px]",
                    narrow ? "grid-cols-[124px_minmax(0,1fr)_44px]" : "grid-cols-[84px_minmax(0,1fr)_64px] sm:grid-cols-[110px_minmax(0,1fr)_80px]")}>
                    {r.plain ? <span className={"min-w-0 break-words hyphens-auto leading-[1.2]"}>{r.name}</span> : <SkillName k={r.key} name={r.name} />}
                    <span className={"relative h-[18px] rounded-[3px] bg-foreground/[0.06]"}>
                        <i className={cn("absolute inset-y-0 left-0 rounded-r-[3px]", r.lime ? LIME : "bg-foreground")} style={{width: `${r.share}%`}} />
                        {r.compare !== null && <u className={"absolute -top-1 -bottom-1 w-0.5 bg-chart-gap"} style={{left: `${r.compare}%`}} />}
                    </span>
                    <span className={"font-mono text-[13px] font-semibold"}>
                        {r.share}%{r.count !== undefined && <small className={"ml-1.5 hidden font-normal text-muted-foreground sm:inline"}>{r.count}</small>}
                    </span>
                </div>
            ))}
        </div>
    );
}

export interface Pair {key: string; name: string; left: number; right: number; lime?: boolean}

/** Two sided rows: the page's share to the left, the comparison's to the right, the skill between. */
export function PairRows({rows, left, right, label}: {rows: Pair[]; left: string; right: string; label: string}) {
    const max = Math.max(10, ...rows.flatMap((r) => [r.left, r.right]));
    const w = (v: number) => `${(v / max) * 88}%`;
    const grid = "grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]";
    return (
        <div role={"img"} aria-label={label}>
            <div aria-hidden className={cn(grid, "font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground")}>
                <span className={"text-right"}>{left}</span><span /><span>{right}</span>
            </div>
            {rows.map((r) => (
                <div key={r.key} className={cn(grid, "my-[9px] text-[13px] sm:text-[14px]")}>
                    <span className={"flex h-[18px] items-center justify-end gap-1.5"}>
                        <b className={"font-mono text-[12px] font-semibold"}>{r.left}%</b>
                        <i className={cn("h-full rounded-l-[3px]", r.lime ? LIME : "bg-foreground")} style={{width: w(r.left)}} />
                    </span>
                    <span className={"flex justify-center text-center"}><SkillName k={r.key} name={r.name} /></span>
                    <span className={"flex h-[18px] items-center gap-1.5"}>
                        <i className={"h-full rounded-r-[3px] bg-foreground/35"} style={{width: w(r.right)}} />
                        <b className={"font-mono text-[12px] font-semibold"}>{r.right}%</b>
                    </span>
                </div>
            ))}
        </div>
    );
}

export interface Segment {label: string; value: number; tone: "ink" | "soft" | "lime" | "hatch"}

const TONE = {
    ink: "bg-foreground text-background", soft: "bg-foreground/20 text-foreground", lime: "bg-accent-lime text-accent-lime-ink",
    hatch: "bar-gap text-foreground [text-shadow:0_0_3px_var(--card),0_0_3px_var(--card)]",
};

/** One bar split into parts: years asked, levels, places. Hatched is "not stated". */
export function Stacked({parts, label}: {parts: Segment[]; label: string}) {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    return (
        <div role={"img"} aria-label={label} className={"my-1.5 flex h-11 overflow-hidden rounded-md"}>
            {parts.filter((p) => p.value > 0).map((p) => {
                const width = (100 * p.value) / total;
                return (
                    <i key={p.label} title={`${p.label} · ${p.value}`} style={{width: `${width}%`}}
                       className={cn("flex items-center justify-center overflow-hidden whitespace-nowrap font-mono text-[12px] font-semibold not-italic", TONE[p.tone])}>
                        {width >= 9 ? `${p.label} · ${p.value}` : ""}
                    </i>
                );
            })}
        </div>
    );
}

/** The same rows as a table, folded under the figure: readable without the picture. */
export function TableTwin({head, rows}: {head: string[]; rows: Array<Array<string | number>>}) {
    return (
        <details className={"group mt-3"}>
            <summary className={"inline-flex cursor-pointer list-none items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"}>
                <span aria-hidden className={"font-bold group-open:hidden"}>+</span>
                <span aria-hidden className={"hidden font-bold group-open:inline"}>–</span>
                View as table
            </summary>
            <div className={"overflow-x-auto"}>
                <table className={"mt-2.5 w-full border-collapse font-mono text-[12px] tabular-nums"}>
                    <thead>
                        <tr className={"text-left uppercase tracking-[0.06em] text-muted-foreground"}>
                            {head.map((h, i) => <th key={h} className={cn("border-b border-border px-2 py-1.5 font-medium", i > 0 && "text-right")}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={String(row[0])}>
                                {row.map((cell, i) => <td key={i} className={cn("border-b border-border px-2 py-1.5", i > 0 && "text-right")}>{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}
