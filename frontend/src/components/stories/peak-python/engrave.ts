import {Peak, PEAK, Ridge} from "@/lib/stories/peak-python";

/*
 * The range's engraving (the prototype's range.js and plates.js, typed): every
 * skill the machine learning page charts as a peak on one baseline at one
 * scale, so a peak's height is honestly its share of the jobs. Heights read
 * like a bar chart; the snow cap, the hatched shadow flank and the contours on
 * the 10% lines only dress them. Pure functions to SVG strings, laid out for a
 * given width (1 unit = 1px, so text sizes are real); `c` is the story's CSS
 * module, `id` a suffix that keeps two copies' gradients apart.
 */

export type Classes = Readonly<Record<string, string>>;

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[ch]!));
const rnd = (seed: number) => () =>
    ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0) / 4294967296;
export const f = (n: number) => Math.round(n * 10) / 10;
type Pt = [number, number];
const pts = (a: Pt[]) => a.map(([x, y]) => `${f(x)} ${f(y)}`).join("L");

export const RIDGE_NAME = Object.fromEntries(PEAK.ridges.map((r) => [r.key, r.name])) as Record<Ridge, string>;

/** What each ridge says under its name, in the valley. */
export function ridgeNote(key: Ridge): string {
    const jobs = PEAK.ridges.find((r) => r.key === key)!.jobs;
    switch (key) {
        case "lang": return `${PEAK.languages.any} of ${PEAK.readable} name one`;
        case "ai": return `${jobs} of ${PEAK.readable} name a skill here`;
        case "data": return `${jobs} jobs name a skill here`;
        case "more": return "compared with senior jobs";
        default: return `${jobs} jobs`;
    }
}

/** One peak's reading, in words: the plate's lines and the label a screen reader hears. */
export const line1 = (p: Peak) => (p.jobs !== null ? `${p.jobs} of ${PEAK.readable} jobs · ${p.share}%` : `${p.share}% of ${PEAK.readable} jobs`);
export const line2 = (p: Peak) => (p.employers ? `named by jobs at ${p.employers} employers` : "");
export const line3 = (p: Peak) => !p.senior ? "" : p.senior.jobs !== null
    ? `${p.senior.jobs} of ${PEAK.senior} senior machine learning jobs · ${p.senior.share}%`
    : `of ${PEAK.senior} senior machine learning jobs: ${p.senior.share}%`;
// A ridge mid sentence: "languages", but "AI" and "DevOps" keep their capitals.
const ridgeMid = (r: Ridge) => (/[A-Z].*[A-Z]/.test(RIDGE_NAME[r]) ? RIDGE_NAME[r] : RIDGE_NAME[r].toLowerCase());
export const label = (p: Peak) => [`${p.name}, ${ridgeMid(p.ridge)}: ${line1(p)}`, line2(p), line3(p)].filter(Boolean).join("; ");

type Shape = {left: Pt[]; right: Pt[]; x: number; base: number; h: number; bw: number};

/** A peak outline: up the left flank over two shoulders to the exact summit, down the right. */
export function shape(x: number, base: number, h: number, bw: number, seed: number): Shape {
    const r = rnd(seed), j = (k: number) => (r() - .5) * k;
    const left: Pt[] = [[x - bw / 2, base], [x - bw * (.31 + j(.06)), base - h * (.33 + j(.1))], [x - bw * (.17 + j(.05)), base - h * (.6 + j(.1))],
        [x - bw * (.06 + j(.02)), base - h * (.86 + j(.04))], [x, base - h]];
    const right: Pt[] = [[x, base - h], [x + bw * (.07 + j(.03)), base - h * (.82 + j(.06))], [x + bw * (.19 + j(.05)), base - h * (.52 + j(.08))],
        [x + bw * (.34 + j(.05)), base - h * (.24 + j(.08))], [x + bw / 2, base]];
    return {left, right, x, base, h, bw};
}

const xAt = (poly: Pt[], y: number) => {
    for (let k = 0; k < poly.length - 1; k++) {
        const [x0, y0] = poly[k], [x1, y1] = poly[k + 1];
        if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
    }
    return poly[0][0];
};

