import React from "react";
import Link from "next/link";

import type {PageWeek, PageWeeks} from "@/lib/landing/look-server";
import {fmt, longDate} from "@/lib/market-page";
import {MarketInfo, marketPath, weekPath} from "@/lib/market-pages";

/*
 * The weekly archive's list (GitHub issue #16): every Monday's count of a
 * page, newest first, kept as it was published. The live week is the live
 * page itself; each past week has its own address (weekPath). On a past
 * week's page the week it shows is marked, not linked. Ends the article on
 * the live page and on each past week.
 */

/** The anchor the byline's "Past weeks" link jumps to. */
export const PAST_WEEKS_ID = "past-weeks";

function Row({at, href, current, jobs, info, note}: {
    at: string; href: string; current: boolean; jobs: number; info: MarketInfo; note?: string;
}) {
    const date = <time dateTime={at}>Week of {longDate(at)}</time>;
    return (
        <li className={"flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-border py-3"}>
            <span className={"font-heading text-[16px] font-semibold"}>
                {current ? <span aria-current={"page"}>{date}</span>
                    : <Link href={href} className={"text-primary underline-offset-4 hover:underline"}>{date}</Link>}
                {note && <span className={"ml-2 font-mono text-[12px] font-normal text-muted-foreground"}>{note}</span>}
            </span>
            <span className={"font-mono text-[12px] text-muted-foreground"}>{fmt(jobs)} {info.subject} jobs</span>
        </li>
    );
}

export default function PastWeeks({info, weeks, showing}: {info: MarketInfo; weeks: PageWeeks; showing?: string}) {
    if (!weeks.past.length) return null;
    const live: PageWeek | null = weeks.live;
    return (
        <section id={PAST_WEEKS_ID} aria-labelledby={"past-weeks-h"} className={"mt-[72px] scroll-mt-[70px] border-t border-border pt-[22px]"}>
            <h2 id={"past-weeks-h"} className={"m-0 mb-1.5 font-heading text-[22px] font-bold"}>Past weeks</h2>
            <p className={"m-0 mb-2 font-read text-[15px] leading-[1.6] text-foreground/85"}>
                Every Monday&apos;s count of {info.subject} jobs, kept as it was published.
            </p>
            <ol className={"m-0 list-none p-0"}>
                {live && <Row at={live.week} href={marketPath(info.name)} current={!showing} jobs={live.jobs} info={info} note={"latest count"} />}
                {weeks.past.map((w) => (
                    <Row key={w.week} at={w.week} href={weekPath(info.name, w.week)} current={w.week === showing} jobs={w.jobs} info={info} />
                ))}
            </ol>
        </section>
    );
}
