import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";

import AiOnYourCv, {END_ASK, GUESS_ASK, STREET_ASK} from "@/components/stories/ai-on-your-cv/AiOnYourCv";
import {DOOR_DIR, DOORS, doorPage, WOOD} from "@/components/stories/ai-on-your-cv/doors";
import {label} from "@/components/stories/ai-on-your-cv/Listing";
import {HEAD_DIR, HEADS} from "@/components/stories/ai-on-your-cv/people";
import {makeLayout} from "@/components/stories/ai-on-your-cv/states";
import {aiOnYourCvCover} from "@/components/stories/covers/ai-on-your-cv";
import {AI_JOBS, AI_ON_YOUR_CV, AIC, drawn, fam, MIN_SHARE, OURS, pct} from "./ai-on-your-cv";

/*
 * Do you need AI on your CV now?'s numbers are one week's (ai-on-your-cv.ts).
 * These catch a refresh that breaks them: a share that no longer rounds from
 * its count, a street that is no longer sorted, groups that no longer add up,
 * a drawn crowd that no longer matches its scale, or a sentence the story
 * writes that the new numbers no longer bear out. A failing test names the
 * sentence to read again.
 */

const ROOT = join(__dirname, "..", "..", "..", ".."), PUB = join(__dirname, "..", "..", "..", "public");
const html = () => renderToStaticMarkup(createElement(AiOnYourCv, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");
const count = <T, >(xs: ArrayLike<T>, f: (x: T) => boolean) => Array.from(xs).filter(f).length;
const share = (f: {llm: number; jobs: number}) => f.llm / f.jobs;

describe("the week's numbers", () => {
    it("sort the street from the loudest ask for LLMs to the quietest", () => {
        const shares = AIC.families.map(share);
        for (let i = 1; i < shares.length; i++) expect(shares[i], AIC.families[i].key).toBeLessThanOrEqual(shares[i - 1]);
        expect(AIC.families[0].key).toBe("ai");
        expect(AIC.families.at(-2)!.key).toBe("embedded");
        // Frontend (17 of 188) sits just above QA (32 of 357): both round to 9%.
        expect(share(fam("frontend"))).toBeGreaterThan(share(fam("qa")));
    });

    it("round each family's share to the whole per cent on its sign, and show game as a count", () => {
        const shown = AIC.families.filter((f) => f.jobs >= MIN_SHARE).map((f) => pct(f.llm, f.jobs));
        expect(shown).toEqual([62, 45, 28, 23, 22, 21, 17, 16, 16, 13, 11, 10, 10, 9, 9, 8, 6, 1]);
        expect(AIC.families.filter((f) => f.jobs < MIN_SHARE).map((f) => f.key)).toEqual(["game"]);
        expect(fam("game")).toMatchObject({jobs: 15, llm: 0});
    });

    it("split the 800 AI jobs by languages: 379 + 196 + 134 + 91, shown as 47%, 25%, 17% and 11%", () => {
        expect(AI_JOBS).toBe(800);
        expect(AI_JOBS).toBe(fam("ai").jobs);
        const p = AIC.languages.map((n) => pct(n, AI_JOBS));
        expect(p).toEqual([47, 25, 17, 11]);
        expect(p.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("compare entry level and senior: 72 of 627 is 11%, 485 of 2,796 is 17%", () => {
        expect(pct(AIC.levels.entry.llm, AIC.levels.entry.jobs)).toBe(11);
        expect(pct(AIC.levels.senior.llm, AIC.levels.senior.jobs)).toBe(17);
        expect(OURS).toBe(16);
    });
});

describe("the drawn people, one for every 5 jobs", () => {
    it("fill the street's windows: 2,486 people, lime where the job names LLMs", () => {
        expect(AIC.families.map((f) => drawn(f.jobs))).toEqual([160, 91, 54, 264, 64, 73, 113, 83, 674, 291, 111, 40, 101, 38, 71, 149, 33, 73, 3]);
        expect(AIC.families.map((f) => drawn(f.llm))).toEqual([99, 41, 15, 60, 14, 15, 19, 13, 105, 38, 12, 4, 10, 3, 6, 11, 2, 1, 0]);
        for (const ph of [false, true]) {
            const ly = makeLayout(ph), S = ly.state(2), street = AIC.families.reduce((a, f) => a + drawn(f.jobs), 0);
            expect(street).toBe(2486);
            expect(ly.N).toBe(street + 125 + 559);
            expect(count(S.A, (a) => a > 0)).toBe(street);
            expect(count(S.KIND, (k) => k === 1)).toBe(AIC.families.reduce((a, f) => a + drawn(f.llm), 0));
        }
    });

    it("carry one laptop per language at the AI door: 76, 39, 27 and 18 people", () => {
        const ly = makeLayout(false), S = ly.state(3), ai = ly.ST.byKey.ai, kinds = Array.from(S.KIND.slice(ai.i0, ai.i0 + ai.n));
        expect([0, 2, 3, 4].map((k) => count(kinds, (x) => x === k))).toEqual([76, 39, 27, 18]);
        expect(AIC.languages.map(drawn)).toEqual([76, 39, 27, 18]);
    });

    it("stand 125 (14 lime) at the entry level door and 559 (97 lime) at the senior door", () => {
        const ly = makeLayout(false), S = ly.state(5);
        expect(ly.ST.LV.map((l) => [l.n, l.lime])).toEqual([[125, 14], [559, 97]]);
        // The street stays at home, far above the frame; the level people stand on its pavement.
        for (const l of ly.ST.LV) {
            expect(count(S.A.slice(l.i0, l.i0 + l.n), (a) => a > 0)).toBe(l.n);
            expect(count(S.KIND.slice(l.i0, l.i0 + l.n), (k) => k === 1)).toBe(l.lime);
            expect(Math.max(...S.Y.slice(0, ly.ST.LV[0].i0))).toBeLessThan(0);
        }
        expect(S.labels.map((l) => l.t)).toEqual(expect.arrayContaining(["11%", "72 of 627 name LLMs", "125 drawn people", "17%", "485 of 2,796 name LLMs", "559 drawn people"]));
    });

    it("keep the street out of the phone's picture of the two doors, and their signs inside it (the prototype's phone frame cut both)", () => {
        const ly = makeLayout(true), S = ly.state(5);
        expect(count(S.A, (a) => a > 0)).toBe(125 + 559);
        // The signs stand 72 units above the doors' tops; the camera puts the tops at S.cam.ty + house.y.
        expect(ly.ST.house.y * S.cam.s + S.cam.ty - 72).toBeGreaterThanOrEqual(0);
    });

    it("ring the one lime person at the quiet door: 5 of 366 embedded jobs", () => {
        const ly = makeLayout(false), S = ly.state(6), e = ly.ST.byKey.embedded;
        expect(e.n).toBe(73);
        expect(count(S.KIND.slice(e.i0, e.i0 + e.n), (k) => k === 1)).toBe(1);
        expect(S.ring).not.toBeNull();
        expect(S.labels.map((l) => l.t)).toEqual(expect.arrayContaining(["1% name LLMs (5 of 366):", "73 drawn people for 366 embedded jobs"]));
    });

    it("label the AI door's groups percent first, the count under it", () => {
        const t = makeLayout(false).state(3).labels.map((l) => l.t);
        expect(t).toEqual(expect.arrayContaining(["47%", "379 of 800", "25%", "196 of 800", "17%", "134 of 800", "11%", "91 of 800", "800 AI jobs we could read this week; one drawn person is 5 jobs, rounded"]));
    });
});

describe("the listings", () => {
    it("list the skills as we read them from each ad, as in the prototype", () => {
        expect(AIC.opening.required).toEqual(["LLMs", "PHP", "JavaScript", "Python"]);
        expect(AIC.elastic.required).toEqual(["Elasticsearch", "observability", "webhooks", "LLMs", "workflow automation tools", "technical writing", "Google Workspace"]);
        expect(AIC.elastic.nice).toEqual(["JavaScript", "Python", "accessibility"]);
        expect(AIC.airbnb.required).toHaveLength(26);
        expect(AIC.airbnb.required.join(", ")).toBe("incident response, LLMs, AI agents, data quality, Tableau, observability, root cause analysis, Python, Go, JavaScript, "
            + "TypeScript, Bash, Elasticsearch, SQL, Airflow, message queues, Terraform, CI/CD, Jenkins, GitHub Actions, AWS, GCP, Jira, Salesforce, Workday, identity and access management");
        expect(AIC.qualinx.required).toEqual(["embedded systems", "C", "Python"]);
        for (const ad of [AIC.opening, AIC.elastic, AIC.airbnb, AIC.qualinx]) for (const k of ad.lime) expect(ad.required).toContain(k);
    });

    it("say every field to a screen reader", () => {
        const h = html();
        expect(label(AIC.elastic)).toBe("Job listing: Marketing AI Engineer, Elastic, Bangalore, India. On site. Posted 14 October 2026. 4 years. Requirements: Elasticsearch, observability, "
            + "webhooks, LLMs, workflow automation tools, technical writing, Google Workspace. Nice to have: JavaScript, Python, accessibility.");
        expect(label(AIC.qualinx)).toBe("Job listing: Senior Embedded Software Engineer, Qualinx, Delft, Zuid-Holland, Netherlands. On site. Posted 18 October 2026. 10 years. "
            + "Requirements: embedded systems, C, Python. Nice to have: none listed.");
        expect(label(AIC.airbnb)).toMatch(/^Job listing: Operations Engineer, BizTech, Airbnb, Anywhere in the World\. Remote\. Posted 18 October 2026\. 3 years\. 26 required skills: incident response, LLMs, AI agents/);
        expect(h).toContain('aria-label="Job listing, taped up on the wall beside the door: Werkstudent (w/m/d) Software Development, Holzland Becker, Offenbach am Main, Hessen, Deutschland. '
            + 'On site. Posted 18 October 2026. Years not stated. Requirements: LLMs, PHP, JavaScript, Python. Nice to have: none listed."');
        for (const ad of [AIC.elastic, AIC.airbnb, AIC.qualinx]) expect(h).toContain(`aria-label="${label(ad)}"`);
    });
});

describe("the photos", () => {
    it("credit all 20 doors: each file self hosted, in CREDITS.md and named on the page", () => {
        const credits = readFileSync(join(PUB, DOOR_DIR, "CREDITS.md"), "utf8"), h = html();
        expect(credits).toContain("https://www.pexels.com/license/");
        expect([WOOD, ...DOORS]).toHaveLength(20);
        expect(DOORS).toHaveLength(AIC.families.length);
        for (const d of [WOOD, ...DOORS]) {
            const file = `door-${d.pid}.webp`;
            expect(existsSync(join(PUB, DOOR_DIR, file)), file).toBe(true);
            expect(credits).toContain(`| ${file} |`);
            expect(credits).toContain(`| ${d.by} | ${doorPage(d)} |`);
            expect(h).toContain(`<a href="https://www.pexels.com/photo/`);
            expect(h).toContain(`>${d.by}</a>`);
        }
    });

    it("credit both photo heads the same way", () => {
        const credits = readFileSync(join(PUB, HEAD_DIR, "CREDITS.md"), "utf8"), h = html();
        expect(credits).toContain("https://www.pexels.com/license/");
        for (const head of Object.values(HEADS)) {
            expect(existsSync(join(PUB, HEAD_DIR, head.file)), head.file).toBe(true);
            expect(credits).toContain(`| ${head.file} |`);
            expect(credits).toContain(head.by);
            expect(h).toContain(`<a href="${head.page}">${head.by}</a>`);
        }
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week near the top and dates every source line", () => {
        expect(h).toContain("By the Glassbox team · the week of 19 October 2026");
        expect(h).toContain("This story keeps to one week, 19 October 2026.");
        expect(h.match(/Source: Glassbox count, week of 19 October 2026 · LLMs: the ad names large language models or a close term on our list ·/g)?.length).toBe(1 + 6 + 1);
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("This week, Holzland Becker, a German timber and building supplies company, advertised a student software job.");
        expect(h).toContain("It asks for PHP, JavaScript, Python, and LLMs.");
        expect(h).toContain("of the software engineering jobs advertised this week name LLMs: 523 of the 3,370 ads we could read.");
        expect(h).toMatch(/<span class="[^"]*">16%<\/span>/);
        expect(h).toContain("Our count, 16 of the 100, lights lime.");
        expect(h).toContain("62% of AI jobs name LLMs (494 of 800). In machine learning, 45% (207 of 455).");
        expect(h).toContain("In software engineering, 16% (523 of 3,370). In DevOps, 8% (56 of 743). In embedded jobs, 1% (5 of 366).");
        expect(h).toContain("Here’s the odd part. 47% of AI jobs don’t name a single programming language (379 of 800).");
        expect(h).toContain("Elastic’s Marketing AI Engineer asks for LLMs and technical writing. JavaScript and Python are only nice to have.");
        expect(h).toContain("Airbnb’s “Operations Engineer, BizTech” lists 26 required skills. Two of them are AI: LLMs and AI agents.");
        expect(h).toContain("LLMs in 11% of entry level software jobs (72 of 627), and in 17% of senior ones (485 of 2,796).");
        expect(h).toContain("Where it’s quiet. 1% of embedded jobs name LLMs (5 of 366).");
        expect(h).toContain("Qualinx’s Senior Embedded Software Engineer asks for C, Python and embedded systems. Nothing AI.");
        expect(h).toContain("So, do you need AI on your CV? Some doors ask loudly, others barely mention it.");
        expect(h).toContain("Which door are you standing at?");
    });

    it("describes every graphic in words, with the same numbers", () => {
        expect(h).toContain("Each sign carries its share and its count: AI 62% (494 of 800), machine learning 45% (207 of 455), data science 28% (74 of 269)");
        expect(h).toContain("embedded 1% (5 of 366), game 0 of 15.");
        expect(h).toContain("its 160 drawn people step onto the pavement in four groups");
        expect(h).toContain("47% of AI jobs name none (379 of 800), 25% one (196), 17% two (134), 11% three or more (91).");
        expect(h).toContain("125 drawn people for 627 jobs, 14 lime for the 72 that name LLMs.");
        expect(h).toContain("559 drawn people for 2,796 jobs, 97 lime for the 485 that name LLMs.");
        expect(h).toContain("its 73 drawn people stand on the pavement, one of them lime with a pen ring: 1% of embedded jobs name LLMs, 5 of 366.");
    });

    it("asks for the CV after the guess, at the street and at the end, each counted apart, never claiming a count of jobs", () => {
        expect(h).toContain(STREET_ASK);
        expect(h).toContain(END_ASK);
        const src = readFileSync(join(__dirname, "..", "..", "components", "stories", "ai-on-your-cv", "AiOnYourCv.tsx"), "utf8");
        expect(src).toMatch(/after=\{<StoryCvAsk[^>]*place=\{"story_ai_on_your_cv_guess"\}/);
        expect(src).toContain('place={"story_ai_on_your_cv_street"}');
        // The sheet counts the story's AI skills on a CV: no ask names jobs or a number of them.
        for (const ask of [GUESS_ASK, STREET_ASK, END_ASK]) {
            expect(ask).toMatch(/AI skills.*already on your CV\?$/);
            expect(ask).not.toMatch(/\d|\bjobs?\b|\bads?\b/);
        }
    });

    it("asks about the AI skills it names, each a key in the skill vocabulary", () => {
        const vocab = new Set(readFileSync(join(ROOT, "backend", "src", "matching", "skills.txt"), "utf8").split("\n")
            .filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("|")[0].trim()));
        expect(AI_ON_YOUR_CV.ask.map((a) => a.key)).toEqual(["llm", "ai agents", "rag", "machine learning", "ai assistants", "mlops"]);
        for (const a of AI_ON_YOUR_CV.ask) expect(vocab.has(a.key), a.key).toBe(true);
        expect(AI_ON_YOUR_CV.readable).toBe(800);
    });

    it("links chapter one and ends with how we counted", () => {
        expect(h).toContain('<a href="/market/entry-level-software/is-entry-level-dead">Is entry level dead?</a>');
        expect(h).toContain('id="method"');
        expect(h).toContain("A named skill isn’t a hiring rule. We count what ads name, required or preferred.");
    });

    it("draws the cover from the same numbers, with no orange on it", () => {
        const svg = aiOnYourCvCover();
        for (const t of [">62%<", ">45%<", ">16%<", ">8%<", ">1%<"]) expect(svg).toContain(t);
        expect(svg.match(/fill="#d7ee4c"/g)?.length).toBe(62 + 45 + 16 + 8 + 1);
        expect(svg).not.toMatch(/#f5532a/i);
    });

    it("gives the hub its card line from the numbers", () => {
        expect(AI_ON_YOUR_CV.card).toBe("In one week, 62% of AI jobs named LLMs, against 16% of software engineering jobs and 1% of embedded ones.");
    });
});
