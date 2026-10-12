import "server-only";

import {lookJobs, type Look} from "@/lib/landing/look";
import {MARKET_NAMES, type MarketBody, type MarketName} from "@/lib/market-pages";
import {building, currentPublication, type Publication} from "@/lib/published";

/*
 * The published count for a server render, read from the database
 * (lib/published.ts), never from the API: a rebuild that asked the API woke
 * it, and it scales to zero (GitHub issues #4 and #5). Public pages have no
 * timer (`revalidate = false`); they are built at deploy and rebuilt when the
 * weekly publication calls /api/revalidate (lib/revalidate.ts).
 */

/**
 * What a render does when the count can't be had. In a running production
 * server a render is a revalidation, and the page built before it is cached:
 * throwing keeps that last good page and Next tries again on the next request
 * (docs/decisions/market-look.md). In dev every request renders, so it falls
 * back to the skeleton and the browser fetches the count.
 */
export function keepLastPage(env: {NODE_ENV?: string; NEXT_PHASE?: string} = process.env): boolean {
    return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

/**
 * A published body for a server render: `pick` takes it from the latest
 * publication. When the publication can't be read:
 * - in a revalidation (`keep`), it throws to keep the last good page;
 * - at build, it throws: the build fails and the last deployment stays live
 *   (published.ts has already asked again for a while);
 * - otherwise (dev) it returns nothing.
 * Nothing published at all is the same. A body the publication holds but
 * `valid` refuses (0 jobs, no job types) is no count: never rendered. It
 * throws to keep the last page in a revalidation, else null.
 */
export async function builtForPage<T>(what: string, pick: (p: Publication) => unknown, valid: (body: T) => boolean,
                                      load: () => Promise<Publication | null> = currentPublication,
                                      keep = keepLastPage(), build = building()): Promise<T | null> {
    let publication: Publication | null;
    try {
        publication = await load();
    } catch (err) {
        if (keep) throw new Error(`${what} is unavailable; keeping the last good page.`);
        if (build) throw err;
        return null;
    }
    if (!publication) {
        if (keep) throw new Error(`Nothing is published; keeping the last good page.`);
        if (build) throw new Error("Nothing is published in market_publications; failing the build so the last deployment stays live.");
        return null;
    }
    const body = pick(publication) as T | null | undefined;
    if (body && valid(body)) return body;
    if (keep) throw new Error(`${what} has no count; keeping the last good page.`);
    return null;
}

/** A count of jobs that has any: a published body with no jobs is no count (an empty pool must never render). */
export const hasJobs = (n: unknown) => typeof n === "number" && n > 0;

/** This week's count for the server render, so the count, the cards and the wall are in the first HTML. */
export function lookForPage(load?: () => Promise<Publication | null>, keep?: boolean, build?: boolean): Promise<Look | null> {
    // A count with no job types, or no jobs in them, is no count at all.
    return builtForPage<Look>("The count", (p) => p.look, (body) => hasJobs(lookJobs(body)), load, keep, build);
}

/** A page's counts for the server render; throws during a revalidation to keep the last good page. */
export function marketForPage(name: MarketName, keep?: boolean, load?: () => Promise<Publication | null>,
                              build?: boolean): Promise<MarketBody | null> {
    // No jobs is no count, never an empty page. A body with no story is from before the editorial pages.
    return builtForPage<MarketBody>(`The ${name} page`, (p) => p.pages[name],
        (body) => hasJobs(body.jobs) && Boolean(body.story?.squares), load, keep, build);
}

/** Every page's counts, for the hub and the rail. A page that can't be had is null; it never blocks the page asking. */
export async function allMarkets(keep = false, load?: () => Promise<Publication | null>,
                                 build?: boolean): Promise<Record<MarketName, MarketBody | null>> {
    const bodies = await Promise.all(MARKET_NAMES.map((name) => marketForPage(name, keep, load, build)));
    return Object.fromEntries(MARKET_NAMES.map((name, i) => [name, bodies[i]])) as Record<MarketName, MarketBody | null>;
}
