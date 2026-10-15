import type {StoryInfo} from "@/lib/stories/story";

/*
 * "Pick a side" (entry level software): every number the story shows, for one
 * week. "L60" is line 60 of the live entry level page as read for that week
 * (docs/local/editorial-sprint/stories/data/entry-level-software.txt); "years
 * L30" is the years page's file beside it. A refresh edits this file only;
 * pick-a-side.test.ts then says which sentences need reading again.
 */

/** A card: one skill, its count and share in entry level software jobs (`e`) and in senior software jobs (`s`). */
export interface Card {
    /** The skill's vocabulary key: what the CV ask looks for on a CV. */
    key: string;
    name: string;
    /** The name mid sentence, where it differs: "distributed systems". */
    inline?: string;
    e: {jobs: number; share: number};
    /** The senior side. `jobs` is null where the page gives the share only. */
    s: {jobs: number | null; share: number};
    /** Employers whose jobs name it; null where the page says only "10 or more". */
    employers: number | null;
}

export type Lean = "entry" | "senior" | "draw";

/** A card by its key. */
export const card = (key: string): Card => {
    const c = PICK.deck.find((d) => d.key === key);
    if (!c) throw new Error(`No card for ${key}`);
    return c;
};

/** Which side names a card more. A point apart, or less, is neither: rounding is not a verdict. */
export const lean = (c: Card): Lean => (Math.abs(c.e.share - c.s.share) <= 1 ? "draw" : c.e.share > c.s.share ? "entry" : "senior");

export const PICK = {
    /** The Monday of the week counted: L7, L10. */
    week: "2026-10-12",
    /** Entry level software jobs counted, their employers, and those long enough to read: L7. */
    jobs: 561,
    employers: 196,
    readable: 559,
    /** The other side of every card: senior software jobs, counted the same way (L67, L78). */
    senior: 2237,
    /** The eleven cards, in the order they are dealt. */
    deck: [
        {key: "python", name: "Python", e: {jobs: 276, share: 49}, s: {jobs: 803, share: 36}, employers: 114}, // L60, L104
        {key: "c++", name: "C++", e: {jobs: 164, share: 29}, s: {jobs: 306, share: 14}, employers: 65}, // L61, L103
        {key: "git", name: "Git", e: {jobs: 117, share: 21}, s: {jobs: 259, share: 12}, employers: null}, // L105, L109
        {key: "distributed systems", name: "Distributed systems", inline: "distributed systems",
            e: {jobs: 84, share: 15}, s: {jobs: 639, share: 29}, employers: null}, // L106, L109
        {key: "kubernetes", name: "Kubernetes", e: {jobs: 69, share: 12}, s: {jobs: 559, share: 25}, employers: null}, // L107, L109
        {key: "aws", name: "AWS", e: {jobs: 88, share: 16}, s: {jobs: 602, share: 27}, employers: null}, // L108, L109
        {key: "typescript", name: "TypeScript", e: {jobs: 114, share: 20}, s: {jobs: null, share: 24}, employers: 71}, // L62
        {key: "java", name: "Java", e: {jobs: 100, share: 18}, s: {jobs: null, share: 19}, employers: 59}, // L63
        {key: "go", name: "Go", e: {jobs: 97, share: 17}, s: {jobs: null, share: 24}, employers: 51}, // L64
        {key: "javascript", name: "JavaScript", e: {jobs: 82, share: 15}, s: {jobs: null, share: 11}, employers: 52}, // L65
        {key: "c", name: "C", e: {jobs: 80, share: 14}, s: {jobs: null, share: 6}, employers: 32}, // L66
    ] as Card[],
    /**
     * The beats, by key, in the order the story deals them: the first card,
     * the lime card (the one highlight, and the cover), the card that leans
     * the same way, the turn, and the five more languages.
     */
    beats: {first: "python", lime: "c++", same: "git", turn: ["distributed systems", "kubernetes", "aws"],
        more: ["typescript", "java", "go", "javascript", "c"]},
    /** Languages the live page charts, and how many of them lean to entry level: L70. */
    charted: {languages: 7, leanEntry: 4},
    /** Jobs naming at least one language, and two or more, of the readable ones: L37. */
    languages: {any: 440, twoOrMore: 339},
    /** Internships and remote jobs, of the jobs counted: L162 to L166. */
    internships: {jobs: 238, share: 42},
    remote: {jobs: 82, share: 15},
    /** The place each job names: L158 to L160. */
    places: {us: 314, elsewhere: 158, unknown: 89},
    /** The employer with the most jobs: L152. */
    largest: {name: "Astera Labs Early Career - North America 2027", jobs: 24},
    /** Software jobs with an early career title, and those that state no number of years: years L30, L173. */
    titled: {jobs: 328, unstated: 306},
};

export const PICK_A_SIDE: StoryInfo = {
    slug: "pick-a-side",
    page: "entry-level-software",
    week: PICK.week,
    published: "2026-10-15",
    title: "Pick a side",
    card: (() => {
        const c = PICK.deck.find((d) => d.key === PICK.beats.lime)!;
        return `${c.name} is named in ${c.e.share}% of entry level software jobs and ${c.s.share}% of senior ones.`;
    })(),
    readable: PICK.readable,
    ask: PICK.deck.map(({key, name}) => ({key, name})),
};
