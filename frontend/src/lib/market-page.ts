import {builtForPage} from "@/lib/landing/look-server";
import {SITE_URL} from "@/lib/site";

/*
 * The entry level software page: GET /market/page/entry-level-software
 * (docs/decisions/market-pages.md), and the pure helpers and words the page,
 * its share image and its copied facts are made from. Every sentence names
 * what its numbers count (CLAUDE.md section 2). No advice: we show, you decide.
 */

export const ENTRY_NAME = "entry-level-software";
export const ENTRY_PATH = `/market/${ENTRY_NAME}`;

export interface PageSkill {
    key: string;
    /** Readable entry level jobs naming it: required, preferred or mentioned. */
    any: number;
    required: number;
    senior_any: number;
    senior_required: number;
}

export interface EntryPage {
    taken_at: string;
    profiler_version: string;
    families: string[];
    min_readable: number;
    /** False under min_readable readable jobs: then no shares are shown. */
    publishable: boolean;
    jobs: number;
    readable: number;
    employers: number;
    internships: number;
    remote: number;
    places: {us: number; elsewhere: number; unknown: number};
    largest_employer: {name: string; jobs: number} | null;
    skills: PageSkill[];
    contrast: Array<{key: string; any: number; senior_any: number}>;
    senior: {jobs: number; readable: number};
    required_median: {entry: number | null; senior: number | null};
    /** [title, company, level, required years] */
    titles: Array<[string, string, string, number | null]>;
    names: Record<string, string>;
}

/** The page's counts for the server render; throws during a revalidation to keep the last good page (look-server.ts). */
export function entryForPage(timeoutMs = 4000, fetcher: typeof fetch = fetch, keep?: boolean): Promise<EntryPage | null> {
    return builtForPage<EntryPage>(`/market/page/${ENTRY_NAME}`, (body) => typeof body.jobs === "number" && Array.isArray(body.skills),
        timeoutMs, fetcher, keep);
}

export const fmt = (n: number) => n.toLocaleString("en");
export const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0);

/** "7 October 2026", the day the count was taken (UTC). */
export function longDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
}

const name = (page: EntryPage, key: string) => page.names[key] ?? key;
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** The sentence under the title: the count, the date, and what was counted. */
export function countLine(page: EntryPage): string {
    return `On ${longDate(page.taken_at)} we counted ${plural(page.jobs, "entry level software job", "entry level software jobs")} at ${plural(page.employers, "employer", "employers")}, each job once, however many boards or cities list it.`;
}

/**
 * Up to three facts a reader can copy: the skill named most, then the skills
 * leaning most to entry level and to senior jobs. Under the 100 job rule only
 * the count, since every other fact is a share in disguise.
 */
export function headlineFacts(page: EntryPage): string[] {
    const date = longDate(page.taken_at);
    if (!page.publishable || !page.skills.length) return [countLine(page)];
    const top = page.skills[0];
    const facts = [`${fmt(top.any)} of the ${fmt(page.readable)} entry level software jobs we counted on ${date} name ${name(page, top.key)}.`];
    const early = page.contrast.find((c) => c.key !== top.key && pct(c.any, page.readable) > pct(c.senior_any, page.senior.readable));
    const later = page.contrast.find((c) => pct(c.any, page.readable) < pct(c.senior_any, page.senior.readable));
    for (const c of [early, later]) {
        if (!c) continue;
        facts.push(`${fmt(c.any)} of the ${fmt(page.readable)} entry level software jobs we counted on ${date} name ${name(page, c.key)}. So do ${fmt(c.senior_any)} of the ${fmt(page.senior.readable)} senior ones.`);
    }
    return facts;
}

/** The page's address as a copied fact carries it, tagged so a visit from a pasted fact can be counted. */
export function copyUrl(path = ENTRY_PATH, campaign = ENTRY_NAME): string {
    return `${SITE_URL}${path}?utm_source=copy&utm_campaign=${campaign}`;
}

export const copyText = (fact: string, url = copyUrl()) => `${fact} ${url}`;

