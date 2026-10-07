'use client'

import React from "react";

import {barPath, PlotFrame} from "@/components/Market/ChartPatterns";
import {ChartPanel, monoWidth, TableTwin, TICK_FS, TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";
import {ENTRY_COPY as C, contrastLead, EntryPage, fmt, pct} from "@/lib/market-page";

/*
 * Entry level vs senior, one skill a row: the share of entry level software
 * jobs naming it over the share of senior ones (chart grammar,
 * docs/decisions/design-system.md). Market data only, so both bars are
 * neutral ink: solid for entry level, faint for senior, matching the legend.
 * Lime marks one thing: the skill leaning most to entry level jobs.
 */

const FS = 12;

export default function EntryContrast({page}: {page: EntryPage}) {
    const [host, W] = useWidth<HTMLDivElement>();
    const {tip, bind} = useTip();
    const rows = page.contrast.map((c) => ({
        ...c, name: page.names[c.key] ?? c.key,
        entry: pct(c.any, page.readable), senior: pct(c.senior_any, page.senior.readable),
    }));
    if (!rows.length) return null;
    const split = rows.findIndex((r) => r.entry < r.senior);

    const phone = W < 520;
    const labelW = monoWidth("x".repeat(Math.min(phone ? 13 : 20, Math.max(...rows.map((r) => r.name.length)))), FS) + 24;
    const barH = phone ? 10 : 12, gap = 3, rowH = barH * 2 + gap + (phone ? 14 : 16);
    const padT = 10, axisH = 28;
    const plotX = labelW, plotW = Math.max(80, W - labelW), plotH = rows.length * rowH + padT * 2;
    const max = Math.max(...rows.flatMap((r) => [r.entry, r.senior]), 10);
    const domain = Math.ceil((max * 1.25) / 10) * 10;
    const x = (v: number) => plotX + (v / domain) * plotW;
    const ticks = Array.from({length: domain / 10 + 1}, (_, i) => i * 10).filter((t) => domain <= 60 || t % 20 === 0);
    const fit = (s: string) => (s.length > (phone ? 13 : 20) ? `${s.slice(0, phone ? 12 : 19)}…` : s);

    const notes = C.contrastNotes(page.readable, page.senior.readable);
    return (
        <ChartPanel title={C.contrastTitle} lead={contrastLead(page)} jobs={page.readable}
                    legend={[["solid", C.contrastLegend.entry], ["faint", C.contrastLegend.senior]]} notes={notes}
                    twin={<TableTwin>
                        <table className={"mt-2.5 w-full max-w-[560px] border-collapse font-mono text-[12px] tabular-nums"}>
                            <thead>
                                <tr className={"text-left uppercase tracking-[0.06em] text-panel-chart-ink-faint"}>
                                    <th className={"border-b border-border px-2.5 py-1.5 font-medium"}>Skill</th>
                                    <th className={"border-b border-border px-2.5 py-1.5 text-right font-medium"}>Entry level</th>
                                    <th className={"border-b border-border px-2.5 py-1.5 text-right font-medium"}>Senior</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.key}>
                                        <td className={"border-b border-border px-2.5 py-1.5"}>{r.name}</td>
                                        <td className={"border-b border-border px-2.5 py-1.5 text-right"}>{fmt(r.any)}/{fmt(page.readable)} · {r.entry}%</td>
                                        <td className={"border-b border-border px-2.5 py-1.5 text-right"}>{fmt(r.senior_any)}/{fmt(page.senior.readable)} · {r.senior}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableTwin>}>
            <div ref={host} className={"mx-auto w-full max-w-[760px]"}>
                {W > 0 && (
                    <svg viewBox={`0 0 ${W} ${plotH + axisH}`} width={W} height={plotH + axisH} className={"block overflow-visible font-mono"}
                         role={"img"} aria-label={"Share of entry level and senior software jobs naming each skill"}>
                        <PlotFrame x={plotX} y={0} width={plotW} height={plotH} majors={ticks.slice(1).map(x)} />
                        {split > 0 && (
                            <line x1={plotX} x2={plotX + plotW} y1={padT + split * rowH} y2={padT + split * rowH}
                                  stroke={"var(--panel-chart-ink-faint)"} strokeDasharray={"3 4"} />
                        )}
                        {rows.map((r, i) => {
                            const top = padT + i * rowH + (rowH - barH * 2 - gap) / 2;
                            const mid = top + barH + gap / 2;
                            const highlight = i === 0;
                            const label = fit(r.name);
                            return (
                                <g key={r.key} className={"[&:hover_.mark]:brightness-[1.18] [&:focus-within_.mark]:brightness-[1.18]"}>
                                    {highlight && (
                                        <rect x={plotX - 18 - monoWidth(label, FS) - 6} y={mid - 10} width={monoWidth(label, FS) + 12} height={20} rx={10}
                                              fill={"var(--accent-lime)"} />
                                    )}
                                    <text x={plotX - 18} y={mid + FS * 0.36} textAnchor={"end"} fontSize={FS} fontWeight={500}
                                          fill={highlight ? "var(--accent-lime-ink)" : "var(--foreground)"}>{label}</text>
                                    <path className={"mark"} d={barPath(plotX, top, x(r.entry) - plotX, barH)} fill={"var(--chart-gap)"} />
                                    <path className={"mark"} d={barPath(plotX, top + barH + gap, x(r.senior) - plotX, barH)} fill={"var(--chart-gap)"} fillOpacity={0.3} />
                                    <text x={x(r.entry) + 8} y={top + barH - 1} fontSize={FS} fontWeight={600} fill={"var(--foreground)"}>{r.entry}%</text>
                                    <text x={x(r.senior) + 8} y={top + barH * 2 + gap - 1} fontSize={FS} fill={"var(--panel-chart-ink-faint)"}>{r.senior}%</text>
                                    <rect x={0} y={padT + i * rowH} width={W} height={rowH} fill={"transparent"} className={"outline-none"}
                                          {...bind({
                                              title: `${r.entry}% of entry level jobs, ${r.senior}% of senior ones`,
                                              line: `${r.name} · ${fmt(r.any)} of ${fmt(page.readable)} entry level jobs`,
                                              sub: `${fmt(r.senior_any)} of ${fmt(page.senior.readable)} senior jobs`,
                                          })} />
                                </g>
                            );
                        })}
                        {ticks.map((t) => (
                            <text key={t} x={x(t)} y={plotH + 19} textAnchor={t === 0 ? "start" : "middle"} fontSize={TICK_FS}
                                  fill={"var(--panel-chart-ink-faint)"}>{t === 0 ? "0" : `${t}%`}</text>
                        ))}
                    </svg>
                )}
                <TipBox tip={tip} />
            </div>
        </ChartPanel>
    );
}
