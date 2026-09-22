'use client'

import React, {Suspense, useEffect, useMemo, useState} from 'react'
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {SearchIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {useApplications} from "@/lib/applications-store";
import {useOpportunities} from "@/lib/opportunities-store";
import {ageLabel, OpportunityRow} from "@/lib/dashboard-data";
import {PageBar, Toolbar, ViewChip} from "@/components/dashboard/bits";
import OpportunityCard from "@/components/dashboard/OpportunityCard";

const VIEWS = [
    {id: "fits", label: "Good fits", tiers: ["strong", "good"]},
    {id: "stretch", label: "Stretch", tiers: ["stretch"]},
    {id: "tracked", label: "Tracked", tiers: null},
    {id: "unlikely", label: "Out of reach", tiers: ["unlikely"]}
] as const;
type ViewId = typeof VIEWS[number]["id"];
type Sort = "newest" | "match";

const TIER_ORDER = {strong: 0, good: 1, stretch: 2, unlikely: 3} as const;
const BATCH_SIZE = 10;

/** Newest first, as the pool is meant to be read; best match first on request. */
function ordered(rows: OpportunityRow[], sort: Sort): OpportunityRow[] {
    const newest = (row: OpportunityRow) => -new Date(row.listedAt).getTime();
    return [...rows].sort((a, b) => sort === "match"
        ? TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.match - a.match || newest(a) - newest(b)
        : newest(a) - newest(b) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.match - a.match);
}

function Opportunities() {
    const {data, rows, state, syncing, refresh} = useOpportunities();
    const {byJobId} = useApplications();
    const [selected, setSelected] = useState<string | null>(useSearchParams().get("sel"));
    const [view, setView] = useState<ViewId>("fits");
    const [sort, setSort] = useState<Sort>("newest");
    const [query, setQuery] = useState("");

    const inView = (row: OpportunityRow, id: ViewId) => {
        const spec = VIEWS.find((v) => v.id === id)!;
        return spec.tiers ? (spec.tiers as readonly string[]).includes(row.tier) : byJobId.has(row.jobId);
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return ordered(rows.filter((row) => inView(row, view) && (!q || [row.role, row.company ?? "", ...row.have, ...row.missing]
            .some((text) => text.toLowerCase().includes(q)))), sort);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, view, sort, query, byJobId]);

    const [limit, setLimit] = useState(BATCH_SIZE);
    useEffect(() => setLimit(BATCH_SIZE), [view, query, sort]);
    // A deep link can point past the first batch, or into another view.
    useEffect(() => {
        if (!selected) return;
        const row = rows.find((r) => r.key === selected);
        if (row && !inView(row, view)) setView(VIEWS.find((v) => v.tiers && inView(row, v.id))?.id ?? "fits");
        const index = visible.findIndex((r) => r.key === selected);
        if (index >= limit) setLimit(index + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, rows, visible, limit]);

    const shown = visible.slice(0, limit);
    const remaining = visible.length - shown.length;
    const counts = data?.counts;
    const fits = counts ? counts.strong + counts.good : 0;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Opportunities"}
                meta={data ? `${fits} good fits · pool updated ${ageLabel(data.pool.refreshed_at).toLowerCase()}${syncing ? " · syncing" : ""}` : undefined}
            />

            {state === "signed-out" && (
                <Notice text={"Opportunities are matched to your CV, so they live with your account."} href={"/sign-in"} action={"Sign in"} />
            )}
            {state === "no-cv" && (
                <Notice
                    text={"Add your CV once. JobRadar matches it against thousands of jobs it collects every morning — no scan to wait for."}
                    href={"/dashboard/scan"}
                    action={"Upload your CV"}
                />
            )}
            {state === "error" && !data && (
                <div className={"mx-4 mt-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm sm:mx-8"}>
                    <span>Couldn&apos;t load your opportunities.</span>
                    <button onClick={() => refresh()} className={"font-mono text-xs uppercase tracking-[0.1em] text-primary hover:underline"}>Retry</button>
                </div>
            )}
            {state === "loading" && !data && <ListSkeleton />}

            {data && (
                <>
                    <Toolbar>
                        <div className={"flex flex-wrap gap-1.5"} role={"tablist"} aria-label={"Filter opportunities"}>
                            {VIEWS.map((v) => (
                                <ViewChip
                                    key={v.id}
                                    active={view === v.id}
                                    onClick={() => setView(v.id)}
                                    count={rows.filter((row) => inView(row, v.id)).length}
                                >
                                    {v.label}
                                </ViewChip>
                            ))}
                        </div>
                        <div className={"ml-auto flex items-center gap-2"}>
                            <div className={"flex rounded-md border border-border p-0.5"} role={"radiogroup"} aria-label={"Sort"}>
                                {(["newest", "match"] as const).map((option) => (
                                    <button
                                        key={option}
                                        role={"radio"}
                                        aria-checked={sort === option}
                                        onClick={() => setSort(option)}
                                        className={cn("rounded px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors",
                                            sort === option ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground")}
                                    >
                                        {option === "newest" ? "Newest" : "Best match"}
                                    </button>
                                ))}
                            </div>
                            <label className={"flex items-center gap-2 rounded-md border border-border px-2.5 py-1 focus-within:border-foreground/25"}>
                                <SearchIcon className={"size-3.5 text-muted-foreground"} />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={"Search role, company, skill"}
                                    className={"w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"}
                                />
                            </label>
                        </div>
                    </Toolbar>

                    <div className={"flex w-full flex-col gap-2.5 px-4 py-5 sm:px-5"}>
                        {view === "unlikely" && visible.length > 0 && (
                            <p className={"text-[12px] leading-relaxed text-muted-foreground"}>
                                Jobs your skills fit but something stands in the way — seniority, years, where they hire,
                                a language. Each one says what. The closest {visible.length} of {counts?.unlikely ?? 0} are shown.
                            </p>
                        )}
                        {shown.map((row) => (
                            <OpportunityCard
                                key={row.key}
                                row={row}
                                open={selected === row.key}
                                onOpen={() => setSelected(row.key)}
                                onClose={() => setSelected(null)}
                            />
                        ))}
                        {visible.length === 0 && (
                            <p className={"py-10 text-center text-sm text-muted-foreground"}>
                                {view === "fits" ? "No good fits in the pool right now. Stretch roles may still be worth a look." : "Nothing in this view."}
                            </p>
                        )}
                        {remaining > 0 && (
                            <button
                                onClick={() => setLimit((prev) => prev + BATCH_SIZE)}
                                className={"mt-2 self-center rounded-full bg-muted/50 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"}
                            >
                                Show {Math.min(BATCH_SIZE, remaining)} more · {remaining} remaining
                            </button>
                        )}
                        <p className={"px-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70"}>
                            {data.pool.considered.toLocaleString()} jobs from the last {data.pool.window_days} days
                            matched against your CV · refreshed daily
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

function Notice({text, href, action}: { text: string; href: string; action: string }) {
    return (
        <div className={"px-4 py-8 sm:px-8"}>
            <div className={"flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 px-6 py-14 text-center"}>
                <p className={"max-w-md text-sm text-muted-foreground"}>{text}</p>
                <Link
                    href={href}
                    className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                >
                    {action}
                </Link>
            </div>
        </div>
    )
}

function ListSkeleton() {
    return (
        <div className={"flex flex-col gap-2.5 px-4 py-5 sm:px-5"} aria-busy aria-label={"Loading opportunities"}>
            {[0, 1, 2, 3].map((row) => (
                <div key={row} className={"h-[78px] animate-pulse rounded-xl border border-input bg-secondary/30"} />
            ))}
        </div>
    )
}

export default function OpportunitiesPage() {
    return (
        <Suspense fallback={null}>
            <Opportunities />
        </Suspense>
    )
}
