import {readFileSync} from "node:fs";
import {join} from "node:path";

import React from "react";
import {ImageResponse} from "next/og";

import {SHARE_SIZE} from "@/components/market-page/ShareImage";
import {MARKET_PAGES} from "@/lib/market-pages";
import {SITE_URL} from "@/lib/site";
import {StoryInfo, storyPath, storyWeek} from "@/lib/stories/story";

/*
 * A story's share preview, 1200 by 630 (each story's opengraph-image.tsx):
 * on the story's own ground, the kicker with the week it counts, the title in
 * the editorial face, the card line, and the story's own picture (`art`,
 * drawn with the numbers from its data module). Static cuts of the faces in
 * app/fonts/og (next/og reads ttf, not woff2), as the market pages' images.
 */

export {SHARE_SIZE};

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts/og", file));
const wordmark = (ground: "dark" | "light") =>
    `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), `public/brand/wordmark-on-${ground}.svg`)).toString("base64")}`;

/** A story's own display face for its picture, by the name the art sets as fontFamily. */
export type Face = {name: string; file: string};

export function storyImage({story, ground, ink, muted, dark, art, face, wide = false}: {
    story: StoryInfo; ground: string; ink: string; muted: string; dark: boolean; art: React.ReactElement; face?: Face;
    /** The picture takes the right half; `wide` gives it more and the words less. */
    wide?: boolean;
}) {
    const kicker = `${MARKET_PAGES[story.page].label.toUpperCase()} · WEEK OF ${storyWeek(story).toUpperCase()}`;
    const words = wide ? 520 : 600;
    // The card line keeps "Terraform / IaC" whole: next/og breaks at the slash and keeps the space before it.
    return new ImageResponse(
        (
            <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "56px 64px", backgroundColor: ground, color: ink, fontFamily: "Hanken Grotesk"}}>
                <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: 2, color: muted}}>{kicker}</div>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40}}>
                    <div style={{display: "flex", flexDirection: "column", gap: 20, width: words}}>
                        <div style={{display: "flex", fontSize: story.title.length > 22 ? 64 : 80, fontWeight: 800, lineHeight: 1, letterSpacing: -2}}>{story.title}</div>
                        <div style={{display: "flex", fontSize: 28, fontWeight: 500, lineHeight: 1.35, color: muted}}>{story.card.replaceAll(" / ", "\u00a0/\u00a0")}</div>
                    </div>
                    <div style={{display: "flex", flex: 1, justifyContent: "center"}}>{art}</div>
                </div>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wordmark(dark ? "dark" : "light")} width={219} height={32} alt={"Glassbox"} />
                    <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 20, color: muted}}>{`${new URL(SITE_URL).host}${storyPath(story)}`}</div>
                </div>
            </div>
        ),
        {
            ...SHARE_SIZE,
            fonts: [
                {name: "Hanken Grotesk", data: font("hanken-grotesk-800.ttf"), weight: 800, style: "normal"},
                {name: "Hanken Grotesk", data: font("hanken-grotesk-500.ttf"), weight: 500, style: "normal"},
                {name: "JetBrains Mono", data: font("jetbrains-mono-500.ttf"), weight: 500, style: "normal"},
                ...(face ? [{name: face.name, data: font(face.file), weight: 400 as const, style: "normal" as const}] : []),
            ],
        },
    );
}
