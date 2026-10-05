# 2026-10-05 — Copy audit applied: "jobs", every number named, no hyphens

**Files:** about 35 across `frontend/src` (Market, Overview, Opportunities,
Applications, the anonymous `/analysis` pages, landing, metadata); test
`lib/copy-words.test.ts`. Source: `docs/local/copy-audit.html` (120 strings,
founder approved all).

- **"Jobs", never "postings"** in UI copy. `copy-words.test.ts` reads every
  string literal and JSX text under `src` and fails on posting/postings;
  identifiers and comments are ignored.
- **Every number names what it counts:** "8 of the 20 skills jobs ask for
  most are on your CV", "58 jobs read in this scan", "Show all 20 skills",
  "3 applications waiting on a reply".
- **No hyphenated compounds** (founder's caveat): most-asked/most-wanted
  became "top", nice-to-have "optional", best-fit "closest", colour-coded
  "coloured", sign-in "sign in", re-upload "upload my CV", job-hunt "job hunt".
- **Brand rule "no 1st":** the lime "1st" badge is gone from the demand
  chart (Market overview and Demand); its prop and reserve went with it.
  Overview's "Worth learning next" is now "Not on your CV yet".
- **Plainer lines** where the audit asked: "High priority / Medium priority"
  became "Asked for most / Asked for often"; em-dash asides became sentences.
- `ChartPanel` lost its `unit` prop: every panel says "jobs" now.
- Skipped: rows for the deleted skills lab, SkillStrip and the old Skill gaps
  table.
