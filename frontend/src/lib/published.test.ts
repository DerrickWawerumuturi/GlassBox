import postgres from "postgres";
import {describe, expect, it} from "vitest";

import FIXTURE from "./published.fixture.json";
import {
    buildWait, DB_ENV, LATEST, latestPublication, loadPublication, loadWeeks, pastWeeks, type PublishedWeek, publishedWeeks, type Query, WEEK, weekPublication, WEEKS,
} from "./published";

/*
 * The site reads the weekly publication from the database, not the API
 * (GitHub issue #5). The selection runs on a real Postgres when
 * TEST_MARKET_DATABASE_URL points at a local one (README, "Tests"); the
 * backend serves the same fixture rows (backend tests/test_publish.py), so
 * both pick the same row.
 */

const ROW = {id: "4", look: {families: {backend: {jobs: 4}}}, pages: {ai: {jobs: 4}}};
const answers = (...results: Array<unknown[] | Error>): Query & {calls: string[]} => {
    const calls: string[] = [];
    const query: Query = async (text) => {
        calls.push(text);
        const next = results.length > 1 ? results.shift()! : results[0];
        if (next instanceof Error) throw next;
        return next as Record<string, unknown>[];
    };
    return Object.assign(query, {calls});
};

describe("latestPublication", () => {
    it("asks for the latest published row only, as the API does", async () => {
        const query = answers([ROW]);
        expect(await latestPublication(query)).toEqual({id: 4, look: ROW.look, pages: ROW.pages});
        expect(query.calls).toEqual([LATEST]);
        expect(LATEST).toMatch(/where status = 'published'\s+order by published_at desc, id desc limit 1/);
    });

    it("is null when nothing is published", async () => {
        expect(await latestPublication(answers([]))).toBeNull();
    });
});

