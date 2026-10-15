/*
 * The foil: a canvas over a card's two numbers, painted as pastel holographic
 * foil (a gradient, fine etch lines, a sheen, nine sparkles, the box O) and
 * rubbed away under the pointer with a round brush whose edge flakes. A
 * coarse grid counts what is cleared; past 40% the card is revealed and the
 * rest fades. Nothing is stored.
 */

/** What the foil reads from a pointer event. */
type Point = {clientX: number; clientY: number; pointerId: number};

const BRUSH = 20, COLS = 16, ROWS = 8, CLEARED = .4;

const seeded = (s: number) => () =>
    ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
const ratio = () => Math.min(window.devicePixelRatio || 1, 3);

type Paint = {g: CanvasRenderingContext2D; w: number; h: number};

function paint(cv: HTMLCanvasElement, seed: number): Paint | null {
    const box = cv.parentElement!.getBoundingClientRect(), dpr = ratio(), w = box.width, h = box.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lg = g.createLinearGradient(0, 0, w, h);
    lg.addColorStop(0, "#9fd3ff"); lg.addColorStop(.38, "#c9b8ff"); lg.addColorStop(.7, "#ffd6e5"); lg.addColorStop(1, "#9fd3ff");
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 1;
    for (let x = -h; x < w; x += 5) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
    const rg = g.createRadialGradient(w * .22, h * .15, 2, w * .22, h * .15, w * .75);
    rg.addColorStop(0, "rgba(255,255,255,.6)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    const q = seeded(seed);
    g.fillStyle = "rgba(255,255,255,.95)";
    for (let k = 0; k < 9; k++) {
        const x = 8 + q() * (w - 16), y = 8 + q() * (h - 16), s = 2 + q() * 3;
        g.beginPath(); g.moveTo(x, y - s * 2); g.quadraticCurveTo(x, y, x + s * 2, y); g.quadraticCurveTo(x, y, x, y + s * 2);
        g.quadraticCurveTo(x, y, x - s * 2, y); g.quadraticCurveTo(x, y, x, y - s * 2); g.fill();
    }
    g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = 3; g.strokeRect(w / 2 - 11, h / 2 - 11, 22, 22);
    g.fillRect(w / 2 - 4, h / 2 - 4, 8, 8);
    // From here on every stroke erases.
    g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.strokeStyle = "#000";
    g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = BRUSH * 2;
    return {g, w, h};
}

/** One card's foil. `onCleared` runs once, when enough of it is rubbed away. */
export class Foil {
    private p: Paint | null = null;
    private cleared = new Set<number>();
    private last: [number, number] | null = null;
    private drawing = false;

    constructor(private cv: HTMLCanvasElement, private seed: number, private onCleared: () => void) {
        this.repaint();
    }

    repaint() {
        this.p = paint(this.cv, this.seed);
        this.cleared.clear();
    }

    /** Repaints when the card's width changed (a phone turned): the old pixels no longer fit. */
    resized() {
        if (Math.abs(this.cv.parentElement!.clientWidth * ratio() - this.cv.width) > 2) this.repaint();
    }

    start(e: Point) {
        this.cv.setPointerCapture(e.pointerId);
        this.drawing = true; this.last = null;
        this.brush(e);
    }

    move(e: Point) {
        if (this.drawing) this.brush(e);
    }

    stop() {
        this.drawing = false; this.last = null;
    }

    private brush(e: Point) {
        if (!this.p) return;
        const r = this.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = this.p.g;
        if (this.last) { g.beginPath(); g.moveTo(this.last[0], this.last[1]); g.lineTo(x, y); g.stroke(); }
        g.beginPath(); g.arc(x, y, BRUSH, 0, 7); g.fill();
        // Two flakes off the brush's edge, so the scratch looks torn rather than stamped.
        for (let k = 0; k < 2; k++) {
            const a = Math.random() * 6.3, d = BRUSH + 1 + Math.random() * 6;
            g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.5 + Math.random() * 4, 0, 7); g.fill();
        }
        this.last = [x, y];
        const cw = this.p.w / COLS, ch = this.p.h / ROWS;
        for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
            const cx = (i + .5) * cw, cy = (j + .5) * ch;
            if ((cx - x) ** 2 + (cy - y) ** 2 < (BRUSH + 3) ** 2) this.cleared.add(i * ROWS + j);
        }
        if (this.cleared.size / (COLS * ROWS) >= CLEARED) { this.stop(); this.onCleared(); }
    }
}
