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
 * are stored, so the bodies here are the API's bodies. The past weeks
 * (GitHub issue #16) are read the same way: a list of weeks, and one page of
 * one week's row.
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

/** One query and its parameters, its rows. The real one is postgres.js; tests pass their own. */
export type Query = (text: string, params?: string[]) => Promise<ReadonlyArray<Record<string, unknown>>>;

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
function databaseQuery(text: string, params?: string[]) {
    const url = process.env[DB_ENV]?.trim();
    if (!url) throw new Error(`${DB_ENV} is not set.`);
    // Neon's copied address ends in channel_binding=require, which postgres.js
    // would send to the server as a setting it doesn't know.
    const address = new URL(url);
    address.searchParams.delete("channel_binding");
    // prepare: false for Neon's pooled address (PgBouncer, transaction mode).
    sql ??= postgres(address.toString(), {max: 1, prepare: false, fetch_types: false, idle_timeout: 20, connect_timeout: 10});
    return sql.unsafe(text, params);
}

/** The latest publication, or null when nothing is published yet. One attempt. */
export async function latestPublication(query: Query = databaseQuery): Promise<Publication | null> {
    const [row] = await query(LATEST);
    if (!row) return null;
    return {id: Number(row.id), look: row.look, pages: (row.pages ?? {}) as Record<string, unknown>};
}

/*
 * The weekly archive (GitHub issue #16, docs/decisions/market-pages.md, "Past
 * weeks"). A week can have more than one published row (12 Oct 2026 has
 * two); like LATEST, the latest published row of a week is that week's.
 */

/**
 * Every published week, newest first, each from its latest row. `current`: the
 * week of the row LATEST serves, the one the live pages show. `pages`: the jobs
 * of each page with a count, as marketForPage accepts one (jobs and a story),
 * so a week from before the editorial pages lists none. Only dates and numbers
 * leave the database, a few hundred bytes.
 */
export const WEEKS = `with latest as (
    select distinct on (week) week, pages from market_publications where status = 'published'
    order by week, published_at desc, id desc)
select to_char(week, 'YYYY-MM-DD') as week,
    week = (select week from market_publications where status = 'published' order by published_at desc, id desc limit 1) as current,
    (select coalesce(jsonb_object_agg(name, body -> 'jobs'), '{}'::jsonb) from jsonb_each(pages) as page(name, body)
        where jsonb_typeof(body -> 'jobs') = 'number' and body -> 'jobs' > '0'::jsonb
        and jsonb_typeof(body #> '{story,squares}') = 'object') as pages
from latest order by week desc`;

export interface PublishedWeek {
    /** The Monday, "2026-10-12". */
    week: string;
    current: boolean;
    /** Each page with a count that week: its jobs. */
    pages: Record<string, number>;
}

export async function publishedWeeks(query: Query = databaseQuery): Promise<PublishedWeek[]> {
    return (await query(WEEKS)).map((row) => ({
        week: String(row.week), current: row.current === true, pages: (row.pages ?? {}) as Record<string, number>,
    }));
}

/** A page's past weeks, newest first: the weeks before the live one where it has a count, with its jobs. */
export function pastWeeks(weeks: PublishedWeek[], name: string): Array<{week: string; jobs: number}> {
    const live = weeks.find((w) => w.current)?.week;
    if (!live) return [];
    return weeks.filter((w) => w.week < live && name in w.pages).map((w) => ({week: w.week, jobs: w.pages[name]}));
}

/** One week's latest published row, and from it one page's body only: about a fifth of the row. */
export const WEEK = `select id, to_char(week, 'YYYY-MM-DD') as week, pages -> $2::text as page from market_publications
where status = 'published' and week = $1::date order by published_at desc, id desc limit 1`;

/** One week as a publication holding one page, or null when the week has no published row. */
export async function weekPublication(week: string, name: string, query: Query = databaseQuery): Promise<Publication | null> {
    const [row] = await query(WEEK, [week, name]);
    if (!row) return null;
    // The address names the row's week; the body says the same, and a body from before publications says none.
    const page = row.page && typeof row.page === "object" ? {...row.page, week: String(row.week)} : row.page;
    return {id: Number(row.id), look: null, pages: {[name]: page}};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function timeout<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([work, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${ms / 1000} s`)), ms);
    })]).finally(() => clearTimeout(timer));
}

/**
 * A read for a render. At build it asks again until `wait` runs out, then
 * throws: the build fails and the last deployment stays live. Without the
 * address at build it throws at once, saying so. Elsewhere one attempt; a
 * failure throws, and the caller decides (look-server.ts).
 */
async function patiently<T>(what: string, read: () => Promise<T>, query: Query, wait: number, env: Env,
                            retryMs: number): Promise<T> {
    if (query === databaseQuery && !env[DB_ENV]?.trim()) {
        throw new Error(wait ? `${DB_ENV} is not set: failing the build so the last deployment stays live.`
            : `${DB_ENV} is not set.`);
    }
    const deadline = Date.now() + wait;
    let last: unknown;
    for (;;) {
        try {
            return await timeout(read(), ATTEMPT_MS);
        } catch (err) {
            last = err;
        }
        if (Date.now() + retryMs >= deadline) break;
        await sleep(retryMs);
    }
    const why = last instanceof Error ? last.message : String(last);
    if (wait) throw new Error(`${what} didn't load in ${wait / 1000} s (${why}); failing the build so the last deployment stays live.`);
    throw new Error(`${what} didn't load (${why}).`);
}

/** The latest publication for a render (`patiently`). */
export function loadPublication(query: Query = databaseQuery, wait = buildWait(), env: Env = process.env,
                                retryMs = RETRY_MS): Promise<Publication | null> {
    return patiently("The publication", () => latestPublication(query), query, wait, env, retryMs);
}

/** One read per render: a page, its metadata and its rail share it (React cache). */
export const currentPublication = cache(() => loadPublication());

/** The published weeks for a render (`patiently`). */
export function loadWeeks(query: Query = databaseQuery, wait = buildWait(), env: Env = process.env,
                          retryMs = RETRY_MS): Promise<PublishedWeek[]> {
    return patiently("The published weeks", () => publishedWeeks(query), query, wait, env, retryMs);
}

let builtWeeks: Promise<PublishedWeek[]> | null = null;

/**
 * The published weeks, once per render. A build reads them once per worker:
 * they can't change while it runs, and every live and past page lists them.
 * A running server reads them again on each render, so a new week shows.
 */
export const currentWeeks = cache((): Promise<PublishedWeek[]> => building() ? (builtWeeks ??= loadWeeks()) : loadWeeks());

/** One page of a past week, once per render: the page and its metadata share it. */
export const weekForPage = cache((week: string, name: string) =>
    patiently(`The week of ${week}`, () => weekPublication(week, name), databaseQuery, buildWait(), process.env, RETRY_MS));
