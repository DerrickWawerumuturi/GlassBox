import {aiOnYourCvCover} from "@/components/stories/covers/ai-on-your-cv";
import {contentsMayVaryCover} from "@/components/stories/covers/contents-may-vary";
import {isEntryLevelDeadCover} from "@/components/stories/covers/is-entry-level-dead";
import {peakPythonCover} from "@/components/stories/covers/peak-python";
import {pickASideCover} from "@/components/stories/covers/pick-a-side";
import {theLobbyCover} from "@/components/stories/covers/the-lobby";
import {withinElevenJobsCover} from "@/components/stories/covers/within-eleven-jobs";
import type {StorySlug} from "@/lib/stories/story";

/** Each story's square cover for the market hub, by its address (each drawn from its story's data module). */
export const STORY_COVERS: Record<StorySlug, () => string> = {
    "is-entry-level-dead": isEntryLevelDeadCover,
    "pick-a-side": pickASideCover,
    "the-lobby": theLobbyCover,
    "ai-on-your-cv": aiOnYourCvCover,
    "contents-may-vary": contentsMayVaryCover,
    "peak-python": peakPythonCover,
    "within-eleven-jobs": withinElevenJobsCover,
};
