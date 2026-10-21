import React from "react";
import Link from "next/link";

import BylineActions from "@/components/market-page/BylineActions";
import CopyFact from "@/components/market-page/CopyFact";
import Faq from "@/components/market-page/Faq";
import LeadSquares from "@/components/market-page/LeadSquares";
import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import PastWeeks, {PAST_WEEKS_ID} from "@/components/market-page/PastWeeks";
import {ScanStatus} from "@/components/market-page/SkillName";
import {Method, Rail} from "@/components/market-page/StoryEnd";
import StorySections, {P} from "@/components/market-page/StorySections";
import TitleBar from "@/components/market-page/TitleBar";
import {Ask, marketAskSkills, marketWhat} from "@/lib/cv-ask";
import type {PageWeeks} from "@/lib/landing/look-server";
import {weekDate, weekStart} from "@/lib/market-page";
import {MarketBody, MarketInfo, MarketName, marketPath, weekPath} from "@/lib/market-pages";
import {citeLine, Ctx, dek, findingText, framing, glance, has, headline, skillName, thin, topic, UNAVAILABLE} from "@/lib/market-story";
import {marketFaq} from "@/lib/market-faq";
import {absolute, articleStructuredData, marketStructuredData} from "@/lib/seo";
import {SITE_URL} from "@/lib/site";

/*
 * One market page as an editorial data story, the same template for all five
 * (docs/decisions/market-pages.md): kicker, what the page counts, the lead
 * finding as the headline, dek, byline with the week counted, the lead
 * visual, a framing paragraph, three findings at a glance, the finding
 * sections the data supports, the CV ask, how we counted, the past weeks
 * and the rail. A past week (`showing`, GitHub issue #16) is the same page
 * with that week's count, dated at the top and addressed by its week.
 */

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

/** A past week's line at the top: which week, that the live page has moved on, and the way to it. */
function PastNote({info, page}: {info: MarketInfo; page: MarketBody}) {
    return (
        <p className={"mb-6 max-w-[800px] rounded-[10px] border border-border bg-card px-4 py-3 font-read text-[17px] leading-[1.5]"}>
            <time dateTime={weekStart(page)}>The week of {weekDate(page)}.</time> This is a past week; the live page counts again every Monday.{" "}
            <Link href={marketPath(info.name)} className={"whitespace-nowrap text-primary underline underline-offset-4"}>Latest count: {info.subject} jobs</Link>
        </p>
    );
}

function Head({info, page, c, path, showing, past}: {
    info: MarketInfo; page: MarketBody | null; c: Ctx | null; path: string; showing?: string; past: boolean;
}) {
    // The headline is the finding; what the page counts is its title when there is none.
    const q = topic({info}), h = c ? headline(c) : null;
    return (
        <>
            <nav aria-label={"Breadcrumb"} className={"mb-3.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground"}>
                <Link href={"/market"} className={"no-underline hover:text-foreground"}>Market</Link> / {showing && page
                    ? <><Link href={marketPath(info.name)} className={"no-underline hover:text-foreground"}>{info.label}</Link> / <span aria-current={"page"}>Week of {weekDate(page)}</span></>
                    : <span aria-current={"page"}>{info.label}</span>}
            </nav>
            {showing && page && <PastNote info={info} page={page} />}
            <h1 className={"m-0 max-w-[920px] font-heading text-[36px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[56px]"}>{h ?? q}</h1>
            <p className={"mt-[26px] max-w-[800px] font-read text-[20px] leading-[1.45] sm:text-[23px]"}>{c ? dek(c) : UNAVAILABLE}</p>
            {page && c && (
                <div className={"mt-[34px] flex max-w-[920px] flex-wrap items-center justify-between gap-4 border-t border-border py-3.5"}>
                    <div className={"text-[14px]"}>
                        Counted by <b className={"font-heading"}>Glassbox</b>
                        <span className={"mt-0.5 block font-mono text-[12px] text-muted-foreground"}>
                            <time dateTime={weekStart(page)}>Week of {weekDate(page)}</time> · a new count every Monday
                            {past && <> · <a href={`#${PAST_WEEKS_ID}`} className={"text-primary underline-offset-4 hover:underline"}>Past weeks</a></>}
                        </span>
                    </div>
                    <BylineActions url={absolute(path)} title={h ?? q} cite={citeLine(c, new URL(SITE_URL).host, path)} />
                </div>
            )}
        </>
    );
}

