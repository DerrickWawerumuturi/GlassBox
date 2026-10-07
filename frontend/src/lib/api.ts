import {
    ApplicationEvent,
    ApplicationRow,
    ApplicationStatus,
    BookmarkResult,
    CvBreakdown,
    ExtractedJob,
    ImportField,
    ImportPreview,
    ImportResult,
    ImportValues,
    JobRadarAnalysis,
    OpportunitiesResponse,
    Workplace
} from "@/types/jobradar";
import {track} from "@/lib/analytics";

const CONFIGURED_API = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:7456"
).replace(/\/+$/, "");

/**
 * A phone on the LAN opening the dev server via 192.168.x.x can't reach the
 * dev machine's loopback, swap in the page's own hostname in that case.
 */
export const API_BASE_URL = (() => {
    if (typeof window === "undefined") return CONFIGURED_API;
    const url = new URL(CONFIGURED_API);
    const apiIsLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    const pageIsLoopback = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    if (apiIsLoopback && !pageIsLoopback) {
        url.hostname = location.hostname;
        return url.toString().replace(/\/+$/, "");
    }
    return CONFIGURED_API;
})();


const ANALYZE_TIMEOUT_MS = 240_000;
const CV_TIMEOUT_MS = 120_000;
// Must outlast a scale-from-zero. A cold container has measured 31s end to end;
// at 20s the applications list aborted before the API could answer and the tab
// showed an error for a server that was only waking up.
const SAVE_TIMEOUT_MS = 60_000;

let apiToken : {token: string, expiresAt: number} | null = null;

export async function getApiToken(): Promise<string> {
    if (apiToken && Date.now() < apiToken.expiresAt) return apiToken.token;

    const res = await fetch("/api/token")
    if (!res.ok) throw new Error("Not signed in")

    const { token } = await res.json()
    apiToken = { token, expiresAt: Date.now() + 14 * 60000};
    return token
}

export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message)
    }
}

// The API creates an account on its first write and says so on that one response
// (backend main.py). Nothing else can tell a first sign in from a later one.
export const ACCOUNT_CREATED = "X-Account-Created";

async function request<T>(path: string, init: RequestInit, timeoutMs: number, label: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            signal: controller.signal,
        });

        if (!response.ok) {
            const detail = await response.json().then((b) => b?.detail).catch(() => null);
            throw new ApiError(detail || `${label} failed: ${response.status}`, response.status)
        }
        if (response.headers.get(ACCOUNT_CREATED)) track("signed_up");

        return await response.json();
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(`${label} timed out. The API may be starting up, try again.`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function postFile<T>(path: string, file: File, timeoutMs: number, label: string, headers?: HeadersInit): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    return request<T>(path, { method: "POST", body: formData, headers }, timeoutMs, label);
}

/** A signed-in call. Every route but /health, /analyze and /cv/parse needs the token. */
async function authed<T>(method: string, path: string, label: string, body?: unknown, timeoutMs = SAVE_TIMEOUT_MS): Promise<T> {
    const headers: Record<string, string> = {Authorization: `Bearer ${await getApiToken()}`};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const init: RequestInit = {method, headers, body: body === undefined ? undefined : JSON.stringify(body)};
    return request<T>(path, init, timeoutMs, label);
}

