'use client'

import React, {useMemo} from 'react'

import {useAnalysis} from "@/lib/analysis-store";
import {buildSkillData} from "@/lib/skill-bridges";
import {EmptyScan, PageBar} from "@/components/dashboard/bits";
import {ChartPanel} from "@/components/dashboard/MarketParts";
import Bridges from "@/components/dashboard/Bridges";
import {useViewOpened} from "@/components/AnalyticsProvider";

/*
 * The skills page: Bridges, from what you have to what the scan's jobs ask
 * for (decided in the 2026-10 skills lab). It replaced the Skill gaps table,
 * whose orange "missing" marks broke the colour rule. It shows, it does not
 * advise: no "learn next" anywhere.
 */
export default function SkillsPage() {
    useViewOpened("skills");
    const {analysis, hydrated} = useAnalysis();
    const data = useMemo(() => (analysis?.market ? buildSkillData(analysis) : null), [analysis]);

    if (!hydrated) return null;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"Your skills"} meta={data ? `counted from ${data.total} jobs` : undefined} />
            {!data ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet. This page reads the skills in your scan's jobs, so run one first."} />
                </div>
            ) : (
                <div className={"mx-auto flex w-full max-w-[1000px] min-w-0 flex-col px-4 py-5 sm:px-8 sm:py-8"}>
                    <ChartPanel title={"From what you have"} lead={"Thicker bridge, more jobs ask for both"} jobs={data.total}
                                notes={["Right: skills you don't have yet, most connected first.", "Lime: the most connected skill you don't have yet."]}>
                        <Bridges data={data} />
                    </ChartPanel>
                </div>
            )}
        </div>
    )
}
