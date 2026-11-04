import {permanentRedirect} from "next/navigation";

type Props = {params: Promise<{page: string}>};

export function generateStaticParams() { return [{page: "entry-level-software"}]; }

export default async function Page({params}: Props) {
    const {page} = await params;
    if (page === "entry-level-software") permanentRedirect("/market/ai-professional-expertise");
    permanentRedirect("/market");
}
