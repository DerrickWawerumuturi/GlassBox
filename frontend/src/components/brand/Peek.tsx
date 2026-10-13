import React from "react";

import {cn} from "@/lib/utils";

import "./peek.css";

/*
 * The peek (founder, 13 Oct 2026, GitHub issue #6): the wordmark's box O
 * with its dot inside, before the label of the buttons that take a CV into
 * the box. The button carries the classes `peek peek-button` (peek.css) and
 * this glyph as its first child: on hover or keyboard focus the dot hops up
 * and looks over the rim, and a press drops it back in. It takes the text
 * colour. The dot is drawn under the rim, so on its way up the rim hides it:
 * it comes from inside. One moment, one family of buttons; every other
 * control stays quiet (docs/decisions/design-system.md).
 */
export function PeekGlyph({className}: {className?: string}) {
    return (
        <svg className={cn("peek-glyph size-5", className)} viewBox={"0 0 20 20"} aria-hidden>
            <circle className={"peek-dot"} cx={10} cy={10} r={2.75} fill={"currentColor"} />
            <rect x={2} y={2} width={16} height={16} rx={4.5} fill={"none"} stroke={"currentColor"} strokeWidth={2} />
        </svg>
    );
}
