import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {MARKET_PAGES, MarketBody, YearsCount} from "./market-pages";
import {marketFaq} from "./market-faq";
import {dek, glance, headline} from "./market-story";
import {softwareLine, unstatedShare, yearsAnswer, yearsCounts, yearsFaq, yearsHeadline, yearsLabel} from "./years-answer";

const ENTRY = FIXTURE["entry-level-software"] as unknown as MarketBody;
const years = (counts: number[], unstated: number): YearsCount => ({
    buckets: counts.map((jobs, from) => ({from, to: from === 5 ? null : from, jobs})),
    stated: counts.reduce((a, b) => a + b, 0), unstated,
});
// The 12 Oct 2026 pool, read only with market_pages.experience (v6 profiles): 0, 1, 2, 3, 4, 5+ years.
const REAL = {titled: years([5, 10, 2, 2, 2, 1], 306), software: years([22, 44, 188, 235, 143, 1420], 1544)};
const page = (experience?: MarketBody["experience"]) => ({...ENTRY, week: "2026-10-12", experience} as MarketBody);

describe("the years of experience page, written from the count", () => {
    const c = yearsCounts(page(REAL))!;

    it("answers the question in the H1 and the first sentence, with the week and the sample", () => {
        expect(yearsHeadline(c)).toBe("Most entry level software jobs don't ask for a number of years");
        expect(yearsAnswer(c)).toBe("Of the 328 software jobs with an early career title in the week of 12 October 2026, "
            + "306 state no number of years. Of the 22 that do, 17 ask for two years or less.");
        expect(softwareLine(c)).toBe("Across all 3,596 software jobs counted that week, 2,052 state a number of years. "
            + "254 of them ask for two years or less, and 1,420 ask for five years or more.");
        expect(unstatedShare(c)).toBe(93);
    });

    it("says another headline when most titles do state years, and agrees in the singular", () => {
        const most = yearsCounts(page({titled: years([1, 0, 0, 0, 0, 0], 0), software: years([0, 0, 0, 0, 0, 0], 0)}))!;
        expect(yearsHeadline(most)).toBe("Most entry level software jobs ask for two years or less");
        expect(yearsAnswer(most)).toBe("Of the 1 software job with an early career title in the week of 12 October 2026, "
            + "0 state no number of years. Of the 1 that does, 1 asks for two years or less.");
        expect(softwareLine(most)).toBeNull();
        const none = yearsCounts(page({titled: years([0, 0, 0, 0, 0, 0], 1), software: years([0, 0, 0, 0, 0, 0], 1)}))!;
        expect(yearsAnswer(none)).toBe("Of the 1 software job with an early career title in the week of 12 October 2026, 1 states no number of years.");
    });

    it("reads the chart aloud with every count", () => {
        expect(yearsLabel(c)).toMatch(/^Early career titles, 328 jobs: 306 state no number, 5 ask for no experience, 10 ask for 1 year, /);
        expect(yearsLabel(c)).toMatch(/All software jobs, 3,596 jobs: 1,544 state no number, .* 1,420 ask for 5 years or more\.$/);
    });

    it("answers each question with a count, and leaves out what the data can't answer", () => {
        expect(yearsFaq(c)).toEqual([
            {q: "How many years of experience do entry level software jobs ask for?", a: yearsAnswer(c)},
            {q: "How many software jobs ask for two years of experience or less?",
                a: "254 of the 2,052 software jobs that state a number of years, in the week of 12 October 2026."},
            {q: "How many software jobs ask for five years of experience or more?",
                a: "1,420 of the 2,052 software jobs that state a number of years, in the week of 12 October 2026."},
        ]);
        const noSoftware = yearsCounts(page({...REAL, software: years([0, 0, 0, 0, 0, 0], 9)}))!;
        expect(yearsFaq(noSoftware).map((f) => f.q)).toEqual(["How many years of experience do entry level software jobs ask for?"]);
    });

    it("has no page before the count carries the years, or with no titled job", () => {
        expect(yearsCounts(page())).toBeNull();
        expect(yearsCounts(null)).toBeNull();
        expect(yearsCounts(page({titled: years([0, 0, 0, 0, 0, 0], 0), software: REAL.software}))).toBeNull();
    });
});

describe("a market page's questions", () => {
    const AI = {info: MARKET_PAGES.ai, page: FIXTURE.ai as unknown as MarketBody};
    const ML = {info: MARKET_PAGES["machine-learning"], page: FIXTURE["machine-learning"] as unknown as MarketBody};
    const E = {info: MARKET_PAGES["entry-level-software"], page: ENTRY};

    it("answers each with this week's count, two to four of them", () => {
        const faq = marketFaq(AI);
        expect(faq[0]).toEqual({q: "What skills do AI jobs ask for most?",
            a: expect.stringMatching(/^191 of the 287 AI jobs we could read in the week of 5 October 2026 name LLMs, \d+ name [^,]+ and \d+ name .+\.$/)});
        expect(faq.length).toBeGreaterThanOrEqual(2);
        expect(faq.length).toBeLessThanOrEqual(4);
        expect(faq.find((f) => f.q === "How many AI jobs are remote?")?.a).toBe(
            `${AI.page.remote} of the 288 AI jobs counted in the week of 5 October 2026 are marked remote by their job board.`);
        for (const {a} of [...faq, ...marketFaq(ML), ...marketFaq(E)]) {
            expect(a).toMatch(/\d/);
            expect(a).not.toMatch(/\blearn\b|should|start here|next step|recommend|—|!/i);
        }
    });

    it("never answers with the skill that names the job type", () => {
        expect(marketFaq(ML)[0].a).toMatch(/name Python, 102 name LLMs/);
    });

    it("answers the entry level years from early career titles only, and not at all without them", () => {
        expect(marketFaq(E).some((f) => f.q.startsWith("How many years"))).toBe(false);
        const withYears = {...E, page: page(REAL)};
        expect(marketFaq(withYears).find((f) => f.q.startsWith("How many years"))?.a).toBe(yearsAnswer(yearsCounts(withYears.page)!));
    });

    it("never says the entry level page's own years, and points to the years page with the title count", () => {
        const withYears = {...E, page: page(REAL)};
        expect(headline(withYears)).toBeNull();
        expect(dek(withYears)).not.toMatch(/years/);
        const pointer = glance(withYears).find((f) => f.id === "finding-years")!;
        expect(pointer).toEqual({id: "finding-years", bold: "306", href: "/market/entry-level-software/years-of-experience",
            text: "306 of the 328 software jobs with an early career title state no number of years."});
        expect(glance(E).some((f) => f.id === "finding-years")).toBe(false);     // no counts, no pointer
    });

    it("has no skills answer when the page is under the 100 rule", () => {
        const thin = {...AI, page: {...AI.page, publishable: false} as MarketBody};
        expect(marketFaq(thin).some((f) => f.q.startsWith("What skills"))).toBe(false);
    });
});
