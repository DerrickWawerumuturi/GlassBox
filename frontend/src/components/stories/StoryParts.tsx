import React from "react";
import Link from "next/link";

import {MARKET_PAGES, marketPath} from "@/lib/market-pages";
import {JOB_SITES, METHOD_PAGE} from "@/lib/method-copy";
import {storyStructuredData} from "@/lib/seo";
import {StoryInfo, storyWeek} from "@/lib/stories/story";
import {cn} from "@/lib/utils";
import t from "./story.module.css";

/*
 * What every visual story is made of besides its own figures: the page around
 * it (the shared tokens, its fonts, its Article markup), the way back to the
 * live count, the source line under every figure, and the line that says the
 * story counts one week. Server rendered, so the words read without script.
 */

/**
 * A story's page. `fonts` are the font classes its route loads (next/font,
 * app/fonts), so each route carries only its own faces; `className` is the
 * story's own ground.
 */
export function StoryPage({story, fonts, className, children}: {story: StoryInfo; fonts: string; className: string; children: React.ReactNode}) {
    return (
        <div className={cn(t.story, fonts, className)}>
            <script type={"application/ld+json"} dangerouslySetInnerHTML={{__html: JSON.stringify(storyStructuredData(story))}} />
            {children}
        </div>
    );
}

/** Market / the live page / the story, where the prototypes had the wordmark: the way back to the live count. */
export function Crumbs({story, className}: {story: StoryInfo; className?: string}) {
    return (
        <nav aria-label={"Breadcrumb"} className={cn(t.crumbs, className)}>
            <Link href={"/market"}>Market</Link> / <Link href={marketPath(story.page)}>{MARKET_PAGES[story.page].label}</Link>
            {" / "}<span aria-current={"page"}>{story.title}</span>
        </nav>
    );
}

/** Under every figure: the week the story counts, and how we count. */
export function Source({story, className, href = "/method"}: {story: StoryInfo; className?: string; href?: string}) {
    const how = href.startsWith("/") ? <Link href={href}>how we count</Link> : <a href={href}>how we count</a>;
    return <p className={className}>Source: Glassbox count, week of {storyWeek(story)} · {how}</p>;
}

/**
 * The observation period, said plainly near the top, and once more, short,
 * after the CV ask: the story keeps to one week; its market page starts a
 * new count every Monday.
 */
export function LiveLine({story, className, short = false}: {story: StoryInfo; className?: string; short?: boolean}) {
    const page = <Link href={marketPath(story.page)}>The {MARKET_PAGES[story.page].subject} page</Link>;
    return short ? (
        <p className={className}>One week, {storyWeek(story)}. {page} counts again on Monday.</p>
    ) : (
        <p className={className}>
            This story keeps to one week, {storyWeek(story)}. {page} starts a new count every Monday.
        </p>
    );
}

const SITES = JOB_SITES.filter((s) => s.href).map((s) => s.name);
const BLIND = METHOD_PAGE.sections.find((s) => s.id === "blind")!.paragraphs;

/**
 * In every story's "How we counted", after what its jobs are: where the jobs
 * come from and what we can't see, in /method's own words (lib/method-copy.ts).
 */
export function Scope() {
    return (
        <>
            <p>
                The jobs come from public job boards, read every six hours: employers&apos; own boards on Greenhouse, Ashby, Lever and Workable,
                and job sites such as {SITES.slice(0, -1).join(", ")} and {SITES[SITES.length - 1]}. Each job counts once, however many boards or cities list it.
            </p>
            <p>What we can&apos;t see: {BLIND.map((b) => b.charAt(0).toLowerCase() + b.slice(1).replace(/\.$/, "")).join("; ")}.</p>
        </>
    );
}
