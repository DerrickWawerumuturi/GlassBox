'use client'

import React, {useMemo} from 'react'

import {SkillMark} from "@/lib/market";
import {axisDomainMax, axisTicks} from "@/lib/chart-ramp";
import {anchorAt, LabelItem, placeLabels, spreadLabels} from "@/lib/chart-labels";
import {PlotFrame} from "@/components/Market/ChartPatterns";
import {markTip, monoWidth, TICK_FS, TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";

/*
 * The landscape, chart C of docs/brand/charts.html: every skill on one
 * demand axis, yours above the line as green dots and not yet below it as
 * hollow rings. Every "yours" dot is named, the top three "not yet" too, and
 * one lime pill marks the most-asked skill the CV lacks. The rest stay small
 * and hoverable, with a "+N more" note. Exact ties share one dot column and
 * one label. Under 600px the axis turns vertical, both lanes beside it and
 * the labels to the right, so nothing has to fit sideways on a phone.
 */

const FS = 12;
const DOT_OFF = 14;
const STACK = 13;
const LABELLED_GAPS = 3;

interface Group {
    have: boolean;
    count: number;
    percent: number;
    items: SkillMark[];
    labelled: boolean;
    text: string;
    pill: boolean;
}

interface Placed extends LabelItem {
    g?: Group;
    note?: string;
}

/** Marks become dot groups (ties stack), and the chart decides which groups get a name. */
function buildGroups(mine: SkillMark[], missing: SkillMark[], compact: boolean) {
    const groups: Group[] = [];
    for (const mark of [...mine, ...missing]) {
        const g = groups.find((x) => x.have === mark.have && x.count === mark.count);
        if (g) g.items.push(mark);
        else groups.push({have: mark.have, count: mark.count, percent: mark.percent, items: [mark], labelled: false, text: "", pill: false});
    }
    let rank = 0;
    for (const g of groups) {
        if (g.have) g.labelled = !compact;
        else { g.labelled = !compact && rank < LABELLED_GAPS; rank += g.items.length; }
        g.text = g.items.map((m) => m.label).join(" · ");
    }
    const first = groups.find((g) => !g.have);
    if (first && !compact) first.pill = true;
    const hidden = groups.filter((g) => !g.have && !g.labelled);
    const count = hidden.reduce((s, g) => s + g.items.length, 0);
    const lo = Math.min(...hidden.map((g) => g.percent)), hi = Math.max(...hidden.map((g) => g.percent));
    const note = count ? {text: `+${count} more, ${lo}% to ${hi}%`, at: (lo + hi) / 2} : null;
    return {groups, note};
}

function pillSub(g: Group): string | undefined {
    return g.pill ? "Most-asked skill not on your CV" : undefined;
}

/** A mark: a panel-coloured backing so leaders never touch it, then the dot or the ring. */
function Dot({cx, cy, have}: { cx: number; cy: number; have: boolean }) {
    return (
        <>
            <circle cx={cx} cy={cy} r={8} fill={"var(--panel-chart)"} />
            {have
                ? <circle cx={cx} cy={cy} r={6} fill={"var(--chart-have)"} className={"mark"} />
                : <circle cx={cx} cy={cy} r={5} fill={"var(--panel-chart)"} stroke={"var(--chart-gap)"} strokeOpacity={0.6} strokeWidth={2} className={"mark"} />}
        </>
    )
}

function Pill({x, y, text, anchor}: { x: number; y: number; text: string; anchor: "middle" | "end" | "start" }) {
    const w = monoWidth(text, FS) + 16;
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x + 4 - w : x - 4;
    return (
        <g>
            <rect x={x0} y={y - 10} width={w} height={20} rx={10} fill={"var(--accent-lime)"} />
            <text x={x0 + w / 2} y={y + 4} textAnchor={"middle"} fontSize={FS} fontWeight={700} fill={"var(--panel-chart)"}>{text}</text>
        </g>
    )
}

function Label({x, y, g, anchor}: { x: number; y: number; g: Group; anchor: "middle" | "end" | "start" }) {
    return (
        <text x={x} y={y} textAnchor={anchor} fontSize={FS} fontWeight={500} fill={"var(--foreground)"}>
            {g.text} <tspan fontWeight={400} fill={"var(--muted-foreground)"}>{g.count}</tspan>
        </text>
    )
}

const HIT = "outline-none";
const ROW = "[&:hover_.mark]:brightness-[1.18] [&:focus-within_.mark]:brightness-[1.18]";

export default function SkillStrip({mine, missing, jobs, compact = false}: {
    mine: SkillMark[];
    missing: SkillMark[];
    jobs: number;
    /** The overview's preview: dots and the axis only. */
    compact?: boolean;
}) {
    const [host, W] = useWidth<HTMLDivElement>();
    const {tip, bind} = useTip();
    const {groups, note} = useMemo(() => buildGroups(mine, missing, compact), [mine, missing, compact]);
    if (groups.length === 0) return null;

    const domain = axisDomainMax(Math.max(...groups.map((g) => g.percent)));
    const ticks = axisTicks(domain);
    const labelWidth = (g: Group) => (g.labelled ? monoWidth(`${g.text} ${g.count}`, FS) + (g.pill ? 16 : 0) : 0);
    const hit = (mark: SkillMark, g: Group) => bind(markTip(mark, jobs, pillSub(g)));

    /* ---------- horizontal: two lanes over one axis ---------- */
    function horizontal() {
        const padL = 6, padR = 6, laneGap = 20, tick0 = 12, axisH = 30, inset = compact ? 24 : 70;
        const plotX = padL, plotW = W - padL - padR;
        const x = (v: number) => plotX + inset + (v / domain) * (plotW - inset * 2);
        const noteW = note ? monoWidth(note.text, FS) + 4 : 0;

        const sides = [true, false].map((have) => {
            const side = groups.filter((g) => g.have === have);
            const items: Placed[] = side.filter((g) => g.labelled).map((g) => ({c: x(g.percent), w: labelWidth(g), g}));
            if (!have && note && !compact) items.push({c: x(note.at), w: noteW, note: note.text});
            placeLabels(items, plotX + 10, plotX + plotW - 10, 8, 3);
            const lanes = items.length ? 1 + Math.max(...items.map((it) => it.lane ?? 0)) : 0;
            const stack = Math.max(1, ...side.map((g) => g.items.length));
            const half = DOT_OFF + 8 + (lanes ? tick0 + lanes * laneGap + 6 : 4) + (stack - 1) * STACK;
            return {have, side, items, half, stack};
        });
        const axisY = sides[0].half, plotH = sides[0].half + sides[1].half, H = plotH + axisH;

        return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"block overflow-visible font-mono"} role={"img"}
                 aria-label={"Number line of skills by share of postings"}>
                <PlotFrame x={plotX} y={0} width={plotW} height={plotH} majors={ticks.map(x)} />
                <line x1={plotX + 12} y1={axisY} x2={plotX + plotW - 12} y2={axisY} stroke={"var(--muted-foreground)"} strokeOpacity={0.5} strokeWidth={1.5} />
                {ticks.map((t) => (
                    <text key={t} x={x(t)} y={plotH + 20} textAnchor={"middle"} fontSize={TICK_FS} fill={"var(--panel-chart-ink-faint)"}>{t === 0 ? "0" : `${t}%`}</text>
                ))}
                {!compact && (
                    // The preview has no room left of its first dot; its legend names the lanes instead.
                    <>
                        <text x={plotX + 16} y={axisY - 8} fontSize={12} fontWeight={500} letterSpacing={"0.1em"} fill={"var(--panel-chart-ink-faint)"}>YOURS</text>
                        <text x={plotX + 16} y={axisY + 15} fontSize={12} fontWeight={500} letterSpacing={"0.1em"} fill={"var(--panel-chart-ink-faint)"}>NOT YET</text>
                    </>
                )}
                {sides.map(({have, side, items, stack}) => {
                    const sgn = have ? -1 : 1;
                    const outerY = (g: Group) => axisY + sgn * (DOT_OFF + (g.items.length - 1) * STACK);
                    return (
                        <g key={String(have)}>
                            {items.map((it, i) => {
                                // Lanes start past the deepest stack of tied dots on this side.
                                const ly = axisY + sgn * (DOT_OFF + (stack - 1) * STACK + 8 + tick0 + (it.lane ?? 0) * laneGap + 4);
                                const textY = have ? ly : ly + 9;
                                const ax = anchorAt(it);
                                if (it.note) {
                                    return <text key={i} x={ax} y={textY} textAnchor={it.anchor} fontSize={FS} fill={"var(--panel-chart-ink-faint)"}>{it.note}</text>;
                                }
                                const g = it.g as Group;
                                return (
                                    <g key={i}>
                                        <line x1={it.c} y1={outerY(g) + sgn * 8} x2={it.c} y2={have ? ly + 4 : ly - 2} stroke={"var(--panel-chart-ink-faint)"} strokeOpacity={0.8} />
                                        {g.pill ? <Pill x={ax} y={have ? ly - 4 : ly + 5} text={`${g.text} ${g.count}`} anchor={it.anchor ?? "middle"} />
                                            : <Label x={ax} y={textY} g={g} anchor={it.anchor ?? "middle"} />}
                                    </g>
                                );
                            })}
                            {side.map((g) => g.items.map((mark, i) => {
                                const cx = x(g.percent), cy = axisY + sgn * (DOT_OFF + i * STACK);
                                return (
                                    <g key={mark.skill} className={ROW}>
                                        <Dot cx={cx} cy={cy} have={mark.have} />
                                        <circle cx={cx} cy={cy} r={13} fill={"transparent"} className={HIT} {...hit(mark, g)} />
                                    </g>
                                );
                            }))}
                        </g>
                    );
                })}
            </svg>
        );
    }

    /* ---------- vertical: the axis stands on the left, both lanes and every label to its right ---------- */
    function vertical() {
        const tickW = 34, inset = 26, plotH = 560, H = plotH + 4;
        const plotX = tickW, plotW = W - tickW, axisX = plotX + 14;
        const column = (g: Group) => axisX + (g.have ? 34 : 16);
        const stack = Math.max(1, ...groups.map((g) => g.items.length));
        const lx = axisX + 34 + (stack - 1) * STACK + 22;
        const y = (v: number) => inset + (1 - v / domain) * (plotH - inset * 2);
        // One column of labels, 17px apart, each nudged only as far from its mark as its neighbours force it.
        const labelled: Placed[] = groups.filter((g) => g.labelled).map((g) => ({c: y(g.percent), w: 16, g}));
        if (note) labelled.push({c: y(note.at), w: 16, note: note.text});
        const ys = spreadLabels(labelled.map((it) => it.c), 22, plotH - 14, 17);

        return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={"block overflow-visible font-mono"} role={"img"}
                 aria-label={"Number line of skills by share of postings"}>
                <PlotFrame x={plotX} y={0} width={plotW} height={plotH} majors={ticks.map(y)} vertical />
                <line x1={axisX} y1={12} x2={axisX} y2={plotH - 12} stroke={"var(--muted-foreground)"} strokeOpacity={0.5} strokeWidth={1.5} />
                {ticks.map((t) => (
                    <text key={t} x={plotX - 8} y={y(t) + 4} textAnchor={"end"} fontSize={TICK_FS} fill={"var(--panel-chart-ink-faint)"}>{t === 0 ? "0" : `${t}%`}</text>
                ))}
                {labelled.map((it, i) => {
                    const baseY = ys[i] + 4;
                    if (it.note) {
                        return <text key={i} x={lx} y={baseY} fontSize={FS} fill={"var(--panel-chart-ink-faint)"}>{it.note}</text>;
                    }
                    const g = it.g as Group;
                    const outerX = column(g) + (g.items.length - 1) * STACK;
                    return (
                        <g key={i}>
                            <line x1={outerX + 8} y1={it.c} x2={lx - 4} y2={ys[i]} stroke={"var(--panel-chart-ink-faint)"} strokeOpacity={0.8} />
                            {g.pill ? <Pill x={lx + 4} y={baseY - 4} text={`${g.text} ${g.count}`} anchor={"start"} />
                                : <Label x={lx} y={baseY} g={g} anchor={"start"} />}
                        </g>
                    );
                })}
                {groups.map((g) => g.items.map((mark, i) => {
                    const cx = column(g) + i * STACK, cy = y(g.percent);
                    return (
                        <g key={mark.skill} className={ROW}>
                            <Dot cx={cx} cy={cy} have={mark.have} />
                            <circle cx={cx} cy={cy} r={13} fill={"transparent"} className={HIT} {...hit(mark, g)} />
                        </g>
                    );
                }))}
            </svg>
        );
    }

    return (
        <div ref={host} className={"w-full"}>
            {W > 0 && (W >= 600 || compact ? horizontal() : vertical())}
            <TipBox tip={tip} />
        </div>
    )
}
