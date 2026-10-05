'use client'

import React, {Suspense, useMemo} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {useAnalysis} from "@/lib/analysis-store";
import {EmptyScan, PageBar, Toolbar, ViewChip} from "@/components/dashboard/bits";
import {ChartPanel} from "@/components/dashboard/MarketParts";
import Bridges from "./Bridges";
import Constellation from "./Constellation";
import {buildSkillData, staircase} from "./skill-data";
import Specimens from "./Specimens";
import Staircase from "./Staircase";

/*
 * The skills page lab: four ways to answer "what should I learn next, and
 * what does it get me?" from the user's own scan. Inside the real dashboard
 * so it is judged in place. The concept chips are lab chrome, not a design.
 */

const CONCEPTS = [
    {id: "staircase", label: "A · Staircase"},
    {id: "constellation", label: "B · Constellation"},
    {id: "bridges", label: "C · Bridges"},
    {id: "specimens", label: "D · Specimen cards"},
] as const;
type ConceptId = typeof CONCEPTS[number]["id"];

function Lab() {
    const {analysis, hydrated} = useAnalysis();
    const router = useRouter(), pathname = usePathname();
    const c = (CONCEPTS.find((x) => x.id === useSearchParams().get("c"))?.id ?? "staircase") as ConceptId;
    const data = useMemo(() => (analysis?.market ? buildSkillData(analysis) : null), [analysis]);
    // The staircase's first step is the one "start here" every concept marks in lime.
    const first = useMemo(() => (data ? staircase(data, 1).steps[0]?.skill.key : undefined), [data]);
    if (!hydrated) return null;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"Skills lab"} meta={"Experiment · not in the app"} />
            {!data ? (
                <div className={"px-4 py-8 sm:px-8"}><EmptyScan message={"No scan yet. The skills page reads your scan."} /></div>
            ) : (
                <>
                    <Toolbar>
                        <div className={"flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&>*]:shrink-0"}>
                            {CONCEPTS.map((x) => (
                                <ViewChip key={x.id} active={x.id === c} onClick={() => router.replace(`${pathname}?c=${x.id}`, {scroll: false})}>{x.label}</ViewChip>
                            ))}
                        </div>
                    </Toolbar>
                    <div className={"mx-auto flex w-full max-w-[1000px] min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8"}>
                        {c === "staircase" && (
                            <ChartPanel title={"What to learn next"} lead={"Each step: the skill that brings the most postings within reach"} jobs={data.total}
                                        legend={[["have", "Today"], ["hatch", "Next steps"]]}
                                        notes={["Within reach: you have half the skills a posting requires.", "Tap a step to see the postings it opens."]}>
                                <Staircase data={data} />
                            </ChartPanel>
                        )}
                        {c === "constellation" && (
                            <ChartPanel title={"Your skill neighbourhood"} lead={"Close together = asked for together"} jobs={data.total}
                                        legend={[["dot", "Yours"], ["ring", "Not yet"]]}
                                        notes={["Bigger dot, more postings ask.", "Hover a skill to light the ones asked with it."]}>
                                <Constellation data={data} first={first} />
                            </ChartPanel>
                        )}
                        {c === "bridges" && (
                            <ChartPanel title={"Next steps from what you know"} lead={"Thicker bridge, more postings ask for both"} jobs={data.total}
                                        notes={["Right: skills you don't have yet, best connected first. The number is postings asking.", "Lime: the best next step."]}>
                                <Bridges data={data} />
                            </ChartPanel>
                        )}
                        {c === "specimens" && (
                            <ChartPanel title={"Skills worth knowing"} lead={"The most asked skills you don't have yet"} jobs={data.total}
                                        notes={["Each mark is one posting. Solid ones ask for it.", "Pairs with yours: postings asking for both."]}>
                                <Specimens data={data} first={first} />
                            </ChartPanel>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function SkillsLab() {
    return <Suspense fallback={null}><Lab /></Suspense>;
}
