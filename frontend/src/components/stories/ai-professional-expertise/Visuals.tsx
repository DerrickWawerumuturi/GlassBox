import styles from "./expertise.module.css";

const fields = [
    {name: "Biology & chemistry", glyph: "flask", note: "Problems, experimental setups and verified scientific answers."},
    {name: "Biostatistics", glyph: "chart", note: "Methods, assumptions, interpretation and defensible rubrics."},
    {name: "Aviation", glyph: "radar", note: "Operational context for headings, altitudes, frequencies and clearances."},
    {name: "Law", glyph: "law", note: "Document review and profession-specific reasoning standards."},
    {name: "Psychology", glyph: "mind", note: "Psychological content, ethics and cultural context."},
    {name: "Agriculture & environment", glyph: "leaf", note: "Technical, practical and regulatory knowledge."},
    {name: "Manufacturing", glyph: "quality", note: "Quality scenarios, defect classification and model reasoning."},
    {name: "Engineering", glyph: "cad", note: "Verified simulations and work inside professional software."},
];

function CoverArt() {
    return <figure className={styles.poster}>
        <svg className={styles.posterSvg} viewBox="0 0 1100 560" role="img" aria-labelledby="poster-title poster-desc">
            <title id="poster-title">Professional judgment enters the AI evaluation process</title>
            <desc id="poster-desc">A hand-drawn air traffic controller sits between annotated aviation instructions, a biostatistics rubric and an engineering model. These are symbolic illustrations, not source artifacts.</desc>
            <defs><pattern id="paper-grain" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".55" fill="#75695d" opacity=".18"/><circle cx="6" cy="5" r=".45" fill="#75695d" opacity=".14"/></pattern></defs>
            <rect width="1100" height="560" fill="#e9dfd4"/><rect width="1100" height="560" fill="url(#paper-grain)"/>
            <path d="M42 46h1016M42 505h1016" stroke="#b8a998" strokeWidth="1"/>
            <text x="54" y="35" className={styles.svgMono}>GLASSBOX / PROFESSIONAL EXPERTISE</text>
            <text x="1045" y="35" textAnchor="end" className={styles.svgMono}>PROFESSIONAL JUDGMENT × AI</text>
            {/* aviation evidence card */}
            <g transform="rotate(-5 185 230)"><rect x="62" y="112" width="260" height="206" fill="#fbf8f3" stroke="#b8a998"/><text x="82" y="143" className={styles.svgMono}>AVIATION / MICRO1</text><path d="M82 161h212M82 246h212" stroke="#d1c5b8"/><text x="82" y="190" className={styles.svgSerif}>Headings.</text><text x="82" y="218" className={styles.svgSerif}>Altitudes.</text><text x="82" y="274" className={styles.svgSmall}>CONTEXT CHANGES THE READING</text><path d="M260 181q19 16 0 31m12-38q27 23 0 45" fill="none" stroke="#e0471f" strokeWidth="3" strokeLinecap="round"/></g>
            {/* biostatistics rubric card */}
            <g transform="rotate(4 907 213)"><rect x="800" y="105" width="244" height="220" fill="#fbf8f3" stroke="#b8a998"/><text x="820" y="137" className={styles.svgMono}>BIOSTATISTICS / MICRO1</text><text x="820" y="187" className={styles.svgSerif}>Defensible rubric</text><text x="820" y="216" className={styles.svgSmall}>METHOD · ASSUMPTIONS</text><text x="820" y="237" className={styles.svgSmall}>INTERPRETATION · IMPACT</text><path d="M820 261h202M820 278h166M820 295h186" stroke="#d1c5b8" strokeWidth="2"/></g>
            {/* engineer's cube */}
            <g transform="translate(836 368) rotate(-7)"><path d="M0 30 68 0l72 33-69 35zM0 30v78l70 39V68m0 79 70-38V33" fill="none" stroke="#3d534a" strokeWidth="2.5"/><path d="m0 70 70 39 70-38M35 15l70 34m-70 0v78m70-78v77" fill="none" stroke="#839285" strokeWidth="1.5"/><text x="6" y="172" className={styles.svgMono}>ENGINEERING / SIMULATION</text></g>
            {/* original code-built controller figure */}
            <g className={styles.posterPerson}>
                <path d="M397 495c9-82 23-120 66-144 20-12 55-18 86-17 38 1 74 10 98 33 28 28 37 72 43 128" fill="#293b3d" stroke="#1c292b" strokeWidth="4"/>
                <path d="M466 353c9-35 10-60 7-80h112c-3 23-2 49 12 78l-64 34z" fill="#c68b69" stroke="#553e35" strokeWidth="3"/>
                <path d="M465 242c-4-53 24-86 71-88 52-2 82 32 78 88l-8 70c-10 36-37 56-68 56-35 0-62-25-69-59z" fill="#d9a381" stroke="#553e35" strokeWidth="3"/>
                <path d="M463 244c-8-59 20-105 77-107 52-2 84 32 79 85-19-14-32-36-36-58-29 25-69 36-118 34z" fill="#282726"/>
                <path d="M454 227c-25 14-25 61-6 77m178-75c25 15 24 60 3 77" fill="none" stroke="#e0471f" strokeWidth="10" strokeLinecap="round"/><path d="M454 234c-18 19-17 47 0 62m173-61c19 18 17 46-1 62" fill="none" stroke="#222" strokeWidth="3"/>
                <path d="M472 263q22 10 40 0m41 0q19 9 38-1" fill="none" stroke="#392e29" strokeWidth="3" strokeLinecap="round"/><circle cx="490" cy="274" r="3" fill="#241e1b"/><circle cx="569" cy="274" r="3" fill="#241e1b"/><path d="M516 302q13 8 25 0" fill="none" stroke="#724e41" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M414 420q50-44 103-39 57 4 101 44" fill="none" stroke="#8d9b8e" strokeWidth="3"/><text x="461" y="454" className={styles.svgSmallLight}>EXPERTISE IS THE REFERENCE</text>
            </g>
            <path d="M318 267c36 38 49 54 84 67m251 6c49-15 78-44 116-81" fill="none" stroke="#e0471f" strokeWidth="2.5" strokeDasharray="5 7"/>
            <text x="54" y="542" className={styles.svgSmall}>SYMBOLIC EDITORIAL ILLUSTRATION · NOT A SOURCE DOCUMENT OR RECORDING</text>
            <text x="1045" y="542" textAnchor="end" className={styles.svgMono}>THE EXPERTS BEHIND THE STANDARD</text>
        </svg>
        <figcaption>Code-built editorial illustration. The profession-specific details are drawn from separate cited listings; the collage does not represent one job or original source artifact.</figcaption>
    </figure>;
}

