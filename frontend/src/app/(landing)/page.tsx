import type {Metadata} from "next";

import LookAround from "@/components/landing/LookAround";
import {COPY} from "@/components/landing/copy";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
    title: COPY.meta.title,
    description: COPY.meta.description,
    openGraph: {title: COPY.meta.ogTitle, description: COPY.meta.ogDescription},
    twitter: {title: COPY.meta.ogTitle, description: COPY.meta.ogDescription},
};

const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Glassbox",
    url: "https://jobradar-frontend-pearl.vercel.app",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: COPY.meta.description,
    offers: {"@type": "Offer", price: "0", priceCurrency: "USD"},
};

/** The landing page: look around first (components/landing/LookAround.tsx), then the footer. */
export default function Home() {
    return (
        <div className={"flex min-h-screen flex-col overflow-x-clip"}>
            <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
            <LookAround />
            <SiteFooter variant={"full"} />
        </div>
    );
}
