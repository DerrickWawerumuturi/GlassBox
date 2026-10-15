import {PEAK} from "@/lib/stories/peak-python";

/*
 * Peak Python's cover on the market hub (the prototype's cover.js): the
 * machine learning page's language peaks to one scale, and the bronze table
 * with its arm on Python, with the week's numbers. Ids start with "ml": every
 * cover shares the hub's page.
 */

const INK = "#22201c", CREAM = "#f1e6cf", ORANGE = "#f5532a", f = (n: number) => Math.round(n * 10) / 10;
const XS = [92, 176, 258, 336];

export function peakPythonCover(): string {
    const base = 236, sc = 2.4, cx = 200, cy = 348, R = 86;
    const langs = PEAK.peaks.filter((p) => p.ridge === "lang");
    const xAt = (i: number) => (langs.length === XS.length ? XS[i] : 92 + i * (244 / Math.max(1, langs.length - 1)));
    const peak = (name: string, x: number, s: number, lime: boolean, i: number) => {
        const h = s * sc, top = base - h, bw = 118, j = (i * 7) % 5 - 2;
        const L = [[x - bw / 2, base], [x - bw * .3, base - h * .36], [x - bw * .15, base - h * .64], [x - bw * .05, base - h * .88], [x, top]];
        const Rr = [[x, top], [x + bw * .08, base - h * .8], [x + bw * (.2 + j * .01), base - h * .5], [x + bw * .35, base - h * .22], [x + bw / 2, base]];
        const pts = (a: number[][]) => a.map(([px, py]) => `${f(px)} ${f(py)}`).join("L");
        const outline = `M${pts(L)}L${pts(Rr.slice(1))}Z`, shade = `M${pts(Rr)}L${f(x + 4)} ${base}L${f(x + 1)} ${f(base - h * .5)}Z`;
        let o = `<path d="${outline}" fill="#9aa6b1"/><path d="${shade}" fill="#5c6974" opacity=".8"/><path d="${shade}" fill="url(#mlHatch)"/>`;
        for (let p = 10; p <= 100; p += 10) {
            const y = base - p * sc;
            if (y <= top + 6) break;
            const t = (base - y) / h, xl = x - bw / 2 * (1 - t) * .95, xr = x + bw / 2 * (1 - t) * .95;
            o += `<path d="M${f(xl)} ${f(y)}Q${f(x)} ${f(y + 2.5)} ${f(xr)} ${f(y)}" fill="none" stroke="#8fa3b5" stroke-width=".8"/>`;
        }
        if (h >= 40) {
            const cyy = top + h * .15, w = bw * .5 * .15;
            o += `<path d="M${f(x)} ${f(top)}L${f(x - w)} ${f(cyy)}l${f(w * .5)} 3 ${f(w * .5)}-2 ${f(w * .5)} 3 ${f(w * .5)}-2Z" fill="#fff" stroke="#3b4651" stroke-width=".6"/>`;
        }
        o += `<path d="${outline}" fill="none" stroke="#3b4651" stroke-width="1"/>`;
        if (lime) o += `<path d="M${f(x)} ${f(top)}V${f(top - 22)}" stroke="#3b4651" stroke-width="1.6"/><path d="M${f(x)} ${f(top - 22)}l17 5-17 6z" fill="#d7ee4c" stroke="#3b4651" stroke-width=".9"/>`;
        const lx = lime ? x + 24 : x + 9, ly = lime ? top - 12 : top - 8;
        return o + `<text x="${f(lx)}" y="${f(ly)}" font-size="16" font-style="italic" font-weight="${lime ? 700 : 400}" fill="${INK}" style="font-family:var(--read)">${name}</text>`;
    };
    const polar = (a: number, r: number) => [cx + Math.cos(a * Math.PI / 180) * r, cy + Math.sin(a * Math.PI / 180) * r];
    const arc = (r: number) => `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    let ticks = "";
    for (let a = -180; a <= 0; a += 4) {
        const long = a % 20 === 0, [x0, y0] = polar(a, R - 8), [x1, y1] = polar(a, R - (long ? 18 : 13));
        ticks += `<path d="M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}" stroke="${CREAM}" stroke-width="${long ? 1.2 : .8}" opacity=".75"/>`;
    }
    const py = langs.find((p) => p.key === "python")!, pi = langs.indexOf(py);
    const sx = xAt(pi), sy = base - py.share * sc, ang = Math.atan2(sy - cy, sx - cx) * 180 / Math.PI, [tx, ty] = polar(ang, R - 22);
    let grid = "";
    for (let p = 20; p <= 60; p += 20) {
        const y = base - p * sc;
        grid += `<path d="M30 ${f(y)}H400" stroke="#8fa3b5" stroke-width=".8" stroke-dasharray="2 4"/><text x="26" y="${f(y + 4)}" text-anchor="end" font-size="12" fill="#63635e" style="font-family:var(--mono)">${p}${p === 60 ? "%" : ""}</text>`;
    }
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <defs><linearGradient id="mlSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfe0f0"/><stop offset="1" stop-color="#f4f6f8"/></linearGradient>
        <pattern id="mlHatch" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(58)"><path d="M0 0V4.5" stroke="#3f4a54" stroke-width="1"/></pattern>
        <radialGradient id="mlBz" cx=".5" cy="1" r=".95"><stop offset="0" stop-color="#b08a55"/><stop offset=".55" stop-color="#8c6a3f"/><stop offset="1" stop-color="#66492b"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#mlSky)"/>${grid}
      <text x="376" y="30" text-anchor="end" font-size="12" letter-spacing="1" fill="#63635e" style="font-family:var(--mono)">${langs.length} LANGUAGE PEAKS · OF ${PEAK.readable} JOBS</text>
      ${langs.map((p, i) => peak(p.name, xAt(i), p.share, p === py, i)).join("")}
      <rect x="0" y="${base}" width="400" height="164" fill="#d9c9a3"/><path d="M0 ${base}H400" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="${cx}" cy="${cy + 8}" rx="${R + 6}" ry="9" fill="#000" opacity=".16"/><path d="${arc(R)}Z" transform="translate(0 7)" fill="#4f3920"/><path d="${arc(R)}Z" fill="url(#mlBz)"/>
      <path d="${arc(R - 8)}" fill="none" stroke="${CREAM}" stroke-width="1.2" opacity=".75"/><path d="${arc(R - 20)}" fill="none" stroke="${CREAM}" stroke-width=".7" opacity=".55"/>${ticks}
      <path d="M${f(tx)} ${f(ty)}L${f(sx)} ${f(sy)}" stroke="${ORANGE}" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="${f(sx)}" cy="${f(sy)}" r="5" fill="none" stroke="${ORANGE}" stroke-width="2"/>
      <g transform="rotate(${f(ang)} ${cx} ${cy})"><circle cx="${cx - 20}" cy="${cy}" r="7" fill="#3b2a16" stroke="${CREAM}" stroke-width=".8"/><path d="M${cx - 14} ${cy - 4.5}L${cx + R - 32} ${cy - 1.5}L${cx + R - 32} ${cy + 1.5}L${cx - 14} ${cy + 4.5}Z" fill="#3b2a16" stroke="${CREAM}" stroke-width=".6"/>
        <circle cx="${cx + R - 22}" cy="${cy}" r="7" fill="none" stroke="${ORANGE}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="8" fill="#3b2a16" stroke="${CREAM}" stroke-width="1.2"/></g>
      <rect x="68" y="${cy + 12}" width="264" height="34" rx="3" fill="#6b4f2c" stroke="#3b2a16"/><rect x="73" y="${cy + 17}" width="254" height="24" rx="2" fill="none" stroke="${CREAM}" stroke-width=".8" opacity=".7"/>
      <text x="200" y="${cy + 34}" text-anchor="middle" font-size="14" font-weight="600" letter-spacing="1" fill="${CREAM}" style="font-family:var(--mono)">PYTHON · ${py.jobs} OF ${PEAK.readable} · ${py.share}%</text>
    </svg>`;
}
