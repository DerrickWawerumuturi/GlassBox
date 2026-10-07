import React from "react";
import Link from "next/link";

import BylineActions from "@/components/market-page/BylineActions";
import CopyFact from "@/components/market-page/CopyFact";
import LeadSquares from "@/components/market-page/LeadSquares";
import MarketCvAsk from "@/components/market-page/MarketCvAsk";
import {ScanStatus} from "@/components/market-page/SkillName";
import {Method, Rail} from "@/components/market-page/StoryEnd";
import StorySections, {P} from "@/components/market-page/StorySections";
import TitleBar from "@/components/market-page/TitleBar";
import {stamp} from "@/lib/market-page";
import {MarketBody, MarketInfo, MarketName, absoluteMarket, marketPath} from "@/lib/market-pages";
import {citeLine, Ctx, dek, findingText, framing, glance, has, question, skillName, thin, UNAVAILABLE} from "@/lib/market-story";
import {marketStructuredData} from "@/lib/seo";
import {SITE_URL} from "@/lib/site";

/*
 * One market page as an editorial data story, the same template for all five
 * (docs/decisions/market-pages.md): kicker, question, dek, byline, the lead
 * visual, a framing paragraph, three findings at a glance, the finding
 * sections the data supports, the CV ask, how we counted, and the rail.
 */

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

function Head({info, page, c}: {info: MarketInfo; page: MarketBody | null; c: Ctx | null}) {
    const q = question({info});
    return (
        <>
            <nav aria-label={"Breadcrumb"} className={"mb-3.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground"}>
                <Link href={"/market"} className={"no-underline hover:text-foreground"}>Market</Link> / <span aria-current={"page"}>{info.label}</span>
            </nav>
            <h1 className={"m-0 max-w-[920px] font-heading text-[36px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[56px]"}>{q}</h1>
            <p className={"mt-[26px] max-w-[800px] font-read text-[20px] leading-[1.45] sm:text-[23px]"}>{c ? dek(c) : UNAVAILABLE}</p>
            {page && c && (
                <div className={"mt-[34px] flex max-w-[920px] flex-wrap items-center justify-between gap-4 border-t border-border py-3.5"}>
                    <div className={"text-[14px]"}>
                        Counted by <b className={"font-heading"}>Glassbox</b>
                        <span className={"mt-0.5 block font-mono text-[12px] text-muted-foreground"}>
                            <time dateTime={page.taken_at}>Updated {stamp(page.taken_at)}</time> · counted again every day
                        </span>
                    </div>
                    <BylineActions url={absoluteMarket(info.name)} title={q} cite={citeLine(c, new URL(SITE_URL).host)} />
                </div>
            )}
        </>
    );
}

export default function MarketArticle({info, page, others}: {
    info: MarketInfo; page: MarketBody | null; others: Partial<Record<MarketName, MarketBody | null>>;
}) {
    const c: Ctx | null = page ? {info, page} : null;
    const findings = c ? glance(c) : [];
    // The skills the figures show, for the line a scan adds: "8 of the 19 skills in these charts are on your CV".
    const story = c?.page.story;
    const figureSkills = c && story ? [...new Set([
        ...(has(c, "languages") ? story.languages.bars : []), ...(has(c, "contrast") ? story.contrast : []),
        ...(has(c, "categories") ? story.categories.flatMap((g) => g.skills) : []),
    ])].map((k) => ({key: k, name: skillName(c, k)})) : [];
    return (
        <div className={"pb-24"}>
            {c && <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(marketStructuredData(info, c.page, dek(c)))}} />}
            {c && <TitleBar question={question({info})} page={info.name} />}
            <section className={`${WRAP} pt-11`}>
                <Head info={info} page={page} c={c} />
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
                                            ))}</span>
                                            <span className={"col-start-2 sm:col-start-3"}>
                                                <CopyFact fact={findingText(f)} page={info.name} path={marketPath(info.name)} hash={f.id} />
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
                        <MarketCvAsk page={info.name} thin={!findings.length} />
                        <Method c={c} />
                    </article>
                    <Rail c={c} others={others} />
                </div>
            )}
        </div>
    );
}
