import {H2} from "@/components/market-page/StorySections";
import {Answer} from "@/lib/years-answer";

/*
 * Questions the page answers, each with its counted answer (lib/market-faq.ts,
 * lib/years-answer.ts). The week is said once, under the heading; the page's
 * FAQPage markup carries the same pairs with the week added to each answer
 * (seo.ts), so a search snippet stays dated.
 */
export default function Faq({items, week}: {items: Answer[]; week: string}) {
    if (!items.length) return null;
    return (
        <section aria-labelledby={"questions"}>
            <H2 id={"questions"}>Questions this page answers</H2>
            <p className={"m-0 mb-2 font-mono text-[12px] text-muted-foreground"}>Answers from the week of {week}.</p>
            <dl className={"m-0"}>
                {items.map(({q, a}) => (
                    <div key={q} className={"border-t border-border py-4"}>
                        <dt className={"m-0 mb-1.5 font-heading text-[18px] font-bold leading-[1.3]"}>{q}</dt>
                        <dd className={"m-0 font-read text-[18px] leading-[1.6] sm:text-[19px]"}>{a}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
