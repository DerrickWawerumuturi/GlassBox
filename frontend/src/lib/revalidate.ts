import {createHash, timingSafeEqual} from "node:crypto";
import {revalidatePath} from "next/cache";

import {MARKET_NAMES} from "@/lib/market-names";

/*
 * POST /api/revalidate: the weekly publication job asks the site to drop its
 * cached market pages, so the new week shows at once (GitHub issue #1,
 * backend src/jobpool/refresh_site.py). ISR alone rebuilt them only on a
 * visit, and a visit's rebuild timed out on the sleeping API: on 12 Oct 2026
 * the 5 October week stayed up for 11 hours.
 *
 * revalidatePath expires each page's HTML and, through the page's implicit
 * cache tags, the API fetches it made (next/cache docs, "What can be
 * invalidated"); the next visit rebuilds it. The job opens each page right
 * after, with the API awake. Only the job knows REVALIDATE_SECRET.
 */

/** Every page that shows the published market. The /market layout covers both share images. */
export const MARKET_PATHS = ["/", "/about", "/product", "/market", ...MARKET_NAMES.map((name) => `/market/${name}`)];

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

/** Answers the request; the body is never read. `now` and `revalidate` are for tests. */
export function handleRevalidate(request: Request, secret = process.env.REVALIDATE_SECRET?.trim() ?? "",
                                 now = Date.now(), revalidate: typeof revalidatePath = revalidatePath): Response {
    recent = recent.filter((at) => now - at < LIMIT.perMs);
    if (recent.length >= LIMIT.calls) return Response.json({error: "too many requests"}, {status: 429});
    recent.push(now);
    if (!secret) return Response.json({error: "revalidation is not configured"}, {status: 503});
    if (!authorized(request.headers.get("authorization"), secret)) {
        return Response.json({error: "unauthorized"}, {status: 401});
    }
    for (const path of MARKET_PATHS) revalidate(path);
    revalidate("/market", "layout");
    return Response.json({revalidated: MARKET_PATHS});
}

/** Tests only: forget the calls counted so far. */
export const resetLimit = () => { recent = []; };
