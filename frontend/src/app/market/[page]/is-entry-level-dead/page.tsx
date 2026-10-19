import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import IsEntryLevelDead from "@/components/stories/is-entry-level-dead/IsEntryLevelDead";
import {IS_ENTRY_LEVEL_DEAD} from "@/lib/stories/is-entry-level-dead";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/entry-level-software/is-entry-level-dead: the entry level page's
 * first story, one week's count (lib/stories/is-entry-level-dead.ts). Static:
 * it reads no publication, so nothing rebuilds it but a deploy. Under
 * /market/[page] like Pick a side, so it is served for that one page only and
 * any other name is a 404. Caveat, its pen notes, comes with the site.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(IS_ENTRY_LEVEL_DEAD);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(IS_ENTRY_LEVEL_DEAD, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(IS_ENTRY_LEVEL_DEAD, params)) notFound();
    return <IsEntryLevelDead fonts={hankenGrotesk.variable} />;
}
