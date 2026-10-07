import React from "react";

import {BarRows, Figure, PairRows, Stacked, TableTwin} from "@/components/market-page/Figures";
import {fmt, longDate, pct} from "@/lib/market-page";
import {
    bucketPhrase, categoriesSection, comparable, compareShare, contrastSection, Ctx, has, hiringSection, languagesSection,
    levelsSection, share, skillName, yearsSection,
} from "@/lib/market-story";

/*
 * The finding sections, each written from the data (lib/market-story.ts) and
 * shown only when the backend says the data supports it (story.sections).
 * Heading = the finding, a sentence or two around one figure.
 */

export function H2({id, children}: {id: string; children: React.ReactNode}) {
    return (
        <h2 id={id} className={"group mt-20 mb-[18px] scroll-mt-[70px] font-heading text-[25px] font-bold leading-[1.15] tracking-[-0.015em] sm:mt-28 sm:text-[30px] before:mb-[22px] before:block before:h-[3px] before:w-10 before:bg-foreground before:content-['']"}>
            {children}
            <a href={`#${id}`} aria-label={"Link to this section"} className={"ml-2 font-normal text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"}>#</a>
        </h2>
    );
}

/** Reading text: Source Serif 4, 19px on a desktop and 18px on a phone. The page's first paragraph sets its first line in semibold. */
export const P = ({children, first}: {children: React.ReactNode; first?: boolean}) => (
    <p className={`mb-5 font-read text-[18px] leading-[1.7] sm:text-[19px] ${first ? "first-line:font-semibold" : ""}`}>{children}</p>
);

function Languages({c}: {c: Ctx}) {
    const s = languagesSection(c), date = longDate(c.page.taken_at);
    const rows = s.bars.map((b, i) => ({key: b.key, name: skillName(c, b.key), share: share(c, b), compare: comparable(c) ? compareShare(c, b) : null,
        count: b.any, lime: i === 0}));
    return (
        <section aria-labelledby={"languages"}>
            <H2 id={"languages"}>{s.heading}</H2>
            <P>{s.before}</P>
            <Figure title={"Languages they name"} sub={`share of ${c.info.subject} jobs`} chips={[`${fmt(c.page.readable)} jobs`]} caption={s.caption} date={date}>
                <BarRows rows={rows} label={`Share of ${fmt(c.page.readable)} ${c.info.subject} jobs naming each language: ${rows.map((r) => `${r.name} ${r.share}%`).join(", ")}.`} />
                <TableTwin head={["Language", "Jobs", "Share", "Employers", ...(comparable(c) ? [`${c.info.compare}`] : [])]}
                           rows={s.bars.map((b) => [skillName(c, b.key), `${fmt(b.any)}/${fmt(c.page.readable)}`, `${share(c, b)}%`, fmt(b.employers),
                               ...(comparable(c) ? [`${compareShare(c, b)}%`] : [])])} />
            </Figure>
            {s.after && <P>{s.after}</P>}
        </section>
    );
}

function Contrast({c}: {c: Ctx}) {
    const s = contrastSection(c), date = longDate(c.page.taken_at);
    const rows = s.rows.map((r, i) => ({key: r.key, name: skillName(c, r.key), left: share(c, r), right: compareShare(c, r), lime: i === 0}));
    return (
        <section aria-labelledby={"contrast"}>
            <H2 id={"contrast"}>{s.heading}</H2>
            <P>{s.before}</P>
            <Figure title={c.info.kind === "entry" ? "Entry level vs senior" : "All jobs vs senior"} sub={"share of jobs naming each skill"}
                    chips={[`${fmt(c.page.readable)} ${c.info.subject}`, `${fmt(c.page.story.compare.readable)} ${c.info.compare}`]} caption={s.caption} date={date}>
                <PairRows rows={rows} left={s.legend.left} right={s.legend.right}
                          label={`Share of ${c.info.subject} jobs and of ${c.info.compare} jobs naming each skill: ${rows.map((r) => `${r.name} ${r.left}% and ${r.right}%`).join(", ")}.`} />
                <TableTwin head={["Skill", s.legend.left, s.legend.right]}
                           rows={s.rows.map((r) => [skillName(c, r.key), `${fmt(r.any)}/${fmt(c.page.readable)} · ${share(c, r)}%`,
                               `${fmt(r.compare_any)}/${fmt(c.page.story.compare.readable)} · ${compareShare(c, r)}%`])} />
            </Figure>
            <P>{s.after}</P>
        </section>
    );
}

