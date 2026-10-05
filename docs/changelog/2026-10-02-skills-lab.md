# 2026-10-02 — Skills page lab: four ways to answer "what should I learn next?"

A dev-only lab inside the real dashboard (`/dashboard/skills-lab`, 404 in
production). The live Skill gaps page is untouched.

**Files:** `frontend/src/app/(product)/dashboard/skills-lab/` (`page.tsx`,
`_lab/skill-data.ts`, `Staircase.tsx`, `Constellation.tsx`, `Bridges.tsx`,
`Specimens.tsx`, `SkillsLab.tsx`)

## Why

The Skill gaps page is a table of missing skills. It repeats the Market
tab's Demand view, uses orange for "missing" (orange only acts), and does
not answer the learner's question: what next, and what does it get me?

## The data (`skill-data.ts`)

Everything comes from the scan already in the browser: each posting's skills
(`job.skills`) and its required skills split by the CV (`match.required`).

- **Within reach:** the CV covers at least half of a posting's required
  skills (partial counts). Postings listing no required skills are left out.
  Half was chosen on the real 58-posting scan: at 0.6–0.8 the path chased
  one-off postings (a lone Salesforce or Ruby ad).
- **The path:** greedy; each step is the skill that brings the most postings
  within reach given the steps before it. On that scan: AI agents, Go, Java,
  Observability, Distributed systems, from 7 to 27 of 50.
- **Together:** how many postings ask for both of two skills.

## The concepts

- **A · Staircase:** today's reach in green, then five hatched steps; the
  first wears lime "Start here"; pick a step to list the postings it opens.
- **B · Constellation:** the 26 most asked skills placed by co-occurrence (a
  small deterministic force layout, no library). Each skill keeps its three
  strongest ties; all pairs drawn was a hairball. Hover lights a skill's
  neighbours.
- **C · Bridges:** your skills left, the best-connected gaps right, bridge
  width = postings asking for both. Each of your skills keeps its three
  strongest bridges (all of them hid the strong ones).
- **D · Specimen cards:** one card per top gap: count and tally, roles
  asking (titles tidied: qualifiers, seniority words and level numbers
  removed), your skills it pairs with, what it alone brings within reach.

All four mark the same "start here" skill in lime (the staircase's first
step), so the concepts agree.

## Checked

- tsc and `next build` pass; the lab is 404 in production.
- 1280 and 390, no sideways scroll; hover, focus and click exercised by
  `docs/local/render/skills-check.mjs`; no console errors.

## Not checked

- Scans without fit data (`match` is absent on old cached scans; the reach
  numbers would be empty).
- Touch on the constellation (hover-led).

## Bridges refined (2026-10-05, founder's pick)

Chosen for being light to read. Its weakness was not saying what a skill
gets you; that is added without adding reading:

- **One number per skill you don't have:** how many postings ask for it.
- **One sentence, only for the skill you hover or tap** (a tap pins it):
  "Go: 25 of 58 postings ask. 11 of them also ask for your Python. On its own
  it brings 1 more within reach." For one of yours: "Python leads most often
  to Go: 11 postings ask for both."
- **Lime on the best next step's number:** the most asked skill that, on its
  own, brings any posting within reach (Go). Ranking by that gain alone chose
  Distributed systems (14 postings, +2) over Go (25, +1) on a one-posting
  difference; too thin to lead with. Lime sits on the number, not beside the
  name, which a phone had squeezed out.
- **Phone:** the right column gets more room than the left and the dots beside
  names are dropped (the headings say which side is which), so names fit.

Checked at 1280 and 390 (`docs/local/render/bridges-check.mjs`): rest,
pinned and hovered readouts; no sideways scroll.
