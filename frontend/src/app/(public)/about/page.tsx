import {Explainer, Numbers} from "@/components/site/Explainer";
import {lookForPage} from "@/lib/landing/look-server";
import {ABOUT_PAGE as A} from "@/lib/site-copy";
import {COPY, FAMILY_LABEL} from "@/components/landing/copy";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/about", {
    title: "About",
    description: "Why Glassbox exists: job ads list everything, so we count what today's jobs really ask for.",
});

export const revalidate = 300;

/** Two numbers as the site writes them, counted today, for "What we count". */
async function examples(): Promise<string[] | null> {
    const look = await lookForPage();
    const data = look?.families.backend;
    if (!look || !data) return null;
    const [key, n] = Object.entries(data.skills).sort((a, b) => b[1] - a[1])[0] ?? [];
    const label = FAMILY_LABEL.backend;
    return [
        COPY.count.say(data.seniority.junior, data.jobs.toLocaleString("en"), label, "junior"),
        COPY.glass.rarest(look.skills[key] ?? key, n, data.readable.toLocaleString("en"), label),
    ];
}

/** Why Glassbox exists, as a long explainer, then the values. */
export default async function AboutPage() {
    const lines = await examples();
    return (
        <Explainer kicker={A.kicker} title={A.title} dek={A.dek} toc={A.toc} jump={A.jump} sections={A.sections}
                   extra={lines ? {"what-we-count": <Numbers title={A.numbersTitle} lines={lines} />} : undefined}>
            <section className={"flex flex-col gap-4 border-t border-border pt-12"}>
                <h2 className={"font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl"}>{A.valuesTitle}</h2>
                <ul className={"grid gap-3 sm:grid-cols-2"}>
                    {A.values.map((v) => (
                        <li key={v.title} className={"flex flex-col gap-1 rounded-lg border border-border bg-card/50 p-4"}>
                            <span className={"text-[15px] font-medium"}>{v.title}</span>
                            <span className={"text-sm text-muted-foreground"}>{v.body}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </Explainer>
    );
}
