'use client'

import React from "react";
import {ArrowUpRightIcon} from "lucide-react";

import {Checkbox} from "@/components/ui/checkbox";
import AppliedDatePicker from "@/components/dashboard/AppliedDatePicker";
import StatusDisclosure from "@/components/dashboard/StatusDisclosure";
import {workplaceLabel} from "@/components/dashboard/ApplicationParts";
import {ScoreChip} from "@/components/dashboard/bits";
import {CLOSED} from "@/lib/applications-store";
import {jobSource} from "@/lib/job-source";
import {cn} from "@/lib/utils";
import {ApplicationRow} from "@/types/jobradar";

/** What each row or card needs from the page: selection and the long press. */
export interface RowProps {
    selected: Set<number>;
    toggle: (id: number) => void;
    /** Touch handlers and the click that selects while selecting. */
    rowHandlers: (app: ApplicationRow) => React.HTMLAttributes<HTMLElement>;
}

/**
 * Below sm the table becomes one card per application: title and company,
 * the status, the applied date (tap to change), and a short meta line.
 * The checkbox is always there, so selecting never needs a long press.
 */
export default function ApplicationCards({apps, selected, toggle, rowHandlers}: RowProps & {apps: ApplicationRow[]}) {
    return (
        <ul className={"flex flex-col gap-2 px-3 py-3 sm:hidden"} aria-label={"Applications"}>
            {apps.map((app) => {
                const place = workplaceLabel(app);
                const source = jobSource(app.url, app.provider, app.source).label;
                const meta = [source !== "—" && source, place !== "—" && place].filter(Boolean).join(" · ");
                return (
                    <li
                        key={app.id}
                        {...rowHandlers(app)}
                        className={cn(
                            "flex gap-3 rounded-lg border border-border bg-card/60 p-3 [-webkit-touch-callout:none] select-none",
                            CLOSED.includes(app.status) && "text-muted-foreground",
                            selected.has(app.id) && "border-primary/50 bg-primary/8"
                        )}
                    >
                        <span data-row-select className={"pt-0.5"}>
                            <Checkbox
                                aria-label={`Select ${app.title ?? "application"}`}
                                checked={selected.has(app.id)}
                                disabled={app.id < 0}
                                onCheckedChange={() => toggle(app.id)}
                            />
                        </span>
                        <div className={"flex min-w-0 flex-1 flex-col gap-1.5"}>
                            <div className={"flex items-start justify-between gap-2"}>
                                <div className={"min-w-0"}>
                                    {app.url ? (
                                        <a href={app.url} target={"_blank"} rel={"noreferrer noopener"}
                                           className={"inline-flex items-center gap-1 text-[14px] font-medium leading-snug hover:underline"}>
                                            <span className={"line-clamp-2"}>{app.title ?? "Untitled role"}</span>
                                            <ArrowUpRightIcon className={"size-3 shrink-0 text-muted-foreground"} />
                                        </a>
                                    ) : <span className={"line-clamp-2 text-[14px] font-medium leading-snug"}>{app.title ?? "Untitled role"}</span>}
                                    {app.company && <p className={"truncate text-[12.5px] text-muted-foreground"}>{app.company}</p>}
                                </div>
                                <StatusDisclosure app={app} />
                            </div>
                            <div className={"flex min-w-0 items-center gap-2 font-mono text-[10.5px] text-muted-foreground"}>
                                {app.status !== "saved" && <AppliedDatePicker app={app} className={"shrink-0"} />}
                                {meta && <span className={"truncate"}>{meta}</span>}
                                {app.match_score != null && <ScoreChip value={app.match_score} className={"ml-auto shrink-0 px-1.5 py-0 text-[10px]"} />}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
