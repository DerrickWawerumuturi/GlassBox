import "server-only";

import postgres from "postgres";
import {cache} from "react";

/*
 * The weekly publication, read straight from the database for a server render
 * (GitHub issue #5, docs/decisions/market-publication.md). The API scales to
 * zero and a page rebuild that asked it for the count woke it; the count is
 * already stored, one row per week, in market_publications. The site reads
 * that row with a login that can only select from that table.
 *
 * The same row the API serves (backend publication_repository.LATEST): the
 * latest published one. The API sends its `look` and `pages` columns as they
 * are stored, so the bodies here are the API's bodies.
 *
 * Server only: the address is never NEXT_PUBLIC_ and `server-only` fails the
 * build if a client component imports this file.
 */

export const DB_ENV = "MARKET_DATABASE_URL";

export const LATEST = `select id, look, pages from market_publications where status = 'published'
order by published_at desc, id desc limit 1`;

export interface Publication {
    id: number;
    /** The /market/look body. */
    look: unknown;
    /** Every /market/page/{name} body, by name. */
    pages: Record<string, unknown>;
}

/** One query, its rows. The real one is postgres.js; tests pass their own. */
export type Query = (text: string) => Promise<ReadonlyArray<Record<string, unknown>>>;

type Env = {NODE_ENV?: string; NEXT_PHASE?: string; [name: string]: string | undefined};

export const building = (env: Env = process.env) => env.NEXT_PHASE === "phase-production-build";

/**
 * How long `next build` keeps asking. Neon suspends an idle database and wakes
 * it on the first query, in a second or two; past this the build fails, so
 * Vercel keeps the previous deployment live. Zero outside a build.
 */
export const BUILD_WAIT_MS = 30_000;
export const buildWait = (env: Env = process.env) => (building(env) ? BUILD_WAIT_MS : 0);
const RETRY_MS = 3_000;
const ATTEMPT_MS = 15_000;

let sql: postgres.Sql | null = null;

/** The database's answer to `text`, over one connection per server instance. */
function databaseQuery(text: string) {
    const url = process.env[DB_ENV]?.trim();
    if (!url) throw new Error(`${DB_ENV} is not set.`);
    // Neon's copied address ends in channel_binding=require, which postgres.js
    // would send to the server as a setting it doesn't know.
    const address = new URL(url);
    address.searchParams.delete("channel_binding");
    // prepare: false for Neon's pooled address (PgBouncer, transaction mode).
    sql ??= postgres(address.toString(), {max: 1, prepare: false, fetch_types: false, idle_timeout: 20, connect_timeout: 10});
    return sql.unsafe(text);
}

/** The latest publication, or null when nothing is published yet. One attempt. */
export async function latestPublication(query: Query = databaseQuery): Promise<Publication | null> {
    const [row] = await query(LATEST);
    if (!row) return null;
    return {id: Number(row.id), look: row.look, pages: (row.pages ?? {}) as Record<string, unknown>};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function timeout<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([work, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${ms / 1000} s`)), ms);
    })]).finally(() => clearTimeout(timer));
}

/**
 * The latest publication for a render. At build it asks again until `wait`
 * runs out, then throws: the build fails and the last deployment stays live.
 * Without the address at build it throws at once, saying so. Elsewhere one
 * attempt; a failure throws, and the caller decides (look-server.ts).
 */
export async function loadPublication(query: Query = databaseQuery, wait = buildWait(), env: Env = process.env,
                                      retryMs = RETRY_MS): Promise<Publication | null> {
    if (query === databaseQuery && !env[DB_ENV]?.trim()) {
        throw new Error(wait ? `${DB_ENV} is not set: failing the build so the last deployment stays live.`
            : `${DB_ENV} is not set.`);
    }
    const deadline = Date.now() + wait;
    let last: unknown;
    for (;;) {
        try {
            return await timeout(latestPublication(query), ATTEMPT_MS);
        } catch (err) {
            last = err;
        }
        if (Date.now() + retryMs >= deadline) break;
        await sleep(retryMs);
    }
    const why = last instanceof Error ? last.message : String(last);
    if (wait) throw new Error(`The publication didn't load in ${wait / 1000} s (${why}); failing the build so the last deployment stays live.`);
    throw new Error(`The publication didn't load (${why}).`);
}

/** One read per render: a page, its metadata and its rail share it (React cache). */
export const currentPublication = cache(() => loadPublication());
