'use client'

import React, {Suspense, useEffect, useMemo, useRef} from 'react'
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {HashIcon, SignalIcon, TrendingUpIcon, TypeIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {MarketAnalysis, SkillStat} from "@/types/jobradar";
import {useAnalysis} from "@/lib/analysis-store";
import {
    GAP_FREQUENCY_THRESHOLD, GAP_HIGH_PRIORITY_THRESHOLD, gapPriority, mostDemanded,
    significantGaps, skillLabel, toPercent, toSkillKeys
} from "@/lib/market";
import {EmptyScan, GRID_TD, GridTh, PageBar, TagChip, Toolbar, ViewChip} from "@/components/dashboard/bits";
import {ChartLegend, ChartNotes, MarketSection, SkillBars, StatStrip} from "@/components/dashboard/MarketParts";
import SkillStrip from "@/components/dashboard/SkillStrip";

const VIEWS = [
    {id: "overview", label: "Overview"},
    {id: "demand", label: "Demand"},
    {id: "yours", label: "Your skills"},
    {id: "gaps", label: "Gaps"},
    {id: "landscape", label: "Landscape"},
] as const;
type ViewId = typeof VIEWS[number]["id"];

interface Views {
    market: MarketAnalysis;
    mine: SkillStat[];
    gaps: SkillStat[];
    /** skillKey()s on the CV. */
    have: Set<string>;
    show: (view: ViewId) => void;
}

/**
 * The scan's market, one question per view instead of one long scroll. The
 * chips work like Applications' filters, and the view lives in the URL
 * (?view=gaps) so a refresh or a shared link lands on the same chart.
 */
function MarketCharts() {
    const {analysis, hydrated, fileName} = useAnalysis();
    const router = useRouter();
    const pathname = usePathname();
    const requested = useSearchParams().get("view");
    const view = (VIEWS.find((v) => v.id === requested)?.id ?? "overview") as ViewId;

    // On a phone the chip row scrolls; keep the chosen view's chip in sight, from the first paint too.
    const tabs = useRef<HTMLDivElement>(null);
    useEffect(() => {
        tabs.current?.querySelector("[aria-selected=true]")?.scrollIntoView({inline: "center", block: "nearest"});
    }, [view, hydrated]);

    const market = analysis?.market;
    const views = useMemo<Omit<Views, "show"> | null>(() => {
        if (!market) return null;
        const mine = market.user_skill_presence ?? [];
        return {market, mine, gaps: significantGaps(market.skill_gaps ?? []), have: toSkillKeys(mine)};
    }, [market]);

    if (!hydrated) return null;

    const show = (id: ViewId) => router.replace(id === "overview" ? pathname : `${pathname}?view=${id}`, {scroll: false});
    const counts: Partial<Record<ViewId, number>> = views
        ? {demand: (views.market.top_skills ?? []).length, yours: views.mine.length, gaps: views.gaps.length}
        : {};

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Market charts"}
                meta={market ? `${market.jobs_analyzed.toLocaleString()} jobs analysed${fileName ? ` · ${fileName}` : ""}` : undefined}
            />

            {!views ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet. The charts draw themselves from real postings."} />
                </div>
            ) : (
                <>
                    <Toolbar>
                        {/* One row that scrolls sideways on a phone, edge to edge, rather than wrapping; the fade says there's more. */}
                        <div className={"-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&>*]:shrink-0 max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)]"}
                             ref={tabs} role={"tablist"} aria-label={"Market views"}>
                            {VIEWS.map((v) => (
                                <ViewChip key={v.id} active={view === v.id} onClick={() => show(v.id)} count={counts[v.id]}>
                                    {v.label}
                                </ViewChip>
                            ))}
                        </div>
                    </Toolbar>
                    {view === "overview" && <Overview {...views} show={show} />}
                    {view === "demand" && <Demand {...views} show={show} />}
                    {view === "yours" && <Yours {...views} show={show} />}
                    {view === "gaps" && <Gaps {...views} show={show} />}
                    {view === "landscape" && <Landscape {...views} show={show} />}
                </>
            )}
        </div>
    )
}

