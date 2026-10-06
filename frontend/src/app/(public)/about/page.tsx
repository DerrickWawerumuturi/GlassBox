import type {Metadata} from "next";

import {ABOUT_PAGE as A} from "@/lib/site-copy";

export const metadata: Metadata = {
    title: "About",
    description: "Why Glassbox exists: job ads list everything, so we count what today's jobs really ask for.",
};

/** Why Glassbox exists, in four short parts, and the values. Words: lib/site-copy.ts. */
export default function AboutPage() {
    return (
        <main className={"mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 py-12 lg:py-16"}>
            <h1 className={"font-heading text-4xl font-bold uppercase tracking-tight"}>{A.title}</h1>
            <div className={"flex flex-col gap-8"}>
                {A.paragraphs.map((p) => (
                    <section key={p.title} className={"flex flex-col gap-2"}>
                        <h2 className={"font-heading text-xl font-bold"}>{p.title}</h2>
                        <p className={"text-[15px] leading-relaxed text-muted-foreground"}>{p.body}</p>
                    </section>
                ))}
            </div>
            <section className={"flex flex-col gap-4 border-t border-border pt-10"}>
                <h2 className={"font-heading text-2xl font-bold uppercase tracking-tight"}>{A.valuesTitle}</h2>
                <ul className={"grid gap-3 sm:grid-cols-2"}>
                    {A.values.map((v) => (
                        <li key={v.title} className={"flex flex-col gap-1 rounded-lg border border-border bg-card/50 p-4"}>
                            <span className={"text-[15px] font-medium"}>{v.title}</span>
                            <span className={"text-sm text-muted-foreground"}>{v.body}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
