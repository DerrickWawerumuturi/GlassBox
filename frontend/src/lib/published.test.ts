import postgres from "postgres";
import {describe, expect, it} from "vitest";

import FIXTURE from "./published.fixture.json";
import {buildWait, DB_ENV, LATEST, latestPublication, loadPublication, type Query} from "./published";

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
});
