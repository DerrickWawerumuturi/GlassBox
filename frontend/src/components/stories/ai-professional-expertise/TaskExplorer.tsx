"use client";

import {useState} from "react";
import styles from "./expertise.module.css";

const tasks = [
    {name: "Biostatistician", expertise: "Clinical-trial analysis, regulatory submissions and observational studies.", task: "Create evaluation tasks, source datasets, and define methods and interpretations.", standard: "A detailed rubric evaluates methodological rigor and clinical reasoning.", source: "micro1 listing", href: "https://himalayas.app/companies/micro1/jobs/biostatistician-7919772797"},
    {name: "Air traffic controller", expertise: "Current or former ATC certification is preferred; operational phraseology matters.", task: "Transcribe authentic radio and identify headings, altitudes, frequencies and clearances.", standard: "The listing gives a target of 2% word error rate or lower.", source: "micro1 listing", href: "https://himalayas.app/companies/micro1/jobs/air-traffic-controller"},
    {name: "CAD / CFD engineer", expertise: "Senior CAD or computational-fluid-dynamics engineering practice.", task: "Design tasks for agents working in CAD or CFD software.", standard: "Assess tool use, intermediate work and the final result against a reference.", source: "Mindrift project pages", href: "https://mindrift.ai/how"},
    {name: "Business operations expert", expertise: "Experienced operations practitioners.", task: "Design realistic, multi-step business tasks with supporting materials.", standard: "Objective criteria should let qualified reviewers reach the same verdict.", source: "micro1 listing", href: "https://himalayas.app/companies/micro1/jobs/business-operations-expert"},
];

export default function TaskExplorer() {
    const [active, setActive] = useState(0);
    const task = tasks[active];
    return <section className={styles.taskExplorer} aria-labelledby="task-explorer-title">
        <p className={styles.eyebrow}>INTERACTIVE / COMPARE THE WORK</p><h3 id="task-explorer-title">The expert changes. So does the test.</h3>
        <div className={styles.taskChoices} role="group" aria-label="Choose a professional example">
            {tasks.map((item, i) => <button type="button" key={item.name} aria-pressed={active === i} onClick={() => setActive(i)}>{item.name}</button>)}
        </div>
        <div className={styles.taskDetail} aria-live="polite" aria-atomic="true">
            <span className={styles.taskSource}>{task.source} · {String(active + 1).padStart(2, "0")}/{String(tasks.length).padStart(2, "0")}</span>
            <dl><div><dt>Professional expertise</dt><dd>{task.expertise}</dd></div><div><dt>AI task</dt><dd>{task.task}</dd></div><div><dt>Evaluation standard</dt><dd>{task.standard}</dd></div></dl>
            <a href={task.href} target="_blank" rel="noreferrer">Open the cited source ↗</a>
        </div>
        <p className={styles.caption}>Summaries are based on the linked project descriptions. Wording is condensed; requirements vary by opportunity.</p>
    </section>;
}
