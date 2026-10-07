import type {Metadata} from "next";
import Link from "next/link";

import SiteFooter from "@/components/SiteFooter";

// Next marks this page noindex and answers 404 itself; this replaces its unbranded page and second <title>.
export const metadata: Metadata = {title: "Page not found"};

export default function NotFound() {
    return (
        <div className={"flex min-h-[calc(100vh-88px)] flex-col"}>
            <div className={"mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 py-10 lg:py-14"}>
                <h1 className={"font-heading text-4xl font-bold tracking-tight"}>Page not found</h1>
                <p className={"text-base text-muted-foreground"}>There is no page at this address.</p>
                <Link href={"/"} className={"w-fit text-[15px] underline underline-offset-4 hover:text-primary"}>Go to the home page</Link>
            </div>
            <SiteFooter />
        </div>
    );
}
