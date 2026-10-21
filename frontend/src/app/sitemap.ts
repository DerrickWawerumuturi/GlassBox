import type {MetadataRoute} from "next";

import {allMarkets, weeksForPage} from "@/lib/landing/look-server";
import {MARKET_NAMES, marketPath, weekPath} from "@/lib/market-pages";
import {YEARS_PATH} from "@/lib/market-names";
import {currentWeeks} from "@/lib/published";
import {PUBLIC_PATHS, sitemapEntries} from "@/lib/seo";
import {STORIES} from "@/lib/stories";
import {storyPath} from "@/lib/stories/story";

// The public pages (lib/seo.ts PUBLIC_PATHS). Only the market pages carry a
// lastmod: the day their numbers were counted; a story, the day its numbers
// were fixed. The build time is not when a page changed. Each market page's
// past weeks follow, without one: a past week doesn't change (GitHub issue #16).
// Rebuilt with the market pages (lib/revalidate.ts), never on a timer.
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // One read of the weeks for all five pages: a route like this one has no render to share it (React cache).
    const published = currentWeeks();
    const [pages, weeks] = await Promise.all([allMarkets(), Promise.all(MARKET_NAMES.map((name) => weeksForPage(name, false, () => published)))]);
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
    const past = MARKET_NAMES.flatMap((name, i) => weeks[i].past.map(({week}) => weekPath(name, week)));
    return sitemapEntries([...PUBLIC_PATHS, ...past], counted);
}
