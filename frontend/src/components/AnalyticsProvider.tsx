'use client'

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {useSession} from "next-auth/react";

import {forgetUser, identifyUser, initAnalytics, Page, track, trackPageview} from "@/lib/analytics";

/**
 * Starts analytics (a no-op without a key), sends a pageview per route
 * (the path only), and ties a signed-in user to a hashed id. Renders nothing.
 */
export default function AnalyticsProvider() {
    const pathname = usePathname();
    const {data: session, status} = useSession();
    const accountId = session?.user?.id;

    useEffect(() => { initAnalytics(); }, []);
    useEffect(() => { if (pathname) trackPageview(pathname); }, [pathname]);
    useEffect(() => {
        if (status === "authenticated" && accountId) void identifyUser(accountId);
        else if (status === "unauthenticated") forgetUser();
    }, [status, accountId]);
    return null;
}

/** One view_opened per page visit, and per Market view. */
export function useViewOpened(page: Page, view?: string) {
    useEffect(() => { track("view_opened", {page, view}); }, [page, view]);
}