function Categories({c}: {c: Ctx}) {
    const s = categoriesSection(c), date = longDate(c.page.taken_at);
    return (
        <section aria-labelledby={"categories"}>
            <H2 id={"categories"}>{s.heading}</H2>
            <P>{s.before}</P>
            <Figure title={"Beyond the languages"} sub={"share of jobs naming each"} chips={[`${fmt(c.page.readable)} jobs`]} caption={s.caption} date={date}>
                <div className={"grid gap-x-[22px] gap-y-4 sm:grid-cols-2"}>
                    {s.groups.map((g, gi) => (
                        <div key={g.category} className={"min-w-0"}>
                            <h3 className={"mb-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground"}>
                                {g.title} · {fmt(g.jobs)} jobs
                            </h3>
                            <BarRows narrow label={`${g.title}: ${g.rows.map((r) => `${skillName(c, r.key)} ${share(c, r)}%`).join(", ")}.`}
                                     rows={g.rows.map((r, i) => ({key: r.key, name: skillName(c, r.key), share: share(c, r),
                                         compare: comparable(c) ? compareShare(c, r) : null, lime: gi === 0 && i === 0}))} />
                        </div>
                    ))}
                </div>
            </Figure>
        </section>
    );
}

function Years({c}: {c: Ctx}) {
    const s = yearsSection(c), y = c.page.story.years;
    return (
        <section aria-labelledby={"years"}>
            <H2 id={"years"}>{s.heading}</H2>
            <div className={"my-[26px] grid grid-cols-[auto_1fr] items-end gap-[22px] border-t-2 border-b border-t-foreground border-b-border py-[22px]"}>
                <b className={"font-heading text-[56px] leading-[0.85] tracking-[-0.04em] sm:text-[88px]"}>{s.pull}</b>
                <p className={"m-0 font-read text-[17px]"}>{s.pullLine}</p>
            </div>
            <Stacked label={s.label} parts={y.buckets.map((b) => ({
                label: b === s.top ? bucketPhrase(b.from, b.to) : b.to === b.from ? String(b.from) : b.to === null ? `${b.from}+` : `${b.from}–${b.to}`,
                value: b.jobs, tone: b === s.top ? "lime" : "soft",
            }))} />
            <p className={"mb-5 font-mono text-[12px] text-muted-foreground"}>{s.stated}</p>
        </section>
    );
}

function Levels({c}: {c: Ctx}) {
    const s = levelsSection(c), l = c.page.levels!;
    return (
        <section aria-labelledby={"levels"}>
            <H2 id={"levels"}>{s.heading}</H2>
            <P>{s.before}</P>
            <Stacked label={s.label} parts={[
                {label: "Junior", value: l.junior, tone: "soft"}, {label: "Mid", value: l.mid, tone: "soft"},
                {label: "Senior", value: l.senior, tone: "ink"}, {label: "Not stated", value: l.unstated, tone: "hatch"},
            ]} />
            <p className={"mb-5 font-mono text-[12px] text-muted-foreground"}>{`Of ${fmt(c.page.jobs)} ${c.info.subject} jobs. Hatched: no level stated.`}</p>
        </section>
    );
}

function Hiring({c}: {c: Ctx}) {
    const s = hiringSection(c), {page} = c, date = longDate(page.taken_at);
    const tile = (title: string, n: number) => (
        <div className={"min-w-0"}>
            <h3 className={"mb-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground"}>{title}</h3>
            <BarRows narrow label={`${title}: ${fmt(n)} of ${fmt(page.jobs)} jobs.`}
                     rows={[{key: title, name: `${fmt(n)} of ${fmt(page.jobs)}`, share: pct(n, page.jobs), compare: null, plain: true}]} />
        </div>
    );
    return (
        <section aria-labelledby={"hiring"}>
            <H2 id={"hiring"}>{s.heading}</H2>
            <P>{s.before}</P>
            <Figure title={`Where the ${fmt(page.jobs)} jobs are`} sub={"by the place each job names"} chips={[`${fmt(page.jobs)} jobs`]} caption={s.caption} date={date}>
                <Stacked label={s.places} parts={[
                    {label: "US", value: page.places.us, tone: "ink"}, {label: "Elsewhere", value: page.places.elsewhere, tone: "soft"},
                    {label: "?", value: page.places.unknown, tone: "hatch"},
                ]} />
                <div className={"mt-[18px] grid gap-[22px] sm:grid-cols-2"}>
                    {page.internships > 0 && tile("Internships", page.internships)}
                    {tile("Remote", page.remote)}
                </div>
            </Figure>
        </section>
    );
}

/** Every section the data supports, in reading order. */
export default function StorySections({c}: {c: Ctx}) {
    return (
        <>
            {has(c, "languages") && <Languages c={c} />}
            {has(c, "contrast") && <Contrast c={c} />}
            {has(c, "categories") && <Categories c={c} />}
            {has(c, "years") && <Years c={c} />}
            {has(c, "levels") && c.page.levels && <Levels c={c} />}
            {has(c, "hiring") && <Hiring c={c} />}
        </>
    );
}
