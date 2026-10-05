'use client'

import React, {useId, useRef, useState} from "react";

import {useWidth} from "@/components/dashboard/MarketParts";
import {byConnection, jobsAsk, jobsLabel, Skill, SkillData, topRoles} from "@/lib/skill-bridges";

/*
 * Bridges, the skills page: your skills on the left, the most asked skills
 * you don't have on the right, joined by how many jobs ask for both. Each
 * bridge fades from green (what you have) to grey. Names of yours are in
 * --chart-have-ink (mint on the desk, deep green on paper). The right side is fixed:
 * most connected first, and lime marks that top skill only. It is a fact
 * about the scan, never advice; lime dims while another skill is in focus.
 *
 * Wide screens: three bridges per skill of yours, and a tooltip near a
 * not-yet skill with the jobs asking. A phone's chart is about 80px wide,
 * so it draws one bridge per skill at rest and all of a skill's bridges once
 * it is tapped; the readout carries what the tooltip would.
 */

const ROWS = 8, ROW = 40, REACH_PAD = 28;
// Room between a label and its line ends, where the counts sit, so they never land on a line.
const GUTTER = 24;

type Bridge = {a: Skill; b: Skill; i: number; j: number; n: number};

export default function Bridges({data}: {data: SkillData}) {
    const [host, W] = useWidth<HTMLDivElement>();
    const grad = useId();
    // Hover previews, a click pins; the pinned skill stays lit after the pointer leaves.
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    // Touch has no hover, so a tap shows the tooltip until the next tap.
    const [tapped, setTapped] = useState<string | null>(null);
    const touch = useRef(false);
    const focus = hover ?? pinned;
    const phone = W < 520;
    const [labelL, labelR] = phone ? [96, 120] : [168, 168];

    const left = data.skills.filter((s) => s.have).slice(0, ROWS);
    const ranked = byConnection(data, left, data.skills.filter((s) => !s.have).slice(0, 14)).slice(0, ROWS);
    const right = ranked.map((r) => r.skill);
    const top = ranked[0]?.links ? ranked[0] : null;
    const pairs: Bridge[] = left.flatMap((a, i) => right.map((b, j) => ({a, b, i, j, n: data.together(a.key, b.key)})))
        .filter((x) => x.n > 0);
    const lit = (x: Bridge) => focus === x.a.key || focus === x.b.key;
    // Each skill of yours keeps its strongest bridges; drawing every pair hid the strong ones.
    const perSkill = phone ? 1 : 3;
    const rest = left.flatMap((a) => pairs.filter((x) => x.a === a).sort((x, y) => y.n - x.n).slice(0, perSkill));
    const bridges = phone && focus ? [...new Set([...rest, ...pairs.filter(lit)])] : rest;
    const max = Math.max(1, ...pairs.map((x) => x.n));
    const base = data.reach(data.mine);
    const gain = (k: string) => data.reach(new Set([...data.mine, k])) - base;
    const lime = top && (!focus || focus === top.skill.key) ? top.skill.key : null;

    const H = Math.max(left.length, right.length) * ROW + 12;
    const [x0, x1] = [labelL + GUTTER, W - labelR - GUTTER];
    const y = (k: number) => 6 + k * ROW + ROW / 2;
    const tipKey = phone ? null : hover && !data.byKey.get(hover)?.have ? hover : tapped;
    const tipRow = right.findIndex((s) => s.key === tipKey);

    const handlers = (s: Skill) => ({
        onPointerDown: (e: React.PointerEvent) => { touch.current = e.pointerType !== "mouse"; },
        onPointerEnter: () => setHover(s.key), onPointerLeave: () => setHover(null),
        onFocus: () => setHover(s.key), onBlur: () => setHover(null),
        onClick: () => {
            setPinned(pinned === s.key ? null : s.key);
            setTapped(touch.current && !s.have && tapped !== s.key ? s.key : null);
        },
    });

    return (
        <div ref={host} className={"relative w-full"}>
            <div className={"flex justify-between font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground"}>
                <span>You have</span><span>Not yet</span>
            </div>
            {W > 0 && (
                <div className={"relative mt-2"} style={{height: H}}>
                    <svg width={W} height={H} className={"absolute inset-0"} aria-hidden>
                        <defs>
                            <linearGradient id={grad} gradientUnits={"userSpaceOnUse"} x1={x0} x2={x1} y1={0} y2={0}>
                                <stop offset={0} style={{stopColor: "var(--chart-have)"}} />
                                <stop offset={1} style={{stopColor: "var(--chart-gap)"}} />
                            </linearGradient>
                        </defs>
                        {bridges.map((x) => {
                            const [ya, yb] = [y(x.i), y(x.j)], mid = (x0 + x1) / 2;
                            return (
                                <path key={`${x.a.key}-${x.b.key}`} d={`M ${x0} ${ya} C ${mid} ${ya}, ${mid} ${yb}, ${x1} ${yb}`}
                                      fill={"none"} stroke={`url(#${grad})`} strokeOpacity={lit(x) ? 0.95 : focus ? 0.08 : 0.55}
                                      strokeWidth={1 + (x.n / max) * 11} strokeLinecap={"round"} />
                            );
                        })}
                        {/* Counts in the gutter beside the far end's label, never on a line. */}
                        {bridges.filter(lit).map((x) => {
                            const fromLeft = focus === x.a.key;
                            return <text key={`n-${x.a.key}-${x.b.key}`} x={fromLeft ? x1 + 8 : x0 - 8} y={(fromLeft ? y(x.j) : y(x.i)) + 4}
                                         textAnchor={fromLeft ? "start" : "end"} fontSize={12} className={"font-mono"}
                                         fill={"var(--muted-foreground)"}>{x.n}</text>;
                        })}
                    </svg>
                    {left.map((s, k) => (
                        <button key={s.key} type={"button"} aria-pressed={pinned === s.key} {...handlers(s)}
                                className={"absolute flex items-center justify-end gap-1.5 rounded-md text-right outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 sm:gap-2"}
                                style={{top: y(k) - ROW / 2 + 2, height: ROW - 4, width: labelL, left: 0}}>
                            <span className={`text-[13px] sm:text-[14px] ${fit(phone)} ${focus === s.key ? "font-semibold" : ""}`}
                                  style={{color: "var(--chart-have-ink)"}}>{s.name}</span>
                            <span aria-hidden className={"size-2 shrink-0 rounded-full bg-[var(--chart-have)]"} />
                        </button>
                    ))}
                    {right.map((s, k) => (
                        // The hit area is the whole row plus a margin into the chart, so "near" counts.
                        <button key={s.key} type={"button"} aria-pressed={pinned === s.key} {...handlers(s)}
                                aria-label={`${s.name}, ${jobsAsk(s.count)}`}
                                className={"absolute flex items-center justify-start rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"}
                                style={{top: y(k) - ROW / 2, height: ROW, width: labelR + REACH_PAD, right: 0, paddingLeft: REACH_PAD}}>
                            <NotYet skill={s} on={focus === s.key} lime={lime === s.key} phone={phone} />
                        </button>
                    ))}
                    {tipRow >= 0 && (
                        <div role={"tooltip"}
                             className={"pointer-events-none absolute z-10 flex items-center whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-mono text-[12px] leading-snug text-popover-foreground shadow-lg"}
                             style={{top: y(tipRow), transform: "translateY(-50%)", right: labelR + 6, maxWidth: W - labelR - 6}}>
                            {jobsAsk(right[tipRow].count)} for {right[tipRow].name}
                        </div>
                    )}
                </div>
            )}
            <p aria-live={"polite"} className={"mt-3 min-h-[44px] border-t border-border pt-3 text-[15px]"}>
                <Readout data={data} focus={focus} left={left} right={right} gain={gain} top={top} />
            </p>
        </div>
    );
}

