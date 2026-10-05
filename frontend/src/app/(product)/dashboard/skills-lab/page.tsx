import {notFound} from "next/navigation";

import SkillsLab from "./_lab/SkillsLab";

/*
 * Development-only lab for the skills page: four concepts built on the
 * user's real scan, inside the real dashboard. The live Skill gaps page is
 * untouched. Production returns 404, so a commit cannot ship it.
 */
export default function SkillsLabPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <SkillsLab />;
}
