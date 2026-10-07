import Link from "next/link";

import {fmt, longDate} from "@/lib/market-page";
import {allMarkets, MARKET_NAMES, MARKET_PAGES, marketPath} from "@/lib/market-pages";
import {findingText, glance, question} from "@/lib/market-story";
import {keepLastPage} from "@/lib/landing/look-server";
import {publicPage} from "@/lib/seo";

/*
 * /market: every market page with its job count and its first finding, so
 * the site reads as a place that reports on the job market and search finds
 * the pages through one hub. Server rendered; a failed fetch during a
 * revalidation keeps the last good hub (look-server.ts).
 */

const HUB = {
    title: "What are today's tech jobs asking for?",
    dek: "Five counts of today's live jobs, one question each. Every number says what it counts and when.",
    description: "The skills today's tech jobs name, counted from live jobs: entry level software, software engineering, AI, machine learning and DevOps.",
};

export const revalidate = 300;
export const metadata = publicPage("/market", {
    title: "What today's tech jobs ask for", description: HUB.description,
    share: {title: "What today's tech jobs ask for, counted", description: HUB.description}, ownImage: true, article: true,
});

export default async function MarketHub() {
    const pages = await allMarkets(keepLastPage());
    const taken = MARKET_NAMES.map((n) => pages[n]?.taken_at).find(Boolean);
    return (
        <main className={"mx-auto w-full max-w-[1120px] px-4 pt-11 pb-24 sm:px-6"}>
            <p className={"mb-3.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground"}>Market</p>
            <h1 className={"m-0 max-w-[920px] font-heading text-[36px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[56px]"}>{HUB.title}</h1>
            <p className={"mt-[26px] max-w-[800px] font-read text-[20px] leading-[1.45] sm:text-[23px]"}>{HUB.dek}</p>
            {taken && <p className={"mt-4 font-mono text-[12px] text-muted-foreground"}>Counted by Glassbox · <time dateTime={taken}>{longDate(taken)}</time></p>}
            <ol className={"mt-16 grid list-none gap-4 p-0 sm:mt-24 md:grid-cols-2"}>
                {MARKET_NAMES.map((name) => {
                    const info = MARKET_PAGES[name], page = pages[name], [first] = page ? glance({info, page}) : [];
                    return (
                        <li key={name} className={"flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-6"}>
                            <p className={"m-0 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>
                                {info.label}{page && ` · ${fmt(page.jobs)} jobs`}
                            </p>
                            <h2 className={"m-0 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.01em]"}>
                                <Link href={marketPath(name)} className={"underline-offset-4 hover:underline"}>{question({info})}</Link>
                            </h2>
                            {first && <p className={"m-0 font-read text-[17px] leading-[1.5] text-foreground/85"}>{findingText(first)}</p>}
                        </li>
                    );
                })}
                <li className={"flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-border p-5 sm:p-6"}>
                    <p className={"m-0 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>Method</p>
                    <h2 className={"m-0 font-heading text-[22px] font-bold leading-[1.2]"}>
                        <Link href={"/method"} className={"underline-offset-4 hover:underline"}>How Glassbox counts</Link>
                    </h2>
                    <p className={"m-0 font-read text-[17px] leading-[1.5] text-foreground/85"}>Where the jobs come from, how each one counts once, and what we can&apos;t see.</p>
                </li>
            </ol>
        </main>
    );
}
