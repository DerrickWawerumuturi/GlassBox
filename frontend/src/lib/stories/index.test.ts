import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {Rail} from "@/components/market-page/StoryEnd";
import FIXTURE from "@/lib/market-story.fixture.json";
import {hubCards} from "@/lib/market-hub";
import type {MarketBody} from "@/lib/market-pages";
import {ctx} from "@/lib/market-story";
import {PUBLIC_PATHS} from "@/lib/seo";
import {storiesFor} from "@/lib/stories";

/*
 * A market page may have more than one story (the entry level page has two
 * since 19 Oct 2026, the AI page since 21 Oct): its live page links each one, the hub has a card for
 * each, and search lists each, after its page. None may be dropped.
 */

const BOTH = ["/market/entry-level-software/is-entry-level-dead", "/market/entry-level-software/pick-a-side"];
const AI = ["/market/ai/ai-on-your-cv", "/market/ai/contents-may-vary"];

describe("a page with two stories", () => {
    it("has both, newest first", () => {
        expect(storiesFor("entry-level-software").map((s) => s.slug)).toEqual(["is-entry-level-dead", "pick-a-side"]);
        expect(storiesFor("ai").map((s) => s.slug)).toEqual(["ai-on-your-cv", "contents-may-vary"]);
        expect(storiesFor("devops").map((s) => s.slug)).toEqual(["within-eleven-jobs"]);
    });

    it("links both from its live page's rail", () => {
        const html = renderToStaticMarkup(createElement(Rail, {c: ctx("entry-level-software", FIXTURE["entry-level-software"] as unknown as MarketBody), others: {}}));
        for (const path of BOTH) expect(html).toContain(`href="${path}"`);
        expect(html.match(/a story fixed to the week of/g)?.length).toBe(2);
    });

    it("links both AI stories from the AI page's rail, the new one first (21 Oct 2026)", () => {
        const html = renderToStaticMarkup(createElement(Rail, {c: ctx("ai", FIXTURE.ai as unknown as MarketBody), others: {}}));
        const at = AI.map((path) => html.indexOf(`href="${path}"`));
        expect(at.every((i) => i >= 0)).toBe(true);
        expect(at[0]).toBeLessThan(at[1]);
    });

    it("gets a hub card and a sitemap entry for each", () => {
        const cards = hubCards({}).map((c) => c.href);
        for (const path of [...BOTH, ...AI]) {
            expect(cards).toContain(path);
            expect(PUBLIC_PATHS).toContain(path);
        }
    });
});
