import posthog, {CaptureResult} from "posthog-js";

/*
 * Product analytics (decisions/analytics.md): PostHog, US cloud. Kept small
 * on purpose: no cookies or storage (memory persistence), no autocapture,
 * no session recording, Do Not Track respected, pages sent as a path with
 * no query string. Only the events below exist, each with an allowlist of
 * properties, so a CV's contents, a file name, skills or an email cannot be
 * sent even by mistake. The first pageview of a page load also says where the
 * visit came from: the referring site's name and the link's utm_* tags, never
 * an address. Without NEXT_PUBLIC_POSTHOG_KEY nothing loads.
 */

export type Page = "overview" | "market" | "skills" | "opportunities" | "applications";

type Events = {
    scan_started: Record<string, never>;
    cv_uploaded: Record<string, never>;
    cv_reused: Record<string, never>;
    scan_finished: {duration_s: number; jobs: number};
    scan_failed: {stage: "upload" | "reuse"};
    view_opened: {page: Page; view?: string};
    signed_up: Record<string, never>;
    ad_pasted: {kind: "text" | "url"};
    cta_clicked: {where: "sticky" | "closing" | "inside" | "product"};
};

const ALLOWED: {[E in keyof Events]: ReadonlyArray<keyof Events[E]>} = {
    scan_started: [], cv_uploaded: [], cv_reused: [],
    scan_finished: ["duration_s", "jobs"],
    scan_failed: ["stage"],
    view_opened: ["page", "view"],
    signed_up: [],
    ad_pasted: ["kind"],
    cta_clicked: ["where"],
};

export const DEFAULT_HOST = "https://us.i.posthog.com";
/** Same-origin path that next.config.ts rewrites to the PostHog host, so blockers of *.posthog.com don't drop events. */
export const PROXY_PATH = "/ingest";

/** Only an event's allowed properties survive; anything else is dropped. */
export function allowedProps<E extends keyof Events>(event: E, props: Record<string, unknown> = {}): Record<string, unknown> {
    const keep = ALLOWED[event] as readonly string[];
    return Object.fromEntries(Object.entries(props).filter(([key, value]) => keep.includes(key) && value !== undefined));
}

/** A URL or path as a bare path: no origin, query string or hash. */
export function pagePath(url: string): string {
    try {
        return new URL(url, "http://x").pathname;
    } catch {
        return "/";
    }
}

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
// The only properties PostHog's own events may carry besides its "$" context.
const PAGE_ALLOWED: Record<string, readonly string[]> = {$pageview: ["ref_domain", ...UTM], $pageleave: [], $identify: []};

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** The referring site's name ("reddit.com"), never its address. Nothing for our own site or a non-web referrer. */
export function refDomain(referrer: string, ownHost: string): string | null {
    try {
        const url = new URL(referrer);
        if (url.protocol !== "https:" && url.protocol !== "http:") return null;
        const host = bareHost(url.hostname);
        return host && host !== bareHost(ownHost) ? host : null;
    } catch {
        return null;
    }
}

