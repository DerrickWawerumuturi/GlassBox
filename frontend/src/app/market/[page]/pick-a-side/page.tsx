import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {bebasNeue} from "@/app/fonts/bebas-neue";
import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import PickASide from "@/components/stories/pick-a-side/PickASide";
import {PICK_A_SIDE} from "@/lib/stories/pick-a-side";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/entry-level-software/pick-a-side: the entry level page's story, one
 * week's count (lib/stories/pick-a-side.ts). Static: it reads no publication,
 * so nothing rebuilds it but a deploy. Under /market/[page] like the years
 * page, so it is served for that one page only and any other name is a 404.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(PICK_A_SIDE);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(PICK_A_SIDE, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(PICK_A_SIDE, params)) notFound();
    return <PickASide fonts={`${hankenGrotesk.variable} ${bebasNeue.variable}`} />;
}
