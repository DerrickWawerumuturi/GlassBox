import {fmt, pct, weekDate} from "@/lib/market-page";
import {MarketBody, YearsCount} from "@/lib/market-pages";

/*
 * The years of experience page (/market/entry-level-software/years-of-experience):
 * every sentence written from the entry level page's `experience` counts
 * (backend market_pages.experience). Read from software jobs with an early
 * career title, never from the entry level page's own set: that set takes in
 * any job requiring two years or less, so its years would answer themselves
 * (docs/decisions/market-pages.md, "Years of experience").
 */

export type Answer = {q: string; a: string};

const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
/** Jobs asking for `from` to `to` years (inclusive; `to` null is "or more"). */
const asking = (y: YearsCount, from: number, to: number | null) =>
    y.buckets.filter((b) => b.from >= from && (to === null || b.from <= to)).reduce((n, b) => n + b.jobs, 0);
const jobs = (y: YearsCount) => y.stated + y.unstated;

export const TOPIC = "How many years of experience entry level software jobs ask for";

/** The page's counts, or null when the body has none (a publication from before 19 Oct 2026) or no titled job. */
export function yearsCounts(page: MarketBody | null) {
    const e = page?.experience;
    if (!page || !e || !jobs(e.titled)) return null;
    return {page, titled: e.titled, software: e.software};
}
export type YearsCounts = NonNullable<ReturnType<typeof yearsCounts>>;

/** The H1: the question answered plainly. */
export function yearsHeadline({titled}: YearsCounts): string {
    if (titled.unstated * 2 > jobs(titled)) return "Most entry level software jobs don't ask for a number of years";
    if (asking(titled, 0, 2) * 2 > titled.stated) return "Most entry level software jobs ask for two years or less";
    return "Entry level software jobs and the years they ask for, counted";
}

/** "Of the 328 software jobs with an early career title in the week of …, 306 state no number of years. Of the 22 that do, 17 ask for two years or less." */
export function yearsAnswer({page, titled}: YearsCounts): string {
    const none = titled.unstated, upTo2 = asking(titled, 0, 2);
    const first = `Of the ${plural(jobs(titled), "software job", "software jobs")} with an early career title in the week of ${weekDate(page)}, `
        + `${fmt(none)} ${none === 1 ? "states" : "state"} no number of years.`;
    if (!titled.stated) return first;
    return `${first} Of the ${fmt(titled.stated)} that ${titled.stated === 1 ? "does" : "do"}, ${fmt(upTo2)} ${upTo2 === 1 ? "asks" : "ask"} for two years or less.`;
}

/** All software jobs, for scale: how many state a number, and how many of those ask for two years or less, or five or more. */
export function softwareLine({software}: YearsCounts): string | null {
    if (!software.stated) return null;
    return `Across all ${plural(jobs(software), "software job", "software jobs")} counted that week, ${fmt(software.stated)} state a number of years. `
        + `${fmt(asking(software, 0, 2))} of them ask for two years or less, and ${fmt(asking(software, 5, null))} ask for five years or more.`;
}

/** A bucket's short label in the chart: "0", "1", … "5+". */
export const bucketLabel = (b: {from: number; to: number | null}) => (b.to === null ? `${b.from}+` : String(b.from));
/** A bucket in a table or a sentence: "No experience", "1 year", "5 years or more". */
export const bucketWords = (b: {from: number; to: number | null}) =>
    b.from === 0 ? "No experience" : b.to === null ? `${b.from} years or more` : plural(b.from, "year", "years");

/** The chart's rows: one per group, each bar split by years asked, the jobs that state none hatched. */
export function yearsRows({titled, software}: YearsCounts) {
    const row = (name: string, y: YearsCount) => ({name, total: jobs(y), stated: y.stated, unstated: y.unstated, buckets: y.buckets});
    return [row("Early career titles", titled), ...(jobs(software) ? [row("All software jobs", software)] : [])];
}

/** The chart read aloud. */
export function yearsLabel(c: YearsCounts): string {
    return yearsRows(c).map((r) => `${r.name}, ${fmt(r.total)} jobs: ${fmt(r.unstated)} state no number, `
        + r.buckets.map((b) => `${fmt(b.jobs)} ask for ${bucketWords(b).toLowerCase()}`).join(", ") + ".").join(" ");
}

/** The share of titled jobs that state no number, out of 100: the share image's lit squares. */
export const unstatedShare = ({titled}: YearsCounts) => pct(titled.unstated, jobs(titled));

/** The page's questions, each answered with a count; a question the data can't answer is left out. */
export function yearsFaq(c: YearsCounts): Answer[] {
    const {page, software} = c, week = weekDate(page), out: Answer[] = [];
    out.push({q: "How many years of experience do entry level software jobs ask for?", a: yearsAnswer(c)});
    if (software.stated) {
        out.push({q: "How many software jobs ask for two years of experience or less?",
            a: `${fmt(asking(software, 0, 2))} of the ${fmt(software.stated)} software jobs that state a number of years, in the week of ${week}.`});
        out.push({q: "How many software jobs ask for five years of experience or more?",
            a: `${fmt(asking(software, 5, null))} of the ${fmt(software.stated)} software jobs that state a number of years, in the week of ${week}.`});
    }
    return out;
}

/** The method, in short: what an early career title is, how years are read, and why the entry level page's set isn't used. */
export const YEARS_METHOD = [
    "An early career title says intern, graduate, new grad, entry level, early career or junior. Software means five job types: software engineering, backend, frontend, full stack and mobile.",
    "Years are the highest number a job requires. A range counts from its low end. A number that is only preferred (\"ideally 3 years\") counts as not stated, and so does more than three years in an intern or graduate title: we take that number to be about something else.",
    "The entry level page also counts jobs that require two years or less, whatever their title. Here they count only among all software jobs, so the years they ask for can't decide the answer.",
];
