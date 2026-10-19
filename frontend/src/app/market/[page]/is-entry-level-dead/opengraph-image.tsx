import React from "react";

import {entryLadder} from "@/components/stories/covers/is-entry-level-dead";
import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {IS_ENTRY_LEVEL_DEAD} from "@/lib/stories/is-entry-level-dead";

/*
 * Is entry level dead?'s share preview: on the paper page, the hub cover's
 * drawing, the week's software jobs piled on the ladder's three steps with the
 * bottom one in lime, from the week's numbers. Drawn without its words: next/og
 * has no faces for text inside an image, and the title and card line say the numbers.
 */

export const alt = "Is entry level dead? One week's count of entry level software jobs, drawn as people on a ladder, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: IS_ENTRY_LEVEL_DEAD.page}];
}

const LADDER = `data:image/svg+xml;base64,${Buffer.from(entryLadder(false)).toString("base64")}`;

export default function OgImage() {
    // eslint-disable-next-line @next/next/no-img-element
    const art = <img src={LADDER} width={430} height={430} alt={""} style={{borderRadius: 18}} />;
    return storyImage({story: IS_ENTRY_LEVEL_DEAD, ground: "#f7f3ef", ink: "#21201c", muted: "#63635e", dark: false, art});
}
