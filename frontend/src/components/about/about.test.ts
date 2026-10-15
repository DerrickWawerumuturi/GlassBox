import {readFileSync} from "node:fs";
import {join} from "node:path";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

import LOOK from "@/lib/landing/look.fixture.json";
import type {Look} from "@/lib/landing/look";

// The page reads the published count from the database (never the API); here, the fixture or nothing.
const published = vi.hoisted(() => ({look: null as unknown}));
vi.mock("@/lib/landing/look-server", () => ({lookForPage: async () => published.look}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: () => {}})}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: () => {}, scanning: false, sheet: null})}));
// next/font is the compiler's: outside a build it throws.
vi.mock("next/font/local", () => ({default: () => ({className: "", variable: "", style: {}})}));

import AboutPage from "@/app/(public)/about/page";
import {aboutLines, countReceipt} from "@/lib/product-count";
import {ABOUT_PAGE, PRODUCT_PAGE} from "@/lib/site-copy";

const render = async (look: unknown) => {
    published.look = look;
    return renderToStaticMarkup(await AboutPage()).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");
};
const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const BACKEND = join(__dirname, "..", "..", "..", "..", "backend");
const backend = (path: string) => readFileSync(join(BACKEND, path), "utf8");

describe("/about's chapters", () => {
    it("are the six parts in order, each anchor the page had kept, and the chips point at them", async () => {
        expect(ABOUT_PAGE.chapters.map((c) => [c.id, c.title])).toEqual([
            ["why", "Twenty skills, one ad"], ["what-we-count", "From the boards to the Monday count"], ["we-show", "A map with no arrows"],
            ["your-data", "Your PDF is read, then deleted"], ["not", "Three things it isn't"], ["next", "The Count, still sealed"]]);
        const html = await render(LOOK);
        const on = ids(html);
        for (const c of ABOUT_PAGE.chapters) expect(on, c.id).toContain(c.id);
        const chips = [...html.matchAll(/<a [^>]*href="#([^"]+)"/g)].map((m) => m[1]);
        expect(chips).toEqual(ABOUT_PAGE.chapters.map((c) => c.id));
        const words = text(html);
        ABOUT_PAGE.chapters.forEach((c, i) => expect(words).toContain(`0${i + 1} ${c.name} ${c.title}`));
        expect(words).toContain("What we hold to Show the evidence");
    });

    it("draws every picture chapter, each with what it shows, and leaves no empty spot for a character", async () => {
        const html = await render(LOOK);
        const D = ABOUT_PAGE.drawn;
        for (const label of [D.hero.label, D.why.label, D["we-show"].label, D.not.label, D.next.label]) expect(html).toContain(`aria-label="${label}"`);
        expect(html).toContain('aria-label="A CV goes into the box.');
        expect(html).not.toMatch(/character|cast-spot|stroke-dasharray="5 6"/);
        // The hatching is defined once, so a drawing hidden at one width never hides it from the rest.
        expect(html.match(/<pattern id="ab-hatch"/g)).toHaveLength(1);
    });

    it("states the counting steps' numbers as the code has them: 255 boards, 250 skill names, every six hours", () => {
        const lines = (path: string) => backend(path).split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;
        expect(lines("src/jobpool/companies.txt")).toBe(255);
        expect(lines("src/matching/skills.txt")).toBe(250);
        expect(readFileSync(join(BACKEND, "..", ".github", "workflows", "job-pool.yml"), "utf8")).toMatch(/cron: "\d+ \*\/6 \* \* \*"/);
        expect(ABOUT_PAGE.steps[0].body).toContain("Every six hours");
        expect(ABOUT_PAGE.steps[0].body).toContain("255 employers' own boards");
        expect(ABOUT_PAGE.stepsCaption.after).toContain("255 employer boards and the list of 250 skill names");
        expect(ABOUT_PAGE.drawn.steps.names).toBe("250 NAMES");
    });
});

