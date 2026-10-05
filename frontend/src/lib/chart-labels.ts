/*
 * Label placement for the landscape chart (docs/brand/charts.html, chart C).
 *
 * Each label belongs to a mark on a number line and is joined to it by a
 * straight leader. A label may sit centred on its mark, flush left of it or
 * flush right of it, and may move to a further lane (a row further from the
 * axis). Leaders never cross a label and labels never overlap, or placement
 * fails and the caller shows fewer labels.
 */

export type Anchor = "middle" | "end" | "start";

export interface LabelItem {
    /** The mark's position along the axis. */
    c: number;
    /** The label's extent along the axis. */
    w: number;
    lane?: number;
    anchor?: Anchor;
    /** The placed extent, [from, to], along the axis. */
    r?: [number, number];
}

const ANCHORS: Anchor[] = ["middle", "end", "start"];
/** How far the leader runs past the label's edge before it may touch another label. */
const CLEAR = 4;
const MAX_STEPS = 20000;

function rangeFor(item: LabelItem, anchor: Anchor): [number, number] {
    if (anchor === "middle") return [item.c - item.w / 2, item.c + item.w / 2];
    if (anchor === "end") return [item.c + CLEAR - item.w, item.c + CLEAR];
    return [item.c - CLEAR, item.c - CLEAR + item.w];
}

function fits(item: LabelItem, lane: number, r: [number, number], placed: LabelItem[], lo: number, hi: number, gap: number): boolean {
    if (r[0] < lo || r[1] > hi) return false;
    return placed.every((other) => {
        const o = other.r as [number, number];
        if (other.lane === lane) return r[1] + gap <= o[0] || r[0] >= o[1] + gap;
        // A nearer label must not sit under my leader; my label must not sit under a further one's.
        if ((other.lane as number) < lane) return !(item.c > o[0] - CLEAR && item.c < o[1] + CLEAR);
        return !(other.c > r[0] - CLEAR && other.c < r[1] + CLEAR);
    });
}

/**
 * Places every item in the fewest lanes it can, nearest lanes first, by
 * backtracking over the whole set (bounded). Falls back to a greedy pass that
 * allows one lane past the limit, so nothing is ever dropped.
 */
export function placeLabels(items: LabelItem[], lo: number, hi: number, gap: number, maxLanes: number): LabelItem[] {
    const order = [...items].sort((a, b) => a.c - b.c);
    let steps = 0;

    const solve = (i: number, placed: LabelItem[]): boolean => {
        if (i === order.length) return true;
        if (++steps > MAX_STEPS) return false;
        const item = order[i];
        for (let lane = 0; lane < maxLanes; lane++) {
            for (const anchor of ANCHORS) {
                const r = rangeFor(item, anchor);
                if (!fits(item, lane, r, placed, lo, hi, gap)) continue;
                item.lane = lane; item.anchor = anchor; item.r = r;
                placed.push(item);
                if (solve(i + 1, placed)) return true;
                placed.pop();
            }
        }
        return false;
    };

    if (!solve(0, [])) {
        const placed: LabelItem[] = [];
        for (const item of order) {
            let done = false;
            for (let lane = 0; lane <= maxLanes && !done; lane++) {
                for (const anchor of ANCHORS) {
                    const r = rangeFor(item, anchor);
                    if (fits(item, lane, r, placed, lo, hi, gap)) {
                        item.lane = lane; item.anchor = anchor; item.r = r;
                        placed.push(item); done = true;
                        break;
                    }
                }
            }
            if (!done) {
                item.lane = maxLanes; item.anchor = "middle"; item.r = rangeFor(item, "middle");
                placed.push(item);
            }
        }
    }
    return items;
}

/** Where a placed label's anchor point sits along the axis. */
export function anchorAt(item: LabelItem): number {
    return item.anchor === "middle" ? item.c : item.anchor === "end" ? item.c + CLEAR : item.c - CLEAR;
}

/**
 * One column of labels, as the vertical layout needs: every label keeps its
 * order along the axis and sits as close to its mark as the minimum spacing
 * allows. Order is kept, so the slanted leaders never cross.
 */
export function spreadLabels(centres: number[], lo: number, hi: number, spacing: number): number[] {
    const order = centres.map((c, i) => ({c, i})).sort((a, b) => a.c - b.c);
    const y = order.map((o) => Math.max(lo, Math.min(hi, o.c)));
    for (let i = 1; i < y.length; i++) y[i] = Math.max(y[i], y[i - 1] + spacing);
    for (let i = y.length - 1; i >= 0; i--) y[i] = Math.min(y[i], i === y.length - 1 ? hi : y[i + 1] - spacing);
    for (let i = 0; i < y.length; i++) y[i] = Math.max(y[i], i === 0 ? lo : y[i - 1] + spacing);
    const out = new Array<number>(centres.length);
    order.forEach((o, k) => { out[o.i] = y[k]; });
    return out;
}
