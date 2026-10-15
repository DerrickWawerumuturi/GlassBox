import {fmt} from "@/lib/market-page";
import {inWords} from "@/lib/stories/story";
import {Counted, Door, ELEVEN} from "@/lib/stories/within-eleven-jobs";
import type {Colour, YardBay, YardConfig} from "./draw";

/*
 * The five yards you can drive, written from the week's numbers
 * (lib/stories/within-eleven-jobs.ts): what each stack is, its label read
 * aloud, and what the readout says when the crane is over it. Stacks in a
 * yard stand tallest first; a stack keeps its colour whatever its place.
 */

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const E = ELEVEN, R = fmt(E.readable), J = fmt(E.jobs);
const of567 = (n: number) => `is named in ${fmt(n)} of the ${R} DevOps jobs we could read`;
const tallest = (bays: YardBay[]) => [...bays].sort((a, b) => b.n - a.n);
const SKILL: Record<string, Colour> = {terraform: "blue", python: "maroon", kubernetes: "slate", go: "blue", bash: "slate",
    typescript: "white", sql: "blue", powershell: "maroon", java: "slate"};
const door = (d: Door) => `${d.title}, ${d.employer}${d.years === null ? "" : `, asks ${d.years}`}`;
const doorsIn = (from: number, to: number | null) => E.doors.filter((d) => d.years !== null && d.years >= from && (to === null || d.years <= to));
const band = (b: {from: number; to: number | null}) => (b.to === null ? `${b.from} or more` : `${b.from} to ${b.to} years`);

function skill(c: Counted, senior: boolean): YardBay {
    const by = c.employers ? `, by jobs at ${c.employers} employers` : "";
    const sen = senior && c.senior !== undefined ? ` In the ${fmt(E.seniorJobs)} senior DevOps jobs the share is ${c.senior}%.` : "";
    return {name: c.name, n: c.jobs, of: E.readable, k: SKILL[c.key] ?? "slate", share: c.share, employers: c.employers,
        senior: senior ? c.senior : undefined, say: `${of567(c.jobs)}, ${c.share}%${by}.${sen}`};
}

export const TOP: YardConfig = {
    id: "y-top", hero: true, title: `The three stacks, of the ${R} DevOps jobs we could read`,
    label: `A container yard at dusk. Three stacks of the same height, one container per job. `
        + E.top.map((c, i) => `${c.name}: ${fmt(c.jobs)} of ${R}${i ? "" : " DevOps jobs"}, ${c.share}%.`).join(" ") + " A gantry crane over the row reads each stack.",
    bays: E.top.map((c) => skill(c, false)),
};

export const LANGS: YardConfig = {
    id: "y-langs", title: `The languages quay, of the ${R} DevOps jobs we could read`,
    tableNote: `Senior share: in the ${fmt(E.seniorJobs)} senior DevOps jobs.`,
    label: `${cap(inWords(E.languages.length))} stacks for the ${inWords(E.languages.length)} languages the page charts, one container per job. `
        + E.languages.map((c, i) => `${c.name} ${fmt(c.jobs)}${i ? "" : ` of ${R}`}`).join(", ") + ".",
    bays: tallest(E.languages.map((c) => skill(c, true))),
};

export const LEVELS: YardConfig = {
    id: "y-levels", title: `Levels and internships, of the ${J} DevOps jobs`,
    label: `Five stacks, one container per job, of ${J} DevOps jobs. Senior, lead or principal ${fmt(E.levels.senior)}. No level stated ${fmt(E.levels.unstated)}, hatched. `
        + `Mid level ${fmt(E.levels.mid)}. Junior ${fmt(E.levels.junior)}. Internships ${fmt(E.internships.jobs)}, the short stack on the far quay.`,
    bays: tallest([
        {name: "Senior", n: E.levels.senior, of: E.jobs, k: "blue", say: `${fmt(E.levels.senior)} of the ${J} DevOps jobs are senior, lead or principal.`},
        {name: "Not stated", n: E.levels.unstated, of: E.jobs, k: "gap", say: `${fmt(E.levels.unstated)} of the ${J} DevOps jobs state no level.`},
        {name: "Mid level", n: E.levels.mid, of: E.jobs, k: "slate", say: `${fmt(E.levels.mid)} of the ${J} DevOps jobs read as mid level.`},
        {name: "Junior", n: E.levels.junior, of: E.jobs, k: "maroon",
            say: `${fmt(E.levels.junior)} of the ${J} DevOps jobs read as intern, entry level or junior. The ${fmt(E.internships.jobs)} internships are among them.`},
        {name: "Internships", n: E.internships.jobs, of: E.jobs, k: "white", share: E.internships.share,
            say: `${fmt(E.internships.jobs)} of the ${J} DevOps jobs are internships, ${E.internships.share}%.`},
    ]),
};

const YEARS_COL: Colour[] = ["white", "maroon", "blue", "slate"];
const stated = fmt(E.years.stated);
export const YEARS: YardConfig = {
    id: "y-years", title: `Years asked for, of the ${stated} DevOps jobs that state a number`,
    label: `Five stacks, one container per job. No number stated, ${fmt(E.years.unstated)} of ${J}, hatched. Of the ${stated} that state a number: `
        + [...E.years.bands].sort((a, b) => b.jobs - a.jobs).map((b, i) => `${fmt(b.jobs)}${i ? "" : " ask"} for ${b.to === null ? `${b.from} or more` : `${b.from} to ${b.to}`}${i ? "" : " years"}`).join(", ") + ".",
    bays: tallest([
        {name: "Not stated", n: E.years.unstated, of: E.jobs, k: "gap",
            say: `${fmt(E.years.unstated)} of the ${J} DevOps jobs state no number of years. Among the ${E.listed} titles the page lists, these show none: `
                + E.doors.filter((d) => d.years === null).map(door).join(" · ") + "."},
        ...E.years.bands.map((b, i): YardBay => {
            const doors = doorsIn(b.from, b.to), ask = b.to === null ? `${b.from} years or more` : `${b.from} to ${b.to} years`;
            return {name: band(b), n: b.jobs, of: E.years.stated, k: YEARS_COL[i],
                say: `${fmt(b.jobs)} of the ${stated} DevOps jobs that state a number ask for ${ask}.`
                    + (doors.length ? ` On the doors: ${doors.map(door).join(" · ")}.` : ` None of the ${E.listed} titles the page lists states ${b.from} to ${b.to ?? "more"}.`)};
        }),
    ]),
};

export const SHIPS: YardConfig = {
    id: "y-ships", ship: true, title: `Where the jobs say they are, of the ${J} DevOps jobs`,
    label: `Three ships at the quay, loaded with one container per job, of ${J} DevOps jobs. A place in the US, ${fmt(E.places.us)}. `
        + `No country we can read, ${fmt(E.places.unknown)}, hatched. A place elsewhere, ${fmt(E.places.elsewhere)}.`,
    bays: tallest([
        {name: "In the US", n: E.places.us, of: E.jobs, k: "blue", say: `${fmt(E.places.us)} of the ${J} DevOps jobs name a place in the US.`},
        {name: "No country", n: E.places.unknown, of: E.jobs, k: "gap", say: `${fmt(E.places.unknown)} of the ${J} DevOps jobs name no country we can read.`},
        {name: "Elsewhere", n: E.places.elsewhere, of: E.jobs, k: "maroon", say: `${fmt(E.places.elsewhere)} of the ${J} DevOps jobs name a place outside the US.`},
    ]),
};