export default function MarketArticle({info, page, others, weeks, showing}: {
    info: MarketInfo; page: MarketBody | null; others: Partial<Record<MarketName, MarketBody | null>>;
    weeks: PageWeeks; showing?: string;
}) {
    const c: Ctx | null = page ? {info, page} : null;
    const path = showing ? weekPath(info.name, showing) : marketPath(info.name);
    const findings = c ? glance(c) : [], faq = c ? marketFaq(c) : [];
    // The skills the figures show, for the line a scan adds: "8 of the 19 skills in these charts are on your CV".
    const story = c?.page.story;
    const figureSkills = c && story ? [...new Set([
        ...(has(c, "languages") ? story.languages.bars : []), ...(has(c, "contrast") ? story.contrast : []),
        ...(has(c, "categories") ? story.categories.flatMap((g) => g.skills) : []),
    ])].map((k) => ({key: k, name: skillName(c, k)})) : [];
    // The CV ask: the skills these jobs name most, counted from the jobs we could read.
    const ask: Ask | null = c ? {skills: marketAskSkills(c.page), what: marketWhat(info.subject), jobs: c.page.readable, subject: info.subject} : null;
    const body = (
        <div className={"pb-24"}>
            {c && <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(showing
                // A past week's markup names its own address; its questions stay with the live page's FAQPage.
                ? articleStructuredData(path, [[info.label, marketPath(info.name)], [`Week of ${weekDate(c.page)}`, path]], c.page, headline(c) ?? topic({info}), dek(c))
                : marketStructuredData(info, c.page, dek(c), headline(c), faq))}} />}
            {c && <TitleBar title={headline(c) ?? topic({info})} />}
            <section className={`${WRAP} pt-11`}>
                <Head info={info} page={page} c={c} path={path} showing={showing} past={weeks.past.length > 0} />
                {c && (
                    <div className={"mt-[88px] sm:mt-[132px]"}>
                        <LeadSquares c={c} />
                        <p className={"mt-2.5 font-read text-[14px] text-muted-foreground"}>
                            A job listed on several boards or in several cities counts once.{" "}
                            <span className={"font-mono text-[12px]"}>Source: Glassbox count · <a href={"#method"} className={"text-primary"}>how we count</a></span>
                        </p>
                    </div>
                )}
            </section>
            {c && (
                <div className={`${WRAP} grid gap-6 pt-[72px] lg:grid-cols-[minmax(0,680px)_300px] lg:gap-20`}>
                    <article className={"min-w-0"}>
                        {framing(c).map((p, i) => <P key={p} first={i === 0}>{p}</P>)}
                        {findings.length > 0 ? (
                            <section aria-labelledby={"glance"} className={"relative mt-2 mb-2.5 rounded-[10px] border border-border px-[22px] pt-[22px] pb-2"}>
                                <span aria-hidden className={"absolute -top-px left-[22px] h-[5px] w-14 rounded-b-[3px] bg-foreground"} />
                                <h2 id={"glance"} className={"mt-1.5 mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground"}>At a glance</h2>
                                <ol className={"m-0 list-none p-0"}>
                                    {findings.map((f, i) => (
                                        <li key={f.id} id={f.id} className={"grid scroll-mt-[70px] grid-cols-[24px_1fr] gap-2.5 border-t border-border py-3 text-[17px] leading-[1.45] sm:grid-cols-[30px_1fr_auto]"}>
                                            <span aria-hidden className={"pt-0.5 font-mono text-[13px] font-semibold text-muted-foreground"}>{i + 1}</span>
                                            <span className={"font-read"}>{f.text.split(f.bold).map((part, j, all) => (
                                                <React.Fragment key={j}>{part}{j < all.length - 1 && <b className={"font-heading"}>{f.bold}</b>}</React.Fragment>
                                            ))}{f.href && <>{" "}<Link href={f.href} className={"text-primary underline-offset-4 hover:underline"}>Years of experience</Link></>}</span>
                                            <span className={"col-start-2 sm:col-start-3"}>
                                                <CopyFact fact={findingText(f)} page={info.name} path={path} hash={f.id} />
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        ) : (
                            <p className={"my-8 rounded-xl border border-dashed border-border p-5 font-read text-[17px] leading-relaxed"}>{thin(c)}</p>
                        )}
                        <ScanStatus skills={figureSkills} />
                        <StorySections c={c} />
                        <Faq items={faq} week={weekDate(c.page)} />
                        <MarketCvAsk lead />
                        <Method c={c} path={path} />
                        <PastWeeks info={info} weeks={weeks} showing={showing} />
                    </article>
                    <Rail c={c} others={others} past={Boolean(showing)} />
                </div>
            )}
        </div>
    );
    return ask ? <MarketAskProvider ask={ask} page={info.name}>{body}</MarketAskProvider> : body;
}
