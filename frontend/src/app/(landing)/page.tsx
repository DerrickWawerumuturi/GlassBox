import LookAround from "@/components/landing/LookAround";
import {COPY} from "@/components/landing/copy";
import SiteFooter from "@/components/SiteFooter";
import {lookForPage} from "@/lib/landing/look-server";
import {homeStructuredData, publicPage} from "@/lib/seo";

// Static, rebuilt at most every 5 minutes (ISR): this week's count is in the HTML (look-server.ts).
export const revalidate = 300;

export const metadata = publicPage("/", {
    title: COPY.meta.title,
    description: COPY.meta.description,
    share: {title: COPY.meta.ogTitle, description: COPY.meta.ogDescription},
});

const structuredData = homeStructuredData(COPY.meta.description);

/** The landing page: look around first (components/landing/LookAround.tsx), then the footer. */
export default async function Home() {
    const look = await lookForPage();
    return (
        <div className={"flex min-h-screen flex-col overflow-x-clip"}>
            <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
            <LookAround initial={look ?? undefined} />
            <SiteFooter variant={"full"} />
        </div>
    );
}
