/*
 * One flat glyph per card, stamped on its foil coin (28 by 28, stroked), by
 * the skill's vocabulary key. A card dealt without a glyph fails
 * pick-a-side.test.ts, so a refresh that brings a new skill draws one.
 */
export const ICON: Record<string, string> = {
    "python": '<path d="M6 8.5c0-4 15-4 15 0s-15 2.5-15 6.5 15 2.5 15 6.5"/><circle cx="21" cy="21.5" r="2.4"/><circle cx="21.8" cy="21" r=".7" fill="#1a1a1a"/>',
    "c++": '<path d="M12 8.5A6 6 0 1 0 12 19.5"/><path d="M16 11v6M13 14h6M22 11v6M19 14h6"/>',
    "git": '<circle cx="8" cy="6.5" r="2.6"/><circle cx="8" cy="21.5" r="2.6"/><circle cx="20" cy="10.5" r="2.6"/><path d="M8 9.1v9.8M20 13.1c0 5-12 3.5-12 8"/>',
    "distributed systems": '<circle cx="6" cy="8" r="2.8"/><circle cx="22" cy="8" r="2.8"/><circle cx="14" cy="21" r="2.8"/><path d="M8.8 8h10.4M7.4 10.4l5.2 8.2M20.6 10.4l-5.2 8.2"/>',
    "kubernetes": '<rect x="3.5" y="14.5" width="9" height="9" rx="1.5"/><rect x="15.5" y="14.5" width="9" height="9" rx="1.5"/><rect x="9.5" y="4.5" width="9" height="9" rx="1.5"/>',
    "aws": '<path d="M8 21h12a4.5 4.5 0 0 0 .8-8.9A6.5 6.5 0 0 0 8.3 10.6 5.2 5.2 0 0 0 8 21z"/>',
    "typescript": '<path d="M9 7l-6 7 6 7M19 7l6 7-6 7"/><path d="M12 11v6M16 11v6"/>',
    "java": '<path d="M6 12h13v6a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/><path d="M19 14h2.5a2.5 2.5 0 0 1 0 5H19"/><path d="M10 4.5c1.5 1.5 0 2.5 0 4M14 4.5c1.5 1.5 0 2.5 0 4"/>',
    "go": '<circle cx="14" cy="14" r="10"/><path d="M11 9l6 5-6 5"/>',
    "javascript": '<path d="M10 5c-3 0-3.5 1.5-3.5 4v2.5c0 1.5-.5 2.5-2.5 2.5 2 0 2.5 1 2.5 2.5V19c0 2.5.5 4 3.5 4M18 5c3 0 3.5 1.5 3.5 4v2.5c0 1.5.5 2.5 2.5 2.5-2 0-2.5 1-2.5 2.5V19c0 2.5-.5 4-3.5 4"/>',
    "c": '<path d="M21 9.5A8.5 8.5 0 1 0 21 18.5"/>',
};

/** The pen circle drawn round the side a reader picks. */
export const RING_PATH = "M10 26C8 12 36 5 64 6s52 9 46 22-32 20-62 18S4 42 12 22";
