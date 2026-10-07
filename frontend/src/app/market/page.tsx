import Link from "next/link";
import {ArrowRightIcon} from "lucide-react";

import FindingSquare from "@/components/market-page/FindingSquare";
import {fmt, longDate, shortDate} from "@/lib/market-page";
import {allMarkets, MARKET_NAMES, MARKET_PAGES, MarketBody, MarketInfo, marketPath} from "@/lib/market-pages";
import {cardLine, findingCount, findingShare, headline, question} from "@/lib/market-story";
import {keepLastPage} from "@/lib/landing/look-server";
import {publicPage} from "@/lib/seo";

/*
 * /market: every market page as a card with its lead finding as the title,
 * so the site reads as a place that reports on the job market and search
 * finds the pages through one hub. Server rendered; a failed fetch during a
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

/**
 * One page's card: kicker, the finding as the title, the question and the
 * count behind it, the finding's share as 100 squares, and "Read". The whole
 * card is the link, named by its title.
 */
function Card({info, page}: {info: MarketInfo; page: MarketBody | null}) {
    const c = page ? {info, page} : null, title = (c && headline(c)) ?? question({info});
    const lit = c ? findingShare(c) : null;
    return (
        <li className={"relative grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40 sm:grid-cols-[minmax(0,1fr)_132px] sm:gap-6 sm:p-6"}>
            <div className={"flex min-w-0 flex-col gap-3"}>
                <p className={"m-0 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>
                    {info.label}{page && <> · {fmt(page.jobs)} jobs · <span className={"whitespace-nowrap"}>{shortDate(page.taken_at)}</span></>}
                </p>
                <h2 className={"m-0 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.01em]"}>
                    <Link href={marketPath(info.name)} className={"after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"}>{title}</Link>
                </h2>
                <p className={"m-0 font-read text-[17px] leading-[1.5] text-foreground/85"}>{c ? cardLine(c) : question({info})}</p>
            </div>
            <div className={"flex flex-col items-end justify-between gap-4"}>
                {c && lit !== null ? <FindingSquare lit={lit} label={`${lit} of 100 squares lit. ${findingCount(c, `${info.subject} jobs`)}`} className={"w-full"} /> : <span />}
                <span aria-hidden className={"inline-flex items-center gap-1.5 text-[14px] font-medium text-primary"}>Read<ArrowRightIcon className={"size-4"} /></span>
            </div>
        </li>
    );
}

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
                {MARKET_NAMES.map((name) => <Card key={name} info={MARKET_PAGES[name]} page={pages[name]} />)}
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
