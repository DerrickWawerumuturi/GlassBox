import {fmt, longDate, pct} from "@/lib/market-page";
import {LeadFinding, MARKET_PAGES, MarketBody, MarketInfo, MarketName, SectionName, StorySkill} from "@/lib/market-pages";

/*
 * Every sentence on a market page, written by fixed templates over the counts
 * (decisions/market-pages.md, "Sentences are templates over numbers"). The
 * backend decides what may be said (market_story.py: the breadth rule, the
 * thresholds, the sections); these only say it. Each number names what it
 * counts, and no sentence tells anyone what to do (CLAUDE.md sections 1, 2).
 */

export type Ctx = {info: MarketInfo; page: MarketBody};

export const ctx = (name: MarketName, page: MarketBody): Ctx => ({info: MARKET_PAGES[name], page});

const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const skillName = ({page}: Ctx, key: string) => page.names[key] ?? key;
/** A skill's name mid sentence: "distributed systems", but "Python" and "LLMs" (skills.py, inline). */
export const inlineName = (c: Ctx, key: string) => c.page.inline_names?.[key] ?? skillName(c, key);
export const skill = ({page}: Ctx, key: string): StorySkill | undefined => page.story.skills.find((s) => s.key === key);
export const has = ({page}: Ctx, section: SectionName) => page.story.sections.includes(section);
/** Share of the page's readable jobs, and of the comparison set's. */
export const share = ({page}: Ctx, s: StorySkill) => pct(s.any, page.readable);
export const compareShare = ({page}: Ctx, s: StorySkill) => pct(s.compare_any, page.story.compare.readable);
/** The comparison set is shown only when it is big enough to be a share (the 100 rule). */
export const comparable = ({page}: Ctx) => page.story.compare.readable >= page.min_readable;

export function question({info}: Ctx | {info: MarketInfo}): string {
    return `What are ${info.subject} jobs actually asking for?`;
}

// ------------------------------------------------------------------ the lead finding (the H1)

const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** A number in a headline: under ten in words. */
export const say = (n: number) => (n < 10 ? WORDS[n] : fmt(n));

/** "Two in three", for a fraction the backend found honest (market_story.fraction). */
export const fractionPhrase = ([a, b]: [number, number]) => `${cap(WORDS[a] ?? fmt(a))} in ${WORDS[b] ?? fmt(b)}`;

export const finding = ({page}: Ctx): LeadFinding | null => (page.publishable ? page.story.finding ?? null : null);

/**
 * The page's H1: its lead finding in words, one pattern each
 * (decisions/market-pages.md, "Finding headlines"). Null when there is none:
 * then the question is the H1.
 */
export function headline(c: Ctx): string | null {
    const f = finding(c), s = c.info.subject;
    if (!f) return null;
    if (f.kind === "years") {
        const asked = bucketPhrase(f.years, f.years);
        return c.info.kind === "entry" ? `“Entry level” usually means ${asked}` : `Most ${s} jobs that state years ask for ${asked}`;
    }
    const [a, b] = f.skills.map((k) => inlineName(c, k));
    const lead = skillName(c, f.skills[0]);
    switch (f.kind) {
        case "share": return f.fraction ? `${fractionPhrase(f.fraction)} ${s} jobs name ${a}` : `${pct(f.jobs[0], f.of)}% of ${s} jobs name ${a}`;
        case "tied": return `${lead} and ${b} are almost tied at the top of ${s} jobs`;
        case "pair": return `${lead} and ${b} each appear in ${f.approx} half of ${s} jobs`;
        case "half": return `Half of ${s} jobs name ${a}`;
        case "leads": return `${lead} leads ${s} jobs, named in ${say(f.jobs[0])} of ${say(f.of)}`;
    }
}

