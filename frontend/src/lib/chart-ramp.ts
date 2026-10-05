/**
 * Axis helpers for the Recharts charts on the anonymous /analysis pages.
 * (The warm yellow-to-red data ramp was retired on 2026-10-05: orange acts,
 * it never marks data. Bars use --chart-ink, --chart-have or the gap hatch.)
 */

/*
 * Percentage axis scaled to the data: the max value rounded up to the next
 * multiple of 10 with a little headroom, so marks use the full width and
 * differences stay visible. Always starts at 0 — truncating the low end
 * would exaggerate differences.
 */
export function axisDomainMax(maxValue: number): number {
    if (maxValue <= 0) return 10;
    return Math.min(100, Math.max(10, Math.ceil((maxValue + 2) / 10) * 10));
}

export function axisTicks(max: number): number[] {
    const step = max <= 30 ? 5 : 10;
    const ticks: number[] = [];
    for (let value = 0; value <= max; value += step) ticks.push(value);
    return ticks;
}

/*
 * Fine square "graph paper" grid shared by the boxed charts: evenly spaced
 * lines targeting ~20px cells, interior lines only (the frame rectangle draws
 * the edges). Plugged into CartesianGrid's coordinate generators.
 */
export const FINE_GRID_PX = 20;

export interface GridGeneratorArgs {
    offset?: {left?: number; top?: number; width?: number; height?: number};
}

export function interiorLines(start: number, span: number): number[] {
    const cells = Math.max(1, Math.round(span / FINE_GRID_PX));
    const step = span / cells;
    return Array.from({length: cells - 1}, (_, i) => start + step * (i + 1));
}
