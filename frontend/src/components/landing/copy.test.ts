import {describe, expect, it} from "vitest";

import {Ask, ASK, stickyLine} from "@/lib/cv-ask";
import {pasteBody} from "@/lib/landing/ad";
import {ABOUT_PAGE, FEATURES, NAV, PRODUCT_PAGE} from "@/lib/site-copy";
import {COPY, TRUST} from "./copy";

/* The founder's honesty rules for the landing copy (2026-10-05). */

const strings = (v: unknown): string[] => typeof v === "string" ? [v]
    : typeof v === "function" ? strings((v as (...a: unknown[]) => unknown)(7, "70", "backend", "junior"))
        : Array.isArray(v) ? v.flatMap(strings)
            // Ids, file names and paths are not words on the page.
            : v && typeof v === "object" ? Object.entries(v).filter(([k]) => !["id", "name", "href"].includes(k)).flatMap(([, x]) => strings(x)) : [];
// The CV ask's words (lib/cv-ask.ts), filled in as a page fills them.
const ask: Ask = {skills: [{key: "python", name: "Python"}, {key: "go", name: "Go"}], what: "skills entry level software jobs name most", jobs: 135, subject: "entry level software"};
const S = ASK.sheet;
const askCopy = [
    ...strings({...ASK, sub: ASK.sub(ask), line: ASK.line(ask), done: [ASK.done(1), ASK.done(9)], sheet: null, errors: ASK.errors}),
    ...strings({...S, title: [S.title(ask), S.title(null)], line: [S.line(ask), S.line(null)], steps: [S.steps(ask), S.steps(null)],
        reuseStep: [S.reuseStep(ask), S.reuseStep(null)], result: S.result(9, 15), resultLine: S.resultLine(ask), example: S.example(10).line}),
    ...[stickyLine({kind: "page", n: 15}), stickyLine({kind: "count", ask}), stickyLine({kind: "ad", n: 5})].map((l) => l.join(" ")),
];
const all = [...strings(COPY), ...strings(FEATURES.map(({title, nav, body}) => ({title, nav, body}))), ...strings(NAV), ...strings(PRODUCT_PAGE), ...strings(ABOUT_PAGE), ...askCopy];

describe("landing copy", () => {
    it("keeps the trust line word for word where the CV is asked for", () => {
        const line = "We read your CV for the skills. We keep the skills, not the file. Delete them any time.";
        expect(TRUST.join(" ")).toBe(line);
        expect(COPY.cv.trust.map((t) => t.body).join(" ")).toBe(line);
        expect(ASK.sheet.trust.join(" ")).toBe(line);
    });

    it("makes no unmeasured claims", () => {
        for (const s of all) {
            expect(s).not.toMatch(/\b\d+\s*seconds?\b/i);
            expect(s).not.toMatch(/94\s*%/);
        }
    });

    it("has no em dashes, hyphenated asides or banned phrases", () => {
        for (const s of all) {
            expect(s).not.toMatch(/—/);
            if (!s.startsWith("/")) expect(s).not.toMatch(/[a-z]-[a-z]/i);  // links are paths, not words
            expect(s).not.toMatch(/\b(next step|start here|learn next|1st)\b/i);
            expect(s).not.toMatch(/\bpostings?\b/i);
            expect(s).not.toMatch(/\b(join|put yourself|recommended for you)\b/i);
            expect(s).not.toMatch(/!/);
        }
    });

    it("keeps what a CV gets you to nine words each", () => {
        for (const p of COPY.lower.get.points) expect(p.body.split(" ").length).toBeLessThanOrEqual(9);
    });

    it("keeps button labels short and the sticky button fixed", () => {
        for (const label of [COPY.sticky.cta, COPY.sticky.signUp, COPY.cv.cta, COPY.cv.signUp, ASK.cta, S.choosePhone, S.chooseDesk, S.reuse, S.seeThem, S.keep]) {
            expect(label.split(" ").length).toBeLessThanOrEqual(3);
        }
        expect(COPY.sticky.cta).toBe(COPY.cv.cta);
        expect(COPY.cv.cta).toBe(ASK.cta);
    });

    it("asks about what the visitor just looked at, as a question mark over a count", () => {
        expect(stickyLine({kind: "page", n: 15}).join(" ")).toBe("? of 15 skills here on your CV");
        expect(stickyLine({kind: "count", ask: {...ask, what: "skills backend jobs ask for most"}}).join(" "))
            .toBe("? of the 2 skills backend jobs ask for most are on your CV");
        expect(stickyLine({kind: "ad", n: 5}).join(" ")).toBe("? of the 5 asks in this ad are on your CV");
    });

    it("asks for a CV by what the visitor gains, never as data collection", () => {
        for (const s of askCopy) expect(s).not.toMatch(/\b(upload|submit|data|join|sign up now)\b/i);
        expect(ASK.question).toBe("How many of these are on your CV?");
        expect(S.result(9, 15)).toBe("9 of 15");
        expect(S.resultLine(ask)).toBe("of the skills entry level software jobs name most are on your CV.");
    });

    it("shows the live count, or no number at all", () => {
        expect(COPY.hero.eyebrow("3,035")).toBe("3,035 jobs open today");
        expect(COPY.hero.eyebrow(null)).toBe("Jobs open today");
    });

    it("names the level in the count sentence", () => {
        expect(COPY.count.say(6, "114", "backend", "junior")).toBe("6 of the 114 backend jobs open today are junior roles.");
        expect(COPY.count.say(1, "114", "backend", "mid")).toBe("1 of the 114 backend jobs open today is mid level.");
        expect(COPY.count.say(0, "114", "backend", "senior")).toBe("None of the 114 backend jobs open today are senior or above.");
    });
});

describe("pasteBody", () => {
    it("reads a lone link from the link and anything else as text", () => {
        expect(pasteBody("  https://jobs.example.com/123 ")).toEqual({url: "https://jobs.example.com/123"});
        expect(pasteBody("Senior Engineer\r\nhttps://jobs.example.com/123")).toEqual({text: "Senior Engineer\nhttps://jobs.example.com/123"});
        expect(pasteBody("ftp://x.example/1")).toEqual({text: "ftp://x.example/1"});
    });
});
