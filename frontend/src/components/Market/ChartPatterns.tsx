import React, {useId} from 'react'

/*
 * SVG twins of the CSS chart textures in globals.css: the "not on your CV yet"
 * hatch (`.bar-gap`) and the graph-paper plot frame (`.chart-grid-paper`).
 * Hand-built SVG charts put one <HatchDefs/> in their <svg> and fill marks
 * with the url it hands back; <PlotFrame/> draws the boxed plot area behind
 * the marks. Every colour is a token, so a panel colourway re-scopes them.
 */

/** A document-unique pattern id: several charts share one page (the overview). */
export function useHatch(): { id: string; fill: string } {
    const id = `hatch-${useId().replace(/\W/g, "")}`;
    return {id, fill: `url(#${id})`};
}

export function HatchDefs({id}: { id: string }) {
    return (
        <defs>
            <pattern id={id} patternUnits={"userSpaceOnUse"} width={6} height={6} patternTransform={"rotate(45)"}>
                <rect width={6} height={6} fill={"var(--chart-gap)"} fillOpacity={0.16} />
                <line x1={0} y1={0} x2={0} y2={6} stroke={"var(--chart-gap)"} strokeWidth={1.6} />
            </pattern>
        </defs>
    )
}

/** Cell size of the fine grid inside a plot frame, in SVG units. */
const CELL = 24;

/**
 * The rounded plot frame: a slightly sunk ground, a fine square grid clipped
 * to it, the axis ticks' major lines, and a hairline frame on top.
 */
export function PlotFrame({x, y, width, height, majors = [], vertical = false}: {
    x: number;
    y: number;
    width: number;
    height: number;
    /** Positions of the tick lines, x for a horizontal axis and y for a vertical one. */
    majors?: number[];
    vertical?: boolean;
}) {
    const clip = `clip-${useId().replace(/\W/g, "")}`;
    const lines: React.ReactNode[] = [];
    for (let i = x + CELL; i < x + width; i += CELL) {
        lines.push(<line key={`v${i}`} x1={i} y1={y} x2={i} y2={y + height} stroke={"var(--chart-grid)"} />);
    }
    for (let i = y + CELL; i < y + height; i += CELL) {
        lines.push(<line key={`h${i}`} x1={x} y1={i} x2={x + width} y2={i} stroke={"var(--chart-grid)"} />);
    }
    return (
        <>
            <defs>
                <clipPath id={clip}><rect x={x} y={y} width={width} height={height} rx={14} /></clipPath>
            </defs>
            <g clipPath={`url(#${clip})`}>
                <rect x={x} y={y} width={width} height={height} fill={"var(--chart-well)"} />
                {lines}
                {majors.map((m) => vertical
                    ? <line key={m} x1={x} y1={m} x2={x + width} y2={m} stroke={"var(--panel-chart-grid-major)"} />
                    : <line key={m} x1={m} y1={y} x2={m} y2={y + height} stroke={"var(--panel-chart-grid-major)"} />)}
            </g>
            <rect x={x + 0.5} y={y + 0.5} width={width - 1} height={height - 1} rx={14} fill={"none"} stroke={"var(--chart-frame)"} />
        </>
    )
}

/** A bar with rounded right corners, never thinner than a mark can be seen. */
export function barPath(x: number, y: number, width: number, height: number): string {
    const w = Math.max(width, 6);
    return `M${x},${y}h${w - 4}a4,4 0 0 1 4,4v${height - 8}a4,4 0 0 1 -4,4h${-(w - 4)}z`;
}
