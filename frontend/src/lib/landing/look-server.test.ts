import {describe, expect, it} from "vitest";

import {lookForPage} from "./look-server";

const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), {status: 200})) as unknown as typeof fetch;

describe("lookForPage", () => {
    it("returns today's count when the API has it", async () => {
        expect(await lookForPage(100, ok({taken_at: "x", families: {}}))).toEqual({taken_at: "x", families: {}});
    });

    it("falls back to nothing, never throws, when the API can't answer", async () => {
        expect(await lookForPage(100, (async () => new Response("{}", {status: 503})) as unknown as typeof fetch)).toBeNull();
        expect(await lookForPage(100, (async () => { throw new Error("down"); }) as unknown as typeof fetch)).toBeNull();
        expect(await lookForPage(100, ok({detail: "odd"}))).toBeNull();
    });

    it("gives up after its timeout", async () => {
        const slow = ((_: unknown, init: RequestInit) => new Promise((_r, reject) =>
            init.signal!.addEventListener("abort", () => reject(new Error("aborted"))))) as unknown as typeof fetch;
        const started = Date.now();
        expect(await lookForPage(50, slow)).toBeNull();
        expect(Date.now() - started).toBeLessThan(1000);
    });
});