/** A utm_* value, trimmed to 100 characters. One that looks like an address or an email is dropped. */
export function utmValue(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const clean = value.trim().slice(0, 100);
    return clean && !/:\/\/|[?&=#@]/.test(clean) ? clean : null;
}

/** Where a visit came from: the referring site's name and the link's utm_* tags. */
export function visitSource(referrer: string, search: string, ownHost: string): Record<string, string> {
    const out: Record<string, string> = {};
    const ref = refDomain(referrer, ownHost);
    if (ref) out.ref_domain = ref;
    const params = new URLSearchParams(search);
    for (const key of UTM) {
        const value = utmValue(params.get(key));
        if (value) out[key] = value;
    }
    return out;
}

/** The source properties as they may leave: a bare hostname and clean utm values, or nothing. */
function cleanSource(props: Record<string, unknown>) {
    if (typeof props.ref_domain !== "string" || !/^[a-z0-9.-]+$/.test(props.ref_domain)) delete props.ref_domain;
    for (const key of UTM) {
        const value = utmValue(props[key]);
        if (value) props[key] = value; else delete props[key];
    }
}

// PostHog's own context: the page and screen, as paths. Everything else it adds is dropped.
const URL_PROPS = ["$current_url", "$pathname"];
// PostHog drops an event without these: the project token and the (anonymous or hashed) id.
const REQUIRED = ["token", "distinct_id"];
const DROP_PROPS = ["$referrer", "$referring_domain", "$initial_referrer", "$initial_referring_domain", "$initial_current_url", "$initial_pathname"];

/** The last check before anything leaves the browser. */
export function scrub(result: CaptureResult | null): CaptureResult | null {
    if (!result) return null;
    const page = PAGE_ALLOWED[result.event];
    if (!page && !(result.event in ALLOWED)) return null;
    const props: Record<string, unknown> = {...result.properties};
    for (const key of URL_PROPS) if (typeof props[key] === "string") props[key] = pagePath(props[key] as string);
    for (const key of DROP_PROPS) delete props[key];
    const keep = page ?? Object.keys(allowedProps(result.event as keyof Events, props));
    for (const key of Object.keys(props)) if (!key.startsWith("$") && !keep.includes(key) && !REQUIRED.includes(key)) delete props[key];
    if (result.event === "$pageview") cleanSource(props);
    return {...result, properties: props, $set: undefined, $set_once: undefined};
}

let ready = false;

/** Starts PostHog once, in the browser, when a key is set. Returns whether it is on. */
export function initAnalytics(key = process.env.NEXT_PUBLIC_POSTHOG_KEY): boolean {
    if (ready) return true;
    if (!key || typeof window === "undefined") return false;
    posthog.init(key, {
        api_host: PROXY_PATH,
        ui_host: "https://us.posthog.com",
        persistence: "memory",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: true,
        disable_session_recording: true,
        respect_dnt: true,
        ip: false,
        person_profiles: "identified_only",
        save_referrer: false,
        save_campaign_params: false,
        mask_personal_data_properties: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        before_send: scrub,
    });
    ready = true;
    return true;
}

// Pages can fire before the provider's effect has run, so every call starts PostHog first (once).
export function track<E extends keyof Events>(event: E, ...props: Events[E] extends Record<string, never> ? [] : [Events[E]]) {
    if (!initAnalytics()) return;
    posthog.capture(event, allowedProps(event, props[0] as Record<string, unknown> | undefined));
}

let lastPath: string | null = null;

/**
 * One pageview per path change (React's dev double effects would send two).
 * The first of a page load also carries where the visit came from.
 */
export function trackPageview(path: string) {
    if (!initAnalytics()) return;
    const clean = pagePath(path);
    if (clean === lastPath) return;
    const source = lastPath === null && typeof document !== "undefined"
        ? visitSource(document.referrer, location.search, location.hostname) : {};
    lastPath = clean;
    posthog.capture("$pageview", {$current_url: clean, ...source});
}

/**
 * Ties events to a person by a one-way hash of the account id, never the
 * account id, a name or an email.
 */
export async function identifyUser(accountId: string) {
    if (!initAnalytics()) return;
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`glassbox:${accountId}`)));
    posthog.identify(`u_${[...bytes].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("")}`);
}

export function forgetUser() {
    if (ready) posthog.reset();
}

/**
 * A scan's events in one place: scan_started plus cv_uploaded or cv_reused
 * now, then scan_finished (seconds, jobs found) or scan_failed (which kind).
 */
export function scanEvents(kind: "upload" | "reuse") {
    const start = Date.now();
    track("scan_started");
    if (kind === "upload") track("cv_uploaded"); else track("cv_reused");
    return {
        finished: (jobs: number) => track("scan_finished", {duration_s: Math.round((Date.now() - start) / 1000), jobs}),
        failed: () => track("scan_failed", {stage: kind}),
    };
}
