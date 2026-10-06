import type {MetadataRoute} from "next";
import {SITE_URL} from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = SITE_URL;
    return [
        {url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1},
        {url: `${base}/product`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7},
        {url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6},
        {url: `${base}/sign-in`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5},
    ];
}
