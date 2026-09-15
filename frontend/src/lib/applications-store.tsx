'use client'

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useSession} from "next-auth/react";
import {toast} from "sonner";

import {ApplicationRow, ApplicationStatus} from "@/types/jobradar";
import {ApiError, CreateApplicationFromUrl, CreateManualApplication, DeleteApplication, ListApplications, ManualApplicationPayload, ToggleBookmark, TransitionApplication, UrlApplicationPayload} from "@/lib/api";
import {useCv} from "@/lib/cv-store";

export const PIPELINE: ApplicationStatus[] = ["saved", "applied", "screening", "interview", "offer"];
export const CLOSED: ApplicationStatus[] = ["rejected", "withdrawn"];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
    saved: "Saved",
    applied: "Applied",
    screening: "Screening",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Withdrawn"
};

export type ApplicationsState = "signed-out" | "loading" | "ready" | "error";

const cacheKey = (userId: string) => `applications:${userId}`;

function readCache(userId: string): ApplicationRow[] | null {
    try {
        const raw = localStorage.getItem(cacheKey(userId));
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed as ApplicationRow[] : null;
    } catch {
        return null;
    }
}

interface SaveTarget {
    jobId: number;
    role: string | null;
    company: string | null;
    /** 0-100. */
    match: number | null;
}

interface ApplicationsContextValue {
    apps: ApplicationRow[];
    state: ApplicationsState;
    /** Keyed by job_id, for correlating opportunity rows. */
    byJobId: Map<number, ApplicationRow>;
    counts: Record<ApplicationStatus, number>;
    /** job_ids with a save/remove in flight, gate re-clicks, not rendering. */
    pending: Set<number>;
    toggleSave: (job: SaveTarget) => void;
    /** Bookmarks every job not yet tracked; one toast. */
    saveMany: (jobs: SaveTarget[]) => void;
    markApplied: (job: SaveTarget) => void;
    /** An application made outside JobRadar, entered by hand. */
    addManual: (entry: ManualApplicationPayload) => void;
    /** A reviewed job link. */
    addFromUrl: (entry: UrlApplicationPayload) => void;
    /** Deletes a terminal row (saved, withdrawn, rejected) with its history. */
    remove: (app: ApplicationRow) => void;
    transition: (id: number, to: Exclude<ApplicationStatus, "saved">) => void;
    refresh: () => Promise<void>;
    /** The token was refused: this browser's session predates an app update. */
    staleSession: boolean;
    /** Showing cached rows while the server round-trip is still in flight. */
    syncing: boolean;
}

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

const nowIso = () => new Date().toISOString();

/*
 * Every mutation is optimistic: the list changes and toasts immediately, the
 * API call runs behind it, and refresh() reconciles afterwards, replacing
 * temp rows with real ids on success, or reverting the UI on failure.
 */
