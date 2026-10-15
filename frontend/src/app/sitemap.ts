import type {MetadataRoute} from "next";

import {allMarkets} from "@/lib/landing/look-server";
import {MARKET_NAMES, marketPath} from "@/lib/market-pages";
import {YEARS_PATH} from "@/lib/market-names";
import {sitemapEntries} from "@/lib/seo";
import {STORIES} from "@/lib/stories";
import {storyPath} from "@/lib/stories/story";

// The public pages (lib/seo.ts PUBLIC_PATHS). Only the market pages carry a
// lastmod: the day their numbers were counted; a story, the day its numbers
// were fixed. The build time is not when a page changed.
// Rebuilt with the market pages (lib/revalidate.ts), never on a timer.
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages = await allMarkets();
    const counted: Record<string, string> = {};
    for (const name of MARKET_NAMES) {
        const taken = pages[name]?.taken_at;
        if (taken) counted[marketPath(name)] = taken;
    }
    // The years page is written from the entry level page's count.
    const entry = pages["entry-level-software"];
    if (entry?.experience) counted[YEARS_PATH] = entry.taken_at;
    const hub = MARKET_NAMES.map((n) => pages[n]?.taken_at).find(Boolean);
    if (hub) counted["/market"] = hub;
    for (const story of STORIES) counted[storyPath(story)] = story.published;
    return sitemapEntries(undefined, counted);
}
