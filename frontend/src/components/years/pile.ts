import {fmt} from "@/lib/market-page";
import {logKinds, logWords, pileGroups, type LogKind, type YearsRow} from "@/lib/years-answer";
import {drawLog, faceRole, fit, palette, rng} from "./logs";

/*
 * A woodpile seen end on: one log end per job, stacked in a rack. Sorting
 * ("Stack by rings") moves the same logs into layers, heaviest at the bottom,
 * so the pile turns into a stacked bar you can still count log by log. Tap,
 * hover or arrow through the logs to read one. Laid out from the row's counts,
 * so any week makes a pile of the right size. Ported from the prototype's
 * pile.js; Woodpile.tsx owns the markup, this draws on it.
 */

export type PileParts = {root: HTMLElement; rack: HTMLElement; stage: HTMLElement; canvas: HTMLCanvasElement; over: SVGSVGElement;
    key: HTMLOListElement; loupe: HTMLCanvasElement; pen: HTMLElement | null};
export type PileOptions = {seed: number; aspect: [number, number]; sorted: boolean; note: "sealed" | "five" | null;
    onRead: (said: string) => void};

const TOP = 46, BEAM = 10;
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
type Slot = {x: number; y: number};
type Log = {t: LogKind; w: number; s: number; a: number; b: number};

