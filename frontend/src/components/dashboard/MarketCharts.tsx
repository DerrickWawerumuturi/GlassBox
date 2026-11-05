'use client'

import React, {Suspense, useMemo} from 'react'
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {MarketAnalysis} from "@/types/jobradar";
import {useAnalysis} from "@/lib/analysis-store";
import {GAP_FREQUENCY_THRESHOLD, significantGaps, SkillMark, skillMarks, toPercent, toSkillKeys} from "@/lib/market";
import {EmptyScan, PageBar} from "@/components/dashboard/bits";
import {ChartPanel, StatTiles} from "@/components/dashboard/MarketParts";
import DemandBars from "@/components/dashboard/DemandBars";
import GapTally from "@/components/dashboard/GapTally";
import ViewDial, {bottomRoom, useDialMode} from "@/components/Market/ViewDial";
import {MARKET_VIEWS as VIEWS, MarketViewId as ViewId, viewFrom} from "@/lib/market-views";
import {useViewOpened} from "@/components/AnalyticsProvider";

interface Views {
    market: MarketAnalysis;
    jobs: number;
    /** The market's top skills, in demand order, each marked yours or not. */
    top: SkillMark[];
    /** The CV's skills that these jobs ask for. */
    mine: SkillMark[];
    /** Skills the CV lacks that a fifth or more of jobs ask for. */
    gaps: SkillMark[];
    show: (view: ViewId) => void;
}

/**
 * The scan's market, one question per view instead of one long scroll. A
 * needle dial on the left picks the view (a half circle at the bottom on a
 * small tablet, a tab bar on a phone; decisions/market-navigation.md), and
 * the view lives in the URL (?view=gaps) so a refresh or a shared link lands on the same chart. Each
 * chart is an object on the desk (docs/decisions/design-system.md).
 */
function MarketCharts() {
    const {analysis, hydrated, fileName} = useAnalysis();
    const router = useRouter();
    const pathname = usePathname();
    const view = viewFrom(useSearchParams().get("view"));
    useViewOpened("market", view);
    const mode = useDialMode();

    const market = analysis?.market;
    const views = useMemo<Omit<Views, "show"> | null>(() => {
        if (!market) return null;
        const have = toSkillKeys(market.user_skill_presence ?? []);
        return {
            market,
            jobs: market.jobs_analyzed,
            top: skillMarks(market.top_skills ?? [], have),
            mine: skillMarks(market.user_skill_presence ?? [], have),
            gaps: skillMarks(significantGaps(market.skill_gaps ?? []), have),
        };
    }, [market]);

    if (!hydrated || mode === null) return null;

    const show = (id: ViewId) => router.replace(id === "overview" ? pathname : `${pathname}?view=${id}`, {scroll: false});

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Market charts"}
                meta={market ? `${market.jobs_analyzed.toLocaleString()} jobs analyzed${fileName ? ` · ${fileName}` : ""}` : undefined}
            />

            {!views ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet. Every chart here is counted from real jobs."} />
                </div>
            ) : (
                <div className={"flex min-w-0 flex-1"}>
                    {mode === "column" && (
                        <ViewDial items={[...VIEWS]} index={VIEWS.findIndex((v) => v.id === view)} mode={mode}
                                  onSelect={(i) => show(VIEWS[i].id)} controls={"market-view"} />
                    )}
                    {/* The desk: panels sit on the plain ground with room around them. */}
                    <div id={"market-view"} role={"tabpanel"} aria-labelledby={`tab-${view}`}
                         className={"mx-auto flex w-full max-w-[1000px] min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 sm:py-8"}
                         style={{paddingBottom: bottomRoom(mode)}}>
                        {view === "overview" && <Overview {...views} show={show} />}
                        {view === "demand" && <Demand {...views} show={show} />}
                        {view === "yours" && <Yours {...views} show={show} />}
                        {view === "gaps" && <Gaps {...views} show={show} />}
                    </div>
                    {mode !== "column" && (
                        <ViewDial items={[...VIEWS]} index={VIEWS.findIndex((v) => v.id === view)} mode={mode}
                                  onSelect={(i) => show(VIEWS[i].id)} controls={"market-view"} />
                    )}
                </div>
            )}
        </div>
    )
}

function ViewLink({onClick, children}: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button type={"button"} onClick={onClick}
                className={"shrink-0 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"}>
            {children} →
        </button>
    )
}

function Quiet({children}: { children: React.ReactNode }) {
    return <p className={"py-4 text-center text-[14px] text-muted-foreground"}>{children}</p>;
}

const yoursOf = (marks: SkillMark[]) => marks.filter((m) => m.have).length;

