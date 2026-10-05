import React from "react";

/*
 * The shape of the privacy pages: a title, a one-line summary, then short
 * sections of plain bullets. Every statement on them is checked against the
 * code (docs/decisions/privacy-pages.md lists where each one comes from).
 */

export function LegalPage({title, summary, updated, children}: {
    title: string; summary: string; updated: string; children: React.ReactNode;
}) {
    return (
        <main className={"mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 lg:py-14"}>
            <header className={"flex flex-col gap-3"}>
                <h1 className={"font-heading text-4xl font-bold tracking-tight"}>{title}</h1>
                <p className={"text-base text-muted-foreground"}>{summary}</p>
                <p className={"font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"}>Updated {updated}</p>
            </header>
            {children}
        </main>
    );
}

export function LegalSection({id, title, children}: {id?: string; title: string; children: React.ReactNode}) {
    return (
        <section id={id} className={"flex scroll-mt-20 flex-col gap-3"}>
            <h2 className={"font-heading text-xl font-bold"}>{title}</h2>
            <ul className={"flex flex-col gap-2 text-[15px] leading-relaxed text-foreground/90 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.65em] [&>li]:before:size-1.5 [&>li]:before:rounded-full [&>li]:before:bg-muted-foreground/60"}>
                {children}
            </ul>
        </section>
    );
}
