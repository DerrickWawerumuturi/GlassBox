import {AI_ON_YOUR_CV} from "@/lib/stories/ai-on-your-cv";
import {CONTENTS_MAY_VARY} from "@/lib/stories/contents-may-vary";
import {IS_ENTRY_LEVEL_DEAD} from "@/lib/stories/is-entry-level-dead";
import {PEAK_PYTHON} from "@/lib/stories/peak-python";
import {PICK_A_SIDE} from "@/lib/stories/pick-a-side";
import {THE_LOBBY} from "@/lib/stories/the-lobby";
import {WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";
import type {MarketName} from "@/lib/market-pages";
import type {StoryInfo} from "@/lib/stories/story";

/*
 * The stories, in the market pages' order and, within a page, newest first:
 * the hub's cards, the sitemap and the links from each live page read this.
 * A page may have more than one (the entry level page has two since 19 Oct
 * 2026, the AI page since 21 Oct). A story joins by adding its data module here (the years essay, after its recount).
 */
export const STORIES: StoryInfo[] = [IS_ENTRY_LEVEL_DEAD, PICK_A_SIDE, THE_LOBBY, AI_ON_YOUR_CV, CONTENTS_MAY_VARY, PEAK_PYTHON, WITHIN_ELEVEN_JOBS];

/** A market page's stories, newest first; none for a page without one. */
export const storiesFor = (page: MarketName): StoryInfo[] => STORIES.filter((s) => s.page === page);
