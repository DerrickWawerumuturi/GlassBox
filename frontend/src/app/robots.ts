import type {MetadataRoute} from "next";
import {SITE_URL} from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Private or thin pages add nothing to search.
            disallow: ["/dashboard", "/api/", "/onboarding", "/analysis"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
