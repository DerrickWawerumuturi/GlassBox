'use client'

import React, {useState} from "react";

import {useWidth} from "@/components/dashboard/MarketParts";
import {Skill, SkillData} from "./skill-data";

/*
 * Concept C: bridges. Your skills on the left, the most asked skills you
 * don't have on the right, joined by how many postings ask for both. A thick
 * bridge is a natural next step from something you already know.
 *
 * What a skill gets you, kept light (founder: "not too much reading"): each
 * skill on the right carries one number, how many postings ask for it, and
 * the one sentence under the chart appears only for the skill you hover or
 * pick. The best next step on the right has its number in lime: the most
 * asked skill that, on its own, brings any posting within reach. (Ranking by
 * that gain alone picked a 14-posting skill over a 25-posting one on a
 * one-posting difference; too thin to lead with.)
 */

const ROWS = 8, ROW = 40;

export default function Bridges({data}: {data: SkillData}) {
    const [host, W] = useWidth<HTMLDivElement>();
    // Hover previews, a click pins; the pinned skill stays lit after the pointer leaves.
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const focus = hover ?? pinned;
    const phone = W < 520;
    // A phone gives the right side more room (longer names, plus a count) and drops the
    // dots beside the names: the column headings already say which side is which.
    const [labelL, labelR] = phone ? [96, 140] : [168, 168];

    const left = data.skills.filter((s) => s.have).slice(0, ROWS);
    const gaps = data.skills.filter((s) => !s.have).slice(0, 14);
    // The right side: gaps ordered by how strongly they connect to what you have.
    const strength = (k: string) => left.reduce((n, m) => n + data.together(k, m.key), 0);
    const right = [...gaps].sort((a, b) => strength(b.key) - strength(a.key)).slice(0, ROWS);
    // Every pair shares some posting; drawing all of them hid the strong ones. Each skill on
    // the left keeps its three strongest bridges.
    const bridges = left.flatMap((a, i) => right.map((b, j) => ({a, b, i, j, n: data.together(a.key, b.key)}))
        .filter((x) => x.n > 0).sort((x, y) => y.n - x.n).slice(0, 3));
    const max = Math.max(1, ...bridges.map((x) => x.n));
    const base = data.reach(data.mine);
    const gain = (k: string) => data.reach(new Set([...data.mine, k])) - base;
    const first = [...right].filter((r) => gain(r.key) > 0).sort((a, b) => b.count - a.count)[0]?.key;
    const H = Math.max(left.length, right.length) * ROW + 12;
    const [x0, x1] = [labelL + 10, W - labelR - 10];
    const y = (k: number) => 6 + k * ROW + ROW / 2;
    const lit = (x: {a: {key: string}; b: {key: string}}) => focus === x.a.key || focus === x.b.key;

    const side = (items: typeof left, align: "left" | "right") => items.map((s, k) => {
        const on = focus === s.key;
        return (
            <button key={s.key} type={"button"} aria-pressed={pinned === s.key} onClick={() => setPinned(pinned === s.key ? null : s.key)}
                    onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)}
                    className={"absolute flex items-center gap-1.5 truncate rounded-md px-1 sm:gap-2 sm:px-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 sm:text-[14px] "
                        + (align === "left" ? "justify-end text-right " : "justify-start text-left ")
                        + (on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}
                    style={{top: y(k) - 14, height: 28, width: align === "left" ? labelL : labelR, [align]: 0}}>
                {align === "right" && !phone && <Dot have={s.have} />}
                <span className={"truncate"}>{s.name}</span>
                {align === "right" && (
                    <span className={"ml-auto shrink-0 rounded-full px-1.5 font-mono text-[12px] "
                        + (s.key === first ? "bg-[var(--accent-lime)] font-bold text-[var(--accent-lime-ink)]" : "font-normal text-muted-foreground")}
                          title={s.key === first ? "Best next step" : undefined}>{s.count}</span>
                )}
                {align === "left" && !phone && <Dot have={s.have} />}
            </button>
        );
    });

    return (
        <div ref={host} className={"relative w-full"}>
            <div className={"flex justify-between font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground"}>
                <span>You have</span><span>Not yet · postings</span>
            </div>
            {W > 0 && (
                <div className={"relative mt-2"} style={{height: H}}>
                    <svg width={W} height={H} className={"absolute inset-0"} aria-hidden>
                        {bridges.map((x) => {
                            const [ya, yb] = [y(x.i), y(x.j)], mid = (x0 + x1) / 2;
                            const on = lit(x);
                            return (
                                <g key={`${x.a.key}-${x.b.key}`}>
                                    <path d={`M ${x0} ${ya} C ${mid} ${ya}, ${mid} ${yb}, ${x1} ${yb}`} fill={"none"}
                                          stroke={on ? "var(--chart-have)" : "var(--foreground)"}
                                          strokeOpacity={on ? 0.75 : focus ? 0.05 : 0.08 + (x.n / max) * 0.25}
                                          strokeWidth={1 + (x.n / max) * 11} strokeLinecap={"round"} />
                                    {on && <text x={focus === x.a.key ? x1 - 8 : x0 + 8} y={(focus === x.a.key ? yb : ya) - 8}
                                                 textAnchor={focus === x.a.key ? "end" : "start"} fontSize={12}
                                                 className={"font-mono"} fill={"var(--foreground)"}>{x.n}</text>}
                                </g>
                            );
                        })}
                    </svg>
                    {side(left, "left")}
                    {side(right, "right")}
                </div>
            )}
            <p aria-live={"polite"} className={"mt-3 min-h-[44px] border-t border-border pt-3 text-[15px]"}>
                <Readout data={data} focus={focus} left={left} right={right} gain={gain} />
            </p>
        </div>
    );
}

function Dot({have}: {have: boolean}) {
    return have
        ? <span aria-hidden className={"size-2.5 shrink-0 rounded-full bg-[var(--chart-have)]"} />
        : <span aria-hidden className={"bar-gap size-2.5 shrink-0 rounded-full border border-[var(--chart-gap)]"} />;
}

/** One sentence for the skill in focus, nothing otherwise. */
function Readout({data, focus, left, right, gain}: {
    data: SkillData; focus: string | null; left: Skill[]; right: Skill[]; gain: (k: string) => number;
}) {
    const s = focus ? data.byKey.get(focus) : undefined;
    if (!s) return <span className={"text-muted-foreground"}>Hover or tap a skill.</span>;
    if (s.have) {
        const best = right.map((r) => ({r, n: data.together(s.key, r.key)})).sort((a, b) => b.n - a.n)[0];
        return best?.n
            ? <><b>{s.name}</b> leads most often to <b>{best.r.name}</b>: {best.n} postings ask for both.</>
            : <><b>{s.name}</b> rarely appears with these skills.</>;
    }
    const mate = left.map((m) => ({m, n: data.together(s.key, m.key)})).sort((a, b) => b.n - a.n)[0];
    const g = gain(s.key);
    return (
        <>
            <b>{s.name}</b>: {s.count} of {data.total} postings ask.
            {mate?.n ? <> {mate.n} of them also ask for your {mate.m.name}.</> : null}
            {g > 0 ? <> On its own it brings {g} more within reach.</> : null}
        </>
    );
}