/** The counted sentence behind the finding: "191 of the 287 we could read name LLMs." `jobs` names the jobs ("AI jobs"). */
export function findingCount(c: Ctx, jobs = ""): string | null {
    const f = finding(c), of = jobs ? ` ${jobs}` : "";
    if (!f) return null;
    if (f.kind === "years") return `${fmt(f.jobs)} of the ${fmt(f.of)}${of} that state a number of years ask for ${bucketPhrase(f.years, f.years)}.`;
    const named = `${fmt(f.jobs[0])} of the ${fmt(f.of)}${of} we could read name ${inlineName(c, f.skills[0])}`;
    return f.kind === "tied" || f.kind === "pair" ? `${named}, and ${fmt(f.jobs[1])} name ${inlineName(c, f.skills[1])}.` : `${named}.`;
}

/** The share of the finding's jobs the hub's square lights, out of 100. */
export function findingShare(c: Ctx): number | null {
    const f = finding(c);
    return f ? pct(f.kind === "years" ? f.jobs : f.jobs[0], f.of) : null;
}

/** The sentences under the headline: what was counted and when, then the count behind the finding. */
export function dek(c: Ctx): string {
    const {info, page} = c;
    const counted = `We counted ${plural(page.jobs, `${info.subject} job`, `${info.subject} jobs`)} at ${plural(page.employers, "employer", "employers")} on ${longDate(page.taken_at)}.`;
    const behind = findingCount(c);
    return behind ? `${counted} ${behind}` : `${counted} Too few could be read today to show shares.`;
}

/** Under the 100 rule: what the page shows instead of shares, and why. */
export const thin = ({page}: Ctx) =>
    `We could read ${fmt(page.readable)} of these jobs today. Below ${page.min_readable}, a share describes a few employers more than the market, so this page shows counts only.`;

export const UNAVAILABLE = "Today's count isn't ready yet. It's made from the live jobs every hour, so try again in a minute.";

export const framing = ({info}: Ctx) => [
    `Every morning Glassbox reads the jobs open on public job boards and counts the skills each one names. ${info.counts}`,
    "Each job counts once, however many boards or cities list it.",
];

// ------------------------------------------------------------------ the lead visual

export function squaresLegend(c: Ctx) {
    const {page} = c, sq = page.story.squares;
    const named = sq.skill + sq.both, interns = sq.both + sq.internship;
    return {skill: page.story.headline ? inlineName(c, page.story.headline) : null, named, without: page.jobs - named, interns};
}

export function squaresLabel(c: Ctx): string {
    const {info, page} = c, l = squaresLegend(c);
    const parts = [`${fmt(page.jobs)} squares, one per ${info.subject} job open on ${longDate(page.taken_at)}.`];
    if (l.skill) parts.push(`${fmt(l.named)} name ${l.skill}.`);
    if (l.interns) parts.push(`${fmt(l.interns)} are internships.`);
    return parts.join(" ");
}

export const squaresCaption = ({info, page}: Ctx) =>
    `${info.subject.charAt(0).toUpperCase()}${info.subject.slice(1)} jobs open on ${longDate(page.taken_at)}. Each square is one job.`;

// ------------------------------------------------------------------ findings

/** A finding at a glance: one sentence, and the words in it set in bold (the skill, or the count). */
export interface Finding {id: string; text: string; bold: string}

/** A years bucket in words: "no experience", "two years", "5 to 7 years", "8 years or more". */
export function bucketPhrase(from: number, to: number | null): string {
    const words = ["no experience", "one year", "two years", "three years"];
    if (to === from) return words[from] ?? `${from} years`;
    if (to === null) return `${from} years or more`;
    return `${from} to ${to} years`;
}

export function topBucket({page}: Ctx) {
    const buckets = page.story.years.buckets;
    return buckets.reduce((best, b) => (b.jobs > best.jobs ? b : best), buckets[0]);
}