function FieldIcon({kind}: {kind: string}) {
    const common = {fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const};
    return <svg viewBox="0 0 90 70" aria-hidden="true">
        {kind === "flask" && <g {...common}><path d="M34 8h22m-6 0v20l20 31q3 5-4 5H24q-7 0-4-6l20-30V8"/><path d="M29 49h32M35 42l-5 7m25-7 5 7" stroke="#e0471f"/><circle cx="43" cy="54" r="2" fill="#e0471f"/><circle cx="52" cy="53" r="2" fill="#e0471f"/></g>}
        {kind === "chart" && <g {...common}><rect x="17" y="10" width="56" height="50" rx="1"/><path d="M27 22h36M27 32h36M27 42h36M27 52h36M39 18v38M51 18v38"/><path d="m57 45 5 5 10-13" stroke="#e0471f" strokeWidth="3"/></g>}
        {kind === "radar" && <g {...common}><circle cx="43" cy="35" r="26"/><circle cx="43" cy="35" r="16"/><circle cx="43" cy="35" r="6"/><path d="M43 35 67 17" stroke="#e0471f" strokeWidth="3"/><path d="M43 5v8m0 44v8M13 35h8m44 0h8"/></g>}
        {kind === "law" && <g {...common}><path d="M23 9h34l11 11v41H23zM57 9v12h11"/><path d="M31 31h28M31 40h22M31 49h16"/><path d="m53 50 6 6 13-16" stroke="#e0471f" strokeWidth="3"/></g>}
        {kind === "mind" && <g {...common}><path d="M18 14h54v42H18zM27 23a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm-2 22c1-8 17-8 18 0"/><path d="M49 23h15M49 31h15M49 40h15M49 48h9" stroke="#e0471f"/></g>}
        {kind === "leaf" && <g {...common}><path d="M72 10C40 11 17 18 17 43c0 14 11 21 24 16C61 50 70 29 72 10Z"/><path d="M19 62c14-18 27-27 44-40m-31 31-2-14m17 2 11-1" stroke="#e0471f"/></g>}
        {kind === "quality" && <g {...common}><path d="M17 15h43v43H17z"/><path d="M24 23h29M24 31h18M24 39h29M24 47h16"/><circle cx="62" cy="48" r="13"/><path d="m71 58 9 9" stroke="#e0471f" strokeWidth="3"/><path d="m57 48 4 4 7-9" stroke="#e0471f"/></g>}
        {kind === "cad" && <g {...common}><path d="m45 7 30 17v31L45 68 15 52V21zM15 21l30 17 30-14M45 38v30"/><path d="m30 13 30 17v30" stroke="#e0471f" strokeDasharray="3 4"/></g>}
    </svg>;
}

