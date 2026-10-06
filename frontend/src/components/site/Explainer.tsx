import React from "react";

import ProductShot from "@/components/site/ProductShot";
import JumpTo from "@/components/site/JumpTo";
import type {ExplainerSection} from "@/lib/site-copy";

/*
 * A long explainer page (/product, /about), in the manner of a Vox explainer:
 * a big headline and a dek, a sticky table of contents on the left (a "Jump to"
 * select on a phone), then numbered sections with short paragraphs, a large
 * screenshot with a caption, and a pull quote or a box of counts.
 */

export function Explainer({kicker, title, dek, toc, jump, sections, extra, children}: {
    kicker: string; title: string; dek: string; toc: string; jump: string; sections: ExplainerSection[];
    /** Anything a section adds after its text, by section id (a box of live counts). */
    extra?: Record<string, React.ReactNode>;
    children?: React.ReactNode;
}) {
    return (
        <main className={"mx-auto w-full max-w-6xl px-5 py-12 lg:px-8 lg:py-16"}>
            <header className={"flex max-w-3xl flex-col gap-4 pb-10 lg:pb-14"}>
                <p className={"font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"}>{kicker}</p>
                <h1 className={"font-heading text-4xl font-bold uppercase leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl"}>{title}</h1>
                <p className={"text-lg leading-relaxed text-muted-foreground"}>{dek}</p>
            </header>
            <div className={"sticky top-0 z-10 -mx-5 mb-8 border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden"}>
                <JumpTo label={jump} sections={sections} />
            </div>
            <div className={"grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)]"}>
                <aside className={"hidden lg:block"}>
                    <nav aria-label={toc} className={"sticky top-8 flex flex-col gap-1"}>
                        <p className={"pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"}>{toc}</p>
                        {sections.map((s, i) => (
                            <a key={s.id} href={`#${s.id}`} className={"flex gap-2.5 rounded-md px-2 py-1.5 text-[14px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"}>
                                <span className={"font-mono text-[12px] tabular-nums"}>{String(i + 1).padStart(2, "0")}</span>{s.title}
                            </a>
                        ))}
                    </nav>
                </aside>
                <article className={"flex min-w-0 flex-col gap-20"}>
                    {sections.map((s, i) => (
                        <section key={s.id} id={s.id} className={"flex scroll-mt-24 flex-col gap-5"}>
                            <div className={"flex items-baseline gap-3"}>
                                <span className={"font-mono text-[13px] text-muted-foreground"}>{String(i + 1).padStart(2, "0")}</span>
                                <h2 className={"font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl"}>{s.title}</h2>
                            </div>
                            <div className={"flex max-w-[62ch] flex-col gap-4 text-[17px] leading-relaxed text-foreground/90"}>
                                {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
                            </div>
                            {s.quote && (
                                <blockquote className={"max-w-[40ch] border-l-2 border-foreground/30 py-1 pl-5 font-heading text-2xl font-bold leading-snug tracking-tight"}>
                                    {s.quote}
                                </blockquote>
                            )}
                            {extra?.[s.id]}
                            {s.shot && (
                                <figure className={"flex flex-col gap-2.5"}>
                                    <ProductShot name={s.shot.name} alt={s.shot.caption} sizes={"(max-width: 1023px) 100vw, 860px"} />
                                    <figcaption className={"font-mono text-[12px] text-muted-foreground"}>{s.shot.caption}</figcaption>
                                </figure>
                            )}
                        </section>
                    ))}
                    {children}
                </article>
            </div>
        </main>
    );
}

/** A box of counts beside the text: each line names what it counts. */
export function Numbers({title, lines}: {title: string; lines: string[]}) {
    return (
        <aside className={"flex max-w-xl flex-col gap-2 rounded-xl border border-border bg-card/60 p-5"}>
            <p className={"font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"}>{title}</p>
            {lines.map((l) => <p key={l} className={"text-[15px] leading-snug"}>{l}</p>)}
        </aside>
    );
}