/** Three findings, each a full sentence with its count, for "At a glance". The first is the headline's. */
export function glance(c: Ctx): Finding[] {
    const {info, page} = c, story = page.story, lead = finding(c);
    if (!story.headline || !lead) return [];
    const subject = `${info.subject} jobs`;
    const years: Finding | null = has(c, "years") ? (() => {
        const b = topBucket(c);
        return {id: "finding-years", bold: cap(bucketPhrase(b.from, b.to)),
            text: `${cap(bucketPhrase(b.from, b.to))} is the most common ask: ${fmt(b.jobs)} of the ${fmt(story.years.stated)} jobs that state a number.`};
    })() : null;
    const skillFinding: Finding = lead.kind === "years"
        ? {id: "finding-skill", bold: inlineName(c, story.headline), text: `${fmt(skill(c, story.headline)!.any)} of the ${fmt(page.readable)} ${subject} we could read name ${inlineName(c, story.headline)}.`}
        : {id: "finding-skill", bold: inlineName(c, lead.skills[0]), text: findingCount(c, subject)!};
    const out: Finding[] = lead.kind === "years" && years ? [years, skillFinding] : [skillFinding];
    const toward = has(c, "contrast") ? skill(c, story.contrast[0]) : undefined;
    if (toward) out.push({
        id: "finding-contrast", bold: skillName(c, toward.key),
        text: `${skillName(c, toward.key)} is named in ${share(c, toward)}% of ${info.subject} jobs and ${compareShare(c, toward)}% of ${info.compare} jobs.`,
    });
    if (years && lead.kind !== "years") out.push(years);
    if (out.length < 3 && has(c, "levels") && page.levels) out.push({
        id: "finding-levels", bold: fmt(page.levels.senior),
        text: `${fmt(page.levels.senior)} of the ${fmt(page.jobs)} ${info.subject} jobs are senior, lead or principal.`,
    });
    const [, , two, three] = story.languages.per_job;
    if (out.length < 3 && has(c, "languages")) out.push({
        id: "finding-languages", bold: fmt(two + three),
        text: `${fmt(two + three)} of the ${fmt(page.readable)} ${info.subject} jobs we could read name two or more languages.`,
    });
    return out.slice(0, 3);
}

export const findingText = (f: Finding) => f.text;

// ------------------------------------------------------------------ sections

export function languagesSection(c: Ctx) {
    const {info, page} = c;
    const [none, , two, three] = page.story.languages.per_job;
    const any = page.readable - none, many = two + three;
    const heading = many * 2 > page.readable ? "Most of them name more than one language"
        : any * 2 > page.readable ? "Most of them name at least one language" : "Fewer than half name a language";
    const bars = page.story.languages.bars.map((k) => skill(c, k)!).filter(Boolean);
    const top = bars[0];
    const more = bars.filter((s) => share(c, s) > compareShare(c, s)).length;
    return {
        heading,
        before: `${fmt(any)} of the ${fmt(page.readable)} ${info.subject} jobs we could read name at least one language, and ${fmt(many)} name two or more.`,
        bars,
        caption: [
            comparable(c) ? `Bars: ${info.subject} jobs. Grey tick: the share in ${fmt(page.story.compare.readable)} ${info.compare} jobs.` : `Bars: ${info.subject} jobs.`,
            top ? `${skillName(c, top.key)} is named by jobs at ${fmt(top.employers)} employers.` : "",
            `Only skills named by jobs at ${page.story.breadth} or more employers are shown.`,
        ].filter(Boolean).join(" "),
        after: comparable(c) && bars.length
            ? (more === bars.length ? `Each language in this chart is named more often in ${info.subject} jobs than in ${info.compare} jobs.`
                : `${fmt(more)} of the ${fmt(bars.length)} languages in this chart are named more often in ${info.subject} jobs than in ${info.compare} jobs.`)
            : null,
    };
}

