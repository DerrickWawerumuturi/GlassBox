import {builtForPage, hasJobs} from "@/lib/landing/look-server";
import {MARKET_NAMES, MarketName} from "@/lib/market-names";
import {SITE_URL} from "@/lib/site";

/*
 * The market pages: which exist, what each counts, and the body the API
 * serves for each (GET /market/page/{name}, backend market_pages.py and
 * market_story.py). The words built from these numbers are in market-story.ts.
 * docs/decisions/market-pages.md
 */

export {MARKET_NAMES};
export type {MarketName};

export interface MarketInfo {
    name: MarketName;
    /** What the jobs are, before the word "jobs": "entry level software". */
    subject: string;
    /** The kicker and breadcrumb label. */
    label: string;
    /** The comparison set, before "jobs": senior jobs in the same job types. */
    compare: string;
    /** What this page counts, for the framing paragraph and "How we counted". */
    counts: string;
    kind: "entry" | "role";
}

export const MARKET_PAGES: Record<MarketName, MarketInfo> = {
    "entry-level-software": {
        name: "entry-level-software", subject: "entry level software", label: "Entry level software", compare: "senior software", kind: "entry",
        counts: "This page counts the ones meant for people early in their career: internships, graduate and junior roles, and jobs that require two years or less.",
    },
    "software-engineering": {
        name: "software-engineering", subject: "software engineering", label: "Software engineering", compare: "senior software engineering", kind: "role",
        counts: "This page counts the software engineering jobs: titles like software engineer, developer or programmer. Backend, frontend, full stack and mobile jobs are job types of their own.",
    },
    ai: {
        name: "ai", subject: "AI", label: "AI", compare: "senior AI", kind: "role",
        counts: "This page counts the AI jobs: titles that name AI, LLMs or generative AI. Titles that name machine learning have their own page.",
    },
    "machine-learning": {
        name: "machine-learning", subject: "machine learning", label: "Machine learning", compare: "senior machine learning", kind: "role",
        counts: "This page counts the machine learning jobs: titles that name machine learning, deep learning, computer vision, NLP, or applied or research science.",
    },
    devops: {
        name: "devops", subject: "DevOps", label: "DevOps", compare: "senior DevOps", kind: "role",
        counts: "This page counts the DevOps jobs: titles that name DevOps, site reliability, platform, infrastructure, cloud or systems engineering.",
    },
};

export const marketPath = (name: MarketName): `/market/${string}` => `/market/${name}`;
export const isMarketName = (name: string): name is MarketName => (MARKET_NAMES as readonly string[]).includes(name);

/** The date the market pages were first published: Article datePublished. */
export const FIRST_PUBLISHED = "2026-10-07";

export interface StorySkill {
    key: string;
    category: string;
    /** Readable jobs naming it: required, preferred or mentioned. */
    any: number;
    required: number;
    /** Employers whose jobs name it: the breadth rule reads this. */
    employers: number;
    /** Readable jobs in the comparison set naming it. */
    compare_any: number;
    /** Named by jobs at `story.breadth` or more employers: may be highlighted or named in a finding. */
    broad: boolean;
}

export type SectionName = "hiring" | "languages" | "contrast" | "categories" | "years" | "levels";

/**
 * The page's lead finding, its H1 (market_story.finding): the pattern, the
 * skills that lead (one or two), the jobs naming each, and what they are out
 * of. "years": `jobs` of the `of` jobs that state years ask for `years`.
 */
export type LeadFinding =
    | {kind: "years"; years: number; jobs: number; of: number}
    | {kind: "share"; skills: [string]; jobs: [number]; of: number; fraction: [number, number] | null}
    | {kind: "tied"; skills: [string, string]; jobs: [number, number]; of: number}
    | {kind: "pair"; skills: [string, string]; jobs: [number, number]; of: number; approx: "nearly" | "about"}
    | {kind: "half" | "leads"; skills: [string]; jobs: [number]; of: number};

export interface Story {
    compare: {jobs: number; readable: number};
    breadth: number;
    skills: StorySkill[];
    /** The skill the lead visual marks: the most named broad skill that isn't the job type itself. Null under the 100 rule. */
    headline: string | null;
    /** The lead finding, the page's H1. Null under the 100 rule, or from an API before finding headlines. */
    finding?: LeadFinding | null;
    /** The lead visual, one square per job: names the headline skill, is an internship, both, neither. */
    squares: {skill: number; both: number; internship: number; neither: number};
    languages: {per_job: number[]; bars: string[]};
    /** Broad skills leaning to the page first, then to the comparison set. */
    contrast: string[];
    categories: Array<{category: string; jobs: number; skills: string[]}>;
    years: {buckets: Array<{from: number; to: number | null; jobs: number}>; stated: number; unstated: number};
    /** The sections the data supports, in no set order; none under the 100 rule. */
    sections: SectionName[];
}

export interface MarketBody {
    /** When the jobs were collected (the publication's as_of). */
    taken_at: string;
    /** The Monday of the week the count was published for, "2026-10-05"; absent from an API before publications. */
    week?: string;
    profiler_version: string;
    families: string[];
    min_readable: number;
    publishable: boolean;
    jobs: number;
    readable: number;
    employers: number;
    internships: number;
    remote: number;
    places: {us: number; elsewhere: number; unknown: number};
    largest_employer: {name: string; jobs: number} | null;
    levels?: {junior: number; mid: number; senior: number; unstated: number};
    /** [title, company, level, required years] */
    titles: Array<[string, string, string, number | null]>;
    names: Record<string, string>;
    /** Names that read differently mid sentence ("distributed systems"); the rest read as `names`. */
    inline_names?: Record<string, string>;
    story: Story;
}

/** A page's counts for the server render; throws during a revalidation to keep the last good page (look-server.ts). */
export function marketForPage(name: MarketName, keep?: boolean, timeoutMs = 4000, fetcher: typeof fetch = fetch,
                              wait?: number): Promise<MarketBody | null> {
    // No jobs is no count, never an empty page. A body with no story is an API from before the editorial pages.
    return builtForPage<MarketBody>(`/market/page/${name}`, (body) => hasJobs(body.jobs) && Boolean(body.story?.squares),
        timeoutMs, fetcher, keep, wait);
}

/** Every page's counts, for the hub and the rail. A page that can't be had is null; it never blocks the page asking. */
export async function allMarkets(keep = false): Promise<Record<MarketName, MarketBody | null>> {
    const bodies = await Promise.all(MARKET_NAMES.map((name) => marketForPage(name, keep)));
    return Object.fromEntries(MARKET_NAMES.map((name, i) => [name, bodies[i]])) as Record<MarketName, MarketBody | null>;
}

export const absoluteMarket = (name?: MarketName) => `${SITE_URL}${name ? marketPath(name) : "/market"}`;
