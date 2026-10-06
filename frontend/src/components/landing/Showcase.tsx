'use client'

import React, {useMemo, useState} from "react";
import Link from "next/link";
import {ArrowRightIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Bridges from "@/components/dashboard/Bridges";
import DemandBars from "@/components/dashboard/DemandBars";
import NeedleDial from "@/components/Market/NeedleDial";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import {SkillTag, StatusChip} from "@/components/dashboard/bits";
import {useWidth} from "@/components/dashboard/MarketParts";
import {PIPELINE, STATUS_LABEL} from "@/lib/applications-store";
import {Look} from "@/lib/landing/look";
import {exampleHave, marketMarks, sampleApplications, sampleJobs, sampleSkillData, showcaseFamily} from "@/lib/landing/showcase";
import {MARKET_VIEWS} from "@/lib/market-views";
import {COPY, FAMILY_LABEL} from "./copy";
import {useStepper} from "./useStepper";

const I = COPY.inside;
const TABS = ["market", "skills", "jobs", "applications"] as const;

/** The Market page's dial and bars, from today's jobs and the example CV. */
function MarketPane({look, family, have}: {look: Look; family: string; have: Set<string>}) {
    const [host, w] = useWidth<HTMLDivElement>();
    const [view, setView] = useState(1);
    const phone = w > 0 && w < 560;
    const data = look.families[family];
    return (
        <div ref={host} className={"flex flex-col gap-4 md:flex-row md:items-center"}>
            {w > 0 && (
                <div className={"shrink-0"} style={{width: phone ? w : 250}}>
                    <NeedleDial items={[...MARKET_VIEWS]} phone={phone} index={view} onSelect={setView}
                                w={phone ? w : 250} h={phone ? 150 : 260} radius={110} />
                </div>
            )}
            <div className={"min-w-0 flex-1"}>
                <DemandBars marks={marketMarks(look, family, have)} jobs={data.readable} limit={8} />
            </div>
        </div>
    );
}

function JobsPane({look, family, have}: {look: Look; family: string; have: Set<string>}) {
    return (
        <ul className={"grid gap-3 md:grid-cols-3"}>
            {sampleJobs(look, family, have).map(({ad, asks, haveReq}) => (
                <li key={ad.url} className={"flex flex-col gap-3 rounded-lg border border-border bg-card p-4"}>
                    <div className={"flex items-start gap-2.5"}>
                        <CompanyLogo company={ad.company} url={ad.url} />
                        <div className={"min-w-0"}>
                            <p className={"line-clamp-2 text-[14px] font-medium leading-snug"}>{ad.title}</p>
                            <p className={"truncate font-mono text-[11px] text-muted-foreground"}>{[ad.company, ad.location].filter(Boolean).join(" · ")}</p>
                        </div>
                    </div>
                    <p className={"text-[13px]"}>{I.jobHave(haveReq, ad.req.length)}</p>
                    <div className={"flex flex-wrap gap-1.5"}>
                        {asks.slice(0, 6).map((a) => (
                            <SkillTag key={a.key} skill={a.name} tone={a.have ? "have" : a.required ? "missing" : "gap"} />
                        ))}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ApplicationsPane({look, family}: {look: Look; family: string}) {
    const apps = sampleApplications(look, family);
    return (
        <div className={"flex flex-col gap-4"}>
            <div className={"grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-border bg-border/60 sm:grid-cols-5"}>
                {PIPELINE.map((status, i) => (
                    <div key={status} className={`bg-card px-3 py-3 text-center sm:col-span-1 ${i < 3 ? "col-span-2" : "col-span-3"}`}>
                        <p className={"font-mono text-lg font-bold tabular-nums"}>{apps.filter((a) => a.status === status).length}</p>
                        <p className={"mt-0.5 flex justify-center"}><StatusChip status={status} className={"px-0 py-0 !bg-transparent"} /></p>
                    </div>
                ))}
            </div>
            <ul className={"flex flex-col divide-y divide-border rounded-lg border border-border bg-card"}>
                {apps.map((a) => (
                    <li key={a.company} className={"flex items-center gap-3 px-4 py-2.5"}>
                        <CompanyLogo company={a.company} />
                        <div className={"min-w-0 flex-1"}>
                            <p className={"truncate text-[13.5px] font-medium"}>{a.title}</p>
                            <p className={"truncate font-mono text-[11px] text-muted-foreground"}>{a.company}</p>
                        </div>
                        <StatusChip status={a.status} />
                    </li>
                ))}
            </ul>
            <span className={"sr-only"}>{PIPELINE.map((s) => STATUS_LABEL[s]).join(", ")}</span>
        </div>
    );
}

/**
 * "Inside Glassbox": the four dashboard pages, drawn with the product's own
 * components from today's jobs and one example CV. The tabs step on the
 * page's 4.6s timer, pause on hover or focus, and stay put with reduced motion.
 */
export default function Showcase({look, reduce, onCv}: {look: Look; reduce: boolean; onCv: () => void}) {
    const [hover, setHover] = useState(false);
    const stepper = useStepper({steps: TABS.length, held: hover, reduce});
    const family = useMemo(() => showcaseFamily(look), [look]);
    const have = useMemo(() => exampleHave(look), [look]);
    const skills = useMemo(() => sampleSkillData(look, family, have), [look, family, have]);
    const label = FAMILY_LABEL[family] ?? family;
    const leads = [I.market(look.families[family].readable.toLocaleString("en"), label), I.skills, I.jobs, I.applications];

    return (
        <section className={"blk inside"} id={"inside"} aria-labelledby={"inside-h"}
                 onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
                 onFocus={() => setHover(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}>
            <div className={"sec-hd inside-hd"}>
                <div>
                    <div className={"chapter on"}><span className={"n"}>03</span><h2 id={"inside-h"}>{I.chapter}</h2></div>
                    <p className={"sec-line"}>{I.line}</p>
                </div>
                <div className={"inside-ask"}>
                    <div className={"acts"}>
                        <Button className={"btn"} onClick={onCv}>{I.cta} <ArrowRightIcon className={"size-3.5"} /></Button>
                        <Button variant={"link"} className={"textlink"} nativeButton={false} render={<Link href={"/sign-in"} />}>{I.signUp}</Button>
                    </div>
                    <p className={"lead"}>{I.lead}</p>
                </div>
            </div>
            <Tabs className={"app-tokens"} value={TABS[stepper.step]} onValueChange={(v) => stepper.jump(TABS.indexOf(v as typeof TABS[number]))}>
                <TabsList className={"inside-tabs"}>
                    {TABS.map((t, i) => <TabsTrigger key={t} value={t}>{I.tabs[i]}</TabsTrigger>)}
                </TabsList>
                <div className={"inside-window spotlight"}>
                    <div className={"inside-bar"}><i /><i /><i /><span>{leads[stepper.step]}</span><em>{I.example}</em></div>
                    <div className={"inside-body"}>
                        <TabsContent value={"market"}><MarketPane look={look} family={family} have={have} /></TabsContent>
                        <TabsContent value={"skills"}><Bridges data={skills} /></TabsContent>
                        <TabsContent value={"jobs"}><JobsPane look={look} family={family} have={have} /></TabsContent>
                        <TabsContent value={"applications"}><ApplicationsPane look={look} family={family} /></TabsContent>
                    </div>
                </div>
            </Tabs>
        </section>
    );
}
