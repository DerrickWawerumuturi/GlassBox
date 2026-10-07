import Link from "next/link";

import {LegalPage, LegalSection} from "@/components/LegalPage";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/privacy", {
    title: "Privacy",
    description: "What Glassbox keeps, where it lives, who else sees it, and how to delete it.",
});

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
    return (
        <LegalPage title={"Privacy"} updated={"7 October 2026"}
                   summary={"What we keep, where it lives, who else sees it, and how to delete it."}>
            <LegalSection title={"Your CV"}>
                <li>We never store your PDF. We read it and delete it at once.</li>
                <li>Its text goes to Groq, an AI service from a US company, to read your skills and experience.</li>
                <li>The details are on <Link href={"/your-cv"} className={"underline underline-offset-4"}>What happens to your CV</Link>.</li>
            </LegalSection>
            <LegalSection title={"What we keep"}>
                <li>Not signed in: nothing on our servers. Your results stay in your browser.</li>
                <li>Signed in: what matching needs from your latest CV (skills, the roles you aim for, level, years of experience, education level, location and languages), your latest scan and the applications you track.</li>
                <li>We never keep your CV&apos;s name, contact details, links or summary, or its companies, dates and schools.</li>
                <li>Our database is in the EU: Neon, in Frankfurt.</li>
            </LegalSection>
            <LegalSection title={"Signing in"}>
                <li>You sign in with Google. We get your name, email address and profile picture, nothing else.</li>
            </LegalSection>
            <LegalSection title={"Analytics"}>
                <li>We use PostHog, a US service, to count which pages people open and a few steps, like a scan starting and finishing.</li>
                <li>On the first page you open, it also gets the name of the site that sent you, like reddit.com, and any campaign tags in the link. Never the full link.</li>
                <li>No cookies and no screen recordings. We respect Do Not Track.</li>
                <li>It never receives your CV, its file name or your skills.</li>
            </LegalSection>
            <LegalSection title={"Fonts"}>
                <li>We serve our own fonts, so your browser makes no requests to Google Fonts.</li>
            </LegalSection>
            <LegalSection id={"your-choices"} title={"Your choices"}>
                <li>In your profile, under <Link href={"/dashboard/profile#your-data"} className={"underline underline-offset-4"}>Your data</Link>, you can delete the skills we kept, or all your data at once.</li>
                <li>Deleting your account removes everything.</li>
                {CONTACT && <li>Questions: <a href={`mailto:${CONTACT}`} className={"underline underline-offset-4"}>{CONTACT}</a>.</li>}
            </LegalSection>
        </LegalPage>
    );
}
