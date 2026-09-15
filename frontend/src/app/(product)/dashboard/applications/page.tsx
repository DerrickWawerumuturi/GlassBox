'use client'

import React, {useMemo, useRef, useState} from 'react'
import Link from "next/link";
import {AnimatePresence, motion} from "motion/react";
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
    TypeIcon
} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApplicationRow} from "@/types/jobradar";
import {CLOSED, PIPELINE, STATUS_LABEL, useApplications} from "@/lib/applications-store";
import {timeAgo} from "@/lib/dashboard-data";
import {GRID_TD, GridTh, PageBar, ScoreChip, Toolbar, ViewChip} from "@/components/dashboard/bits";
import CompanyLogo from "@/components/dashboard/CompanyLogo";
import SourceBadge from "@/components/dashboard/SourceBadge";
import AddApplicationDialog from "@/components/dashboard/AddApplicationDialog";
import {ApplicationsSkeleton, CvSnapshot, RemoveCell, TrackJobMenu, workplaceLabel} from "@/components/dashboard/ApplicationParts";
import {DeleteButton} from "@/components/ui/delete-button";
import {Folder} from "@/components/ui/folder-component";

const VIEWS = [
    {id: "all", label: "All"},
    {id: "active", label: "Active"},
    {id: "closed", label: "Closed"}
] as const;
type ViewId = typeof VIEWS[number]["id"];

export default function ApplicationsPage() {
    const {apps, state, counts, refresh, remove, syncing} = useApplications();
    const [view, setView] = useState<ViewId>("all");

    // Long-press on a row (touch only) opens the action sheet — the delete
    // column is hidden on phones, this is its mobile home.
    const [sheet, setSheet] = useState<ApplicationRow | null>(null);
    const pressTimer = useRef<number | null>(null);
    const startPress = (app: ApplicationRow) => {
        pressTimer.current = window.setTimeout(() => setSheet(app), 450);
    };
    const cancelPress = () => {
        if (pressTimer.current != null) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };
    // Optimistic updates replace rows, so read the live one while open.
    const sheetApp = sheet ? apps.find((a) => a.id === sheet.id) ?? sheet : null;

    const visible = useMemo(() => [...apps]
        .filter((app) => view === "all"
            || (view === "closed") === CLOSED.includes(app.status))
        .sort((a, b) => new Date(b.last_status_at).getTime() - new Date(a.last_status_at).getTime()),
        [apps, view]);

    const closed = counts.rejected + counts.withdrawn;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Applications"}
                meta={state === "ready"
                    ? `${apps.length} tracked · ${counts.interview} in interview${syncing ? " · syncing" : ""}`
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
                                    onClick={() => setView(v.id)}
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
                            <AddApplicationDialog />
                        </div>
                    </Toolbar>

                    {visible.length > 0 ? (
                        <div className={"flex-1 overflow-x-auto"}>
                            <table className={"w-full border-collapse"}>
                                <thead>
                                    <tr>
                                        <GridTh icon={TypeIcon} className={"min-w-36 pl-4 sm:pl-5 md:min-w-44"}>Role</GridTh>
                                        <GridTh icon={BuildingIcon} className={"hidden min-w-32 md:table-cell"}>Company</GridTh>
                                        <GridTh icon={GaugeIcon}>Match</GridTh>
                                        <GridTh icon={MapPinIcon} className={"hidden lg:table-cell"}>Location</GridTh>
                                        <GridTh icon={GlobeIcon} className={"hidden md:table-cell"}>Source</GridTh>
                                        <GridTh icon={CircleDashedIcon}>Status</GridTh>
                                        <GridTh icon={FileTextIcon} className={"hidden md:table-cell"}>CV</GridTh>
                                        <GridTh icon={CalendarIcon} className={"hidden xl:table-cell"}>First moved</GridTh>
                                        <GridTh icon={ClockIcon} className={"hidden sm:table-cell"}>Updated</GridTh>
                                        <GridTh className={"hidden w-16 sm:table-cell"} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((app) => (
                                        <tr
                                            key={app.id}
                                            onTouchStart={() => startPress(app)}
                                            onTouchEnd={cancelPress}
                                            onTouchMove={cancelPress}
                                            className={cn(
                                                "transition-colors hover:bg-foreground/3",
                                                CLOSED.includes(app.status) && "opacity-55"
                                            )}>
                                            <td className={cn(GRID_TD, "pl-4 sm:pl-5")}>
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
                                                {app.company && (
                                                    <span className={"mt-0.5 block truncate font-mono text-[10.5px] text-muted-foreground md:hidden"}>
                                                        {app.company}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                {app.company ? (
                                                    <span className={"inline-flex items-center gap-2"}>
                                                        <CompanyLogo company={app.company} url={app.url} />
                                                        <span className={"truncate text-[12.5px]"}>{app.company}</span>
                                                    </span>
                                                ) : <span className={"text-muted-foreground/50"}>—</span>}
                                            </td>
                                            <td className={GRID_TD}><ScoreChip value={app.match_score} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground lg:table-cell")}>
                                                {workplaceLabel(app)}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}>
                                                <SourceBadge url={app.url} provider={app.provider} />
                                            </td>
                                            <td className={GRID_TD}><StatusDisclosure app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden md:table-cell")}><CvSnapshot app={app} /></td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground xl:table-cell")}>
                                                {app.status !== "saved" && app.applied_at
                                                    ? new Date(app.applied_at).toLocaleDateString(undefined, {month: "short", day: "numeric"})
                                                    : "—"}
                                            </td>
                                            <td className={cn(GRID_TD, "hidden font-mono text-[11px] text-muted-foreground sm:table-cell")}>
                                                {timeAgo(app.last_status_at)}
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

            <AnimatePresence>
                {sheetApp && (
                    <>
                        <motion.div
                            key={"sheet-backdrop"}
                            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                            onClick={() => setSheet(null)}
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
                                    <span className={"block truncate font-medium"}>{sheetApp.title ?? "Untitled role"}</span>
                                    <span className={"block truncate font-mono text-[11px] text-muted-foreground"}>{sheetApp.company ?? "—"}</span>
                                </span>
                                <ScoreChip value={sheetApp.match_score} />
                            </div>
                            <div className={"flex items-center gap-3"}>
                                <span className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>Status</span>
                                <StatusDisclosure app={sheetApp} />
                            </div>
                            <div className={"flex items-center gap-3 border-t border-border pt-4"}>
                                {sheetApp.url && (
                                    <a
                                        href={sheetApp.url}
                                        target={"_blank"}
                                        rel={"noreferrer noopener"}
                                        className={"inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink"}
                                    >
                                        View job <ArrowUpRightIcon className={"size-3"} />
                                    </a>
                                )}
                                <DeleteButton
                                    className={"ml-auto"}
                                    onConfirm={() => {
                                        const deletable = sheetApp.status === "saved" || CLOSED.includes(sheetApp.status);
                                        if (deletable) {
                                            remove(sheetApp);
                                            setSheet(null);
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
        </div>
    )
}
