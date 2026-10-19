'use client'

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {usePathname} from "next/navigation";
import {useSession} from "next-auth/react";
import {JobRadarAnalysis} from "@/types/jobradar";
import {shouldSyncAccount} from "@/lib/account-sync";
import {GetAnalysis, StoreAnalysis} from "@/lib/api";

const STORAGE_KEY = "jobradar";

export type AnalysisStatus = "idle" | "analyzing" | "ready" | "error";

interface AnalysisContextValue {
    analysis: JobRadarAnalysis | null;
    status: AnalysisStatus;
    /** False until localStorage has been read — routes must not redirect before this. */
    hydrated: boolean;
    fileName: string | null;
    save: (analysis: JobRadarAnalysis, fileName: string) => void;
    setStatus: (status: AnalysisStatus) => void;
    clear: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function isAnalysis(value: unknown): value is JobRadarAnalysis {
    const candidate = value as JobRadarAnalysis | null;
    return Boolean(
        candidate?.market?.skill_coverage && Array.isArray(candidate.ranked_jobs)
    );
}

/** This browser's copy of the scan. A response cached from an older backend shape would crash the dashboard on mount, so anything unrecognised is discarded. */
function readCached(): JobRadarAnalysis | null {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (!cached) return null;
        const parsed: unknown = JSON.parse(cached);
        if (isAnalysis(parsed)) return parsed;
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("Discarding unreadable cached analysis:", e);
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
    return null;
}

/**
 * Holds the analysis for the whole app. It lives here rather than in a page
 * component because every analysis route reads it, and a 5-minute analysis
 * must survive navigation between them.
 */
export function AnalysisProvider({children}: { children: React.ReactNode }) {
    const {status: authStatus} = useSession();
    const [analysis, setAnalysis] = useState<JobRadarAnalysis | null>(null);
    const [status, setStatus] = useState<AnalysisStatus>("idle");
    const [fileName, setFileName] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    // Set once a scan finishes in THIS tab, so the server fetch below never
    // overwrites a fresher local result with an older stored one.
    const localIsFresh = useRef(false);
    const sync = shouldSyncAccount(authStatus, usePathname());
    const synced = useRef(false);

    useEffect(() => {
        const local = readCached();
        if (local) {
            setAnalysis(local);
            setStatus("ready");
            setFileName(localStorage.getItem(`${STORAGE_KEY}:file`));
        }
        setHydrated(true);
    }, []);

    // The account's stored scan follows the user across browsers. Fetched once
    // per page load, on the product's pages only (lib/account-sync.ts).
    useEffect(() => {
        if (!sync || synced.current) return;
        synced.current = true;
        let cancelled = false;
        let done = false;
        void (async () => {
            const remote = await GetAnalysis().catch(() => undefined);
            done = true;
            if (cancelled || localIsFresh.current) return;
            const local = readCached();
            if (remote && isAnalysis(remote.data)) {
                setAnalysis(remote.data);
                setStatus("ready");
                setFileName(remote.file_name);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.data));
                    if (remote.file_name) localStorage.setItem(`${STORAGE_KEY}:file`, remote.file_name);
                } catch {}
            } else if (remote === null && local) {
                // Server has nothing, this browser does: migrate it up.
                StoreAnalysis(local, localStorage.getItem(`${STORAGE_KEY}:file`))
                    .catch((e) => console.error("Migrating local analysis failed:", e));
            }
        })();
        // Left before the answer came: the next product page asks again.
        return () => { cancelled = true; if (!done) synced.current = false };
    }, [sync]);

    const save = useCallback((next: JobRadarAnalysis, name: string) => {
        localIsFresh.current = true;
        setAnalysis(next);
        setFileName(name);
        setStatus("ready");
        if (authStatus === "authenticated") {
            StoreAnalysis(next, name).catch((e) => console.error("Could not store analysis:", e));
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            localStorage.setItem(`${STORAGE_KEY}:file`, name);
        } catch (e) {
            // Quota or private-mode failures must not lose the in-memory result.
            console.error("Could not cache analysis:", e);
        }
    }, [authStatus]);

    const clear = useCallback(() => {
        setAnalysis(null);
        setFileName(null);
        setStatus("idle");
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(`${STORAGE_KEY}:file`);
    }, []);

    const value = useMemo<AnalysisContextValue>(
        () => ({analysis, status, hydrated, fileName, save, setStatus, clear}),
        [analysis, status, hydrated, fileName, save, clear]
    );

    return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

/**
 * The example scan in place of the visitor's own, for /analysis before they
 * have one (lib/example-scan.json: real public jobs, a sample CV). Saving a
 * real scan still goes to the app's store, and replaces the example.
 */
export function ExampleAnalysisProvider({example, children}: {example: JobRadarAnalysis; children: React.ReactNode}) {
    const outer = useAnalysis();
    const value = useMemo<AnalysisContextValue>(
        () => ({...outer, analysis: example, hydrated: true, fileName: null}),
        [outer, example]
    );
    return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error("useAnalysis must be used inside <AnalysisProvider>");
    }
    return context;
}
