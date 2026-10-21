import {AIC} from "@/lib/stories/ai-on-your-cv";
import {rnd, wcircle, wrect} from "../is-entry-level-dead/marker";

/*
 * The opening's door photos (Pexels; public/stories/ai-on-your-cv/doors/CREDITS.md):
 * the timber merchant's wooden door, then one door per job family in the
 * street's order. `box` is the door in its 480 x 720 crop (left, top, right,
 * foot, as fractions), where the marker traces it at the hand over to the
 * drawn world. Photographers as named on each photo's Pexels page, 21 Oct 2026.
 */

export type Door = {pid: string; by: string; box: [number, number, number, number]};
export const DOOR_DIR = "/stories/ai-on-your-cv/doors";
export const doorPage = (d: Door) => `https://www.pexels.com/photo/${d.pid}/`;

export const WOOD: Door = {pid: "18434238", by: "Nati", box: [.3665, .22, .8211, .9]};

/** One door per family, in AIC.families' order. */
export const DOORS: Door[] = [
    {pid: "3667041", by: "Guru Saran", box: [.2429, .2429, .7286, .9619]}, // AI
    {pid: "6431895", by: "Juan Martin Lopez", box: [.0861, .1239, .9139, .9437]}, // machine learning
    {pid: "14845201", by: "Florian Süß", box: [.2521, .234, .7479, .914]}, // data science
    {pid: "29207346", by: "Ellie Burgin", box: [.2448, .1988, .7124, .8788]}, // solutions
    {pid: "19071637", by: "Burcu Elmas", box: [.2563, .2724, .7437, .9524]}, // data engineering
    {pid: "13332122", by: "Viridiana Rivera", box: [.2148, .22, .7852, .9]}, // full stack
    {pid: "28932269", by: "Shiva Kumar Reddy", box: [.3547, .3542, .6453, .8438]}, // security
    {pid: "8071122", by: "Mieke Boogert", box: [.0418, .477, .9582, .8842]}, // backend
    {pid: "5098554", by: "Domenico Bandiera", box: [.192, .22, .6391, .9]}, // software engineering
    {pid: "277509", by: "Pixabay", box: [.0771, .1162, .9143, .9143]}, // product
    {pid: "27466665", by: "Damir K", box: [.1656, .1148, .8344, .9227]}, // IT support
    {pid: "36822048", by: "The Daphne Lens", box: [.2538, .22, .7462, .9]}, // data analytics
    {pid: "16154474", by: "Olga K", box: [.237, .22, .763, .9]}, // design
    {pid: "28078191", by: "Damir K", box: [.1992, .22, .8008, .9]}, // frontend
    {pid: "3723719", by: "G N", box: [.2125, .3, .7875, .9]}, // QA
    {pid: "13767111", by: "Polat Eyyüp Albayrak", box: [.2375, .22, .7625, .9]}, // DevOps
    {pid: "13565274", by: "Jan van der Wolf", box: [.3185, .4754, .6815, .9679]}, // mobile
    {pid: "8834554", by: "Rendy Tomaluweng", box: [.3563, .375, .6438, .9167]}, // embedded
    {pid: "31963352", by: "Eren Ataselim", box: [.2086, .2971, .7914, 1]}, // game
];

/** The photographers, each once, in the order their doors appear. */
export const PHOTOGRAPHERS = [WOOD, ...DOORS].filter((d, i, all) => all.findIndex((e) => e.by === d.by) === i);

/** Each family door with its sign's lines. */
export const FAMILY_DOORS = AIC.families.map((f, k) => ({...DOORS[k], sign: f.sign}));

/** The marker line that traces a door at the hand over, and its drawn fill, in the photo's own box (100 x 150). */
export function trace(d: Door, seed: number) {
    const [x0, y0, x1, y1] = d.box, r = rnd(seed), x = x0 * 100, y = y0 * 150, w = (x1 - x0) * 100, h = (y1 - y0) * 150, p = wrect(x, y, w, h, r, .8);
    return `<path class="aic-ifill" d="${p}"/><path class="aic-iline" pathLength="1" d="${p}"/><path class="aic-iknob" d="${wcircle(x + w * .8, y + h * .55, 1.6, r, .2, 8)}"/>`;
}