/** The engraving of one peak. `gridYs`: the 10% lines, drawn as contours where they cross the rock. */
export function drawPeak(c: Classes, id: string, S: Shape, gridYs: number[], o: {far?: boolean; lime?: boolean} = {}) {
    const {left, right, x, base, h, bw} = S, top = base - h, outline = `M${pts(left)}L${pts(right.slice(1))}Z`;
    if (o.far) return `<path d="${outline}" class="${c.far}"/>`;
    const shade = `M${pts(right)}L${f(x + bw * .04)} ${f(base)}L${f(x + bw * .01)} ${f(base - h * .5)}Z`;
    let s = `<path d="${outline}" class="${c.rock}"/><path d="${shade}" class="${c.shade}"/><path d="${shade}" fill="url(#pkHatch${id})"/>`;
    for (const y of gridYs) if (y > top + 6 && y < base - 2) {
        const xl = xAt(left, y), xr = xAt(right, y);
        s += `<path d="M${f(xl)} ${f(y)}Q${f((xl + xr) / 2)} ${f(y + 2.5)} ${f(xr)} ${f(y)}" class="${c.contour}"/>`;
    }
    if (h >= 40) {
        const cy = top + Math.max(10, h * .15), xl = xAt(left, cy), xr = xAt(right, cy), zig: Pt[] = [];
        for (let k = 0; k <= 4; k++) zig.push([xl + (xr - xl) * k / 4, cy + (k % 2 ? 3 : -1.5)]);
        const upL = left.slice(0, -1).filter((p) => p[1] < cy).reverse(), upR = right.slice(1).filter((p) => p[1] < cy).reverse();
        s += `<path d="M${pts([[x, top], ...upL, ...zig, ...upR])}Z" class="${c.snow}"/>`;
    }
    s += `<path d="${outline}" class="${c.edge}"/>`;
    if (o.lime) s += `<path d="M${f(x)} ${f(top)}V${f(top - 20)}" class="${c.pole}"/><path d="M${f(x)} ${f(top - 20)}l15 4.5-15 5z" class="${c.flag}"/>`;
    return s;
}

/** The sky's gradient, its faint lines and the flank hatch, under ids ending in `id`. */
export const skyDefs = (id: string) => `<linearGradient id="pkSky${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>
      <pattern id="pkSkyLines${id}" width="6" height="5" patternUnits="userSpaceOnUse"><path d="M0 2.5H6" style="stroke:var(--contour)" stroke-width=".5"/></pattern>
      <pattern id="pkHatch${id}" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(58)"><path d="M0 0V4.5" style="stroke:var(--hatch)" stroke-width="1"/></pattern>`;

export type Placed = Peak & {i: number; x: number; h: number; y: number; bw: number; ang: number; lime: boolean};
export type Layout = ReturnType<typeof layout>;

/** Where everything sits for a given width. */
export function layout(W: number) {
    const peaks = PEAK.peaks;
    const phone = W < 700, ml = phone ? 34 : 48, mr = phone ? 6 : 24, slot = (W - ml - mr) / peaks.length;
    const scale = phone ? 2.3 : Math.min(3.6, W / 300), nameFont = phone ? 12 : 13;
    const room = (p: Peak) => p.share * scale + p.name.length * nameFont * .5 + (p.key === "python" ? 42 : 22);
    const top = 20, base = top + Math.max(...peaks.map(room)), VH = phone ? 40 : 58;
    const R = phone ? (W - 24) / 2 : Math.min(250, W * .26), cx = W / 2, cy = base + VH + 6 + R;
    const PW = phone ? W - 24 : 460, PH = 130, py = cy + 30, H = py + PH + 14;
    const placed: Placed[] = peaks.map((p, i) => {
        const x = ml + slot * (i + .5), h = p.share * scale, y = base - h;
        return {...p, i, x, h, y, bw: slot * 1.7, ang: Math.atan2(y - cy, x - cx) * 180 / Math.PI, lime: p.key === "python"};
    });
    return {W, H, phone, ml, mr, slot, scale, top, base, VH, R, cx, cy, PW, PH, py, nameFont, peaks: placed};
}

