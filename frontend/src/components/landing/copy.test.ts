import {describe, expect, it} from "vitest";

import {Ask, ASK} from "@/lib/cv-ask";
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
    ...strings({...ASK, sub: ASK.sub(ask), done: [ASK.done(1), ASK.done(9)], sheet: null, errors: ASK.errors}),
    ...strings({...S, title: [S.title(ask), S.title(null)], line: [S.line(ask), S.line(null)], steps: [S.steps(ask), S.steps(null)],
        reuseStep: [S.reuseStep(ask), S.reuseStep(null)], result: S.result(9, 15), resultLine: S.resultLine(ask), example: S.example.line, trust: [S.trust(false), S.trust(true)]}),
];
const all = [...strings(COPY), ...strings(FEATURES.map(({title, nav, body}) => ({title, nav, body}))), ...strings(NAV), ...strings(PRODUCT_PAGE), ...strings(ABOUT_PAGE), ...askCopy];

describe("landing copy", () => {
    it("keeps the trust line word for word where the CV is asked for, true with or without an account", () => {
        const line = "We read your CV for the skills. With an account, we keep the skills, never the file. Delete them any time.";
        expect(TRUST.join(" ")).toBe(line);
        expect(COPY.cv.trust.map((t) => t.body).join(" ")).toBe(line);
        // "We keep the skills" said to everyone was untrue without an account (docs/local/home-audit.html, E4).
        expect(TRUST.join(" ")).not.toMatch(/^We keep|\. We keep/);
    });

    it("puts the founder's words on the first screen: one subtitle, one button, the three facts", () => {
        expect(COPY.hero.lede).toBe("We count the skills tech jobs ask for each week and mark the ones on your CV.");
        expect(ASK.compare).toBe("Compare your CV");
        expect(ASK.compareSmall).toBe("Free. No account needed. Your PDF is deleted after reading.");
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
        expect(S.resultLine(ask)).toBe("of the skills entry level software jobs name most are on your CV.");
    });

    it("shows this week's published count, or no number at all", () => {
        expect(COPY.hero.eyebrow("4,768")).toBe("4,768 tech jobs counted this week");
        expect(COPY.hero.eyebrow(null)).toBe("Tech jobs counted this week");
        expect(COPY.count.kicker("5 Oct")).toBe("Counted in the week of 5 Oct");
    });

    it("names the level in the count sentence", () => {
        expect(COPY.count.say(6, "114", "backend", "junior")).toBe("6 of the 114 backend jobs counted this week are junior roles.");
        expect(COPY.count.say(1, "114", "backend", "mid")).toBe("1 of the 114 backend jobs counted this week is mid level.");
        expect(COPY.count.say(0, "114", "backend", "senior")).toBe("None of the 114 backend jobs counted this week are senior or above.");
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

describe("pasteBody", () => {
    it("reads a lone link from the link and anything else as text", () => {
        expect(pasteBody("  https://jobs.example.com/123 ")).toEqual({url: "https://jobs.example.com/123"});
        expect(pasteBody("Senior Engineer\r\nhttps://jobs.example.com/123")).toEqual({text: "Senior Engineer\nhttps://jobs.example.com/123"});
        expect(pasteBody("ftp://x.example/1")).toEqual({text: "ftp://x.example/1"});
    });
});
