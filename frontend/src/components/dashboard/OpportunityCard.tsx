'use client'

import React, {useEffect} from 'react'
import {AnimatePresence, motion} from "motion/react";

import {cn} from "@/lib/utils";
import {dateLabel, OpportunityRow, TIER_LABEL} from "@/lib/dashboard-data";
import {useApplications} from "@/lib/applications-store";
import {ScoreChip, StatusChip, TagChip} from "@/components/dashboard/bits";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import {BreakdownContent} from "@/components/dashboard/OpportunityPeek";
import {MinusIcon} from "lucide-react";

interface OpportunityCardProps {
    row: OpportunityRow;
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
}

/**
 * A compact card that morphs into the full match breakdown (shared-element
 * pattern via layoutId). The first reason shown is the one that decides the
 * most: what fits for a good match, what stands in the way for one out of reach.
 */
export default function OpportunityCard({row, open, onOpen, onClose}: OpportunityCardProps) {
    const {byJobId} = useApplications();
    const app = byJobId.get(row.jobId);
    const layoutId = `opp-card-${row.key}`;
    const when = dateLabel(row.listedAt, row.dateBasis);
    const lead = row.detail.blockers[0] ?? row.detail.reasons.find((r) => r.tone === "good")?.text;

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <>
            <motion.button
                layoutId={layoutId}
                onClick={onOpen}
                className={cn("flex w-full flex-col gap-2.5 rounded-xl border border-input bg-secondary/40 p-4 text-left transition-colors hover:border-foreground/25",
                    row.tier === "unlikely" && "opacity-75")}
            >
                <span className={"flex w-full items-center gap-2.5"}>
                    <CompanyLogo company={row.company ?? row.role} url={row.url} />
                    <span className={"min-w-0 flex-1"}>
                        <span className={"block truncate text-[14px] font-medium"}>{row.role}</span>
                        <span className={"block truncate font-mono text-[10.5px] text-muted-foreground"}>
                            {[row.company, row.location].filter(Boolean).join(" · ")}
                        </span>
                    </span>
                    <span className={"flex shrink-0 flex-col items-end gap-1"}>
                        <ScoreChip value={row.match} />
                        <span title={when.title} className={"font-mono text-[10px] text-muted-foreground"}>{when.text}</span>
                    </span>
                </span>
                <span className={"flex w-full min-w-0 flex-wrap items-center gap-1.5"}>
                    <span className={cn("font-mono text-[10px] uppercase tracking-[0.08em]",
                        row.tier === "strong" ? "text-accent-lime" : row.tier === "unlikely" ? "text-destructive" : "text-muted-foreground")}>
                        {TIER_LABEL[row.tier]}
                    </span>
                    {lead && <span className={"min-w-0 truncate text-[11.5px] text-muted-foreground"}>· {lead}</span>}
                    {app && <StatusChip status={app.status} className={"ml-auto"} />}
                </span>
                {row.tier !== "unlikely" && (row.have.length > 0 || row.missing.length > 0) && (
                    <span className={"flex w-full min-w-0 flex-wrap items-center gap-1.5"}>
                        {row.have.slice(0, 3).map((skill) => <TagChip key={skill} tone={"have"}>✓ {skill}</TagChip>)}
                        {row.missing.slice(0, 2).map((skill) => (
                            <TagChip key={skill} tone={"missing"}><MinusIcon aria-hidden className={"size-2.5"} /><span className={"sr-only"}>Missing:</span>{skill}</TagChip>
                        ))}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <div className={"fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"}>
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            onClick={onClose}
                            className={"absolute inset-0 bg-black/60 backdrop-blur-sm"}
                        />
                        <motion.div
                            layoutId={layoutId}
                            role={"dialog"}
                            aria-label={`Match breakdown: ${row.role}`}
                            className={"relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-2xl border border-input bg-popover p-5 shadow-2xl sm:rounded-2xl"}
                        >
                            <BreakdownContent row={row} onClose={onClose} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
