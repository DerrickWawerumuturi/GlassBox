'use client'

import React from 'react'

import {SkillMark} from "@/lib/market";
import {PlotFrame} from "@/components/Market/ChartPatterns";
import {markTip, monoWidth, TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";

/*
 * The tally, chart B of docs/brand/charts.html: one row per skill the CV
 * lacks, one mark per posting in the scan, grouped in fives like tally marks.
 * The postings that ask for the skill are drawn solid, the rest faint. Calm
 * and neutral by design: no lime, no red, one grey.
 *
 * The marks are sized to the width on hand; when the scan is too big for one
 * line of groups, each row wraps its groups so every posting still gets a
 * mark of its own.
 */

const FS = 12;
const MIN_PITCH = 4;

interface Geometry {
    /** Stroke pitch inside a group of five. */
    p: number;
    /** Space between groups. */
    gap: number;
    groupW: number;
    perLine: number;
    lines: number;
    height: number;
}

function geometry(groups: number, avail: number): Geometry {
    let p = 12, gap = 0;
    const widthFor = (pitch: number) => {
        gap = Math.max(5, Math.round(pitch * 1.15));
        return groups * (3 * pitch + 2) + (groups - 1) * gap;
    };
    while (p > MIN_PITCH && widthFor(p) > avail) p--;
    widthFor(p);
    const groupW = 3 * p + 2;
    const perLine = Math.max(1, Math.floor((avail + gap) / (groupW + gap)));
    return {p, gap, groupW, perLine, lines: Math.ceil(groups / perLine), height: Math.max(12, Math.round(p * 1.9))};
}

export default function GapTally({marks, jobs, limit}: { marks: SkillMark[]; jobs: number; limit?: number }) {
    const [host, W] = useWidth<HTMLDivElement>();
    const {tip, bind} = useTip();
    const rows = limit ? marks.slice(0, limit) : marks;
    if (rows.length === 0) return null;

    const phone = W < 520;
    const groups = Math.ceil(jobs / 5);
    const labelW = phone ? 0 : Math.min(176, monoWidth("x".repeat(Math.max(...rows.map((r) => r.label.length))), FS) + 16);
    const valueW = phone ? 0 : monoWidth(`${jobs}/${jobs}`, FS) + 24;
    const padX = phone ? 6 : 16;
    const avail = Math.max(40, W - labelW - valueW - padX * 2);
    const g = geometry(groups, avail);
    const total = Math.min(groups, g.perLine) * (g.groupW + g.gap) - g.gap;
    const lineH = g.height + 8;
    const marksH = g.lines * lineH - 8;
    const rowH = (phone ? marksH + 30 : marksH + 18);
    const padT = 14, padB = 14;
    const plotX = labelW, plotW = Math.max(40, W - labelW), plotH = rows.length * rowH + padT + padB;
    const H = plotH + 6;
    const startX = plotX + padX + (phone ? Math.max(0, (avail - total) / 2) : 0);

    return (
        <div ref={host} className={"mx-auto w-full max-w-[760px]"}>
            {W > 0 && (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"block overflow-visible font-mono"} role={"img"}
                     aria-label={"Tally chart of skills not on your CV"}>
                    <PlotFrame x={plotX} y={0} width={plotW} height={plotH} />
                    {rows.map((mark, i) => {
                        const rowY = padT + i * rowH;
                        const marksTop = phone ? rowY + 18 : rowY + (rowH - marksH) / 2;
                        const strokes: React.ReactNode[] = [];
                        let k = 0;
                        for (let grp = 0; grp < groups; grp++) {
                            const inGroup = Math.min(5, jobs - grp * 5);
                            const cx = startX + (grp % g.perLine) * (g.groupW + g.gap);
                            const top = marksTop + Math.floor(grp / g.perLine) * lineH, bot = top + g.height;
                            for (let s = 0; s < Math.min(4, inGroup); s++) {
                                strokes.push(<line key={k} x1={cx + s * g.p + 1} y1={top} x2={cx + s * g.p + 1} y2={bot}
                                                   stroke={"var(--chart-gap)"} strokeOpacity={k < mark.count ? 1 : 0.28} strokeWidth={2} strokeLinecap={"round"} />);
                                k++;
                            }
                            if (inGroup === 5) {
                                strokes.push(<line key={k} x1={cx - 1} y1={bot} x2={cx + 3 * g.p + 3} y2={top}
                                                   stroke={"var(--chart-gap)"} strokeOpacity={k < mark.count ? 1 : 0.28} strokeWidth={2} strokeLinecap={"round"} />);
                                k++;
                            }
                        }
                        const cy = marksTop + marksH / 2;
                        return (
                            <g key={mark.skill} className={"[&:hover_.mark]:brightness-[1.18] [&:focus-within_.mark]:brightness-[1.18]"}>
                                <g className={"mark"}>{strokes}</g>
                                {phone ? (
                                    <>
                                        <text x={plotX + padX} y={rowY + 10} fontSize={FS} fontWeight={500} fill={"var(--foreground)"}>{mark.label}</text>
                                        <text x={plotX + plotW - padX} y={rowY + 10} textAnchor={"end"} fontSize={FS} fontWeight={600} fill={"var(--foreground)"}>
                                            {mark.count}<tspan fontWeight={400} fill={"var(--panel-chart-ink-faint)"}> of {jobs}</tspan>
                                        </text>
                                    </>
                                ) : (
                                    <>
                                        <text x={plotX - 12} y={cy + FS * 0.36} textAnchor={"end"} fontSize={FS} fontWeight={500} fill={"var(--foreground)"}>{mark.label}</text>
                                        <text x={startX + total + 16} y={cy + FS * 0.36} fontSize={FS} fontWeight={600} fill={"var(--foreground)"}>
                                            {mark.count}<tspan fontWeight={400} fill={"var(--panel-chart-ink-faint)"}>/{jobs}</tspan>
                                        </text>
                                    </>
                                )}
                                <rect x={0} y={rowY} width={W} height={rowH} fill={"transparent"} className={"outline-none"} {...bind(markTip(mark, jobs))} />
                            </g>
                        );
                    })}
                </svg>
            )}
            <TipBox tip={tip} />
        </div>
    )
}
