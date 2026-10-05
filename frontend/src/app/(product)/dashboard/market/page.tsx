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
import SkillStrip from "@/components/dashboard/SkillStrip";
import ViewDial, {PHONE_BAND, usePhone} from "@/components/Market/ViewDial";

const VIEWS = [
    {id: "overview", name: "Overview"},
    {id: "demand", name: "Demand"},
    {id: "yours", name: "Your skills"},
    {id: "gaps", name: "Gaps"},
    {id: "landscape", name: "Landscape"},
] as const;
type ViewId = typeof VIEWS[number]["id"];

interface Views {
    market: MarketAnalysis;
    jobs: number;
    /** The market's top skills, in demand order, each marked yours or not. */
    top: SkillMark[];
    /** The CV's skills that these postings ask for. */
    mine: SkillMark[];
    /** Skills the CV lacks that a fifth or more of postings ask for. */
    gaps: SkillMark[];
    show: (view: ViewId) => void;
}

/**
 * The scan's market, one question per view instead of one long scroll. A
 * needle dial on the left picks the view (a half circle at the bottom on a
 * phone; decisions/market-navigation.md), and the view lives in the URL
 * (?view=gaps) so a refresh or a shared link lands on the same chart. Each
 * chart is an object on the desk (docs/brand/charts.html).
 */
function MarketCharts() {
    const {analysis, hydrated, fileName} = useAnalysis();
    const router = useRouter();
    const pathname = usePathname();
    const requested = useSearchParams().get("view");
    const view = (VIEWS.find((v) => v.id === requested)?.id ?? "overview") as ViewId;
    const phone = usePhone();

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

    if (!hydrated || phone === null) return null;

    const show = (id: ViewId) => router.replace(id === "overview" ? pathname : `${pathname}?view=${id}`, {scroll: false});

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
                <div className={"flex min-w-0 flex-1"}>
                    {!phone && (
                        <ViewDial items={[...VIEWS]} index={VIEWS.findIndex((v) => v.id === view)} phone={false}
                                  onSelect={(i) => show(VIEWS[i].id)} controls={"market-view"} />
                    )}
                    {/* The desk: panels sit on the plain ground with room around them. */}
                    <div id={"market-view"} role={"tabpanel"} aria-labelledby={`tab-${view}`}
                         className={"mx-auto flex w-full max-w-[1000px] min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 sm:py-8"}
                         style={phone ? {paddingBottom: PHONE_BAND + 24} : undefined}>
                        {view === "overview" && <Overview {...views} show={show} />}
                        {view === "demand" && <Demand {...views} show={show} />}
                        {view === "yours" && <Yours {...views} show={show} />}
                        {view === "gaps" && <Gaps {...views} show={show} />}
                        {view === "landscape" && <Landscape {...views} show={show} />}
                    </div>
                    {phone && (
                        <ViewDial items={[...VIEWS]} index={VIEWS.findIndex((v) => v.id === view)} phone
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
    const best = mine[0];
    return (
        <>
            <StatTiles market={market} marks={top} />
            <div className={"grid gap-4 lg:grid-cols-2 sm:gap-6"}>
                <ChartPanel title={"What companies ask for"} lead={`${yoursOf(top.slice(0, 6))} of top 6 are yours`} jobs={jobs}
                            preview={<ViewLink onClick={() => show("demand")}>Demand</ViewLink>}>
                    <DemandBars marks={top} jobs={jobs} limit={6} badge={best?.skill} />
                </ChartPanel>
                <ChartPanel title={"Your skills in demand"} lead={`${mine.length} from your CV`} jobs={jobs}
                            preview={<ViewLink onClick={() => show("yours")}>Your skills</ViewLink>}>
                    {mine.length ? <DemandBars marks={mine} jobs={jobs} limit={6} />
                        : <Quiet>None of your CV&apos;s skills appear in these postings.</Quiet>}
                </ChartPanel>
                <ChartPanel title={"Not on your CV yet"} lead={`${gaps.length} skills, one mark per posting`} jobs={jobs}
                            preview={<ViewLink onClick={() => show("gaps")}>Gaps</ViewLink>}>
                    {gaps.length ? <GapTally marks={gaps} jobs={jobs} limit={4} />
                        : <Quiet>Nothing these postings often ask for is missing from your CV.</Quiet>}
                </ChartPanel>
                <ChartPanel title={"Where your skills sit"} lead={"Yours above the line, not yet below"} jobs={jobs}
                            legend={[["dot", "Yours"], ["ring", "Not yet"]]}
                            preview={<ViewLink onClick={() => show("landscape")}>Landscape</ViewLink>}>
                    <SkillStrip mine={mine} missing={top.filter((m) => !m.have)} jobs={jobs} compact />
                </ChartPanel>
            </div>
        </>
    )
}

function Demand({jobs, top, mine}: Views) {
    const shown = Math.min(12, top.length);
    return (
        <ChartPanel title={"What companies ask for"} lead={`${yoursOf(top.slice(0, shown))} of top ${shown} are yours`} jobs={jobs}
                    legend={[["have", "Yours"], ["hatch", "Not yet"]]}
                    notes={["Green is on your CV. Hatched isn't yet.", "Longer bar, more postings ask. The number is the count."]}
                    table={{marks: top}}>
            <DemandBars marks={top} jobs={jobs} badge={mine[0]?.skill} />
        </ChartPanel>
    )
}

function Yours({jobs, mine}: Views) {
    return (
        <ChartPanel title={"Your skills in demand"} lead={`${mine.length} from your CV, by demand`} jobs={jobs}
                    legend={[["have", "Yours"]]}
                    notes={["Every skill here is on your CV.", "Longer bar, more postings ask. The number is the count."]}
                    table={{marks: mine}}>
            {mine.length === 0
                ? <Quiet>None of the skills on your CV appear in these postings. The search probably reached a different corner of the market.</Quiet>
                : <DemandBars marks={mine} jobs={jobs} />}
        </ChartPanel>
    )
}

function Gaps({jobs, gaps}: Views) {
    const floor = toPercent(GAP_FREQUENCY_THRESHOLD);
    return (
        <ChartPanel title={"Not on your CV yet"} lead={`${gaps.length} skills, one mark per posting`} jobs={jobs}
                    legend={[["solid", "Asks"], ["faint", "Doesn't"]]}
                    notes={["Each mark is one posting. Solid ones ask for it.", `Grouped in fives. Only skills in ${floor}% of postings or more.`]}
                    table={{marks: gaps}}>
            {gaps.length === 0
                ? <Quiet>Nothing that {floor}% or more of these postings ask for is missing from your CV.</Quiet>
                : <GapTally marks={gaps} jobs={jobs} />}
        </ChartPanel>
    )
}

function Landscape({jobs, top, mine}: Views) {
    const missing = top.filter((m) => !m.have);
    return (
        <ChartPanel title={"Where your skills sit"} lead={"Yours above the line, not yet below"} jobs={jobs}
                    legend={[["dot", "Yours"], ["ring", "Not yet"]]}
                    notes={["Further along the line, more postings ask.", "Small ones stay unlabelled. Hover any dot for its name."]}
                    table={{marks: [...mine, ...missing]}}>
            <SkillStrip mine={mine} missing={missing} jobs={jobs} />
        </ChartPanel>
    )
}

export default function MarketChartsPage() {
    return (
        <Suspense fallback={null}>
            <MarketCharts />
        </Suspense>
    )
}
