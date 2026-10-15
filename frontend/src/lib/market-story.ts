import {fmt, pct, weekDate} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {yearsCounts} from "@/lib/years-answer";
import {LeadFinding, MARKET_PAGES, MarketBody, MarketInfo, MarketName, SectionName, StorySkill} from "@/lib/market-pages";

/*
 * Every sentence on a market page, written by fixed templates over the counts
 * (decisions/market-pages.md, "Sentences are templates over numbers"). The
 * backend decides what may be said (market_story.py: the breadth rule, the
 * thresholds, the sections); these only say it. Each number names what it
 * counts, and no sentence tells anyone what to do (CLAUDE.md sections 1, 2).
 * Nothing here is a question: a line says what was found or what a chart
 * counts. Counts are published weekly, so they are dated by their week
 * (weekDate), never "today".
 */

export type Ctx = {info: MarketInfo; page: MarketBody};

export const ctx = (name: MarketName, page: MarketBody): Ctx => ({info: MARKET_PAGES[name], page});

const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const skillName = ({page}: Ctx, key: string) => page.names[key] ?? key;
/** A skill's name mid sentence: "distributed systems", but "Python" and "LLMs" (skills.py, inline). */
export const inlineName = (c: Ctx, key: string) => c.page.inline_names?.[key] ?? skillName(c, key);
export const skill = ({page}: Ctx, key: string): StorySkill | undefined => page.story.skills.find((s) => s.key === key);
/**
 * The entry level set takes in jobs requiring two years or less, so its own years are circular:
 * no years section there, whatever a publication from before 19 Oct 2026 says (market_story `own_years`).
 */
export const has = ({info, page}: Ctx, section: SectionName) =>
    page.story.sections.includes(section) && !(section === "years" && info.kind === "entry");
/** Share of the page's readable jobs, and of the comparison set's. */
export const share = ({page}: Ctx, s: StorySkill) => pct(s.any, page.readable);
export const compareShare = ({page}: Ctx, s: StorySkill) => pct(s.compare_any, page.story.compare.readable);
/** The comparison set is shown only when it is big enough to be a share (the 100 rule). */
export const comparable = ({page}: Ctx) => page.story.compare.readable >= page.min_readable;

/** What a page counts, as a statement: the line above its finding, its title when there is no finding, and its link. */
export function topic({info}: Ctx | {info: MarketInfo}): string {
    return `What ${info.subject} jobs ask for`;
}

// ------------------------------------------------------------------ the lead finding (the H1)

const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** A number in a headline: under ten in words. */
export const say = (n: number) => (n < 10 ? WORDS[n] : fmt(n));

/** "Two in three", for a fraction the backend found honest (market_story.fraction). */
export const fractionPhrase = ([a, b]: [number, number]) => `${cap(WORDS[a] ?? fmt(a))} in ${WORDS[b] ?? fmt(b)}`;

/** The lead finding; never the entry level page's own years (circular, see `has`). */
export function finding({info, page}: Ctx): LeadFinding | null {
    const f = page.publishable ? page.story.finding ?? null : null;
    return f?.kind === "years" && info.kind === "entry" ? null : f;
}

/**
 * The page's H1: its lead finding in words, one pattern each
 * (decisions/market-pages.md, "Finding headlines"). Null when there is none:
 * then the topic is the H1.
 */
export function headline(c: Ctx): string | null {
    const f = finding(c), s = c.info.subject;
    if (!f) return null;
    if (f.kind === "years") {
        const asked = bucketPhrase(f.years, f.years);
        return `Most ${s} jobs that state years ask for ${asked}`;
    }
    const [a, b] = f.skills.map((k) => inlineName(c, k));
    const lead = skillName(c, f.skills[0]);
    switch (f.kind) {
        case "share": return f.fraction ? `${fractionPhrase(f.fraction)} ${s} jobs name ${a}` : `${pct(f.jobs[0], f.of)}% of ${s} jobs name ${a}`;
        case "tied": return `${lead} and ${b} are almost tied at the top of ${s} jobs`;
        case "pair": return `${lead} and ${b} each appear in ${f.approx} half of ${s} jobs`;
        case "half": return `${cap(f.approx)} half of ${s} jobs name ${a}`;
        case "leads": return `${lead} leads ${s} jobs, named in ${say(f.jobs[0])} of ${say(f.of)}`;
    }
}