/** The sky, the 10% lines, the far range, the peaks, their names, the valley, its ridge brackets, and each peak's hit area. */
export function panorama(c: Classes, L: Layout, id: string, sel: number) {
    const {W, ml, slot, scale, top, base, VH, phone, peaks} = L, gridYs: number[] = [];
    let s = `<defs>${skyDefs(id)}</defs>
      <rect x="0" y="0" width="${W}" height="${f(base)}" fill="url(#pkSky${id})"/><rect x="0" y="0" width="${W}" height="${f(base * .55)}" fill="url(#pkSkyLines${id})" opacity=".35"/>`;
    for (let p = 10; p <= 100; p += 10) {
        const y = base - p * scale;
        if (y < top) break;
        gridYs.push(y);
        s += `<path d="M${ml - 4} ${f(y)}H${W}" class="${c.grid}"/>`;
        if (p % 20 === 0) s += `<text x="${ml - 7}" y="${f(y + 4)}" text-anchor="end" class="${c.gl}">${p}${p === 100 ? "%" : ""}</text>`;
    }
    s += `<path d="M${ml - 4} ${f(base - 100 * scale)}V${f(base)}" class="${c.grid}"/>`;
    const order = [...peaks].sort((a, b) => b.h - a.h);
    for (const p of order) if (p.senior) s += drawPeak(c, id, shape(p.x + slot * .36, base, p.senior.share * scale, p.bw * .9, 100 + p.i), gridYs, {far: true});
    for (const p of order) s += `<g class="${c.peak}${p.i === sel ? ` ${c.on}` : ""}" data-sel data-i="${p.i}">${drawPeak(c, id, shape(p.x, base, p.h, p.bw, 7 + p.i), gridYs, {lime: p.lime})}</g>`;
    for (const p of peaks) {
        const lx = p.x + 4.5, ly = p.y - (p.lime ? 30 : 9);
        s += `<text class="${c.nm}${p.lime ? ` ${c.lime}` : ""}${p.i === sel ? ` ${c.on}` : ""}" data-sel data-i="${p.i}" x="${f(lx)}" y="${f(ly)}" transform="rotate(-90 ${f(lx)} ${f(ly)})">${esc(p.name)}</text>`;
    }
    // The pen note: the jobs on the machine learning page that don't name machine learning (100 − its share).
    const ml92 = peaks.find((p) => p.key === "machine learning")!, nx = W - (phone ? 10 : 30), ny = phone ? 44 : 50;
    s += `<text class="${c.pen}" x="${nx}" y="${ny}" text-anchor="end" transform="rotate(-3 ${nx} ${ny})">${100 - ml92.share} in 100 don’t name it</text>
      <path d="M${nx - (phone ? 150 : 200)} ${ny + 8}Q${f(ml92.x + 120)} ${f(ny + 30)} ${f(ml92.x + 12)} ${f(ml92.y - 2)}" class="${c.penline}"/><path d="M${f(ml92.x + 20)} ${f(ml92.y - 12)}l-8 10 11 1" class="${c.penline}"/>`;
    s += `<rect x="0" y="${f(base)}" width="${W}" height="${VH}" class="${c.valley}"/><path d="M0 ${f(base)}H${W}" class="${c.baseline}"/>`;
    for (const r of PEAK.ridges) {
        const ix = peaks.filter((p) => p.ridge === r.key).map((p) => p.i), x0 = ml + slot * ix[0] + 3, x1 = ml + slot * (ix[ix.length - 1] + 1) - 3, xm = (x0 + x1) / 2;
        s += `<path d="M${f(x0)} ${f(base + 6)}v5H${f(x1)}v-5" class="${c.bracket}"/><text x="${f(xm)}" y="${f(base + (phone ? 28 : 30))}" text-anchor="middle" class="${c.rl}">${phone && r.key === "more" ? "More" : r.name}</text>`;
        if (!phone) s += `<text x="${f(xm)}" y="${f(base + 47)}" text-anchor="middle" class="${c.rn}">${ridgeNote(r.key)}</text>`;
    }
    // Hit areas last, so they sit over the rock: each peak is a button that swings the arm to it.
    for (const p of peaks) s += `<g class="${c.pk}" role="button" tabindex="0" data-pk data-i="${p.i}" aria-label="${esc(label(p))}"><rect x="${f(p.x - slot / 2)}" y="${f(p.y - 12)}" width="${f(slot)}" height="${f(p.h + 12)}"/></g>`;
    return s;
}

const polarOf = (L: Layout) => (a: number, r: number): Pt => [L.cx + Math.cos(a * Math.PI / 180) * r, L.cy + Math.sin(a * Math.PI / 180) * r];
export const polar = (L: Layout, a: number, r: number) => polarOf(L)(a, r);
const arc = (L: Layout, r: number) => `M${f(L.cx - r)} ${f(L.cy)}A${f(r)} ${f(r)} 0 0 1 ${f(L.cx + r)} ${f(L.cy)}`;

