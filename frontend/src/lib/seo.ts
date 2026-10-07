import type {Metadata, MetadataRoute} from "next";

import {SITE_URL} from "@/lib/site";

/*
 * What search engines and share previews read: the site's metadata, each
 * public page's canonical address, the sitemap and the home page's
 * structured data. Next merges metadata shallowly, so a page that sets
 * `openGraph` replaces the whole root block, image included. Every public
 * page therefore builds its block here, from the same parts.
 */

/** The pages search should list, in sitemap order. Each /market page goes here too. */
export const PUBLIC_PATHS = ["/", "/product", "/about", "/privacy", "/your-cv", "/market/entry-level-software", "/method"] as const;

/** A path as an absolute address on this site ("/" is the bare origin). */
export function absolute(path: string): string {
    return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

type Share = {title: string; description: string};

const SHARE: Share = {
    title: "Glassbox: your job market, mapped",
    description: "Your CV vs the live job market: top skills, the ones you have, the ones you don't yet, and real jobs ranked by fit.",
};

// app/opengraph-image.tsx draws it. Named here too, because a page's own openGraph drops the inherited one.
const IMAGE = {url: "/opengraph-image", width: 1200, height: 630, alt: SHARE.title};

// `ownImage`: the page has its own opengraph-image.tsx. Naming no image lets Next use it for both cards.
const openGraph = (share: Share, ownImage = false): Metadata["openGraph"] => ({
    type: "website", siteName: "Glassbox", title: share.title, description: share.description, ...(ownImage ? {} : {images: [IMAGE]}),
});

const twitter = (share: Share, ownImage = false): Metadata["twitter"] => ({
    card: "summary_large_image", title: share.title, description: share.description, ...(ownImage ? {} : {images: [IMAGE.url]}),
});

/** The root layout's metadata. No canonical here: it would make every page, the 404 included, claim to be "/". */
export const rootMetadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    applicationName: "Glassbox",
    title: {default: "Glassbox", template: "%s · Glassbox"},
    description: "Upload your CV and Glassbox scans live jobs. In about a minute it shows the skills your market wants, the ones you have, and the ones you don't yet.",
    openGraph: openGraph(SHARE),
    twitter: twitter(SHARE),
};

/**
 * A public page's metadata: its own canonical and og:url, and the full share
 * block. `ownImage` for a page with its own opengraph-image.tsx (a market
 * page's headline fact); otherwise the site's image.
 */
export function publicPage(path: (typeof PUBLIC_PATHS)[number] | `/${string}`, page: {
    title: string; description: string; share?: Share; ownImage?: boolean;
}): Metadata {
    const share = page.share ?? SHARE;
    return {
        title: page.title,
        description: page.description,
        alternates: {canonical: path},
        openGraph: {...openGraph(share, page.ownImage), url: path},
        twitter: twitter(share, page.ownImage),
    };
}

/** The sitemap: public pages only, no invented dates or priorities. */
export function sitemapEntries(paths: readonly string[] = PUBLIC_PATHS): MetadataRoute.Sitemap {
    return paths.map((path) => ({url: absolute(path)}));
}

/**
 * The home page's structured data. WebSite and Organization give search a
 * site name that is not glassbox.com's. The app has no applicationCategory:
 * none of Google's values fits a job seeker's tool (BusinessApplication did not).
 */
export function homeStructuredData(description: string) {
    return {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", name: "Glassbox", alternateName: ["See Glassbox", "seeglassbox.com"], url: SITE_URL},
            {"@type": "Organization", name: "Glassbox", url: SITE_URL, logo: absolute("/icons/icon-512.png")},
            {
                "@type": "WebApplication", name: "Glassbox", url: SITE_URL, operatingSystem: "Web", description,
                offers: {"@type": "Offer", price: "0", priceCurrency: "USD"},
            },
        ],
    };
}
