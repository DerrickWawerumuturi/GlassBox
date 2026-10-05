'use client'

import React from 'react'
import {Cell, Pie, PieChart, ResponsiveContainer} from "recharts";
import {SkillCoverage as SkillCoverageStat} from "@/types/jobradar";
import {coveragePercent} from "@/lib/market";
import PanelHeader from "@/components/Market/PanelHeader";
import PanelNote from "@/components/Market/PanelNote";

interface SkillCoverageProps {
    coverage: SkillCoverageStat;
}

/**
 * Answers: "how much of the important market skillset do I already cover?"
 *
 * One proportion, so a donut with the number in the middle and the sentence
 * doing the explaining. Framed as a measurement of this specific job sample,
 * not a verdict on the user.
 */
const SkillCoverage = ({coverage}: SkillCoverageProps) => {
    if (!coverage || coverage.total === 0) return null;

    const percent = coveragePercent(coverage);
    const data = [
        {name: "covered", value: coverage.covered},
        {name: "remaining", value: Math.max(0, coverage.total - coverage.covered)}
    ];

    return (
        <section className={"chart-panel chart-panel-green flex flex-col gap-6 px-5 py-7 sm:px-8"}>
            <PanelHeader
                title={"Skill coverage"}
                qualifier={"of this market"}
                lead={"How many of this market's top skills are already on your CV"}
            />

            <div className={"chart-grid-paper flex flex-col items-center gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:gap-8"}>
                <div className={"relative h-[180px] w-[180px] shrink-0"}>
                    <ResponsiveContainer width={"100%"} height={"100%"}>
                        <PieChart>
                            {/* The covered arc counts your skills, so it is the "have" green. */}
                            <defs>
                                <linearGradient id={"coverage-arc"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                                    <stop offset={"0%"} stopColor={"var(--chart-have)"} />
                                    <stop offset={"100%"} stopColor={"var(--chart-have)"} />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={data}
                                dataKey={"value"}
                                innerRadius={62}
                                outerRadius={82}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={2}
                                cornerRadius={5}
                                strokeWidth={0}
                                isAnimationActive={false}
                            >
                                <Cell fill={"url(#coverage-arc)"} />
                                <Cell fill={"var(--muted)"} />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div className={"pointer-events-none absolute inset-0 flex flex-col items-center justify-center"}>
                        <span className={"font-mono text-3xl font-bold tracking-tight tabular-nums"}>{percent}%</span>
                        <span className={"font-mono text-[10px] uppercase tracking-[0.18em] text-accent-lime"}>coverage</span>
                    </div>
                </div>

                <div className={"flex flex-col gap-2"}>
                    <p className={"text-sm"}>
                        Your CV has{" "}
                        <span className={"font-medium"}>
                            {coverage.covered} of the {coverage.total} skills
                        </span>{" "}
                        these jobs ask for most.
                    </p>
                    <p className={"text-sm text-muted-foreground"}>
                        This measures overlap with the skills these jobs ask for most. It is
                        not a measure of how employable you are.
                    </p>
                </div>
            </div>

            <PanelNote
                points={[
                    <>The ring is this market&apos;s top skills split in two: the warm part is what your CV already covers, the faint part is what&apos;s missing.</>,
                    <>The middle number says the same as a percentage: 60% means 6 of every 10 top skills.</>,
                    <>It only compares you with this batch of jobs. A low number is not a verdict on you.</>
                ]}
            />
        </section>
    )
}
export default SkillCoverage