function ViewLink({onClick, children}: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button type={"button"} onClick={onClick}
                className={"shrink-0 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"}>
            {children} →
        </button>
    )
}

/** The same whole-number share the bars show. */
const share = (stat: SkillStat) => `${Math.round(toPercent(stat.frequency))}%`;

function Quiet({children}: { children: React.ReactNode }) {
    return <p className={"text-[13px] text-muted-foreground"}>{children}</p>;
}

/** Every other view in brief: the numbers, then the top of each list. */
function Overview({market, mine, gaps, have, show}: Views) {
    const leader = mostDemanded(market.top_skills ?? []);
    return (
        <>
            <StatStrip market={market} />
            <div className={"grid lg:grid-cols-2 lg:[&>section:first-child]:border-r"}>
                <MarketSection title={"Learn next"} meta={"asked for, not on your CV"}
                               action={<ViewLink onClick={() => show("gaps")}>All gaps</ViewLink>}>
                    {gaps.length ? <SkillBars skills={gaps} have={have} limit={3} />
                        : <Quiet>Nothing these postings often ask for is missing from your CV.</Quiet>}
                </MarketSection>
                <MarketSection title={"Your strongest"} meta={"your skills, by demand"}
                               action={<ViewLink onClick={() => show("yours")}>Your skills</ViewLink>}>
                    {mine.length ? <SkillBars skills={mine} have={have} limit={3} />
                        : <Quiet>None of your CV&apos;s skills appear in these postings.</Quiet>}
                </MarketSection>
                <MarketSection title={"Most asked for"} meta={leader ? `led by ${skillLabel(leader.skill)}` : undefined}
                               action={<ViewLink onClick={() => show("demand")}>Demand</ViewLink>} className={"lg:col-span-2"}>
                    <ChartLegend />
                    <SkillBars skills={market.top_skills ?? []} have={have} limit={5} />
                </MarketSection>
            </div>
        </>
    )
}

function Demand({market, have}: Views) {
    const skills = market.top_skills ?? [];
    return (
        <MarketSection title={"What the market asks for"} meta={`top ${skills.length} skills`}>
            <ChartLegend />
            <SkillBars skills={skills} have={have} />
            <ChartNotes points={[
                "Bar length is the share of these postings that ask for the skill.",
                "Green is on your CV. Orange isn't, so orange near the top is worth learning first.",
            ]} />
        </MarketSection>
    )
}

function Yours({market, mine, have}: Views) {
    const best = mostDemanded(mine);
    const top = mostDemanded(market.top_skills ?? []);
    return (
        <MarketSection title={"Your skills in this market"} meta={`${mine.length} from your CV`}>
            {mine.length === 0 ? (
                <Quiet>None of the skills on your CV appear in these postings. The search probably reached a different
                    corner of the market.</Quiet>
            ) : (
                <>
                    <SkillBars skills={mine} have={have} />
                    {best && top && (best.skill === top.skill ? (
                        <Quiet>
                            Your top skill is also the market&apos;s: <b className={"font-medium text-foreground"}>{skillLabel(best.skill)}</b>,
                            in {share(best)} of postings.
                        </Quiet>
                    ) : (
                        <Quiet>
                            Your most asked-for skill is <b className={"font-medium text-foreground"}>{skillLabel(best.skill)}</b>,
                            in {share(best)} of postings. The market&apos;s top skill is{" "}
                            <b className={"font-medium text-foreground"}>{skillLabel(top.skill)}</b>, at {share(top)}.
                        </Quiet>
                    ))}
                    <ChartNotes points={[
                        "Every skill here is on your CV.",
                        "A long bar is one of your strongest cards in this market.",
                    ]} />
                </>
            )}
        </MarketSection>
    )
}

