'use client'

import React, {createContext, useCallback, useContext, useMemo, useRef, useState, useEffect} from "react";
import {usePathname} from "next/navigation";
import {useSession} from "next-auth/react";
import { CvBreakdown } from "@/types/jobradar"
import {shouldSyncAccount} from "@/lib/account-sync";
import {GetCV, StoreCV} from "@/lib/api";

interface CvContextProps {
    cv: CvBreakdown | null
    saveCv: (cv: CvBreakdown) => void
    clear: () => void
}

const CVKEY = "cv-store";
const CvContext = createContext<CvContextProps | null>(null)

function readCached(): CvBreakdown | null {
    try {
        const raw = localStorage.getItem(CVKEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        try { localStorage.removeItem(CVKEY) } catch {}
        return null
    }
}


export default function CVProvider({children}: { children: React.ReactNode }) {
    const {status: authStatus} = useSession();
    const [cv, setCv] = useState<CvBreakdown | null>(null);
    const sync = shouldSyncAccount(authStatus, usePathname());
    const synced = useRef(false);

    // Local cache paints immediately — the server round-trip must
    // never leave the app looking empty while it's in flight.
    useEffect(() => {
        const cached = readCached()
        if (cached) setCv(cached)
    }, []);

    // The account's CV, once per page load, on the product's pages only (lib/account-sync.ts).
    useEffect(() => {
        if (!sync || synced.current) return
        synced.current = true
        let cancelled = false
        let done = false

        async function hydrate() {
            // undefined = request failed (keep the cache), null = server has none.
            const remote = await GetCV().catch(() => undefined)
            done = true
            if (cancelled) return
            const cached = readCached()
            if (remote) {
                setCv(remote)
                try { localStorage.setItem(CVKEY, JSON.stringify(remote)) } catch {}
            } else if (remote === null && cached) {
                // Signed in, server empty, local draft exists — migrate it up
                // so this account owns the CV from now on.
                StoreCV(cached).catch((error) => console.error("Migrating local CV failed:", error))
            }
        }

        hydrate()
        // Left before the answer came: the next product page asks again.
        return () => { cancelled = true; if (!done) synced.current = false }
    }, [sync]);

    const saveCv = useCallback((next: CvBreakdown) => {
        setCv(next)
        // The server save must never depend on localStorage cooperating.
        StoreCV(next).catch((error) => console.error("Error storing cv:", error))
        try {
            localStorage.setItem(CVKEY, JSON.stringify(next))
        } catch (error) {
            console.error("Error caching cv:", error)
        }
    }, [])

    const clear = useCallback(
        () => {
            setCv(null)
            localStorage.removeItem("cv-store")
        }, [])

    const value = useMemo<CvContextProps>(() =>
        ({cv, saveCv, clear})
    , [cv, saveCv, clear])

    return <CvContext.Provider value={value}>{children}</CvContext.Provider>
}

export function useCv() {
    const context = useContext(CvContext)

    if (!context) {
        throw new Error("useCv must be used within <CVProvider>")
    }

    return context;
}