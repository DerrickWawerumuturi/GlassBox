import type {Metadata} from "next";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import AiProfessionalExpertise from "@/components/stories/ai-professional-expertise/AiProfessionalExpertise";
import {publicPage} from "@/lib/seo";

const path = "/market/ai-professional-expertise" as const;
const title = "The Experts Being Recruited to Teach AI Their Professions";
const description = "How professionals are recruited to create problems, reference answers and standards used to train and evaluate AI systems.";

export const metadata: Metadata = publicPage(path, {title, description, article: true});

export default function Page() {
    return <AiProfessionalExpertise fonts={hankenGrotesk.variable} />;
}