/** The counted sentence behind the finding: "191 of the 287 we read name LLMs." `jobs` names the jobs ("AI jobs"). */
export function findingCount(c: Ctx, jobs = ""): string | null {
    const f = finding(c), of = jobs ? ` ${jobs}` : "";
    if (!f) return null;
    if (f.kind === "years") return `${fmt(f.jobs)} of the ${fmt(f.of)}${of} that state a number of years ask for ${bucketPhrase(f.years, f.years)}.`;
    const named = `${fmt(f.jobs[0])} of the ${fmt(f.of)}${of} we read name ${inlineName(c, f.skills[0])}`;
    return f.kind === "tied" || f.kind === "pair" ? `${named}, and ${fmt(f.jobs[1])} name ${inlineName(c, f.skills[1])}.` : `${named}.`;
}

/**
 * The skills that may lead, most named first: broad ones, from the headline
 * skill on. A broad skill above it names the job type itself (market_pages.DEFINING).
 */
export function leadSkills({page}: Ctx): StorySkill[] {
    const skills = page.story.skills, from = skills.findIndex((s) => s.key === page.story.headline);
    return page.publishable && from >= 0 ? skills.slice(from).filter((s) => s.broad) : [];
}

/** "312 of the 560 we read name Python, 180 name SQL and 150 name Java." `jobs` names the jobs. Null without a lead skill. */
export function skillsCount(c: Ctx, jobs = "", n = 3): string | null {
    const top = leadSkills(c).slice(0, n), of = jobs ? ` ${jobs}` : "";
    if (!top.length) return null;
    const parts = top.map((s, i) => (i === 0 ? `${fmt(s.any)} of the ${fmt(c.page.readable)}${of} we read name ${inlineName(c, s.key)}`
        : `${fmt(s.any)} name ${inlineName(c, s.key)}`));
    return `${list(parts)}.`;
}

/** The share of the finding's jobs the hub's square lights, out of 100. */
export function findingShare(c: Ctx): number | null {
    const f = finding(c);
    return f ? pct(f.kind === "years" ? f.jobs : f.jobs[0], f.of) : null;
}

/**
 * The sentences under the headline: what was found and when, then why the
 * skills come from fewer jobs ("had an ad long enough to read"), said where
 * the reader meets the smaller number, and the count behind the finding.
 * Every "we read" after this leans on it.
 */
export function dek(c: Ctx): string {
    const {info, page} = c;
    const found = `In the week of ${weekDate(page)} we found ${plural(page.jobs, `${info.subject} job`, `${info.subject} jobs`)} at ${plural(page.employers, "employer", "employers")}.`;
    const read = `${page.readable === page.jobs ? "All " : ""}${fmt(page.readable)} had an ad long enough to read for skills`;
    const f = finding(c);
    if (f && f.kind !== "years") {
        const second = f.kind === "tied" || f.kind === "pair" ? `, ${fmt(f.jobs[1])} ${inlineName(c, f.skills[1])}` : "";
        return `${found} ${read}, and ${fmt(f.jobs[0])} of those name ${inlineName(c, f.skills[0])}${second}.`;
    }
    // A years headline, or no finding: the page's most named skill, then the years behind the headline.
    const top = leadSkills(c)[0];
    if (!top) return page.readable < page.min_readable
        ? `${found} Fewer than ${fmt(page.min_readable)} had an ad long enough to read, so this page shows counts and no shares this week.`
        : `${found} ${read}.`;
    const named = `${fmt(top.any)} of those name ${inlineName(c, top.key)}`;
    return f ? `${found} ${read}. ${cap(named)}. ${findingCount(c)}` : `${found} ${read}, and ${named}.`;
}

/**
 * The method fold's sentence on every market page and story: one wording for
 * all ten, and it says what "read" meant ("long enough to read").
 */
export function readLine(readable: number, jobs: number): string {
    const short = jobs - readable;
    return `We look for about 250 named skills, by fixed rules, in the ${fmt(readable)} ads long enough to read.`
        + (short > 0 ? ` The other ${fmt(short)} ${short === 1 ? "was" : "were"} too short.` : "");
}

/** Under the 100 rule: what the page shows instead of shares, and why. */
export const thin = ({page}: Ctx) =>
    `Only ${fmt(page.readable)} of these jobs had an ad long enough to read. Below ${page.min_readable}, a share says more about a few employers than about the market, so this page shows counts only.`;

