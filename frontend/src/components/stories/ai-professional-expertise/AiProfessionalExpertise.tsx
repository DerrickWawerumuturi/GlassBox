import styles from "./expertise.module.css";
import ArticleControls, {ArticleCvCta} from "./ArticleControls";
import TaskExplorer from "./TaskExplorer";
import {AviationEvidence, CoverPoster, ExpertisePipeline, ProfessionsPlate} from "./Visuals";

const sources = [
    ["Biostatistician", "https://himalayas.app/companies/micro1/jobs/biostatistician-7919772797"],
    ["Business Operations Expert", "https://himalayas.app/companies/micro1/jobs/business-operations-expert"],
    ["Air Traffic Controller", "https://himalayas.app/companies/micro1/jobs/air-traffic-controller"],
    ["Agriculture, Forestry and Environmental Experts", "https://himalayas.app/companies/micro1/jobs/agriculture-forestry-environmental-experts"],
    ["Invisible Technologies — Garment Manufacturing QC", "https://himalayas.app/companies/inv/jobs/garment-manufacturing-qc-specialist-freelance-ai-trainer-project"],
    ["Mindrift — CAD Engineer", "https://apply.workable.com/toloka-ai/j/26CED2CFCA"],
    ["Mindrift — CFD Engineer", "https://apply.workable.com/toloka-ai/j/36F55997E3"],
    ["Mindrift — How projects work", "https://mindrift.ai/how"],
    ["micro1", "https://www.micro1.ai/experts"],
    ["Anyone AI", "https://jobs.anyoneai.com/"],
    ["Welo Global", "https://www.welocalize.com/"],
] as const;

function Sources({items}: {items: readonly (readonly [string, string])[]}) {
    return <p className={styles.sources}>Sources: {items.map(([label, href], i) => <span key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a>{i < items.length - 1 ? " · " : ""}</span>)}</p>;
}

