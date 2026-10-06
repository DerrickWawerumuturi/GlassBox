import {API_BASE_URL} from "@/lib/api";
import type {Look} from "@/lib/landing/look";

/** How long the landing page's HTML keeps today's count before Next asks again (ISR). */
export const LOOK_REVALIDATE_SECONDS = 300;

/**
 * Today's count for the server render, so the count, the cards and the wall
 * are in the first HTML. The API keeps it built (decisions/market-look.md), so
 * this is quick; when it isn't (a cold start, a 503 while it builds, a timeout)
 * the page renders its skeleton and the browser fetches it instead.
 */
export async function lookForPage(timeoutMs = 4000, fetcher: typeof fetch = fetch): Promise<Look | null> {
    try {
        const response = await fetcher(`${API_BASE_URL}/market/look`, {
            next: {revalidate: LOOK_REVALIDATE_SECONDS},
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) return null;
        const look = await response.json() as Look;
        return look?.families ? look : null;
    } catch {
        return null;
    }
}