export const UNAVAILABLE = "This week's page isn't ready yet. Try again in a minute.";

export const framing = ({info}: Ctx) => [
    `Glassbox reads the jobs open on public job boards every six hours and counts the skills each one names. ${info.counts}`,
    "Every Monday a new week replaces this one here. The story linked in the rail keeps one week and looks closer.",
];

// ------------------------------------------------------------------ the lead visual

export function squaresLegend(c: Ctx) {
    const {page} = c, sq = page.story.squares;
    const named = sq.skill + sq.both, interns = sq.both + sq.internship;
    return {skill: page.story.headline ? inlineName(c, page.story.headline) : null, named, without: page.jobs - named, interns};
}

export function squaresLabel(c: Ctx): string {
    const {info, page} = c, l = squaresLegend(c);
    const parts = [`${fmt(page.jobs)} squares, one per ${info.subject} job counted in the week of ${weekDate(page)}.`];
    if (l.skill) parts.push(`${fmt(l.named)} name ${l.skill}.`);
    if (l.interns) parts.push(`${fmt(l.interns)} are internships.`);
    return parts.join(" ");
}

/** The byline above has the week; the aria label (squaresLabel) keeps it for a screen reader. */
export const squaresCaption = ({info}: Ctx) => `${cap(info.subject)} jobs that week, one square each.`;

// ------------------------------------------------------------------ findings

/** A finding at a glance: one sentence, the words in it set in bold (the skill, or the count), and a page that says more. */
export interface Finding {id: string; text: string; bold: string; href?: string}

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
    if (!story.headline || !page.publishable) return [];
    const subject = `${info.subject} jobs`;
    const years: Finding | null = has(c, "years") ? (() => {
        const b = topBucket(c);
        return {id: "finding-years", bold: cap(bucketPhrase(b.from, b.to)),
            text: `${cap(bucketPhrase(b.from, b.to))} is the most common ask: ${fmt(b.jobs)} of the ${fmt(story.years.stated)} jobs that state a number.`};
    })() : null;
    const skillFinding: Finding = !lead || lead.kind === "years"
        ? {id: "finding-skill", bold: inlineName(c, story.headline), text: `${fmt(skill(c, story.headline)!.any)} of the ${fmt(page.readable)} ${subject} we read name ${inlineName(c, story.headline)}.`}
        : {id: "finding-skill", bold: inlineName(c, lead.skills[0]), text: findingCount(c, subject)!};
    const out: Finding[] = lead?.kind === "years" && years ? [years, skillFinding] : [skillFinding];
    // The entry level page's years come from early career titles, on their own page.
    const titled = info.kind === "entry" ? yearsCounts(page) : null;
    if (titled) out.push({
        id: "finding-years", bold: fmt(titled.titled.unstated), href: YEARS_PATH,
        text: `${fmt(titled.titled.unstated)} of the ${fmt(titled.titled.stated + titled.titled.unstated)} software jobs with an early career title state no number of years.`,
    });
    const toward = has(c, "contrast") ? skill(c, story.contrast[0]) : undefined;
    if (toward) out.push({
        id: "finding-contrast", bold: skillName(c, toward.key),
        text: `${skillName(c, toward.key)} is named in ${share(c, toward)}% of ${info.subject} jobs and ${compareShare(c, toward)}% of ${info.compare} jobs.`,
    });
    if (years && lead?.kind !== "years") out.push(years);
    if (out.length < 3 && has(c, "levels") && page.levels) out.push({
        id: "finding-levels", bold: fmt(page.levels.senior),
        text: `${fmt(page.levels.senior)} of the ${fmt(page.jobs)} ${info.subject} jobs are senior, lead or principal.`,
    });
    const [, , two, three] = story.languages.per_job;
    if (out.length < 3 && has(c, "languages")) out.push({
        id: "finding-languages", bold: fmt(two + three),
        text: `${fmt(two + three)} of the ${fmt(page.readable)} ${info.subject} jobs we read name two or more languages.`,
    });
    return out.slice(0, 3);
}

export const findingText = (f: Finding) => f.text;

// ------------------------------------------------------------------ sections

