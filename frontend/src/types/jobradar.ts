import {JSX} from "react";
import {Control, Path, PathValue} from "react-hook-form";
import {FormValues} from "@/lib/form";

/**
 * Only the form fields that hold a plain string. FormField renders a
 * text input, so array/object fields (skills, education) must not bind to it —
 * they get their own dedicated controllers.
 */
export type StringFieldPath = {
    [P in Path<FormValues>]: PathValue<FormValues, P> extends string ? P : never
}[Path<FormValues>];

export interface SkillStat {
    skill: string;
    job_count: number;
    frequency: number;
}


export interface SkillCoverage {
    covered: number;
    /** Length of `top_skills` — the market skillset coverage is measured against. */
    total: number;
    /** Ratio in 0-1, equal to covered/total. */
    coverage: number;
}

export interface MarketAnalysis {
    jobs_analyzed: number;
    skill_coverage: SkillCoverage;
    /** Every market skill the user lacks — hundreds of entries, not a shortlist. */
    skill_gaps: SkillStat[];
    /** Sorted by frequency descending. */
    top_skills: SkillStat[];
    user_skill_presence: SkillStat[];
}

/**
 * A scraped posting, exactly as the backend nests it. Every field is optional
 * on the Python side (`Job` in src/Agent/utils/types.py defaults them all to
 * None), so nothing here can be assumed present.
 *
 * `provider`, `external_id` and `raw` exist on the Python model but are marked
 * `exclude=True`, so they are persistence-only and never reach this response.
 */
export interface JobPosting {
    id: string | null;
    title: string | null;
    company: string | null;
    description: string | null;
    /** Legacy single figure; mirrors salary_max where a provider supplies one. */
    salary: number | null;
    salary_min: number | null;
    salary_max: number | null;
    /** ISO currency code, e.g. "USD". */
    salary_currency: string | null;
    /** What the figures are per: "YEAR", "HOUR", … Never assume annual. */
    salary_period: string | null;
    location: string | null;
    remote: boolean | null;
    /**
     * Where a remote posting will actually hire from, as the provider states
     * it. "Remote" restricted to the USA is not remote for a user elsewhere.
     */
    remote_eligibility: string | null;
    /** Null in every response observed so far. */
    experience_level: string | null;
    employment_type: string | null;
    url: string | null;
    /** Whatever the provider called it — often relative ("3 days ago"). */
    posted_at: string | null;
    /** The provider's absolute publication time, where one is offered. */
    posted_at_utc: string | null;
    /**
     * Our own jobs.id, attached after the scan is persisted. Null when
     * persistence was disabled or the write failed — bookmarking needs it,
     * so a null here means the posting can't be saved.
     */
    db_id?: number | null;
}

export type ApplicationStatus =
    | "saved" | "applied" | "screening" | "interview" | "offer"
    | "rejected" | "withdrawn";

/** One row of GET /dashboard/applications, newest added first. */
export interface ApplicationRow {
    id: number;
    /** Optional until the backend adds a.job_id to the list select. */
    job_id?: number | null;
    title: string | null;
    company: string | null;
    match_score: number | string | null;
    status: ApplicationStatus;
    /**
     * When it entered JobRadar (saved, typed, pasted or imported). Optional
     * only because rows cached before the field existed will lack it.
     */
    added_at?: string;
    /**
     * When the user applied: the date they gave (an imported sheet's), or the
     * first move out of saved. Null when saved, or imported without a date.
     */
    applied_at: string | null;
    last_status_at: string;
    /** Provenance as recorded: "linkedin", "referral", "manual", "import", … */
    source?: string | null;
    notes?: string | null;
    /** The CV as it was when the job was saved. */
    cv_snapshot?: CvBreakdown | null;
    /** Joined from the jobs table once the backend widens the list select. */
    url?: string | null;
    location?: string | null;
    remote?: boolean | null;
    provider?: string | null;
    workplace?: Workplace | null;
    employment_type?: string | null;
    salary?: string | null;
}

export type Workplace = "remote" | "hybrid" | "onsite";