/** "12 OCT 2026" and "12 OCTOBER 2026", from the week the story counts. */
const weekUpper = (month: "short" | "long") =>
    new Date(PEAK.week).toLocaleDateString("en-GB", {day: "numeric", month, year: "numeric", timeZone: "UTC"}).toUpperCase();

/** The bronze table under the range: the disc, its rings and ticks, the rim, one tick per peak, the gloves, the plate's frame and the pen note. */
export function tableArt(c: Classes, L: Layout, id: string, sel: number) {
    const {R, cx, cy, PW, PH, py, phone, peaks} = L, at = polarOf(L);
    let s = `<defs><radialGradient id="pkBz${id}" cx=".5" cy="1" r=".95"><stop offset="0" stop-color="#b08a55"/><stop offset=".55" stop-color="#8c6a3f"/><stop offset="1" stop-color="#66492b"/></radialGradient>
      <path id="pkArc${id}" d="${arc(L, R - 60)}"/></defs>
      <ellipse cx="${f(cx)}" cy="${f(cy + 10)}" rx="${f(R + 6)}" ry="${phone ? 9 : 14}" fill="#000" opacity=".16"/>
      <path d="${arc(L, R)}Z" transform="translate(0 9)" fill="#4f3920"/><path d="${arc(L, R)}Z" fill="url(#pkBz${id})"/>
      <path d="${arc(L, R - 11)}" class="${c.ring} ${c.outer}"/><path d="${arc(L, R - 26)}" class="${c.ring} ${c.thin}"/><path d="${arc(L, R - 48)}" class="${c.ring} ${c.thin}"/>`;
    for (let a = -180; a <= 0; a += 3) {
        const long = a % 15 === 0, [x0, y0] = at(a, R - 11), [x1, y1] = at(a, R - (long ? 24 : 18));
        s += `<path d="M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}" class="${c.tick}${long ? ` ${c.long}` : ""}"/>`;
    }
    const rim = phone ? `${PEAK.readable} JOBS · ${PEAK.employers} EMPLOYERS · WEEK OF ${weekUpper("short")}`
        : `${PEAK.readable} MACHINE LEARNING JOBS · ${PEAK.employers} EMPLOYERS · WEEK OF ${weekUpper("long")}`;
    s += `<text class="${c.rim}"><textPath href="#pkArc${id}" startOffset="50%" text-anchor="middle">${rim}</textPath></text>`;
    for (const p of peaks) {
        const [x0, y0] = at(p.ang, R - 26), [x1, y1] = at(p.ang, R - 48);
        s += `<path d="M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}" class="${c.ptick}${p.i === sel ? ` ${c.on}` : ""}" data-sel data-ptick data-i="${p.i}"/>`;
    }
    // A pair of gloves left on the rim stands in for the viewer.
    const gx = cx - R + (phone ? 26 : 40), gy = cy - 8;
    const glove = (x: number, y: number, rot: number) => `<g transform="rotate(${rot} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y)}h24a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H${f(x + 2)}a6 6 0 0 1-6-6V${f(y + 8)}a8 8 0 0 1 4-8z" class="${c.glove}"/><path d="M${f(x + 4)} ${f(y + 2)}l-9-7a4 4 0 0 1 6-5l7 8" class="${c.glove}"/><path d="M${f(x + 6)} ${f(y + 20)}h20M${f(x + 8)} ${f(y + 24)}h16" class="${c.stitch}"/></g>`;
    s += glove(gx, gy, -14) + glove(gx + 30, gy + 2, 6);
    s += `<text class="${c.here}" x="${f(cx)}" y="${f(cy + 19)}" text-anchor="middle">▲ YOU ARE HERE</text>`;
    s += `<rect x="${f(cx - PW / 2)}" y="${f(py)}" width="${f(PW)}" height="${PH}" rx="3" class="${c.plate}"/><rect x="${f(cx - PW / 2 + 6)}" y="${f(py + 6)}" width="${f(PW - 12)}" height="${PH - 12}" rx="2" class="${c.platein}"/>`;
    const nx = cx + R * .27, ny = cy - R * .24;
    s += `<text class="${c.pen}" x="${f(nx)}" y="${f(ny)}" text-anchor="middle" transform="rotate(5 ${f(nx)} ${f(ny)})">drag the arm</text>`;
    return s;
}
