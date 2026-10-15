/*
 * The yard's geometry (the prototype's iso.js): world units, x and y on the
 * ground, z up, seen at 30 degrees. One container is 1 wide, 2.4 long and 1
 * high. A bay is 6 across and 2 deep, so one layer is 12 jobs and a stack is
 * as high as its count. Each visible face of a stack is a flat rectangle
 * skewed onto its plane and filled with a repeating container, so every
 * container is drawn; the part layer on top is laid one container at a time,
 * front row first. SVG strings, decorative: the figure's label reads the data.
 */

export const C = 0.8660254, S = 0.5, ACROSS = 6, DEEP = 2, LEN = 2.4, PER = ACROSS * DEEP, INK = "#22201c";
export const f = (v: number) => +v.toFixed(2);
export const shade = (hex: string, k: number) => "#" + [1, 3, 5].map((i) =>
    Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, "0")).join("");

type Pt = [number, number, number];

export function iso(u: number, id: string) {
    const P = (x: number, y: number, z = 0) => [f((x - y) * C * u), f((x + y) * S * u - z * u)];
    const pt = (x: number, y: number, z = 0) => P(x, y, z).join(" ");
    const poly = (pts: Pt[], attrs = "") => `<path d="M${pts.map((p) => pt(...p)).join("L")}Z" ${attrs}/>`;
    const line = (a: Pt, b: Pt, attrs = "") => `<path d="M${pt(...a)}L${pt(...b)}" ${attrs}/>`;
    const tf = (x: number, y: number, z: number, a: number, b: number, c: number, d: number) => {
        const [X, Y] = P(x, y, z);
        return `matrix(${a} ${b} ${c} ${d} ${X} ${Y})`;
    };
    // Each face maps a flat local rectangle (tx right, ty down) onto its plane.
    const faceL = (x: number, y: number, z: number) => tf(x, y, z, C, S, 0, 1); // the end wall, facing the water
    const faceR = (x: number, y: number, z: number) => tf(x, y, z, C, -S, 0, 1); // the long side
    const faceT = (x: number, y: number, z: number) => tf(x, y, z, C, S, -C, S); // the top
    const faces = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Pt[][] => [
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
        [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0]]];
    const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, hex: string, a = "") =>
        faces(x0, x1, y0, y1, z0, z1).map((q, i) => poly(q, `fill="${shade(hex, [1.12, 1, .8][i])}" ${a}`)).join("");
    const w = f(LEN * u), E = `fill="none" stroke="${INK}"`;

    /* One pattern per colour and face: the end with its doors, the long side with its ribs, the top. */
    const patterns = (cols: Record<string, string>) => Object.entries(cols).map(([k, hex]) => `
      <pattern id="${id}-e-${k}" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><rect width="${u}" height="${u}" fill="${hex}"/><path d="M${f(u / 2)} 1.5V${f(u - 1.5)}M${f(u * .3)} ${f(u * .52)}h${f(u * .12)}M${f(u * .58)} ${f(u * .52)}h${f(u * .12)}" ${E} stroke-opacity=".4"/><rect width="${u}" height="${u}" ${E} stroke-opacity=".42"/></pattern>
      <pattern id="${id}-s-${k}" width="${w}" height="${u}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${u}" fill="${shade(hex, .8)}"/><path d="M${f(w * .2)} 1.5V${f(u - 1.5)}M${f(w * .4)} 1.5V${f(u - 1.5)}M${f(w * .6)} 1.5V${f(u - 1.5)}M${f(w * .8)} 1.5V${f(u - 1.5)}" ${E} stroke-opacity=".16"/><rect width="${w}" height="${u}" ${E} stroke-opacity=".42"/></pattern>
      <pattern id="${id}-t-${k}" width="${u}" height="${w}" patternUnits="userSpaceOnUse"><rect width="${u}" height="${w}" fill="${shade(hex, 1.14)}"/><rect width="${u}" height="${w}" ${E} stroke-opacity=".42"/></pattern>`).join("")
        + `<pattern id="${id}-hx" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.7" height="6" fill="#6f6a62"/></pattern>`;

    /* The three visible faces of a block of containers, x0..x1 by y0..y1 by z0..z1, in colour k. */
    const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: string, hatched?: boolean) =>
        `<g transform="${faceT(x0, y0, z1)}"><rect width="${f((x1 - x0) * u)}" height="${f((y1 - y0) * u)}" fill="url(#${id}-t-${k})"/></g>`
        + `<g transform="${faceL(x0, y1, z1)}"><rect width="${f((x1 - x0) * u)}" height="${f((z1 - z0) * u)}" fill="url(#${id}-e-${k})"/></g>`
        + `<g transform="${faceR(x1, y1, z1)}"><rect width="${f((y1 - y0) * u)}" height="${f((z1 - z0) * u)}" fill="url(#${id}-s-${k})"/></g>`
        + (hatched ? faces(x0, x1, y0, y1, z0, z1).map((q) => poly(q, `fill="url(#${id}-hx)"`)).join("") : "");

    /* A stack of n containers in the bay whose back corner is (bx, by), standing on z0; its count painted on the end. */
    const stack = (bx: number, by: number, z0: number, n: number, k: string, o: {hatched?: boolean; paint?: string} = {}) => {
        const L = Math.floor(n / PER), m = n % PER, D = DEEP * LEN;
        let s = "";
        if (L) {
            s += skin(bx, bx + ACROSS, by, by + D, z0, z0 + L, k, o.hatched);
            if (o.paint && L >= 4) s += `<g transform="${faceL(bx, by + D, z0 + L)}"><text class="paint" x="${f(ACROSS * u / 2)}" y="${f((L - .5) * u)}" font-size="${f(2.3 * u)}" text-anchor="middle" fill="${o.paint}">${n}</text></g>`;
        }
        const front = Math.min(m, ACROSS), back = m - front;
        for (let i = 0; i < back; i++) s += skin(bx + i, bx + i + 1, by, by + LEN, z0 + L, z0 + L + 1, k, o.hatched);
        for (let i = 0; i < front; i++) s += skin(bx + i, bx + i + 1, by + LEN, by + D, z0 + L, z0 + L + 1, k, o.hatched);
        return s;
    };

    /* A ship under a bay: the deck at z = 0.8, the hull down to the water, a bridge at the stern. */
    const hull = (bx: number, by: number) => {
        const x0 = bx - 3.2, x1 = bx + ACROSS + 1.2, xb = bx + ACROSS + 3.6, y0 = by - .6, y1 = by + DEEP * LEN + .6, ym = by + DEEP * LEN / 2, zd = .8;
        const H = "#2a2e38", W = "#e9e7e2";
        return poly([[x0, y0, zd], [x1, y0, zd], [xb, ym, zd], [x1, y1, zd], [x0, y1, zd]], 'fill="#454b58"')
            + poly([[x0, y1, zd], [x1, y1, zd], [x1, y1, 0], [x0, y1, 0]], `fill="${H}"`)
            + poly([[x1, y1, zd], [xb, ym, zd], [xb, ym, 0], [x1, y1, 0]], `fill="${shade(H, 1.3)}"`)
            + poly([[xb, ym, zd], [x1, y0, zd], [x1, y0, 0], [xb, ym, 0]], `fill="${shade(H, .75)}"`)
            + line([x0, y1, .22], [x1, y1, .22], `stroke="${W}" stroke-width="1.4"`) + line([x1, y1, .22], [xb, ym, .22], `stroke="${W}" stroke-width="1.4"`)
            + box(bx - 3, bx - 1.5, by + .6, by + 4.2, zd, zd + 4.4, W, `stroke="${INK}" stroke-width=".6"`)
            + `<g transform="${faceL(bx - 3, by + 4.2, zd + 4.4)}">${[0, 1, 2].map((i) => `<rect x="${f(.25 * u)}" y="${f((.4 + i * 1.3) * u)}" width="${f(u)}" height="${f(.6 * u)}" fill="#2a2e38"/>`).join("")}</g>`;
    };

    return {patterns, stack, hull};
}
