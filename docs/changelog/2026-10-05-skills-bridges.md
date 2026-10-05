# 2026-10-05 — Skills page is Bridges; Market dial down to four views

**Files:** `frontend/src/app/(product)/dashboard/gaps/page.tsx`,
`components/dashboard/Bridges.tsx`, `lib/skill-bridges.ts`,
`lib/market-views.ts`, `dashboard/market/page.tsx`,
`components/dashboard/MarketParts.tsx`; tests `lib/skill-bridges.test.ts`,
`lib/market-views.test.ts`; `vitest.config.ts`, `package.json`.
Deleted: `dashboard/skills-lab/` (the whole lab), `components/dashboard/SkillStrip.tsx`,
`lib/chart-labels.ts`.

## Skills page: Bridges replaces the Skill gaps table

The founder's pick from the skills lab (2026-10-02), concept C with colour
"From green" and name style "Tinted ink".

- Your skills on the left in mint ink with green dots; the most asked skills
  you don't have on the right, muted text in a dashed outline.
- Each bridge fades from green (yours) to grey. Thicker = more jobs ask for both.
- The right side is fixed: linked to the most of your skills first, ties to
  the skill more jobs ask for (`byConnection`).
- Lime marks one thing: the top not-yet skill (`mostConnected`). It dims
  while another skill is in focus. It is a fact, not advice: no "next step",
  "start here" or "learn next" anywhere.
- At rest: "Most connected skill you don't have yet: Go. Linked to 8 of your
  skills." On a not-yet skill: jobs asking, the skill of yours most asked
  with it, jobs it brings within reach, and the top three roles asking.
- Wide screens: a tooltip near a not-yet skill ("16 jobs ask for AWS") with a
  hit area of the whole row plus a margin. Counts sit in a gutter beside the
  labels, never on a line.
- Phone: one bridge per skill at rest, all of a skill's bridges once tapped;
  no floating tooltip (the readout carries it); long names wrap to two lines.
- Copy says "jobs", never "postings". `ChartPanel` takes a `unit` so this page
  can say "58 jobs" before the app-wide copy audit reaches the others.
- Gone with the table: the orange "missing" marks (orange only acts) and the
  "Roles asking" chips (roles now live in the readout).
- Contrast on the dark panel: your names 11:1, not-yet 8.9:1, lime pill 11.6:1.

## Market: Landscape cut

The dial has four views. Landscape repeated Demand; see the note in
`decisions/market-navigation.md`. `?view=landscape` opens Overview. On
Overview the Gaps panel now spans both columns.

## Tests

Vitest added (`npm test`). `mostConnected` is tested against the case the
old "strongest single bridge" logic gets wrong; the view fallback test fails
with Landscape back in the list.