/** The numbers first, then every chart in brief, each a step from its full view. */
function Overview({market, jobs, top, mine, gaps, show}: Views) {
    return (
        <>
            <StatTiles market={market} marks={top} />
            <details className={"rounded-lg border border-border px-4 py-3 text-[14px] leading-relaxed"}>
                <summary className={"w-fit cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"}>How to read your scan</summary>
                <div className={"mt-3 grid gap-3 text-muted-foreground sm:grid-cols-3"}>
                    <p><span aria-hidden className={"font-hand text-[22px]"}>↘ </span><b className={"text-foreground"}>Demand</b> shows how often a skill appears. A longer bar means more of these {jobs.toLocaleString()} jobs mention it, whether required, preferred or elsewhere in the ad.</p>
                    <p><b className={"text-foreground"}>Your skills</b> are green. Hatching marks a skill absent from your CV. These are skill matches, not an assessment of every requirement for a job.</p>
                    <p><b className={"text-foreground"}>Gaps</b> focuses on skills named by at least 1 in 5 jobs. Each small square in that chart represents one job. Less common gaps can still exist.</p>
                </div>
            </details>
            <div className={"grid gap-4 lg:grid-cols-2 sm:gap-6"}>
                <ChartPanel title={"What companies ask for"} lead={`${yoursOf(top.slice(0, 6))} of the top ${Math.min(6, top.length)} skills are on your CV`} jobs={jobs}
                            legend={[["have", "On your CV"], ["hatch", "Not listed"]]}
                            preview={<ViewLink onClick={() => show("demand")}>Demand</ViewLink>}>
                    <DemandBars marks={top} jobs={jobs} limit={6} />
                </ChartPanel>
                <ChartPanel title={"Your skills in demand"} lead={`${mine.length} CV skills that jobs ask for`} jobs={jobs}
                            preview={<ViewLink onClick={() => show("yours")}>Your skills</ViewLink>}>
                    {mine.length ? <DemandBars marks={mine} jobs={jobs} limit={6} />
                        : <Quiet>None of your CV&apos;s skills appear in these jobs.</Quiet>}
                </ChartPanel>
                <ChartPanel title={"Not on your CV yet"} lead={`${gaps.length} high-frequency gaps · each named by at least 20% of jobs. One mark per job.`} jobs={jobs} className={"lg:col-span-2"}
                            preview={<ViewLink onClick={() => show("gaps")}>Gaps</ViewLink>}>
                    {gaps.length ? <GapTally marks={gaps} jobs={jobs} limit={4} />
                        : <Quiet>No gaps at the 1-in-5 threshold. Less commonly requested skills may still be absent from your CV.</Quiet>}
                </ChartPanel>
            </div>
        </>
    )
}

function Demand({jobs, top, mine}: Views) {
    const shown = Math.min(12, top.length);
    return (
        <ChartPanel title={"What companies ask for"} lead={`${yoursOf(top.slice(0, shown))} of the top ${shown} skills are yours`} jobs={jobs}
                    legend={[["have", "Yours"], ["hatch", "Not yet"]]}
                    notes={["Green is on your CV. Hatching means it wasn’t listed; it doesn’t prove you lack it.", `Bars use a 0–100% scale. Each count is out of the ${jobs.toLocaleString()} jobs in this scan, not the whole market.`]}
                    table={{marks: top}}>
            <DemandBars marks={top} jobs={jobs} />
        </ChartPanel>
    )
}

function Yours({jobs, mine}: Views) {
    return (
        <ChartPanel title={"Your skills in demand"} lead={`${mine.length} CV skills that jobs ask for, top first`} jobs={jobs}
                    legend={[["have", "Yours"]]}
                    notes={["Every skill here is on your CV.", `The 0–100% scale shows how often each skill appears in these ${jobs.toLocaleString()} jobs.`]}
                    table={{marks: mine}}>
            {mine.length === 0
                ? <Quiet>None of the skills on your CV appear in these jobs. The search probably reached a different corner of the market.</Quiet>
                : <DemandBars marks={mine} jobs={jobs} />}
        </ChartPanel>
    )
}

function Gaps({jobs, gaps}: Views) {
    const floor = toPercent(GAP_FREQUENCY_THRESHOLD);
    return (
        <ChartPanel title={"Not on your CV yet"} lead={`${gaps.length} high-frequency gaps. One mark per job.`} jobs={jobs}
                    legend={[["solid", "Asks for it"], ["faint", "Doesn't"]]}
                    notes={["Each mark is one job. Solid marks are jobs that ask for the skill.", `Grouped in fives. Only skills that ${floor}% of jobs or more ask for.`]}
                    table={{marks: gaps}}>
            {gaps.length === 0
                ? <Quiet>No gaps at the {floor}% threshold. Less commonly requested skills may still be absent from your CV; this isn’t a complete assessment of every job requirement.</Quiet>
                : <GapTally marks={gaps} jobs={jobs} />}
        </ChartPanel>
    )
}

/** The Market charts, on /dashboard/market and, for a scan without an account, /analysis. */
export default function MarketChartsView() {
    return (
        <Suspense fallback={null}>
            <MarketCharts />
        </Suspense>
    )
}
