import {readFileSync} from "node:fs";
import {join} from "node:path";

import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const db = vi.hoisted(() => ({up: true}));
vi.mock("@/lib/published", async (original) => ({
    ...await original<typeof import("@/lib/published")>(),
    loadPublication: async () => {
        if (!db.up) throw new Error("down");
        return {id: 1, look: {taken_at: "x", families: {backend: {jobs: 5}}}, pages: {}};
    },
}));

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
        db.up = true;
        vi.mocked(revalidatePath).mockClear();
    });

    it("answers 503 when the secret isn't configured, and revalidates nothing", async () => {
        vi.stubEnv("REVALIDATE_SECRET", "");
        expect((await POST(call(`Bearer ${SECRET}`))).status).toBe(503);
        vi.unstubAllEnvs();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("answers 401 to a wrong or missing secret", async () => {
        for (const header of [undefined, "Bearer wrong", SECRET, `Basic ${SECRET}`, `Bearer ${SECRET}x`]) {
            expect((await handleRevalidate(call(header), SECRET)).status).toBe(401);
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
        expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");         // its lastmod
        expect((await response.json()).revalidated).toEqual(MARKET_PATHS);
    });

    it("refuses a header too long to be the secret", () => {
        expect(authorized(`Bearer ${"a".repeat(600)}`, SECRET)).toBe(false);
    });

    it("limits calls per minute, then lets them through again", async () => {
        for (let i = 0; i < LIMIT.calls; i++) expect((await handleRevalidate(call("Bearer wrong"), SECRET, 1_000)).status).toBe(401);
        expect((await handleRevalidate(call(`Bearer ${SECRET}`), SECRET, 1_000)).status).toBe(429);
        expect((await handleRevalidate(call(`Bearer ${SECRET}`), SECRET, 1_000 + LIMIT.perMs)).status).toBe(200);
    });

    it("keeps every page when this server can't read the publication: a dropped page would answer 500", async () => {
        db.up = false;
        const response = await handleRevalidate(call(`Bearer ${SECRET}`), SECRET);
        expect(response.status).toBe(503);
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});

describe("the pages the publication revalidates", () => {
    // With `dynamicParams = false`, Next 16.3 answered 404 for /market/ai and the
    // years page once /api/revalidate had dropped them (next start, 12 Oct 2026).
    // Unknown names are a 404 from notFound() instead.
    it.each(["market/[page]/page.tsx", "market/[page]/years-of-experience/page.tsx"])("%s keeps dynamic params", (file) => {
        const source = readFileSync(join(__dirname, "..", "app", file), "utf8");
        expect(source).not.toMatch(/^export const dynamicParams = false/m);
        expect(source).toContain("notFound()");
    });
});
