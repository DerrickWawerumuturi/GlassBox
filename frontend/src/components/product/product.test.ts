import {readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

import LOOK from "@/lib/landing/look.fixture.json";
import type {Look} from "@/lib/landing/look";

// The page reads the published count from the database (never the API); here, the fixture or nothing.
const published = vi.hoisted(() => ({look: null as unknown}));
vi.mock("@/lib/landing/look-server", () => ({lookForPage: async () => published.look}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: () => {}})}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: () => {}, scanning: false, sheet: null})}));
// next/font is the compiler's: outside a build it throws.
vi.mock("next/font/local", () => ({default: () => ({className: "", variable: "", style: {}})}));

import ProductPage from "@/app/(public)/product/page";
import {countReceipt} from "@/lib/product-count";
import {FEATURES, PRODUCT_PAGE} from "@/lib/site-copy";

const render = async (look: unknown) => {
    published.look = look;
    return renderToStaticMarkup(await ProductPage()).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
};
const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// Every /product#anchor the site links to, in code: the landing's What you get links come from FEATURES.
function productLinks(dir = join(__dirname, "..", "..")): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return productLinks(path);
        if (!/\.tsx?$/.test(name) || name.includes(".test.")) return [];
        return [...readFileSync(path, "utf8").matchAll(/\/product#([a-z-]+)/g)].map((m) => m[1]);
    });
}

describe("/product's chapters", () => {
    it("are the five parts in order, the first named Market charts (the header's Market is /market)", () => {
        expect(PRODUCT_PAGE.chapters.map((c) => [c.id, c.name])).toEqual([
            ["market-charts", "Market charts"], ["your-skills", "Your skills"], ["opportunities", "Opportunities"],
            ["applications", "Applications"], ["your-cv", "Your CV and privacy"]]);
        expect(FEATURES.map((f) => f.id)).toEqual(["market-charts", "your-skills", "opportunities", "applications"]);
    });

    it("keep every anchor the page had, so old links still land, and the chips point at them", async () => {
        const html = await render(LOOK);
        const on = ids(html);
        for (const id of ["market", "market-charts", "your-skills", "opportunities", "applications", "your-cv"]) expect(on, id).toContain(id);
        const chips = [...html.matchAll(/<a [^>]*href="#([^"]+)"/g)].map((m) => m[1]);
        expect(chips).toEqual(PRODUCT_PAGE.chapters.map((c) => c.id));
        for (const id of [...FEATURES.map((f) => f.id), ...productLinks()]) expect(on, `/product#${id}`).toContain(id);
    });

    it("show a screenshot per page, each theme its own, and draw the CV chapter", async () => {
        const html = await render(LOOK);
        for (const name of ["market-demand", "skills", "opportunities", "applications"]) {
            for (const theme of ["light", "dark"]) {
                expect(html).toContain(`crop%2F${name}-desktop-${theme}.webp`);
                expect(html).toContain(`crop%2F${name}-phone-${theme}.webp`);
            }
        }
        expect(html).not.toMatch(/upload-(desktop|phone)/);
        expect(html).toContain(`aria-label="${PRODUCT_PAGE.drawn.cvLabel}"`);
    });
});

describe("The count", () => {
    const look = LOOK as unknown as Look;
    const backend = look.families.backend;
    const [key, n] = Object.entries(backend.skills).sort((a, b) => b[1] - a[1])[0];
    const total = Object.values(look.families).reduce((s, f) => s + f.jobs, 0);

    it("reads the published count, every number naming what it counts", async () => {
        expect(countReceipt(look)).toEqual({
            week: "2026-10-05", when: "week of 5 October 2026", total: total.toLocaleString("en"),
            jobs: `tech jobs this week, across ${Object.keys(look.families).length} job types`,
            lines: [`${look.skills[key]} is the skill backend jobs ask for most: ${n} of ${backend.readable} this week.`],
        });
        const words = text(await render(LOOK));
        // One sentence joins the scan's jobs above to every job on the receipt (copy rewrite R3, 15 Oct 2026).
        expect(words).toContain(`The weekly count week of 5 October 2026 ${PRODUCT_PAGE.count.note} ${total.toLocaleString("en")} tech jobs this week, across 13 job types`);
        expect(words).toContain(`most: ${n} of ${backend.readable} this week.`);
    });

    it("without a count shows no numbers, only where to read more", async () => {
        expect(countReceipt(null)).toBeNull();
        expect(countReceipt({...look, families: {qa: look.families.qa}})).toBeNull();
        const html = await render(null);
        const card = html.match(/<aside [^>]*aria-label="The weekly count".*?<\/aside>/)![0];
        expect(text(card).trim()).toBe(`The weekly count ${PRODUCT_PAGE.count.note} The week in tech jobs How Glassbox counts`);
        expect(card).toMatch(/href="\/market".*href="\/method"/);
    });
});
