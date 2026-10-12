import {describe, expect, it} from "vitest";

import type {Publication} from "@/lib/published";
import {allMarkets, keepLastPage, lookForPage, marketForPage} from "./look-server";

const GOOD = {taken_at: "x", families: {backend: {jobs: 5}}};
const holding = (look: unknown, pages: Record<string, unknown> = {}) => async (): Promise<Publication> => ({id: 1, look, pages});
const down = async (): Promise<Publication> => { throw new Error("down"); };
const nothing = async () => null;

describe("lookForPage", () => {
    it("returns this week's count from the latest publication", async () => {
        expect(await lookForPage(holding(GOOD), false, false)).toEqual(GOOD);
        expect(await lookForPage(holding(GOOD), true, false)).toEqual(GOOD);
    });

    it("treats a count with no jobs as not there, so the page never renders an empty market", async () => {
        const empty = {taken_at: "x", families: {backend: {jobs: 0}, ai: {jobs: 0}}};
        expect(await lookForPage(holding(empty), false, false)).toBeNull();
        await expect(lookForPage(holding(empty), true, false)).rejects.toThrow("keeping the last good page");
    });

    it("treats a count with no job types as not there, so the page never renders an empty count", async () => {
        expect(await lookForPage(holding({taken_at: "x", families: {}}), false, false)).toBeNull();
        await expect(lookForPage(holding({taken_at: "x", families: {}}), true, false)).rejects.toThrow();
    });

    it("falls back to nothing in dev, when there is no page to keep", async () => {
        expect(await lookForPage(down, false, false)).toBeNull();
        expect(await lookForPage(nothing, false, false)).toBeNull();
        expect(await lookForPage(holding(null), false, false)).toBeNull();
    });

    it("throws during a revalidation, so the last good page stays cached", async () => {
        await expect(lookForPage(down, true, false)).rejects.toThrow("keeping the last good page");
        await expect(lookForPage(nothing, true, false)).rejects.toThrow("keeping the last good page");
    });

    it("fails the build when the database can't be read or holds no publication", async () => {
        await expect(lookForPage(down, false, true)).rejects.toThrow("down");
        await expect(lookForPage(nothing, false, true)).rejects.toThrow("failing the build");
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

    it("is the page's own body from the publication", async () => {
        const load = holding(GOOD, {ai: page(12), devops: page(7)});
        expect(await marketForPage("ai", false, load, false)).toMatchObject({jobs: 12});
        expect(await marketForPage("devops", false, load, false)).toMatchObject({jobs: 7});
    });

    it("is refused with 0 jobs: no count, never an empty page", async () => {
        expect(await marketForPage("ai", false, holding(GOOD, {ai: page(0)}), false)).toBeNull();
        await expect(marketForPage("ai", true, holding(GOOD, {ai: page(0)}), false)).rejects.toThrow();
    });

    it("is null for a page the publication doesn't hold, unless a revalidation can keep the last one", async () => {
        expect(await marketForPage("ai", false, holding(GOOD, {}), false)).toBeNull();
        await expect(marketForPage("ai", true, holding(GOOD, {}), false)).rejects.toThrow();
    });

    it("gives the hub and the rail every page, null for one without a count", async () => {
        const all = await allMarkets(false, holding(GOOD, {ai: page(3)}), false);
        expect(all.ai).toMatchObject({jobs: 3});
        expect(all.devops).toBeNull();
    });
});
