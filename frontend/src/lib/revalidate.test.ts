import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));

import {revalidatePath} from "next/cache";
import {POST} from "@/app/api/revalidate/route";
import {MARKET_NAMES} from "@/lib/market-names";
import {authorized, handleRevalidate, LIMIT, MARKET_PATHS, resetLimit} from "./revalidate";

const SECRET = "test-secret";
const call = (authorization?: string) =>
    new Request("http://localhost/api/revalidate", {method: "POST", headers: authorization ? {authorization} : {}});

describe("POST /api/revalidate", () => {
    beforeEach(() => {
        resetLimit();
        vi.mocked(revalidatePath).mockClear();
    });

    it("answers 503 when the secret isn't configured, and revalidates nothing", async () => {
        vi.stubEnv("REVALIDATE_SECRET", "");
        expect((await POST(call(`Bearer ${SECRET}`))).status).toBe(503);
        vi.unstubAllEnvs();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("answers 401 to a wrong or missing secret", () => {
        for (const header of [undefined, "Bearer wrong", SECRET, `Basic ${SECRET}`, `Bearer ${SECRET}x`]) {
            expect(handleRevalidate(call(header), SECRET).status).toBe(401);
        }
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("drops the home page, /market and every market page with the right secret", async () => {
        vi.stubEnv("REVALIDATE_SECRET", SECRET);
        const response = await POST(call(`Bearer ${SECRET}`));
        vi.unstubAllEnvs();
        expect(response.status).toBe(200);
        const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
        expect(paths).toEqual(expect.arrayContaining(["/", "/market", ...MARKET_NAMES.map((name) => `/market/${name}`),
            "/market/entry-level-software/years-of-experience"]));
        expect(revalidatePath).toHaveBeenCalledWith("/market", "layout");    // the share images under /market
        expect((await response.json()).revalidated).toEqual(MARKET_PATHS);
    });

    it("refuses a header too long to be the secret", () => {
        expect(authorized(`Bearer ${"a".repeat(600)}`, SECRET)).toBe(false);
    });

    it("limits calls per minute, then lets them through again", () => {
        for (let i = 0; i < LIMIT.calls; i++) expect(handleRevalidate(call("Bearer wrong"), SECRET, 1_000).status).toBe(401);
        expect(handleRevalidate(call(`Bearer ${SECRET}`), SECRET, 1_000).status).toBe(429);
        expect(handleRevalidate(call(`Bearer ${SECRET}`), SECRET, 1_000 + LIMIT.perMs).status).toBe(200);
    });
});
