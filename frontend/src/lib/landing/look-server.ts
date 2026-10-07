import {API_BASE_URL} from "@/lib/api";
import type {Look} from "@/lib/landing/look";

/** How long the landing page's HTML keeps today's count before Next asks again (ISR). */
export const LOOK_REVALIDATE_SECONDS = 300;

/**
 * What a render does when today's count can't be had. In a running
 * production server a render is an ISR revalidation, and a page built at
 * deploy is already cached: throwing keeps that last good page and Next tries
 * again on the next request (docs/decisions/market-look.md). At build time
 * there is no page yet, and in dev every request renders, so those fall back
 * to the skeleton and the browser fetches the count instead.
 */
export function keepLastPage(env: {NODE_ENV?: string; NEXT_PHASE?: string} = process.env): boolean {
    return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

/**
 * Today's count for the server render, so the count, the cards and the wall
 * are in the first HTML. The API keeps it built (decisions/market-look.md), so
 * this is quick; when it isn't (a cold start, a 503 while it builds, a timeout)
 * a revalidation throws to keep the last good page, and a first render
 * returns nothing (keepLastPage).
 */
export async function lookForPage(timeoutMs = 4000, fetcher: typeof fetch = fetch, keep = keepLastPage()): Promise<Look | null> {
    let look: Look | null = null;
    try {
        const response = await fetcher(`${API_BASE_URL}/market/look`, {
            next: {revalidate: LOOK_REVALIDATE_SECONDS},
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) {
            const body = await response.json() as Look;
            if (body?.families) look = body;
        }
    } catch {
        look = null;
    }
    if (!look && keep) throw new Error("Today's count is unavailable; keeping the last good page.");
    return look;
}