export function contrastSection(c: Ctx) {
    const {info, page} = c;
    const rows = page.story.contrast.map((k) => skill(c, k)!).filter(Boolean);
    const toward = rows.find((s) => share(c, s) > compareShare(c, s))!;
    const away = rows.find((s) => share(c, s) < compareShare(c, s))!;
    const far = (a: number, b: number) => (b > 0 && a >= 2 * b ? "far " : "");
    const t = skillName(c, toward.key), a = skillName(c, away.key);
    const [ts, tc, as, ac] = [share(c, toward), compareShare(c, toward), share(c, away), compareShare(c, away)];
    return {
        heading: info.kind === "entry"
            ? `${t} shows up ${far(ts, tc)}more at entry level. ${a} ${far(ac, as)}less.`
            : `Senior ${info.subject} jobs name ${a} ${far(ac, as)}more often. ${t} ${far(ts, tc)}less.`,
        before: `Put the same skills side by side, and two groups appear. The top rows lean to ${info.subject} jobs. The bottom rows lean to ${info.compare} jobs.`,
        rows,
        legend: {left: cap(info.subject), right: cap(info.compare)},
        caption: `Only skills named by jobs at ${page.story.breadth} or more employers are shown, so one company's hiring can't make a pattern.`,
        after: `${t} appears in ${plural(toward.any, `${info.subject} job`, `${info.subject} jobs`)} at ${plural(toward.employers, "employer", "employers")}: ${ts}% of them, against ${tc}% of ${info.compare} jobs. ${a} goes the other way: ${as}% here, ${ac}% in ${info.compare} jobs.`,
    };
}

const CATEGORY: Record<string, [string, string]> = {
    language: ["Languages", "languages"], frontend: ["Frontend", "frontend"], backend: ["Backend and systems", "backend systems"],
    cloud: ["Cloud", "cloud"], devops: ["DevOps and operations", "DevOps"], ml: ["AI and machine learning", "AI"],
    data: ["Data", "data"], database: ["Databases", "databases"], security: ["Security", "security"], tool: ["Developer tools", "developer tools"],
    testing: ["Testing", "testing"], mobile: ["Mobile", "mobile"], design: ["Design", "design"], product: ["Product", "product"],
    infra: ["Infrastructure", "infrastructure"], embedded: ["Embedded", "embedded"],
};
export const categoryName = (key: string, inline = false) => (CATEGORY[key] ?? [cap(key), key])[inline ? 1 : 0];

export function categoriesSection(c: Ctx) {
    const {info, page} = c, cats = page.story.categories;
    const [first, second] = cats;
    return {
        heading: second ? `Beyond the languages, ${categoryName(first.category, true)} and ${categoryName(second.category, true)} come up most`
            : `Beyond the languages, ${categoryName(first.category, true)} comes up most`,
        before: `${fmt(first.jobs)} of the ${fmt(page.readable)} ${info.subject} jobs we could read name a skill in ${categoryName(first.category, true)}.`
            + (second ? ` ${fmt(second.jobs)} name one in ${categoryName(second.category, true)}.` : ""),
        groups: cats.map((g) => ({...g, title: categoryName(g.category), rows: g.skills.map((k) => skill(c, k)!).filter(Boolean)})),
        caption: comparable(c)
            ? `Each bar is the share of the ${fmt(page.readable)} ${info.subject} jobs we could read. The grey tick is the share of the ${fmt(page.story.compare.readable)} ${info.compare} ones.`
            : `Each bar is the share of the ${fmt(page.readable)} ${info.subject} jobs we could read.`,
    };
}

