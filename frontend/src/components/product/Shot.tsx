import React from "react";
import {getImageProps} from "next/image";

import type {ProductChapter} from "@/lib/site-copy";
import s from "./product.module.css";

/*
 * A screenshot of the product cropped to what its chapter shows
 * (public/product/crop: the example scan, no personal data; cut from
 * public/product's shots). A phone gets its own crop (art direction), and
 * each theme its own image: the site's theme decides (the .dark class).
 */

type ShotName = NonNullable<ProductChapter["shot"]>["name"];

const SIZE: Record<ShotName, {desktop: [number, number]; phone: [number, number]}> = {
    "market-demand": {desktop: [1400, 834], phone: [720, 1040]},
    skills: {desktop: [1400, 745], phone: [720, 1060]},
    opportunities: {desktop: [1400, 329], phone: [720, 600]},
    applications: {desktop: [1400, 531], phone: [732, 940]},
};

// The phone crop below 641px, as the prototype's 640px breakpoint.
const PHONE = "(max-width: 640px)";

function Picture({name, theme, alt}: {name: ShotName; theme: "light" | "dark"; alt: string}) {
    const {desktop: [w, h], phone: [pw, ph]} = SIZE[name];
    const {props: {srcSet: phone}} = getImageProps({src: `/product/crop/${name}-phone-${theme}.webp`, alt, width: pw, height: ph, sizes: "100vw"});
    const {props} = getImageProps({src: `/product/crop/${name}-desktop-${theme}.webp`, alt, width: w, height: h,
        sizes: "(max-width: 960px) 100vw, 640px"});
    return (
        <picture className={theme === "light" ? s.lt : s.dk}>
            <source media={PHONE} srcSet={phone} width={pw} height={ph} />
            <img {...props} />
        </picture>
    );
}

export default function Shot({name, alt}: {name: ShotName; alt: string}) {
    return (
        <div className={s.print}>
            <Picture name={name} theme={"light"} alt={alt} />
            <Picture name={name} theme={"dark"} alt={alt} />
        </div>
    );
}
