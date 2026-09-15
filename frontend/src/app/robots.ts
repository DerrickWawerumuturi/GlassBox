import type {MetadataRoute} from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Private or thin pages add nothing to search.
            disallow: ["/dashboard", "/api/", "/onboarding", "/analysis"],
        },
        sitemap: "https://jobradar-frontend-pearl.vercel.app/sitemap.xml",
    };
}
