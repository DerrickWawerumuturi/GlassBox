import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {bungee} from "@/app/fonts/bungee";
import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import ContentsMayVary from "@/components/stories/contents-may-vary/ContentsMayVary";
import {CONTENTS_MAY_VARY} from "@/lib/stories/contents-may-vary";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/ai/contents-may-vary: the AI page's story, one week's count
 * (lib/stories/contents-may-vary.ts). Static: it reads no publication, so
 * nothing rebuilds it but a deploy. Under /market/[page] like the years page,
 * so it is served for that one page only and any other name is a 404.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(CONTENTS_MAY_VARY);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(CONTENTS_MAY_VARY, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(CONTENTS_MAY_VARY, params)) notFound();
    return <ContentsMayVary fonts={`${hankenGrotesk.variable} ${bungee.variable}`} />;
}
