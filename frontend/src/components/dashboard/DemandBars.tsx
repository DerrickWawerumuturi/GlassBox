'use client'

import React, {useState} from 'react'

import {SkillMark} from "@/lib/market";
import {barPath, HatchDefs, PlotFrame, useHatch} from "@/components/Market/ChartPatterns";
import {markTip, monoWidth, TICK_FS, TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";

/*
 * Ranked horizontal bars, chart A of docs/decisions/design-system.md: one row per
 * skill, the name beside (above on phones) the bar, with a separate count/N
 * column. Yours is solid green; not yet is the neutral hatch. Share ticks sit
 * under the frame. No rank badge: the brand never says "1st".
 */

const FS = 12;

function fitLabel(label: string, maxChars: number): string {
    return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

export default function DemandBars({marks, jobs, initialCount = 12, limit}: {
    marks: SkillMark[];
    jobs: number;
    initialCount?: number;
    /** Show exactly this many, with no "Show all". */
    limit?: number;
}) {
    const [showAll, setShowAll] = useState(false);
    const [host, W] = useWidth<HTMLDivElement>();
    const hatch = useHatch();
    const {tip, bind} = useTip();

    const rows = limit ? marks.slice(0, limit) : showAll ? marks : marks.slice(0, initialCount);
    if (rows.length === 0) return null;

    const phone = W < 520;
    const reserve = Math.max(...rows.map((r) => monoWidth(`${r.count}/${jobs}`, FS))) + 16;
    const maxChars = phone ? Math.max(10, Math.floor((W - reserve) / (FS * 0.6))) : 24;
    const longest = Math.max(...rows.map((r) => fitLabel(r.label, maxChars).length));
    const labelW = phone ? 0 : monoWidth("x".repeat(longest), FS) + 20;
    const rowH = phone ? 52 : 34, barH = phone ? 12 : 14;
    const padT = 12, padB = 12, axisH = 30;
    const plotX = labelW, plotW = Math.max(40, W - labelW - (phone ? 0 : reserve)), plotH = rows.length * rowH + padT + padB;
    const H = plotH + axisH;

    // A shared percentage scale makes charts comparable; counts have their own room.
    const pxPerPct = plotW / 100;
    const x = (v: number) => plotX + v * pxPerPct;
    const ticks = plotW < 300 ? [0, 50, 100] : [0, 25, 50, 75, 100];

    return (
        <div ref={host} className={"mx-auto w-full max-w-[760px]"}>
            <p className={"my-2 font-mono text-[12px] text-muted-foreground"}>Share of this scan’s jobs · counts out of {jobs.toLocaleString()}</p>
            {W > 0 && (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"block overflow-visible font-mono"} role={"img"}
                     aria-label={`Skills by share of ${jobs} jobs, on a scale from 0 to 100 percent`}>
                    <HatchDefs id={hatch.id} />
                    <PlotFrame x={plotX} y={0} width={plotW} height={plotH} majors={ticks.slice(1).map(x)} />
                    {rows.map((mark, i) => {
                        const cy = padT + i * rowH + (phone ? 35 : rowH / 2);
                        const tipX = x(mark.percent);
                        const value = `${mark.count}`;
                        return (
                            <g key={mark.skill} className={"[&:hover_.mark]:brightness-[1.18] [&:focus-within_.mark]:brightness-[1.18]"}>
                                <title>{`${mark.label}: ${mark.count} of ${jobs} jobs (${mark.percent}%)`}</title>
                                <path d={barPath(plotX, cy - barH / 2, tipX - plotX, barH)} className={"mark"}
                                      fill={mark.have ? "var(--chart-have)" : hatch.fill} />
                                <text x={phone ? 0 : plotX - 12} y={phone ? cy - 19 : cy + FS * 0.36} textAnchor={phone ? "start" : "end"} fontSize={FS} fontWeight={500} fill={"var(--foreground)"}>
                                    {fitLabel(mark.label, maxChars)}
                                </text>
                                <text x={phone ? W : plotX + plotW + 10} y={phone ? cy - 19 : cy + FS * 0.36} textAnchor={phone ? "end" : "start"} fontSize={FS} fontWeight={600} fill={"var(--foreground)"}>
                                    {value}<tspan fontWeight={400} fill={"var(--panel-chart-ink-faint)"}>/{jobs}</tspan>
                                </text>
                                <rect x={0} y={padT + i * rowH} width={W} height={rowH} fill={"transparent"} className={"outline-none focus-visible:stroke-foreground focus-visible:stroke-2"}
                                      {...bind(markTip(mark, jobs))} />
                            </g>
                        );
                    })}
                    {ticks.map((t) => (
                        <text key={t} x={x(t)} y={plotH + 20} textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"} fontSize={TICK_FS}
                              fill={"var(--panel-chart-ink-faint)"}>{t === 0 ? "0" : `${t}%`}</text>
                    ))}
                </svg>
            )}
            {!limit && marks.length > initialCount && (
                <button type={"button"} onClick={() => setShowAll((prev) => !prev)} aria-expanded={showAll}
                        className={"mt-3 inline-flex items-center rounded-full border border-foreground/22 px-[13px] py-[7px] font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"}>
                    {showAll ? `Show top ${initialCount} skills` : `Show all ${marks.length} skills`}
                </button>
            )}
            <TipBox tip={tip} />
        </div>
    )
}