/** What a title's level chip says: the product's level, or the years the job asks for. */
export function levelLabel(level: string, years: number | null): string | null {
    if (level === "intern") return "Internship";
    if (level === "entry") return "Entry level";
    if (level === "junior") return "Junior";
    if (years !== null) return years === 0 ? "No experience asked" : `Asks ${plural(years, "year", "years")}`;
    return null;
}

/** The skill leaning most to entry level jobs, as the chart's subtitle states it. */
export function contrastLead(page: EntryPage): string {
    const c = page.contrast[0];
    if (!c) return "The same skills, in entry level and senior jobs";
    return `${name(page, c.key)}: ${pct(c.any, page.readable)}% of entry level jobs, ${pct(c.senior_any, page.senior.readable)}% of senior ones`;
}

export const ENTRY_COPY = {
    kicker: "Today's count · Entry level software",
    title: "What do entry level software jobs ask for?",
    description: "Counted from today's live jobs: the skills entry level software jobs name, how that differs from senior jobs, and who is hiring.",
    shareTitle: "What entry level software jobs ask for, counted",
    factsTitle: "Three counted facts",
    copy: "Copy",
    copied: "Copied with the link",
    skillsTitle: "The skills they name most",
    skillsLine: (shown: number, readable: number) => `The ${shown} skills named most often, in ${fmt(readable)} entry level software jobs we could read.`,
    skillCols: {skill: "Skill", any: "Jobs naming it", required: "Of those, required", share: "Share", cv: "Your CV"},
    have: "On your CV",
    notYet: "Not on your CV yet",
    haveLine: (have: number, shown: number) => `${have} of the ${shown} skills these jobs name most are on your CV.`,
    contrastTitle: "Entry level vs senior",
    contrastNotes: (readable: number, senior: number) => [
        `Each pair is one skill. The upper bar is entry level jobs, the lower bar senior ones.`,
        `Shares of the jobs we could read: ${fmt(readable)} entry level, ${fmt(senior)} senior.`,
    ],
    contrastLegend: {entry: "Entry level", senior: "Senior"},
    medianLine: (entry: number | null, senior: number | null) => entry === null || senior === null ? null
        : `Entry level jobs list a median of ${entry} required skills. Senior jobs list ${senior}.`,
    factsRow: "Who is hiring",
    internships: "Internships",
    remote: "Marked remote",
    places: "In the US",
    employers: "Employers",
    largest: "Largest employer",
    ofJobs: (n: number, of: number) => `${fmt(n)} of ${fmt(of)} jobs`,
    placesLine: (p: EntryPage["places"]) => `${fmt(p.elsewhere)} elsewhere. ${fmt(p.unknown)} name no country.`,
    largestLine: (e: {name: string; jobs: number}, of: number) => `${e.name} lists ${fmt(e.jobs)} of the ${fmt(of)} jobs`,
    titlesTitle: "The jobs behind the count",
    titlesLine: (shown: number, of: number) => `${shown} of the ${fmt(of)} jobs, one employer at a time. Titles and employers only.`,
    howTitle: "How we counted",
    how: [
        "Entry level here means one of three things. The job's level reads as intern, entry level or junior. Or its title says intern, graduate, new grad, entry level, early career or junior. Or it asks for 2 years of experience or less and isn't judged senior.",
        "Software means five job types: software engineering, backend, frontend, full stack and mobile.",
        "Skills are counted in jobs long enough to read. Senior means a senior, lead or principal level in the same job types.",
    ],
    method: "How Glassbox counts",
    thin: (readable: number, min: number) => `We could read ${fmt(readable)} of these jobs today. Below ${min}, a share describes a few employers more than the market, so we don't show shares. The jobs are below.`,
    unavailable: "Today's count isn't ready yet. It's made from the live jobs every hour, so try again in a minute.",
    ctaTitle: "See which are on your CV",
    ctaLine: "Your CV is read in about a minute. The skills it names light up in the table above.",
    ctaLineThin: "Your CV is read in about a minute. Your results open a click away.",
    cta: "Add your CV",
    reading: "Reading your CV…",
    results: "Your full results",
};
