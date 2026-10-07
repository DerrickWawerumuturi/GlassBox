import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {JOB_SITES, METHOD_PAGE} from "./method-copy";
import {copyText, copyUrl, levelLabel, stamp} from "./market-page";
import {MARKET_PAGES, MarketBody} from "./market-pages";
import {
    bucketPhrase, categoriesSection, contrastSection, dek, findingText, glance, hiringSection, languagesSection, levelsSection,
    pageDescription, pageTitle, question, yearsSection,
} from "./market-story";

// Two real bodies, built read only from the 7 Oct 2026 pool (v5 profiles), titles cut to three.
const ENTRY = {info: MARKET_PAGES["entry-level-software"], page: FIXTURE["entry-level-software"] as unknown as MarketBody};
const AI = {info: MARKET_PAGES.ai, page: FIXTURE.ai as unknown as MarketBody};
const THIN = {info: ENTRY.info, page: {...ENTRY.page, publishable: false, readable: 80,
    story: {...ENTRY.page.story, headline: null, sections: []}} as MarketBody};

describe("a market page's words, written from its counts", () => {
    it("asks the question and answers it in the dek", () => {
        expect(question(ENTRY)).toBe("What are entry level software jobs actually asking for?");
        expect(dek(ENTRY)).toBe("We counted 136 entry level software jobs at 67 employers. Python came up most. JavaScript is where they differ most from senior software jobs.");
        expect(dek(AI)).toBe("We counted 288 AI jobs at 107 employers. LLMs came up most.");
    });

    it("gives three findings at a glance, each a full sentence with its count", () => {
        expect(glance(ENTRY).map(findingText)).toEqual([
            "58 of the 135 entry level software jobs we could read name Python.",
            "JavaScript is named in 25% of entry level software jobs and 9% of senior software jobs.",
            "Two years is the most common ask: 52 of the 69 jobs that state a number.",
        ]);
        expect(glance(ENTRY).map((f) => f.id)).toEqual(["finding-skill", "finding-contrast", "finding-years"]);
        expect(glance(AI)[0].text).toBe("191 of the 287 AI jobs we could read name LLMs.");
    });

    it("under the 100 rule says why there are no shares, and finds nothing", () => {
        expect(dek(THIN)).toBe("We counted 136 entry level software jobs at 67 employers. Too few could be read today to show shares.");
        expect(glance(THIN)).toEqual([]);
    });

    it("writes section headings as findings, never as advice", () => {
        expect(languagesSection(ENTRY).heading).toBe("Most of them name more than one language");
        expect(languagesSection(ENTRY).before).toBe("110 of the 135 entry level software jobs we could read name at least one language, and 89 name two or more.");
        expect(contrastSection(ENTRY).heading).toBe("JavaScript shows up far more at entry level. Distributed systems less.");
        expect(contrastSection(AI).heading).toBe("Senior AI jobs name LLMs more often. TypeScript less.");
        expect(categoriesSection(ENTRY).heading).toBe("Beyond the languages, backend systems and AI come up most");
        expect(yearsSection(ENTRY).heading).toBe("“Entry level” usually means two years");
        expect(yearsSection(ENTRY).pull).toBe("52 of 69");
        expect(levelsSection(AI).heading).toBe("Most AI jobs are senior");
        expect(hiringSection(ENTRY).before).toBe("67 employers posted these jobs. No single one dominates: Stripe has the most, 18 of the 136.");
        const all = [languagesSection, contrastSection, categoriesSection, yearsSection].map((f) => f(ENTRY).heading).join(" ");
        expect(all).not.toMatch(/\blearn\b|should|start here|next step|recommend|—/i);
    });

    it("names a years bucket in words", () => {
        expect(bucketPhrase(0, 0)).toBe("no experience");
        expect(bucketPhrase(2, 2)).toBe("two years");
        expect(bucketPhrase(3, null)).toBe("3 years or more");
        expect(bucketPhrase(5, 7)).toBe("5 to 7 years");
    });

    it("titles and describes the page for search from the data", () => {
        expect(pageTitle(ENTRY.info, ENTRY.page)).toBe("What entry level software jobs ask for: 136 jobs counted");
        expect(pageDescription(ENTRY.info, ENTRY.page)).toBe(
            "58 of the 135 entry level software jobs we could read name Python. Counted on 7 October 2026: 136 jobs at 67 employers.");
        expect(pageTitle(AI.info, null)).toBe("What AI jobs ask for");
    });
});

describe("the helpers", () => {
    it("copies the sentence and a tagged link to the finding", () => {
        const url = copyUrl("/market/ai", "ai", "finding-skill");
        expect(url).toMatch(/\/market\/ai\?utm_source=copy&utm_campaign=ai#finding-skill$/);
        expect(copyText("LLMs appear in 191 jobs.", url)).toBe(`LLMs appear in 191 jobs. ${url}`);
    });

    it("stamps the update time in UTC", () => {
        expect(stamp("2026-10-07T05:00:00Z")).toBe("7 Oct 2026, 05:00 UTC");
    });

    it("labels a title by its level, or by the years it asks for", () => {
        expect(levelLabel("intern", null)).toBe("Internship");
        expect(levelLabel("mid", 2)).toBe("Asks 2 years");
        expect(levelLabel("mid", 1)).toBe("Asks 1 year");
        expect(levelLabel("unknown", 0)).toBe("No experience asked");
        expect(levelLabel("unknown", null)).toBeNull();
    });
});

describe("/method", () => {
    it("links back to Arbeitnow, as its free API asks", () => {
        expect(JOB_SITES.find((s) => s.name === "Arbeitnow")?.href).toBe("https://www.arbeitnow.com");
        expect(METHOD_PAGE.back.map((l) => l.href)).toContain("/market");
    });
});
