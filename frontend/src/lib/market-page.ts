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

/**
 * The Monday (ISO date) that starts the week a published count was taken:
 * the body's `week`, or worked out from `taken_at` for a body from before
 * weekly publications. The market is published once a week
 * (docs/decisions/market-publication.md), so pages date it by its week.
 */
export function weekStart(body: {week?: string; taken_at: string}): string {
    if (body.week) return body.week;
    const d = new Date(body.taken_at), back = (d.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

/** "5 October 2026": the Monday of the week a published count was taken. */
export const weekDate = (body: {week?: string; taken_at: string}) => longDate(weekStart(body));

/** "5 Oct": the same Monday, short, where the year goes without saying (the landing page). */
export const weekDay = (body: {week?: string; taken_at: string}) =>
    new Date(weekStart(body)).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});

/** "7 Oct 2026": the day the count was taken, short (UTC). */
export const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});


/**
 * A skill's name in a chart's narrow label column: without the examples in
 * brackets ("AI assistants", not "AI assistants (ChatGPT, Copilot)"), and
 * wrapped, never cut off. The full name is the label's title.
 */
export const chartName = (name: string) => name.replace(/\s*\([^)]*\)$/, "");

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