export function ApplicationsProvider({children}: { children: React.ReactNode }) {
    const {status: authStatus, data: session} = useSession();
    const userId = session?.user?.id ?? null;
    const {cv} = useCv();
    const [apps, setApps] = useState<ApplicationRow[]>([]);
    const [state, setState] = useState<ApplicationsState>("loading");
    const [pending, setPending] = useState<Set<number>>(new Set());
    const [staleSession, setStaleSession] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const refresh = useCallback(async () => {
        setSyncing(true);
        try {
            const rows = await ListApplications() ?? [];
            setApps(rows);
            setState("ready");
            setStaleSession(false);
            // Server rows only: optimistic temp rows never reach the cache.
            if (userId) try { localStorage.setItem(cacheKey(userId), JSON.stringify(rows)) } catch {}
        } catch (err) {
            console.error("Loading applications failed:", err);
            // Only the backend's stale-identity guard warrants the re-auth
            // banner; other 401s (server mid-restart, clock skew) must not
            // tell users to sign out.
            if (err instanceof ApiError && err.status === 401
                && err.message.includes("outdated app session")) setStaleSession(true);
            // Cached rows stay usable; only an empty tab needs the error state.
            setState((prev) => prev === "ready" ? prev : "error");
        } finally {
            setSyncing(false);
        }
    }, [userId]);

    useEffect(() => {
        if (authStatus === "authenticated" && userId) {
            // Paint the last known list immediately. The API scales to zero and
            // can take ~30s to answer; the tab must not wait on that.
            const cached = readCache(userId);
            if (cached) {
                setApps(cached);
                setState("ready");
            }
            void refresh();
        }
        if (authStatus === "unauthenticated") setState("signed-out");
    }, [authStatus, userId, refresh]);

    const markPending = useCallback((keys: number[], on: boolean) => setPending((prev) => {
        const next = new Set(prev);
        for (const key of keys) on ? next.add(key) : next.delete(key);
        return next;
    }), []);

    /** Runs the write in the background, then reconciles with the server. */
    const sync = useCallback(async (run: () => Promise<unknown>) => {
        try {
            await run();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong, reverting");
        } finally {
            await refresh();
        }
    }, [refresh]);

    const byJobId = useMemo(() => {
        const map = new Map<number, ApplicationRow>();
        for (const app of apps) if (app.job_id != null) map.set(app.job_id, app);
        return map;
    }, [apps]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(
            [...PIPELINE, ...CLOSED].map((s) => [s, 0])
        ) as Record<ApplicationStatus, number>;
        for (const app of apps) c[app.status] += 1;
        return c;
    }, [apps]);

    /** Placeholder until refresh() swaps in the server row; id < 0 marks it. */
    const tempRow = useCallback((job: SaveTarget, status: ApplicationStatus): ApplicationRow => ({
        id: -job.jobId,
        job_id: job.jobId,
        title: job.role,
        company: job.company,
        match_score: job.match,
        status,
        applied_at: status === "saved" ? null : nowIso(),
        last_status_at: nowIso(),
        cv_snapshot: cv
    }), [cv]);

    const bookmarkPayload = useCallback((job: SaveTarget) => ({
        job_id: job.jobId,
        title: job.role,
        company: job.company,
        match_score: job.match,
        cv_snapshot: cv
    }), [cv]);

    const toggleSave = useCallback((job: SaveTarget) => {
        if (pending.has(job.jobId)) return;
        const existing = byJobId.get(job.jobId);
        if (existing && existing.status !== "saved") return;

        if (existing) {
            setApps((prev) => prev.filter((app) => app.id !== existing.id));
            toast(`Removed ${job.role ?? "job"} from your pipeline`);
        } else {
            setApps((prev) => [tempRow(job, "saved"), ...prev]);
            toast(`Saved ${job.role ?? "job"}, it's in your pipeline now`);
        }
        markPending([job.jobId], true);
        void sync(() => ToggleBookmark(bookmarkPayload(job)))
            .finally(() => markPending([job.jobId], false));
    }, [pending, byJobId, tempRow, bookmarkPayload, markPending, sync]);

    const saveMany = useCallback((jobs: SaveTarget[]) => {
        const fresh = jobs.filter((job) => !byJobId.has(job.jobId) && !pending.has(job.jobId));
        if (fresh.length === 0) return;

        setApps((prev) => [...fresh.map((job) => tempRow(job, "saved")), ...prev]);
        toast(`Saved ${fresh.length} ${fresh.length === 1 ? "job" : "jobs"} to your pipeline`);
        markPending(fresh.map((job) => job.jobId), true);
        void sync(async () => {
            for (const job of fresh) await ToggleBookmark(bookmarkPayload(job));
        }).finally(() => markPending(fresh.map((job) => job.jobId), false));
    }, [byJobId, pending, tempRow, bookmarkPayload, markPending, sync]);

    const transition = useCallback((id: number, to: Exclude<ApplicationStatus, "saved">) => {
        setApps((prev) => prev.map((app) => app.id === id
            ? {...app, status: to, last_status_at: nowIso(), applied_at: app.applied_at ?? nowIso()}
            : app));
        toast(`Moved to ${STATUS_LABEL[to]}`);
        void sync(() => TransitionApplication(id, to));
    }, [sync]);

    const markApplied = useCallback((job: SaveTarget) => {
        const existing = byJobId.get(job.jobId);
        if (existing) {
            // Still settling from an optimistic save, the real id isn't known yet.
            if (existing.id < 0) return;
            transition(existing.id, "applied");
            return;
        }
        if (pending.has(job.jobId)) return;

        setApps((prev) => [tempRow(job, "applied"), ...prev]);
        toast(`Marked ${job.role ?? "job"} as applied`);
        markPending([job.jobId], true);
        void sync(async () => {
            const {application_id} = await ToggleBookmark(bookmarkPayload(job));
            if (application_id == null) throw new Error("Could not save this job first");
            await TransitionApplication(application_id, "applied");
        }).finally(() => markPending([job.jobId], false));
    }, [byJobId, pending, transition, tempRow, bookmarkPayload, markPending, sync]);

    const addManual = useCallback((entry: ManualApplicationPayload) => {
        const status = entry.status ?? "applied";
        setApps((prev) => [{
            id: -Date.now(),
            job_id: null,
            title: entry.title,
            company: entry.company ?? null,
            match_score: null,
            status,
            applied_at: status === "applied" ? nowIso() : null,
            last_status_at: nowIso(),
            cv_snapshot: cv,
            url: entry.url ?? null,
            location: entry.location ?? null,
            provider: null
        }, ...prev]);
        toast(`Added ${entry.title}`);
        void sync(() => CreateManualApplication({...entry, cv_snapshot: cv}));
    }, [cv, sync]);

    const addFromUrl = useCallback((entry: UrlApplicationPayload) => {
        const status = entry.status ?? "saved";
        setApps((prev) => [{
            id: -Date.now(),
            job_id: entry.job_id ?? null,
            title: entry.title,
            company: entry.company ?? null,
            match_score: null,
            status,
            applied_at: status === "applied" ? nowIso() : null,
            last_status_at: nowIso(),
            cv_snapshot: cv,
            url: entry.url,
            location: entry.location ?? null,
            remote: entry.workplace === "remote",
            workplace: entry.workplace ?? null,
            employment_type: entry.employment_type ?? null,
            salary: entry.salary ?? null,
            provider: entry.source ?? null
        }, ...prev]);
        toast(`Added ${entry.title}`);
        void sync(() => CreateApplicationFromUrl({...entry, cv_snapshot: cv}));
    }, [cv, sync]);

    const remove = useCallback((app: ApplicationRow) => {
        if (app.id < 0) return;
        setApps((prev) => prev.filter((row) => row.id !== app.id));
        toast(`Deleted ${app.title ?? "application"}`);
        void sync(() => DeleteApplication(app.id));
    }, [sync]);

    const value = useMemo<ApplicationsContextValue>(
        () => ({apps, state, byJobId, counts, pending, toggleSave, saveMany, markApplied, addManual, addFromUrl, remove, transition, refresh, staleSession, syncing}),
        [apps, state, byJobId, counts, pending, toggleSave, saveMany, markApplied, addManual, addFromUrl, remove, transition, refresh, staleSession, syncing]
    );

    return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}

export function useApplications(): ApplicationsContextValue {
    const context = useContext(ApplicationsContext);
    if (!context) throw new Error("useApplications must be used inside <ApplicationsProvider>");
    return context;
}
