import React from "react";

import type {Listing as Ad} from "@/lib/stories/ai-on-your-cv";
import {cn} from "@/lib/utils";
import l from "./listing.module.css";

/*
 * A job listing card, as a generic web listing printed out and taped up (the
 * prototype's listing.css): posted date, title, employer, place, on site or
 * remote, years, the Requirements and Nice to have lists with the skills as
 * we read them from the ad, and a greyed Apply that does nothing. No job
 * board's design, no logos. The AI skills the story points at get a lime
 * marker. Its label says every field, so a screen reader hears the listing whole.
 */

/** A long list (Airbnb's 26) goes in two columns, with its count in the heading. */
const LONG = 12;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "14 Oct 2026" as the label says it: "14 October 2026". */
const day = (d: string) => d.replace(/\b([A-Z][a-z]{2})\b/, (m) => MONTHS.find((n) => n.startsWith(m)) ?? m);

export function label(ad: Ad, where = "Job listing") {
    const req = ad.required.length > LONG ? `${ad.required.length} required skills` : "Requirements";
    return `${where}: ${ad.title}, ${ad.employer}, ${ad.place}. ${ad.mode}. Posted ${day(ad.posted)}. ${ad.years}. ${req}: ${ad.required.join(", ")}. `
        + `Nice to have: ${ad.nice.length ? ad.nice.join(", ") : "none listed"}.`;
}

const Skills = ({names, lime, cols}: {names: string[]; lime: string[]; cols?: boolean}) => (
    <ul className={cn(l.list, cols && l.cols)}>{names.map((n) => <li key={n} className={lime.includes(n) ? l.lime : undefined}>{n}</li>)}</ul>
);

export default function Listing({ad, where, className, style}: {ad: Ad; where?: string; className?: string; style?: React.CSSProperties}) {
    const long = ad.required.length > LONG;
    return (
        <div className={cn(l.lcard, className)} style={style}>
            <article className={l.listing} aria-label={label(ad, where)}>
                <p className={l.posted}>Posted {ad.posted}</p>
                <p className={l.title}>{ad.title}</p>
                <p className={l.co}>{ad.employer}</p>
                <p className={l.loc}>{ad.place}</p>
                <p className={l.facts}><span>{ad.mode}</span><span>{ad.years}</span></p>
                <p className={l.h}>Requirements{long && <span>{ad.required.length} required skills</span>}</p>
                <Skills names={ad.required} lime={ad.lime} cols={long} />
                <p className={l.h}>Nice to have</p>
                {ad.nice.length ? <Skills names={ad.nice} lime={ad.lime} /> : <p className={l.none}>None listed</p>}
                <span className={l.apply} aria-hidden>Apply</span>
            </article>
            <p className={l.note}>Skills as we read them from the ad</p>
        </div>
    );
}
