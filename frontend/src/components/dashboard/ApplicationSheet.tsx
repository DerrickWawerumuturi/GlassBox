'use client'

import React from 'react'
import {AnimatePresence, motion} from "motion/react";
import {toast} from "sonner";
import {ArrowUpRightIcon, ListChecksIcon} from "lucide-react";

import {ApplicationRow} from "@/types/jobradar";
import {DELETABLE, useApplications} from "@/lib/applications-store";
import {ageLabel} from "@/lib/dashboard-data";
import {jobSource} from "@/lib/job-source";
import {ScoreChip} from "@/components/dashboard/bits";
import StatusDisclosure from "@/components/dashboard/StatusDisclosure";
import {shortDate, workplaceLabel} from "@/components/dashboard/ApplicationParts";
import {DeleteButton} from "@/components/ui/delete-button";

interface ApplicationSheetProps {
    app: ApplicationRow | null;
    onClose: () => void;
    /** Start selecting several rows, this one first. */
    onSelect: (app: ApplicationRow) => void;
}

/**
 * A row's long-press sheet on a phone: every column the table has no room
 * for, and the actions the desktop row keeps in its own cells.
 */
export default function ApplicationSheet({app, onClose, onSelect}: ApplicationSheetProps) {
    const {remove} = useApplications();

    return (
        <AnimatePresence>
            {app && (
                <>
                    <motion.div
                        key={"sheet-backdrop"}
                        initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                        onClick={onClose}
                        className={"fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"}
                    />
                    <motion.div
                        key={"sheet"}
                        initial={{y: "100%"}} animate={{y: 0}} exit={{y: "100%"}}
                        transition={{type: "spring", bounce: 0.2, duration: 0.4}}
                        className={"fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-2xl border-t border-input bg-popover p-5 pb-8"}
                    >
                        <div className={"mx-auto h-1 w-10 rounded-full bg-foreground/20"} />
                        <div className={"flex items-center gap-3"}>
                            <span className={"min-w-0 flex-1"}>
                                <span className={"block truncate font-medium"}>{app.title ?? "Untitled role"}</span>
                                <span className={"block truncate font-mono text-[11px] text-muted-foreground"}>{app.company ?? "—"}</span>
                            </span>
                            <ScoreChip value={app.match_score} />
                        </div>
                        <div className={"flex items-center gap-3"}>
                            <span className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>Status</span>
                            <StatusDisclosure app={app} />
                        </div>
                        <dl className={"grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]"}>
                            <Detail label={"Applied"}>
                                {app.status === "saved" ? "Not yet" : app.applied_at ? shortDate(app.applied_at) : "Date unknown"}
                            </Detail>
                            <Detail label={"Added"}>{ageLabel(app.added_at ?? app.last_status_at)}</Detail>
                            <Detail label={"Location"}>{workplaceLabel(app)}</Detail>
                            <Detail label={"Source"}>{jobSource(app.url, app.provider, app.source).label}</Detail>
                        </dl>
                        {app.notes && (
                            <p className={"whitespace-pre-line rounded-md bg-foreground/4 px-3 py-2 text-[12px] text-muted-foreground"}>
                                {app.notes}
                            </p>
                        )}
                        <div className={"flex items-center gap-2 border-t border-border pt-4"}>
                            {app.url && (
                                <a
                                    href={app.url}
                                    target={"_blank"}
                                    rel={"noreferrer noopener"}
                                    className={"inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink"}
                                >
                                    View job <ArrowUpRightIcon className={"size-3"} />
                                </a>
                            )}
                            <button
                                type={"button"}
                                onClick={() => onSelect(app)}
                                className={"inline-flex items-center gap-1.5 rounded-md border border-input px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"}
                            >
                                <ListChecksIcon className={"size-3.5"} /> Select
                            </button>
                            <DeleteButton
                                className={"ml-auto"}
                                onConfirm={() => {
                                    if (DELETABLE.includes(app.status)) {
                                        remove(app);
                                        onClose();
                                    } else {
                                        toast.error("Active applications keep their history. Move it to Withdrawn first, then delete.");
                                    }
                                }}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function Detail({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <div className={"min-w-0"}>
            <dt className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>{label}</dt>
            <dd className={"mt-0.5 truncate"}>{children}</dd>
        </div>
    )
}