describe("loadPublication", () => {
    it("at build, asks again while the database wakes", async () => {
        const query = answers(new Error("waking"), new Error("waking"), [ROW]);
        expect(await loadPublication(query, 1_000, {}, 10)).toMatchObject({id: 4});
        expect(query.calls).toHaveLength(3);
    });

    it("at build, fails the build when the database never answers", async () => {
        await expect(loadPublication(answers(new Error("down")), 50, {}, 10)).rejects.toThrow(/failing the build/);
    });

    it("fails the build at once, saying so, without the address", async () => {
        await expect(loadPublication(undefined, 30_000, {})).rejects.toThrow(`${DB_ENV} is not set: failing the build`);
    });

    it("tries once outside a build", async () => {
        const query = answers(new Error("down"));
        await expect(loadPublication(query, 0, {}, 10)).rejects.toThrow(/didn't load/);
        expect(query.calls).toHaveLength(1);
    });

    it("waits only during next build", () => {
        expect(buildWait({NEXT_PHASE: "phase-production-build"})).toBeGreaterThan(0);
        expect(buildWait({NODE_ENV: "production"})).toBe(0);
    });
});

describe("the weekly archive's reads (GitHub issue #16)", () => {
    it("lists the weeks newest first, the latest published row of each, and only dates and counts", async () => {
        expect(WEEKS).toMatch(/select distinct on \(week\) week, pages from market_publications where status = 'published'\s+order by week, published_at desc, id desc/);
        expect(WEEKS).toMatch(/from latest order by week desc$/);
        // The live week is LATEST's.
        expect(WEEKS).toContain("where status = 'published' order by published_at desc, id desc limit 1) as current");
        const query = answers([{week: "2026-10-12", current: true, pages: {ai: 4}}, {week: "2026-10-05", current: false, pages: {}}]);
        expect(await publishedWeeks(query)).toEqual([{week: "2026-10-12", current: true, pages: {ai: 4}}, {week: "2026-10-05", current: false, pages: {}}]);
        expect(query.calls).toEqual([WEEKS]);
    });

    it("gives a page the weeks before the live one where it has a count, newest first", () => {
        const weeks: PublishedWeek[] = [
            {week: "2026-10-19", current: false, pages: {ai: 9}},    // newer than the live week: not past
            {week: "2026-10-12", current: true, pages: {ai: 4}},
            {week: "2026-10-05", current: false, pages: {ai: 3, devops: 2}},
            {week: "2026-09-28", current: false, pages: {devops: 1}},
        ];
        expect(pastWeeks(weeks, "ai")).toEqual([{week: "2026-10-05", jobs: 3}]);
        expect(pastWeeks(weeks, "devops")).toEqual([{week: "2026-10-05", jobs: 2}, {week: "2026-09-28", jobs: 1}]);
        expect(pastWeeks(weeks.filter((w) => !w.current), "ai")).toEqual([]);
    });

    it("reads one page of one week, from that week's latest published row, dated by the row", async () => {
        expect(WEEK).toMatch(/pages -> \$2::text as page from market_publications\s+where status = 'published' and week = \$1::date order by published_at desc, id desc limit 1/);
        const calls: Array<[string, string[] | undefined]> = [];
        const query: Query = async (text, params) => {
            calls.push([text, params]);
            return [{id: "3", week: "2026-10-05", page: {jobs: 3, week: "2026-10-04"}}];
        };
        expect(await weekPublication("2026-10-05", "ai", query)).toEqual({id: 3, look: null, pages: {ai: {jobs: 3, week: "2026-10-05"}}});
        expect(calls).toEqual([[WEEK, ["2026-10-05", "ai"]]]);
        expect(await weekPublication("2026-10-05", "ai", answers([]))).toBeNull();
    });

    it("waits for the database at build, like the publication", async () => {
        const query = answers(new Error("waking"), []);
        expect(await loadWeeks(query, 1_000, {}, 10)).toEqual([]);
        expect(query.calls).toHaveLength(2);
        await expect(loadWeeks(answers(new Error("down")), 50, {}, 10)).rejects.toThrow(/The published weeks didn't load in .* failing the build/);
    });
});

const URL = process.env.TEST_MARKET_DATABASE_URL ?? "";
const local = /@(127\.0\.0\.1|localhost)[:/]/.test(URL);

describe.skipIf(!local)("on a local Postgres", () => {
    it("serves the row the API serves: published, latest published_at, then highest id", async () => {
        const sql = postgres(URL, {max: 1, onnotice: () => {}});
        const rollback = new Error("rollback");
        let served: unknown;
        try {
            await sql.begin(async (tx) => {
                await tx`delete from market_publications`;
                for (const r of FIXTURE.rows) {
                    await tx`insert into market_publications
                        (id, week, as_of, published_at, status, profiler_version, jobs, gates, look, pages)
                        overriding system value values (${r.id}, ${r.week}, ${r.as_of}, ${r.published_at}, ${r.status}, 'fixture', 10, '[]'::jsonb,
                                ${r.look === null ? null : tx.json(r.look)}, ${r.pages === null ? null : tx.json(r.pages)})`;
                }
                served = await latestPublication((text) => tx.unsafe(text));
                throw rollback;
            });
        } catch (err) {
            if (err !== rollback) throw err;
        } finally {
            await sql.end();
        }
        const want = FIXTURE.rows.find((r) => r.id === FIXTURE.served)!;
        expect(served).toEqual({id: want.id, look: want.look, pages: want.pages});
    });

    // The same rows, each page given a story, but 28 Sep's: a week from before the editorial pages lists no page.
    it("lists each week once, from its latest published row, and reads that row's page", async () => {
        const sql = postgres(URL, {max: 1, onnotice: () => {}});
        const rollback = new Error("rollback");
        let weeks: unknown, past: unknown, missing: unknown;
        try {
            await sql.begin(async (tx) => {
                await tx`delete from market_publications`;
                for (const r of FIXTURE.rows) {
                    const pages = r.pages && r.week !== "2026-09-28"
                        ? Object.fromEntries(Object.entries(r.pages).map(([k, v]) => [k, {...v, story: {squares: {skill: 1}}}])) : r.pages;
                    await tx`insert into market_publications
                        (id, week, as_of, published_at, status, profiler_version, jobs, gates, look, pages)
                        overriding system value values (${r.id}, ${r.week}, ${r.as_of}, ${r.published_at}, ${r.status}, 'fixture', 10, '[]'::jsonb,
                                ${r.look === null ? null : tx.json(r.look)}, ${pages === null ? null : tx.json(pages)})`;
                }
                const query: Query = (text, params) => tx.unsafe(text, params);
                weeks = await publishedWeeks(query);
                past = await weekPublication("2026-10-05", "ai", query);
                missing = await weekPublication("2026-10-19", "ai", query);
                throw rollback;
            });
        } catch (err) {
            if (err !== rollback) throw err;
        } finally {
            await sql.end();
        }
        // 12 Oct: rows 3 and 4 published (4 wins, as LATEST), row 2 rejected.
        expect(weeks).toEqual([
            {week: "2026-10-12", current: true, pages: {ai: 4}},
            {week: "2026-10-05", current: false, pages: {ai: 1}},
            {week: "2026-09-28", current: false, pages: {}},
        ]);
        expect(past).toMatchObject({id: 1, look: null, pages: {ai: {jobs: 1, week: "2026-10-05"}}});
        expect(missing).toBeNull();
    });
});
