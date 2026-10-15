'use client'

import React from "react";

import {useHave} from "@/components/landing/useHave";
import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import {CV_QUESTION, StoryInfo, storyAsk, storyPlace} from "@/lib/stories/story";

/*
 * A story's CV ask (docs/decisions/cv-ask.md), at its end: the question and
 * the peek button family's "Compare your CV", which opens the same sheet and
 * scan as its market page, about the skills the story counts. The click is
 * cta_clicked with the story's own place ("story_pick_a_side"); the scan's
 * events name the market page. After a scan the answer takes their place. `className` is the story's own ending box.
 */

function Ending({className}: {className?: string}) {
    if (useHave() !== null) return <MarketCvAsk note={null} />;
    return (
        <div className={className}>
            <p>{CV_QUESTION}</p>
            <MarketCvAsk className={"items-start text-left"} />
        </div>
    );
}

export default function StoryCvAsk({story, className}: {story: StoryInfo; className?: string}) {
    return (
        <MarketAskProvider ask={storyAsk(story)} page={story.page} where={storyPlace(story.slug)}>
            <Ending className={className} />
        </MarketAskProvider>
    );
}
