import {fmt} from "@/lib/market-page";
import {bucketPhrase, Ctx, has, skillsCount, topBucket} from "@/lib/market-story";
import {Answer, yearsAnswer, yearsCounts} from "@/lib/years-answer";

/*
 * A market page's questions and answers, shown on the page and as FAQPage
 * markup. Each answer is a count from this week's data, written by a
 * template; a question the data can't answer this week is left out, never
 * answered without a number. No answer tells anyone what to do. The week is
 * said once, under the heading (Faq.tsx); the FAQPage markup adds it to each
 * answer (seo.ts).
 */

export const MAX_FAQ = 4;

export function marketFaq(c: Ctx): Answer[] {
    const {info, page} = c, story = page.story, subject = `${info.subject} jobs`;
    const out: Answer[] = [];
    const skills = skillsCount(c, subject);
    if (skills) out.push({q: `What skills do ${subject} ask for most?`, a: skills});
    if (info.kind === "entry") {
        // The page's own years answer themselves (it takes in jobs requiring two years or less): the early career titles answer instead.
        const years = yearsCounts(page);
        if (years) out.push({q: `How many years of experience do ${subject} ask for?`, a: yearsAnswer(years)});
    } else if (has(c, "years")) {
        const b = topBucket(c), y = story.years;
        out.push({q: `How many years of experience do ${subject} ask for?`,
            a: `${fmt(b.jobs)} of the ${fmt(y.stated)} ${subject} that state a number ask for ${bucketPhrase(b.from, b.to)}. The other ${fmt(y.unstated)} don't say.`});
    }
    if (has(c, "languages")) {
        const [, , two, three] = story.languages.per_job;
        out.push({q: `How many ${subject} name more than one programming language?`,
            a: `${fmt(two + three)} of the ${fmt(page.readable)} ${subject} we read name two or more languages.`});
    }
    if (page.jobs) out.push({q: `How many ${subject} are remote?`,
        a: `${fmt(page.remote)} of the ${fmt(page.jobs)} ${subject} are marked remote by their job board.`});
    return out.slice(0, MAX_FAQ);
}
