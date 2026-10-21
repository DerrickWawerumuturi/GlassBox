import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import {tiltNeon} from "@/app/fonts/tilt-neon";
import AiOnYourCv from "@/components/stories/ai-on-your-cv/AiOnYourCv";
import {AI_ON_YOUR_CV} from "@/lib/stories/ai-on-your-cv";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/ai/ai-on-your-cv: the AI page's newest story, one week's count
 * (lib/stories/ai-on-your-cv.ts). Static: it reads no publication, so nothing
 * rebuilds it but a deploy. Under /market/[page] like its other stories, so it
 * is served for the AI page only and any other name is a 404. Caveat, its pen
 * notes, and JetBrains Mono, its counts, come with the site; Tilt Neon, its
 * signs, with this route.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(AI_ON_YOUR_CV);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(AI_ON_YOUR_CV, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(AI_ON_YOUR_CV, params)) notFound();
    return <AiOnYourCv fonts={`${hankenGrotesk.variable} ${tiltNeon.variable}`} />;
}
