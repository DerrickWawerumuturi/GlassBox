'use client'

import React from "react";
import {useRouter} from "next/navigation";

import CompareCv from "@/components/cv-ask/CompareCv";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {useHave} from "@/components/landing/useHave";
import MarketCvAsk, {MarketAskProvider} from "@/components/market-page/MarketCvAsk";
import {CtaPlace, track} from "@/lib/analytics";
import {CV_QUESTION, StoryInfo, storyAsk, storyPlace} from "@/lib/stories/story";

/*
 * A story's CV ask (docs/decisions/cv-ask.md), at its end: the question and
 * the peek button family's "Compare your CV", which opens the same sheet and
 * scan as its market page, about the skills the story counts. The click is
 * cta_clicked with the story's own place ("story_pick_a_side"); the scan's
 * events name the market page. After a scan the answer takes their place. `className` is the story's own ending box.
 * A story that names no skills (Is entry level dead?) has nothing to count on a
 * CV: its button opens the sheet about the latest jobs, as the /market grid's
 * card does, and the results open on /analysis.
 */

function Ending({className, question}: {className?: string; question: string}) {
    if (useHave() !== null) return <MarketCvAsk note={null} />;
    return (
        <div className={className}>
            <p>{question}</p>
            <MarketCvAsk className={"items-start text-left"} />
        </div>
    );
}

function Open({story, className, question, place}: {story: StoryInfo; className?: string; question: string; place?: CtaPlace}) {
    const router = useRouter(), where = place ?? storyPlace(story.slug);
    const scan = useCvScan({from: story.page, onDone: () => router.push("/analysis")});
    return (
        <div className={className}>
            <p>{question}</p>
            <CompareCv onClick={() => { track("cta_clicked", {where}); scan.open(); }} scanning={scan.scanning} where={where} className={"items-start text-left"} />
            {scan.sheet}
        </div>
    );
}

/** `place` names a second ask inside a story (Is entry level dead? asks after the guess and at the turn); only a story that names no skills has one. */
export default function StoryCvAsk({story, className, question = CV_QUESTION, place}: {story: StoryInfo; className?: string; question?: string; place?: CtaPlace}) {
    if (!story.ask.length) return <Open story={story} className={className} question={question} place={place} />;
    return (
        <MarketAskProvider ask={storyAsk(story)} page={story.page} where={storyPlace(story.slug)}>
            <Ending className={className} question={question} />
        </MarketAskProvider>
    );
}