export function yearsSection(c: Ctx) {
    const {info, page} = c, y = page.story.years, b = topBucket(c);
    const most = b.jobs * 2 > y.stated;
    return {
        // When the years are the page's headline, the section says the count instead of repeating it.
        heading: finding(c)?.kind === "years" ? `${fmt(b.jobs)} of the ${fmt(y.stated)} jobs that state years ask for ${bucketPhrase(b.from, b.to)}`
            : info.kind === "entry"
            ? `“Entry level” ${most ? "usually" : "most often"} means ${bucketPhrase(b.from, b.to)}`
            : most ? `Most ${info.subject} jobs that state years ask for ${bucketPhrase(b.from, b.to)}` : `${cap(bucketPhrase(b.from, b.to))} is the most common ask`,
        pull: `${fmt(b.jobs)} of ${fmt(y.stated)}`,
        pullLine: `${info.subject} jobs that state a number ask for ${bucketPhrase(b.from, b.to)}.`,
        top: b,
        label: `Of ${fmt(y.stated)} jobs that state years: ` + y.buckets.map((x) => `${fmt(x.jobs)} ask for ${bucketPhrase(x.from, x.to)}`).join(", ") + ".",
        stated: `${fmt(y.stated)} of the ${fmt(page.jobs)} jobs state a number of years. The other ${fmt(y.unstated)} don't say.`,
    };
}

export function levelsSection(c: Ctx) {
    const {info, page} = c, l = page.levels!;
    return {
        heading: l.senior * 2 > page.jobs ? `Most ${info.subject} jobs are senior` : `${fmt(l.senior)} of the ${fmt(page.jobs)} ${info.subject} jobs are senior`,
        before: `Senior here means a senior, lead or principal level. ${fmt(l.junior)} of the ${fmt(page.jobs)} jobs read as intern, entry level or junior, ${fmt(l.mid)} as mid level, and ${fmt(l.unstated)} don't say.`,
        label: `Of ${fmt(page.jobs)} ${info.subject} jobs: ${fmt(l.junior)} junior, ${fmt(l.mid)} mid level, ${fmt(l.senior)} senior, ${fmt(l.unstated)} not stated.`,
    };
}

export function hiringSection(c: Ctx) {
    const {page} = c, big = page.largest_employer;
    const dominates = big && big.jobs * 5 >= page.jobs;
    return {
        heading: "Who is hiring, and where",
        before: `${fmt(page.employers)} employers posted these jobs.` + (big ? (dominates
            ? ` ${big.name} has the most, ${fmt(big.jobs)} of the ${fmt(page.jobs)}.`
            : ` No single one dominates: ${big.name} has the most, ${fmt(big.jobs)} of the ${fmt(page.jobs)}.`) : ""),
        places: `${fmt(page.places.us)} name a place in the US, ${fmt(page.places.elsewhere)} a place elsewhere, ${fmt(page.places.unknown)} no country we can read.`,
        caption: "Hatched: the job names no country we can read. Countries one by one are too few to show.",
    };
}

export const citeLine = (c: Ctx, host: string) =>
    `Glassbox. "${headline(c) ?? question(c)}" Counted ${longDate(c.page.taken_at)}. ${host}/market/${c.info.name}`;

// ------------------------------------------------------------------ search and share

/** "What entry level software jobs ask for: 136 jobs counted" (the layout adds " · Glassbox"). */
export function pageTitle(info: MarketInfo, page: MarketBody | null): string {
    const base = `What ${info.subject} jobs ask for`;
    return page ? `${base}: ${fmt(page.jobs)} jobs counted` : base;
}

/** The search snippet: the question (what people search), the finding, and the count with its date. */
export function pageDescription(info: MarketInfo, page: MarketBody | null): string {
    if (!page) return `The skills ${info.subject} jobs name, counted from today's live jobs.`;
    const c = {info, page}, lead = headline(c);
    const counted = `Counted on ${longDate(page.taken_at)}: ${plural(page.jobs, "job", "jobs")} at ${plural(page.employers, "employer", "employers")}.`;
    return `${question(c)} ${lead ? `${lead}.` : "Too few could be read today to show shares."} ${counted}`;
}

/** A hub card's line under the headline: the question, then the count behind the finding. */
export function cardLine(c: Ctx): string {
    const behind = findingCount(c);
    return behind ? `${question(c)} ${behind}` : `${question(c)} ${thin(c)}`;
}