describe("/about's receipt", () => {
    const look = LOOK as unknown as Look;
    const b = look.families.backend;
    const [key, n] = Object.entries(b.skills).sort((x, y) => y[1] - x[1])[0];
    const total = Object.values(look.families).reduce((s, f) => s + f.jobs, 0);

    it("reads the published count, every number naming what it counts", async () => {
        expect(countReceipt(look, aboutLines)?.lines).toEqual([
            `${b.seniority.junior} of the ${b.jobs} backend jobs are junior roles.`,
            `${look.skills[key]} is named in ${n} of the ${b.readable} backend jobs we read.`,
        ]);
        const card = text((await render(LOOK)).match(/<aside [^>]*aria-label="The weekly count".*?<\/aside>/)![0]);
        expect(card).toContain(`The weekly count week of 5 October 2026 ${total.toLocaleString("en")} tech jobs this week, across 13 job types`);
        expect(card).toContain(`${b.seniority.junior} of the ${b.jobs} backend jobs are junior roles.`);
        expect(card).toContain(`we read. The week in tech jobs`);
        // The note joining a scan to the receipt is /product's; /about has no scan above it.
        expect(card).not.toContain(PRODUCT_PAGE.count.note);
    });

    it("without a count shows the section without numbers, only where to read more", async () => {
        expect(countReceipt(null, aboutLines)).toBeNull();
        const html = await render(null);
        const card = html.match(/<aside [^>]*aria-label="The weekly count".*?<\/aside>/)![0];
        expect(text(card).trim()).toBe("The weekly count The week in tech jobs");
        expect(card).toMatch(/href="\/market"/);
        // The steps still say how the count is made.
        expect(text(html)).toContain("1 Read Every six hours");
    });
});

describe("/about's privacy lines", () => {
    const L = ABOUT_PAGE.ledger;

    it("render on the page: the PDF deleted, the text to Groq, nothing kept without an account", async () => {
        const words = text(await render(LOOK));
        expect(words).toContain("We never store your PDF. We read its text, then delete the file straight away.");
        expect(words).toContain("we send that text to Groq, an AI service from a US company.");
        expect(words).toContain("Not signed in, we keep nothing about you on our servers.");
        expect(words).toContain(`${L.kept} ${L.groups[0].title} ${L.groups[0].items.join(" ")}`);
        expect(words).toContain(`${L.never} ${L.neverItems.join(" ")} ${L.foot}`);
    });

    it("say what a signed in account keeps beside the CV: the latest scan and the applications (main.py /analysis, application)", () => {
        expect(backend("main.py")).toMatch(/@app\.put\("\/analysis"\)/);
        expect(L.groups.flatMap((g) => g.items)).toEqual(expect.arrayContaining(["your latest scan results", "the applications you track"]));
    });

    it("never claim the account forgets your name: only the CV's name is never kept (users keeps the sign in's)", () => {
        expect(backend("src/database/repositories/user_repository.py")).toMatch(/def upsert_user\(conn, sub, email, name, image\)/);
        expect(L.never).toBe("Never kept from your CV");
        const personal = backend("src/matching/kept_cv.py").match(/PERSONAL = \(([^)]*)\)/)![1];
        for (const field of ["name", "email", "phone_number", "portfolio", "linkedIn", "professional_summary", "experience", "education"]) {
            expect(personal, field).toContain(`"${field}"`);
        }
    });

    it("promise only the deletes the profile really does: all data at once, or the account", () => {
        // "Delete the skills we kept" removes latest_cvs only; the scan's CV copy (cvs) stays until all data goes.
        const sql = backend("src/database/repositories/user_repository.py");
        for (const table of ["cvs", "analyses", "latest_cvs", "application"]) expect(sql).toContain(`"delete from ${table} where user_id = %s"`);
        expect(L.foot).toBe("In your profile you can delete all your data at once. Deleting your account removes everything.");
        expect(L.foot).not.toMatch(/skills we kept/);
    });
});
