import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {JOB_SITES, METHOD_PAGE} from "./method-copy";
import {chartName, copyText, copyUrl, levelLabel, shortDate, weekDate, weekStart} from "./market-page";
import {MARKET_PAGES, MarketBody} from "./market-pages";
import {
    bucketPhrase, cardLine, categoriesSection, citeLine, contrastSection, dek, findingCount, findingShare, findingText, fractionPhrase, glance,
    headline, hiringSection, languagesSection, levelsSection, pageDescription, pageTitle, say, squaresCaption, squaresLegend, thin, topic, yearsSection,
} from "./market-story";

// Four real bodies, built read only from the 7 Oct 2026 pool (v5 profiles), titles cut to three.
const ENTRY = {info: MARKET_PAGES["entry-level-software"], page: FIXTURE["entry-level-software"] as unknown as MarketBody};
const AI = {info: MARKET_PAGES.ai, page: FIXTURE.ai as unknown as MarketBody};
const SE = {info: MARKET_PAGES["software-engineering"], page: FIXTURE["software-engineering"] as unknown as MarketBody};
const ML = {info: MARKET_PAGES["machine-learning"], page: FIXTURE["machine-learning"] as unknown as MarketBody};
/** The AI page with another lead finding, for the patterns the real pages don't show today. */
const withFinding = (finding: object) => ({info: MARKET_PAGES.devops, page: {...AI.page, story: {...AI.page.story, finding}} as MarketBody});
const THIN = {info: ENTRY.info, page: {...ENTRY.page, publishable: false, readable: 80,
    story: {...ENTRY.page.story, headline: null, sections: []}} as MarketBody};

