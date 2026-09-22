'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis} from "recharts";

import {SkillStat} from "@/types/jobradar";
import {byDemand, skillLabel, toPercent} from "@/lib/market";
import {axisDomainMax, axisTicks} from "@/lib/chart-ramp";

interface StripPoint {
    skill: string;
    percent: number;
    jobCount: number;
    y: number;
}

const HAVE_LANE = 1;
const GAP_LANE = 0;
const LANE_LABEL: Record<number, string> = {[HAVE_LANE]: "On your CV", [GAP_LANE]: "Missing"};
const SHORT_LANE_LABEL: Record<number, string> = {[HAVE_LANE]: "On CV", [GAP_LANE]: "Missing"};
const DOT = 5;
const HIT = 12;
// The most asked-for few per lane are named; fewer on a phone, where names crowd.
const LABELLED = {wide: 3, narrow: 2};
const GOLDEN = 0.6180339887498949;

/** A stable spread inside a lane so equal values don't stack; never random, so it holds still. */
function lane(skills: SkillStat[], centre: number): StripPoint[] {
    return byDemand(skills).map((stat, index) => ({
        skill: skillLabel(stat.skill),
        percent: Math.round(toPercent(stat.frequency)),
        jobCount: stat.job_count,
        y: centre + (((index * GOLDEN) % 1) - 0.5) * 0.56,
    }));
}

function useWide(): boolean {
    const [wide, setWide] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(min-width: 640px)");
        const update = () => setWide(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return wide;
}

function StripTooltip({active, payload}: { active?: boolean; payload?: Array<{ payload: StripPoint }> }) {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;
    return (
        <div className={"rounded-lg border border-input bg-popover px-3 py-2 shadow-xl"}>
            <p className={"text-sm font-semibold"}>{point.percent}%</p>
            <p className={"text-xs text-muted-foreground"}>
                {point.skill} · {point.jobCount.toLocaleString()} {point.jobCount === 1 ? "posting" : "postings"}
            </p>
        </div>
    )
}

interface DotProps {
    cx?: number;
    cy?: number;
    payload?: StripPoint;
}

/** One skill: a ringed dot over a hit area wider than the mark, and its name if it is one of the few labelled. */
function StripDot({cx, cy, payload, colour, max, label, wide}: DotProps & {
    colour: string;
    max: number;
    label: boolean;
    wide: boolean;
}) {
    if (cx == null || cy == null || !payload) return <g />;
    // A name that would run off the right edge sits left of its dot instead; a phone has less room.
    const flip = payload.percent > max * (wide ? 0.7 : 0.4);
    return (
        <g>
            <circle cx={cx} cy={cy} r={HIT} fill={"transparent"} />
            <circle cx={cx} cy={cy} r={DOT} fill={colour} stroke={"var(--background)"} strokeWidth={2} />
            {label && (
                <text x={flip ? cx - DOT - 6 : cx + DOT + 6} y={cy + 3.5} textAnchor={flip ? "end" : "start"}
                      fontSize={11} fill={"var(--foreground)"}>
                    {payload.skill.length > 20 ? `${payload.skill.slice(0, 19)}…` : payload.skill}
                </text>
            )}
        </g>
    )
}

/**
 * Where the CV's skills sit in this market, against the ones it lacks: two
 * lanes on one demand axis. If your lane sits left of the missing one, the
 * market wants what you don't have yet. Dots carry a surface ring and a hit
 * area wider than the mark; only the most-demanded few are labelled.
 */
export default function SkillStrip({mine, missing}: { mine: SkillStat[]; missing: SkillStat[] }) {
    const wide = useWide();
    const have = useMemo(() => lane(mine, HAVE_LANE), [mine]);
    const gaps = useMemo(() => lane(missing, GAP_LANE), [missing]);
    const labelled = useMemo(() => {
        const count = wide ? LABELLED.wide : LABELLED.narrow;
        return new Set([...have.slice(0, count), ...gaps.slice(0, count)].map((point) => point.skill));
    }, [have, gaps, wide]);

    if (have.length === 0 && gaps.length === 0) return null;
    const max = axisDomainMax(Math.max(0, ...have.map((p) => p.percent), ...gaps.map((p) => p.percent)));

    return (
        <div className={"h-[280px] w-full"}>
            <ResponsiveContainer width={"100%"} height={"100%"}>
                <ScatterChart margin={{top: 8, right: 12, bottom: 4, left: 0}}>
                    <CartesianGrid horizontal={false} stroke={"var(--border)"} />
                    <XAxis
                        type={"number"} dataKey={"percent"} domain={[0, max]} ticks={axisTicks(max)} unit={"%"}
                        tick={{fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains-mono), monospace"}}
                        axisLine={{stroke: "var(--border)"}} tickLine={false} height={26}
                    />
                    <YAxis
                        type={"number"} dataKey={"y"} domain={[-0.5, 1.5]} ticks={[GAP_LANE, HAVE_LANE]}
                        tickFormatter={(value: number) => (wide ? LANE_LABEL : SHORT_LANE_LABEL)[value] ?? ""}
                        tick={{fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains-mono), monospace"}}
                        axisLine={false} tickLine={false} width={wide ? 96 : 52}
                    />
                    <Tooltip content={<StripTooltip />} cursor={false} />
                    {([[have, "var(--chart-have)"], [gaps, "var(--chart-gap)"]] as const).map(([points, colour]) => (
                        <Scatter key={colour} data={points} isAnimationActive={false} shape={(props: DotProps) => (
                            <StripDot {...props} colour={colour} max={max} wide={wide} label={!!props.payload && labelled.has(props.payload.skill)} />
                        )} />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}
