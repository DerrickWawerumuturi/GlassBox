import {BACK_SRC, NAVY} from "./icons";

/*
 * The scratch panel: a canvas over a card's two numbers, printed with the
 * deck's own back (the middle of it, cropped to the panel), split down the
 * middle by a perforated line with a label on each half ("entry level",
 * "senior"), and rubbed away under the pointer with a round brush whose edge
 * flakes. Each half opens on its own: a coarse grid counts what is cleared,
 * and past 40% of a half the rest of it lifts. Once both halves are open the
 * card is revealed. Nothing is stored.
 */

/** What the panel reads from a pointer event. */
type Point = {clientX: number; clientY: number; pointerId: number};

const BRUSH = 18, COLS = 16, ROWS = 8, CLEARED = .4;
const ratio = () => Math.min(window.devicePixelRatio || 1, 3);

/** The back, decoded once for every panel on the page. Until it decodes (or if it never does) a panel is plain navy. */
let back: HTMLImageElement | null = null, decoded: Promise<unknown> | null = null;
function loadBack() {
    if (!decoded) {
        back = new Image();
        back.src = BACK_SRC;
        decoded = back.decode().catch(() => null);
    }
    return decoded;
}

type Paint = {g: CanvasRenderingContext2D; w: number; h: number};

function paint(cv: HTMLCanvasElement): Paint | null {
    // Layout size, not the bounding box: the card may still be turned or tilted mid deal.
    const box = cv.parentElement!, dpr = ratio(), w = box.clientWidth, h = box.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = NAVY; g.fillRect(0, 0, w, h);
    if (back?.complete && back.naturalWidth) {
        const iw = back.naturalWidth, ih = back.naturalHeight, sx = iw * .06, sw = iw * .88, sh = Math.min(ih * .86, sw * h / w);
        g.drawImage(back, sx, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    // next/font names the face itself; the page carries that name in --font-jetbrains-mono.
    const mono = getComputedStyle(cv).getPropertyValue("--font-jetbrains-mono").trim() || "ui-monospace";
    // The two sides, before anything is scratched: a perforation down the middle, a label on each half.
    g.fillStyle = NAVY; g.fillRect(w / 2 - 5, 0, 10, h);
    g.save(); g.strokeStyle = "#fffdf8"; g.lineWidth = 2; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke(); g.restore();
    g.font = `600 10.5px ${mono}, monospace`; g.textAlign = "center"; g.textBaseline = "middle";
    for (const [label, cx] of [["entry level", w / 4], ["senior", w * 3 / 4]] as const) {
        const tw = Math.min(g.measureText(label).width + 18, w / 2 - 10);
        g.fillStyle = "#fffdf8"; g.beginPath(); g.roundRect(cx - tw / 2, h / 2 - 12, tw, 24, 12); g.fill();
        g.strokeStyle = NAVY; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = NAVY; g.fillText(label, cx, h / 2 + .5);
    }
    // From here on every stroke erases.
    g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.strokeStyle = "#000";
    g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = BRUSH * 2;
    return {g, w, h};
}

/** One card's scratch panel. `onCleared` runs once, when enough of it is rubbed away. */
export class ScratchPanel {
    private p: Paint | null = null;
    private cleared = new Set<number>();
    /** The halves already lifted: 0 the entry level side, 1 the senior side. */
    private open = new Set<number>();
    private last: [number, number] | null = null;
    private drawing = false;

    constructor(private cv: HTMLCanvasElement, private onCleared: () => void) {
        this.repaint();
        // Print the back once it decodes, unless the reader has already started rubbing.
        loadBack().then(() => { if (this.cleared.size === 0 && this.cv.isConnected) this.repaint(); });
    }

    repaint() {
        this.p = paint(this.cv);
        this.cleared.clear(); this.open.clear();
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
        const r = this.cv.getBoundingClientRect(), g = this.p.g;
        const x = (e.clientX - r.left) * this.p.w / (r.width || 1), y = (e.clientY - r.top) * this.p.h / (r.height || 1);
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
        const per = COLS / 2 * ROWS;
        for (const half of [0, 1]) {
            if (this.open.has(half)) continue;
            const done = [...this.cleared].filter((cell) => (Math.floor(cell / ROWS) < COLS / 2 ? 0 : 1) === half).length;
            if (done / per >= CLEARED) { this.open.add(half); g.fillRect(half * this.p.w / 2, 0, this.p.w / 2, this.p.h); }
        }
        if (this.open.size === 2) { this.stop(); this.onCleared(); }
    }
}
