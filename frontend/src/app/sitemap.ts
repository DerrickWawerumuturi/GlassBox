import type {MetadataRoute} from "next";

import {allMarkets, MARKET_NAMES, marketPath} from "@/lib/market-pages";
import {sitemapEntries} from "@/lib/seo";

// The public pages (lib/seo.ts PUBLIC_PATHS). Only the market pages carry a
// lastmod: the day their numbers were counted. The build time is not when a page changed.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages = await allMarkets();
    const counted: Record<string, string> = {};
    for (const name of MARKET_NAMES) {
        const taken = pages[name]?.taken_at;
        if (taken) counted[marketPath(name)] = taken;
    }
    const hub = MARKET_NAMES.map((n) => pages[n]?.taken_at).find(Boolean);
    if (hub) counted["/market"] = hub;
    return sitemapEntries(undefined, counted);
}
