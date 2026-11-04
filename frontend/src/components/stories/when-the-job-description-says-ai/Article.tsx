import Image from "next/image";
import Link from "next/link";

import shared from "@/components/stories/story.module.css";
import {cn} from "@/lib/utils";
import s from "./article.module.css";

const TITLE = "When the Job Description Says AI, but the Data Doesn’t";

function Figure({src, width, height, alt, source, className}: {
    src: string; width: number; height: number; alt: string; source: string; className?: string;
}) {
    return (
        <figure className={cn(s.figure, className)}>
            <Image src={src} width={width} height={height} alt={alt} sizes="(max-width: 1144px) calc(100vw - 44px), 1100px" priority={src.includes("opening-")} />
            <figcaption>{source}</figcaption>
        </figure>
    );
}

export default function WhenTheJobDescriptionSaysAi({fonts}: {fonts: string}) {
    return (
        <main className={cn(shared.story, fonts, s.root)}>
            <nav aria-label={"Breadcrumb"} className={shared.crumbs}>
                <Link href={"/market"}>Market</Link> / <Link href={"/market/entry-level-software"}>Entry level software</Link> / <span aria-current={"page"}>{TITLE}</span>
            </nav>
            <article>
                <header className={cn(s.col, s.hero)}>
                    <h1>{TITLE}</h1>
                </header>
                <div className={s.col}>
                    <p className={s.lead}>44.3% of conventional software engineering jobs in our dataset had at least one AI-related skill in their extracted profiles.</p>
                    <p>That’s a lot of AI for jobs that aren’t explicitly AI engineering roles.</p>
                    <p>Now, before anyone gets excited, a few things.</p>
                    <p>Our dataset isn’t the entire job market. These are job records in Glassbox’s current dataset, not a representative survey of every software engineering role. And a skill appearing in an extracted profile doesn’t necessarily mean an employer requires it.</p>
                    <p>We know. We’re the ones who counted it.</p>
                </div>
                <Figure
                    src={"/stories/ai-job-description/opening-graphic.png"}
                    width={1440}
                    height={760}
                    alt={"44.3% of conventional software job profiles contained at least one selected AI-related skill. The count covers 6,439 conventional software engineering job records."}
                    source={"Glassbox dataset: 6,439 conventional software engineering job records."}
                    className={s.openingFigure}
                />
                <div className={s.col}>
                    <p>Still, the number raises a useful question: when a software engineering job mentions AI, what does that actually mean you’ll be doing?</p>

                    <h2>First, the numbers</h2>
                    <p>We looked at 6,439 conventional software engineering job records with non-empty descriptions. Of those, 2,851 had at least one of ten selected AI-related skills in their extracted profiles.</p>
                    <p>That’s 44.3%.</p>
                    <p>The most frequently extracted mentions included:</p>
                    <ul>
                        <li>Machine learning: 1,137 jobs</li>
                        <li>LLMs: 1,119 jobs</li>
                        <li>AI agents: 984 jobs</li>
                        <li>AI assistants: 833 jobs</li>
                        <li>RAG: 305 jobs</li>
                    </ul>
                    <p>These categories can overlap. A job can mention several of them, and the counts measure extracted skill mentions, not unique jobs requiring each skill.</p>
                    <p>And here’s the important distinction: a mention isn’t automatically a requirement. It could appear under required skills, preferred skills, or skills merely mentioned in the description.</p>
                    <p>So we went beyond the aggregate counts.</p>

                    <h2>We read 30 job descriptions</h2>
                    <p>We examined a deliberately balanced sample of 30 descriptions: 15 whose extracted profiles contained at least one of our selected AI-related skills, and 15 whose profiles contained none.</p>
                    <p>We balanced the groups across backend, frontend, full-stack, and general software engineering roles, and used distinct employers. This is a small, structured sample, not a representative random sample of the entire dataset.</p>
                    <p>Here’s what stood out.</p>
                    <p>Among the 15 descriptions whose profiles contained AI-related skills, 8 explicitly discussed using AI tools in engineering work.</p>
                    <p>Among the 15 with no selected AI-related skills in their profiles, 3 still explicitly discussed using AI tools.</p>
                    <p>That second finding matters.</p>
                </div>
                <Figure
                    src={"/stories/ai-job-description/comparison-graphic.png"}
                    width={1440}
                    height={1142}
                    alt={"Two groups of 15 job descriptions. In the group with selected AI-related profile skills, 8 of 15 (53.3%) discussed AI-tool use. In the group with none, 3 of 15 (20.0%) did. The sample is deliberately balanced and is not representative of the overall job market."}
                    source={"Glassbox sample: 30 conventional software engineering job descriptions. Deliberately balanced; not representative of the overall job market."}
                    className={s.comparisonFigure}
                />
                <div className={s.col}>
                    <p>A job description can talk about using AI in the engineering workflow without our extraction system recording one of the selected AI-related skills. That could reflect a gap in our vocabulary, a limitation in extraction, or both. We can’t establish the exact cause from these examples alone.</p>
                    <p>But it shows why we shouldn’t treat an extracted skill profile as a perfect substitute for reading the original description.</p>

                    <h2>Three very different meanings of “AI”</h2>
                    <p>When a software engineering job mentions AI, it can be describing very different kinds of work.</p>
                    <ol className={s.meanings}>
                        <li>
                            <h3>Building a product that uses AI</h3>
                            <p>You might build an application with an AI assistant, integrate an LLM into an existing product, or develop a feature that uses retrieval-augmented generation.</p>
                            <p>Here, AI is part of what the product does.</p>
                        </li>
                        <li>
                            <h3>Using AI tools to do engineering work</h3>
                            <p>You might use AI coding assistants to explore unfamiliar code, speed up implementation, improve your development workflow, or help with debugging.</p>
                            <p>Here, AI is a tool you use to do the job. It doesn’t necessarily mean you’re building AI systems.</p>
                        </li>
                        <li>
                            <h3>Building or operating AI systems</h3>
                            <p>You might work on model serving, machine learning infrastructure, evaluation, or the systems that make AI applications reliable in production.</p>
                            <p>Here, AI systems themselves are the engineering work.</p>
                        </li>
                    </ol>
                    <p>These categories can overlap, but they aren’t interchangeable. A developer who uses an AI coding assistant isn’t automatically an ML engineer. And a developer integrating an LLM into a product isn’t necessarily training models.</p>
                    <p>The distinction matters when you’re deciding what to learn, which roles to apply for, and how to interpret a long list of skills in a job advert.</p>

                    <h2>What the sample actually showed</h2>
                    <p>In our 30-description sample, the descriptions with AI-related profile skills were not all describing the same kind of work.</p>
                    <p>Some were about building AI products. Others explicitly described using AI tools in the development workflow. Some had no substantive AI responsibility that we could identify from the description, and a few were unclear.</p>
                    <p>The group without selected AI-related profile skills also wasn’t entirely free of AI-related work. Three descriptions explicitly discussed using AI tools, despite having none of our selected AI keys in their extracted profiles.</p>
                    <p>This is why the headline percentage needs context. It tells us how often these selected skills appeared in our extracted profiles. It doesn’t tell us that 44.3% of conventional software engineering jobs are AI jobs, or that every one of those roles requires AI expertise.</p>
                    <p>That would be a much bigger claim than our data supports.</p>

                    <h2>So, what should a job seeker take away?</h2>
                    <p>Don’t panic when a conventional software engineering role mentions AI. Read the description and look for the actual responsibility.</p>
                    <p>Ask yourself:</p>
                    <ul>
                        <li>Are they asking me to build AI-powered features? Look for product integrations, LLM applications, retrieval systems, and related engineering work.</li>
                        <li>Are they asking me to use AI tools? Look for descriptions of coding assistants, AI-supported workflows, and developer productivity.</li>
                        <li>Are they asking me to build AI infrastructure or models? Look for model serving, ML systems, evaluation, training, and operations.</li>
                    </ul>
                    <p>Then compare those responsibilities with your existing skills and experience. A long list of AI-related terms doesn’t automatically mean you need to become a machine learning researcher before applying.</p>
                    <p>It does mean you should understand what the employer is actually asking you to do.</p>

                    <h2>What this doesn’t prove</h2>
                    <p>This is a snapshot of Glassbox’s current dataset. It doesn’t establish how these mentions have changed over time, whether AI is replacing particular engineering responsibilities, or whether every employer means the same thing when it mentions AI.</p>
                    <p>Our sample is also small and deliberately balanced, so its proportions shouldn’t be projected onto the entire job market.</p>
                    <p>What it does show is a measurement problem worth taking seriously: the words in a job description, the skills extracted from it, and the work a person will actually do are three different things.</p>
                    <p>A separate working paper by Tom Harris, <a href={"https://doi.org/10.2139/ssrn.7608062"} target={"_blank"} rel={"noreferrer"}>The New Work of Generative AI: Evidence from 18 Million Duty Statements in US Job Postings</a>, examines millions of US job-posting duty statements over time. It distinguishes new AI-related work activities from familiar tasks performed with new tools. That broader research offers useful context, but it uses a different dataset and methodology; it doesn’t validate or directly explain Glassbox’s percentages.</p>
                    <p>The point isn’t to count AI mentions. It’s to understand the work.</p>
                    <p>A job description is an account of expected work. A skill profile is our interpretation of that account.</p>
                    <p>They’re not the same thing.</p>
                    <p>At Glassbox, we’re trying to make the technology job market easier to understand by counting what employers ask for and showing how those requirements relate to your skills.</p>
                    <p>We show, you decide.</p>
                    <p className={s.explore}>Explore the job market at <a href={"https://seeglassbox.com"}>seeglassbox.com</a>.</p>
                </div>
            </article>
        </main>
    );
}
