import {redirect} from "next/navigation";

/** Gaps is a view of the Market charts now. */
export default function AnalysisGapsPage() {
    redirect("/analysis?view=gaps");
}
