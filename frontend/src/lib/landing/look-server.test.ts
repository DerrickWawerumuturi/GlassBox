import {describe, expect, it} from "vitest";

import {keepLastPage, lookForPage} from "./look-server";

const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), {status: 200})) as unknown as typeof fetch;

describe("lookForPage", () => {
    it("returns today's count when the API has it", async () => {
        expect(await lookForPage(100, ok({taken_at: "x", families: {}}))).toEqual({taken_at: "x", families: {}});
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
        expect(await lookForPage(100, ok({taken_at: "x", families: {}}), true)).toEqual({taken_at: "x", families: {}});
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
