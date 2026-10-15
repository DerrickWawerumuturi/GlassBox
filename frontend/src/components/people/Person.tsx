import React from "react";

import type {Art} from "./art-type";
import {personSvg} from "./draw";
import s from "./people.module.css";

/**
 * One person from the cast, set into the text like a margin drawing: floated
 * to `side` of the paragraphs that follow it, `width` px wide (smaller on a
 * phone). `ground` says what it stands on: "page" follows the theme (line art
 * in dark), "light" is a ground that stays light in both themes.
 */
export default function Person({art, side = "right", width, flip, ground = "page"}: {
    art: Art; side?: "left" | "right"; width: number; flip?: boolean; ground?: "page" | "light";
}) {
    return (
        <div className={`${s.person} ${side === "left" ? s.left : s.right} ${ground === "light" ? s.onLight : ""}`}
             style={{"--w": `${width}px`} as React.CSSProperties} aria-hidden dangerouslySetInnerHTML={{__html: personSvg(art, {flip})}} />
    );
}
