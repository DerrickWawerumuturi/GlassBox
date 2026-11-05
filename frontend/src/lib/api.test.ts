import {beforeEach, describe, expect, it, vi} from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({track}));

import {ProcessCv, StoreCV} from "./api";

/** The API's answers: a token for /api/token, then the save, with or without the "created" header. */
function answer(created: boolean) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/token"
        ? new Response(JSON.stringify({token: "t"}))
        : new Response("{}", {headers: created ? {"X-Account-Created": "1"} : {}})));
}

beforeEach(() => track.mockClear());

describe("signed_up", () => {
    it("is sent when the API says this request created the account", async () => {
        answer(true);
        await StoreCV({} as never);
        expect(track).toHaveBeenCalledWith("signed_up");
    });

    it("is not sent on any other answer", async () => {
        answer(false);
        await StoreCV({} as never);
        expect(track).not.toHaveBeenCalled();
    });
});

describe("scan correlation", () => {
    it("sends the request ID and preserves the server reference on failures", async () => {
        const requestId = "c".repeat(32);
        const fetch = vi.fn(async (_url: string, init: RequestInit) => {
            expect(new Headers(init.headers).get("X-Request-ID")).toBe(requestId);
            return new Response(JSON.stringify({detail: "private detail"}), {status: 500, headers: {"X-Request-ID": requestId}});
        });
        vi.stubGlobal("fetch", fetch);
        await expect(ProcessCv(new File(["%PDF-1.4"], "cv.pdf", {type: "application/pdf"}), requestId))
            .rejects.toMatchObject({status: 500, requestId});
    });

    it("identifies a service that cannot be reached", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
        await expect(ProcessCv(new File(["%PDF-1.4"], "cv.pdf", {type: "application/pdf"})))
            .rejects.toMatchObject({kind: "network"});
    });

    it("identifies a request timeout", async () => {
        vi.useFakeTimers();
        try {
            vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
                init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
            })));
            const request = ProcessCv(new File(["%PDF-1.4"], "cv.pdf", {type: "application/pdf"}));
            const rejected = expect(request).rejects.toMatchObject({kind: "timeout"});
            await vi.advanceTimersByTimeAsync(120_000);
            await rejected;
        } finally { vi.useRealTimers(); }
    });
});

describe("wakeApi", () => {
    it("sends one GET /health per page load, however often the sheet opens, and never throws", async () => {
        vi.resetModules();
        const fetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
        vi.stubGlobal("fetch", fetch);
        const {wakeApi, API_BASE_URL} = await import("./api");
        wakeApi();
        wakeApi();
        wakeApi();
        await Promise.resolve();
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/health`, {cache: "no-store"});
    });
});