/** POST /dashboard/applications/extract — what could be read from a job link. */
export interface ExtractedJob {
    url: string;
    /** linkedin, greenhouse, company_site, … */
    source: string;
    /** pool | greenhouse | lever | ashby | json-ld | page-meta | url-path | none */
    method: string;
    fields: {
        title: string | null;
        company: string | null;
        location: string | null;
        workplace: Workplace | null;
        employment_type: string | null;
        salary: string | null;
        /** Provider-stated level, e.g. "Mid-Senior". */
        experience_level: string | null;
        posted_at: string | null;
        description: string | null;
    };
    skills: string[];
    /**
     * Read from the description: the years the posting gates on (the highest
     * required figure, since required figures all apply), or a preferred one.
     */
    experience: {years: number | null; kind: "required" | "preferred" | "unstated"};
    /** Review fields nothing could be found for. */
    missing: string[];
    /** Why the result is partial, in words a user can act on. */
    message: string | null;
    /** The posting's row in the job pool, when it is real source data. */
    job_id: number | null;
    /** How it fits the user's saved CV. Null when there is no CV to match. */
    match?: Match | null;
}

export type MatchTier = "strong" | "good" | "stretch" | "unlikely";

export interface MatchReason {
    tone: "good" | "warn" | "bad";
    text: string;
}

/** A posting's skills, split by whether the CV covers them. Display names. */
export interface SkillSplit {
    matched: string[];
    /** Covered through a related skill (Next.js for React). */
    partial: string[];
    missing: string[];
}

/**
 * How one job fits the user's CV (backend src/matching). A fit, not a text
 * similarity: jobs behind a gate — too senior, can't legally hold it, a
 * missing working language — are "unlikely" and never score above 34.
 */
export interface Match {
    version: string;
    /** 0-100. */
    score: number;
    tier: MatchTier;
    headline: string;
    /** Each 0-1. `required`/`preferred` are null when the posting lists none. */
    dimensions: {
        role: number;
        required: number | null;
        preferred: number | null;
        seniority: number;
        experience: number;
        location: number;
    };
    required: SkillSplit;
    /** Nice-to-haves and skills the role mentions without requiring. */
    preferred: SkillSplit;
    facts: {
        family: string;
        job_level: string;
        candidate_level: string;
        years_required: number | null;
        years_kind: "required" | "preferred" | "unstated";
        candidate_years: number;
        track: "software" | "ml" | "any";
        location_tier: string;
        thin: boolean;
    };
    /** Why it scored what it did, most important first. */
    reasons: MatchReason[];
    /** The gates that make it unlikely; empty for anything reachable. */
    blockers: string[];
}

/** How a job's date was known: stated by its source, estimated from "2 days ago", or when JobRadar found it. */
export type DateBasis = "posted" | "estimated" | "fetched";

/** One job from the daily pool, matched to the user's CV. */
export interface Opportunity {
    job_id: number;
    provider: string;
    title: string | null;
    company: string | null;
    location: string | null;
    remote: boolean | null;
    workplace: Workplace | null;
    employment_type: string | null;
    salary: string | null;
    url: string | null;
    /** The date shown and sorted on; see `date_basis`. ISO. */
    listed_at: string;
    date_basis: DateBasis;
    posted_at: string | null;
    fetched_at: string;
    match: Match;
    /** The same role on other boards or in other places, folded into this row. */
    also: { provider: string; location: string | null; url: string | null }[];
}

/** GET /dashboard/opportunities */
export interface OpportunitiesResponse {
    /** The CV as matching read it: canonical skills, years per track, level. */
    profile: {
        skills: string[];
        unmatched_skills: string[];
        families: string[];
        years: { software: number; ml: number; any: number };
        level: string;
        location: { country_code: string | null; city: string | null; order: string[]; source: string };
    };
    pool: { refreshed_at: string | null; considered: number; window_days: number };
    counts: Record<MatchTier, number>;
    sort: "newest" | "match";
    /** Every strong and good fit, the newest stretches, the closest out-of-reach. */
    opportunities: Opportunity[];
}

export type ImportField =
    | "title" | "company" | "url" | "location" | "workplace" | "applied_at" | "status"
    | "outcome" | "employment_type" | "salary" | "source" | "notes";

export interface ImportColumn {
    index: number;
    letter: string;
    header: string;
    field: ImportField | null;
    /** How the field was decided: from the header, from the cells, or by the user. */
    how: "header" | "values" | "you" | null;
    samples: string[];
}

/** One sheet row as it would be imported; also the body of the confirm call. */
export interface ImportValues {
    title: string | null;
    company: string | null;
    url: string | null;
    location: string | null;
    workplace: Workplace | null;
    /** YYYY-MM-DD, or null when the sheet gave none. */
    applied_at: string | null;
    status: ApplicationStatus;
    employment_type: string | null;
    salary: string | null;
    source: string | null;
    notes: string | null;
}

export interface ImportRowPreview {
    /** The row's number in the sheet. */
    row: number;
    status: "ready" | "warning" | "duplicate" | "error";
    /** Whether it is ticked for import by default. */
    include: boolean;
    values: ImportValues;
    issues: { field: string; message: string; level: "warning" | "error" }[];
    duplicate: {
        kind: "existing" | "file";
        application_id?: number;
        row?: number;
        reason: string;
        /** False for a possible re-application: importable if the user ticks it. */
        certain: boolean;
    } | null;
}

