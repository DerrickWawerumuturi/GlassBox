/*
 * The market pages by name, alone in a file with no imports, so analytics can
 * check a page name without loading the API client (market-pages.ts has the rest).
 */
export const MARKET_NAMES = ["entry-level-software", "software-engineering", "ai", "machine-learning", "devops"] as const;
export type MarketName = (typeof MARKET_NAMES)[number];

/** Pages that answer one question from a market page's count (backend market_pages.ANSWERS). */
export const YEARS_PATH = "/market/entry-level-software/years-of-experience";

/** The visual stories by address, one under each market page for now (lib/stories). Here so analytics can name them. */
export const STORY_SLUGS = ["pick-a-side", "the-lobby", "contents-may-vary", "peak-python", "within-eleven-jobs"] as const;
export type StorySlug = (typeof STORY_SLUGS)[number];

/** A story's place name in analytics: "story_pick_a_side". */
export const storyPlace = (slug: StorySlug) => `story_${slug.replaceAll("-", "_")}` as const;

