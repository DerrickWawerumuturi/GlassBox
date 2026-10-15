import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {allertaStencil} from "@/app/fonts/allerta-stencil";
import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import WithinElevenJobs from "@/components/stories/within-eleven-jobs/WithinElevenJobs";
import {isStoryPage, storyMetadata, storyParams} from "@/lib/stories/route";
import {WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";

/*
 * /market/devops/within-eleven-jobs: the DevOps page's story, one week's count
 * (lib/stories/within-eleven-jobs.ts). Static: it reads no publication, so
 * nothing rebuilds it but a deploy. Under /market/[page] like the years page,
 * so it is served for that one page only and any other name is a 404.
 */

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return storyParams(WITHIN_ELEVEN_JOBS);
}

export function generateMetadata({params}: Props): Promise<Metadata> {
    return storyMetadata(WITHIN_ELEVEN_JOBS, params);
}

export default async function Page({params}: Props) {
    if (!await isStoryPage(WITHIN_ELEVEN_JOBS, params)) notFound();
    return <WithinElevenJobs fonts={`${hankenGrotesk.variable} ${allertaStencil.variable}`} />;
}
