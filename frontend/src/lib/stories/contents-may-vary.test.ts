import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import ContentsMayVary from "@/components/stories/contents-may-vary/ContentsMayVary";
import {packshot} from "@/components/stories/contents-may-vary/pack";
import {contentsMayVaryCover} from "@/components/stories/covers/contents-may-vary";
import {commonBand, CONTENTS, CONTENTS_MAY_VARY, NO_LANGUAGE} from "./contents-may-vary";

/*
 * Contents may vary's numbers are one week's (contents-may-vary.ts). These
 * catch a refresh that breaks them: a count over its total, a share that
 * doesn't round from its count, a sum that no longer holds, or a sentence the
 * story writes that the new numbers no longer bear out. A failing test names
 * the sentence to read again.
 */

const pct = (n: number, of: number) => Math.round((100 * n) / of);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const html = () => renderToStaticMarkup(createElement(ContentsMayVary, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("Contents may vary's numbers", () => {
    const {jobs, readable, label, levels, years, places, remote, internships, largest} = CONTENTS;

    it("never count more jobs than there are", () => {
        expect(readable).toBeLessThanOrEqual(jobs);
        expect(CONTENTS.languages).toBeLessThanOrEqual(readable);
        expect(CONTENTS.twoOrMore).toBeLessThanOrEqual(CONTENTS.languages);
        for (const l of label) if (l.jobs !== null) expect(l.jobs, l.name).toBeLessThanOrEqual(readable);
        for (const n of [remote.jobs, internships.jobs, largest.jobs, years.stated]) expect(n).toBeLessThanOrEqual(jobs);
        expect(CONTENTS.slips.length).toBeLessThanOrEqual(CONTENTS.listed);
    });

    it("name no language in 567 − 294 = 273 jobs", () => {
        expect(NO_LANGUAGE).toBe(readable - CONTENTS.languages);
        expect(NO_LANGUAGE).toBe(273);
    });

    it("round every label share from its count where the page gives both, and keep the label in the page's order", () => {
        for (const l of label) if (l.jobs !== null) expect([l.name, l.share]).toEqual([l.name, pct(l.jobs, readable)]);
        expect(label.map((l) => l.share)).toEqual([...label.map((l) => l.share)].sort((a, b) => b - a));
        expect(remote.share).toBe(pct(remote.jobs, jobs));
        expect(internships.share).toBe(pct(internships.jobs, jobs));
    });

    it("add up: levels, years and places to the jobs counted, the years bands to those that state a number", () => {
        expect(sum([levels.senior, levels.junior, levels.mid, levels.unstated])).toBe(jobs);
        expect(years.stated + years.unstated).toBe(jobs);
        expect(sum(years.bands.map((b) => b.jobs))).toBe(years.stated);
        expect(places.us + places.elsewhere + places.unknown).toBe(jobs);
    });

    it("lay the pile out as a full rectangle, one piece per job we could read", () => {
        expect(readable % CONTENTS.across).toBe(0);
        expect(CONTENTS.across * (readable / CONTENTS.across)).toBe(readable);
    });
});

describe("the sentences the numbers must bear out", () => {
    const {places, remote, others, label} = CONTENTS;

    it("'the only one where elsewhere nearly matches the US': within a tenth here, further apart on every other page", () => {
        const close = (p: {us: number; elsewhere: number}) => Math.abs(p.us - p.elsewhere) / Math.max(p.us, p.elsewhere) < .1;
        expect(close(places)).toBe(true);
        for (const o of others) expect([o.name, close(o)]).toEqual([o.name, false]);
    });

    it("'the highest remote share of the five pages'", () => {
        for (const o of others) expect(remote.share, o.name).toBeGreaterThan(o.remote);
        expect(others.length + 1).toBe(5);
    });

    it("'5 to 7 years is the most common ask'", () => {
        expect(commonBand().label).toBe("5 to 7");
    });

    it("'LLMs in 343', 'Python in 258', 'AI agents in 220': the three lines the ending names lead the label", () => {
        expect(label.slice(0, 3).map((l) => l.key)).toEqual(["llm", "python", "ai agents"]);
        expect(label[0].jobs).toBe(CONTENTS.llm);
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("We read the side."));
        expect(top).toContain("By the Glassbox team · the week of 12 October 2026");
        expect(top).toContain("This story keeps to one week, 12 October 2026.");
        expect(top).toMatch(/<a href="\/market\/ai">The AI page<\/a> starts a new count every Monday/);
    });

    it("dates every source line with the week", () => {
        const sources = h.match(/Source: Glassbox count, week of [^·]*·/g) ?? [];
        expect(sources.length).toBe(4);
        for (const s of sources) expect(s).toBe("Source: Glassbox count, week of 12 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("343 of the 567 AI job ads we read name LLMs. 273 name no programming language at all.");
        expect(h).toContain("We counted 569 AI jobs at 269 employers in the week of 12 October 2026. 567 of them were long enough to read; the other 2 (569 − 567) were not.");
        expect(h).toContain("294 of the 567 name at least one language, so 567 − 294 = 273 name none. 165 name two or more.");
        expect(h).toContain("349 of the 569 AI jobs are senior, lead or principal. 5 to 7 years is the most common ask: 120 of the 289 jobs that state a number. The other 280 don't say.");
        expect(h).toContain("That is the highest remote share of the five pages: entry level software 15%, software engineering 31%, machine learning 37%, DevOps 35%.");
        expect(h).toContain("LLMs in 343 of the 567 jobs we could read, Python in 258, AI agents in 220, and no programming language at all in 273.");
    });

    it("prints the readable count on the box's roundel and the week on its strip", () => {
        const svg = packshot("t", {lidFlat: "f", lidTorn: "t", pop: "p"});
        expect(svg).toMatch(/>NET<\/text>[\s\S]*>567<\/text>[\s\S]*>JOBS<\/text>/);
        expect(svg).toContain(">WEEK OF 12 OCT 2026<");
        expect(svg).toContain(">569 JOBS<");
    });

    it("reads the pile aloud", () => {
        expect(h).toContain("567 pieces, one per AI job we could read in the week of 12 October 2026. A line on the label lights that many: LLMs 343, Python 258,");
    });

    it("ends with the question, the CV button and how we counted, scope included", () => {
        expect(h).toContain("Curious how many of these skills are already on your CV?");
        // After the ask, the week once more in one short line; the fold says what "read" meant (copy rewrite S2, S9).
        expect(h).toMatch(/One week, 12 October 2026\. <a href="\/market\/ai">The AI page<\/a> counts again on Monday\./);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 567 ads long enough to read. The other 2 were too short.");
        expect(h).not.toMatch(/stays fixed to it|the live page|Skills are matched against/);
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*peek-button[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("This page counts the AI jobs: titles that name AI, LLMs or generative AI.");
        expect(h).toContain("What we can't see:");
    });

    it("draws the cover from the same numbers", () => {
        const svg = contentsMayVaryCover();
        expect(svg).toContain(">LLMs<");
        expect(svg).toContain(">343<");
        expect(svg).toContain("of 567 AI jobs we could read");
    });

    it("gives the hub its card line from the numbers", () => {
        expect(CONTENTS_MAY_VARY.card).toBe("343 of the 567 AI job ads we read name LLMs. 273 name no programming language at all.");
    });
});
