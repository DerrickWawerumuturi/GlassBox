'use client'

import React, {useMemo, useRef, useState} from 'react'
import Link from "next/link";
import {toast} from "sonner";
import StatusDisclosure from "@/components/dashboard/StatusDisclosure";
import {
    ArrowUpRightIcon,
    BuildingIcon,
    CalendarIcon,
    CircleDashedIcon,
    ClockIcon,
    FileTextIcon,
    GaugeIcon,
    MapPinIcon,
    GlobeIcon,
    NotebookTextIcon,
    TypeIcon
} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApplicationRow} from "@/types/jobradar";
import {CLOSED, PIPELINE, STATUS_LABEL, useApplications} from "@/lib/applications-store";
import {ageLabel, timeAgo} from "@/lib/dashboard-data";
import {GRID_TD, GridTh, PageBar, ScoreChip, Toolbar, ViewChip} from "@/components/dashboard/bits";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import SourceBadge from "@/components/dashboard/SourceBadge";
import AddApplicationDialog from "@/components/dashboard/AddApplicationDialog";
import ImportApplicationsDialog from "@/components/dashboard/ImportApplicationsDialog";
import ApplicationSheet from "@/components/dashboard/ApplicationSheet";
import {ApplicationsSkeleton, CvSnapshot, RemoveCell, RowMeta, TrackJobMenu, workplaceLabel} from "@/components/dashboard/ApplicationParts";
import {DeleteButton} from "@/components/ui/delete-button";
import {Folder} from "@/components/ui/folder-component";
import {useViewOpened} from "@/components/AnalyticsProvider";

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0) || 0;

const VIEWS = [
    {id: "all", label: "All"},
    {id: "active", label: "Active"},
    {id: "closed", label: "Closed"}
] as const;
type ViewId = typeof VIEWS[number]["id"];

