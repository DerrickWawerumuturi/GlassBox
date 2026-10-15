import React from "react";

import {fmt} from "@/lib/market-page";
import {MARKET_PAGES} from "@/lib/market-pages";
import {cn} from "@/lib/utils";
import {PEAK} from "@/lib/stories/peak-python";
import {Classes, drawPeak, f, shape, skyDefs} from "./engrave";
import s from "./peak.module.css";

/*
 * A smaller engraving in the same hand as the range (the prototype's
 * plates.js): Python's peak on each of the five pages we count, to one scale,
 * the way old plates compared the heights of the principal mountains. Server
 * rendered at two widths, the desk's and the phone's; the page shows the one
 * that fits, scaled to its column.
 */

const top = Math.max(...PEAK.python.map((p) => p.share));

function five(c: Classes, W: number, id: string) {
    const phone = W < 520, ml = phone ? 30 : 44, slot = (W - ml - 8) / PEAK.python.length;
    const scale = phone ? 2.4 : 3, sky = phone ? 70 : 60, base = sky + top * scale + 54, VH = phone ? 46 : 48, H = base + VH, gridYs: number[] = [];
    let g = `<defs>${skyDefs(id)}</defs><rect x="0" y="0" width="${W}" height="${f(base)}" fill="url(#pkSky${id})"/>
      <rect x="0" y="0" width="${W}" height="${f(base * .5)}" fill="url(#pkSkyLines${id})" opacity=".35"/>`;
    for (let p = 10; p <= Math.ceil(top / 10) * 10; p += 10) {
        const y = base - p * scale;
        gridYs.push(y);
        g += `<path d="M${ml - 4} ${f(y)}H${W}" class="${c.grid}"/>`;
        if (p % 20 === 0) g += `<text x="${ml - 7}" y="${f(y + 4)}" text-anchor="end" class="${c.gl}">${p}${p + 20 > top ? "%" : ""}</text>`;
    }
    g += `<text x="${ml - 4}" y="${phone ? 26 : 28}" class="${c.title}">${phone ? "PYTHON · FIVE PAGES · ONE SCALE" : "PYTHON ON THE FIVE PAGES WE COUNT · ONE SCALE"}</text>`;
    PEAK.python.forEach((p, i) => {
        const lime = p.page === "machine-learning", x = ml + slot * (i + .5), h = p.share * scale, y = base - h;
        g += drawPeak(c, id, shape(x, base, h, slot * .92, 31 + i), gridYs, {lime});
        const ty = y - (lime ? 28 : 8);
        g += `<text x="${f(x)}" y="${f(ty - (phone ? 30 : 16))}" text-anchor="middle" class="${c.share}">${p.share}%</text>`;
        g += phone
            ? `<text x="${f(x)}" y="${f(ty - 15)}" text-anchor="middle" class="${c.cnt}">${fmt(p.jobs)} of</text><text x="${f(x)}" y="${f(ty - 2)}" text-anchor="middle" class="${c.cnt}">${fmt(p.of)}</text>`
            : `<text x="${f(x)}" y="${f(ty - 2)}" text-anchor="middle" class="${c.cnt}">${fmt(p.jobs)} of ${fmt(p.of)}</text>`;
    });
    g += `<rect x="0" y="${f(base)}" width="${W}" height="${VH}" class="${c.valley}"/><path d="M0 ${f(base)}H${W}" class="${c.baseline}"/>`;
    PEAK.python.forEach((p, i) => {
        const x = ml + slot * (i + .5);
        p.lines.forEach((line, k) => { g += `<text x="${f(x)}" y="${f(base + 19 + k * 15)}" text-anchor="middle" class="${c.pg}">${line}</text>`; });
    });
    return {g, H, phone};
}

/** The five Python peaks read aloud, in the plate's order. */
export const fiveLabel = () => "Python’s share of the jobs on each page we count: "
    + PEAK.python.map((p) => `${MARKET_PAGES[p.page].subject} ${fmt(p.jobs)} of ${fmt(p.of)}, ${p.share}%`).join("; ") + ".";

export default function FivePages() {
    const desk = five(s, 556, "fd"), phone = five(s, 346, "fm");
    return (
        <div role={"img"} aria-label={fiveLabel()}>
            {[desk, phone].map((v, i) => (
                <svg key={i} className={cn(s.range, i ? s.fivePhone : s.fiveDesk, v.phone && s.phone)} viewBox={`0 0 ${i ? 346 : 556} ${f(v.H)}`}
                     aria-hidden dangerouslySetInnerHTML={{__html: v.g}} />
            ))}
        </div>
    );
}
