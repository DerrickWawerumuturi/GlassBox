'use client'

import React, {useState} from "react";

import {SkillData, staircase} from "./skill-data";

/*
 * Concept A: the next-skill staircase. Today's reach is the green first
 * step; each next step is the skill that brings the most postings within
 * reach, hatched because it is not yours yet. The first one wears the lime
 * "Start here". Selecting a step lists the postings it opens.
 */

export default function Staircase({data}: {data: SkillData}) {
    const {start, steps} = staircase(data);
    const [open, setOpen] = useState(0);
    const top = Math.max(1, steps.at(-1)?.reachAfter ?? start);
    // Bars share one scale, the last step = 170px, so the climb fills the space and the treads always fit.
    const height = (n: number) => `${Math.max(6, (n / top) * 170)}px`;
    const chosen = steps[open];

    return (
        <div className={"flex flex-col gap-6"}>
            <ol className={"grid grid-cols-6 items-end gap-1.5 sm:gap-3"} style={{height: 260}} aria-label={"Learning path"}>
                <li className={"flex h-full flex-col justify-end"}>
                    <Tread label={"Today"} value={start} sub={"within reach"} />
                    <div className={"rounded-t-md bg-[var(--chart-have)]"} style={{height: height(start)}} />
                </li>
                {steps.map((s, i) => (
                    <li key={s.skill.key} className={"flex h-full flex-col justify-end"}>
                        <button type={"button"} onClick={() => setOpen(i)} aria-pressed={open === i}
                                className={"group flex h-full flex-col justify-end text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"}>
                            <Tread label={s.skill.name} value={s.reachAfter} sub={`+${s.opens}`} active={open === i} first={i === 0} />
                            <div className={"bar-gap rounded-t-md border border-[var(--chart-gap)]/50 transition-[filter] group-hover:brightness-150 "
                                + (open === i ? "brightness-150" : "")} style={{height: height(s.reachAfter)}} />
                        </button>
                    </li>
                ))}
            </ol>
            <div className={"border-t border-border pt-3 font-mono text-[12px] text-muted-foreground"}>
                Out of the {data.measured} postings that list required skills, {steps.at(-1)?.reachAfter ?? start} would be within reach after these five.
            </div>
            {chosen && (
                <div aria-live={"polite"}>
                    <p className={"text-[15px]"}>
                        Learning <b>{chosen.skill.name}</b> after {open === 0 ? "what you have" : steps.slice(0, open).map((s) => s.skill.name).join(", ")}{" "}
                        brings <b>{chosen.opens}</b> more {chosen.opens === 1 ? "posting" : "postings"} within reach:
                    </p>
                    <ul className={"mt-2 grid gap-1 sm:grid-cols-2"}>
                        {chosen.opened.slice(0, 8).map((p, i) => (
                            <li key={i} className={"truncate text-[14px] text-muted-foreground"}>
                                <span className={"text-foreground"}>{p.title}</span>{p.company && ` · ${p.company}`}
                            </li>
                        ))}
                        {chosen.opened.length > 8 && <li className={"text-[14px] text-muted-foreground"}>and {chosen.opened.length - 8} more</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Tread({label, value, sub, active, first}: {label: string; value: number; sub: string; active?: boolean; first?: boolean}) {
    return (
        <div className={"mb-2 min-w-0"}>
            {first && <span className={"mb-1 inline-block rounded-full bg-[var(--accent-lime)] px-1.5 font-mono text-[12px] font-bold text-[var(--accent-lime-ink)]"}>Start here</span>}
            <div className={"truncate text-[13px] sm:text-[14px] " + (active ? "font-semibold text-foreground" : "text-muted-foreground")} title={label}>{label}</div>
            <div className={"font-heading text-[20px] font-semibold leading-tight sm:text-[28px]"}>{value}</div>
            <div className={"font-mono text-[12px] text-muted-foreground"}>{sub}</div>
        </div>
    );
}
