import Link from "next/link";

import {Explainer} from "@/components/site/Explainer";
import {METHOD_PAGE as M} from "@/lib/method-copy";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/method", {
    title: M.title,
    description: M.description,
    share: {title: `${M.title} · Glassbox`, description: M.description},
});

/** How Glassbox counts, as the code does it (lib/method-copy.ts), then the way back to the count. */
export default function MethodPage() {
    return (
        <Explainer kicker={M.kicker} title={M.title} dek={M.dek} toc={M.toc} jump={M.jump} sections={M.sections}>
            <section className={"flex flex-col gap-3 border-t border-border pt-12"}>
                <h2 className={"font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl"}>{M.backTitle}</h2>
                <ul className={"flex flex-col gap-2 text-[17px]"}>
                    {M.back.map((link) => (
                        <li key={link.href}>
                            <Link href={link.href} className={"text-primary underline-offset-4 hover:underline"}>{link.label}</Link>
                        </li>
                    ))}
                </ul>
            </section>
        </Explainer>
    );
}
