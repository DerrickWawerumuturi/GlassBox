'use client'

import React, {useMemo, useState} from 'react'

import {useAnalysis} from "@/lib/analysis-store";
import {OpportunityRow, rankedToRow} from "@/lib/dashboard-data";
import {EmptyScan, PageBar} from "@/components/dashboard/bits";
import OpportunityCard from "@/components/dashboard/OpportunityCard";

/** The scan's jobs as the dashboard's Opportunities cards, best match first. */
export default function AnalysisJobsPage() {
    const {analysis} = useAnalysis();
    const [open, setOpen] = useState<string | null>(null);
    const rows = useMemo(() => {
        const now = new Date().toISOString();
        return (analysis?.ranked_jobs ?? []).map((r, i) => rankedToRow(r, i, now))
            .filter((r): r is OpportunityRow => r !== null)
            .sort((a, b) => b.match - a.match);
    }, [analysis]);

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"Jobs"} meta={`${rows.length} jobs from your scan`} />
            {rows.length === 0 ? (
                <div className={"px-4 py-8 sm:px-8"}><EmptyScan message={"This scan has no jobs to show. Run a new one from the home page."} /></div>
            ) : (
                <div className={"grid gap-3 px-4 py-5 sm:grid-cols-2 sm:px-8 sm:py-8 xl:grid-cols-3"}>
                    {rows.map((row) => (
                        <OpportunityCard key={row.key} row={row} open={open === row.key} onOpen={() => setOpen(row.key)} onClose={() => setOpen(null)} />
                    ))}
                </div>
            )}
        </div>
    )
}
