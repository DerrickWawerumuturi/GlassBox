import React from "react";
import Link from "next/link";

import CopyFact from "@/components/market-page/CopyFact";
import EntryContrast from "@/components/market-page/EntryContrast";
import EntryCta from "@/components/market-page/EntryCta";
import EntrySkills from "@/components/market-page/EntrySkills";
import {ENTRY_COPY as C, ENTRY_NAME, ENTRY_PATH, EntryPage, countLine, entryForPage, fmt, headlineFacts, levelLabel} from "@/lib/market-page";
import {publicPage} from "@/lib/seo";

// The share image is this page's own (opengraph-image.tsx): the headline fact, its count and date.
export const metadata = publicPage(ENTRY_PATH, {
    title: C.title,
    description: C.description,
    share: {title: C.shareTitle, description: C.description},
    ownImage: true,
});

// Static, rebuilt at most every 5 minutes (ISR), like the landing page: a
// failed fetch during a revalidation keeps the last good page (look-server.ts).
export const revalidate = 300;

function Section({id, title, line, children}: {id: string; title: string; line?: string; children: React.ReactNode}) {
    return (
        <section aria-labelledby={`${id}-h`} className={"flex min-w-0 flex-col gap-4"}>
            <div className={"flex flex-col gap-1.5"}>
                <h2 id={`${id}-h`} className={"font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl"}>{title}</h2>
                {line && <p className={"text-[15px] text-muted-foreground"}>{line}</p>}
            </div>
            {children}
        </section>
    );
}

function Tile({label, value, line}: {label: string; value: string; line?: string}) {
    return (
        <div className={"flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card/60 p-4"}>
            <span className={"font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>{label}</span>
            <span className={"font-heading text-3xl font-bold tracking-tight"}>{value}</span>
            {line && <span className={"text-[13px] text-muted-foreground"}>{line}</span>}
        </div>
    );
}

/** Who is hiring. Counts always; anything that is a share only over the 100 job rule. */
function Hiring({page}: {page: EntryPage}) {
    const share = page.publishable;
    return (
        <div className={"grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
            <Tile label={C.employers} value={fmt(page.employers)} />
            <Tile label={C.internships} value={fmt(page.internships)} line={share ? C.ofJobs(page.internships, page.jobs) : undefined} />
            <Tile label={C.remote} value={fmt(page.remote)} line={share ? C.ofJobs(page.remote, page.jobs) : undefined} />
            <Tile label={C.places} value={fmt(page.places.us)} line={C.placesLine(page.places)} />
            {share && page.largest_employer && (
                <Tile label={C.largest} value={page.largest_employer.name} line={C.largestLine(page.largest_employer, page.jobs)} />
            )}
        </div>
    );
}

function Titles({page}: {page: EntryPage}) {
    return (
        <ul className={"grid gap-x-6 sm:grid-cols-2"}>
            {page.titles.map(([title, company, level, years], i) => {
                const chip = levelLabel(level, years);
                return (
                    <li key={`${company}-${title}-${i}`} className={"flex min-w-0 flex-col gap-0.5 border-b border-border py-2.5"}>
                        <span className={"break-words text-[15px] font-medium leading-snug"}>{title}</span>
                        <span className={"flex flex-wrap items-center gap-x-2 font-mono text-[12px] text-muted-foreground"}>
                            <span>{company}</span>
                            {chip && <><span aria-hidden>·</span><span>{chip}</span></>}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

/** What entry level software jobs ask for, counted from today's live jobs (docs/decisions/market-pages.md). */
export default async function EntryLevelSoftwarePage() {
    const page = await entryForPage();
    const facts = page ? headlineFacts(page) : [];
    return (
        <main className={"mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-12 sm:px-5 lg:px-8 lg:py-16"}>
            <header className={"flex max-w-3xl flex-col gap-4"}>
                <p className={"font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"}>{C.kicker}</p>
                <h1 className={"font-heading text-4xl font-bold uppercase leading-[1.02] tracking-tight sm:text-5xl"}>{C.title}</h1>
                <p className={"text-lg leading-relaxed text-muted-foreground"}>{page ? countLine(page) : C.unavailable}</p>
                {/* Under the 100 rule the count is the only fact, so it is copied from here. */}
                {page && !page.publishable && (
                    <div><CopyFact fact={countLine(page)} page={ENTRY_NAME} path={ENTRY_PATH} label={C.copy} done={C.copied} /></div>
                )}
            </header>

            {page && (
                <>
                    {page.publishable && <ul aria-label={C.factsTitle} className={"flex flex-col gap-3"}>
                        {facts.map((fact) => (
                            <li key={fact} className={"flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"}>
                                <p className={"text-[17px] leading-snug"}>{fact}</p>
                                <CopyFact fact={fact} page={ENTRY_NAME} path={ENTRY_PATH} label={C.copy} done={C.copied} />
                            </li>
                        ))}
                    </ul>}

                    {page.publishable ? (
                        <>
                            <Section id={"skills"} title={C.skillsTitle} line={C.skillsLine(page.skills.length, page.readable)}>
                                <EntrySkills page={page} />
                            </Section>
                            <EntryCta line={C.ctaLine} />
                            <section className={"flex flex-col gap-3"}>
                                <EntryContrast page={page} />
                                {C.medianLine(page.required_median.entry, page.required_median.senior) && (
                                    <p className={"text-[15px] text-muted-foreground"}>{C.medianLine(page.required_median.entry, page.required_median.senior)}</p>
                                )}
                            </section>
                        </>
                    ) : (
                        <>
                            <p className={"max-w-3xl rounded-xl border border-dashed border-border p-5 text-[16px] leading-relaxed"}>{C.thin(page.readable, page.min_readable)}</p>
                            <EntryCta line={C.ctaLineThin} />
                        </>
                    )}

                    <Section id={"hiring"} title={C.factsRow}>
                        <Hiring page={page} />
                    </Section>

                    <Section id={"titles"} title={C.titlesTitle} line={C.titlesLine(page.titles.length, page.jobs)}>
                        <Titles page={page} />
                    </Section>
                </>
            )}

            <Section id={"how"} title={C.howTitle}>
                <div className={"flex max-w-[62ch] flex-col gap-4 text-[16px] leading-relaxed text-foreground/90"}>
                    {C.how.map((p) => <p key={p}>{p}</p>)}
                    <p><Link href={"/method"} className={"text-primary underline-offset-4 hover:underline"}>{C.method}</Link></p>
                </div>
            </Section>
        </main>
    );
}
