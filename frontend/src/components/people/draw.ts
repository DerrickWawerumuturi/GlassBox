import type {Art} from "./art-type";

/*
 * The cast (founder, 15 and 16 Oct 2026): hand drawn people from Pablo
 * Stanley's Open Peeps and Open Doodles (CC0, LICENSES.md), a few of them, each
 * beside a sentence it adds to. A page imports only the drawings it shows (./art).
 *
 * Just the drawing on the page: no shape behind it. In light the ink is the
 * page's ink and the paper fills are the page's own ground (people.module.css).
 * In dark the same drawing becomes line art: lineArt() below keeps every line in
 * the paper colour and hollows out the solid black (hair, trousers), which keep
 * only their edge, so the dark ground shows through; lime stays lime.
 */

const f = (n: number) => +n.toFixed(2);

/**
 * The dark theme's filter. The drawing comes in with white ink on black paper
 * (people.module.css). The ink becomes a mask; eroding it by `r` leaves only the
 * inside of solid shapes, and the mask minus that is every line plus the edge of
 * every solid, grown a touch so light lines on a dark ground hold up at the
 * small sizes the cast is shown at. That is drawn in the line colour (feFlood,
 * set in CSS); the rest is left clear. Saturated colour (the lime box) passes
 * through as it is.
 */
const lineArt = (id: string, r: number, grow: number) => `<defs><filter id="${id}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">`
    + `<feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 2.2 -3 3 0 -.7" result="ink"/>`
    + `<feMorphology in="ink" operator="erode" radius="${r}" result="core"/>`
    + `<feComposite in="ink" in2="core" operator="out" result="cut"/><feMorphology in="cut" operator="dilate" radius="${grow}" result="edge"/>`
    + `<feFlood result="pen"/><feComposite in="pen" in2="edge" operator="in" result="lines"/>`
    + `<feColorMatrix in="SourceGraphic" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 3 -3 0 -.3" result="colour"/>`
    + `<feMerge><feMergeNode in="colour"/><feMergeNode in="lines"/></feMerge></filter></defs>`;

/** One person as an SVG string, decorative (aria-hidden). `flip` mirrors it to face the text it sits beside. */
export function personSvg(art: Art, {flip = false}: {flip?: boolean} = {}): string {
    const [x, y, w, h] = art.vb, id = `line-art-${art.id}`;
    const mirror = flip ? ` transform="translate(${f(2 * x + w)} 0) scale(-1 1)"` : "";
    return `<svg class="person" viewBox="${[x, y, w, h].join(" ")}" aria-hidden="true" focusable="false" style="--line-art:url(#${id})">`
        + `${lineArt(id, f(Math.max(w, h) * .006), f(Math.max(w, h) * .0022))}<g class="ink"${mirror}>${art.svg}</g></svg>`;
}