export function mountPile(el: PileParts, row: YearsRow, opt: PileOptions) {
    const groups = pileGroups(row), all = logKinds(row.y), r = rng(opt.seed), n = all.length;
    const want = (t: LogKind) => (opt.note === "sealed" ? t < 0 : t >= 5);
    // Each job gets a log; its mixed slot is a shuffle, its sorted slot is by years, five or more at the bottom.
    const mix = all.map((_, i) => ({i, k: r()})).sort((a, b) => a.k - b.k);
    const logs: Log[] = all.map((t) => ({t, w: r(), s: 0.9 + r() * 0.09, a: 0, b: 0}));
    mix.forEach((m, slot) => { logs[m.i].a = slot; });
    all.map((t, i) => ({t, i})).sort((a, b) => b.t - a.t || a.i - b.i).forEach((m, slot) => { logs[m.i].b = slot; });
    const at: Log[][] = [[], []];
    logs.forEach((g) => { at[0][g.a] = g; at[1][g.b] = g; });
    let L = {w: 0, h: 0, d: 0, post: 0, H: 0, slot: [] as Slot[], cols: 1}, P = opt.sorted ? 1 : 0, anim = 0, sel = -1, narrow = false;

    function layout() {
        narrow = el.rack.clientWidth < 600;
        el.root.classList.toggle("narrow", narrow);
        const w = el.stage.clientWidth, aspect = narrow ? opt.aspect[1] : opt.aspect[0];
        if (!w || !n) return;
        let post = 6, cols = Math.max(3, Math.round(Math.sqrt((0.866 * n) / aspect)));
        if ((w - 2 * post) / (cols + 0.5) > 40) cols = Math.ceil((w - 2 * post) / 40 - 0.5);
        let d = (w - 2 * post) / (cols + 0.5);
        post = Math.max(5, Math.round(d * 0.3));
        d = (w - 2 * post) / (cols + 0.5);
        const rows = Math.ceil(n / cols), H = d + (rows - 1) * 0.866 * d, slot: Slot[] = [];
        for (let s = 0; s < n; s++) {
            const ro = Math.floor(s / cols), co = s % cols, inRow = ro === rows - 1 ? n - ro * cols : cols;
            const off = inRow < cols ? ((cols - inRow) * d) / 2 : ro % 2 ? d / 2 : 0;
            slot.push({x: post + d / 2 + co * d + off, y: TOP + H - d / 2 - ro * 0.866 * d});
        }
        L = {w, h: TOP + H + BEAM, d, post, H, slot, cols};
        el.stage.style.height = `${L.h}px`;
        draw(); place(); note();
    }

    function pos(g: Log): Slot {
        const a = L.slot[g.a], b = L.slot[g.b];
        if (P <= 0) return a;
        if (P >= 1) return b;
        const p = ease(Math.min(1, Math.max(0, P * 1.5 - (g.b / n) * 0.5)));
        return {x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p - Math.sin(Math.PI * p) * L.d * 1.2};
    }

    function draw() {
        if (!L.w) return;
        const pal = palette(el.root), ctx = fit(el.canvas, L.w, L.h);
        ctx.fillStyle = pal.post;
        ctx.fillRect(0, TOP - L.d * 0.4, L.post, L.H + L.d * 0.4); ctx.fillRect(L.w - L.post, TOP - L.d * 0.4, L.post, L.H + L.d * 0.4);
        ctx.fillStyle = pal.beam; ctx.fillRect(0, TOP + L.H, L.w, BEAM);
        ctx.fillStyle = pal.shadow;
        L.slot.forEach((s) => { ctx.beginPath(); ctx.arc(s.x, s.y, L.d * 0.53, 0, 6.2832); ctx.fill(); });
        logs.forEach((g) => { const q = pos(g); drawLog(ctx, q.x, q.y, (L.d / 2) * g.s, g.t, pal, g.w); });
        if (sel >= 0 && (P === 0 || P === 1)) {
            const s = L.slot[sel];
            ctx.strokeStyle = getComputedStyle(el.root).color; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(L.d / 2 + 2.5, 6), 0, 6.2832); ctx.stroke();
        }
    }

    function bands() {
        let s = n;
        return groups.map((g) => { const top = L.slot[s - 1], bot = L.slot[s - g.n]; s -= g.n; return {y0: top.y - L.d / 2, y1: bot.y + L.d / 2}; });
    }
    /** Key labels beside their layers, pushed apart so none overlaps. */
    function relax(ys: number[]) {
        const h = 46, lim = L.h - h;
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + h);
        for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i === ys.length - 1 ? lim : ys[i + 1] - h);
        return ys.map((y) => Math.max(0, y));
    }

    // The key: listed at the side (below, on a phone) while mixed; beside its own layer once stacked.
    function place() {
        if (!L.w) return;
        const items = [...el.key.children] as HTMLElement[], pal = palette(el.root);
        items.forEach((li, i) => { const c = li.querySelector("canvas"); if (c) drawLog(fit(c, 22, 22), 11, 11, 10, groups[i].t, pal, 0.4); });
        let lines = "";
        if (narrow) items.forEach((li) => { li.style.top = ""; });
        else {
            const ys = P === 1 ? relax(bands().map((b) => (b.y0 + b.y1) / 2 - 20)) : items.map((_, i) => TOP + i * 50);
            items.forEach((li, i) => { li.style.top = `${ys[i]}px`; });
            if (P === 1) bands().forEach((b, i) => {
                const ly = ys[i] + 20, x0 = L.w + 4, mid = (b.y0 + b.y1) / 2;
                lines += `<path d="M${x0} ${mid}C${x0 + 14} ${mid} ${x0 + 6} ${ly} ${x0 + 24} ${ly}" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.2"/>`
                    + `<path d="M${L.w - L.post / 2} ${b.y0 + 2}V${b.y1 - 2}" stroke="${pal[faceRole(groups[i].t)]}" stroke-width="${Math.max(2, L.post - 2)}" stroke-linecap="round"/>`;
            });
        }
        el.over.innerHTML = lines;
    }

    // The pen note points at a real log of its kind near the top of the mixed pile; no such log, no note.
    function note() {
        const pen = el.pen;
        if (!pen || !opt.note) return;
        const cand = P === 0 ? at[0].map((g, s) => ({g, s})).filter((o) => want(o.g.t) && o.s >= n - L.cols * 3) : [];
        if (!cand.length) { pen.hidden = true; return; }
        const pick = cand.reduce((a, o) => (Math.abs(L.slot[o.s].x - L.w * 0.72) < Math.abs(L.slot[a.s].x - L.w * 0.72) ? o : a));
        const s = L.slot[pick.s], right = s.x > L.w * 0.5, arrow = pen.querySelector("svg")!;
        pen.hidden = false;
        pen.style.left = right ? "" : `${Math.max(0, s.x - 10)}px`;
        pen.style.right = right ? `${Math.max(0, L.w - s.x - 30)}px` : "";
        arrow.setAttribute("style", `left:${right ? "auto" : "6px"};right:${right ? "18px" : "auto"}`);
        const dy = Math.max(10, s.y - L.d / 2 - 30);
        arrow.setAttribute("height", String(dy)); arrow.setAttribute("viewBox", `0 0 20 ${dy}`);
        arrow.innerHTML = `<path d="M4 2Q16 ${dy * 0.4} 10 ${dy - 3}M5 ${dy - 9}L10 ${dy - 2}L15 ${dy - 9}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    }

    function read(s: number) {
        if (!n) return;
        sel = Math.max(0, Math.min(n - 1, s));
        const g = at[P === 1 ? 1 : 0][sel];
        drawLog(fit(el.loupe, 56, 56), 28, 28, 26, g.t, palette(el.root), g.w);
        el.loupe.hidden = false;
        opt.onRead(`Log ${fmt(sel + 1)} of ${fmt(n)}. ${logWords(g.t)}`);
        draw();
    }
    function nearest(e: PointerEvent) {
        const b = el.canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        let best = -1, bd = Infinity;
        L.slot.forEach((s, i) => { const dd = (s.x - x) ** 2 + (s.y - y) ** 2; if (dd < bd) { bd = dd; best = i; } });
        return bd < (L.d * 1.2) ** 2 ? best : -1;
    }
    const down = (e: PointerEvent) => { const s = nearest(e); if (s >= 0) read(s); };
    const hover = (e: PointerEvent) => { if (e.pointerType === "mouse") { const s = nearest(e); if (s >= 0 && s !== sel) read(s); } };
    const keys = (e: KeyboardEvent) => {
        const step = ({ArrowLeft: -1, ArrowRight: 1, ArrowUp: L.cols, ArrowDown: -L.cols} as Record<string, number>)[e.key];
        if (step === undefined) return;
        e.preventDefault(); read(sel < 0 ? n - 1 : sel + step);
    };
    el.stage.addEventListener("pointerdown", down);
    el.stage.addEventListener("pointermove", hover);
    el.stage.addEventListener("keydown", keys);

    /** Sort into layers (true) or mix back (false), with the arc of logs flying unless motion is reduced. */
    function sort(to: boolean) {
        const target = to ? 1 : 0, from = P, t0 = performance.now(), ms = reduce() ? 0 : 1400;
        el.root.classList.toggle("sorted", to);
        if (el.pen) el.pen.hidden = true;
        cancelAnimationFrame(anim);
        el.over.innerHTML = "";
        const tick = (now: number) => {
            const k = ms ? Math.min(1, (now - t0) / ms) : 1;
            P = from + (target - from) * k; draw();
            if (k < 1) anim = requestAnimationFrame(tick);
            else { P = target; draw(); place(); note(); if (sel >= 0) read(sel); }
        };
        anim = requestAnimationFrame(tick);
    }

    el.root.classList.toggle("sorted", opt.sorted);
    const resize = new ResizeObserver(() => layout());
    resize.observe(el.rack);
    // The site's theme switch changes the html class; the system theme changes the media query. Either repaints the wood.
    const repaint = () => { draw(); place(); };
    const theme = new MutationObserver(repaint);
    theme.observe(document.documentElement, {attributes: true, attributeFilter: ["class", "data-theme"]});
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", repaint);
    layout();
    return {
        sort,
        destroy() {
            cancelAnimationFrame(anim); resize.disconnect(); theme.disconnect(); scheme.removeEventListener("change", repaint);
            el.stage.removeEventListener("pointerdown", down); el.stage.removeEventListener("pointermove", hover); el.stage.removeEventListener("keydown", keys);
        },
    };
}
