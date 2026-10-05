'use client'

import {useCallback, useEffect, useState} from "react";
import {useSession} from "next-auth/react";

import {ApiError, GetLatestCV, LatestCV} from "@/lib/api";

/*
 * The skills kept from the user's latest CV (decisions/cv-storage.md): never
 * the file, never the text. Signed-in users only. The new-scan pop-up offers
 * a rescan from them; the profile shows them and can delete them.
 */

export const PRIVACY_LINE = "We keep the skills read from your latest CV, not the file. Delete them any time from your profile.";

/** "read on 5 Oct", or with the year when it isn't this year. */
export function readOnLabel(iso: string, now = new Date()): string {
    const date = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {day: "numeric", month: "short", timeZone: "UTC"};
    if (date.getUTCFullYear() !== now.getUTCFullYear()) opts.year = "numeric";
    return `read on ${date.toLocaleDateString("en-GB", opts)}`;
}

export const skillsLabel = (n: number) => `${n} ${n === 1 ? "skill" : "skills"}`;

/** What a failed rescan tells the user. 409: an older parser read it; 404: nothing kept any more. */
export function reuseError(error: unknown): string {
    if (error instanceof ApiError && error.status === 409) return "We've updated how CVs are read. Upload it again.";
    if (error instanceof ApiError && error.status === 404) return "Your saved skills are gone. Upload your CV.";
    return error instanceof Error ? error.message : "Scan failed. Try again.";
}

/** The kept CV for the signed-in user; null when signed out or nothing is kept. */
export function useLatestCV() {
    const {status} = useSession();
    const [latest, setLatest] = useState<LatestCV | null>(null);
    const [loaded, setLoaded] = useState(false);
    const load = useCallback(async () => {
        try {
            setLatest(await GetLatestCV());
        } catch (e) {
            // A failed read only hides the offer; the upload still works.
            console.error("Saved CV read failed:", e);
            setLatest(null);
        } finally {
            setLoaded(true);
        }
    }, []);
    useEffect(() => {
        if (status === "authenticated") void load();
        else if (status === "unauthenticated") { setLatest(null); setLoaded(true); }
    }, [status, load]);
    return {latest, loaded, signedIn: status === "authenticated", reload: load, forget: () => setLatest(null)};
}
