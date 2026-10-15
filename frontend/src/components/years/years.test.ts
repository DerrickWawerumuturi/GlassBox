import {existsSync, readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";

import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the page's words and figures are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import YearsArticle from "@/components/market-page/YearsArticle";
import FIXTURE from "@/lib/market-story.fixture.json";
import {MarketBody, YearsCount} from "@/lib/market-pages";
import {yearsCounts} from "@/lib/years-answer";

/*
 * "Count the rings" as rendered, on the real week and on the prototype's two
 * made up ones: a week where most early career jobs state a number (the
 * headline flips, the ringed logs group) and a thin week (the ringed logs and
 * the yard leave the page, the rounds show one sealed log). The FAQ stays
 * text, for search. Alfa Slab One ships with its licence and loads here only.
 */

const years = (counts: number[], unstated: number): YearsCount => ({
    buckets: counts.map((jobs, from) => ({from, to: from === 5 ? null : from, jobs})),
    stated: counts.reduce((a, b) => a + b, 0), unstated,
});
const page = (experience: MarketBody["experience"]) => ({...(FIXTURE["entry-level-software"] as unknown as MarketBody), week: "2026-10-12", experience} as MarketBody);
const html = (e: MarketBody["experience"]) =>
    renderToStaticMarkup(createElement(YearsArticle, {c: yearsCounts(page(e))})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");

const REAL = {titled: years([5, 10, 2, 2, 2, 1], 306), software: years([22, 44, 188, 235, 143, 1420], 1544)};
const MORE = {titled: years([40, 90, 70, 30, 20, 12], 150), software: years([30, 60, 240, 300, 170, 1600], 1300)};
const THIN = {titled: years([0, 0, 0, 0, 0, 0], 41), software: years([0, 0, 0, 0, 0, 0], 0)};

describe("the years page, this week", () => {
    const h = html(REAL);

    it("opens with the kicker, the answer, the week and two piles", () => {
        expect(h).toContain("Count the rings · week of 12 October 2026");
        expect(h).toMatch(/<h1>Most entry level software jobs don't ask for a number of years<\/h1>/);
        expect(h).toContain("Of the 328 software jobs with an early career title in the week of 12 October 2026, 306 state no number of years. Of the 22 that do, 17 ask for two years or less.");
        expect(h).toContain("<time dateTime=\"2026-10-12\">Week of 12 October 2026</time>");
        expect(h.match(/a pile of [\d,]+ log ends, one per job/g)).toEqual(["a pile of 328 log ends, one per job", "a pile of 3,596 log ends, one per job"]);
        expect(h).toContain(">306 of 328</span>");
        expect(h).toContain("Stack by rings");
        expect(h).toContain("Mix them back");          // the yard opens stacked
    });

    it("keys each pile with its counts, and reads each one aloud", () => {
        expect(h).toMatch(/<b>306<\/b><span>None stated<\/span>.*<b>17<\/b><span>2 years or less<\/span>.*<b>4<\/b><span>3 or 4 years<\/span>.*<b>1<\/b><span>5 years or more<\/span>/);
        expect(h).toContain("aria-label=\"Early career titles, 328 jobs: 306 state no number, 5 ask for no experience, 10 ask for 1 year,");
    });

    it("shows the 22 that state a number one log each, and the rounds with their lines", () => {
        expect(h).toContain("<h2>The 22 that state a number</h2>");
        expect(h).toMatch(/<b>5<\/b><span>No experience<\/span>/);
        expect(h).toContain("Now every software job");
        expect(h).toContain("Early career titles: of the 22 that state a number, 17 ask for two years or less and 1 for five or more.");
        expect(h).toContain("All software jobs</span> · 2,052 of 3,596 state a number");
    });

    it("keeps the questions and answers as text, with the table twin and the cite", () => {
        expect(h).toContain("<dt>How many software jobs ask for two years of experience or less?</dt><dd>254 of the 2,052 software jobs that state a number of years.</dd>");
        expect(h).toMatch(/<th scope="row">None stated<\/th><td>306<\/td><td>1,544<\/td>/);
        expect(h).toContain("Glassbox. \"Most entry level software jobs don't ask for a number of years\" Counted in the week of 12 October 2026.");
        expect(h).toContain("\"@type\":\"FAQPage\"");
    });
});

describe("the years page in made up weeks", () => {
    it("flips the headline and groups the ringed logs when most early career jobs state a number", () => {
        const h = html(MORE);
        expect(h).toMatch(/<h1>Most entry level software jobs ask for two years or less<\/h1>/);
        expect(h).toContain("<h2>The 262 that state a number</h2>");
        expect(h).toContain("<b>40 jobs</b><span>No experience</span>");   // above 60, one log per group with its count
        expect(h).toContain(">150 of 412</span>");
    });

    it("leaves out the ringed logs and the yard in a thin week, and seals the one round", () => {
        const h = html(THIN);
        expect(h).not.toMatch(/<h2>The ([\d,]+|one) that states? a number<\/h2>/);
        expect(h).not.toContain("Now every software job");
        expect(h).not.toContain("Stack by rings");      // one kind of log has nothing to sort
        expect(h.match(/a pile of [\d,]+ log ends/g)).toEqual(["a pile of 41 log ends"]);
        expect(h).toContain("Early career titles: none of the 41 state a number.");
        expect(h).toContain("None stated <b>41</b>");
        expect(h).not.toContain("All software jobs");
    });
});

describe("Alfa Slab One", () => {
    const src = join(__dirname, "..", "..");

    it("is self hosted with its licence beside it", () => {
        const fonts = join(src, "app", "fonts");
        expect(statSync(join(fonts, "alfa-slab-one.woff2")).size).toBeGreaterThan(10_000);
        expect(readFileSync(join(fonts, "OFL-alfa-slab-one.txt"), "utf8")).toContain("SIL Open Font License");
    });

    it("loads on the years page only", () => {
        const users: string[] = [];
        const walk = (d: string) => readdirSync(d).forEach((f) => {
            const p = join(d, f);
            if (statSync(p).isDirectory()) walk(p);
            else if (/\.tsx?$/.test(f) && !f.endsWith(".test.ts") && readFileSync(p, "utf8").includes("fonts/alfa-slab-one")) users.push(p.slice(src.length + 1));
        });
        walk(src);
        expect(users).toEqual(["app/market/[page]/years-of-experience/page.tsx"]);
        expect(existsSync(join(src, "app", "fonts", "alfa-slab-one.ts"))).toBe(true);
    });
});
