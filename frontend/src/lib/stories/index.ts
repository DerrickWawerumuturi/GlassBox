import {CONTENTS_MAY_VARY} from "@/lib/stories/contents-may-vary";
import {PEAK_PYTHON} from "@/lib/stories/peak-python";
import {PICK_A_SIDE} from "@/lib/stories/pick-a-side";
import {THE_LOBBY} from "@/lib/stories/the-lobby";
import {WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";
import type {MarketName} from "@/lib/market-pages";
import type {StoryInfo} from "@/lib/stories/story";

/*
 * The stories by market page (one each for now), in the market pages' order:
 * the hub's cards, the sitemap and the link from each live page read this.
 * A story joins by adding its data module here (the years essay, after its recount).
 */
export const STORIES: StoryInfo[] = [PICK_A_SIDE, THE_LOBBY, CONTENTS_MAY_VARY, PEAK_PYTHON, WITHIN_ELEVEN_JOBS];

/** A market page's story, if it has one. */
export const storyFor = (page: MarketName): StoryInfo | null => STORIES.find((s) => s.page === page) ?? null;
