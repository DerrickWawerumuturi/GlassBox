'use client'

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useSession} from "next-auth/react";

import {OpportunitiesResponse} from "@/types/jobradar";
import {ApiError, GetOpportunities} from "@/lib/api";
import {useCv} from "@/lib/cv-store";
import {OpportunityRow, toRow} from "@/lib/dashboard-data";

/*
 * The daily job pool matched to the saved CV. Nothing here waits for a scan:
 * the backend refreshes the pool every morning and matches it on request, so
 * this only fetches.
 *
 * The list is painted from localStorage at once (the API can take ~30s to
 * wake) and never swapped under the reader afterwards: jobs that arrive while
 * they read are announced, and shown when they ask. A CV edit is different —
 * every match changes, so that repaints.
 */

export type OpportunitiesState = "signed-out" | "loading" | "ready" | "no-cv" | "error";

/** Jobs fetched since the list was painted, waiting for the reader to ask for them. */
export interface Incoming {
    count: number;
    rows: OpportunityRow[];
}

// Enough to paint the first screen. The full list runs to hundreds of jobs, and
// a cache write over the browser's quota stores nothing at all.
const CACHED_ROWS = 40;

interface OpportunitiesContextValue {
    data: OpportunitiesResponse | null;
    rows: OpportunityRow[];
    state: OpportunitiesState;
    /** Showing cached rows while the server round-trip is in flight. */
    syncing: boolean;
    /** Fetched jobs the list isn't showing yet, so the page can offer them. */
    incoming: Incoming | null;
    /** Show the announced jobs. */
    showIncoming: () => void;
    refresh: () => Promise<void>;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);
const cacheKey = (userId: string) => `opportunities:${userId}`;

/** Cached data outlives code: anything not of the current shape is dropped. */
function isOpportunities(value: unknown): value is OpportunitiesResponse {
    const candidate = value as OpportunitiesResponse | null;
    return Boolean(candidate?.counts && Array.isArray(candidate.opportunities)
        && (candidate.opportunities.length === 0 || candidate.opportunities[0]?.match?.reasons));
}

function readCache(userId: string): OpportunitiesResponse | null {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(cacheKey(userId)) ?? "null");
        return isOpportunities(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function OpportunitiesProvider({children}: { children: React.ReactNode }) {
    const {status: authStatus, data: session} = useSession();
    const userId = session?.user?.id ?? null;
    const {cv} = useCv();
    const [data, setData] = useState<OpportunitiesResponse | null>(null);
    const [fetched, setFetched] = useState<OpportunitiesResponse | null>(null);
    const [state, setState] = useState<OpportunitiesState>("loading");
    const [syncing, setSyncing] = useState(false);
    const request = useRef(0);
    // What the page is painting, readable inside load() without re-creating it.
    const showing = useRef<OpportunitiesResponse | null>(null);

    const paint = useCallback((next: OpportunitiesResponse | null) => {
        showing.current = next;
        setData(next);
        setFetched(null);
    }, []);

    const cache = useCallback((next: OpportunitiesResponse) => {
        if (!userId) return;
        try {
            localStorage.setItem(cacheKey(userId),
                JSON.stringify({...next, opportunities: next.opportunities.slice(0, CACHED_ROWS)}));
        } catch (err) {
            // Over quota: drop the stale copy rather than leave one that never updates.
            console.error("Could not cache opportunities:", err);
            try { localStorage.removeItem(cacheKey(userId)) } catch {}
        }
    }, [userId]);

    /** `announce`: leave the list alone and offer what arrived, instead of swapping it. */
    const load = useCallback(async (announce: boolean) => {
        const id = ++request.current;
        setSyncing(true);
        try {
            const next = await GetOpportunities();
            if (id !== request.current) return;
            const known = new Set((showing.current?.opportunities ?? []).map((job) => job.job_id));
            const isNew = next.opportunities.some((job) => !known.has(job.job_id));
            if (announce && showing.current && isNew) setFetched(next);
            else paint(next);
            setState("ready");
            cache(next);
        } catch (err) {
            if (id !== request.current) return;
            if (err instanceof ApiError && err.status === 404) {
                // No CV yet: nothing to match, and nothing stale to show.
                paint(null);
                setState("no-cv");
                if (userId) try { localStorage.removeItem(cacheKey(userId)) } catch {}
            } else {
                console.error("Loading opportunities failed:", err);
                setState((prev) => prev === "ready" ? prev : "error");
            }
        } finally {
            if (id === request.current) setSyncing(false);
        }
    }, [userId, paint, cache]);

    /** An explicit ask (retry, a finished scan) replaces the list; it is never a surprise. */
    const refresh = useCallback(() => load(false), [load]);

    useEffect(() => {
        if (authStatus === "unauthenticated") setState("signed-out");
        if (authStatus !== "authenticated" || !userId) return;
        const cached = readCache(userId);
        if (cached) {
            paint(cached);
            setState("ready");
        }
        void load(true);
    }, [authStatus, userId, load, paint]);

    // A saved or edited CV changes every match; ask again (first load excluded).
    const firstCv = useRef(true);
    useEffect(() => {
        if (firstCv.current) {
            firstCv.current = false;
            return;
        }
        if (authStatus === "authenticated" && cv) void refresh();
    }, [cv, authStatus, refresh]);

    const incoming = useMemo<Incoming | null>(() => {
        if (!fetched) return null;
        const known = new Set((data?.opportunities ?? []).map((job) => job.job_id));
        const rows = fetched.opportunities.filter((job) => !known.has(job.job_id)).map(toRow);
        return rows.length > 0 ? {count: rows.length, rows} : null;
    }, [fetched, data]);

    const showIncoming = useCallback(() => {
        if (fetched) paint(fetched);
    }, [fetched, paint]);

    const rows = useMemo(() => (data?.opportunities ?? []).map(toRow), [data]);

    const value = useMemo<OpportunitiesContextValue>(
        () => ({data, rows, state, syncing, incoming, showIncoming, refresh}),
        [data, rows, state, syncing, incoming, showIncoming, refresh]
    );
    return <OpportunitiesContext.Provider value={value}>{children}</OpportunitiesContext.Provider>;
}

export function useOpportunities(): OpportunitiesContextValue {
    const context = useContext(OpportunitiesContext);
    if (!context) throw new Error("useOpportunities must be used inside <OpportunitiesProvider>");
    return context;
}
