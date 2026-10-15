import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import PeakPython from "@/components/stories/peak-python/PeakPython";
import {PEAK_PYTHON} from "@/lib/stories/peak-python";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";

/*
 * /market/machine-learning/peak-python: the machine learning page's story, one
 * week's count (lib/stories/peak-python.ts). Static: it reads no publication,
 * so nothing rebuilds it but a deploy. Under /market/[page] like the years
 * page, so it is served for that one page only and any other name is a 404.
 * It adds no display face: Hanken Grotesk, and the site's own faces.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(PEAK_PYTHON);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(PEAK_PYTHON, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(PEAK_PYTHON, params)) notFound();
    return <PeakPython fonts={hankenGrotesk.variable} />;
}
