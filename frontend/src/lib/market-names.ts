/*
 * The market pages by name, alone in a file with no imports, so analytics can
 * check a page name without loading the API client (market-pages.ts has the rest).
 */
export const MARKET_NAMES = ["entry-level-software", "software-engineering", "ai", "machine-learning", "devops"] as const;
export type MarketName = (typeof MARKET_NAMES)[number];

/** Pages that answer one question from a market page's count (backend market_pages.ANSWERS). */
export const YEARS_PATH = "/market/entry-level-software/years-of-experience";
