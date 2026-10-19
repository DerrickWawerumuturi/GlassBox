import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import {STORY_KINDS} from "@/lib/analytics";

/*
 * Each story's interactions report story_interacted under the story's own
 * address and a known kind (lib/analytics.ts storyInteracted, once per page
 * view). Read from the client components, as the peek test reads its buttons.
 */

const src = (f: string) => readFileSync(join(__dirname, "..", "..", "components", "stories", f), "utf8");
const calls = (f: string) => [...src(f).matchAll(/storyInteracted\("([a-z-]+)", "([a-z_]+)"\)/g)].map((m) => `${m[1]} ${m[2]}`).sort();

describe("story_interacted", () => {
    it("is wired to every story's interactions, under its own address", () => {
        expect(calls("pick-a-side/Cards.tsx")).toEqual(["pick-a-side pick_side", "pick-a-side reveal_all", "pick-a-side scratch", "pick-a-side scratch"]);
        expect(calls("the-lobby/Lift.tsx")).toEqual(["the-lobby all_floors", "the-lobby lift", "the-lobby lift"]);
        expect(calls("contents-may-vary/Box.tsx")).toEqual(["contents-may-vary ingredient", "contents-may-vary ingredient", "contents-may-vary open_box",
            "contents-may-vary show_none"]);
        expect(calls("peak-python/Range.tsx")).toEqual(["peak-python arm", "peak-python peak_list"]);
        expect(calls("within-eleven-jobs/Yard.tsx")).toEqual(["within-eleven-jobs crane", "within-eleven-jobs fly_over"]);
        expect(calls("is-entry-level-dead/Guess.tsx")).toEqual(["is-entry-level-dead guess", "is-entry-level-dead show_count"]);
    });

    it("uses only kinds analytics knows", () => {
        const files = ["pick-a-side/Cards.tsx", "the-lobby/Lift.tsx", "contents-may-vary/Box.tsx", "peak-python/Range.tsx", "within-eleven-jobs/Yard.tsx", "is-entry-level-dead/Guess.tsx"];
        for (const k of files.flatMap(calls).map((c) => c.split(" ")[1])) expect(STORY_KINDS as readonly string[]).toContain(k);
    });

    it("never fires on its own: the box opening as it scrolls into view is not a reader's use", () => {
        // Counter opens the box from an IntersectionObserver; only the buttons report.
        expect(src("contents-may-vary/Box.tsx")).not.toMatch(/const open = useCallback\(\(\) => \{[^}]*storyInteracted/);
        // The guess shows our count when the ladder scrolls into view; only the button and the keys report it.
        expect(src("is-entry-level-dead/Guess.tsx")).toMatch(/new IntersectionObserver\(\(es\) => \{ if \(es\.some\(\(e\) => e\.isIntersecting\)\) setShown\(true\); \}/);
    });
});
