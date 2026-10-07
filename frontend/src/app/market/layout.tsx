import React from "react";
import localFont from "next/font/local";

import SiteFooter from "@/components/SiteFooter";

/*
 * The market pages' reading face: Source Serif 4, self hosted (app/fonts,
 * OFL beside it), cut to Latin + Latin Extended, weights 400-700, at its text
 * optical size. Loaded here only, so no other page pays for it; used for the
 * editorial reading text (font-read), never headlines or labels
 * (docs/decisions/design-system.md).
 *
 * The market pages sit outside the (public) group so their share images keep
 * plain addresses (/market/ai/opengraph-image; a group adds a hash), which the
 * Article markup names. So the slim footer is added here, as (public) does.
 */
const sourceSerif = localFont({
    src: "../fonts/source-serif-4.woff2",
    weight: "400 700",
    variable: "--font-source-serif-4",
    display: "swap",
});

export default function MarketLayout({children}: {children: React.ReactNode}) {
    return (
        <div className={`${sourceSerif.variable} flex min-h-[calc(100vh-88px)] flex-col`}>
            <div className={"flex-1"}>{children}</div>
            <SiteFooter />
        </div>
    );
}