describe("a market page's words, written from its counts", () => {
    it("leads with the finding, one pattern per page, and says what the page counts above it, never a question", () => {
        expect(topic(ENTRY)).toBe("The skills entry level software jobs name, counted");
        expect(headline(ENTRY)).toBe("“Entry level” usually means two years");
        expect(headline(AI)).toBe("Two in three AI jobs name LLMs");
        expect(headline(SE)).toBe("Python and distributed systems are almost tied at the top of software engineering jobs");
        // Machine learning itself never leads its own page: Python (55%) and LLMs (53%) do.
        expect(headline(ML)).toBe("Python and LLMs each appear in about half of machine learning jobs");
        expect(headline(THIN)).toBeNull();
        for (const c of [ENTRY, AI, SE, ML]) expect(headline(c)).not.toMatch(/\blearn\b|should|start here|next step|recommend|—|!|-[a-z]/i);
    });

    it("says the patterns the real pages don't show today", () => {
        const f = {of: 200, skills: ["incident response"], jobs: [7]};
        expect(headline(withFinding({...f, kind: "leads"}))).toBe("Incident response leads DevOps jobs, named in seven of 200");
        expect(headline(withFinding({...f, kind: "half", jobs: [100]}))).toBe("Half of DevOps jobs name incident response");
        expect(headline(withFinding({...f, kind: "share", jobs: [126], fraction: null}))).toBe("63% of DevOps jobs name incident response");
        expect(headline(withFinding({kind: "pair", skills: ["llm", "python"], jobs: [94, 88], of: 200, approx: "nearly"})))
            .toBe("LLMs and Python each appear in nearly half of DevOps jobs");
        expect(headline(withFinding({kind: "years", years: 5, jobs: 70, of: 100}))).toBe("Most DevOps jobs that state years ask for 5 years");
    });

    it("writes small numbers and fractions in words", () => {
        expect([say(1), say(9), say(10), say(1366)]).toEqual(["one", "nine", "10", "1,366"]);
        expect([fractionPhrase([2, 3]), fractionPhrase([3, 5]), fractionPhrase([9, 10])]).toEqual(["Two in three", "Three in five", "Nine in ten"]);
    });

    it("keeps the counted context under the headline", () => {
        expect(dek(ENTRY)).toBe("We counted 136 entry level software jobs at 67 employers in the week of 5 October 2026. 52 of the 69 that state a number of years ask for two years.");
        expect(dek(AI)).toBe("We counted 288 AI jobs at 107 employers in the week of 5 October 2026. 191 of the 287 we could read name LLMs.");
        expect(dek(SE)).toBe("We counted 1,379 software engineering jobs at 256 employers in the week of 5 October 2026. 490 of the 1,366 we could read name Python, and 478 name distributed systems.");
    });

    it("gives three findings at a glance, the headline's first", () => {
        expect(glance(ENTRY).map(findingText)).toEqual([
            "Two years is the most common ask: 52 of the 69 jobs that state a number.",
            "58 of the 135 entry level software jobs we could read name Python.",
            "JavaScript is named in 25% of entry level software jobs and 9% of senior software jobs.",
        ]);
        expect(glance(ENTRY).map((f) => f.id)).toEqual(["finding-years", "finding-skill", "finding-contrast"]);
        expect(glance(AI)[0].text).toBe("191 of the 287 AI jobs we could read name LLMs.");
        expect(glance(ML)[0].text).toBe("106 of the 194 machine learning jobs we could read name Python, and 102 name LLMs.");
    });

    it("agrees on the hub, the share image and the citation", () => {
        expect(cardLine(AI)).toBe("191 of the 287 AI jobs we could read name LLMs.");
        expect(cardLine(THIN)).toBe(thin(THIN));
        expect(findingCount(AI, "AI jobs")).toBe("191 of the 287 AI jobs we could read name LLMs.");
        expect(findingShare(AI)).toBe(67);
        expect(findingShare(ENTRY)).toBe(75);          // 52 of the 69 that state years
        expect(citeLine(AI, "seeglassbox.com")).toBe('Glassbox. "Two in three AI jobs name LLMs" Counted in the week of 5 October 2026. seeglassbox.com/market/ai');
    });

    it("names a generic skill in lower case mid sentence", () => {
        expect(squaresLegend(SE).skill).toBe("Python");
        expect(findingCount(SE)).toMatch(/name distributed systems\.$/);
        expect(ML.page.names["machine learning"]).toBe("Machine learning");
    });

    it("under the 100 rule says why there are no shares, and finds nothing", () => {
        expect(dek(THIN)).toBe("We counted 136 entry level software jobs at 67 employers in the week of 5 October 2026. Too few could be read this week to show shares.");
        expect(glance(THIN)).toEqual([]);
        expect(findingShare(THIN)).toBeNull();
    });

    it("writes section headings as findings, never as advice", () => {
        expect(languagesSection(ENTRY).heading).toBe("Most of them name more than one language");
        expect(languagesSection(ENTRY).before).toBe("110 of the 135 entry level software jobs we could read name at least one language, and 89 name two or more.");
        expect(contrastSection(ENTRY).heading).toBe("JavaScript shows up far more at entry level. Distributed systems less.");
        expect(contrastSection(AI).heading).toBe("Senior AI jobs name LLMs more often. TypeScript less.");
        expect(categoriesSection(ENTRY).heading).toBe("Beyond the languages, backend systems and AI come up most");
        expect(yearsSection(ENTRY).heading).toBe("52 of the 69 jobs that state years ask for two years");   // the H1 says it already
        expect(yearsSection(ENTRY).pull).toBe("52 of 69");
        expect(levelsSection(AI).heading).toBe("Most AI jobs are senior");
        expect(hiringSection(ENTRY).before).toBe("67 employers posted these jobs. No single one dominates: Stripe has the most, 18 of the 136.");
        const all = [languagesSection, contrastSection, categoriesSection, yearsSection].map((f) => f(ENTRY).heading).join(" ");
        expect(all).not.toMatch(/\blearn\b|should|start here|next step|recommend|—/i);
    });

    it("dates every count by its published week, never today", () => {
        expect(weekStart({taken_at: "2026-10-07T05:00:00Z"})).toBe("2026-10-05");            // a body from before publications
        expect(weekStart({taken_at: "2026-10-12T00:20:00Z", week: "2026-10-12"})).toBe("2026-10-12");
        expect(weekStart({taken_at: "2026-10-11T23:59:00Z"})).toBe("2026-10-05");             // Sunday belongs to the week before
        expect(weekDate(AI.page)).toBe("5 October 2026");
        expect(squaresCaption(AI)).toBe("AI jobs counted in the week of 5 October 2026. Each square is one job.");
        const words = [dek, cardLine, thin, squaresCaption, (c: typeof AI) => citeLine(c, "x"), (c: typeof AI) => pageDescription(c.info, c.page)]
            .flatMap((f) => [ENTRY, AI, SE, ML, THIN].map((c) => f(c))).join(" ");
        expect(words).not.toMatch(/\btoday\b|open on|every day/i);
    });

    it("subtitles a chart with what it counts, never a question", () => {
        expect(languagesSection(ENTRY).sub).toBe("Share of the entry level software jobs we could read, by language");
        expect(contrastSection(ENTRY).sub).toBe("Share of the entry level software and senior software jobs we could read naming each skill");
        expect(categoriesSection(AI).sub).toBe("Share of the AI jobs we could read naming each skill");
        expect(hiringSection(AI).sub).toBe("The AI jobs, by the place each one names");
        const lines = [languagesSection, contrastSection, categoriesSection, hiringSection].flatMap((f) => [ENTRY, AI].map((c) => f(c)))
            .flatMap((s) => [s.sub, s.heading, s.before]);
        lines.push(...[ENTRY, AI, SE, ML, THIN].flatMap((c) => [topic(c), headline(c) ?? "", cardLine(c), dek(c)]));
        expect(lines.filter((l) => l.includes("?"))).toEqual([]);
    });

    it("leaves out a level no job has, instead of writing a zero", () => {
        const levels = (junior: number, mid: number, unstated: number) => levelsSection(
            {info: ML.info, page: {...ML.page, jobs: junior + mid + unstated + 100, levels: {junior, mid, senior: 100, unstated}} as MarketBody});
        expect(levels(0, 40, 20).before).toBe("Senior here means a senior, lead or principal level. Of the 160 jobs, 40 read as mid level and 20 don't say.");
        expect(levels(0, 40, 20).label).toBe("Of 160 machine learning jobs: 40 mid level, 100 senior, 20 not stated.");
        expect(levels(5, 40, 20).before).toBe("Senior here means a senior, lead or principal level. Of the 165 jobs, 5 read as intern, entry level or junior, 40 as mid level and 20 don't say.");
        expect(levels(0, 0, 0).before).toBe("Senior here means a senior, lead or principal level.");
        expect(levels(0, 0, 0).label).not.toMatch(/\b0 /);
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
            "“Entry level” usually means two years. Counted in the week of 5 October 2026: 136 jobs at 67 employers.");
        expect(pageTitle(AI.info, null)).toBe("What AI jobs ask for");
    });
});

describe("the helpers", () => {
    it("names a skill in a narrow chart without its examples, never cut off", () => {
        expect(chartName("AI assistants (ChatGPT, Copilot)")).toBe("AI assistants");
        expect(chartName("Distributed systems")).toBe("Distributed systems");
        expect(chartName("Terraform / IaC")).toBe("Terraform / IaC");
    });

    it("dates a hub card short", () => {
        expect(shortDate("2026-10-07T05:00:00Z")).toBe("7 Oct 2026");
    });

    it("copies the sentence and a tagged link to the finding", () => {
        const url = copyUrl("/market/ai", "ai", "finding-skill");
        expect(url).toMatch(/\/market\/ai\?utm_source=copy&utm_campaign=ai#finding-skill$/);
        expect(copyText("LLMs appear in 191 jobs.", url)).toBe(`LLMs appear in 191 jobs. ${url}`);
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
