import {describe, expect, it} from "vitest";

import {Ask, ASK, marketWhat} from "@/lib/cv-ask";
import {pasteBody} from "@/lib/landing/ad";
import {ABOUT_PAGE, NAV, PRODUCT_PAGE} from "@/lib/site-copy";
import {COPY, TRUST} from "./copy";

/* The founder's honesty rules for the landing copy (2026-10-05). */

const strings = (v: unknown): string[] => typeof v === "string" ? [v]
    : typeof v === "function" ? strings((v as (...a: unknown[]) => unknown)(7, "70", "backend", "junior"))
        : Array.isArray(v) ? v.flatMap(strings)
            // Ids, file names and paths are not words on the page.
            : v && typeof v === "object" ? Object.entries(v).filter(([k]) => !["id", "name", "href"].includes(k)).flatMap(([, x]) => strings(x)) : [];
// The CV ask's words (lib/cv-ask.ts), filled in as a page fills them.
const ask: Ask = {skills: [{key: "python", name: "Python"}, {key: "go", name: "Go"}], what: marketWhat("entry level software"), jobs: 135, subject: "entry level software"};
const S = ASK.sheet;
const askCopy = [
    ...strings({...ASK, lead: ASK.lead(ask), sub: ASK.sub(ask), done: [ASK.done(1), ASK.done(9)], sheet: null, errors: ASK.errors}),
    ...strings({...S, title: [S.title(ask), S.title(null)], line: [S.line(ask), S.line(null)], steps: [S.steps(ask), S.steps(null)],
        reuseStep: [S.reuseStep(ask), S.reuseStep(null)], result: S.result(9, 15), resultLine: S.resultLine(ask), example: S.example.line, trust: [S.trust(false), S.trust(true)]}),
];
const all = [...strings(COPY), ...strings(NAV), ...strings(PRODUCT_PAGE), ...PRODUCT_PAGE.chapters.map((c) => c.name), ...strings(ABOUT_PAGE), ...askCopy];

describe("landing copy", () => {
    it("keeps the trust line word for word where the CV is asked for, true with or without an account", () => {
        const line = "We read your CV for the skills. With an account, we keep the skills, never the file. Delete them any time.";
        expect(TRUST.join(" ")).toBe(line);
        expect(COPY.cv.trust.map((t) => t.body).join(" ")).toBe(line);
        // "We keep the skills" said to everyone was untrue without an account (docs/local/home-audit.html, E4).
        expect(TRUST.join(" ")).not.toMatch(/^We keep|\. We keep/);
    });

    it("puts the founder's words on the first screen: one subtitle, one button, no line under it", () => {
        expect(COPY.hero.lede).toBe("Each week we count which skills thousands of tech jobs ask for, and how many of them you already have.");
        expect(ASK.compare).toBe("Compare your CV");
        // Founder, 13 Oct: the lines under the CV buttons were too much text. The facts live in the sheet.
        expect(ASK).not.toHaveProperty("compareSmall");
        expect(COPY.inside).not.toHaveProperty("lead");
    });

    it("never asks \"? of N\" before a scan (founder, 12 Oct 2026: it means nothing to someone new)", () => {
        for (const s of all) expect(s).not.toMatch(/\?\s*of\b/);
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

    it("keeps button labels short", () => {
        for (const label of [COPY.cv.cta, COPY.cv.signUp, ASK.compare, S.choosePhone, S.chooseDesk, S.reuse, S.seeThem, S.keep]) {
            expect(label.split(" ").length).toBeLessThanOrEqual(3);
        }
    });

    it("asks for a CV by what the visitor gains, never as data collection", () => {
        for (const s of askCopy) expect(s).not.toMatch(/\b(upload|submit|data|join|sign up now)\b/i);
        expect(S.result(9, 15)).toBe("9 of 15");
        expect(S.resultLine(ask)).toBe("of the 2 skills entry level software jobs mention most are already on your CV.");
    });

    it("shows this week's published count, or no number at all", () => {
        expect(COPY.hero.eyebrow("4,768")).toBe("4,768 tech jobs counted this week");
        expect(COPY.hero.eyebrow(null)).toBe("Tech jobs counted this week");
        expect(COPY.count.kicker("5 Oct")).toBe("Counted in the week of 5 Oct");
    });

    it("names the level in the count sentence", () => {
        // The kicker above it carries the week (copy rewrite H3, 15 Oct 2026).
        expect(COPY.count.say(6, "114", "backend", "junior")).toBe("6 of the 114 backend jobs are junior roles.");
        expect(COPY.count.say(1, "114", "backend", "mid")).toBe("1 of the 114 backend jobs is mid level.");
        expect(COPY.count.say(0, "114", "backend", "senior")).toBe("None of the 114 backend jobs are senior or above.");
    });

    it("never calls the weekly count today's", () => {
        // The CV scan and Opportunities read the live pool and keep "today's jobs"; the count the page shows is weekly.
        const market = [COPY.meta, COPY.hero, COPY.hiring, COPY.count, COPY.wall, COPY.inside, COPY.lower.how, COPY.footer];
        const text = JSON.stringify(market) + [COPY.hero.eyebrow("1"), COPY.count.kicker("x"), COPY.count.say(1, "2", "b", "junior"),
            COPY.wall.allLit("1", "a", "b"), COPY.wall.more("1", "b"), COPY.glass.oneOfToday("a", "b"), COPY.glass.readToday("1"),
            COPY.glass.rarest("a", 1, "2", "b"), COPY.inside.market("1", "b")].join(" ");
        expect(text).not.toMatch(/\btoday|open today/i);
    });
});

describe("words for a first time reader (copy rewrite, founder, 15 Oct 2026)", () => {
    it("gives the weekly publication one name, never \"the count\" alone or \"live\"", () => {
        expect(COPY.lower.how.lead).toBe("Four steps make the weekly count. Your CV is the fifth, and makes it about you.");
        expect(PRODUCT_PAGE.count.title).toBe("The weekly count");
        expect(COPY.wall.title).toBe("The jobs behind the squares");
        for (const s of all) {
            expect(s).not.toMatch(/(behind|in|from|back to) (the|this week's) count/i);
            expect(s).not.toMatch(/live count/i);
            expect(s).not.toMatch(/we could read/i);
        }
    });

    it("says what the home page's scan runs on, and why the count is weekly", () => {
        expect(COPY.cv.line).toBe("Your scan runs on the latest jobs, not the Monday count, and marks every skill you already have.");
        const weekly = COPY.lower.faq.items.find((i) => i.q === "Why once a week?");
        expect(weekly?.a).toBe("Jobs are read every six hours, but one count a week, dated, is big enough to trust and stays put until the next Monday.");
    });

    it("asks the market pages' CV question beside the button, with how many skills it is about", () => {
        expect(ASK.lead(ask)).toBe("Curious how many of the 2 skills these jobs ask for most are already on your CV?");
        expect(S.title(ask)).toBe("How many of these 2 are on your CV?");
        expect(NAV.withCv).toBe(ASK.compare);
    });
});

describe("pasteBody", () => {
    it("reads a lone link from the link and anything else as text", () => {
        expect(pasteBody("  https://jobs.example.com/123 ")).toEqual({url: "https://jobs.example.com/123"});
        expect(pasteBody("Senior Engineer\r\nhttps://jobs.example.com/123")).toEqual({text: "Senior Engineer\nhttps://jobs.example.com/123"});
        expect(pasteBody("ftp://x.example/1")).toEqual({text: "ftp://x.example/1"});
    });
});
