import React from "react";
import Link from "next/link";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import ProductShot, {ShotName} from "@/components/site/ProductShot";
import {Look} from "@/lib/landing/look";
import {showcaseFamily} from "@/lib/landing/showcase";
import {FEATURES} from "@/lib/site-copy";
import {COPY, FAMILY_LABEL} from "./copy";

const L = COPY.lower;
const H = L.how;

/** Step 1: a few of today's real job titles, the shortest ones, so they read whole. */
function ReadVisual({look, family}: {look: Look | null; family: string}) {
    const titles = look ? [...(look.families[family]?.titles ?? [])].sort((a, b) => a[0].length - b[0].length).slice(0, 3) : [];
    return (
        <div className={"bv-stack"}>
            {(titles.length ? titles : [["", "", "junior"], ["", "", "mid"], ["", "", "senior"]]).map(([title, company], i) => (
                <div key={i} className={"bv-row wrap"} style={{"--i": i} as React.CSSProperties}>
                    <span className={"t"}>{title || "\u00a0"}</span><span className={"c"}>{company}</span>
                </div>
            ))}
        </div>
    );
}

/** Step 2: one job on two boards (a real pair from the pool), merged into one, counted once. */
function DedupeVisual() {
    const {title, company, boards, note} = H.pair;
    const card = (board: string) => (
        <div className={"bv-job"}><span className={"board"}>{board}</span><span className={"t"}>{title}</span><span className={"c"}>{company}</span></div>
    );
    return (
        <div className={"bv-merge"}>
            <div className={"two"}>{card(boards[0])}{card(boards[1])}</div>
            <svg aria-hidden viewBox={"0 0 100 18"} preserveAspectRatio={"none"} className={"lines"}>
                <path d={"M25 0 C 25 10, 50 8, 50 18 M75 0 C 75 10, 50 8, 50 18"} />
            </svg>
            <div className={"one"}>
                <div className={"bv-job"}><span className={"t"}>{title}</span><span className={"c"}>{company}</span></div>
                <span className={"stamp"}>{H.once}</span>
            </div>
            <span className={"note"}>{note}</span>
        </div>
    );
}

/** Step 3: a phrase struck out, a real skill name kept. */
function MatchVisual({look, family}: {look: Look | null; family: string}) {
    const top = look ? Object.entries(look.families[family]?.skills ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
    return (
        <div className={"bv-match"}>
            <span className={"struck"}>{H.phrase}</span>
            <span className={"skill"}>{top ? look!.skills[top] ?? top : " "}</span>
        </div>
    );
}

/** Step 4: today's count for one job type, with its date. */
function CountVisual({look, family}: {look: Look | null; family: string}) {
    const data = look?.families[family];
    const date = look ? new Date(look.taken_at).toLocaleDateString("en-GB", {weekday: "short", day: "numeric", month: "short", timeZone: "UTC"}).replace(",", "") : "";
    return (
        <div className={"bv-count"}>
            <b>{data ? data.jobs.toLocaleString("en") : " "}</b>
            <span>{data ? H.asOf(FAMILY_LABEL[family] ?? family, date) : " "}</span>
            <div className={"sqs"}>{Array.from({length: 24}, (_, i) => <i key={i} />)}</div>
        </div>
    );
}

const VISUALS: Array<React.ComponentType<{look: Look | null; family: string}>> = [ReadVisual, DedupeVisual, MatchVisual, CountVisual];
/** The screenshot for each of What you get's pages, in FEATURES order. */
const SHOTS: ShotName[] = ["market-demand", "skills", "opportunities", "applications"];

/**
 * Below the closing CV section: how it works (the old JobRadar postcards: four
 * steps of the count, picturing today's jobs, then "With your CV" leading into
 * real screenshots, example CV), and the FAQ. No chapter numbers here: those
 * belong to the story above.
 */
export default function LowerSections({look}: {look: Look | null}) {
    const family = look ? showcaseFamily(look) : "backend";
    return (
        <div className={"lower"}>
            <section className={"low"} id={"how-we-count"} aria-labelledby={"low-how"}>
                <span id={"how-it-works"} aria-hidden />
                <div className={"low-hd"}><h2 id={"low-how"}>{H.chapter}</h2><p>{H.lead}</p></div>
                {/* The old JobRadar "how it works": postcards pinned along a dashed trail. Four
                    steps of the count, then a fifth, "With your CV", that leads into the pages. */}
                <ol className={"postcards"}>
                    <svg aria-hidden viewBox={"0 0 1000 120"} preserveAspectRatio={"none"} className={"trail"}>
                        <path d={"M-10 40 C 120 20, 200 90, 340 70 S 560 20, 700 60 S 900 110, 1010 80"} />
                    </svg>
                    {H.steps.map((step, i) => {
                        const Visual = VISUALS[i];
                        return (
                            <li key={step.title} className={`postcard spotlight t${i}`}>
                                <span className={"tape"} aria-hidden />
                                <div className={"frame"}><Visual look={look} family={family} /></div>
                                <div className={"cap"}><span className={"k"}>{String(i + 1).padStart(2, "0")}</span><b>{step.title}</b></div>
                                <p>{step.body}</p>
                            </li>
                        );
                    })}
                </ol>
                <div className={"payoff"}>
                    <svg aria-hidden viewBox={"0 0 100 100"} preserveAspectRatio={"none"} className={"trail-down"}>
                        <path d={"M92 0 C 92 40, 20 30, 12 100"} />
                    </svg>
                    <div className={"postcard spotlight t4 stage"}>
                        <span className={"tape"} aria-hidden />
                        <div className={"cap"}><span className={"k"}>05</span><b>{H.withCv.title}</b></div>
                        <p>{H.withCv.body}</p>
                    </div>
                    <div className={"gets"}>
                        {L.get.points.map((p, i) => (
                            <Link key={p.title} href={`/product#${FEATURES[i].id}`} className={"get-card spotlight"}>
                                <ProductShot name={SHOTS[i]} alt={`${p.title}, with the example CV`} sizes={"(max-width: 560px) 100vw, (max-width: 1023px) 50vw, 260px"} className={"shot"} />
                                <b>{p.title}</b>
                                <span>{p.body}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
            <section className={"low"} id={"faq"} aria-labelledby={"low-faq"}>
                <div className={"low-hd"}><h2 id={"low-faq"}>{L.faq.chapter}</h2></div>
                <Accordion className={"faq"}>
                    {L.faq.items.map((item) => (
                        <AccordionItem key={item.q} value={item.q} className={"faq-item"}>
                            <AccordionTrigger className={"faq-q"}>{item.q}</AccordionTrigger>
                            <AccordionContent className={"faq-a"}>
                                {item.a}
                                {"link" in item && item.link && <> <Link href={item.link.href}>{item.link.label}</Link>.</>}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>
        </div>
    );
}
