import React from "react";
import Link from "next/link";

import {allertaStencil} from "@/app/fonts/allerta-stencil";
import {bebasNeue} from "@/app/fonts/bebas-neue";
import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import {limelight} from "@/app/fonts/limelight";
import {tiltNeon} from "@/app/fonts/tilt-neon";
import {methodCover, yearsCover} from "@/components/market-hub/covers";
import s from "@/components/market-hub/hub.module.css";
import HubCv from "@/components/market-hub/HubCv";
import HubFilter from "@/components/market-hub/HubFilter";
import {STORY_COVERS} from "@/components/stories/covers";
import t from "@/components/stories/story.module.css";
import {weekDate, weekStart} from "@/lib/market-page";
import {MARKET_NAMES} from "@/lib/market-pages";
import {CV_AT, HubCard, hubCards, hubFilters} from "@/lib/market-hub";
import {allMarkets, keepLastPage} from "@/lib/landing/look-server";
import {publicPage} from "@/lib/seo";
import type {StorySlug} from "@/lib/stories/story";
import {cn} from "@/lib/utils";

/*
 * /market: the grid of stories (founder, 15 Oct 2026; docs/decisions/market-pages.md,
 * "Stories"). Each story is one week's count; each card also links its live
 * weekly market page, so the hub stays search's way into the live counts.
 * Server rendered from the published count, for the live links, the years
 * card and the week; a failed read during a revalidation keeps the last good
 * hub (look-server.ts). The covers' display faces load here and in their stories only.
 */

const HUB = {
    title: "The week in tech jobs",
    dek: "Every Monday, five pages count what tech jobs ask for. Each has a story that keeps one week and looks closer.",
    description: "Which skills tech jobs ask for, counted every Monday from live job ads: entry level software, software engineering, AI, machine learning and DevOps.",
};

export const revalidate = false;
export const metadata = publicPage("/market", {
    title: "What tech jobs ask for, counted every week", description: HUB.description,
    share: {title: "What tech jobs ask for, counted every week", description: HUB.description}, ownImage: true, article: true,
});

// The faces the covers set their numbers in (Contents may vary's cover draws in Hanken Grotesk).
const FONTS = [hankenGrotesk, bebasNeue, limelight, allertaStencil, tiltNeon].map((f) => f.variable).join(" ");

const cover = (c: HubCard) => c.cover === "years" ? yearsCover(c.years!.unstated, c.years!.total)
    : c.cover === "method" ? methodCover() : STORY_COVERS[c.cover as StorySlug]();

/** The badge by the title: a yellow starburst, like a price sticker. */
function Badge() {
    let d = "";
    for (let k = 0; k < 32; k++) {
        const r = k % 2 ? 52 : 62, a = Math.PI * k / 16;
        d += (k ? "L" : "M") + (64 + r * Math.cos(a)).toFixed(1) + " " + (64 + r * Math.sin(a)).toFixed(1);
    }
    const word = {textAnchor: "middle", fill: "#22201c", style: {fontFamily: "var(--essay)"}} as const;
    return (
        <div className={s.badge} aria-hidden>
            <svg viewBox={"0 0 128 128"}>
                <path d={`${d}Z`} fill={"#ffe066"} stroke={"#22201c"} strokeWidth={2} strokeLinejoin={"round"} />
                <text x={64} y={54} fontSize={13} fontWeight={700} {...word}>NEW COUNT</text>
                <text x={64} y={76} fontSize={20} fontWeight={800} {...word}>every</text>
                <text x={64} y={96} fontSize={20} fontWeight={800} {...word}>Monday</text>
            </svg>
        </div>
    );
}

function Card({c}: {c: HubCard}) {
    return (
        <li className={s.card} data-kind={c.kind}>
            <div className={s.meta}><span className={s.pill}>{c.pill}</span>{c.when && <span className={s.when}>{c.when}</span>}</div>
            <div className={s.cover} dangerouslySetInnerHTML={{__html: cover(c)}} />
            <h2><Link href={c.href}>{c.title}</Link></h2>
            <p>{c.line}</p>
            {c.live && <Link className={s.live} href={c.live.href}>{c.live.label}</Link>}
        </li>
    );
}

export default async function MarketHub() {
    const pages = await allMarkets(keepLastPage());
    const counted = MARKET_NAMES.map((n) => pages[n]).find((p) => p !== null) ?? null;
    const cards = hubCards(pages);
    return (
        <div className={cn(t.story, FONTS, s.hub)}>
            <div className={s.wrap}>
                <section className={s.mast}>
                    <p className={s.kick}>Market</p>
                    <h1>{HUB.title}</h1>
                    <p className={s.dek}>{HUB.dek}</p>
                    <Badge />
                    {counted && <p className={s.when}><time dateTime={weekStart(counted)}>Counted in the week of {weekDate(counted)}</time></p>}
                </section>
                <HubFilter filters={hubFilters(cards)}>
                    <ol className={s.grid}>
                        {cards.slice(0, CV_AT).map((c) => <Card key={c.href} c={c} />)}
                        <HubCv />
                        {cards.slice(CV_AT).map((c) => <Card key={c.href} c={c} />)}
                    </ol>
                </HubFilter>
                <p className={s.open}>The weekly counts are also open data, as CSV files on{" "}
                    <a href={"https://github.com/DerrickWawerumuturi/glassbox-job-counts"}>GitHub</a>.</p>
            </div>
        </div>
    );
}
