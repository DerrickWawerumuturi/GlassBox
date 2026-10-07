'use client'

import React from "react";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import Chip from "@/components/cv-ask/Chip";
import {useHave} from "@/components/landing/useHave";
import {Ask, ASK, askCount} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

const COUNT = "font-heading font-bold leading-[0.9] tracking-[-0.03em] whitespace-nowrap";

/**
 * The CV ask on a page, as a question about the skills just shown: "How many
 * of these are on your CV?", "? of 15", the skills unlit. After the visitor's
 * own scan it answers: the count in green, their skills lit, the rest grey
 * and dashed. `data-cv-ask` lets the sticky line step aside while it is in
 * view (one ask on screen at a time). `read` sets the line in the market
 * pages' reading face.
 */
export default function AskCard({ask, scanning, onFind, read, done}: {
    ask: Ask; scanning: boolean; onFind: () => void; read?: boolean; done?: {href: string; label: string; note: string};
}) {
    const {k, n, mine} = askCount(ask.skills, useHave());
    const answered = k !== null;
    return (
        <section id={"cv"} data-cv-ask aria-labelledby={"cv-h"}
                 className={"mt-20 scroll-mt-[70px] rounded-[14px] border border-border bg-card p-5 sm:mt-28 sm:p-[26px]"}>
            <h2 id={"cv-h"} className={"m-0 mb-1 font-heading text-[20px] leading-[1.2] font-bold sm:text-[28px]"}>
                {answered ? ASK.done(k) : ASK.question}
            </h2>
            <p className={cn("m-0 mb-[18px] text-[16px] leading-[1.5] text-foreground/85", read && "font-read")}>{ASK.sub(ask)}</p>
            <div className={"grid items-center gap-[22px] sm:grid-cols-[auto_1fr]"}>
                <div className={cn(COUNT, "text-[40px] sm:text-[56px]", answered && "text-chart-have")}>
                    {answered ? k : <span className={"text-muted-foreground"}>?</span>} of {n}
                    <small className={"mt-1.5 block font-mono text-[14px] font-medium tracking-normal text-muted-foreground"}>{ASK.count}</small>
                </div>
                <div className={"flex flex-wrap gap-1.5"}>
                    {ask.skills.map((s, i) => <Chip key={s.key} name={s.name} have={mine[i]} />)}
                </div>
            </div>
            <div className={"mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2"}>
                {answered ? (
                    <>
                        {done && <Link href={done.href} className={"text-[14px] text-foreground underline underline-offset-[3px]"}>{done.label}</Link>}
                        {done && <span className={"font-mono text-[12px] text-muted-foreground"}>{done.note}</span>}
                    </>
                ) : (
                    <>
                        <Button className={"h-10 rounded-full px-[18px] text-[14px]"} onClick={onFind} disabled={scanning}>{ASK.cta}</Button>
                        <span className={"font-mono text-[12px] text-muted-foreground"} role={scanning ? "status" : undefined}>{scanning ? ASK.reading : ASK.small}</span>
                    </>
                )}
            </div>
        </section>
    );
}

/**
 * The same ask in one line, for the landing page's count card: "? of the 10
 * skills backend jobs ask for most are on your CV.", following the job type
 * picked. After a scan the number is the visitor's own, in green.
 */
export function AskInline({ask, scanning, onFind}: {ask: Ask; scanning: boolean; onFind: () => void}) {
    const {k} = askCount(ask.skills, useHave());
    return (
        <div data-cv-ask className={"mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border px-3 py-2.5"}>
            <p className={"m-0 min-w-[200px] flex-1 text-[14px] leading-[1.4]"}>
                <b className={cn("font-heading text-[20px] font-bold", k === null ? "text-muted-foreground" : "text-chart-have")}>{k ?? "?"}</b> {ASK.line(ask)}
            </p>
            {k === null && <Button className={"h-8 rounded-full px-3.5 text-[14px]"} onClick={onFind} disabled={scanning}>{ASK.cta}</Button>}
        </div>
    );
}
