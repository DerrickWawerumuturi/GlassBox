import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import {ICON} from "@/components/stories/pick-a-side/icons";
import PickASide from "@/components/stories/pick-a-side/PickASide";
import {pickASideCover} from "@/components/stories/covers/pick-a-side";
import {card, lean, PICK, PICK_A_SIDE} from "./pick-a-side";

/*
 * Pick a side's numbers are one week's (pick-a-side.ts). These catch a refresh
 * that breaks them: a count over its total, a share that doesn't round from
 * its count, or a sentence the story writes that the new numbers no longer
 * bear out. A failing test names the sentence to read again.
 */

const pct = (n: number, of: number) => Math.round((100 * n) / of);
const html = () => renderToStaticMarkup(createElement(PickASide, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("Pick a side's numbers", () => {
    it("never count more jobs than there are", () => {
        expect(PICK.readable).toBeLessThanOrEqual(PICK.jobs);
        for (const c of PICK.deck) {
            expect(c.e.jobs, c.name).toBeLessThanOrEqual(PICK.readable);
            if (c.s.jobs !== null) expect(c.s.jobs, c.name).toBeLessThanOrEqual(PICK.senior);
        }
        expect(PICK.languages.twoOrMore).toBeLessThanOrEqual(PICK.languages.any);
        expect(PICK.languages.any).toBeLessThanOrEqual(PICK.readable);
        expect(PICK.titled.unstated).toBeLessThanOrEqual(PICK.titled.jobs);
        expect(PICK.largest.jobs).toBeLessThanOrEqual(PICK.jobs);
    });

    it("round every share from its count where the page gives both", () => {
        for (const c of PICK.deck) {
            expect([c.name, c.e.share]).toEqual([c.name, pct(c.e.jobs, PICK.readable)]);
            if (c.s.jobs !== null) expect([c.name, c.s.share]).toEqual([c.name, pct(c.s.jobs, PICK.senior)]);
        }
        expect(PICK.internships.share).toBe(pct(PICK.internships.jobs, PICK.jobs));
        expect(PICK.remote.share).toBe(pct(PICK.remote.jobs, PICK.jobs));
    });

    it("place every job counted somewhere: US, elsewhere or no country we can read", () => {
        const {us, elsewhere, unknown} = PICK.places;
        expect(us + elsewhere + unknown).toBe(PICK.jobs);
    });

    it("deal every card once, each with a glyph on its coin", () => {
        const dealt = [PICK.beats.first, PICK.beats.lime, PICK.beats.same, ...PICK.beats.turn, ...PICK.beats.more];
        expect([...dealt].sort()).toEqual(PICK.deck.map((c) => c.key).sort());
        for (const c of PICK.deck) expect(ICON[c.key], c.key).toBeTruthy();
    });
});

describe("the sentences the numbers must bear out", () => {
    it("'C++ has a reputation as the hard one': the lime card is C++", () => {
        expect(card(PICK.beats.lime).name).toBe("C++");
    });

    it("'about twice the share' and 'the senior count is the bigger number'", () => {
        const c = card(PICK.beats.lime);
        expect(c.e.share / c.s.share).toBeGreaterThan(1.75);
        expect(c.e.share / c.s.share).toBeLessThan(2.25);
        expect(c.s.jobs!).toBeGreaterThan(c.e.jobs);
    });

    it("'Git leans the same way' as C++, and 'all three lean the other way' at the turn", () => {
        expect(lean(card(PICK.beats.same))).toBe(lean(card(PICK.beats.lime)));
        for (const k of PICK.beats.turn) expect([k, lean(card(k))]).toEqual([k, "senior"]);
    });

    it("'for these the live page gives the senior side as a share only': the five more languages have no senior count", () => {
        for (const k of PICK.beats.more) expect([k, card(k).s.jobs]).toEqual([k, null]);
    });

    it("leans five to entry level and five to senior, Java a point apart", () => {
        const by = (l: string) => PICK.deck.filter((c) => lean(c) === l).map((c) => c.name);
        expect(by("entry")).toEqual(["Python", "C++", "Git", "JavaScript", "C"]);
        expect(by("senior")).toEqual(["Distributed systems", "Kubernetes", "AWS", "TypeScript", "Go"]);
        expect(by("draw")).toEqual(["Java"]);
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("The first card."));
        expect(top).toContain("By the Glassbox team · the week of 12 October 2026");
        expect(top).toContain("This story keeps to one week, 12 October 2026.");
        expect(top).toMatch(/<a href="\/market\/entry-level-software">The entry level software page<\/a> starts a new count every Monday/);
    });

    it("dates every source line with the week", () => {
        const sources = h.match(/Source: Glassbox count, week of [^·]*·/g) ?? [];
        expect(sources.length).toBe(7);
        for (const s of sources) expect(s).toBe("Source: Glassbox count, week of 12 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("Eleven skills, one per card.");
        expect(h).toContain("we counted <strong>561 entry level software jobs</strong> at 196 employers, and read 559 of them");
        expect(h).toContain("29% against 14%, about twice the share.");
        // The card prints both sets; the caption names them once each (copy rewrite S5, 15 Oct 2026).
        expect(h).toContain("Python: 276 of the 559 entry level software jobs we read, and 803 of the 2,237 senior ones. Mentioned by jobs at 114 employers.");
        expect(h).toContain("Kubernetes: 69 and 559, which happens to match the entry level total.");
        expect(h).toContain("5 of the 11 cards lean to entry level: Python, C++, Git, JavaScript and C. 5 lean to senior: TypeScript, Go, distributed systems, Kubernetes and AWS. Java is a point apart.");
        expect(h).toContain("five are named more often in entry level software jobs and five in senior ones. One is a point apart.");
        expect(h).toContain("306 of the 328 software jobs with an early career title state no number of years.");
    });

    it("ends with the question, the CV button and how we counted, scope included", () => {
        expect(h).toContain("Curious how many of these skills are already on your CV?");
        // After the ask, the week once more in one short line; the fold says what "read" meant (copy rewrite S2, S9).
        expect(h).toMatch(/One week, 12 October 2026\. <a href="\/market\/entry-level-software">The entry level software page<\/a> counts again on Monday\./);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 559 ads long enough to read. The other 2 were too short.");
        expect(h).not.toMatch(/stays fixed to it|the live page|Skills are matched against/);
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*peek-button[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("How we counted");
        expect(h).toContain("What we can't see:");
    });

    it("draws the cover from the same numbers", () => {
        const svg = pickASideCover();
        expect(svg).toContain(">29%<");
        expect(svg).toContain(">164 jobs<");
        expect(svg).toContain("of 2,237 senior software jobs");
    });

    it("gives the hub its card line from the numbers", () => {
        expect(PICK_A_SIDE.card).toBe("C++ is named in 29% of entry level software jobs and 14% of senior ones.");
    });
});
