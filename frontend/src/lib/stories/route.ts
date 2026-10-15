import type {Metadata} from "next";

import {publicPage} from "@/lib/seo";
import {StoryInfo, storyPath, storyTitle} from "@/lib/stories/story";

/*
 * What every story's route shares (app/market/[page]/<story>): it is built
 * for its own market page only, like the years page, so it is static; any
 * other page name is a 404. Its share image is its own (opengraph-image.tsx).
 */

export const storyParams = (story: StoryInfo) => [{page: story.page}];

export async function storyMetadata(story: StoryInfo, params: Promise<{page: string}>): Promise<Metadata> {
    if ((await params).page !== story.page) return {};
    const title = storyTitle(story);
    return publicPage(storyPath(story), {title, description: story.card, share: {title: story.title, description: story.card}, ownImage: true, article: true});
}

/** Whether a request is for the story's own market page; the route answers 404 otherwise. */
export const isStoryPage = async (story: StoryInfo, params: Promise<{page: string}>) => (await params).page === story.page;
