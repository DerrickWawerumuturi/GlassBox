/**
 * The site's own address, for metadata, the sitemap, robots and structured
 * data. One place: NEXT_PUBLIC_SITE_URL, else the production domain.
 */
export function siteUrl(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
    return (env?.trim() || "https://seeglassbox.com").replace(/\/+$/, "");
}

export const SITE_URL = siteUrl();