export function ProfessionsPlate() {
    return <figure className={styles.professionsPlate}>
        <div className={styles.professionGrid}>{fields.map((field, i) => <div className={styles.profession} key={field.name}><span className={styles.professionNumber}>0{i + 1}</span><FieldIcon kind={field.glyph}/><strong>{field.name}</strong><p>{field.note}</p></div>)}</div>
        <figcaption>Different disciplines, different standards of correctness. These fields and contributions are summarized from the opportunities described in the article.</figcaption>
    </figure>;
}

export function ExpertisePipeline() {
    const nodes = [
        ["01", "Professional knowledge", "What counts as competent work?"],
        ["02", "Task design", "A difficult, realistic problem."],
        ["03", "Reference solution", "A verified method and result."],
        ["04", "Grading rubric", "Criteria that make judgment explicit."],
        ["05", "AI evaluation", "Does the system meet the standard?"],
    ];
    return <figure className={styles.pipelineFigure}>
        <p className={styles.eyebrow}>FROM PRACTICE TO A TESTABLE STANDARD</p>
        <svg className={styles.pipelineTrack} viewBox="0 0 1000 80" role="img" aria-label="A connected line links five stages from professional knowledge through AI evaluation">
            <path className={styles.trackBase} d="M45 40H955"/><path className={styles.trackFlow} d="M45 40H955"/>
            {nodes.map((node, i) => <g key={node[0]}><circle cx={45 + i * 227.5} cy="40" r="12"/><text x={45 + i * 227.5} y="44" textAnchor="middle">{i + 1}</text></g>)}
        </svg>
        <ol className={styles.pipelineNodes}>{nodes.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        <figcaption>Conceptual synthesis of the work described in the listings; it is not a claim that every provider follows the same process.</figcaption>
    </figure>;
}

export function AviationEvidence() {
    return <figure className={styles.evidencePlate}>
        <div className={styles.evidenceTop}><span className={styles.eyebrow}>AIR TRAFFIC CONTROLLER / MICRO1</span><a href="https://himalayas.app/companies/micro1/jobs/air-traffic-controller" target="_blank" rel="noreferrer">View listing ↗</a></div>
        <p className={styles.reconLabel}>ILLUSTRATIVE RECONSTRUCTION · NOT SOURCE AUDIO</p>
        <div className={styles.atcDiagram}>
            <div className={styles.atcSource}><span>01 / INPUT</span><strong>Authentic radio transmission</strong><small>No audio or waveform reproduced</small></div>
            <svg viewBox="0 0 120 36" aria-hidden="true"><path d="M4 18h108" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 6"/></svg>
            <div className={styles.atcSource}><span>02 / EXPERT CONTEXT</span><strong>Charts + operational knowledge</strong><small>Resolve ambiguous or noisy segments</small></div>
            <svg viewBox="0 0 120 36" aria-hidden="true"><path d="M4 18h108" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 6"/></svg>
            <div className={styles.atcSource}><span>03 / EVALUATION</span><strong>Structured transcript</strong><small>Accuracy target: ≤2% word error rate</small></div>
        </div>
        <div className={styles.evidenceQuotes}>
            <blockquote>“Identify and extract critical instructions—including headings, altitudes, frequencies, and clearances.”</blockquote>
            <blockquote>“Apply your operational experience to clarify ambiguous or noisy audio segments.”</blockquote>
        </div>
        <figcaption>Illustrative process diagram, not a transcription or source artifact. Excerpts are from the linked micro1 opportunity; the listing gives a target of 2% word error rate or lower.</figcaption>
    </figure>;
}

export function CoverPoster() { return <CoverArt />; }
