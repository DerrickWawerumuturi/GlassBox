import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

import FIXTURE from "@/lib/market-story.fixture.json";

/*
 * /market as rendered (GitHub issue #16): Latest is the view a visitor sees
 * first, the cards newest first in the page itself (so without script too),
 * each dated; "By job type" moves them by CSS order, the CV card fifth in both.
 */

vi.mock("@/lib/landing/look-server", () => ({allMarkets: async () => FIXTURE, keepLastPage: () => false}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: () => {}})}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: () => {}, scanning: false, sheet: null})}));
// next/font is the compiler's: outside a build it throws.
vi.mock("next/font/local", () => ({default: () => ({className: "", variable: "", style: {}})}));

import MarketHub from "@/app/market/page";

const render = async () => renderToStaticMarkup(await MarketHub()).replace(/<!-- -->/g, "");

describe("the hub, as a visitor first sees it", () => {
    it("has Latest pressed, then By job type", async () => {
        const chips = [...(await render()).matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>.*?<span>([^<]+)<\/span><\/button>/g)].map((m) => [m[2], m[1]]);
        expect(chips.slice(0, 2)).toEqual([["Latest", "true"], ["By job type", "false"]]);
        expect(await render()).toContain("data-order=\"latest\"");
    });

    it("lists the stories newest first, each with its date", async () => {
        const h = await render();
        const cards = [...h.matchAll(/<li class="[^"]*" data-kind="(\w+)" style="--type:(\d+)">[\s\S]*?<\/li>/g)];
        const titles = cards.map((m) => m[0].match(/<h2><a href="([^"]+)"/)?.[1]);
        expect(titles.slice(0, 3)).toEqual(["/market/ai/ai-on-your-cv", "/market/entry-level-software/is-entry-level-dead", "/market/entry-level-software/pick-a-side"]);
        expect(cards[0][0]).toMatch(/<time class="[^"]+" dateTime="2026-10-21">21 Oct 2026<\/time>/);
        expect(cards[1][0]).toMatch(/<time class="[^"]+" dateTime="2026-10-19">19 Oct 2026<\/time>/);
        // Each card keeps its place by job type: the first story there is the entry level page's newest.
        expect(cards[1][2]).toBe("0");
        // The CV card is fifth in the page, and fifth by job type.
        const items = [...h.matchAll(/<li class="[^"]*" data-kind="(\w+)"/g)].map((m) => m[1]);
        expect(items[4]).toBe("cv");
        expect(h).toContain("data-kind=\"cv\" style=\"--type:4\"");
    });
});