export function languagesSection(c: Ctx) {
    const {info, page} = c;
    const [none, , two, three] = page.story.languages.per_job;
    const any = page.readable - none, many = two + three;
    const heading = many * 2 > page.readable ? "Most list more than one language"
        : any * 2 > page.readable ? "Most list at least one language" : "Fewer than half list a language";
    const bars = page.story.languages.bars.map((k) => skill(c, k)!).filter(Boolean);
    const top = bars[0];
    const more = bars.filter((s) => share(c, s) > compareShare(c, s)).length;
    return {
        heading,
        sub: `Share of the ${fmt(page.readable)} jobs read, by language`,
        before: `${fmt(any)} of the ${fmt(page.readable)} we read list at least one programming language. ${fmt(many)} list two or more.`,
        bars,
        // The first "senior" on the page gets its meaning, and the breadth rule its reason, here; later figures lean on both.
        caption: [
            comparable(c) ? `Bars: these ${fmt(page.readable)} jobs. Grey tick: the same share in ${fmt(page.story.compare.readable)} ${info.compare} jobs, senior meaning a senior, lead or principal title.`
                : `Bars: these ${fmt(page.readable)} jobs.`,
            `A language is shown only when jobs at ${page.story.breadth} or more employers mention it, so one company's hiring can't make a pattern.`,
            top ? `${skillName(c, top.key)}'s come from ${fmt(top.employers)}.` : "",
        ].filter(Boolean).join(" "),
        after: comparable(c) && bars.length
            ? (more === bars.length ? `Every language here comes up more often than in ${info.compare} jobs.`
                : `${fmt(more)} of these ${fmt(bars.length)} languages come up more often here than in ${info.compare} jobs.`)
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
        sub: "Share of each set that mentions the skill",
        before: `Put the same skills side by side, and two groups appear. The top rows lean to ${info.subject} jobs. The bottom rows lean to ${info.compare} jobs.`,
        rows,
        legend: {left: cap(info.subject), right: cap(info.compare)},
        // The languages figure gives the rule's reason; without it on the page, the reason stays here.
        caption: has(c, "languages") ? `Same rule as the languages: a skill needs jobs at ${page.story.breadth} or more employers to be shown.`
            : `Only skills named by jobs at ${page.story.breadth} or more employers are shown, so one company's hiring can't make a pattern.`,
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
/** "a DevOps", "an AI": a category before "skill". */
const article = (name: string) => `${/^[aeiouAEIOU]/.test(name) ? "an" : "a"} ${name}`;

export function categoriesSection(c: Ctx) {
    const {info, page} = c, cats = page.story.categories;
    const [first, second] = cats;
    return {
        heading: second ? `Beyond the languages, ${categoryName(first.category, true)} and ${categoryName(second.category, true)} come up most`
            : `Beyond the languages, ${categoryName(first.category, true)} comes up most`,
        sub: `Share of the ${fmt(page.readable)} jobs read that mention each skill`,
        before: `${fmt(first.jobs)} of the ${fmt(page.readable)} jobs read list ${article(categoryName(first.category, true))} skill.`
            + (second ? ` ${fmt(second.jobs)} list one in ${categoryName(second.category, true)}.` : ""),
        groups: cats.map((g) => ({...g, title: categoryName(g.category), rows: g.skills.map((k) => skill(c, k)!).filter(Boolean)})),
        caption: comparable(c)
            ? `Each bar: the share of these ${fmt(page.readable)} jobs. Grey tick: the share of ${fmt(page.story.compare.readable)} ${info.compare} jobs.`
            : `Each bar: the share of these ${fmt(page.readable)} jobs.`,
    };
}

export function yearsSection(c: Ctx) {
    const {info, page} = c, y = page.story.years, b = topBucket(c);
    const most = b.jobs * 2 > y.stated;
    return {
        // When the years are the page's headline, the section says the count instead of repeating it.
        heading: finding(c)?.kind === "years" ? `${fmt(b.jobs)} of the ${fmt(y.stated)} jobs that state years ask for ${bucketPhrase(b.from, b.to)}`
            : most ? `Most ${info.subject} jobs that state years ask for ${bucketPhrase(b.from, b.to)}` : `${cap(bucketPhrase(b.from, b.to))} is the most common ask`,
        pull: `${fmt(b.jobs)} of ${fmt(y.stated)}`,
        pullLine: `${info.subject} jobs that state a number ask for ${bucketPhrase(b.from, b.to)}.`,
        top: b,
        label: `Of ${fmt(y.stated)} jobs that state years: ` + y.buckets.map((x) => `${fmt(x.jobs)} ask for ${bucketPhrase(x.from, x.to)}`).join(", ") + ".",
        stated: `${fmt(y.stated)} of the ${fmt(page.jobs)} jobs state a number of years. The other ${fmt(y.unstated)} don't say.`,
    };
}

/** "a", "a and b", "a, b and c". */
const list = (parts: string[]) => parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

export function levelsSection(c: Ctx) {
    const {info, page} = c, l = page.levels!;
    // A level no job has is left out, not written as zero.
    const read = ([[l.junior, "intern, entry level or junior"], [l.mid, "mid level"]] as Array<[number, string]>)
        .filter(([n]) => n > 0).map(([n, what], i) => `${fmt(n)} ${i === 0 ? "read as" : "as"} ${what}`);
    const others = [...read, ...(l.unstated > 0 ? [`${fmt(l.unstated)} don't say`] : [])];
    const counted = ([[l.junior, "junior"], [l.mid, "mid level"], [l.senior, "senior"], [l.unstated, "not stated"]] as Array<[number, string]>)
        .filter(([n]) => n > 0).map(([n, what]) => `${fmt(n)} ${what}`);
    return {
        heading: l.senior * 2 > page.jobs ? `Most ${info.subject} jobs are senior` : `${fmt(l.senior)} of the ${fmt(page.jobs)} ${info.subject} jobs are senior`,
        before: "Senior here means a senior, lead or principal level." + (others.length ? ` Of the ${fmt(page.jobs)} jobs, ${list(others)}.` : ""),
        label: `Of ${fmt(page.jobs)} ${info.subject} jobs: ${counted.join(", ")}.`,
    };
}

export function hiringSection(c: Ctx) {
    const {page} = c, big = page.largest_employer;
    const dominates = big && big.jobs * 5 >= page.jobs;
    return {
        heading: "Who is hiring, and where",
        sub: `The ${fmt(page.jobs)} jobs, by the country each one names`,
        before: `${fmt(page.employers)} employers posted these jobs.` + (big ? (dominates
            ? ` ${big.name} has the most, ${fmt(big.jobs)} of the ${fmt(page.jobs)}.`
            : ` No single one dominates: ${big.name} has the most, ${fmt(big.jobs)} of the ${fmt(page.jobs)}.`) : ""),
        places: `${fmt(page.places.us)} name a place in the US, ${fmt(page.places.elsewhere)} a place elsewhere, ${fmt(page.places.unknown)} no country we can read.`,
        caption: "Hatched: the job names no country we can read. Countries one by one are too few to show.",
    };
}

export const citeLine = (c: Ctx, host: string) =>
    `Glassbox. "${headline(c) ?? topic(c)}" Counted in the week of ${weekDate(c.page)}. ${host}/market/${c.info.name}`;

// ------------------------------------------------------------------ search and share

/** "AI engineer skills, counted from 288 jobs": the searched question in its own words (the layout adds " · Glassbox"). */
export function pageTitle(info: MarketInfo, page: MarketBody | null): string {
    return page ? `${info.search}, counted from ${plural(page.jobs, "job", "jobs")}` : info.search;
}

/** The search snippet: what the jobs ask for most, answered with the count and its week; else the finding. */
export function pageDescription(info: MarketInfo, page: MarketBody | null): string {
    if (!page) return `The skills ${info.subject} jobs name, counted from live jobs every week.`;
    const c = {info, page}, lead = headline(c), skills = skillsCount(c, "ads", 2);
    if (skills) return `What ${info.subject} jobs ask for most in the week of ${weekDate(page)}: ${skills}`;
    const counted = `Counted in the week of ${weekDate(page)}: ${plural(page.jobs, "job", "jobs")} at ${plural(page.employers, "employer", "employers")}.`;
    return `${lead ? `${lead}.` : `${topic(c)}.`} ${counted}`;
}

/** A hub card's line under the headline: the count behind the finding, or why there are no shares. */
export function cardLine(c: Ctx): string {
    return findingCount(c, `${c.info.subject} jobs`) ?? skillsCount(c, `${c.info.subject} jobs`, 1) ?? thin(c);
}