/** POST /dashboard/applications/import/preview — what an import would do. Writes nothing. */
export interface ImportPreview {
    file_name: string;
    sheet: string | null;
    sheets: string[];
    header_row: number | null;
    date_order: "dmy" | "mdy";
    /** True when every date could be read either way (03/04/2026). */
    date_order_ambiguous: boolean;
    columns: ImportColumn[];
    fields: Record<ImportField, string>;
    /** Important fields no column was mapped to. */
    missing_fields: string[];
    summary: { rows: number; ready: number; warning: number; duplicate: number; error: number };
    rows: ImportRowPreview[];
}

export interface ImportResult {
    created: number;
    application_ids: number[];
    skipped: { title: string; reason: string }[];
    /** Rows with a posting to find: matched to the CV in the background, after the import. */
    matching: number;
}

export interface BookmarkResult {
    bookmarked: boolean;
    application_id: number | null;
}

export interface ApplicationEvent {
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    occurred_at: string;
    scheduled_for: string | null;
    note: string | null;
}

/** The posting plus the skills the backend extracted from its description. */
export interface JobWithSkills {
    job: JobPosting;
    skills: string[];
}

export interface RankedJob {
    job: JobWithSkills;

    /** 0-1: the match score / 100. */
    overall_score: number;
    /** Role fit. */
    title_score: number;
    /** Required-skill coverage. */
    skills_score: number;
    /** How far experience clears the posting's bar (1 = fully). */
    experience_score: number;
    /** Location factor: 0.25 when the user cannot hold the job. */
    location_score: number;
    /** local | remote_country | remote_region | remote_emea | remote_global | remote_unspecified | unstated | international | ineligible */
    location_tier?: string | null;
    /** The full explanation. Absent on analyses cached before the fit matcher. */
    match?: Match;
}

/** Where the search decided to look, and how it got there. */
export interface SearchLocation {
    /** Validated ISO 3166-1 alpha-2, lowercase. */
    country_code: string | null;
    country_name: string | null;
    city: string | null;
    remote_only: boolean;
    /** How the location was determined: "llm" | "recovered" | "none" | "unknown". */
    source: string;
    warning: string | null;
}

/** One provider's result for one leg of the search. */
export interface ProviderCoverage {
    provider: string | null;
    /** The scope label, e.g. "local:ke", "remote:global", "fallback:us". */
    scope: string | null;
    /** "ok" | "http_error" | "timeout" | "exception". */
    status: string | null;
    jobs: number | null;
}

/**
 * What was actually searched, alongside the numbers it produced. A six-job
 * analysis and a forty-job one look identical without this, and the
 * frequencies in `market` mean very different things in each.
 */
export interface SearchCoverage {
    location: SearchLocation;
    scopes: string[];
    /** True when the user's own market was too thin and other markets were added. */
    widened_below_floor: boolean;
    minimum_jobs_floor: number;
    duplicates_removed: number;
    /** Remote postings that would not hire from the user's country. */
    remote_ineligible_removed: number;
    /** Postings surviving dedupe and eligibility, before the role filter. */
    jobs_returned: number;
    /** Postings dropped for being outside the user's role. */
    off_market_removed: number;
    /** What actually reached the analysis — the denominator behind every frequency. */
    jobs_analyzed: number;
    providers: ProviderCoverage[];
}

export interface JobRadarAnalysis {
    market: MarketAnalysis;
    ranked_jobs: RankedJob[];
    /**
     * Optional because analyses cached in localStorage before this field
     * existed will not carry it. Present on every fresh response.
     */
    search?: SearchCoverage;
}

export interface CvBreakdown {
    name: string | null,
    title: string | null,
    location: string | null,
    phone_number: string | null,
    email: string | null
    portfolio: string | null,
    linkedIn: string | null,
    professional_summary: string | null,
    skills: (string | null)[],
    experience: {
        company: string | null,
        role: string | null,
        start_date: string | null,
        end_date: string | null,
        description: string | null
    }[],
    experience_level: string | null,
    education: {
        school_name: string | null,
        course_title: string | null
    }[]
}
export interface JobradarResult {
    analysis: JobRadarAnalysis;
    cv_breakdown: CvBreakdown
}

export interface FormFieldParams {
    name: StringFieldPath,
    title: string,
    placeholder: string,
    isDescription: boolean,
    control: Control<FormValues>
}
