import React from "react";

import SiteFooter from "@/components/SiteFooter";

/** Public text pages (privacy, your CV): the page, then the slim footer. */
export default function PublicLayout({children}: {children: React.ReactNode}) {
    return (
        <div className={"flex min-h-[calc(100vh-88px)] flex-col"}>
            {children}
            <SiteFooter />
        </div>
    );
}
