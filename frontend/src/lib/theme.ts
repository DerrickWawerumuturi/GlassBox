import {STORY_SLUGS} from "@/lib/market-names";

/*
 * Theme: System, Dark or Light, kept in localStorage. Dark is the warm
 * charcoal desk; Light is "paper" (globals.css). The class goes on <html>
 * before first paint by THEME_SCRIPT, so there is no flash on load.
 * The stories open on paper (founder, 21 Oct 2026): there System means light,
 * and only an explicit Dark choice turns them dark.
 */

export type ThemeChoice = "system" | "dark" | "light";

export const THEME_KEY = "theme";

export function parseChoice(stored: string | null): ThemeChoice {
    return stored === "dark" || stored === "light" ? stored : "system";
}

/** A story's address: /market/<page>/<story slug>. */
const STORY_PATH = new RegExp(`^/market/[^/]+/(${STORY_SLUGS.join("|")})/?$`);

export const isStoryPath = (path: string) => STORY_PATH.test(path);

/** `lightFirst`: a story page, where System means light. */
export function isDark(choice: ThemeChoice, systemDark: boolean, lightFirst = false): boolean {
    return choice === "dark" || (choice === "system" && systemDark && !lightFirst);
}

export function readChoice(): ThemeChoice {
    try {
        return parseChoice(localStorage.getItem(THEME_KEY));
    } catch {
        return "system";
    }
}

const systemDark = () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Paint a choice now, with transitions off for one frame so colours swap at
 * once instead of animating.
 */
export function applyChoice(choice: ThemeChoice, path = location.pathname) {
    const root = document.documentElement;
    const still = document.createElement("style");
    still.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(still);
    root.classList.toggle("dark", isDark(choice, systemDark(), isStoryPath(path)));
    // Reading a style forces the swap to paint before transitions come back.
    void getComputedStyle(root).color;
    requestAnimationFrame(() => still.remove());
}

export function saveChoice(choice: ThemeChoice) {
    try {
        if (choice === "system") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, choice);
    } catch {
        // Private mode or blocked storage: the choice lasts for this page only.
    }
    applyChoice(choice);
}

/** Runs in <head> before the body paints. Any failure falls back to dark, the look the app has always had, except on a story, which falls back to paper. */
export function themeScript(): string {
    return `(function(){var r=document.documentElement;var s=${STORY_PATH}.test(location.pathname);try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&!s&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)r.classList.add("dark");}catch(e){if(!s)r.classList.add("dark");}})();`;
}
