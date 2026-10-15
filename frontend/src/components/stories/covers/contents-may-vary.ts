import {CONTENTS} from "@/lib/stories/contents-may-vary";

/*
 * Contents may vary's cover on the market hub (the prototype's cover.js): the
 * side of the box, the label cropped to its top lines, the first in lime,
 * with the week's numbers. Ids start with "ai": every cover shares the hub's page.
 */

const INK = "#161411", M = "#ff3d8f", C = "#1fb6ff", L = "#d7ee4c";
const T = (x: number, y: number, s: number, txt: string, o: {a?: string; w?: number; f?: string; ff?: string; ls?: string} = {}) =>
    `<text x="${x}" y="${y}" font-size="${s}"${o.a ? ` text-anchor="${o.a}"` : ""} font-weight="${o.w || 800}" fill="${o.f || INK}" style="font-family:${o.ff || "var(--essay)"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${txt}</text>`;
const front = "62,34 62,400 12,370 12,4", top = "62,34 390,34 340,4 12,4";

export function contentsMayVaryCover(): string {
    let r = "";
    CONTENTS.label.slice(0, 6).forEach((l, k) => {
        const y = 178 + k * 44;
        if (k === 0) r += `<rect x="74" y="${y - 30}" width="306" height="43" fill="${L}"/>`;
        r += `<path d="M74 ${y + 13}H380" stroke="${INK}" stroke-width="1.5"/>` + T(84, y, 20, l.name, {w: 700})
            + T(316, y, 18, l.jobs === null ? "–" : String(l.jobs), {a: "end", ff: "var(--mono)", w: 600}) + T(372, y, 18, `${l.share}%`, {a: "end", ff: "var(--mono)", w: 600});
    });
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false"><defs><pattern id="ai-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.15" fill="#000" opacity=".12"/></pattern><clipPath id="ai-crop"><rect width="400" height="400"/></clipPath></defs>
      <rect width="400" height="400" fill="#fff6e5"/><g clip-path="url(#ai-crop)">
      <polygon points="${front}" fill="${M}"/><polygon points="${front}" fill="url(#ai-dots)"/>
      <polygon points="${top}" fill="${C}"/><polygon points="${top}" fill="url(#ai-dots)"/><path d="M30 19H330" stroke="#fff" stroke-width="2" stroke-dasharray="6 5" opacity=".9"/>
      <rect x="62" y="34" width="328" height="400" fill="#fff"/>
      ${T(78, 94, 36, "INGREDIENTS", {w: 900, ls: "-1"})}${T(78, 120, 15, `of ${CONTENTS.readable} AI jobs we could read`, {w: 600})}
      <rect x="74" y="132" width="306" height="9" fill="${INK}"/>${r}
      <g fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"><polygon points="${front}"/><polygon points="${top}"/><rect x="62" y="34" width="328" height="400"/></g>
      </g></svg>`;
}
