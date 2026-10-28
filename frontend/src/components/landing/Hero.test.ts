import {readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// Before a scan: the visitor has no skills yet (the real hook reads the app's scan store).
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
// The market page's sheet and scan need the app's stores; the button is what is tested here.
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import {Ask, ASK} from "@/lib/cv-ask";
import {COPY} from "./copy";
import Hero from "./Hero";

const ask: Ask = {skills: Array.from({length: 10}, (_, i) => ({key: `s${i}`, name: `S${i}`})), what: "skills backend jobs ask for most", jobs: 304, subject: "backend"};
// The phone handoff under the button (founder, 16 Oct 2026) shows only on a phone or tablet (cv-ask/handoff.css, tested in
// lib/cv-handoff.test.ts), so the desktop's "nothing under it" is checked without it.
const HANDOFF = /<div class="cv-handoff[^"]*">[\s\S]*?role="status"[^>]*>[^<]*<\/span><\/div>/g;
const raw = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
const html = (el: ReturnType<typeof createElement>) => raw(el).replace(HANDOFF, "");
const hero = (a: Ask | null) => html(createElement(Hero, {total: "9,722", ask: a, scanning: false, onFind: () => {}}));
// A button's label, past the peek glyph that may sit before it.
const buttons = (h: string) => [...h.matchAll(/<button[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?([^<]*)<\/button>/g)].map((m) => m[1]);
// The button closes its wrapper: no line, not even an empty one, after it.
const nothingUnder = (h: string) => /Compare your CV<\/button><\/div>/.test(h);
// Founder's pick, 13 Oct 2026 (issue #6): the box O glyph before the label, the dot under the rim, in a `peek` button.
const peeks = (h: string) => /<button[^>]*class="[^"]*\bpeek\b[^"]*"[^>]*><svg class="peek-glyph[^"]*"[^>]*><circle class="peek-dot"[^>]*><\/circle><rect[^>]*><\/rect><\/svg>Compare your CV<\/button>/.test(h);

describe("the hero", () => {
    it("is the headline, one subtitle and one button, with nothing under it (founder, 13 Oct)", () => {
        const h = hero(ask);
        expect(h).toContain(COPY.hero.title);
        expect(h).toContain(COPY.hero.lede);
        expect(buttons(h)).toEqual(["Compare your CV"]);
        expect(nothingUnder(h)).toBe(true);
        expect(raw(createElement(Hero, {total: "9,722", ask, scanning: false, onFind: () => {}}))).not.toContain(`class="cv-handoff"`);
        expect(peeks(h)).toBe(true);
        expect(h).not.toContain("Free. No account needed.");
        expect(h).not.toMatch(/\?\s*of\b/);
        expect(h).not.toContain("Find out");
    });

    it("writes the button in white on the orange, past the landing's inherited colour (founder, 12 Oct)", () => {
        expect(hero(ask)).toMatch(/<button[^>]*class="[^"]*\bcv-compare\b[^"]*\btext-white\b[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV</);
        const css = readFileSync(join(__dirname, "landing.css"), "utf8");
        expect(css).toMatch(/\.la button\.cv-compare\s*\{\s*color:\s*#fff;/);
    });

    it("says only that it is reading while a scan runs", () => {
        const h = html(createElement(Hero, {total: "9,722", ask, scanning: true, onFind: () => {}}));
        expect(h).toContain(`<p class="m-0 font-mono text-[12px] text-muted-foreground" role="status">${ASK.reading}</p>`);
    });

    it("without this week's count has nothing to compare with, so shows only the words", () => {
        const h = hero(null);
        expect(h).toContain(COPY.hero.title);
        expect(buttons(h)).toEqual([]);
    });
});

describe("a market page before a scan", () => {
    it("shows the same button, with nothing under it, in place of the old question", () => {
        const h = html(createElement(MarketAskProvider, {ask, page: "entry-level-software", children: createElement(MarketCvAsk)}));
        expect(buttons(h)).toEqual([ASK.compare]);
        expect(nothingUnder(h)).toBe(true);
        expect(peeks(h)).toBe(true);
        expect(h).not.toMatch(/\?\s*of\b/);
        expect(h).not.toContain("How many of these are on your CV?");
    });

    it("on a market page puts its question beside the button, above it, and still nothing under it (founder's yes, 15 Oct 2026)", () => {
        const h = html(createElement(MarketAskProvider, {ask, page: "entry-level-software", children: createElement(MarketCvAsk, {lead: true})}));
        expect(h).toMatch(/<p[^>]*>Curious how many of the 10 skills these jobs ask for most are already on your CV\?<\/p><div[^>]*><button/);
        expect(buttons(h)).toEqual([ASK.compare]);
        expect(nothingUnder(h)).toBe(true);
    });
});

describe("no page asks \"? of N\" before a scan", () => {
    // Founder, 12 Oct 2026: the question means nothing to someone who hasn't used the app.
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
    });
    it("no component or page writes it", () => {
        const src = join(__dirname, "..", "..");
        const hits = files(src).filter((f) => /[`"'>]\?\s*of\b|\?\? "\?"/.test(readFileSync(f, "utf8")));
        expect(hits).toEqual([]);
    });
});
