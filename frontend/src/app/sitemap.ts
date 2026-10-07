import type {MetadataRoute} from "next";

import {sitemapEntries} from "@/lib/seo";

// The public pages (lib/seo.ts PUBLIC_PATHS). No lastmod: the build time is not when a page changed.
export default function sitemap(): MetadataRoute.Sitemap {
    return sitemapEntries();
}
