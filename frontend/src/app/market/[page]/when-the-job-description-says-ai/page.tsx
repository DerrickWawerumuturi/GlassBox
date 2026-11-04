import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import WhenTheJobDescriptionSaysAi from "@/components/stories/when-the-job-description-says-ai/Article";
import {publicPage} from "@/lib/seo";

const PAGE = "entry-level-software";
const PATH = `/market/${PAGE}/when-the-job-description-says-ai` as const;
const TITLE = "When the Job Description Says AI, but the Data Doesn’t";
const DESCRIPTION = "44.3% of conventional software job profiles in Glassbox’s dataset contained at least one selected AI-related skill. A 30-description sample shows why a skill profile is not a substitute for reading the job description.";
const OPENING_IMAGE = "/stories/ai-job-description/opening-graphic.png";

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() {
    return [{page: PAGE}];
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
    if ((await params).page !== PAGE) return {};
    const metadata = publicPage(PATH, {
        title: TITLE,
        description: DESCRIPTION,
        share: {title: TITLE, description: DESCRIPTION},
        article: true,
    });
    return {
        ...metadata,
        openGraph: {...metadata.openGraph, images: [{url: OPENING_IMAGE, width: 1440, height: 760, alt: "44.3% of conventional software job profiles contained at least one selected AI-related skill."}]},
        twitter: {...metadata.twitter, images: [OPENING_IMAGE]},
    };
}

export default async function Page({params}: Props) {
    if ((await params).page !== PAGE) notFound();
    return <WhenTheJobDescriptionSaysAi fonts={hankenGrotesk.variable} />;
}
