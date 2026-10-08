import {describe, expect, it} from "vitest";

import {marketForPage} from "@/lib/market-pages";
import {buildWait, builtForPage, keepLastPage, lookForPage} from "./look-server";

const GOOD = {taken_at: "x", families: {backend: {jobs: 5}}};
const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), {status: 200})) as unknown as typeof fetch;

describe("lookForPage", () => {
    it("returns today's count when the API has it", async () => {
        expect(await lookForPage(100, ok(GOOD))).toEqual(GOOD);
    });

    it("treats a count with no jobs as not there, so the page never renders an empty market", async () => {
        const empty = {taken_at: "x", families: {backend: {jobs: 0}, ai: {jobs: 0}}};
        expect(await lookForPage(100, ok(empty), false)).toBeNull();
        await expect(lookForPage(100, ok(empty), true)).rejects.toThrow();
    });

    it("treats a count with no job types as not there, so the page never renders an empty count", async () => {
        // An API on a new profiler version answers before the pool is re-read: valid shape, no families.
        expect(await lookForPage(100, ok({taken_at: "x", families: {}}), false)).toBeNull();
        await expect(lookForPage(100, ok({taken_at: "x", families: {}}), true)).rejects.toThrow();
    });

    it("falls back to nothing when there is no page to keep (build, dev)", async () => {
        expect(await lookForPage(100, (async () => new Response("{}", {status: 503})) as unknown as typeof fetch, false)).toBeNull();
        expect(await lookForPage(100, (async () => { throw new Error("down"); }) as unknown as typeof fetch, false)).toBeNull();
        expect(await lookForPage(100, ok({detail: "odd"}), false)).toBeNull();
    });

    it("gives up after its timeout", async () => {
        const slow = ((_: unknown, init: RequestInit) => new Promise((_r, reject) =>
            init.signal!.addEventListener("abort", () => reject(new Error("aborted"))))) as unknown as typeof fetch;
        const started = Date.now();
        expect(await lookForPage(50, slow, false)).toBeNull();
        expect(Date.now() - started).toBeLessThan(1000);
    });

    it("throws during a revalidation, so the last good page stays cached", async () => {
        const down = (async () => new Response("{}", {status: 503})) as unknown as typeof fetch;
        await expect(lookForPage(100, down, true)).rejects.toThrow();
        await expect(lookForPage(100, (async () => { throw new Error("down"); }) as unknown as typeof fetch, true)).rejects.toThrow();
        expect(await lookForPage(100, ok(GOOD), true)).toEqual(GOOD);
    });
});

describe("keepLastPage", () => {
    it("keeps the last page only in a running production server", () => {
        expect(keepLastPage({NODE_ENV: "production"})).toBe(true);
        expect(keepLastPage({NODE_ENV: "production", NEXT_PHASE: "phase-production-build"})).toBe(false);
        expect(keepLastPage({NODE_ENV: "development"})).toBe(false);
        expect(keepLastPage({NODE_ENV: "test"})).toBe(false);
    });
});

describe("a market page's body", () => {
    const page = (jobs: number) => ({taken_at: "x", jobs, story: {squares: {skill: 0, both: 0, internship: 0, neither: jobs}}});

    it("is refused with 0 jobs: no count, never an empty page", async () => {
        // Before publications an empty pool built every page with jobs: 0, and squares that were all zero but present.
        expect(await marketForPage("ai", false, 100, ok(page(0)))).toBeNull();
        await expect(marketForPage("ai", true, 100, ok(page(0)))).rejects.toThrow();
        expect(await marketForPage("ai", false, 100, ok(page(12)))).toMatchObject({jobs: 12});
    });
});

describe("at build", () => {
    const valid = (b: {n?: number}) => typeof b.n === "number" && b.n > 0;

    it("waits only during next build", () => {
        expect(buildWait({NEXT_PHASE: "phase-production-build"})).toBe(90_000);
        expect(buildWait({NODE_ENV: "production"})).toBe(0);
    });

    it("asks again while the API wakes, then renders what it sends", async () => {
        let calls = 0;
        const waking = (async () => (++calls < 3 ? new Response("{}", {status: 503}) : new Response(JSON.stringify({n: 4}), {status: 200}))) as unknown as typeof fetch;
        expect(await builtForPage("/market/look", valid, 100, waking, false, 1_000, 10)).toEqual({n: 4});
        expect(calls).toBe(3);
    });

    it("fails the build when the API never answers, so the last deployment stays live", async () => {
        const down = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
        await expect(builtForPage("/market/look", valid, 100, down, false, 200, 10)).rejects.toThrow("failing the build");
    });

    it("doesn't wait for a count the API did send but has no jobs", async () => {
        let calls = 0;
        const empty = (async () => { calls++; return new Response(JSON.stringify({n: 0}), {status: 200}); }) as unknown as typeof fetch;
        expect(await builtForPage("/market/look", valid, 100, empty, false, 1_000, 10)).toBeNull();
        expect(calls).toBe(1);
    });
});
