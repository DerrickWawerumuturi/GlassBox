import type {Metadata} from "next";
import Link from "next/link";
import {ImageIcon} from "lucide-react";

import AddCvButton from "@/components/AddCvButton";

import {Button} from "@/components/ui/button";
import {FEATURES, PRODUCT_PAGE as P} from "@/lib/site-copy";

export const metadata: Metadata = {
    title: "Product",
    description: "Today's jobs, counted. Then where you stand, once your CV is in.",
};

/** One section per feature, a screenshot slot for each, then the CV ask. Words: lib/site-copy.ts. */
export default function ProductPage() {
    return (
        <main className={"mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 py-12 lg:gap-24 lg:py-16"}>
            <header className={"flex max-w-2xl flex-col gap-3"}>
                <h1 className={"font-heading text-4xl font-bold uppercase tracking-tight"}>{P.title}</h1>
                <p className={"text-base text-muted-foreground"}>{P.lede}</p>
            </header>
            {FEATURES.map((f, i) => (
                <section key={f.id} id={f.id} className={"grid scroll-mt-24 items-center gap-6 md:grid-cols-2 md:gap-12"}>
                    <div className={`flex flex-col gap-3 ${i % 2 ? "md:order-2" : ""}`}>
                        <h2 className={"font-heading text-2xl font-bold uppercase tracking-tight"}>{f.title}</h2>
                        <p className={"max-w-md text-[15px] leading-relaxed text-muted-foreground"}>{f.body}</p>
                    </div>
                    <div className={"flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground"}>
                        <ImageIcon className={"size-5"} aria-hidden />
                        <span className={"font-mono text-[11px] uppercase tracking-[0.12em]"}>{f.title} · {P.shot}</span>
                    </div>
                </section>
            ))}
            <section className={"flex flex-col gap-4 border-t border-border pt-12"}>
                <h2 className={"max-w-xl font-heading text-2xl font-bold uppercase tracking-tight"}>{P.closing}</h2>
                <div className={"flex flex-wrap items-center gap-x-5 gap-y-2"}>
                    <AddCvButton label={P.cta} reading={P.reading} />
                    <Button variant={"link"} className={"px-0 text-foreground"} nativeButton={false} render={<Link href={"/sign-in"} />}>{P.signUp}</Button>
                </div>
                <p className={"font-mono text-[12px] text-muted-foreground"}>{P.lead}</p>
            </section>
        </main>
    );
}