/** For reads where "nothing saved yet" is a normal answer, not an error. */
async function nullIfMissing<T>(call: Promise<T>): Promise<T | null> {
    try {
        return await call;
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

export function ProcessCv(file: File): Promise<CvBreakdown> {
    return postFile<CvBreakdown>("/cv/parse", file, CV_TIMEOUT_MS, "CV breakdown");
}

/** Signed-in scans rank by the account's saved location preferences. */
export default async function Analyze(file: File): Promise<JobRadarAnalysis> {
    const token = await getApiToken().catch(() => null);
    const headers = token ? {Authorization: `Bearer ${token}`} : undefined;
    return postFile<JobRadarAnalysis>("/analyze", file, ANALYZE_TIMEOUT_MS, "Analysis", headers);
}

export function StoreCV(cv: CvBreakdown): Promise<CvBreakdown> {
    return authed<CvBreakdown>("PUT", "/cv", "CV save", cv);
}

export function GetCV(): Promise<CvBreakdown | null> {
    return nullIfMissing(authed<CvBreakdown>("GET", "/cv", "CV breakdown", undefined, CV_TIMEOUT_MS));
}

/** The stored scan travels with the account, like the CV. */
export function StoreAnalysis(analysis: JobRadarAnalysis, fileName: string | null): Promise<unknown> {
    return authed("PUT", "/analysis", "Analysis save", {analysis, file_name: fileName});
}

export function GetAnalysis(): Promise<{ data: JobRadarAnalysis; file_name: string | null } | null> {
    return nullIfMissing(authed("GET", "/analysis", "Analysis fetch", undefined, CV_TIMEOUT_MS));
}

export interface BookmarkPayload {
    job_id: number;
    title?: string | null;
    company?: string | null;
    /** 0-100 display value, stored as-is. */
    match_score?: number | null;
    /** The CV at save time, what this application was matched with. */
    cv_snapshot?: CvBreakdown | null;
}

/** Saves the job, or removes it while it is still just a bookmark. */
export function ToggleBookmark(payload: BookmarkPayload): Promise<BookmarkResult> {
    return authed<BookmarkResult>("POST", "/dashboard/applications", "Save", payload);
}

export interface ManualApplicationPayload {
    title: string;
    company?: string | null;
    url?: string | null;
    location?: string | null;
    status?: "saved" | "applied";
    cv_snapshot?: CvBreakdown | null;
}

/** An application the user made outside JobRadar, no scanned job behind it. */
export function CreateManualApplication(payload: ManualApplicationPayload): Promise<{ application_id: number }> {
    return authed("POST", "/dashboard/applications/manual", "Add application", payload);
}

/** Reads a job link server-side. Partial results are normal, not errors. */
export function ExtractJob(url: string): Promise<ExtractedJob> {
    return authed<ExtractedJob>("POST", "/dashboard/applications/extract", "Reading the job link", {url});
}

export interface UrlApplicationPayload {
    url: string;
    title: string;
    job_id?: number | null;
    company?: string | null;
    location?: string | null;
    workplace?: Workplace | null;
    employment_type?: string | null;
    salary?: string | null;
    source?: string | null;
    status?: "saved" | "applied";
    cv_snapshot?: CvBreakdown | null;
    /** Shown optimistically; the server scores the job itself. Not sent. */
    match?: number | null;
}

/** Saves the reviewed result of a pasted job link. */
export function CreateApplicationFromUrl({match: _shown, ...payload}: UrlApplicationPayload): Promise<{ application_id: number }> {
    return authed("POST", "/dashboard/applications/from-url", "Save application", payload);
}

export function ListApplications(): Promise<ApplicationRow[]> {
    return authed<ApplicationRow[]>("GET", "/dashboard/applications", "Applications");
}

export function TransitionApplication(
    id: number,
    to_status: Exclude<ApplicationStatus, "saved">
): Promise<{ status: ApplicationStatus }> {
    return authed("POST", `/dashboard/applications/${id}/transition`, "Status change", {to_status});
}

/** Corrects the day the user applied (YYYY-MM-DD); not for a job only saved. */
export function SetAppliedDate(id: number, applied_on: string): Promise<{ applied_at: string }> {
    return authed("POST", `/dashboard/applications/${id}/applied`, "Applied date", {applied_on});
}

/** Deletes a terminal application (saved, withdrawn, rejected) and its history. */
export function DeleteApplication(id: number): Promise<{ deleted: number }> {
    return authed("DELETE", `/dashboard/applications/${id}`, "Delete");
}

/** Deletes the saved, rejected and withdrawn ones; active applications are kept. */
export function DeleteApplications(ids: number[]): Promise<{ deleted: number[]; kept: number[] }> {
    return authed("POST", "/dashboard/applications/delete", "Delete", {ids});
}

/** Wipes cv, analyses and applications but keeps the account itself. */
export function DeleteMyData(): Promise<{ deleted: boolean }> {
    return authed("DELETE", "/account/data", "Data deletion");
}

/** Removes the account and everything under it: cv, analyses, applications. */
export function DeleteAccount(): Promise<{ deleted: boolean }> {
    return authed("DELETE", "/account", "Account deletion");
}

export function ApplicationHistory(id: number): Promise<ApplicationEvent[]> {
    return authed("GET", `/dashboard/applications/${id}/history`, "History");
}

/** The daily job pool matched to the saved CV. 404 (ApiError) when there is no CV yet. */
export function GetOpportunities(sort: "newest" | "match" = "newest"): Promise<OpportunitiesResponse> {
    return authed("GET", `/dashboard/opportunities?sort=${sort}`, "Opportunities");
}

/**
 * What importing a spreadsheet would do. Writes nothing: to correct a column,
 * send the same file again with `mapping` ({column index: field or null}).
 */
export async function PreviewImport(
    file: File,
    mapping?: Record<number, ImportField | null>,
    dateOrder?: "dmy" | "mdy"
): Promise<ImportPreview> {
    const form = new FormData();
    form.append("file", file);
    if (mapping && Object.keys(mapping).length > 0) form.append("mapping", JSON.stringify(mapping));
    if (dateOrder) form.append("date_order", dateOrder);
    const headers = {Authorization: `Bearer ${await getApiToken()}`};
    return request<ImportPreview>("/dashboard/applications/import/preview",
        {method: "POST", body: form, headers}, SAVE_TIMEOUT_MS, "Reading the spreadsheet");
}

/** Imports the rows the user confirmed. Duplicates are checked again and skipped. */
export function CommitImport(rows: ImportValues[], fileName: string | null): Promise<ImportResult> {
    return authed("POST", "/dashboard/applications/import", "Import", {rows, file_name: fileName});
}
/** What is kept from the latest CV: the skills read from it, never the file. */
export interface LatestCV {
    file_name: string | null;
    /** ISO timestamp of the parse. */
    parsed_at: string;
    skills: string[];
    /** False when an older parser read it: AnalyzeReuse would 409, so ask for the CV again. */
    reusable: boolean;
}

/** The kept profile of the latest CV, or null when nothing is kept. */
export function GetLatestCV(): Promise<LatestCV | null> {
    return nullIfMissing(authed<LatestCV>("GET", "/cv/latest", "Saved CV"));
}

/** Forgets the skills kept from the latest CV. The next scan needs an upload. */
export function DeleteLatestCV(): Promise<{ deleted: boolean }> {
    return authed("DELETE", "/cv/latest", "Saved CV deletion");
}

/** A rescan from the kept CV skills, no upload. 404 nothing kept, 409 kept by an older parser. */
export function AnalyzeReuse(): Promise<JobRadarAnalysis> {
    return authed<JobRadarAnalysis>("POST", "/analyze/reuse", "Analysis", undefined, ANALYZE_TIMEOUT_MS);
}
