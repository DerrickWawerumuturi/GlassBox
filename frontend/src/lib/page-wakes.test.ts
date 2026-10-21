import {readdirSync, readFileSync, statSync} from "node:fs";
import {join, relative} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import LOOK from "@/lib/landing/look.fixture.json";
import PAGES from "@/lib/market-story.fixture.json";

/*
 * Public pages never wake the API (GitHub issues #4 and #5). The API scales to
 * zero; page rebuilds that asked it for the count were 477 of its 517 wakes in
 * the week to 12 Oct 2026. Pages now read the publication from the database
 * (lib/published.ts) and have no timer: they are built at deploy and rebuilt
 * when the weekly publication calls /api/revalidate.
 */

const read = vi.hoisted(() => ({calls: 0}));
vi.mock("@/lib/published", async (original) => ({
    ...await original<typeof import("@/lib/published")>(),
    currentPublication: async () => {
        read.calls++;
        return {id: 1, look: LOOK, pages: PAGES};
    },
    // The weekly archive's two reads (GitHub issue #16): the weeks list and one past week's page.
    currentWeeks: async () => {
        read.calls++;
        return [{week: "2026-10-12", current: true, pages: {ai: 288}}, {week: "2026-10-05", current: false, pages: {ai: 250}}];
    },
    weekForPage: async (week: string, name: string) => {
        read.calls++;
        return {id: 0, look: null, pages: {[name]: {...(PAGES as Record<string, object>)[name], week}}};
    },
}));

// next/font is the compiler's: outside a build it throws. The hub loads the stories' faces for its covers.
vi.mock("next/font/local", () => ({default: () => ({className: "", variable: "", style: {}})}));

const APP = join(__dirname, "..", "app");

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
    });
}

const routes = files(APP).map((path) => [relative(APP, path), readFileSync(path, "utf8")] as const);
const readers = routes.filter(([, text]) => text.includes("@/lib/landing/look-server")).map(([path]) => path);

describe("public pages", () => {
    it("rebuild only on demand: every page reading the count has revalidate = false", () => {
        expect(readers).toEqual(expect.arrayContaining(["(landing)/page.tsx", "(public)/about/page.tsx", "(public)/product/page.tsx",
            "market/page.tsx", "market/[page]/page.tsx", "market/[page]/years-of-experience/page.tsx", "market/[page]/week/[week]/page.tsx", "sitemap.ts",
            "market/opengraph-image.tsx", "market/[page]/opengraph-image.tsx", "market/[page]/years-of-experience/opengraph-image.tsx"]));
        for (const [path, text] of routes.filter(([p]) => readers.includes(p))) {
            expect([path, text.match(/^export const revalidate = (.+);/m)?.[1]]).toEqual([path, "false"]);
        }
    });

    it("never set a numeric revalidate: no page, share image or sitemap rebuilds on a timer", () => {
        expect(routes.filter(([, text]) => /^export const revalidate = \d/m.test(text)).map(([path]) => path)).toEqual([]);
    });
});

// Importing every public page cold takes seconds under the full suite: a longer
// timeout keeps this check from failing on load rather than on a real API call.
describe("rendering a public page", {timeout: 30_000}, () => {
    const fetches: string[] = [];
    beforeEach(() => {
        fetches.length = 0;
        read.calls = 0;
        vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
            fetches.push(String(url));
            throw new Error("public pages must not fetch");
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it("reads the publication and never calls the API", async () => {
        const params = (page: string) => ({params: Promise.resolve({page})});
        const home = await import("@/app/(landing)/page");
        const about = await import("@/app/(public)/about/page");
        const product = await import("@/app/(public)/product/page");
        const hub = await import("@/app/market/page");
        const market = await import("@/app/market/[page]/page");
        const years = await import("@/app/market/[page]/years-of-experience/page");
        const pastWeek = await import("@/app/market/[page]/week/[week]/page");
        const sitemap = await import("@/app/sitemap");

        const homeEl = await home.default() as {props: {children: Array<{props?: {initial?: unknown}}>}};
        expect(homeEl.props.children[1].props?.initial).toEqual(LOOK);
        await about.default();
        await product.default();
        await hub.default();
        expect((await market.generateMetadata(params("ai"))).title).toBeTruthy();
        await market.default(params("ai"));
        await years.generateMetadata(params("entry-level-software"));
        await years.default(params("entry-level-software"));
        const week = {params: Promise.resolve({page: "ai", week: "2026-10-05"})};
        expect(await pastWeek.generateStaticParams()).toEqual([{page: "ai", week: "2026-10-05"}]);
        expect((await pastWeek.generateMetadata(week)).alternates?.canonical).toBe("/market/ai/week/2026-10-05");
        await pastWeek.default(week);
        const map = await sitemap.default();
        expect(map.find((e) => e.url.endsWith("/market/ai"))?.lastModified).toBeTruthy();
        // Each past week is in the sitemap, without a lastmod: a past week doesn't change.
        expect(map.filter((e) => e.url.includes("/week/"))).toEqual([{url: expect.stringMatching(/\/market\/ai\/week\/2026-10-05$/)}]);

        expect(fetches).toEqual([]);
        expect(read.calls).toBeGreaterThan(0);
    });

    // A story is one week's count in its own data module: it reads no publication and calls nothing, so only a deploy builds it.
    it("renders every story without reading the publication or calling the API", async () => {
        const stories = [
            ["entry-level-software", await import("@/app/market/[page]/pick-a-side/page")],
            ["software-engineering", await import("@/app/market/[page]/the-lobby/page")],
            ["ai", await import("@/app/market/[page]/contents-may-vary/page")],
            ["ai", await import("@/app/market/[page]/ai-on-your-cv/page")],
            ["machine-learning", await import("@/app/market/[page]/peak-python/page")],
            ["devops", await import("@/app/market/[page]/within-eleven-jobs/page")],
        ] as const;
        for (const [page, route] of stories) {
            const params = {params: Promise.resolve({page})};
            expect((await route.generateMetadata(params)).alternates?.canonical).toMatch(new RegExp(`^/market/${page}/`));
            await route.default(params);
        }
        expect(fetches).toEqual([]);
        expect(read.calls).toBe(0);
        expect(routes.filter(([path]) => /^market\/\[page]\/(pick-a-side|the-lobby|contents-may-vary|ai-on-your-cv|peak-python|within-eleven-jobs)\//.test(path))
            .filter(([, text]) => text.includes("look-server") || text.includes("@/lib/published"))).toEqual([]);
    });
});
