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
 * this only fetches. Same shape as the applications store — paint the last
 * list from localStorage at once (the API can take ~30s to wake), then
 * reconcile — and it refetches when the CV changes, so an edit shows at once.
 */

export type OpportunitiesState = "signed-out" | "loading" | "ready" | "no-cv" | "error";

interface OpportunitiesContextValue {
    data: OpportunitiesResponse | null;
    rows: OpportunityRow[];
    state: OpportunitiesState;
    /** Showing cached rows while the server round-trip is in flight. */
    syncing: boolean;
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
    const [state, setState] = useState<OpportunitiesState>("loading");
    const [syncing, setSyncing] = useState(false);
    const request = useRef(0);

    const refresh = useCallback(async () => {
        const id = ++request.current;
        setSyncing(true);
        try {
            const next = await GetOpportunities();
            if (id !== request.current) return;
            setData(next);
            setState("ready");
            if (userId) try { localStorage.setItem(cacheKey(userId), JSON.stringify(next)) } catch {}
        } catch (err) {
            if (id !== request.current) return;
            if (err instanceof ApiError && err.status === 404) {
                // No CV yet: nothing to match, and nothing stale to show.
                setData(null);
                setState("no-cv");
                if (userId) try { localStorage.removeItem(cacheKey(userId)) } catch {}
            } else {
                console.error("Loading opportunities failed:", err);
                setState((prev) => prev === "ready" ? prev : "error");
            }
        } finally {
            if (id === request.current) setSyncing(false);
        }
    }, [userId]);

    useEffect(() => {
        if (authStatus === "unauthenticated") setState("signed-out");
        if (authStatus !== "authenticated" || !userId) return;
        const cached = readCache(userId);
        if (cached) {
            setData(cached);
            setState("ready");
        }
        void refresh();
    }, [authStatus, userId, refresh]);

    // A saved or edited CV changes every match; ask again (first load excluded).
    const firstCv = useRef(true);
    useEffect(() => {
        if (firstCv.current) {
            firstCv.current = false;
            return;
        }
        if (authStatus === "authenticated" && cv) void refresh();
    }, [cv, authStatus, refresh]);

    const rows = useMemo(() => (data?.opportunities ?? []).map(toRow), [data]);

    const value = useMemo<OpportunitiesContextValue>(
        () => ({data, rows, state, syncing, refresh}),
        [data, rows, state, syncing, refresh]
    );
    return <OpportunitiesContext.Provider value={value}>{children}</OpportunitiesContext.Provider>;
}

export function useOpportunities(): OpportunitiesContextValue {
    const context = useContext(OpportunitiesContext);
    if (!context) throw new Error("useOpportunities must be used inside <OpportunitiesProvider>");
    return context;
}
