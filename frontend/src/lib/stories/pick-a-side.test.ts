import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

import {BACK_SRC, ICON} from "@/components/stories/pick-a-side/icons";
import PickASide from "@/components/stories/pick-a-side/PickASide";
import {pickASideCover} from "@/components/stories/covers/pick-a-side";
import {card, lean, PICK, PICK_A_SIDE, suit} from "./pick-a-side";

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

    it("deal every card once, each with a glyph in its medallion", () => {
        const dealt = [PICK.beats.first, PICK.beats.lime, PICK.beats.same, ...PICK.beats.turn, ...PICK.beats.more];
        expect([...dealt].sort()).toEqual(PICK.deck.map((c) => c.key).sort());
        for (const c of PICK.deck) expect(ICON[c.key], c.key).toBeTruthy();
    });
});

describe("the deck", () => {
    it("deals the seven charted languages as spades and the other four skills as clubs", () => {
        const spades = PICK.deck.filter((c) => suit(c) === "spade").map((c) => c.key);
        expect(spades).toEqual(PICK.charted.languages);
        expect(spades.length).toBe(7);
        expect(PICK.deck.filter((c) => suit(c) === "club").map((c) => c.name)).toEqual(["Git", "Distributed systems", "Kubernetes", "AWS"]);
    });

    it("'4 of them are named more often in entry level': the spades that lean to entry level", () => {
        expect(PICK.deck.filter((c) => suit(c) === "spade" && lean(c) === "entry").length).toBe(PICK.charted.leanEntry);
    });

    it("gives every card its own short rank for the corners", () => {
        const ranks = PICK.deck.map((c) => c.rank);
        expect(new Set(ranks).size).toBe(ranks.length);
        for (const r of ranks) expect(r, r).toMatch(/^[A-Z0-9+]{1,4}$/);
    });

    it("self hosts the CC0 back with its licence beside it, and keeps no foil", () => {
        const pub = join(__dirname, "..", "..", "..", "public");
        for (const f of ["back-blue.webp", "back-blue-share.png", "LICENSES.md", "CC0-1.0.txt"]) expect(existsSync(join(pub, "stories", "pick-a-side", f)), f).toBe(true);
        expect(existsSync(join(pub, BACK_SRC))).toBe(true);
        expect(readFileSync(join(pub, "stories", "pick-a-side", "LICENSES.md"), "utf8")).toContain("CC0 1.0");
        const dir = join(__dirname, "..", "..", "components", "stories", "pick-a-side");
        for (const f of readdirSync(dir)) expect([f, /foil|holograph/i.test(readFileSync(join(dir, f), "utf8"))]).toEqual([f, false]);
        expect(readFileSync(join(dir, "scratch.ts"), "utf8")).toMatch(/drawImage\(back/);
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

    it("'Python is the most named of the seven languages on both sides'", () => {
        const langs = PICK.charted.languages.map(card);
        const top = (side: "e" | "s") => [...langs].sort((a, b) => b[side].share - a[side].share)[0].key;
        expect([top("e"), top("s")]).toEqual([PICK.beats.first, PICK.beats.first]);
    });

    it("'they lean towards languages, and senior jobs lean towards systems'", () => {
        // Most charted languages lean to entry level; every systems card (the turn) leans to senior.
        expect(PICK.charted.leanEntry * 2).toBeGreaterThan(PICK.charted.languages.length);
        for (const k of PICK.beats.turn) expect(lean(card(k))).toBe("senior");
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("Start with the favourite."));
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
        expect(h).toContain("Eleven skills, one per card. Guess whether entry level or senior software jobs name it more, then scratch the panel.");
        expect(h).toContain("Spades are the seven languages the weekly page charts.");
        expect(h).toContain("Clubs are the other four skills.");
        expect(h).toContain("The weekly page charts 7 languages, the spades. 4 of them are named more often in entry level software jobs");
        expect(h).toContain("we counted <strong>561 entry level software jobs</strong> at 196 employers, and read 559 of them");
        expect(h).toContain("29% against 14%, about twice the share.");
        // The card prints both sets; the caption names them once each (copy rewrite S5, 15 Oct 2026).
        expect(h).toContain("Python: 276 of the 559 entry level software jobs we read, and 803 of the 2,237 senior ones. Mentioned by jobs at 114 employers.");
        expect(h).toContain("Kubernetes: 69 and 559, which happens to match the entry level total.");
        expect(h).toContain("5 of the 11 cards lean to entry level: Python, C++, Git, JavaScript and C. 5 lean to senior: TypeScript, Go, distributed systems, Kubernetes and AWS. Java is a point apart.");
        expect(h).toContain("five are named more often in entry level software jobs and five in senior ones. One is a point apart.");
        expect(h).toContain("306 of the 328 software jobs with an early career title state no number of years.");
        // The rewrite of 19 Oct 2026: the reader's question first, what the pattern is, what it can't show.
        expect(h).toContain("Do entry level jobs just ask for less than senior ones? Eleven cards to find out.");
        expect(h).toContain("238 of the 561 entry level jobs are internships.");
        expect(h).toContain("Python is the most named of the seven languages on both sides.");
        expect(h).toContain("The jobs show that it leans. They don't say why.");
        expect(h).toContain("Here the languages split: JavaScript and C lean to entry level, TypeScript and Go to senior, and Java is a point apart.");
        expect(h).toContain("They lean towards languages, and senior jobs lean towards systems.");
        expect(h).toContain("or why C++ leans to entry level.");
        expect(h).toContain("So, which side have you been preparing for?");
        expect(h).not.toMatch(/It is a different list\.|entry level list|senior list/);
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
        expect(h).toMatch(/The cards are the English pattern deck from <a href="https:\/\/commons\.wikimedia\.org\/wiki\/File:English_pattern_playing_cards_deck_PLUS_CC0\.svg">Wikimedia Commons<\/a>, dedicated to the public domain \(CC0\)/);
    });

    it("deals real cards: corners, the panel's two numbers, the betting spots under the card", () => {
        expect(h).toContain("<b>C++</b>");
        expect(h).toContain("164 of 559");
        expect(h).toContain("306 of 2,237");
        expect(h).toMatch(/share only/);
        // the pen note sits on the page beside the lime table, not on the card or the cloth
        expect(h).toMatch(/<\/div><\/div><p class="[^"]*note[^"]*pen[^"]*" aria-hidden="true">at 65 employers, so not one company's habit<\/p>/);
        expect(h).not.toMatch(/foil/i);
    });

    it("draws the cover from the same numbers", () => {
        const svg = pickASideCover();
        expect(svg).toContain(">29%<");
        expect(svg).toContain(">14%<");
        expect(svg).toContain(">164 of 559<");
        expect(svg).toContain(">306 of 2,237<");
        expect(svg).toContain(`href="${BACK_SRC}"`);
        expect(svg).not.toMatch(/Foil|#f5532a/);
    });

    it("gives the hub its card line from the numbers", () => {
        expect(PICK_A_SIDE.card).toBe("C++ is named in 29% of entry level software jobs and 14% of senior ones.");
    });
});
