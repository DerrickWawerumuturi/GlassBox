import React from "react";
import Link from "next/link";

import {API_BASE_URL} from "@/lib/api";
import {publicPage} from "@/lib/seo";
import {cn} from "@/lib/utils";
import t from "@/components/stories/story.module.css";

export const revalidate = 3600;
export const metadata = publicPage("/market/history", {
    title: "Monthly market history | Glassbox",
    description: "Monthly averages of active tech job postings, with snapshot coverage and profiler versions shown.",
    share: {title: "Monthly market history", description: "A dated view of what active tech jobs ask for."},
});

type SkillDemand = {
    key: string;
    required_share: number;
    preferred_share: number;
    mentioned_share: number;
    sample_days: number;
};

type MonthlySeries = {
    month: string;
    profiler_version: string;
    family: string;
    average_active_postings: number;
    average_readable_postings: number;
    snapshot_days: number;
    coverage_days: number;
    coverage_fraction: number;
    first_snapshot: string;
    last_snapshot: string;
    skill_sample_days: number;
    skills: SkillDemand[];
};

type History = {
    range_start: string;
    range_end: string;
    months_requested: number;
    six_month_available: boolean;
    series: MonthlySeries[];
};

async function getHistory(): Promise<History | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/market/history`, {
            next: {revalidate: 3600},
        });
        if (!response.ok) return null;
        return await response.json() as History;
    } catch {
        return null;
    }
}

const number = new Intl.NumberFormat("en-US");
const monthName = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
});
const familyName = (family: string) => family.replaceAll("_", " ");
const percent = (value: number) => `${value.toFixed(1)}%`;

function Coverage({row}: {row: MonthlySeries}) {
    const pct = Math.round(row.coverage_fraction * 100);
    return (
        <div className="min-w-32">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span>{row.snapshot_days}/{row.coverage_days} days</span>
                <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-stone-800" style={{width: `${Math.min(100, pct)}%`}} />
            </div>
        </div>
    );
}

function Skills({skills}: {skills: SkillDemand[]}) {
    if (!skills.length) return <span className="text-stone-500">No readable skill data</span>;
    return (
        <ul className="flex flex-wrap gap-2">
            {skills.slice(0, 4).map((skill) => (
                <li key={skill.key} className="rounded-full border border-stone-300 px-2.5 py-1 text-xs">
                    <span className="font-semibold">{skill.key}</span>
                    <span className="ml-1.5 text-stone-500">req {percent(skill.required_share)}</span>
                </li>
            ))}
        </ul>
    );
}

export default async function MarketHistoryPage() {
    const history = await getHistory();
    const rows = history?.series ?? [];
    const ordered = [...rows].sort((a, b) =>
        b.month.localeCompare(a.month) ||
        b.profiler_version.localeCompare(a.profiler_version) ||
        a.family.localeCompare(b.family)
    );

    return (
        <main className={cn(t.story, "mx-auto w-full max-w-6xl px-5 py-12 sm:px-8")}>
            <div className="mb-8">
                <Link href="/market" className="text-sm underline underline-offset-4">← Back to the market</Link>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Market history</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    The market, month by month.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
                    Each number is the average of the daily active-market snapshots captured in that month.
                    Repeated appearances are averaged, never added together as new jobs.
                </p>
            </div>

            {!history ? (
                <div className="rounded-xl border border-stone-300 p-6">
                    <h2 className="font-semibold">History is temporarily unavailable</h2>
                    <p className="mt-2 text-sm text-stone-600">The snapshot service could not be reached. The weekly market pages remain available.</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 rounded-xl border border-stone-300 bg-stone-50 p-5">
                        <h2 className="font-semibold">Coverage before conclusions</h2>
                        <p className="mt-2 text-sm leading-relaxed text-stone-600">
                            This view covers {history.range_start} to {history.range_end}. Each row shows its captured days,
                            calendar coverage and profiler version. Missing dates are not filled in, and different profiler
                            versions are never combined.
                        </p>
                        {!history.six_month_available && (
                            <p className="mt-3 text-sm font-medium">
                                Six-month comparisons are not available yet. They will appear once one comparable profiler
                                series spans six distinct calendar months.
                            </p>
                        )}
                    </div>

                    {ordered.length === 0 ? (
                        <p className="rounded-xl border border-stone-300 p-6 text-sm text-stone-600">
                            No daily snapshots are available in this period yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-stone-300">
                            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                                <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                                    <tr>
                                        <th className="px-4 py-3">Month / family</th>
                                        <th className="px-4 py-3">Average active</th>
                                        <th className="px-4 py-3">Average readable</th>
                                        <th className="px-4 py-3">Coverage</th>
                                        <th className="px-4 py-3">Profiler</th>
                                        <th className="px-4 py-3">Skills most often asked</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordered.map((row) => (
                                        <tr key={`${row.month}-${row.profiler_version}-${row.family}`} className="border-t border-stone-200 align-top">
                                            <td className="px-4 py-4">
                                                <div className="font-semibold">{monthName(row.month)}</div>
                                                <div className="mt-1 capitalize text-stone-500">{familyName(row.family)}</div>
                                                <div className="mt-1 text-xs text-stone-400">{row.first_snapshot} – {row.last_snapshot}</div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold tabular-nums">{number.format(row.average_active_postings)}</td>
                                            <td className="px-4 py-4 tabular-nums">{number.format(row.average_readable_postings)}</td>
                                            <td className="px-4 py-4"><Coverage row={row} /></td>
                                            <td className="px-4 py-4 font-mono text-xs">{row.profiler_version}</td>
                                            <td className="px-4 py-4"><Skills skills={row.skills} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-stone-500">
                Monthly averages describe the active market observed on captured days. They are not counts of distinct
                jobs posted during the month. Skill shares are averaged day by day using each day's readable-posting
                denominator. The latest weekly publication remains the current inventory.
            </p>
        </main>
    );
}
