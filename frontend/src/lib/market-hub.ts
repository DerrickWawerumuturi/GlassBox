import {fmt, weekDay} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {MARKET_PAGES, MarketBody, MarketName, marketPath} from "@/lib/market-pages";
import {STORIES} from "@/lib/stories";
import {storyDay, storyPath} from "@/lib/stories/story";
import {yearsCounts} from "@/lib/years-answer";

/*
 * The /market hub's cards (founder, 15 Oct 2026; after the prototype in
 * docs/local/editorial-sprint/market-home): a card per story, each with a
 * plain link to its live weekly page so the hub stays the way into the live
 * counts; the years page's card from the live count; how we count. The CV
 * card sits fifth, where The Pudding puts its newsletter (components/market-hub).
 * An essay joins as a card of kind "essay", and its filter appears with it.
 */

export type HubKind = "essay" | "count" | "years" | "method";

export interface HubCard {
    kind: HubKind;
    /** What draws its cover: a story's slug, "years" or "method". */
    cover: string;
    pill: string;
    /** "Week of 12 Oct", or none. */
    when: string | null;
    href: string;
    title: string;
    line: string;
    /** The plain link to the live weekly page a story reads. */
    live?: {href: string; label: string};
    /** The years cover's numbers, from the live count. */
    years?: {unstated: number; total: number};
}

export const HUB_FILTERS: Array<[HubKind | "all", string]> = [["all", "All"], ["essay", "Essays"], ["count", "Stories"], ["years", "Years"], ["method", "How we count"]];

/** Where the CV card goes in the grid: fifth. */
export const CV_AT = 4;

const METHOD: HubCard = {
    kind: "method", cover: "method", pill: "Method", when: null, href: "/method", title: "Every job, once",
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
        kind: "years", cover: "years", pill: "Years", when: `Week of ${weekDay(c.page)}`, href: YEARS_PATH,
        title: `${fmt(unstated)} empty tags`, line: `${fmt(unstated)} of the ${fmt(total)} software jobs with an early career title state no number of years.`,
        years: {unstated, total},
    };
}

/** The hub's cards in order: the first story, the years page, the other stories, how we count. */
export function hubCards(pages: Partial<Record<MarketName, MarketBody | null>>): HubCard[] {
    const stories: HubCard[] = STORIES.map((s) => ({
        kind: "count", cover: s.slug, pill: "Story", when: `Week of ${storyDay(s)}`, href: storyPath(s),
        title: s.title, line: s.card, live: live(s.page),
    }));
    const years = yearsCard(pages["entry-level-software"] ?? null);
    return [...stories.slice(0, 1), ...(years ? [years] : []), ...stories.slice(1), METHOD];
}

/** The filters worth showing: All, and each kind that has a card. */
export const hubFilters = (cards: HubCard[]) => HUB_FILTERS.filter(([k]) => k === "all" || cards.some((c) => c.kind === k));
