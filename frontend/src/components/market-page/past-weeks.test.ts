import type {ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

import FIXTURE from "@/lib/market-story.fixture.json";
import {isWeek, type MarketBody} from "@/lib/market-pages";
import type {Publication, PublishedWeek} from "@/lib/published";

/*
 * The weekly archive as rendered (GitHub issue #16): the live page lists its
 * past weeks, and a past week is the same page with that week's count, dated
 * at the top, under its own address. The database is the two reads
 * lib/published.ts makes for it: the weeks list and one week's page.
 */

const AI = FIXTURE.ai as unknown as MarketBody;
const db = vi.hoisted(() => ({weeks: [] as PublishedWeek[], reads: [] as string[]}));
vi.mock("@/lib/published", async (original) => ({
    ...await original<typeof import("@/lib/published")>(),
    currentPublication: async (): Promise<Publication> => ({id: 3, look: null, pages: {...FIXTURE, ai: {...AI, week: "2026-10-12"}}}),
    currentWeeks: async () => {
        db.reads.push("weeks");
        return db.weeks;
    },
    weekForPage: async (week: string, name: string): Promise<Publication | null> => {
        db.reads.push(`${name} ${week}`);
        // That week's count: fewer jobs, so its numbers are its own.
        return {id: 1, look: null, pages: {[name]: {...AI, week, jobs: 4321}}};
    },
}));
vi.mock("next/navigation", () => ({
    useRouter: () => ({push: () => {}}),
    notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
    redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: () => {}, scanning: false, sheet: null})}));

import LivePage from "@/app/market/[page]/page";
import PastPage, * as past from "@/app/market/[page]/week/[week]/page";

const WEEKS: PublishedWeek[] = [
    {week: "2026-10-12", current: true, pages: {ai: 288, "software-engineering": 1379}},
    {week: "2026-10-05", current: false, pages: {ai: 4321, "software-engineering": 1200}},
    // A week from before the editorial pages has no page with a count, and lists none.
    {week: "2026-09-28", current: false, pages: {}},
];
const params = (page: string, week?: string) => ({params: Promise.resolve(week ? {page, week} : {page}) as Promise<{page: string; week: string}>});
const html = (el: ReactElement) => renderToStaticMarkup(el).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

beforeEach(() => {
    db.weeks = WEEKS;
    db.reads = [];
});

describe("the live market page", () => {
    it("lists its past weeks, newest first, each linked, after the week it shows", async () => {
        const h = html(await LivePage(params("ai")));
        expect(h).toContain("<h2 id=\"past-weeks-h\"");
        const section = h.slice(h.indexOf("id=\"past-weeks\""));
        expect(section).toContain("<span aria-current=\"page\"><time dateTime=\"2026-10-12\">Week of 12 October 2026</time></span>");
        expect(section).toContain("<a class=\"text-primary underline-offset-4 hover:underline\" href=\"/market/ai/week/2026-10-05\"><time dateTime=\"2026-10-05\">Week of 5 October 2026</time></a>");
        expect(text(section)).toContain("4,321 AI jobs");
        expect(section).not.toContain("2026-09-28");
        // The byline points at the list.
        expect(h).toContain("<a href=\"#past-weeks\"");
    });

    it("shows no list while it has no past week", async () => {
        db.weeks = [WEEKS[0]];
        const h = html(await LivePage(params("ai")));
        expect(h).not.toContain("past-weeks");
    });
});

describe("a past week's page", () => {
    it("renders that week's count, dated at the top, with a link to the live page", async () => {
        const h = html(await PastPage(params("ai", "2026-10-05")));
        expect(text(h)).toContain("The week of 5 October 2026. This is a past week; the live page counts again every Monday. Latest count: AI jobs");
        expect(h).toContain("href=\"/market/ai\"");
        expect(h).toContain("4,321");
        expect(h).not.toContain(">288<");
        // Its own address in the cite line and the markup; its breadcrumb ends at the week.
        expect(h).toMatch(/Counted in the week of 5 October 2026\. [^ ]+\/market\/ai\/week\/2026-10-05/);
        expect(h).toMatch(/"mainEntityOfPage":"[^"]+\/market\/ai\/week\/2026-10-05"/);
        expect(h).toContain("<span aria-current=\"page\">Week of 5 October 2026</span>");
        // Its rail doesn't call the live pages "this week".
        expect(h).not.toContain("Also this week");
        // Its list marks the week it shows and links the live one.
        const section = h.slice(h.indexOf("id=\"past-weeks\""));
        expect(section).toContain("<span aria-current=\"page\"><time dateTime=\"2026-10-05\">");
        expect(section).toContain("href=\"/market/ai\"><time dateTime=\"2026-10-12\">");
        expect(db.reads).toContain("ai 2026-10-05");
    });

    it("has its own canonical, and a title and description that say the week", async () => {
        const meta = await past.generateMetadata(params("ai", "2026-10-05"));
        expect(meta.alternates?.canonical).toBe("/market/ai/week/2026-10-05");
        expect(meta.title).toBe("AI engineer skills, counted from 4,321 jobs in the week of 5 October 2026");
        expect(meta.description).toContain("5 October 2026");
    });

    it("sends the live week to the live page", async () => {
        await expect(PastPage(params("ai", "2026-10-12"))).rejects.toThrow("NEXT_REDIRECT /market/ai");
    });

    it("is a 404 for a week with no count for the page, and before any read for a name or week that can't be one", async () => {
        await expect(PastPage(params("devops", "2026-10-05"))).rejects.toThrow("NEXT_NOT_FOUND");
        db.reads = [];
        // Not a page; not a Monday; not a date; not a week; before the first published week; a Monday to come.
        for (const [page, week] of [["nope", "2026-10-05"], ["ai", "2026-10-06"], ["ai", "2026-13-05"], ["ai", "latest"], ["ai", "2026-09-28"], ["ai", "2099-01-05"]]) {
            await expect(PastPage(params(page, week))).rejects.toThrow("NEXT_NOT_FOUND");
        }
        expect(db.reads).toEqual([]);
    });

    it("is built at deploy for every past week of every page that has one", async () => {
        expect(await past.generateStaticParams()).toEqual([
            {page: "software-engineering", week: "2026-10-05"}, {page: "ai", week: "2026-10-05"},
        ]);
    });
});

describe("an address's week", () => {
    it("is a Monday from the first published week to today", () => {
        const today = new Date("2026-10-21T08:00:00Z");
        expect(["2026-10-05", "2026-10-12", "2026-10-19"].filter((w) => isWeek(w, today))).toHaveLength(3);
        for (const w of ["2026-09-28", "2026-10-26", "2026-10-13", "2026-02-30", "2026-10-5", "x"]) expect([w, isWeek(w, today)]).toEqual([w, false]);
    });
});
