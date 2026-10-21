import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {CV_AT, hubCards, hubFilters} from "./market-hub";
import type {MarketBody} from "./market-pages";

/*
 * The /market grid (founder, 15 Oct 2026): a card per story, each with a plain
 * link to its live weekly page, the years page's card from the live count,
 * and how we count. The two years essay is not on it until its recount.
 */

const entry = FIXTURE["entry-level-software"] as unknown as MarketBody;
const withYears: MarketBody = {...entry, week: "2026-10-12", experience: {
    titled: {buckets: [{from: 0, to: 0, jobs: 5}, {from: 1, to: 1, jobs: 10}, {from: 2, to: 2, jobs: 2}, {from: 3, to: 3, jobs: 2}, {from: 4, to: 4, jobs: 2}, {from: 5, to: null, jobs: 1}], stated: 22, unstated: 306},
    software: {buckets: [], stated: 0, unstated: 0},
}};

describe("the hub's cards", () => {
    it("are the seven stories, the years page and how we count, in the prototype's order", () => {
        const cards = hubCards({"entry-level-software": withYears});
        // The entry level page has two stories: the newest leads, the other follows the years page (19 Oct 2026).
        expect(cards.map((c) => c.href)).toEqual(["/market/entry-level-software/is-entry-level-dead", "/market/entry-level-software/years-of-experience",
            "/market/entry-level-software/pick-a-side", "/market/software-engineering/the-lobby", "/market/ai/ai-on-your-cv", "/market/ai/contents-may-vary",
            "/market/machine-learning/peak-python", "/market/devops/within-eleven-jobs", "/method"]);
        // The CV card goes fifth, after the lobby.
        expect(cards[CV_AT - 1].href).toBe("/market/software-engineering/the-lobby");
    });

    it("give every story a plain link to its live weekly page", () => {
        const cards = hubCards({"entry-level-software": withYears});
        const stories = cards.filter((c) => c.kind === "count");
        expect(stories.map((c) => c.live?.href)).toEqual(["/market/entry-level-software", "/market/entry-level-software", "/market/software-engineering",
            "/market/ai", "/market/ai", "/market/machine-learning", "/market/devops"]);
        // "Live" read as real time; the page shows the latest Monday (copy rewrite M5, 15 Oct 2026).
        expect(stories[0].live?.label).toBe("Latest count: entry level software jobs");
        expect(stories[2].live?.label).toBe("Latest count: software engineering jobs");
        // A reader can tell a story from a page: the pill and its filter say so (M4).
        for (const c of stories) expect(c.pill).toBe("Story");
        expect(hubFilters(cards).find(([k]) => k === "count")?.[1]).toBe("Stories");
        // Each story keeps its own week.
        expect(stories.map((c) => c.when)).toEqual(["Week of 19 Oct", "Week of 12 Oct", "Week of 12 Oct", "Week of 19 Oct", ...Array(3).fill("Week of 12 Oct")]);
    });

    it("write the years card from the live count, and leave it out when the count has no years", () => {
        const years = hubCards({"entry-level-software": withYears}).find((c) => c.kind === "years")!;
        expect(years.title).toBe("306 empty tags");
        expect(years.line).toBe("306 of the 328 software jobs with an early career title state no number of years.");
        expect(years.years).toEqual({unstated: 306, total: 328});
        expect(hubCards({"entry-level-software": entry}).some((c) => c.kind === "years")).toBe(false);
    });

    it("don't show the essay yet, so its filter doesn't show either", () => {
        const cards = hubCards({"entry-level-software": withYears});
        expect(cards.some((c) => c.kind === "essay")).toBe(false);
        expect(hubFilters(cards).map(([k]) => k)).toEqual(["all", "count", "years", "method"]);
        expect(hubFilters([...cards, {...cards[0], kind: "essay"}]).map(([k]) => k)).toEqual(["all", "essay", "count", "years", "method"]);
    });
});
