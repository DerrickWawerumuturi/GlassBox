# 2026-10-05 — Step C: orange out of the data

**Files:** `components/dashboard/bits.tsx`, `MarketParts.tsx`, `components/Market/`
(SkillBarChart, SkillGapChart, SkillCoverage, SkillLandscape, MarketOverview,
MarketCard, JobMatches, UserSkillPresence, SkillDemandChart),
`app/(product)/analysis/layout.tsx`, `lib/chart-ramp.ts`; test `lib/data-colour.test.ts`.

Orange acts: buttons, links, the logo dot, the needle, Caveat notes, the
active tab marker. It no longer marks data.

- **Gaps are grey and hatched:** Overview's "Not on your CV yet" meters, the
  gap meters on `/analysis/gaps`, and "not yet" tags and chips (now a dashed
  grey outline, like Bridges).
- **Your skills are green:** the coverage arc, "My skills in the market"
  bars, the landscape's "on your CV" dots, the match bars and the "have"
  chips on `/analysis/jobs`.
- **Market-only bars** use `--chart-ink` (one colour, length carries the
  number). The yellow-to-red ramp and `rampColour` are retired.
- **Neutral marks:** the "/" in chart headings, the analysis job count, the
  overview tiles' hairlines, headline values, section ticks and weaker match
  scores (under 70%).
- **Statuses:** "interview" and "screening" moved off orange to teal and sky.
- Notes that described the old colours were rewritten.
- `data-colour.test.ts` fails if a data component uses `--primary`,
  `--chart-3` or the ramp (links and hover states that act are allowed).

Checked in both themes on Overview, Market, Your skills and the four
`/analysis` pages: the only orange left is logo dots, links, the needle and
the `/analysis` step dot.
