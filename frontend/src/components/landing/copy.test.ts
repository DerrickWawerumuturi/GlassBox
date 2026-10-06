import {describe, expect, it} from "vitest";

import {pasteBody} from "@/lib/landing/ad";
import {ABOUT_PAGE, FEATURES, NAV, PRODUCT_PAGE} from "@/lib/site-copy";
import {COPY, TRUST} from "./copy";

/* The founder's honesty rules for the landing copy (2026-10-05). */

const strings = (v: unknown): string[] => typeof v === "string" ? [v]
    : typeof v === "function" ? strings((v as (...a: unknown[]) => unknown)(7, "70", "backend", "junior"))
        : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
const all = [...strings(COPY), ...strings(FEATURES.map(({title, nav, body}) => ({title, nav, body}))), ...strings(NAV), ...strings(PRODUCT_PAGE), ...strings(ABOUT_PAGE)];

describe("landing copy", () => {
    it("keeps the trust line word for word where the CV is asked for", () => {
        const line = "We read your CV for the skills. We keep the skills, not the file. Delete them any time.";
        expect(TRUST.join(" ")).toBe(line);
        expect(COPY.cv.trust.map((t) => t.body).join(" ")).toBe(line);
        expect(TRUST).toContain(COPY.sticky.small);
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
        for (const label of [COPY.sticky.cta, COPY.sticky.signUp, COPY.cv.cta, COPY.cv.signUp]) expect(label.split(" ").length).toBeLessThanOrEqual(3);
        expect(COPY.sticky.cta).toBe(COPY.cv.cta);
    });

    it("asks about what the visitor just looked at", () => {
        expect(COPY.sticky.line({kind: "default"})).toBe("See where you stand.");
        expect(COPY.sticky.line({kind: "count", n: 1234})).toBe("Where would you sit among these 1,234?");
        expect(COPY.sticky.line({kind: "ad", n: 5})).toBe("5 asks in this ad. Which are yours?");
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
