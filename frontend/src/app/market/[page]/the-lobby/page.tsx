import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import {limelight} from "@/app/fonts/limelight";
import TheLobby from "@/components/stories/the-lobby/TheLobby";
import {THE_LOBBY} from "@/lib/stories/the-lobby";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/software-engineering/the-lobby: the software engineering page's
 * story, one week's count (lib/stories/the-lobby.ts). Static: it reads no
 * publication, so nothing rebuilds it but a deploy. Under /market/[page] like
 * the years page, so it is served for that one page only and any other name
 * is a 404.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(THE_LOBBY);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(THE_LOBBY, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(THE_LOBBY, params)) notFound();
    return <TheLobby fonts={`${hankenGrotesk.variable} ${limelight.variable}`} />;
}
