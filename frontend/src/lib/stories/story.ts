import {type Ask, type AskSkill, STORY_WHAT} from "@/lib/cv-ask";
import {longDate} from "@/lib/market-page";
import {MARKET_PAGES, MarketName, marketPath} from "@/lib/market-pages";

/*
 * The visual stories (founder, 15 Oct 2026): one per market page, each fixed
 * to one named week like an article, while the live market pages recount
 * every Monday (docs/decisions/market-pages.md, "Stories"). A story's numbers
 * live in one typed data module (lib/stories/<slug>.ts), a comment per figure
 * saying where it comes from, so moving a story to a new week is a data edit.
 * Its words are written from those numbers; its tests say which sentences
 * still need reading when a refresh changes them.
 */

export {STORY_SLUGS, storyPlace, type StorySlug} from "@/lib/market-names";
import type {StorySlug} from "@/lib/market-names";

/** What every story's data module carries besides its own numbers. */
export interface StoryInfo {
    slug: StorySlug;
    page: MarketName;
    /** The Monday of the one week the story counts: "2026-10-12". */
    week: string;
    /** The day the story's numbers were fixed: its Article date. Set again at each refresh. */
    published: string;
    title: string;
    /** One line with the story's finding: the hub card, the page description and the share text. */
    card: string;
    /** The jobs whose ads we could read that week: what the CV ask compares with. */
    readable: number;
    /** The skills the story names, by vocabulary key: the CV ask counts these on a CV. */
    ask: AskSkill[];
}

/** The question before a story's CV button, and the hub's CV card. */
export const CV_QUESTION = "Curious how many of these skills are already on your CV?";

export const storyPath = (s: Pick<StoryInfo, "page" | "slug">): `/market/${string}` => `${marketPath(s.page)}/${s.slug}`;

/** "12 October 2026": the week a story counts, as every source line names it. */
export const storyWeek = (s: Pick<StoryInfo, "week">) => longDate(s.week);

/** "12 Oct": the same Monday, short, for the hub card. */
export const storyDay = (s: Pick<StoryInfo, "week">) =>
    new Date(s.week).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});

/** The story's CV ask: the skills it names, compared with the jobs it counted. */
export function storyAsk(s: StoryInfo): Ask {
    return {skills: s.ask, what: STORY_WHAT, jobs: s.readable, subject: MARKET_PAGES[s.page].subject};
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** A small count in words, as the stories write them ("eleven skills"); digits past twenty. */
export const inWords = (n: number) => WORDS[n] ?? n.toLocaleString("en");

/** "Python, C++ and Git". */
export const list = (names: string[]) => names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;


/** "Pick a side: entry level software jobs in the week of 12 October 2026": a story's title in search and share cards. */
export const storyTitle = (s: StoryInfo) => `${s.title}: ${MARKET_PAGES[s.page].subject} jobs in the week of ${storyWeek(s)}`;
