'use client'

import React, {useMemo} from 'react'
import Link from "next/link";
import {FileTextIcon, PlusIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApplicationRow} from "@/types/jobradar";
import {useApplications} from "@/lib/applications-store";
import {useAnalysis} from "@/lib/analysis-store";
import {toOpportunities} from "@/lib/dashboard-data";
import {ScoreChip, SectionLabel} from "@/components/dashboard/bits";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {DeleteButton} from "@/components/ui/delete-button";

/*
 * The applications table's pieces: the cells that do more than show a value,
 * the first-load skeleton, and the "Track a job" menu. The page itself keeps
 * the layout, the views and the mobile action sheet.
 */

const TRACK_SUGGESTIONS = 5;

/** "Hybrid · New York"; a location that already says remote is shown as written. */
export function workplaceLabel(app: ApplicationRow): string {
    const where = app.location?.trim() || null;
    const mode = app.workplace === "hybrid" ? "Hybrid" : app.remote ? "Remote" : null;
    if (!mode) return where ?? "—";
    if (where && where.toLowerCase().includes(mode.toLowerCase())) return where;
    return [mode, where].filter(Boolean).join(" · ");
}

/** First load with nothing cached — the shape of the table, not a spinner. */
export function ApplicationsSkeleton() {
    return (
        <div className={"flex flex-col gap-px px-4 py-4 sm:px-5"} aria-busy aria-label={"Loading applications"}>
            {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className={"flex items-center gap-4 border-b border-border/50 py-3"}>
                    <div className={"h-3 w-44 animate-pulse rounded bg-foreground/8"} />
                    <div className={"hidden h-3 w-28 animate-pulse rounded bg-foreground/6 md:block"} />
                    <div className={"h-3 w-10 animate-pulse rounded bg-foreground/6"} />
                    <div className={"ml-auto h-5 w-20 animate-pulse rounded-full bg-foreground/6"} />
                </div>
            ))}
        </div>
    );
}

/** Only bookmarks are deletable — a sent application would lose its history. */
export function RemoveCell({app}: { app: ApplicationRow }) {
    const {toggleSave} = useApplications();
    if (app.status !== "saved" || app.id < 0 || app.job_id == null) return null;

    return (
        <DeleteButton
            className={"origin-left scale-70 -my-1.5"}
            onConfirm={() => toggleSave({
                jobId: app.job_id!,
                role: app.title,
                company: app.company,
                match: Number(app.match_score) || null
            })}
        />
    )
}

/** The CV exactly as it was when this job was saved. */
export function CvSnapshot({app}: { app: ApplicationRow }) {
    const cv = app.cv_snapshot;
    if (!cv) return <span className={"text-muted-foreground/50"}>—</span>;

    const skills = (cv.skills ?? []).filter((s): s is string => Boolean(s));

    return (
        <Dialog>
            <DialogTrigger render={(props) => (
                <button
                    {...props}
                    aria-label={"View the CV this was saved with"}
                    className={cn(props.className, "inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground")}
                >
                    <FileTextIcon className={"size-3.5"} /> view
                </button>
            )} />
            <DialogContent className={"sm:max-w-md"}>
                <DialogTitle className={"text-base font-bold"}>
                    CV at save time
                </DialogTitle>
                <div className={"flex flex-col gap-3 text-[13px]"}>
                    <div>
                        <p className={"font-medium"}>{cv.name ?? "Unnamed"}</p>
                        <p className={"font-mono text-[11px] text-muted-foreground"}>
                            {[cv.title, cv.experience_level, cv.location].filter(Boolean).join(" · ") || "no details"}
                        </p>
                    </div>
                    <div>
                        <SectionLabel>Skills ({skills.length})</SectionLabel>
                        <div className={"mt-2 flex flex-wrap gap-1.5"}>
                            {skills.slice(0, 16).map((skill) => (
                                <span key={skill} className={"rounded-[3px] border border-border px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground"}>
                                    {skill}
                                </span>
                            ))}
                            {skills.length > 16 && (
                                <span className={"self-center text-[11px] text-muted-foreground"}>+{skills.length - 16} more</span>
                            )}
                        </div>
                    </div>
                    <p className={"text-[11px] leading-relaxed text-muted-foreground"}>
                        This is the profile the {Math.round(Number(app.match_score ?? 0))}% match was
                        computed against. It stays frozen even as your CV evolves.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** "+ Track a job" — the top unsaved matches, one click each. */
export function TrackJobMenu() {
    const {analysis} = useAnalysis();
    const {byJobId, toggleSave, pending} = useApplications();

    const candidates = useMemo(() => {
        if (!analysis) return [];
        return toOpportunities(analysis)
            .filter((row) => row.jobId != null && !byJobId.has(row.jobId))
            .slice(0, TRACK_SUGGESTIONS);
    }, [analysis, byJobId]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={(props) => (
                <button
                    {...props}
                    className={cn(props.className, "flex w-full items-center gap-1.5 border-b border-border/70 px-4 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-foreground/3 hover:text-foreground sm:px-5")}
                >
                    <PlusIcon className={"size-3.5"} /> Track a job
                </button>
            )} />
            <DropdownMenuContent align={"start"} className={"w-80"}>
                {candidates.length > 0 ? candidates.map((row) => (
                    <DropdownMenuItem
                        key={row.key}
                        disabled={row.jobId != null && pending.has(row.jobId)}
                        onClick={() => row.jobId != null && toggleSave({
                            jobId: row.jobId, role: row.role, company: row.company, match: row.match
                        })}
                        className={"cursor-pointer gap-2.5"}
                    >
                        <CompanyLogo company={row.company ?? row.role} url={row.url} />
                        <span className={"min-w-0 flex-1"}>
                            <span className={"block truncate text-[13px]"}>{row.role}</span>
                            <span className={"block truncate font-mono text-[10.5px] text-muted-foreground"}>{row.company ?? "—"}</span>
                        </span>
                        <ScoreChip value={row.match} />
                    </DropdownMenuItem>
                )) : (
                    <p className={"px-2 py-2 text-xs text-muted-foreground"}>
                        {analysis ? "Every current match is already tracked." : "Run a scan first and matches show up here."}
                    </p>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={(props) => (
                        <Link {...props} href={"/dashboard/opportunities"} className={cn(props.className, "cursor-pointer text-xs text-muted-foreground")}>
                            Browse all opportunities →
                        </Link>
                    )}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
