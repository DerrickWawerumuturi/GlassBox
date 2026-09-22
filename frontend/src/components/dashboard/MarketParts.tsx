'use client'

import React, {useState} from 'react'

import {cn} from "@/lib/utils";
import {MarketAnalysis, SkillStat} from "@/types/jobradar";
import {byDemand, coveragePercent, GAP_FREQUENCY_THRESHOLD, significantGaps, skillKey, skillLabel, toPercent} from "@/lib/market";
import {axisDomainMax} from "@/lib/chart-ramp";

/*
 * The Market tab's pieces, in the dashboard's own anatomy (hairline cells,
 * mono labels) rather than the landing flow's editorial panels.
 *
 * Colour has one job: whether a skill is on the CV (--chart-have) or missing
 * (--chart-gap), a pair validated for colour-blind separation. Bar length
 * already shows demand, so colour never repeats it.
 */

/** The four numbers the market view leads with, as one row of cells. */
export function StatStrip({market}: { market: MarketAnalysis }) {
    const coverage = market.skill_coverage;
    const cells = [
        {label: "Jobs analysed", value: market.jobs_analyzed.toLocaleString(), hint: "postings in this scan"},
        {label: "Coverage", value: `${coveragePercent(coverage)}%`, hint: `${coverage.covered} of the top ${coverage.total} skills`,
            meter: coveragePercent(coverage)},
        {label: "Your skills", value: (market.user_skill_presence ?? []).length, hint: "asked for in these postings"},
        {label: "Gaps", value: significantGaps(market.skill_gaps ?? []).length,
            hint: `missing, in ${toPercent(GAP_FREQUENCY_THRESHOLD)}%+ of jobs`},
    ];
    return (
        // gap-px over a border-coloured ground draws the hairlines between cells at any column count.
        <dl className={"grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4"}>
            {cells.map((cell) => (
                <div key={cell.label} className={"flex min-w-0 flex-col gap-1.5 bg-background px-4 py-3.5 sm:px-5"}>
                    <dt className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>{cell.label}</dt>
                    <dd className={"text-2xl font-bold leading-none tracking-tight"}>{cell.value}</dd>
                    {"meter" in cell && (
                        // One ratio, so a meter: the covered share on a lighter track of the same hue.
                        <dd className={"h-[3px] max-w-40 rounded-full bg-chart-have/15"} role={"meter"} aria-label={"Skill coverage"}
                            aria-valuenow={cell.meter} aria-valuemin={0} aria-valuemax={100}>
                            <span className={"block h-full rounded-full bg-chart-have"} style={{width: `${cell.meter}%`}} />
                        </dd>
                    )}
                    <dd className={"truncate font-mono text-[10px] text-muted-foreground"}>{cell.hint}</dd>
                </div>
            ))}
        </dl>
    )
}

/** Swatch + label pairs; the legend is what keeps identity from being colour alone. */
export function ChartLegend({gaps = true}: { gaps?: boolean }) {
    return (
        <div className={"flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"}>
            <span className={"inline-flex items-center gap-1.5"}>
                <span aria-hidden className={"size-2.5 rounded-[3px] bg-chart-have"} /> On your CV
            </span>
            {gaps && (
                <span className={"inline-flex items-center gap-1.5"}>
                    <span aria-hidden className={"size-2.5 rounded-[3px] bg-chart-gap"} /> Not on your CV
                </span>
            )}
        </div>
    )
}

/**
 * Ranked horizontal bars for skills, one row each: name, bar, value. Every bar
 * is labelled, so there is no axis to read, and the scale runs from 0 to just
 * past the top value so differences stay visible without overstating them.
 */
export function SkillBars({skills, have, initialCount = 12, limit}: {
    skills: SkillStat[];
    /** skillKey()s on the CV: those bars are "have", the rest "gap". */
    have: Set<string>;
    initialCount?: number;
    /** Show exactly this many, with no "show all". */
    limit?: number;
}) {
    const [showAll, setShowAll] = useState(false);
    const ranked = byDemand(skills ?? []);
    if (ranked.length === 0) return null;

    const shown = limit ? ranked.slice(0, limit) : showAll ? ranked : ranked.slice(0, initialCount);
    const scale = axisDomainMax(toPercent(ranked[0].frequency));

    return (
        <div className={"flex flex-col"}>
            <ul className={"flex flex-col"}>
                {shown.map((stat) => {
                    const percent = Math.round(toPercent(stat.frequency));
                    const mine = have.has(skillKey(stat.skill));
                    return (
                        <li
                            key={stat.skill}
                            title={`${stat.skill}: ${stat.job_count.toLocaleString()} ${stat.job_count === 1 ? "posting" : "postings"} (${percent}%)${mine ? ", on your CV" : ""}`}
                            className={"grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1.5 transition-colors hover:bg-foreground/3 sm:grid-cols-[minmax(0,13rem)_1fr_auto]"}
                        >
                            <span className={"truncate text-[13px]"}>{skillLabel(stat.skill)}</span>
                            <span className={"h-3.5"}>
                                <span
                                    className={cn("block h-full rounded-r-[4px]", mine ? "bg-chart-have" : "bg-chart-gap")}
                                    style={{width: `${Math.max(1.5, (percent / scale) * 100)}%`}}
                                />
                            </span>
                            <span className={"w-9 text-right font-mono text-[11px] tabular-nums sm:w-20"}>
                                {percent}%
                                <span className={"hidden text-muted-foreground sm:inline"}> · {stat.job_count.toLocaleString()}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
            {!limit && ranked.length > initialCount && (
                <button
                    type={"button"}
                    onClick={() => setShowAll((prev) => !prev)}
                    className={"mt-2 self-start rounded-md border border-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"}
                >
                    {showAll ? `Show top ${initialCount}` : `Show all ${ranked.length}`}
                </button>
            )}
        </div>
    )
}

/** Short footnotes in the tab's quiet ink: colour is kept for have / missing. */
export function ChartNotes({points}: { points: string[] }) {
    return (
        <ul className={"flex flex-col gap-1 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground"}>
            {points.map((point) => (
                <li key={point} className={"flex gap-2"}>
                    <span aria-hidden className={"mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/50"} />
                    {point}
                </li>
            ))}
        </ul>
    )
}

/** A titled block of the Market tab, ruled off like the rest of the dashboard. */
export function MarketSection({title, meta, action, children, className}: {
    title: string;
    meta?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("flex min-w-0 flex-col gap-3.5 border-b border-border px-4 py-4 sm:px-5", className)}>
            <header className={"flex items-baseline justify-between gap-3"}>
                <h2 className={"text-[13px] font-semibold"}>
                    {title}
                    {meta && <span className={"ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted-foreground"}>{meta}</span>}
                </h2>
                {action}
            </header>
            {children}
        </section>
    )
}