export default function ApplicationsPage() {
    useViewOpened("applications");
    const {apps, state, counts, refresh, removeMany, syncing} = useApplications();
    const [view, setView] = useState<ViewId>("all");

    // Several rows at once. A checkbox starts it on a computer; on a phone the
    // long-press sheet's "Select" does. While any row is selected, tapping a
    // row selects it instead of opening what is in it.
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const selecting = selected.size > 0;
    const toggle = (id: number) => setSelected((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
    });

    // Long-press on a row (touch only) opens the action sheet: the delete
    // column is hidden on phones, this is its mobile home.
    const [sheet, setSheet] = useState<ApplicationRow | null>(null);
    const pressTimer = useRef<number | null>(null);
    const longPressed = useRef(false);
    const startPress = (event: React.TouchEvent, app: ApplicationRow) => {
        // A touch that lands on a control belongs to it. The status menu renders
        // inside the row, so without this a slow tap on "Withdrawn" opened the
        // sheet and swallowed the tap instead of changing the status.
        if (selecting || (event.target as HTMLElement).closest("button, a, input, label, select")) return;
        longPressed.current = false;
        pressTimer.current = window.setTimeout(() => {
            pressTimer.current = null;
            longPressed.current = true;
            toast.dismiss();  // the last delete's toast would sit over this sheet's buttons
            setSheet(app);
        }, 450);
    };
    const cancelPress = () => {
        if (pressTimer.current != null) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };
    const endPress = (event: React.TouchEvent) => {
        // The finger lifting must not also open the link the sheet opened over.
        if (longPressed.current) event.preventDefault();
        cancelPress();
    };
    // Optimistic updates replace rows, so read the live one while open.
    const sheetApp = sheet ? apps.find((a) => a.id === sheet.id) ?? sheet : null;

    // Newest in JobRadar first — when it was added, not when it was applied to;
    // within one import, the sheet's own application dates decide.
    const visible = useMemo(() => [...apps]
        .filter((app) => view === "all"
            || (view === "closed") === CLOSED.includes(app.status))
        .sort((a, b) => time(b.added_at ?? b.last_status_at) - time(a.added_at ?? a.last_status_at)
            || time(b.applied_at) - time(a.applied_at) || b.id - a.id),
        [apps, view]);

    const closed = counts.rejected + counts.withdrawn;
    const allSelected = visible.length > 0 && visible.every((app) => selected.has(app.id));

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Applications"}
                meta={state === "ready"
                    ? `${apps.length} applications tracked · ${counts.interview} at interview${syncing ? " · syncing" : ""}`
                    : undefined}
            />

            {state === "signed-out" && (
                <div className={"px-4 py-8 sm:px-8"}>
                    <div className={"flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 px-6 py-14 text-center"}>
                        <p className={"text-sm text-muted-foreground"}>
                            Tracking lives with your account, so it follows you across devices.
                        </p>
                        <Link
                            href={"/sign-in"}
                            className={"rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90"}
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            )}

            {state === "error" && (
                <div className={"mx-4 mt-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm sm:mx-8"}>
                    <span>Couldn&apos;t load your applications.</span>
                    <button onClick={() => refresh()} className={"font-mono text-xs uppercase tracking-[0.1em] text-primary hover:underline"}>
                        Retry
                    </button>
                </div>
            )}

            {(state === "ready" || state === "loading") && (
                <>
                    <Toolbar>
                        <div className={"flex gap-1.5"} role={"tablist"} aria-label={"Filter applications"}>
                            {VIEWS.map((v) => (
                                <ViewChip
                                    key={v.id}
                                    active={view === v.id}
                                    onClick={() => { setView(v.id); setSelected(new Set()); }}
                                    count={v.id === "all" ? apps.length : v.id === "closed" ? closed : apps.length - closed}
                                >
                                    {v.label}
                                </ViewChip>
                            ))}
                        </div>
                        <div className={"ml-auto flex items-center gap-4"}>
                            {[...PIPELINE.map((status) => ({label: STATUS_LABEL[status], n: counts[status]})),
                                {label: "Closed", n: closed}].map((cell) => (
                                <span key={cell.label} className={"hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground md:inline"}>
                                    <b className={"mr-1 text-[12px] font-bold tabular-nums text-foreground"}>{cell.n}</b>{cell.label}
                                </span>
                            ))}
                            <ImportApplicationsDialog />
                            <AddApplicationDialog />
                        </div>
                    </Toolbar>

                    {visible.length > 0 ? (
                        <div className={"flex-1 overflow-x-auto"}>
                            {/* Fixed on phones: the status column gets what its chip needs and the role
                                column the rest, so both fit the screen and long lines truncate. */}
                            <table className={"w-full border-collapse max-sm:table-fixed"}>
                                <thead>
                                    <tr>
                                        <GridTh className={cn("w-9 pl-4 sm:pl-5", !selecting && "max-sm:hidden")}>
                                            <input
                                                type={"checkbox"}
                                                aria-label={"Select every application in this view"}
                                                checked={allSelected}
                                                ref={(box) => { if (box) box.indeterminate = selecting && !allSelected; }}
                                                onChange={() => setSelected(allSelected ? new Set()
                                                    : new Set(visible.filter((app) => app.id > 0).map((app) => app.id)))}
                                                className={"accent-primary"}
                                            />
                                        </GridTh>
                                        <GridTh icon={TypeIcon} className={cn("sm:min-w-36 md:min-w-44", !selecting && "max-sm:border-l-0 max-sm:pl-4")}>Role</GridTh>
                                        <GridTh icon={BuildingIcon} className={"hidden min-w-32 md:table-cell"}>Company</GridTh>
                                        <GridTh icon={GaugeIcon} className={"hidden sm:table-cell"}>Match</GridTh>
                                        <GridTh icon={MapPinIcon} className={"hidden lg:table-cell"}>Location</GridTh>
                                        <GridTh icon={GlobeIcon} className={"hidden md:table-cell"}>Source</GridTh>
                                        <GridTh icon={CircleDashedIcon} className={"max-sm:w-32 max-sm:px-2"}>Status</GridTh>
                                        <GridTh icon={FileTextIcon} className={"hidden md:table-cell"}>CV</GridTh>
                                        <GridTh icon={CalendarIcon} className={"hidden xl:table-cell"}>Applied</GridTh>
                                        <GridTh icon={ClockIcon} className={"hidden sm:table-cell"}>Added</GridTh>
                                        <GridTh className={"hidden w-16 sm:table-cell"} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((app) => (
                                        <tr
                                            key={app.id}
                                            onTouchStart={(event) => startPress(event, app)}
                                            onTouchEnd={endPress}
                                            onTouchMove={cancelPress}
                                            // A long press is ours, not the browser's copy menu or link preview.
                                            onContextMenu={(event) => {
                                                if (pressTimer.current != null || longPressed.current) event.preventDefault();
                                            }}
                                            onClickCapture={selecting ? (event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                if (app.id > 0) toggle(app.id);
                                            } : undefined}
                                            className={cn(
                                                "transition-colors hover:bg-foreground/3 [-webkit-touch-callout:none] max-sm:select-none",
                                                // Closed rows read quieter, but their controls stay legible:
                                                // fading the whole row dimmed the status menu the user had just used.
                                                CLOSED.includes(app.status) && "text-muted-foreground",
                                                selected.has(app.id) && "bg-primary/8 hover:bg-primary/10"
                                            )}>
                                            <td className={cn(GRID_TD, "w-9 pl-4 sm:pl-5", !selecting && "max-sm:hidden")}>
                                                <input
                                                    type={"checkbox"}
                                                    aria-label={`Select ${app.title ?? "application"}`}
                                                    checked={selected.has(app.id)}
                                                    disabled={app.id < 0}
                                                    onChange={() => toggle(app.id)}
                                                    className={"accent-primary"}
                                                />
                                            </td>
                                            <td className={cn(GRID_TD, !selecting && "max-sm:border-l-0 max-sm:pl-4")}>
                                                {app.url ? (
                                                    <a
                                                        href={app.url}
                                                        target={"_blank"}
                                                        rel={"noreferrer noopener"}
                                                        className={"group inline-flex items-center gap-1 font-medium hover:underline"}
                                                    >
                                                        {app.title ?? "Untitled role"}
                                                        <ArrowUpRightIcon className={"size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"} />
                                                    </a>
                                                ) : (
                                                    <span className={"font-medium"}>{app.title ?? "Untitled role"}</span>
                                                )}
                                                {app.notes && (
                                                    <NotebookTextIcon aria-label={"Has notes"} className={"ml-1.5 inline size-3 text-muted-foreground"}>
                                                        <title>{app.notes}</title>
                                                    </NotebookTextIcon>
                                                )}
                                                {app.company && (
                                                    <span className={"mt-0.5 hidden truncate font-mono text-[10.5px] text-muted-foreground sm:block md:hidden"}>
                                                        {app.company}
                                                    </span>
                                                )}
                                                <RowMeta app={app} />
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                {app.company ? (
                                                    <span className={"inline-flex items-center gap-2"}>
                                                        <CompanyLogo company={app.company} url={app.url} />
                                                        <span className={"truncate text-[12.5px]"}>{app.company}</span>
                                                    </span>
                                                ) : <span className={"text-muted-foreground/50"}>—</span>}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden sm:table-cell")}><ScoreChip value={app.match_score} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground lg:table-cell")}>
                                                {workplaceLabel(app)}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                <SourceBadge url={app.url} provider={app.provider} source={app.source} />
                                            </td>
                                            <td className={cn(GRID_TD, "max-sm:px-2")}><StatusDisclosure app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}><CvSnapshot app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground xl:table-cell")}>
                                                {app.status !== "saved" && app.applied_at
                                                    ? new Date(app.applied_at).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})
                                                    : app.status !== "saved" ? <span title={"No application date was given"}>unknown</span> : "—"}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground sm:table-cell")}
                                                title={`Status last changed ${timeAgo(app.last_status_at)}`}>
                                                {ageLabel(app.added_at ?? app.last_status_at)}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden py-1 sm:table-cell")}><RemoveCell app={app} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <TrackJobMenu />
                        </div>
                    ) : state === "loading" ? (
                        <ApplicationsSkeleton />
                    ) : (
                        <div className={"px-4 py-8 sm:px-8"}>
                            <div className={"flex flex-col items-center gap-4 rounded-lg border border-border bg-card/50 px-6 py-12 text-center"}>
                                <Folder color={"orange"} size={"sm"} aria-hidden />
                                <p className={"text-sm text-muted-foreground"}>
                                    {view === "all" ? "Your applications folder is empty." : "Nothing in this view."}
                                </p>
                                <Link href={"/dashboard/opportunities"} className={"text-sm text-primary hover:underline"}>
                                    Save a job in Opportunities → it lands here
                                </Link>
                            </div>
                        </div>
                    )}

                    <p aria-hidden className={"hidden -rotate-1 px-5 py-3 font-hand text-lg text-primary/70 sm:block"}>
                        click a status to move it along → later this feeds interview rates, response times, what&apos;s working
                    </p>
                </>
            )}

            {selecting && (
                <div className={"sticky bottom-0 z-30 mt-auto flex items-center gap-4 border-t border-input bg-popover px-4 py-2 sm:px-5"}>
                    <span className={"font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"}>
                        <b className={"mr-1 text-[13px] font-bold tabular-nums text-foreground"}>{selected.size}</b>selected
                    </span>
                    <button
                        type={"button"}
                        onClick={() => setSelected(new Set())}
                        className={"font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"}
                    >
                        Cancel
                    </button>
                    <DeleteButton
                        className={"ml-auto"}
                        onConfirm={() => {
                            removeMany(apps.filter((app) => selected.has(app.id)));
                            setSelected(new Set());
                        }}
                    />
                </div>
            )}

            <ApplicationSheet
                app={sheetApp}
                onClose={() => setSheet(null)}
                onSelect={(app) => {
                    setSheet(null);
                    if (app.id > 0) setSelected(new Set([app.id]));
                }}
            />
        </div>
    )
}
