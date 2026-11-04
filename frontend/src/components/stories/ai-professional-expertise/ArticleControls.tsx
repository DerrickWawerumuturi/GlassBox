"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

import CompareCv from "@/components/cv-ask/CompareCv";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {type CtaPlace, track} from "@/lib/analytics";
import styles from "./expertise.module.css";

const sections = [
    ["introduction", "Introduction"], ["right-answer", "Define the answer"], ["professional-context", "Context matters"],
    ["professional-tasks", "Professional tasks"], ["disciplines", "Fields of expertise"], ["project-work", "Project or job?"],
    ["professional-judgment", "Professional judgment"], ["methodology", "How we investigated"], ["conclusion", "Conclusion"],
] as const;

type ArticleWhere = "story_ai_professional_expertise_intro" | "story_ai_professional_expertise_midpoint" | "story_ai_professional_expertise_end" | "story_ai_professional_expertise_sidebar";

export function ArticleCvCta({where, compact = false, prominent = false, className = ""}: {where: ArticleWhere; compact?: boolean; prominent?: boolean; className?: string}) {
    const router = useRouter();
    const scan = useCvScan({from: where, onDone: () => router.push("/analysis")});
    return <section className={`${styles.articleCta} ${compact ? styles.ctaCompact : ""} ${prominent ? styles.ctaProminent : ""} ${className}`} aria-label="Compare your CV with current job requirements">
        <div><p className={styles.ctaQuestion}>Where do your skills stand in today’s job market?</p>
            {!compact && <p className={styles.ctaCopy}>Glassbox compares the skills on your CV with the skills employers are requesting, so you can see where they overlap.</p>}</div>
        <CompareCv where={where} scanning={scan.scanning} onClick={() => {track("cta_clicked", {where}); scan.open();}} className={styles.ctaButton} />
        {scan.sheet}
    </section>;
}

export default function ArticleControls() {
    const [active, setActive] = useState<string>(sections[0][0]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const update = () => {
            const article = document.getElementById("article-content");
            if (!article) return;
            const articleTop = window.scrollY + article.getBoundingClientRect().top;
            const articleLength = Math.max(1, article.offsetHeight - window.innerHeight);
            const nextProgress = Math.round(Math.max(0, Math.min(100, ((window.scrollY - articleTop) / articleLength) * 100)));
            setProgress((old) => old === nextProgress ? old : nextProgress);
            let current: string = sections[0][0];
            for (const [id] of sections) {
                const heading = document.getElementById(id);
                if (heading && heading.getBoundingClientRect().top <= 170) current = id;
            }
            setActive((old) => old === current ? old : current);
        };
        update();
        window.addEventListener("scroll", update, {passive: true});
        window.addEventListener("resize", update);
        return () => {window.removeEventListener("scroll", update); window.removeEventListener("resize", update);};
    }, []);

    const progressBar = <div className={styles.readingProgress} role="progressbar" aria-label="Article reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width: `${progress}%`}} /></div>;
    const links = <ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={(event) => {setActive(id); const details = event.currentTarget.closest("details"); if (details) details.open = false;}}>{label}</a></li>)}</ol>;

    return <aside className={styles.articleNavigation} aria-label="Article navigation">
        <div className={styles.desktopNav}>
            <p className={styles.navLabel}>IN THIS INVESTIGATION</p>{progressBar}<p className={styles.navProgress}>{Math.round(progress)}% read</p><nav>{links}</nav>
            <ArticleCvCta where="story_ai_professional_expertise_sidebar" compact className={styles.navCta} />
        </div>
        <div className={styles.mobileNav}>
            {progressBar}<details><summary><span>On this page</span><span>{sections.find(([id]) => id === active)?.[1]}</span></summary><nav>{links}</nav></details>
        </div>
    </aside>;
}
