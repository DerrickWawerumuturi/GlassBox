import {DateBasis, Match, MatchTier, Opportunity} from "@/types/jobradar";

/** An opportunity as the dashboard's cards and tables render it. */
export interface OpportunityRow {
    key: string;
    jobId: number;
    role: string;
    company: string | null;
    location: string;
    /** 0-100. */
    match: number;
    tier: MatchTier;
    /** Required skills the CV covers (directly or through a related skill), and the ones it lacks. */
    have: string[];
    missing: string[];
    required: number;
    /** ISO; see dateBasis for where it came from. */
    listedAt: string;
    dateBasis: DateBasis;
    salary: string | null;
    type: string | null;
    url: string | null;
    provider: string;
    also: Opportunity["also"];
    /** The matcher's full explanation. */
    detail: Match;
}

export const TIER_LABEL: Record<MatchTier, string> = {
    strong: "Strong match", good: "Good match", stretch: "Stretch", unlikely: "Out of reach"
};

export function toRow(o: Opportunity): OpportunityRow {
    const required = o.match.required;
    return {
        key: String(o.job_id),
        jobId: o.job_id,
        role: o.title ?? "Untitled role",
        company: o.company,
        location: placeLabel(o.location, o.workplace === "hybrid" ? "hybrid" : o.remote || o.workplace === "remote" ? "remote" : null),
        match: o.match.score,
        tier: o.match.tier,
        have: [...required.matched, ...required.partial],
        missing: required.missing,
        required: required.matched.length + required.partial.length + required.missing.length,
        listedAt: o.listed_at,
        dateBasis: o.date_basis,
        salary: o.salary,
        type: o.employment_type,
        url: o.url,
        provider: o.provider,
        also: o.also,
        detail: o.match
    };
}

/** "Hybrid · New York"; a location that already says remote is shown as written. */
export function placeLabel(where: string | null | undefined, mode: "remote" | "hybrid" | null): string {
    const place = where?.trim() || null;
    const arrangement = mode === "hybrid" ? "Hybrid" : mode === "remote" ? "Remote" : null;
    if (!arrangement) return place ?? "—";
    if (place && place.toLowerCase().includes(arrangement.toLowerCase())) return place;
    return [arrangement, place].filter(Boolean).join(" · ");
}

const DAY = 86_400_000;

/**
 * "Just now", "2 hours ago", "Today", "Yesterday", "3 days ago", "Sep 18, 2026".
 * Hours only for timestamps that carry a time: many sources give a date at
 * midnight, and "15 hours ago" would claim a precision they never had.
 */
export function ageLabel(iso: string | null | undefined, now: Date = new Date()): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    const hours = (now.getTime() - date.getTime()) / 3_600_000;
    const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;
    if (hasTime && hours < 1) return "Just now";
    if (hasTime && hours < 12) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} ago`;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 14) return `${days} days ago`;
    return date.toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"});
}

/** The age with how it is known: a source's date, an estimate, or only when JobRadar found it. */
export function dateLabel(iso: string, basis: DateBasis): {text: string; title: string} {
    const age = ageLabel(iso);
    const on = new Date(iso).toLocaleDateString(undefined, {month: "long", day: "numeric", year: "numeric"});
    if (basis === "estimated") {
        return {text: `≈ ${age}`, title: `Estimated from the source's relative date ("posted N days ago"), around ${on}`};
    }
    if (basis === "fetched") {
        return {text: `Found ${age.charAt(0).toLowerCase()}${age.slice(1)}`, title: `The source gives no posting date; JobRadar found it on ${on}`};
    }
    return {text: age, title: `Posted ${on}, according to the source`};
}

/** "2h ago" for timestamps the backend returns as ISO strings. */
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "—";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "—";
    const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / (60 * 24))}d ago`;
}
