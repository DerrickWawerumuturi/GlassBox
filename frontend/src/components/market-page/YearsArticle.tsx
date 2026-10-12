import React from "react";
import Link from "next/link";

import BylineActions from "@/components/market-page/BylineActions";
import Faq from "@/components/market-page/Faq";
import {Figure, Stacked, TableTwin} from "@/components/market-page/Figures";
import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import {P} from "@/components/market-page/StorySections";
import TitleBar from "@/components/market-page/TitleBar";
import {marketAskSkills} from "@/lib/cv-ask";
import {fmt, weekDate, weekStart} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {MARKET_PAGES, marketPath} from "@/lib/market-pages";
import {UNAVAILABLE} from "@/lib/market-story";
import {articleStructuredData} from "@/lib/seo";
import {SITE_URL} from "@/lib/site";
import {
    bucketLabel, bucketWords, softwareLine, TOPIC, yearsAnswer, YearsCounts, yearsFaq, yearsHeadline, yearsLabel, yearsRows, YEARS_METHOD,
} from "@/lib/years-answer";

/*
 * /market/entry-level-software/years-of-experience: one question, answered
 * from the entry level page's weekly count (lib/years-answer.ts). The market
 * pages' look: breadcrumb, the answer as the H1, a counted
 * dek, the byline, a pull stat and one figure, the questions, the CV ask and
 * the method (docs/decisions/market-pages.md, "Years of experience").
 */

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
const INFO = MARKET_PAGES["entry-level-software"];
export const CRUMBS: Array<[string, string]> = [[INFO.label, marketPath(INFO.name)], ["Years of experience", YEARS_PATH]];

const TONE = (from: number) => (from <= 2 ? "lime" : from <= 4 ? "soft" : "ink") as "lime" | "soft" | "ink";

function Chart({c}: {c: YearsCounts}) {
    const rows = yearsRows(c), date = `week of ${weekDate(c.page)}`;
    return (
        <Figure title={"Years each job asks for"} sub={"Software jobs, by the years of experience they require"}
                chips={rows.map((r) => `${fmt(r.total)} ${r.name.toLowerCase()}`)} date={date}
                caption={"Lime: two years or less. Grey: three or four. Ink: five or more. Hatched: no number stated."}>
            <div role={"img"} aria-label={yearsLabel(c)}>
                {rows.map((r) => (
                    <div key={r.name} className={"mb-3"}>
                        <h3 className={"mb-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground"}>{r.name} · {fmt(r.total)} jobs</h3>
                        <Stacked label={""} parts={[
                            ...r.buckets.map((b) => ({label: bucketLabel(b), value: b.jobs, tone: TONE(b.from)})),
                            {label: "None stated", value: r.unstated, tone: "hatch" as const},
                        ]} />
                    </div>
                ))}
            </div>
            <TableTwin head={["Years asked", ...rows.map((r) => r.name)]}
                       rows={[...rows[0].buckets.map((b, i) => [bucketWords(b), ...rows.map((r) => fmt(r.buckets[i].jobs))]),
                           ["None stated", ...rows.map((r) => fmt(r.unstated))]]} />
        </Figure>
    );
}

export default function YearsArticle({c}: {c: YearsCounts | null}) {
    const h = c ? yearsHeadline(c) : TOPIC, faq = c ? yearsFaq(c) : [];
    const cite = c ? `Glassbox. "${h}" Counted in the week of ${weekDate(c.page)}. ${new URL(SITE_URL).host}${YEARS_PATH}` : "";
    const body = (
        <div className={"pb-24"}>
            {c && <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(articleStructuredData(YEARS_PATH, CRUMBS, c.page, h, yearsAnswer(c), faq))}} />}
            {c && <TitleBar title={h} />}
            <section className={`${WRAP} pt-11`}>
                <nav aria-label={"Breadcrumb"} className={"mb-3.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground"}>
                    <Link href={"/market"} className={"no-underline hover:text-foreground"}>Market</Link> /{" "}
                    <Link href={CRUMBS[0][1]} className={"no-underline hover:text-foreground"}>{CRUMBS[0][0]}</Link> / <span aria-current={"page"}>{CRUMBS[1][0]}</span>
                </nav>
                <h1 className={"m-0 max-w-[920px] font-heading text-[36px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[56px]"}>{h}</h1>
                <p className={"mt-[26px] max-w-[800px] font-read text-[20px] leading-[1.45] sm:text-[23px]"}>{c ? yearsAnswer(c) : UNAVAILABLE}</p>
                {c && (
                    <div className={"mt-[34px] flex max-w-[920px] flex-wrap items-center justify-between gap-4 border-t border-border py-3.5"}>
                        <div className={"text-[14px]"}>
                            Counted by <b className={"font-heading"}>Glassbox</b>
                            <span className={"mt-0.5 block font-mono text-[12px] text-muted-foreground"}>
                                <time dateTime={weekStart(c.page)}>Counted in the week of {weekDate(c.page)}</time> · Updated every Monday
                            </span>
                        </div>
                        <BylineActions url={`${SITE_URL}${YEARS_PATH}`} title={h} cite={cite} />
                    </div>
                )}
            </section>
            {c && (
                <div className={`${WRAP} pt-[72px]`}>
                    <article className={"min-w-0 max-w-[680px]"}>
                        <div id={"lead-visual"} className={"grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_1fr] sm:gap-[22px] border-t-2 border-b border-t-foreground border-b-border py-[22px]"}>
                            <b className={"font-heading text-[56px] leading-[0.85] tracking-[-0.04em] sm:text-[88px]"}>{fmt(c.titled.unstated)} of {fmt(c.titled.stated + c.titled.unstated)}</b>
                            <p className={"m-0 font-read text-[17px]"}>software jobs with an early career title state no number of years.</p>
                        </div>
                        <Chart c={c} />
                        {softwareLine(c) && <P>{softwareLine(c)}</P>}
                        <Faq items={faq} />
                        <MarketCvAsk />
                        <section id={"method"} aria-labelledby={"method-h"} className={"mt-[72px] scroll-mt-[70px] border-t border-border pt-[22px]"}>
                            <h2 id={"method-h"} className={"m-0 mb-[18px] font-heading text-[22px] font-bold"}>How we counted</h2>
                            <div className={"flex flex-col gap-4 font-read text-[15px] leading-[1.7] text-foreground/85"}>
                                {YEARS_METHOD.map((p) => <p key={p} className={"m-0"}>{p}</p>)}
                                <p className={"m-0"}>
                                    <Link href={"/method"} className={"text-primary underline-offset-4 hover:underline"}>How Glassbox counts</Link>
                                    {" · "}<Link href={marketPath(INFO.name)} className={"text-primary underline-offset-4 hover:underline"}>The skills entry level software jobs name</Link>
                                </p>
                            </div>
                            <p className={"mt-4 rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-[12px] leading-[1.6] break-words text-muted-foreground"}>{cite}</p>
                        </section>
                    </article>
                </div>
            )}
        </div>
    );
    if (!c) return body;
    const ask = {skills: marketAskSkills(c.page), what: `skills ${INFO.subject} jobs name most`, jobs: c.page.readable, subject: INFO.subject};
    return <MarketAskProvider ask={ask} page={INFO.name}>{body}</MarketAskProvider>;
}
