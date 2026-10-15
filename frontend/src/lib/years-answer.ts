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
export const asking = (y: YearsCount, from: number, to: number | null) =>
    y.buckets.filter((b) => b.from >= from && (to === null || b.from <= to)).reduce((n, b) => n + b.jobs, 0);
export const jobs = (y: YearsCount) => y.stated + y.unstated;

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
    const row = (key: "titled" | "software", name: string, y: YearsCount) => ({key, name, total: jobs(y), stated: y.stated, unstated: y.unstated, buckets: y.buckets, y});
    return [row("titled", "Early career titles", titled), ...(jobs(software) ? [row("software", "All software jobs", software)] : [])];
}
export type YearsRow = ReturnType<typeof yearsRows>[number];

/** One row read aloud: every count, the jobs that state none first. */
export const rowLabel = (r: YearsRow) => `${r.name}, ${fmt(r.total)} jobs: ${fmt(r.unstated)} state no number, `
    + r.buckets.map((b) => `${fmt(b.jobs)} ask for ${bucketWords(b).toLowerCase()}`).join(", ") + ".";

/** The chart read aloud. */
export function yearsLabel(c: YearsCounts): string {
    return yearsRows(c).map(rowLabel).join(" ");
}

/** The share of titled jobs that state no number, out of 100: the share image's lit squares. */
export const unstatedShare = ({titled}: YearsCounts) => pct(titled.unstated, jobs(titled));

/** The page's questions, each answered with a count; a question the data can't answer is left out. */
export function yearsFaq(c: YearsCounts): Answer[] {
    const {software} = c, out: Answer[] = [];
    out.push({q: "How many years of experience do entry level software jobs ask for?", a: yearsAnswer(c)});
    if (software.stated) {
        out.push({q: "How many software jobs ask for two years of experience or less?",
            a: `${fmt(asking(software, 0, 2))} of the ${fmt(software.stated)} software jobs that state a number of years.`});
        out.push({q: "How many software jobs ask for five years of experience or more?",
            a: `${fmt(asking(software, 5, null))} of the ${fmt(software.stated)} software jobs that state a number of years.`});
    }
    return out;
}

/** The method, in short: what an early career title is, how years are read, and why the entry level page's set isn't used. */
export const YEARS_METHOD = [
    "An early career title says intern, graduate, new grad, entry level, early career or junior. Software means five job types: software engineering, backend, frontend, full stack and mobile.",
    "Years are the highest number a job requires. A range counts from its low end. A number that is only preferred (\"ideally 3 years\") counts as not stated, and so does more than three years in an intern or graduate title: we take that number to be about something else.",
    "The entry level page also counts jobs that require two years or less, whatever their title. Here they count only among all software jobs, so the years they ask for can't decide the answer.",
];

/*
 * "Count the rings" (founder, 16 Oct 2026; docs/local/editorial-sprint/years-page):
 * a woodpile seen end on, one log end per job, its rings the years the job
 * asks for. The lines below are the ones that design adds, each written from
 * the same counts, so the page stays a weekly page: a refresh changes the
 * numbers and these follow (years-answer.test.ts tries two made up weeks).
 */

/** A log's kind: -1 a sealed end (no number stated), 0 to 4 the years asked, 5 for five or more. */
export type LogKind = number;
export type Paint = "lime" | "tan" | "dark";

/** The three paints, heaviest first, cut where the live chart's tones were: lime two or less, bare wood three or four, heartwood five or more. */
export const GROUPS: Array<{key: string; name: string; from: number; to: number | null; tone: Paint}> = [
    {key: "five", name: "5 years or more", from: 5, to: null, tone: "dark"},
    {key: "mid", name: "3 or 4 years", from: 3, to: 4, tone: "tan"},
    {key: "low", name: "2 years or less", from: 0, to: 2, tone: "lime"},
];
export const tone = (from: number): Paint => (from <= 2 ? "lime" : from <= 4 ? "tan" : "dark");

/** One kind per job: the stated ones by bucket, then one sealed end for each job that states no number. */
export function logKinds(y: YearsCount): LogKind[] {
    const out: LogKind[] = [];
    for (const b of y.buckets) for (let i = 0; i < b.jobs; i++) out.push(Math.min(5, b.from));
    for (let i = 0; i < y.unstated; i++) out.push(-1);
    return out;
}

/** A pile's key and layers, top layer first: the sealed ends, then two or less, three or four, five or more. A kind with no jobs is left out. */
export function pileGroups(r: Pick<YearsRow, "unstated" | "y">) {
    return [
        {key: "none", name: "None stated", n: r.unstated, t: -1},
        ...[...GROUPS].reverse().map((g) => ({key: g.key, name: g.name, n: asking(r.y, g.from, g.to), t: g.from === 0 ? 1 : g.from})),
    ].filter((g) => g.n > 0);
}

export const kicker = ({page}: YearsCounts) => `Count the rings · week of ${weekDate(page)}`;
/** The big stamped count: "306 of 328". */
export const stamp = ({titled}: YearsCounts) => `${fmt(titled.unstated)} of ${fmt(jobs(titled))}`;

export const pileCaption = (r: YearsRow) => (r.key === "titled"
    ? `Each log end is one of the ${plural(r.total, "software job", "software jobs")} with an early career title. Its rings are the years the job asks for. A sealed grey end states no number.`
    : `Each log end is one of the ${plural(r.total, "software job", "software jobs")} in the weekly count, whatever the title. Same rings, same paint.`);

export const ringedHeading = ({titled}: YearsCounts) => (titled.stated === 1 ? "The one that states a number" : `The ${fmt(titled.stated)} that state a number`);
export function ringedLine({titled}: YearsCounts) {
    const n = asking(titled, 0, 2);
    return `${fmt(n)} of the ${plural(titled.stated, "early career job that states", "early career jobs that state")} a number ${n === 1 ? "asks" : "ask"} for two years or less.`;
}
/** Above this many early career jobs stating a number, the ringed logs show one log per group with its count. */
export const RINGED_EACH = 60;

export const yardLead = ({software}: YearsCounts) => `The same rings on all ${plural(jobs(software), "software job", "software jobs")} in the weekly count, whatever the title.`;

/** The line over each row's log on its side: of those that state a number, how many ask for two or less and five or more. */
export function roundsLine(r: YearsRow) {
    if (!r.stated) return `${r.name}: none of the ${fmt(r.total)} state a number.`;
    const low = asking(r.y, 0, 2), five = asking(r.y, 5, null);
    return `${r.name}: of the ${fmt(r.stated)} that state a number, ${fmt(low)} ${low === 1 ? "asks" : "ask"} for two years or less and ${fmt(five)} for five or more.`;
}

/** One log, read aloud when tapped. */
export const logWords = (t: LogKind) => (t < 0 ? "This job states no number of years."
    : t === 0 ? "This job asks for no experience. A bare log, no rings."
        : t >= 5 ? "This job asks for five years or more." : `This job asks for ${t === 1 ? "1 year" : `${t} years`}.`);

/** Which parts the week's counts can fill: the ringed logs need an early career job stating a number; the yard needs an all software count. */
export const yearsSections = (c: YearsCounts) => ({ringed: c.titled.stated > 0, yard: jobs(c.software) > 0});
