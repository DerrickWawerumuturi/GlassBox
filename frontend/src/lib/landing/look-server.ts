import {API_BASE_URL} from "@/lib/api";
import {lookJobs, type Look} from "@/lib/landing/look";

/** How long the landing page's HTML keeps the count before Next asks again (ISR). */
export const LOOK_REVALIDATE_SECONDS = 300;

/**
 * What a render does when the count can't be had. In a running production
 * server a render is an ISR revalidation, and a page built at deploy is
 * already cached: throwing keeps that last good page and Next tries again on
 * the next request (docs/decisions/market-look.md). In dev every request
 * renders, so it falls back to the skeleton and the browser fetches the count.
 */
export function keepLastPage(env: {NODE_ENV?: string; NEXT_PHASE?: string} = process.env): boolean {
    return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

/**
 * How long `next build` waits for the API. The API scales to zero and takes
 * about 43 s to wake; 4 s at build used to prerender an empty /market, which
 * ISR then kept (docs/decisions/market-publication.md). Past this the build
 * fails, so Vercel keeps the previous deployment live. Zero outside a build.
 */
export const BUILD_WAIT_MS = 90_000;
export const buildWait = (env: {NODE_ENV?: string; NEXT_PHASE?: string} = process.env) =>
    (env.NEXT_PHASE === "phase-production-build" ? BUILD_WAIT_MS : 0);
const RETRY_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A published body (/market/look, /market/page/*) for a server render. The
 * API serves the latest weekly publication, so this is quick. When it isn't
 * there (a cold start, a 503, a timeout):
 * - at build, it tries again until `wait` runs out, then throws: the build
 *   fails and the last deployment stays live;
 * - in a revalidation (`keep`), it throws to keep the last good page;
 * - otherwise (dev) it returns nothing.
 * A body the API did send but `valid` refuses (0 jobs, no job types) is no
 * count: never rendered, and never waited for, since asking again gets the
 * same answer. It throws to keep the last page in a revalidation, else null.
 */
export async function builtForPage<T>(path: string, valid: (body: T) => boolean, timeoutMs = 4000,
                                      fetcher: typeof fetch = fetch, keep = keepLastPage(), wait = buildWait(),
                                      retryMs = RETRY_MS): Promise<T | null> {
    const deadline = Date.now() + wait;
    for (;;) {
        try {
            const response = await fetcher(`${API_BASE_URL}${path}`, {
                next: {revalidate: LOOK_REVALIDATE_SECONDS},
                // At build, long enough for a replica to wake: the attempt itself waits for it.
                signal: AbortSignal.timeout(wait ? Math.max(timeoutMs, Math.min(30_000, deadline - Date.now())) : timeoutMs),
            });
            if (response.ok) {
                const body = await response.json() as T;
                if (body && valid(body)) return body;
                if (keep) throw new Error(`${path} sent no count; keeping the last good page.`);
                return null;
            }
        } catch (err) {
            if (keep) throw err instanceof Error && err.message.includes("keeping the last good page") ? err
                : new Error(`${path} is unavailable; keeping the last good page.`);
        }
        if (Date.now() + retryMs >= deadline) break;
        await sleep(retryMs);
    }
    if (keep) throw new Error(`${path} is unavailable; keeping the last good page.`);
    if (wait) throw new Error(`${path} didn't answer in ${wait / 1000} s; failing the build so the last deployment stays live.`);
    return null;
}

/** A count of jobs that has any: a published body with no jobs is no count (an empty pool must never render). */
export const hasJobs = (n: unknown) => typeof n === "number" && n > 0;

/** This week's count for the server render, so the count, the cards and the wall are in the first HTML. */
export function lookForPage(timeoutMs = 4000, fetcher: typeof fetch = fetch, keep = keepLastPage(), wait = buildWait()): Promise<Look | null> {
    // A count with no job types, or no jobs in them, is no count at all.
    return builtForPage<Look>("/market/look", (body) => hasJobs(lookJobs(body)), timeoutMs, fetcher, keep, wait);
}
