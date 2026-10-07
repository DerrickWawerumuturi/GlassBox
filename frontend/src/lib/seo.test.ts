import {describe, expect, it} from "vitest";

import FIXTURE from "./market-story.fixture.json";
import {FIRST_PUBLISHED, MARKET_PAGES, MarketBody} from "./market-pages";
import {homeStructuredData, marketStructuredData, PUBLIC_PATHS, publicPage, rootMetadata, sitemapEntries} from "./seo";
import {SITE_URL} from "./site";

describe("canonicals", () => {
    it("are never set at the root, so app pages and the 404 don't claim to be /", () => {
        expect(rootMetadata.alternates).toBeUndefined();
        expect(rootMetadata.openGraph).not.toHaveProperty("url");
    });

    it("are each public page's own path, with og:url to match", () => {
        for (const path of PUBLIC_PATHS) {
            const meta = publicPage(path, {title: "T", description: "D"});
            expect(meta.alternates?.canonical).toBe(path);
            expect(meta.openGraph).toMatchObject({url: path});
        }
    });
});

describe("share previews", () => {
    it("keep the image, site name and large card when a page sets its own title", () => {
        const meta = publicPage("/", {title: "T", description: "D", share: {title: "Share", description: "Why"}});
        expect(meta.openGraph).toMatchObject({type: "website", siteName: "Glassbox", title: "Share", description: "Why"});
        expect(JSON.stringify(meta.openGraph)).toContain("/opengraph-image");
        expect(meta.twitter).toMatchObject({card: "summary_large_image", title: "Share", images: ["/opengraph-image"]});
    });

    it("name no image for a page with its own, so Next uses that one for both cards", () => {
        const meta = publicPage("/market/entry-level-software", {title: "T", description: "D", ownImage: true});
        expect(meta.openGraph).not.toHaveProperty("images");
        expect(meta.twitter).not.toHaveProperty("images");
        expect(meta.openGraph).toMatchObject({siteName: "Glassbox", url: "/market/entry-level-software"});
    });
});

describe("sitemap", () => {
    it("lists the public pages only, with no invented dates or priorities", () => {
        const urls = sitemapEntries().map((e) => e.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/product`, `${SITE_URL}/about`, `${SITE_URL}/privacy`, `${SITE_URL}/your-cv`,
            `${SITE_URL}/market`, `${SITE_URL}/market/entry-level-software`, `${SITE_URL}/market/software-engineering`,
            `${SITE_URL}/market/ai`, `${SITE_URL}/market/machine-learning`, `${SITE_URL}/market/devops`, `${SITE_URL}/method`]);
        for (const entry of sitemapEntries()) expect(Object.keys(entry)).toEqual(["url"]);
    });

    it("dates a market page by the day it was counted, and nothing else", () => {
        const entries = sitemapEntries(undefined, {"/market/ai": "2026-10-07T05:00:00Z"});
        expect(entries.find((e) => e.url === `${SITE_URL}/market/ai`)).toEqual({url: `${SITE_URL}/market/ai`, lastModified: "2026-10-07"});
        expect(entries.filter((e) => "lastModified" in e)).toHaveLength(1);
    });
});

describe("market page structured data", () => {
    const page = FIXTURE.ai as unknown as MarketBody;
    const graph = marketStructuredData(MARKET_PAGES.ai, page, "D")["@graph"] as Array<Record<string, unknown>>;

    it("is an Article by Glassbox, changed on the day it was counted", () => {
        const article = graph.find((n) => n["@type"] === "Article")!;
        expect(article).toMatchObject({
            headline: "What are AI jobs actually asking for?", datePublished: FIRST_PUBLISHED, dateModified: page.taken_at,
            author: {"@type": "Organization", name: "Glassbox"}, publisher: {"@type": "Organization", name: "Glassbox"},
            image: [`${SITE_URL}/market/ai/opengraph-image`], mainEntityOfPage: `${SITE_URL}/market/ai`,
        });
    });

    it("has breadcrumbs that match the visible Market / AI", () => {
        const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement as Array<Record<string, unknown>>;
        expect(crumbs.map((c) => [c.position, c.name, c.item])).toEqual([[1, "Market", `${SITE_URL}/market`], [2, "AI", `${SITE_URL}/market/ai`]]);
    });

    it("lets search show a market page's share image large", () => {
        expect(publicPage("/market/ai", {title: "T", description: "D", ownImage: true, article: true}).robots)
            .toEqual({index: true, follow: true, "max-image-preview": "large"});
        expect(publicPage("/about", {title: "T", description: "D"}).robots).toBeUndefined();
    });
});

describe("home structured data", () => {
    const graph = homeStructuredData("D")["@graph"] as Array<Record<string, unknown>>;
    const node = (type: string) => graph.find((n) => n["@type"] === type)!;

    it("names the site so search can tell it from glassbox.com", () => {
        expect(node("WebSite")).toMatchObject({name: "Glassbox", alternateName: ["See Glassbox", "seeglassbox.com"], url: SITE_URL});
        expect(node("Organization")).toMatchObject({name: "Glassbox", url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png`});
    });

    it("does not call a job seeker's tool a business application", () => {
        expect(node("WebApplication")).not.toHaveProperty("applicationCategory");
    });
});
