import React from "react";
import Link from "next/link";

import {fmt, levelLabel, weekDate, weekStart} from "@/lib/market-page";
import {MARKET_NAMES, MARKET_PAGES, MarketBody, MarketName, marketPath} from "@/lib/market-pages";
import {citeLine, Ctx, topic} from "@/lib/market-story";
import {SITE_URL} from "@/lib/site";

/*
 * The end of a market page and its rail: how we counted, the jobs in a fold
 * and a cite line; then "In this count" and "More from the count", which sits
 * beside the article on a desktop and under it on a phone.
 */

const HOW = {
    entry: [
        "Entry level means one of three things. The job's level reads as intern, entry level or junior. Or its title says intern, graduate, new grad, entry level, early career or junior. Or it requires 2 years of experience or less and its level isn't senior.",
        "Software means five job types: software engineering, backend, frontend, full stack and mobile.",
    ],
    role: ["The job type comes from the title. Senior means a senior, lead or principal level in the same job type."],
};

export function Method({c}: {c: Ctx}) {
    const {info, page} = c;
    return (
        <section id={"method"} aria-labelledby={"method-h"} className={"mt-[72px] scroll-mt-[70px] border-t border-border pt-[22px]"}>
            <h2 id={"method-h"} className={"m-0 mb-[18px] font-heading text-[22px] font-bold"}>How we counted</h2>
            <div className={"flex flex-col gap-4 font-read text-[15px] leading-[1.7] text-foreground/85"}>
                {info.kind === "role" && <p className={"m-0"}>{info.counts}</p>}
                {HOW[info.kind].map((p) => <p key={p} className={"m-0"}>{p}</p>)}
                <p className={"m-0"}>
                    Skills are matched against a list of about 250, by fixed rules, in the {fmt(page.readable)} jobs long enough to read.
                    {" "}<Link href={"/method"} className={"text-primary underline-offset-4 hover:underline"}>How Glassbox counts</Link>.
                </p>
            </div>
            <details className={"my-4 rounded-[10px] border border-border px-4 py-3"}>
                <summary className={"cursor-pointer font-heading text-[15px] font-semibold"}>The {fmt(page.jobs)} jobs we counted</summary>
                <p className={"mt-2 text-[14px] text-muted-foreground"}>
                    {`${fmt(page.titles.length)} of the ${fmt(page.jobs)}, one employer at a time. Titles and employers only, never the ads.`}
                </p>
                <ul className={"grid gap-x-6 sm:grid-cols-2"}>
                    {page.titles.map(([title, company, level, years], i) => {
                        const chip = levelLabel(level, years);
                        return (
                            <li key={`${company}-${title}-${i}`} className={"flex min-w-0 flex-col gap-0.5 border-b border-border py-2.5"}>
                                <span className={"break-words text-[15px] font-medium leading-snug"}>{title}</span>
                                <span className={"flex flex-wrap items-center gap-x-2 font-mono text-[12px] text-muted-foreground"}>
                                    <span>{company}</span>{chip && <><span aria-hidden>·</span><span>{chip}</span></>}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </details>
            <p className={"rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-[12px] leading-[1.6] break-words text-muted-foreground"}>
                {citeLine(c, new URL(SITE_URL).host)}
            </p>
        </section>
    );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});

export function Rail({c, others}: {c: Ctx; others: Partial<Record<MarketName, MarketBody | null>>}) {
    const {info, page} = c;
    const facts: Array<[string, string]> = [
        [`${info.label} jobs`, fmt(page.jobs)], ["Employers", fmt(page.employers)],
        ...(page.internships ? [["Internships", fmt(page.internships)] as [string, string]] : []),
        ["Remote", fmt(page.remote)], ["Week of", day(weekStart(page))],
    ];
    const more = MARKET_NAMES.filter((n) => n !== info.name);
    const h3 = "m-0 mb-1.5 font-heading text-[14px] font-bold uppercase tracking-[0.06em]";
    const link = "font-heading text-[16px] font-semibold leading-[1.3] no-underline hover:underline hover:underline-offset-[3px]";
    const item = "grid grid-cols-[30px_1fr] gap-3 border-b border-border py-[13px] before:grid before:size-[26px] before:place-items-center before:rounded-full before:border-[1.5px] before:border-foreground before:font-mono before:text-[12px] before:font-semibold before:content-[counter(m)] [counter-increment:m]";
    return (
        <aside aria-label={"About this count"}>
            <div className={"lg:sticky lg:top-[76px]"}>
                <div className={"border-t-2 border-foreground pt-3"}>
                    <h3 className={h3}>In this count</h3>
                    <dl className={"m-0 grid grid-cols-[1fr_auto] text-[14px]"}>
                        {facts.map(([k, v]) => (
                            <React.Fragment key={k}>
                                <dt className={"m-0 border-b border-border py-[9px]"}>{k}</dt>
                                <dd className={"m-0 border-b border-border py-[9px] text-right font-mono font-semibold"}>
                                    {k === "Week of" ? <time dateTime={weekStart(page)}>{v}</time> : v}
                                </dd>
                            </React.Fragment>
                        ))}
                    </dl>
                </div>
                <nav aria-label={"More from the count"} className={"mt-[30px] border-t-2 border-foreground pt-3"}>
                    <h3 className={h3}>More from the count</h3>
                    <ol className={"m-0 list-none p-0 [counter-reset:m]"}>
                        {more.map((n) => (
                            <li key={n} className={item}>
                                <span>
                                    <Link href={marketPath(n)} className={link}>{topic({info: MARKET_PAGES[n]})}</Link>
                                    {others[n] && <small className={"mt-[3px] block font-mono text-[12px] text-muted-foreground"}>{fmt(others[n]!.jobs)} jobs</small>}
                                </span>
                            </li>
                        ))}
                        <li className={item}><span><Link href={"/market"} className={link}>Every market page</Link>
                            <small className={"mt-[3px] block font-mono text-[12px] text-muted-foreground"}>counted in the week of {weekDate(page)}</small></span></li>
                        <li className={item}><span><Link href={"/method"} className={link}>How Glassbox counts</Link>
                            <small className={"mt-[3px] block font-mono text-[12px] text-muted-foreground"}>sources, rules, limits</small></span></li>
                    </ol>
                </nav>
            </div>
        </aside>
    );
}
