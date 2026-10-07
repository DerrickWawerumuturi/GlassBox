'use client'

import React from "react";

import {cn} from "@/lib/utils";
import {useHave} from "@/components/landing/useHave";
import {normSkill} from "@/lib/landing/look";
import {ENTRY_COPY as C, EntryPage, fmt, pct} from "@/lib/market-page";

/**
 * The skills entry level software jobs name most, as a plain table: how many
 * jobs name each one and how many require it. After a scan on this page the
 * rows light up: green for a skill on the visitor's CV, a grey dashed mark
 * for one not on it yet (the landing page's rule: only their own scan).
 */
export default function EntrySkills({page}: {page: EntryPage}) {
    const have = useHave();
    const rows = page.skills.map((s) => ({...s, name: page.names[s.key] ?? s.key}))
        .map((s) => ({...s, mine: have ? have.has(normSkill(s.key)) || have.has(normSkill(s.name)) : null}));
    const mine = rows.filter((r) => r.mine).length;
    const th = "border-b border-border px-2.5 py-2 font-medium";
    const td = "border-b border-border px-2.5 py-2";
    return (
        <div className={"flex flex-col gap-3"}>
            {have && <p className={"text-[15px] font-medium"} role={"status"}>{C.haveLine(mine, rows.length)}</p>}
            {have && (
                <p aria-hidden className={"flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground"}>
                    <span className={"inline-flex items-center gap-2"}><i className={"inline-block size-3 rounded-[3px] bg-chart-have"} />{C.have}</span>
                    <span className={"inline-flex items-center gap-2"}><i className={"inline-block size-3 rounded-[3px] border border-dashed border-chart-gap"} />{C.notYet}</span>
                </p>
            )}
            <div className={"overflow-x-auto"}>
                <table className={"w-full border-collapse font-mono text-[12px] tabular-nums sm:text-[13px]"}>
                    <thead>
                        <tr className={"text-left uppercase tracking-[0.06em] text-muted-foreground"}>
                            <th className={th}>{C.skillCols.skill}</th>
                            <th className={cn(th, "text-right")}>{C.skillCols.any}</th>
                            <th className={cn(th, "text-right")}>{C.skillCols.required}</th>
                            <th className={cn(th, "hidden text-right sm:table-cell")}>{C.skillCols.share}</th>
                            {have && <th className={cn(th, "hidden sm:table-cell")}><span className={"sr-only"}>{C.skillCols.cv}</span></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.key}>
                                <td className={cn(td, "font-sans text-[14px] font-medium")}>
                                    <span className={"inline-flex items-center gap-2"}>
                                        {r.mine !== null && (
                                            <i aria-hidden className={cn("inline-block size-3 shrink-0 rounded-[3px]",
                                                r.mine ? "bg-chart-have" : "border border-dashed border-chart-gap")} />
                                        )}
                                        {r.name}
                                        {r.mine !== null && <span className={"sr-only sm:hidden"}>{`, ${r.mine ? C.have : C.notYet}`}</span>}
                                    </span>
                                </td>
                                <td className={cn(td, "text-right")}>{fmt(r.any)}<span className={"text-muted-foreground"}>/{fmt(page.readable)}</span></td>
                                <td className={cn(td, "text-right")}>{fmt(r.required)}</td>
                                <td className={cn(td, "hidden text-right sm:table-cell")}>{pct(r.any, page.readable)}%</td>
                                {have && <td className={cn(td, "hidden whitespace-nowrap text-muted-foreground sm:table-cell")}>{r.mine ? C.have : C.notYet}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
