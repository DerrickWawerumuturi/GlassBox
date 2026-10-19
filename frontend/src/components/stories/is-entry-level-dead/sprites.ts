import {LIME, person} from "./marker";

/*
 * The crowd's sprite sheets (the prototype's sprites.js). Each tiny person is
 * drawn once per stage size into an offscreen canvas (32 variants, plain and
 * lime with a backpack), and a frame then blits them with drawImage: 454
 * people a frame at 60fps stays cheap. The geometry is marker.ts's, so the
 * crowd matches the SVG people. Sheets are keyed by size and marker ink, so a
 * theme change draws new ones.
 */

const K = 32, COLS = 16, PX = 3;          // variants per kind; cells per sheet row; sheet pixels per stage unit
const BW = 1.3, BH = 2.15;                // a person's box, in multiples of s: arms to the sides, hair on top

type Sheet = {cv: HTMLCanvasElement; cw: number; ch: number};

export function sprites(sizes: number[]) {
    const cache = new Map<string, Sheet>();
    const nearest = (s: number) => sizes.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a));

    function build(s: number, marker: string): Sheet {
        const cw = s * BW, ch = s * BH, cv = document.createElement("canvas");
        cv.width = Math.ceil(COLS * cw * PX); cv.height = Math.ceil((2 * K / COLS) * ch * PX);
        const c = cv.getContext("2d")!;
        c.setTransform(PX, 0, 0, PX, 0, 0); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = marker;
        for (let kind = 0; kind < 2; kind++) for (let v = 0; v < K; v++) {
            const idx = kind * K + v, x = (idx % COLS) * cw + cw / 2, y = Math.floor(idx / COLS) * ch + ch - s * .05;
            person(x, y, s, {seed: v + 1, shirt: kind ? LIME : null, lime: !!kind, pack: !!kind}).forEach((p) => {
                const path = new Path2D(p.d);
                if (p.fill) { c.fillStyle = p.fill; c.fill(path); }
                c.lineWidth = p.lw; c.stroke(path);
            });
        }
        return {cv, cw, ch};
    }
    const sheet = (s: number, marker: string) => {
        const key = `${s}|${marker}`;
        if (!cache.has(key)) cache.set(key, build(s, marker));
        return cache.get(key)!;
    };

    /** One person, feet at (x, y), s the size on stage; kind 1 is lime with a backpack. */
    return function draw(c: CanvasRenderingContext2D, marker: string, variant: number, kind: number, x: number, y: number, s: number) {
        const sh = sheet(nearest(s), marker), idx = kind * K + (variant % K), sx = (idx % COLS) * sh.cw * PX, sy = Math.floor(idx / COLS) * sh.ch * PX;
        c.drawImage(sh.cv, sx, sy, sh.cw * PX, sh.ch * PX, x - s * BW / 2, y - s * (BH - .05), s * BW, s * BH);
    };
}
