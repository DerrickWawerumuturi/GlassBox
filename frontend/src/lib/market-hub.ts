import {fmt, shortDate, weekDay, weekStart} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {MARKET_PAGES, MarketBody, MarketName, marketPath} from "@/lib/market-pages";
import {STORIES} from "@/lib/stories";
import {storyPath} from "@/lib/stories/story";
import {yearsCounts} from "@/lib/years-answer";

/*
 * The /market hub's cards (founder, 15 Oct 2026; after the prototype in
 * docs/local/editorial-sprint/market-home): a card per story, each with a
 * plain link to its live weekly page so the hub stays the way into the live
 * counts; the years page's card from the live count; how we count. The CV
 * card sits fifth, where The Pudding puts its newsletter (components/market-hub).
 * An essay joins as a card of kind "essay", and its filter appears with it.
 * The grid opens on Latest (GitHub issue #16): newest first, each card dated;
 * "By job type" keeps the market pages' order.
 */

export type HubKind = "essay" | "count" | "years" | "method";

export interface HubCard {
    kind: HubKind;
    /** The day it came out, for Latest: a story's published day, the years page's week. None: how we count. */
    date: string | null;
    /** The Monday of the week it counts, Latest's second key. */
    week: string | null;
    /** What draws its cover: a story's slug, "years" or "method". */
    cover: string;
    pill: string;
    /** What the card says above its cover: "21 Oct 2026" (a story), "Week of 12 Oct" (the years page), or none. */
    when: string | null;
    href: string;
    title: string;
    line: string;
    /** The plain link to the live weekly page a story reads. */
    live?: {href: string; label: string};
    /** The years cover's numbers, from the live count. */
    years?: {unstated: number; total: number};
}

/** The two orders of every card: Latest, the default, and the market pages' order. */
export type HubOrder = "latest" | "type";
export type HubView = HubOrder | HubKind;

export const HUB_FILTERS: Array<[HubView, string]> = [["latest", "Latest"], ["type", "By job type"], ["essay", "Essays"], ["count", "Stories"],
    ["years", "Years"], ["method", "How we count"]];

/** Where the CV card goes in the grid: fifth. */
export const CV_AT = 4;

const METHOD: HubCard = {
    kind: "method", cover: "method", pill: "Method", date: null, week: null, when: null, href: "/method", title: "Every job, once",
    line: "Where the jobs come from, how each one counts once, and what we can't see.",
};

/** The live page's link on a story card. One line: the hub's masthead already says the live week. */
const live = (name: MarketName) => ({href: marketPath(name), label: `Latest count: ${MARKET_PAGES[name].subject} jobs`});

/** The years page's card, when this week's count has its numbers. */
function yearsCard(entry: MarketBody | null): HubCard | null {
    const c = yearsCounts(entry);
    if (!c) return null;
    const total = c.titled.stated + c.titled.unstated, unstated = c.titled.unstated;
    return {
        kind: "years", cover: "years", pill: "Years", date: weekStart(c.page), week: weekStart(c.page), when: `Week of ${weekDay(c.page)}`, href: YEARS_PATH,
        title: `${fmt(unstated)} empty tags`, line: `${fmt(unstated)} of the ${fmt(total)} software jobs with an early career title state no number of years.`,
        years: {unstated, total},
    };
}

/** The hub's cards by job type: the first story, the years page, the other stories, how we count. */
export function hubCards(pages: Partial<Record<MarketName, MarketBody | null>>): HubCard[] {
    const stories: HubCard[] = STORIES.map((s) => ({
        kind: "count", cover: s.slug, pill: "Story", date: s.published, week: s.week, when: shortDate(s.published), href: storyPath(s),
        title: s.title, line: s.card, live: live(s.page),
    }));
    const years = yearsCard(pages["entry-level-software"] ?? null);
    return [...stories.slice(0, 1), ...(years ? [years] : []), ...stories.slice(1), METHOD];
}

/** Latest: newest first by the day each came out, then by the week it counts; undated (how we count) last. */
export const latestFirst = (cards: HubCard[]): HubCard[] =>
    [...cards].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.week ?? "").localeCompare(a.week ?? ""));

/** The filters worth showing: both orders, and each kind that has a card. */
export const hubFilters = (cards: HubCard[]) => HUB_FILTERS.filter(([k]) => k === "latest" || k === "type" || cards.some((c) => c.kind === k));
