import type {Metadata} from "next";

import AnalysisShell from "@/components/dashboard/AnalysisShell";

// The shell is a client component; the title has to come from a server layout.
export const metadata: Metadata = {title: "Analysis"};

export default function AnalysisLayout({children}: LayoutProps<"/analysis">) {
    return <AnalysisShell>{children}</AnalysisShell>;
}
