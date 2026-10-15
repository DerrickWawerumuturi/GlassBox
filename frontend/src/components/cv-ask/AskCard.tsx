'use client'

import React from "react";
import Link from "next/link";

import Chip from "@/components/cv-ask/Chip";
import {useHave} from "@/components/landing/useHave";
import {Ask, ASK, askCount} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

const COUNT = "font-heading font-bold leading-[0.9] tracking-[-0.03em] whitespace-nowrap";

/**
 * The answer on a page, after the visitor's own scan: "9 of these are on
 * your CV", the count in green, their skills lit, the rest grey and dashed.
 * Before a scan there is nothing here: the page shows "Compare your CV"
 * (CompareCv) instead. `read` sets the line in the market pages' reading face.
 */
export default function AskCard({ask, read, done}: {ask: Ask; read?: boolean; done?: {href: string; label: string; note: string | null}}) {
    const {k, n, mine} = askCount(ask.skills, useHave());
    if (k === null) return null;
    return (
        <section id={"cv"} aria-labelledby={"cv-h"}
                 className={"mt-20 scroll-mt-[70px] rounded-[14px] border border-border bg-card p-5 sm:mt-28 sm:p-[26px]"}>
            <h2 id={"cv-h"} className={"m-0 mb-1 font-heading text-[20px] leading-[1.2] font-bold sm:text-[28px]"}>{ASK.done(k)}</h2>
            <p className={cn("m-0 mb-[18px] text-[16px] leading-[1.5] text-foreground/85", read && "font-read")}>{ASK.sub(ask)}</p>
            <div className={"grid items-center gap-[22px] sm:grid-cols-[auto_1fr]"}>
                <div className={cn(COUNT, "text-[40px] text-chart-have sm:text-[56px]")}>
                    {k} of {n}
                    <small className={"mt-1.5 block font-mono text-[14px] font-medium tracking-normal text-muted-foreground"}>{ASK.count}</small>
                </div>
                <div className={"flex flex-wrap gap-1.5"}>
                    {ask.skills.map((s, i) => <Chip key={s.key} name={s.name} have={mine[i]} />)}
                </div>
            </div>
            {done && (
                <div className={"mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2"}>
                    <Link href={done.href} className={"text-[14px] text-foreground underline underline-offset-[3px]"}>{done.label}</Link>
                    {done.note && <span className={"font-mono text-[12px] text-muted-foreground"}>{done.note}</span>}
                </div>
            )}
        </section>
    );
}
