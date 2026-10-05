'use client'

import React, {useState} from 'react'

import {SkillMark} from "@/lib/market";
import {barPath, HatchDefs, PlotFrame, useHatch} from "@/components/Market/ChartPatterns";
import {markTip, monoWidth, TICK_FS, TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";

/*
 * Ranked horizontal bars, chart A of docs/brand/charts.html: one row per
 * skill, the name on the left, the bar in a framed plot, "count/N" at the
 * tip. Yours is solid green; not yet is the neutral hatch. One lime "1st"
 * badge may mark the user's top skill, always after its count so it never
 * covers the bar or the number. Share ticks sit under the frame.
 */

const FS = 12;
/** Ticks every 10% unless that would crowd them, then every 20%, 30%… */
function tickStep(pxPerPct: number): number {
    let step = 10;
    while (pxPerPct * step < 52) step += 10;
    return step;
}

function fitLabel(label: string, maxChars: number): string {
    return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

export default function DemandBars({marks, jobs, initialCount = 12, limit, badge}: {
    marks: SkillMark[];
    jobs: number;
    initialCount?: number;
    /** Show exactly this many, with no "Show all". */
    limit?: number;
    /** The skill to wear the "1st" badge, if it is among the rows shown. */
    badge?: string;
}) {
    const [showAll, setShowAll] = useState(false);
    const [host, W] = useWidth<HTMLDivElement>();
    const hatch = useHatch();
    const {tip, bind} = useTip();

    const rows = limit ? marks.slice(0, limit) : showAll ? marks : marks.slice(0, initialCount);
    if (rows.length === 0) return null;

    const phone = W < 520;
    const maxChars = phone ? 14 : 22;
    const longest = Math.max(...rows.map((r) => fitLabel(r.label, maxChars).length));
    const labelW = monoWidth("x".repeat(longest), FS) + 20;
    const rowH = phone ? 30 : 32, barH = phone ? 12 : 14;
    const padT = 12, padB = 12, axisH = 30;
    const plotX = labelW, plotW = Math.max(60, W - labelW), plotH = rows.length * rowH + padT + padB;
    const H = plotH + axisH;

    // The longest bar plus its "count/N" label (and the badge beside it) must fit inside the frame.
    const maxPct = Math.max(1, rows[0].percent);
    const badgeRow = badge ? rows.findIndex((r) => r.skill === badge) : -1;
    const reserve = monoWidth(`${rows[0].count}/${jobs}`, FS) + 12 + (badgeRow >= 0 ? 46 : 10);
    const fitted = Math.max(1, (plotW - 12 - reserve) / maxPct);
    const domain = Math.max(10, Math.ceil((plotW / fitted) / 5) * 5);
    const pxPerPct = plotW / domain;
    const x = (v: number) => plotX + v * pxPerPct;
    const ticks: number[] = [];
    for (let t = 0, step = tickStep(pxPerPct); t <= domain; t += step) ticks.push(t);

    return (
        <div ref={host} className={"mx-auto w-full max-w-[760px]"}>
            {W > 0 && (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"block overflow-visible font-mono"} role={"img"}
                     aria-label={"Ranked bars of skills by share of postings"}>
                    <HatchDefs id={hatch.id} />
                    <PlotFrame x={plotX} y={0} width={plotW} height={plotH} majors={ticks.slice(1).map(x)} />
                    {rows.map((mark, i) => {
                        const cy = padT + i * rowH + rowH / 2;
                        const tipX = x(mark.percent);
                        const wearsBadge = i === badgeRow;
                        const value = `${mark.count}`;
                        return (
                            <g key={mark.skill} className={"[&:hover_.mark]:brightness-[1.18] [&:focus-within_.mark]:brightness-[1.18]"}>
                                <path d={barPath(plotX, cy - barH / 2, tipX - plotX, barH)} className={"mark"}
                                      fill={mark.have ? "var(--chart-have)" : hatch.fill} />
                                <text x={plotX - 12} y={cy + FS * 0.36} textAnchor={"end"} fontSize={FS} fontWeight={500} fill={"var(--foreground)"}>
                                    {fitLabel(mark.label, maxChars)}
                                </text>
                                <text x={tipX + 10} y={cy + FS * 0.36} fontSize={FS} fontWeight={600} fill={"var(--foreground)"}>
                                    {value}<tspan fontWeight={400} fill={"var(--panel-chart-ink-faint)"}>/{jobs}</tspan>
                                </text>
                                {wearsBadge && (
                                    <g aria-hidden transform={`translate(${tipX + 10 + monoWidth(`${value}/${jobs}`, FS) + 22} ${cy})`}>
                                        <circle r={13} fill={"var(--accent-lime)"} />
                                        <text y={4} textAnchor={"middle"} fontSize={12} fontWeight={700} fill={"var(--panel-chart)"}>1st</text>
                                    </g>
                                )}
                                <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill={"transparent"} className={"outline-none"}
                                      {...bind(markTip(mark, jobs, wearsBadge ? "Your most asked-for skill" : undefined))} />
                            </g>
                        );
                    })}
                    {ticks.map((t) => (
                        <text key={t} x={x(t)} y={plotH + 20} textAnchor={t === 0 ? "start" : "middle"} fontSize={TICK_FS}
                              fill={"var(--panel-chart-ink-faint)"}>{t === 0 ? "0" : `${t}%`}</text>
                    ))}
                </svg>
            )}
            {!limit && marks.length > initialCount && (
                <button type={"button"} onClick={() => setShowAll((prev) => !prev)} aria-expanded={showAll}
                        className={"mt-3 inline-flex items-center rounded-full border border-foreground/22 px-[13px] py-[7px] font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"}>
                    {showAll ? `Show top ${initialCount}` : `Show all ${marks.length}`}
                </button>
            )}
            <TipBox tip={tip} />
        </div>
    )
}
