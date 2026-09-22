# Decision: data visualization

**Files:** `src/components/Market/*` (the landing flow's `/analysis` pages),
`src/app/(product)/dashboard/market/page.tsx`, `src/components/dashboard/MarketParts.tsx`,
`src/components/dashboard/SkillStrip.tsx` (the dashboard's Market tab), `src/lib/market.ts`

## The governing rule

**Every visualization must answer a question.** A chart exists because a reader
has something to find out, not because the response contains numbers.

| Section | Question |
|---|---|
| `MarketOverview` | What was analyzed? |
| `SkillDemandChart` | What does the market ask for? |
| `UserSkillPresence` | How common are my skills? |
| `SkillGapChart` | What am I missing? |
| `SkillCoverage` | How much of the core skillset do I cover? |
| `JobMatches` | Which jobs fit me? |
| `SkillLandscape` | Where do I sit overall? |

## The dashboard's Market tab: one question per view

The tab used to be the landing flow's panels stacked in one long scroll. It
now has view chips like Applications' filters (Overview, Demand, Your skills,
Gaps, Landscape), each answering one question, and it uses the dashboard's
own anatomy: hairline-ruled cells, mono labels, tables where rows carry more
than a magnitude. The view is kept in the URL (`?view=gaps`), so a refresh or
a link lands on the same chart.

| View | Question | Form |
|---|---|---|
| Overview | Where do I stand, in brief? | stat cells (coverage with its meter), the top of each list |
| Demand | What does the market ask for, and do I have it? | ranked bars, green = on the CV, orange = not |
| Your skills | How much is each of my skills wanted? | ranked bars |
| Gaps | What should I learn next? | a table: share, count and priority per skill |
| Landscape | Do my skills sit where the demand is? | a strip plot: two lanes (on the CV, missing) on one demand axis |

**Colour carries identity, not magnitude.** Bar length already shows demand.
Colouring bars by it too (the landing flow's yellow-to-red ramp) repeats the
length and leaves no colour for anything else. On the Market tab colour
says one thing: on the CV (`--chart-have`) or not (`--chart-gap`). The pair
was checked with the dataviz validator against the dark card surface:
inside the lightness band, colour-blind ΔE 9.6, contrast above 3:1. The app's
`--success` was too light to pass, so the chart green is its own token.

**Every value is labelled, so there is no axis.** Bars are plain HTML rows
(name, bar, value), which also removed the fixed-width category axis that
truncated names on phones. Names drop the skill database's qualifier for
display (`skillLabel`: "Python (Programming Language)" shows as "Python"; the
full name stays in the row's title).

**Landscape lanes are real.** The old scatter spread dots vertically for
spacing only. The strip plot gives vertical position a meaning: the top lane
is on the CV, the bottom lane is missing. Dots carry a ring in the surface
colour and a hit area wider than the dot; only the three most asked-for in
each lane are named (two on a phone), and a name that would run off the right
edge sits left of its dot.

**Coverage is a meter, not a donut.** One ratio against a limit reads better
as a filled bar on a lighter track of the same hue. It sits in the coverage stat
cell rather than a section of its own, which only repeated the cell.

**Nothing else takes a hue.** Footnotes and "view all" links are muted ink, so
green and orange keep their one meaning. A Priority column appears on Gaps only
when some gap is high priority; a column reading "Medium" on every row says
nothing.

The layout was reviewed from rendered screenshots at 390px and 1280px, by a
second model (Fable) as well; its six changes are in.

The landing flow's `/analysis` pages still use the older panel components
(`src/components/Market/*`), including the magnitude ramp.

## Form before styling

Choosing the mark comes before choosing colours, and sometimes the answer is not
a chart.

**Horizontal bars** for skill frequency: magnitude across named categories, with
labels far too long for a vertical axis (`Python (Programming Language)`).

**A donut** for coverage: one part-to-whole proportion, with the value in the
middle and a sentence doing the explaining.

**A list, not a chart, for gaps.** Each gap row must carry a *reason*
("Requested in 14 of 22 postings analyzed") as well as a magnitude, and a bar
chart has nowhere to put one. `SkillGapChart` renders rows with inline meters
grouped into priority buckets. It is the one section that deliberately does not
use the shared chart.

## One hue per chart

Bar length already encodes magnitude. A second colour would imply a second
dimension that is not in the data, so every bar chart uses a single hue read
from `var(--chart-3)`.

Percentage is direct-labelled on the bar because it is the ranked measure; the
raw job count lives in the tooltip. Each bar carries exactly one number.

All colour comes from CSS custom properties, never literals — which is what let
the entire palette change from green to orange-red in one token edit.

## `SkillLandscape` has one axis on purpose

The original spec asked for a scatter of market demand against frequency. Those
are the same measurement — `frequency = job_count / jobs_analyzed` — so plotting
them against each other draws a straight diagonal line and communicates nothing.

The genuine second dimension in this data is **categorical**: is the skill on the
CV or not. It is encoded as filled vs hollow points with a legend, and demand
runs along X. Vertical position is a lane assignment that only stops
equal-frequency points overlapping, and the caption says so outright rather than
letting the reader infer meaning from it.

Lanes derive from item index, not `Math.random()`, so the layout is stable
across re-renders.

**A chart with two axes needs two independent measurements.** When a spec asks
for one the data cannot support, change the chart rather than manufacture an
axis.

## Disclosing dead signal

`JobMatches` shows four sub-scores. Two of them — experience and location — are
currently *identical for every job*, because no posting carries an
`experience_level` and the search is country-scoped.

`isConstantScore` detects this at render time and greys those meters with an
explanation, instead of presenting them as things that distinguish one job from
another.

This is self-correcting: when the backend returns real experience data, the
meters become active with no code change. Detecting the condition at runtime is
more durable than hard-coding today's limitation.

**Presenting a value that is constant across every row as a differentiator is a
way of lying with true numbers.**

## Thresholds live here, not in the backend

`skill_gaps` returns every market skill the user lacks — commonly 200–300
entries trailing off to single-posting skills. Displaying that count is
technically correct and practically useless.

`GAP_FREQUENCY_THRESHOLD` (20%) and `GAP_HIGH_PRIORITY_THRESHOLD` (40%) are
named exported constants in `src/lib/market.ts`. They are product judgments about
what counts as worth learning, which is why they live in the consumer and are
tunable in one line.

## Defensive sorting

`byDemand` sorts a **copy**, descending, and is applied even where the backend
already sorts. Nothing in the type guarantees ordering; a backend change must
not silently reorder a chart.

## Truncation is arithmetic, not guesswork

Category labels truncate at 26 characters against a 200px axis. At 12px, 30
characters is roughly 198px — wider than the axis was — so labels would have
clipped. `useCompactAxis` narrows the axis to 124px and truncation to 16
characters below 640px.
