import {describe, expect, it} from "vitest";

import {homeStructuredData, PUBLIC_PATHS, publicPage, rootMetadata, sitemapEntries} from "./seo";
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
            `${SITE_URL}/market/entry-level-software`, `${SITE_URL}/method`]);
        for (const entry of sitemapEntries()) expect(Object.keys(entry)).toEqual(["url"]);
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
