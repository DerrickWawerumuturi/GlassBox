import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {JOB_SITES, METHOD_PAGE} from "./method-copy";
import {chartName, copyText, copyUrl, levelLabel, shortDate, weekDate, weekStart} from "./market-page";
import {MARKET_PAGES, MarketBody} from "./market-pages";
import {
    bucketPhrase, cardLine, has, categoriesSection, citeLine, contrastSection, dek, findingCount, findingShare, findingText, fractionPhrase, framing, glance,
    headline, hiringSection, languagesSection, levelsSection, pageDescription, pageTitle, readLine, say, squaresCaption, squaresLegend, thin, topic,
    UNAVAILABLE, yearsSection,
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
    it("leads with the finding, one pattern per page, never a question", () => {
        expect(topic(ENTRY)).toBe("What entry level software jobs ask for");
        // The entry level set takes in jobs asking two years or less, so its own years never lead it,
        // even from a publication made before that rule: then the topic is the H1 until the next one.
        expect(headline(ENTRY)).toBeNull();
        expect(headline(AI)).toBe("Two in three AI jobs name LLMs");
        expect(headline(SE)).toBe("Python and distributed systems are almost tied at the top of software engineering jobs");
        // Machine learning itself never leads its own page: Python (55%) and LLMs (53%) do.
        expect(headline(ML)).toBe("Python and LLMs each appear in about half of machine learning jobs");
        expect(headline(THIN)).toBeNull();
        for (const c of [ENTRY, AI, SE, ML]) expect(headline(c) ?? "").not.toMatch(/\blearn\b|should|start here|next step|recommend|—|!|-[a-z]/i);
    });

    it("says the patterns the real pages don't show today", () => {
        const f = {of: 200, skills: ["incident response"], jobs: [7]};
        expect(headline(withFinding({...f, kind: "leads"}))).toBe("Incident response leads DevOps jobs, named in seven of 200");
        // The backend's one "half" rule: 276 of 560 (49.3%) is nearly half, never plain "Half".
        expect(headline(withFinding({...f, kind: "half", jobs: [276], of: 560, approx: "nearly"}))).toBe("Nearly half of DevOps jobs name incident response");
        expect(headline(withFinding({...f, kind: "half", jobs: [100], approx: "about"}))).toBe("About half of DevOps jobs name incident response");
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
        // Why 135 and not 136 is said where the reader meets it (copy rewrite P2, 15 Oct 2026).
        expect(dek(ENTRY)).toBe("In the week of 5 October 2026 we found 136 entry level software jobs at 67 employers. 135 had an ad long enough to read for skills, and 58 of those name Python.");
        expect(dek(AI)).toBe("In the week of 5 October 2026 we found 288 AI jobs at 107 employers. 287 had an ad long enough to read for skills, and 191 of those name LLMs.");
        expect(dek(SE)).toBe("In the week of 5 October 2026 we found 1,379 software engineering jobs at 256 employers. 1,366 had an ad long enough to read for skills, and 490 of those name Python, 478 distributed systems.");
        const years = withFinding({kind: "years", years: 5, jobs: 70, of: 100});
        expect(dek(years)).toMatch(/ had an ad long enough to read for skills\. \d+ of those name \w+\. 70 of the 100 that state a number of years ask for 5 years\.$/);
        const all = {...AI, page: {...AI.page, readable: AI.page.jobs}};
        expect(dek(all)).toMatch(/\. All 288 had an ad long enough to read for skills, and /);
    });

    it("gives three findings at a glance, the headline's first", () => {
        expect(glance(ENTRY).map(findingText)).toEqual([
            "58 of the 135 entry level software jobs we read name Python.",
            "JavaScript is named in 25% of entry level software jobs and 9% of senior software jobs.",
            "89 of the 135 entry level software jobs we read name two or more languages.",
        ]);
        expect(glance(ENTRY).map((f) => f.id)).toEqual(["finding-skill", "finding-contrast", "finding-languages"]);
        expect(glance(AI)[0].text).toBe("191 of the 287 AI jobs we read name LLMs.");
        expect(glance(ML)[0].text).toBe("106 of the 194 machine learning jobs we read name Python, and 102 name LLMs.");
    });

    it("agrees on the hub, the share image and the citation", () => {
        expect(cardLine(AI)).toBe("191 of the 287 AI jobs we read name LLMs.");
        expect(cardLine(THIN)).toBe(thin(THIN));
        expect(findingCount(AI, "AI jobs")).toBe("191 of the 287 AI jobs we read name LLMs.");
        expect(findingShare(AI)).toBe(67);
        expect(findingShare(ENTRY)).toBeNull();        // its own years never lead
        expect(cardLine(ENTRY)).toBe("58 of the 135 entry level software jobs we read name Python.");
        expect(citeLine(AI, "seeglassbox.com")).toBe('Glassbox. "Two in three AI jobs name LLMs" Counted in the week of 5 October 2026. seeglassbox.com/market/ai');
    });

    it("names a generic skill in lower case mid sentence", () => {
        expect(squaresLegend(SE).skill).toBe("Python");
        expect(findingCount(SE)).toMatch(/name distributed systems\.$/);
        expect(ML.page.names["machine learning"]).toBe("Machine learning");
    });

    it("under the 100 rule says why there are no shares, and finds nothing", () => {
        expect(dek(THIN)).toBe("In the week of 5 October 2026 we found 136 entry level software jobs at 67 employers. Fewer than 100 had an ad long enough to read, so this page shows counts and no shares this week.");
        expect(thin(THIN)).toMatch(/^Only \d+ of these jobs had an ad long enough to read\. Below 100, a share says more about a few employers than about the market, so this page shows counts only\.$/);
        expect(glance(THIN)).toEqual([]);
        expect(findingShare(THIN)).toBeNull();
    });

    it("writes section headings as findings, never as advice", () => {
        expect(languagesSection(ENTRY).heading).toBe("Most list more than one language");
        expect(languagesSection(ENTRY).before).toBe("110 of the 135 we read list at least one programming language. 89 list two or more.");
        expect(contrastSection(ENTRY).heading).toBe("JavaScript shows up far more at entry level. Distributed systems less.");
        expect(contrastSection(AI).heading).toBe("Senior AI jobs name LLMs more often. TypeScript less.");
        expect(categoriesSection(ENTRY).heading).toBe("Beyond the languages, backend systems and AI come up most");
        expect(has(ENTRY, "years")).toBe(false);                                   // circular: no section, whatever the body says
        expect(has(AI, "years")).toBe(true);
        expect(yearsSection(AI).heading).toBe("5 to 7 years is the most common ask");
        expect(yearsSection(AI).pull).toBe("68 of 167");
        expect(levelsSection(AI).heading).toBe("Most AI jobs are senior");
        expect(hiringSection(ENTRY).before).toBe("67 employers posted these jobs. No single one dominates: Stripe has the most, 18 of the 136.");
        const all = [languagesSection, contrastSection, categoriesSection].map((f) => f(ENTRY).heading).join(" ") + " " + yearsSection(AI).heading;
        expect(all).not.toMatch(/\blearn\b|should|start here|next step|recommend|—/i);
    });

    it("dates every count by its published week, never today", () => {
        expect(weekStart({taken_at: "2026-10-07T05:00:00Z"})).toBe("2026-10-05");            // a body from before publications
        expect(weekStart({taken_at: "2026-10-12T00:20:00Z", week: "2026-10-12"})).toBe("2026-10-12");
        expect(weekStart({taken_at: "2026-10-11T23:59:00Z"})).toBe("2026-10-05");             // Sunday belongs to the week before
        expect(weekDate(AI.page)).toBe("5 October 2026");
        expect(squaresCaption(AI)).toBe("AI jobs that week, one square each.");
        const words = [dek, cardLine, thin, squaresCaption, (c: typeof AI) => citeLine(c, "x"), (c: typeof AI) => pageDescription(c.info, c.page)]
            .flatMap((f) => [ENTRY, AI, SE, ML, THIN].map((c) => f(c))).join(" ");
        expect(words).not.toMatch(/\btoday\b|open on|every day/i);
    });

    it("subtitles a chart with what it counts, never a question", () => {
        // Three figure subtitles on one page, three different lines (copy rewrite P7 to P10).
        expect(languagesSection(ENTRY).sub).toBe("Share of the 135 jobs read, by language");
        expect(contrastSection(ENTRY).sub).toBe("Share of each set that mentions the skill");
        expect(categoriesSection(AI).sub).toBe("Share of the 287 jobs read that mention each skill");
        expect(hiringSection(AI).sub).toBe("The 288 jobs, by the country each one names");
        const lines = [languagesSection, contrastSection, categoriesSection, hiringSection].flatMap((f) => [ENTRY, AI].map((c) => f(c)))
            .flatMap((s) => [s.sub, s.heading, s.before]);
        lines.push(...[ENTRY, AI, SE, ML, THIN].flatMap((c) => [topic(c), headline(c) ?? "", cardLine(c), dek(c)]));
        expect(lines.filter((l) => l.includes("?"))).toEqual([]);
    });

    it("explains a term once, then leans on it (copy rewrite, founder, 15 Oct 2026)", () => {
        const langs = languagesSection(ENTRY).caption;
        // The first "senior" and the breadth rule's reason, in the first figure.
        expect(langs).toMatch(/^Bars: these 135 jobs\. Grey tick: the same share in [\d,]+ senior software jobs, senior meaning a senior, lead or principal title\. /);
        expect(langs).toMatch(/A language is shown only when jobs at 10 or more employers mention it, so one company's hiring can't make a pattern\. \w+'s come from \d+\.$/);
        expect(contrastSection(ENTRY).caption).toBe("Same rule as the languages: a skill needs jobs at 10 or more employers to be shown.");
        // Without the languages figure the reason stays with the rule.
        const noLangs = {...ENTRY, page: {...ENTRY.page, story: {...ENTRY.page.story, sections: ENTRY.page.story.sections.filter((x) => x !== "languages")}} as MarketBody};
        expect(contrastSection(noLangs).caption).toMatch(/so one company's hiring can't make a pattern\.$/);
        expect(languagesSection(ENTRY).after).toMatch(/^(\d+ of these \d+ languages come up more often here|Every language here comes up more often) than in senior software jobs\.$/);
        expect(categoriesSection(ENTRY).before).toMatch(/^\d+ of the 135 jobs read list an? [\w ]+ skill\. \d+ list one in [\w ]+\.$/);
        expect(categoriesSection(ENTRY).before).not.toMatch(/\ba AI\b/);
        expect(categoriesSection(AI).caption).toMatch(/^Each bar: the share of these 287 jobs\. Grey tick: the share of [\d,]+ senior AI jobs\.$/);
        expect(readLine(135, 136)).toBe("We look for about 250 named skills, by fixed rules, in the 135 ads long enough to read. The other 1 was too short.");
        expect(readLine(559, 561)).toBe("We look for about 250 named skills, by fixed rules, in the 559 ads long enough to read. The other 2 were too short.");
        expect(readLine(351, 351)).toBe("We look for about 250 named skills, by fixed rules, in the 351 ads long enough to read.");
        expect(framing(ENTRY)[1]).toBe("Every Monday a new week replaces this one here. The story linked in the rail keeps one week and looks closer.");
        expect(UNAVAILABLE).toBe("This week's page isn't ready yet. Try again in a minute.");
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
        // The searched question in its own words, answered with a count (GitHub issue #2).
        expect(pageTitle(ENTRY.info, ENTRY.page)).toBe("Entry level software engineer skills, counted from 136 jobs");
        expect(pageTitle(ML.info, ML.page)).toBe("Machine learning engineer skills, counted from 194 jobs");
        expect(pageDescription(ENTRY.info, ENTRY.page)).toBe(
            "What entry level software jobs ask for most in the week of 5 October 2026: 58 of the 135 ads we read name Python and 43 name Go.");
        // Machine learning names the job type itself: Python and LLMs answer instead.
        expect(pageDescription(ML.info, ML.page)).toMatch(/: 106 of the 194 ads we read name Python and 102 name LLMs\.$/);
        expect(pageDescription(ENTRY.info, THIN.page)).toBe(
            "What entry level software jobs ask for. Counted in the week of 5 October 2026: 136 jobs at 67 employers.");
        expect(pageTitle(AI.info, null)).toBe("AI engineer skills");
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
    it("credits every job site whose terms ask for it, with a followed link", () => {
        // docs/decisions/open-data.md, terms checked 13 Oct 2026.
        const credits = {
            "Remote OK": "https://remoteok.com", "Remotive": "https://remotive.com",
            "Arbeitnow": "https://www.arbeitnow.com", "Jobicy": "https://jobicy.com",
            "Himalayas": "https://himalayas.app", "We Work Remotely": "https://weworkremotely.com",
        };
        for (const [name, href] of Object.entries(credits)) {
            expect(JOB_SITES.find((s) => s.name === name)?.href, name).toBe(href);
        }
        expect(readFileSync(join(__dirname, "../app/(public)/method/page.tsx"), "utf8")).not.toMatch(/\brel=/);
        expect(METHOD_PAGE.back.map((l) => l.href)).toContain("/market");
    });

    it("names only the feeds the collector reads", () => {
        // Summit Recruitment's robots.txt disallows /feed/: it is no longer read (sources.py).
        expect(JSON.stringify(JOB_SITES)).not.toMatch(/Summit/);
        expect(JOB_SITES.at(-1)?.name).toMatch(/^Five Kenyan job feeds/);
    });
});