/** A table, like the rest of the dashboard: each gap carries a share, a count and a priority. */
function Gaps({market, gaps}: Views) {
    if (gaps.length === 0) {
        return (
            <MarketSection title={"Gaps"}>
                <Quiet>Nothing that {toPercent(GAP_FREQUENCY_THRESHOLD)}% or more of these postings ask for is missing from your CV.</Quiet>
            </MarketSection>
        )
    }
    const top = toPercent(gaps[0].frequency);
    // A column that would say "Medium" on every row says nothing: it shows only when some gap is high.
    const anyHigh = gaps.some((gap) => gapPriority(gap) === "high");
    return (
        <>
            <table className={"w-full border-collapse max-sm:table-fixed"}>
                <thead>
                    <tr>
                        <GridTh className={"w-10 pl-4 text-right sm:w-12 sm:pl-5"}>#</GridTh>
                        <GridTh icon={TypeIcon}>Skill</GridTh>
                        <GridTh icon={TrendingUpIcon} className={"w-[34%] max-sm:hidden"}>Demand</GridTh>
                        <GridTh icon={HashIcon} className={"w-24 sm:w-36"}>Share</GridTh>
                        {anyHigh && <GridTh icon={SignalIcon} className={"w-28 max-sm:hidden"}>Priority</GridTh>}
                    </tr>
                </thead>
                <tbody>
                    {gaps.map((gap, index) => {
                        const percent = Math.round(toPercent(gap.frequency));
                        const high = gapPriority(gap) === "high";
                        return (
                            <tr key={gap.skill} className={"transition-colors hover:bg-foreground/3"}>
                                <td className={cn(GRID_TD, "pl-4 text-right font-mono text-[10.5px] text-muted-foreground/60 sm:pl-5")}>{index + 1}</td>
                                <td className={GRID_TD}>
                                    <span className={"block truncate font-medium"} title={gap.skill}>{skillLabel(gap.skill)}</span>
                                    {/* The demand column is hidden on a phone, so its bar rides under the name. */}
                                    <span className={"mt-1.5 block h-1.5 rounded-r-[4px] bg-chart-gap sm:hidden"}
                                          style={{width: `${Math.max(2, (percent / top) * 100)}%`}} />
                                    {high && <span className={"mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:hidden"}>High priority</span>}
                                </td>
                                <td className={cn(GRID_TD, "max-sm:hidden")}>
                                    <span className={"block h-2.5 rounded-r-[4px] bg-chart-gap"}
                                          style={{width: `${Math.max(2, (percent / top) * 100)}%`}} />
                                </td>
                                <td className={cn(GRID_TD, "whitespace-nowrap font-mono text-[11px] tabular-nums")}>
                                    {percent}%<span className={"text-muted-foreground max-sm:block"}><span className={"max-sm:hidden"}> · </span>{gap.job_count} of {market.jobs_analyzed}</span>
                                </td>
                                {anyHigh && (
                                    <td className={cn(GRID_TD, "max-sm:hidden")}>{high && <TagChip tone={"gap"}>High</TagChip>}</td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className={"px-4 py-4 sm:px-5"}>
                <ChartNotes points={[
                    `Skills at least ${toPercent(GAP_FREQUENCY_THRESHOLD)}% of these postings ask for, missing from your CV.`,
                    anyHigh
                        ? `High priority means ${toPercent(GAP_HIGH_PRIORITY_THRESHOLD)}% or more ask for it. Start at the top.`
                        : "The top row is usually the best one to learn next.",
                ]} />
            </div>
        </>
    )
}

function Landscape({mine, gaps}: Views) {
    return (
        <MarketSection title={"Where your skills sit"} meta={"by share of postings"}>
            <ChartLegend />
            <SkillStrip mine={mine} missing={gaps} />
            <ChartNotes points={[
                "Each dot is a skill. The further right, the more postings ask for it.",
                "Top lane is on your CV, bottom lane is missing. Missing dots far right are the ones to learn.",
            ]} />
        </MarketSection>
    )
}

export default function MarketChartsPage() {
    return (
        <Suspense fallback={null}>
            <MarketCharts />
        </Suspense>
    )
}
