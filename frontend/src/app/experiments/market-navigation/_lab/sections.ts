/*
 * The Market Charts dimensions the navigation experiment rotates through,
 * with small static sample data. The charts are deliberately plain: the
 * experiment judges the navigation, not the charts.
 */

export type Bar = {label: string; value: number; note?: string};

export type Section = {
    id: string;
    name: string;
    /** One line: the question this view answers. */
    question: string;
    kind: "tiles" | "bars" | "bands" | "line";
    bars: Bar[];
};

export const SECTIONS: Section[] = [
    {
        id: "overview", name: "Overview", question: "Where you stand in this scan", kind: "tiles",
        bars: [
            {label: "Postings", value: 58},
            {label: "Of the top 20 skills are yours", value: 5},
            {label: "Gaps asked for by a fifth or more", value: 6},
        ],
    },
    {
        id: "demand", name: "Demand", question: "What companies ask for", kind: "bars",
        bars: [
            {label: "Python", value: 45}, {label: "Go", value: 43}, {label: "Java", value: 31},
            {label: "AWS", value: 28}, {label: "JavaScript", value: 28}, {label: "Observability", value: 24},
        ],
    },
    {
        id: "skills", name: "Skills", question: "Your skills, by how often they are asked for", kind: "bars",
        bars: [
            {label: "Python", value: 45}, {label: "JavaScript", value: 28}, {label: "React", value: 22},
            {label: "TypeScript", value: 22}, {label: "PostgreSQL", value: 12}, {label: "Git", value: 12},
        ],
    },
    {
        id: "experience", name: "Experience", question: "Years of experience the postings ask for", kind: "bars",
        bars: [
            {label: "0–2 years", value: 14}, {label: "3–4 years", value: 38}, {label: "5–7 years", value: 33},
            {label: "8+ years", value: 9}, {label: "Not stated", value: 6},
        ],
    },
    {
        id: "compensation", name: "Compensation", question: "Salary ranges where postings state one", kind: "bands",
        bars: [
            {label: "Junior", value: 48, note: "$38k–$58k"}, {label: "Mid", value: 72, note: "$60k–$85k"},
            {label: "Senior", value: 100, note: "$85k–$120k"}, {label: "Staff", value: 88, note: "$110k–$150k"},
        ],
    },
    {
        id: "trends", name: "Trends", question: "Postings per week, last eight weeks", kind: "line",
        bars: [
            {label: "W1", value: 41}, {label: "W2", value: 44}, {label: "W3", value: 39}, {label: "W4", value: 47},
            {label: "W5", value: 52}, {label: "W6", value: 49}, {label: "W7", value: 55}, {label: "W8", value: 58},
        ],
    },
];
