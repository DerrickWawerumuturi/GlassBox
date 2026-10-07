import {SITE_URL} from "@/lib/site";

/*
 * Small helpers every market page uses: numbers, dates, a copied fact's text
 * and link, and a job title's level chip. The pages themselves:
 * market-pages.ts (which exist, their counts) and market-story.ts (the words).
 */

export const fmt = (n: number) => n.toLocaleString("en");
export const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0);

/** "7 October 2026", the day the count was taken (UTC). */
export function longDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
}

/** "7 Oct 2026, 05:00 UTC": the byline's updated time. */
export function stamp(iso: string): string {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
    return `${day}, ${d.toISOString().slice(11, 16)} UTC`;
}

const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** The page's address as a copied fact carries it, tagged so a visit from a pasted fact can be counted. */
export function copyUrl(path: string, campaign: string, hash = ""): string {
    return `${SITE_URL}${path}?utm_source=copy&utm_campaign=${campaign}${hash ? `#${hash}` : ""}`;
}

export const copyText = (fact: string, url: string) => `${fact} ${url}`;

/** What a title's level chip says: the product's level, or the years the job asks for. */
export function levelLabel(level: string, years: number | null): string | null {
    if (level === "intern") return "Internship";
    if (level === "entry") return "Entry level";
    if (level === "junior") return "Junior";
    if (years !== null) return years === 0 ? "No experience asked" : `Asks ${plural(years, "year", "years")}`;
    return null;
}
