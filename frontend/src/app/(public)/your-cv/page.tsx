import Link from "next/link";

import {LegalPage, LegalSection} from "@/components/LegalPage";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/your-cv", {
    title: "What happens to your CV",
    description: "Your PDF is read and deleted at once. What we keep, where, and how to delete it.",
});

export default function YourCvPage() {
    return (
        <LegalPage title={"What happens to your CV"} updated={"5 October 2026"}
                   summary={"Your PDF is read, then deleted at once. Here is what happens to what we read from it."}>
            <LegalSection title={"The file"}>
                <li>We never store your PDF. We read its text, then delete the file straight away.</li>
                <li>To read it, we send that text to Groq, an AI service from a US company. It picks out your skills, roles and experience.</li>
            </LegalSection>
            <LegalSection title={"If you are not signed in"}>
                <li>We keep nothing about you on our servers.</li>
                <li>Your results stay in your own browser. Clearing your browser data removes them.</li>
            </LegalSection>
            <LegalSection title={"If you are signed in"}>
                <li>We keep only what matching needs from your latest CV: your skills, the roles you aim for, your level, years of experience, education level, location and the languages you speak.</li>
                <li>Also the file name, the date we read it, and a fingerprint of the text so we know the same CV again.</li>
                <li>We never keep the file or its text. We never keep your name, contact details, links or summary, or the companies, dates and schools on your CV.</li>
                <li>Your years of experience are worked out from your job dates when we read the CV. Then the dates are dropped.</li>
                <li>We also keep your latest scan results and the applications you track.</li>
                <li>A new CV replaces the old one. We keep only the latest.</li>
            </LegalSection>
            <LegalSection title={"Deleting it"}>
                <li>In your profile, under <Link href={"/dashboard/profile#your-data"} className={"underline underline-offset-4"}>Your data</Link>, you can delete the skills we kept, or all your data at once.</li>
                <li>Deleting your account removes everything.</li>
            </LegalSection>
            <p className={"text-sm text-muted-foreground"}>
                The rest of how we handle data is on the <Link href={"/privacy"} className={"underline underline-offset-4"}>privacy page</Link>.
            </p>
        </LegalPage>
    );
}
