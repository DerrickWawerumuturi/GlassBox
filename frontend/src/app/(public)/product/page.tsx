import Link from "next/link";

import AddCvButton from "@/components/AddCvButton";
import {Explainer, Numbers} from "@/components/site/Explainer";
import {Button} from "@/components/ui/button";
import {lookForPage} from "@/lib/landing/look-server";
import {PRODUCT_PAGE as P} from "@/lib/site-copy";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/product", {
    title: "Product",
    description: "Today's jobs, counted. Then where you stand, once your CV is in.",
});

// Static, with today's counts for the numbers box (ISR, like the home page).
export const revalidate = 300;

/** Today's real counts for the Market section, or nothing when the count isn't available. */
async function numbers(): Promise<string[] | null> {
    const look = await lookForPage();
    const backend = look?.families.backend;
    if (!look || !backend) return null;
    const [key, n] = Object.entries(backend.skills).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!key) return null;
    const total = Object.values(look.families).reduce((s, f) => s + f.jobs, 0);
    const date = new Date(look.taken_at).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
    return P.numberLines(total.toLocaleString("en"), Object.keys(look.families).length, look.skills[key] ?? key,
        String(n), backend.readable.toLocaleString("en"), date);
}

/** The Market section's box of today's counts, when there is one, then where to read more. */
function MarketExtra({lines}: {lines: string[] | null}) {
    return (
        <>
            {lines && <Numbers title={P.numbers} lines={lines} />}
            <ul className={"flex flex-col gap-1.5 text-[16px]"}>
                {P.marketLinks.map((link) => (
                    <li key={link.href}><Link href={link.href} className={"text-primary underline-offset-4 hover:underline"}>{link.label}</Link></li>
                ))}
            </ul>
        </>
    );
}

/** A long explainer: one numbered section per part of the product, real screenshots (example CV). */
export default async function ProductPage() {
    const lines = await numbers();
    return (
        <Explainer kicker={P.kicker} title={P.title} dek={P.dek} toc={P.toc} jump={P.jump} sections={P.sections}
                   extra={{market: <MarketExtra lines={lines} />}}>
            <section className={"flex flex-col gap-4 border-t border-border pt-12"}>
                <h2 className={"max-w-xl font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl"}>{P.closing}</h2>
                <div className={"flex flex-wrap items-center gap-x-5 gap-y-2"}>
                    <AddCvButton label={P.cta} reading={P.reading} />
                    <Button variant={"link"} className={"px-0 text-foreground"} nativeButton={false} render={<Link href={"/sign-in"} />}>{P.signUp}</Button>
                </div>
                <p className={"font-mono text-[12px] text-muted-foreground"}>{P.lead}</p>
            </section>
        </Explainer>
    );
}
