import React from "react";

import {fmt} from "@/lib/market-page";
import {asking, bucketWords, GROUPS, RINGED_EACH, yearsRows, type LogKind, type YearsCounts, type YearsRow} from "@/lib/years-answer";
import {cn} from "@/lib/utils";
import {hatchDef, logSvg} from "./logs";
import s from "./years.module.css";

/*
 * The years page's small figures, drawn as SVG on the server from the same
 * counts as the piles, coloured by the page's variables so the theme needs no
 * script: the specimen board (how to read a log end), the early career jobs
 * that state a number (one big log each), and the rounds (one log per row on
 * its side, cut by share). Ported from the prototype's rounds.js and page.js.
 */

const Svg = ({w, h, html, className}: {w: number; h: number; html: string; className?: string}) => (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden dangerouslySetInnerHTML={{__html: html}} />
);

const SPECIMENS: Array<{t: LogKind; label: [string, string]}> = [
    {t: -1, label: ["Sealed", "no number"]}, {t: 0, label: ["Bare", "no experience"]}, {t: 2, label: ["2 rings", "2 years"]},
    {t: 4, label: ["4 rings", "4 years"]}, {t: 5, label: ["Heartwood", "5 or more"]},
];

/** How to read a log end: the five kinds side by side, labelled. */
export function Specimens() {
    return (
        <figure className={s.specimens} role={"img"}
                aria-label={"How to read a log end: a sealed grey end states no number. A bare log with only its pith asks for no experience. Each ring is a year. Lime paint: two years or less. Bare wood: three or four. Dark heartwood: five or more."}>
            <ul>
                {SPECIMENS.map(({t, label}) => (
                    <li key={t}><Svg w={48} h={48} html={`<defs>${hatchDef(`spec-hx-${t + 1}`, 4)}</defs>${logSvg(24, 24, 22, t, 0.45, `spec-hx-${t + 1}`)}`} />
                        <span>{label[0]}<br />{label[1]}</span></li>
                ))}
            </ul>
            <figcaption><p className={s.cap}>How to read a log end. Lime paint marks two years or less, the one highlight on every pile.</p></figcaption>
        </figure>
    );
}

/**
 * Every early career job that states a number, one big log each, grouped by
 * the years it asks for. Above RINGED_EACH such jobs, one log per group with
 * its count, so a busy week still fits a phone. A group with none is a dashed ring.
 */
export function Ringed({c}: {c: YearsCounts}) {
    const y = c.titled, every = y.stated <= RINGED_EACH, big = 38;
    return (
        <ul className={s.ringed}>
            {y.buckets.map((b) => {
                const t = Math.min(5, b.from), k = every ? b.jobs : Math.min(1, b.jobs), per = Math.min(5, Math.max(1, k)), rows = Math.max(1, Math.ceil(k / per));
                const w = per * big + 4, h = Math.round(rows * big * 0.88 + big * 0.12 + 4), id = `ringed-hx-${b.from}`;
                const html = !b.jobs
                    ? `<circle cx="${big / 2 + 2}" cy="${big / 2 + 2}" r="${big / 2 - 2}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="3 3"/>`
                    : `<defs>${hatchDef(id)}</defs>` + Array.from({length: k}, (_, j) =>
                        logSvg(2 + big / 2 + (j % per) * big, 2 + big / 2 + Math.floor(j / per) * big * 0.88, big / 2 - 1, t, ((j * 37) % 10) / 10, id)).join("");
                return (
                    <li key={b.from}>
                        <Svg w={w} h={h} html={html} />
                        <b>{!every && b.jobs > 1 ? `${fmt(b.jobs)} jobs` : fmt(b.jobs)}</b><span>{bucketWords(b)}</span>
                    </li>
                );
            })}
        </ul>
    );
}

const LEN = 550, END: Record<string, number[]> = {dark: [4, 7, 10, 13, 16, 19], tan: [6, 11, 16, 20], lime: [9, 18]};
const v = (role: string) => `var(--w-${role})`;

/** One row as a log on its side, painted in bands by share of the jobs that state a number; the sawn end shows the last band's wood. */
function Round({r}: {r: YearsRow}) {
    const parts = [...GROUPS].reverse().map((g) => ({g, n: asking(r.y, g.from, g.to)})), shown = parts.filter((p) => p.n);
    let x = 10, body = "", cuts = "";
    if (!r.stated) body = `<rect x="10" y="18" width="${LEN}" height="52" rx="3" style="fill:${v("sealed")}"/><rect x="10" y="18" width="${LEN}" height="52" fill="url(#hx-${r.key})"/>`;
    else shown.forEach(({g, n}) => {
        const w = (LEN * n) / r.stated;
        body += `<rect x="${x.toFixed(2)}" y="18" width="${w.toFixed(2)}" height="52" style="fill:${v(g.tone)}"/>`;
        x += w;
        // Saw cuts between the bands.
        if (x < 559) cuts += `<rect x="${(x - 1.5).toFixed(2)}" y="14" width="3" height="60" style="fill:var(--ground)"/>`;
    });
    const grain = [26, 36, 47, 58, 64].map((gy, i) => `<path d="M10 ${gy}Q140 ${gy + (i % 2 ? 3 : -3)} 280 ${gy}T560 ${gy}" fill="none" style="stroke:${v("bark")}" stroke-width="1" opacity=".28"/>`).join("");
    const last = r.stated ? shown[shown.length - 1].g.tone : "sealed";
    const ink = last === "sealed" ? v("hatch") : v(`ring-${last}`);
    const end = `<ellipse cx="560" cy="44" rx="16" ry="27" style="fill:${v("bark")}"/><ellipse cx="560" cy="44" rx="13" ry="23" style="fill:${v(last)}"/>`
        + (END[last] ?? []).map((ry) => `<ellipse cx="560" cy="44" rx="${((ry * 13) / 23).toFixed(2)}" ry="${ry}" fill="none" style="stroke:${ink}" stroke-width="1.2"/>`).join("")
        + `<ellipse cx="10" cy="44" rx="6" ry="26" style="fill:${v("beam")}" opacity=".5"/>`;
    return (
        <li className={s.round}>
            <p className={s.rh}><span>{r.name}</span> · {r.stated ? `${fmt(r.stated)} of ${fmt(r.total)} state a number` : `none of ${fmt(r.total)} state a number`}</p>
            <svg viewBox={"0 0 600 88"} preserveAspectRatio={"none"} aria-hidden
                 dangerouslySetInnerHTML={{__html: `<defs>${hatchDef(`hx-${r.key}`, 7)}</defs><path d="M10 18H560V70H10Z" style="fill:${v("bark")}"/>${body}${grain}${cuts}${end}`}} />
            <ul className={s.legend}>
                {r.stated ? parts.map(({g, n}) => <li key={g.key}><i className={cn(s.sw, s[g.tone])} />{g.name} <b>{fmt(n)}</b></li>)
                    : <li><i className={cn(s.sw, s.none)} />None stated <b>{fmt(r.unstated)}</b></li>}
            </ul>
        </li>
    );
}

export function Rounds({c}: {c: YearsCounts}) {
    return <ul className={s.rounds}>{yearsRows(c).map((r) => <Round key={r.key} r={r} />)}</ul>;
}
