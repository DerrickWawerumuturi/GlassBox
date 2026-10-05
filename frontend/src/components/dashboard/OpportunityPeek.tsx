'use client'

import React from 'react'
import Link from "next/link";
import {CheckIcon, CircleAlertIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, XIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {toPercent} from "@/lib/market";
import {dateLabel, OpportunityRow, TIER_LABEL} from "@/lib/dashboard-data";
import {useApplications} from "@/lib/applications-store";
import {MatchReason} from "@/types/jobradar";
import {SectionLabel, SkillTag, StatusChip} from "@/components/dashboard/bits";

const DIMENSIONS = [
    {key: "role", label: "Role fit", color: "#c7ef34"},
    {key: "required", label: "Required skills", color: "#30a46c"},
    {key: "preferred", label: "Optional", color: "#0ca678"},
    {key: "seniority", label: "Level", color: "#ffb224"},
    {key: "experience", label: "Experience", color: "#f76b15"},
    {key: "location", label: "Location", color: "#5b7fff"}
] as const;

const SKILL_LIMIT = 8;

function Meter({label, value, color}: { label: string; value: number | null; color: string }) {
    const percent = value == null ? null : toPercent(value);
    return (
        <div className={"flex items-center gap-3"}>
            <span className={"flex w-28 shrink-0 items-center gap-1.5 text-xs text-muted-foreground"}>
                <span aria-hidden className={"size-1.5 rounded-full"} style={{backgroundColor: color}} />
                {label}
            </span>
            <div className={"h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8"}>
                {percent != null && (
                    <div className={"h-full rounded-full"} style={{width: `${percent}%`, background: `linear-gradient(90deg, ${color}99, ${color})`}} />
                )}
            </div>
            <span className={"w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground"}>
                {percent == null ? "n/a" : `${Math.round(percent)}%`}
            </span>
        </div>
    )
}

const TONE_ICON = {good: CircleCheckIcon, warn: CircleAlertIcon, bad: CircleXIcon};
const TONE_COLOR = {good: "text-success", warn: "text-chart-ramp-2", bad: "text-destructive"};

export function Reasons({reasons}: { reasons: MatchReason[] }) {
    return (
        <ul className={"flex flex-col gap-1.5"}>
            {reasons.map((reason) => {
                const Icon = TONE_ICON[reason.tone];
                return (
                    <li key={reason.text} className={"flex items-start gap-2 text-[12.5px] leading-snug"}>
                        <Icon className={cn("mt-px size-3.5 shrink-0", TONE_COLOR[reason.tone])} aria-label={reason.tone} />
                        <span>{reason.text}</span>
                    </li>
                );
            })}
        </ul>
    )
}

interface BreakdownProps {
    row: OpportunityRow;
    onClose: () => void;
}

/** Why a job is where it is: the reasons, the dimensions behind the score, the skills. */
export function BreakdownContent({row, onClose}: BreakdownProps) {
    const {state, byJobId, pending, toggleSave, markApplied} = useApplications();
    const detail = row.detail;
    const when = dateLabel(row.listedAt, row.dateBasis);

    const app = byJobId.get(row.jobId);
    const saved = app != null;
    const applied = app != null && app.status !== "saved";
    const busy = pending.has(row.jobId);
    const target = {jobId: row.jobId, role: row.role, company: row.company, match: row.match};

    return (
        <>
            <div className={"flex items-start justify-between gap-3"}>
                <div>
                    <SectionLabel>Match breakdown</SectionLabel>
                    <h3 className={"mt-2 text-lg font-bold leading-snug"}>{row.role}</h3>
                    <p className={"mt-1 font-mono text-[11.5px] text-muted-foreground"}>
                        {[row.company, row.location, row.type, row.salary].filter(Boolean).join(" · ")}
                    </p>
                    <p title={when.title} className={"mt-1 font-mono text-[10.5px] text-muted-foreground/80"}>{when.text}</p>
                </div>
                <button aria-label={"Close"} onClick={onClose} className={"text-muted-foreground hover:text-foreground"}>
                    <XIcon className={"size-4"} />
                </button>
            </div>

            <div className={"flex items-center gap-3"}>
                <span className={"font-mono text-4xl font-bold leading-none text-accent-lime"}>{row.match}</span>
                <span className={"flex flex-col"}>
                    <span className={"font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"}>% fit</span>
                    <span className={cn("text-[12px] font-medium", row.tier === "unlikely" ? "text-destructive" : "text-foreground")}>
                        {detail.blockers.length ? detail.headline : TIER_LABEL[row.tier]}
                    </span>
                </span>
                {app && <StatusChip status={app.status} className={"ml-auto"} />}
            </div>

            <div className={"border-t border-border pt-4"}>
                <Reasons reasons={detail.reasons} />
            </div>

            <div className={"flex flex-col gap-2.5 border-t border-border pt-4"}>
                {DIMENSIONS.map(({key, label, color}) => (
                    <Meter key={key} label={label} value={detail.dimensions[key]} color={color} />
                ))}
                <p className={"text-[11px] leading-relaxed text-muted-foreground/80"}>
                    Skills, role and level set the fit; being short on experience or unable to work there scales
                    the whole score down, because no overlap makes up for them.
                </p>
            </div>

            <SkillSection title={`Required skills you have (${row.have.length})`} skills={row.have} tone={"have"}
                          empty={row.required ? "None of the required skills are on your CV." : "This job lists no specific skills."} />
            {row.missing.length > 0 && <SkillSection title={`Required skills not on your CV (${row.missing.length})`} skills={row.missing} tone={"missing"} />}
            {detail.preferred.missing.length > 0 && (
                <SkillSection title={`Optional skills not on your CV (${detail.preferred.missing.length})`} skills={detail.preferred.missing} tone={"missing"} />
            )}

            {row.also.length > 0 && (
                <p className={"text-[11.5px] text-muted-foreground"}>
                    Also listed on {[...new Set(row.also.map((a) => a.provider))].join(", ")}.
                </p>
            )}

            <div className={"mt-auto flex flex-wrap gap-2 border-t border-border pt-4"}>
                {row.url && (
                    <a
                        href={row.url}
                        target={"_blank"}
                        rel={"noreferrer noopener"}
                        className={"inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                    >
                        View job <ExternalLinkIcon className={"size-3"} />
                    </a>
                )}
                {state === "signed-out" ? (
                    <Link
                        href={"/sign-in"}
                        className={"inline-flex items-center rounded-md border border-border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"}
                    >
                        Sign in to track it
                    </Link>
                ) : (
                    <>
                        <button
                            disabled={busy || applied}
                            onClick={() => toggleSave(target)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                saved ? "border-success/45 text-success" : "border-border hover:border-foreground/25"
                            )}
                        >
                            {saved && <CheckIcon className={"size-3"} />}
                            {saved ? "Saved" : "Save"}
                        </button>
                        <button
                            disabled={busy || applied}
                            onClick={() => markApplied(target)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                applied ? "border-success/45 text-success" : "border-border hover:border-foreground/25"
                            )}
                        >
                            {applied && <CheckIcon className={"size-3"} />}
                            {applied ? "Applied" : "Mark applied"}
                        </button>
                    </>
                )}
            </div>
        </>
    )
}

function SkillSection({title, skills, tone, empty}: { title: string; skills: string[]; tone: "have" | "gap" | "missing"; empty?: string }) {
    return (
        <div>
            <SectionLabel>{title}</SectionLabel>
            <div className={"mt-2 flex flex-wrap gap-1.5"}>
                {skills.length > 0
                    ? skills.slice(0, SKILL_LIMIT).map((skill) => <SkillTag key={skill} skill={skill} tone={tone} />)
                    : <p className={"text-xs text-muted-foreground"}>{empty}</p>}
                {skills.length > SKILL_LIMIT && (
                    <span className={"self-center text-[11px] text-muted-foreground"}>+{skills.length - SKILL_LIMIT} more</span>
                )}
            </div>
        </div>
    )
}