export default function AiProfessionalExpertise({fonts}: {fonts: string}) {
    return <main className={`${styles.story} ${fonts}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb"><a href="/market">Market</a><span aria-hidden="true"> / </span><span>Investigation</span></nav>

        <header className={styles.hero}>
            <p className={styles.kicker}>GLASSBOX INVESTIGATION <span>·</span> PROFESSIONAL EXPERTISE</p>
            <h1>The Experts Being Recruited to Teach AI Their Professions</h1>
            <p className={styles.dek}>Air traffic controllers, biostatisticians, lawyers and engineers are being recruited to create the problems, reference answers and professional standards used to train and evaluate AI systems.</p>
            <CoverPoster />
        </header>

        <div className={styles.articleShell}>
        <ArticleControls />
        <article id="article-content" className={styles.article}>
            <section id="introduction" className={styles.intro}>
            <p className={styles.lead}>An AI system can produce a convincing explanation of a clinical trial. It can generate a set of engineering calculations. It can even transcribe a conversation between an aircraft and an air traffic controller.</p>
            <p>But how do you know whether any of it is right?</p>
            <p>In these opportunities, AI companies turn to people who already know the answer.</p>
            <p>Job and project descriptions from specialist AI training providers reveal an unusual category of work: recruiting experienced professionals to create difficult problems, verify solutions, annotate specialist data and evaluate AI systems against the standards of their professions.</p>
            <p>A biostatistician is asked to construct clinical-trial evaluation tasks and define detailed grading criteria. An air traffic controller is recruited to interpret real aviation radio transmissions. An engineer is asked to test whether an AI agent can complete work inside professional CAD software.</p>
            <p>The professionals are not necessarily being recruited to build AI. They are being recruited because they understand the work AI is expected to perform.</p>
            </section>
            <ArticleCvCta where="story_ai_professional_expertise_intro" />

            <section id="right-answer"><h2>1. Before AI can be judged, someone has to define the right answer</h2>
                <p>Consider the work requested of a micro1 Biostatistician.</p>
                <p>The opportunity asks for specialists who can create evaluation tasks based on clinical-trial analysis, regulatory submissions and observational studies. Contributors are expected to construct or source datasets, define appropriate methodologies, provide defensible interpretations and develop detailed rubrics for evaluating AI agents.</p>
                <p>The description calls for 35+ item rubrics.</p>
                <p>That detail matters. Evaluating a statistical answer is not simply a matter of checking whether a final number matches a reference. The method, assumptions, interpretation and clinical implications can all affect whether the result is defensible.</p>
                <p>A separate Business Operations Expert opportunity follows a similar idea outside science. Experienced practitioners are asked to design realistic, multi-step business tasks, supply supporting materials and define objective grading criteria.</p>
                <p>In both cases, the specialist is helping establish what competent work looks like.</p>
                <blockquote>The output is not just training material. It is a standard against which an AI system can be assessed.</blockquote>
                <Sources items={sources.slice(0, 2)} />
            </section>

            <section id="professional-context"><h2>2. Some knowledge cannot be recovered from the words alone</h2>
                <p>One of the clearest examples comes from aviation.</p>
                <p>A micro1 Air Traffic Controller opportunity asks current or former certified controllers to listen to authentic air traffic control radio transmissions and produce accurate, structured transcripts.</p>
                <p>The work involves identifying headings, altitudes, frequencies and clearances. Contributors are also expected to use contextual resources such as airport diagrams and approach charts to resolve ambiguous or noisy audio.</p>
                <p>The distinction is important: a transcription system might recognise the words in a transmission, but interpreting what those words mean requires familiarity with aviation communications and operational context.</p>
                <p>The listing specifies a demanding transcription accuracy target, including a stated word-error-rate threshold of 2% or lower.</p>
                <p>Other specialist opportunities ask people with agricultural, forestry and environmental experience to review datasets and scenarios using their technical and regulatory knowledge.</p>
                <p>In manufacturing, an Invisible Technologies Garment Manufacturing Quality Control project asks experienced practitioners to assess factory quality scenarios, defect classifications and model reasoning.</p>
                <p>These examples point to a different use of expertise: supplying the context that turns raw information into meaningful, reliable data.</p>
                <AviationEvidence />
                <Sources items={sources.slice(2, 5)} />
            </section>

            <section id="professional-tasks"><h2>3. Some opportunities ask AI to perform professional tasks</h2>
                <p>These engineering projects ask a different question.</p>
                <p>Mindrift's specialist engineering projects involve testing AI agents inside the software environments engineers actually use.</p>
                <p>Its CAD Engineer opportunity asks contributors to design tasks, create reference solutions and evaluate agents operating in CAD software.</p>
                <p>Its Computational Fluid Dynamics project involves setting up simulations, producing verified reference solutions and creating Python checks to assess an agent's work.</p>
                <p>The point is not simply whether an AI model can explain how a simulation works. It is whether an agent can execute the task, use the tools correctly and produce a result that an experienced engineer would accept.</p>
                <p>This changes the evaluation problem.</p>
                <p>A chatbot answer can be compared with a reference response. A professional workflow may require checking multiple steps, intermediate outputs, tool interactions and the final result.</p>
                <p>The expert is therefore evaluating more than language. They are evaluating work.</p>
                <ExpertisePipeline />
                <Sources items={sources.slice(5, 7)} />
            </section>

            <section id="disciplines"><h2>4. The professions extend far beyond software and AI</h2>
                <p>The opportunities reviewed span disciplines with very different definitions of correctness.</p>
                <div className={styles.fieldTable} role="region" aria-label="Professional fields and their contribution" tabIndex={0}><table><thead><tr><th>Professional field</th><th>What the expertise contributes</th></tr></thead><tbody>
                    <tr><td>Biology and chemistry</td><td>Difficult scientific problems and verified solutions</td></tr><tr><td>Biostatistics</td><td>Statistical methodology, datasets and evaluation rubrics</td></tr><tr><td>Aviation</td><td>Context-aware interpretation of operational communications</td></tr><tr><td>Law</td><td>Legal document review and evaluation of legal reasoning</td></tr><tr><td>Psychology</td><td>Assessment of psychological content, ethics and cultural context</td></tr><tr><td>Agriculture and environmental science</td><td>Technical, practical and regulatory knowledge</td></tr><tr><td>Manufacturing</td><td>Quality-control scenarios and defect assessment</td></tr><tr><td>Engineering</td><td>Verified simulations and professional software workflows</td></tr>
                </tbody></table></div>
                <ProfessionsPlate />
                <TaskExplorer />
                <p>The breadth is notable because many of these descriptions do not require applicants to have previously worked in AI.</p>
                <p>They require substantial experience in the profession itself.</p>
                <p>That suggests a route into AI-related project work that does not begin with becoming a machine-learning engineer. A specialist may contribute through the knowledge accumulated in a career in law, healthcare, engineering, science or operations.</p>
                <p>It is not necessarily an easy route, however. Some opportunities require postgraduate qualifications, professional certification, active licences or several years of direct experience.</p>
            </section>

            <ArticleCvCta where="story_ai_professional_expertise_midpoint" />

            <section id="project-work"><h2>5. Being recruited does not always mean getting a job</h2>
                <p>There is an important distinction behind these opportunities.</p>
                <p>Many are freelance projects rather than conventional salaried positions.</p>
                <p>Mindrift describes its work as project-based freelance activity, with no employment contract or guaranteed working hours. Contributors are generally paid for accepted tasks.</p>
                <p>micro1's expert platform uses a certification and matching process. Becoming eligible for a project does not guarantee immediate placement or a steady flow of assignments.</p>
                <p>Anyone AI's specialist opportunities also include finite project engagements. Its biology listing, for example, describes a two-month project with the possibility of extension.</p>
                <p>Other programmes, such as Welo Global's AI Trainers Network, are contributor networks rather than confirmed active vacancies.</p>
                <p>These differences matter. A professional joining a talent network, qualifying for project matching and securing a paid assignment are three different stages.</p>
                <p>The listings show that this work exists. They do not establish how many people are earning from it, how consistently projects are available or whether the work can replace a full-time job.</p>
                <figure className={styles.comparison}>
                    <div><span className={styles.eyebrow}>PROJECT / CONTRIBUTOR WORK</span><strong>Freelance task</strong><p>Paid for accepted work; hours and flow may vary.</p></div>
                    <span aria-hidden="true">≠</span>
                    <div><span className={styles.eyebrow}>EMPLOYMENT</span><strong>Salaried position</strong><p>Employment contract and role conditions.</p></div>
                    <figcaption>These listings include different engagement types. Joining a network or qualifying for matching does not guarantee paid work.</figcaption>
                </figure>
                <Sources items={sources.slice(7)} />
            </section>

            <section id="professional-judgment"><h2>6. Professional judgment is part of AI development</h2>
                <p>The most interesting part of these opportunities is not that AI companies need more people to label data.</p>
                <p>It is the kind of work they are asking professionals to do.</p>
                <p>They need people who can construct a difficult scientific problem, recognise an invalid statistical method, interpret a specialised radio transmission, assess a legal argument or determine whether an engineering simulation is trustworthy.</p>
                <p>These are forms of judgment developed through professional practice. They are difficult to reduce to a collection of generic instructions.</p>
                <p>When an AI system is asked to complete a professional task, a good result must reflect the standards of the profession in which that result will be used.</p>
                <p>The job descriptions offer a glimpse of the people being brought into that process.</p>
                <p>They are not necessarily building the models. They are helping establish what the models should be able to do — and how anyone can tell whether they have done it correctly.</p>
            </section>

            <footer className={styles.end}><h2 id="methodology">How we investigated this</h2>
                <p>This investigation reviewed specialist job and project descriptions collected in Glassbox's job data, then checked representative opportunities against publicly accessible provider listings and project pages.</p>
                <p>We included roles where the descriptions explicitly connected professional expertise to AI training, evaluation, benchmarking, specialist data creation or assessment of AI-generated work.</p>
                <p>We treated regional versions of the same project as one underlying opportunity rather than separate roles. We excluded generic annotation opportunities and listings that mentioned AI without describing a meaningful specialist contribution.</p>
                <p>The examples are not a census of the AI training labour market. A published project listing is not proof that a position has been filled, that work is continuously available or that a contributor will receive a guaranteed income. Project status, eligibility and compensation can change.</p>
                <p>Glassbox's findings document examples of this work, not its total size.</p>
                <h2 id="conclusion" className={styles.lastTitle}>The point isn’t to count AI mentions. It’s to understand the work.</h2>
                <p>A job description is an account of expected work. A skill profile is our interpretation of that account.</p>
                <p>They’re not the same thing.</p>
                <p>At Glassbox, we’re trying to make the technology job market easier to understand by counting what employers ask for and showing how those requirements relate to your skills.</p>
                <p className={styles.signoff}>We show, you decide.</p>
                <p>Explore the job market at <a href="https://seeglassbox.com">seeglassbox.com</a>.</p>
                <ArticleCvCta where="story_ai_professional_expertise_end" prominent />
            </footer>
        </article>
        </div>
    </main>;
}
