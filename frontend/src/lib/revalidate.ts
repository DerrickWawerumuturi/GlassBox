import {createHash, timingSafeEqual} from "node:crypto";
import {revalidatePath} from "next/cache";

import {lookForPage} from "@/lib/landing/look-server";
import {MARKET_NAMES, YEARS_PATH} from "@/lib/market-names";
import {loadPublication} from "@/lib/published";

/*
 * POST /api/revalidate: the weekly publication job asks the site to drop its
 * cached market pages, so the new week shows at once (GitHub issue #1,
 * backend src/jobpool/refresh_site.py). ISR alone rebuilt them only on a
 * visit, and a visit's rebuild timed out on the sleeping API: on 12 Oct 2026
 * the 5 October week stayed up for 11 hours.
 *
 * revalidatePath expires each page's HTML; the next visit rebuilds it from
 * the database (lib/published.ts), and the job opens each page right after.
 * Public pages have no timer (`revalidate = false`), so this and a deploy are
 * the only rebuilds (GitHub issue #5). Only the job knows REVALIDATE_SECRET.
 *
 * revalidatePath expires a page at once: the next visit renders it, and a
 * render that can't read the publication answers 500 (measured with next
 * start). So the pages are dropped only after this server has read the new
 * publication itself; if it can't, they all stay as they are and the job warns.
 */

/** Every page that shows the published market. The /market layout covers both share images. */
export const MARKET_PATHS = ["/", "/about", "/product", "/market", ...MARKET_NAMES.map((name) => `/market/${name}`), YEARS_PATH];

export const SITEMAP_PATH = "/sitemap.xml";

const MAX_HEADER = 512;
/** The job calls once a week; a few retries fit, guessing doesn't. Per server instance. */
export const LIMIT = {calls: 10, perMs: 60_000};
let recent: number[] = [];

/** Same length digests, so the comparison takes the same time whatever was sent. */
const digest = (text: string) => createHash("sha256").update(text).digest();

export function authorized(header: string | null, secret: string): boolean {
    if (!header || header.length > MAX_HEADER || !header.startsWith("Bearer ")) return false;
    return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}

/** Whether this server can read a publication with a count now: what the rebuilt pages will read. */
export async function publicationReadable(): Promise<boolean> {
    try {
        return (await lookForPage(() => loadPublication(), false, false)) !== null;
    } catch {
        return false;
    }
}

/** Answers the request; the body is never read. `now`, `revalidate` and `readable` are for tests. */
export async function handleRevalidate(request: Request, secret = process.env.REVALIDATE_SECRET?.trim() ?? "",
                                       now = Date.now(), revalidate: typeof revalidatePath = revalidatePath,
                                       readable = publicationReadable): Promise<Response> {
    recent = recent.filter((at) => now - at < LIMIT.perMs);
    if (recent.length >= LIMIT.calls) return Response.json({error: "too many requests"}, {status: 429});
    recent.push(now);
    if (!secret) return Response.json({error: "revalidation is not configured"}, {status: 503});
    if (!authorized(request.headers.get("authorization"), secret)) {
        return Response.json({error: "unauthorized"}, {status: 401});
    }
    if (!await readable()) {
        return Response.json({error: "the publication can't be read; every page kept"}, {status: 503});
    }
    for (const path of MARKET_PATHS) revalidate(path);
    // The /market layout: every page under it, so the share images, and each past week, whose list gains the new week (#16).
    revalidate("/market", "layout");
    // Its lastmod is the week's; nobody opens it after, and a crawler's visit rebuilds it from the new row.
    revalidate(SITEMAP_PATH);
    return Response.json({revalidated: MARKET_PATHS});
}

/** Tests only: forget the calls counted so far. */
export const resetLimit = () => { recent = []; };
