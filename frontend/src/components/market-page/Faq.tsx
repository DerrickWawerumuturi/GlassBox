import {H2} from "@/components/market-page/StorySections";
import {Answer} from "@/lib/years-answer";

/*
 * Questions this week's count answers, each with its counted answer
 * (lib/market-faq.ts, lib/years-answer.ts). The same pairs go into the
 * page's FAQPage markup, so what search reads is what the page shows.
 */
export default function Faq({items}: {items: Answer[]}) {
    if (!items.length) return null;
    return (
        <section aria-labelledby={"questions"}>
            <H2 id={"questions"}>Questions this count answers</H2>
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
