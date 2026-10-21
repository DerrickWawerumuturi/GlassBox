import React from "react";

import {aiStreet} from "@/components/stories/covers/ai-on-your-cv";
import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {AI_ON_YOUR_CV} from "@/lib/stories/ai-on-your-cv";

/*
 * Do you need AI on your CV now?'s share preview: on the paper page, the hub
 * cover's drawing, five drawn buildings with 100 windows each, the ones whose
 * job names LLMs lit lime, from the week's numbers. Drawn without its signs:
 * next/og has no faces for text inside an image, and the title and card line
 * say the numbers.
 */

export const alt = "Do you need AI on your CV now? One week's count of the jobs that name LLMs, door by door, drawn as lit windows, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: AI_ON_YOUR_CV.page}];
}

const STREET = `data:image/svg+xml;base64,${Buffer.from(aiStreet(false)).toString("base64")}`;

export default function OgImage() {
    // eslint-disable-next-line @next/next/no-img-element
    const art = <img src={STREET} width={430} height={430} alt={""} style={{borderRadius: 18}} />;
    return storyImage({story: AI_ON_YOUR_CV, ground: "#f7f3ef", ink: "#21201c", muted: "#63635e", dark: false, art});
}