// Long names wrap to two lines on a phone instead of being cut off.
const fit = (phone: boolean) => phone ? "line-clamp-2 break-words leading-[1.15]" : "truncate";

/** A not-yet skill: muted text in a dashed outline; lime fills the most connected one. */
function NotYet({skill, on, lime, phone}: {skill: Skill; on: boolean; lime: boolean; phone: boolean}) {
    const look = lime ? "border-[var(--accent-lime-edge)] bg-[var(--accent-lime)] font-semibold text-[var(--accent-lime-ink)]"
        : `border-dashed border-[var(--chart-gap)] ${on ? "font-semibold text-foreground" : "text-muted-foreground"}`;
    return <span className={`rounded-xl border px-2 py-0.5 text-left text-[13px] sm:text-[14px] ${fit(phone)} ${look}`}>{skill.name}</span>;
}

/** One sentence for the skill in focus; at rest, the one lime marks. */
function Readout({data, focus, left, right, gain, top}: {
    data: SkillData; focus: string | null; left: Skill[]; right: Skill[]; gain: (k: string) => number;
    top: {skill: Skill; links: number} | null;
}) {
    const s = focus ? data.byKey.get(focus) : undefined;
    if (!s) return top
        ? <>Most connected skill you don&apos;t have yet: <b>{top.skill.name}</b>. Linked to {top.links} of your skills.</>
        : <span className={"text-muted-foreground"}>Hover or tap a skill.</span>;
    if (s.have) {
        const best = right.map((r) => ({r, n: data.together(s.key, r.key)})).sort((a, b) => b.n - a.n)[0];
        return best?.n
            ? <><b>{s.name}</b> is asked most often with <b>{best.r.name}</b>: {jobsAsk(best.n)} for both.</>
            : <><b>{s.name}</b> rarely appears with these skills.</>;
    }
    const mate = left.map((m) => ({m, n: data.together(s.key, m.key)})).sort((a, b) => b.n - a.n)[0];
    const g = gain(s.key), roles = topRoles(data, s.key);
    return (
        <>
            <b>{s.name}</b>: {s.count} of {jobsLabel(data.total)} {s.count === 1 ? "asks" : "ask"}.
            {mate?.n ? <> {mate.n} of them also ask for your {mate.m.name}.</> : null}
            {g > 0 ? <> On its own it brings {g} more {g === 1 ? "job" : "jobs"} within reach.</> : null}
            {roles.length ? <> Asked by {roles.join(", ")}.</> : null}
        </>
    );
}
