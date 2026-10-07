# Decision: public market pages

**Status:** entry level page built 2026-10-07; the editorial template, the four
role pages and the /market hub built 2026-10-07, not yet pushed.
**Files:** backend `src/jobpool/market_pages.py` (the pages' counts),
`market_story.py` (each page's `story`: what the editorial sections are written
from), `market_look.py` (builds them), `src/api/market.py`
(`GET /market/page/{name}`); frontend `app/market/[page]/` (page and share
image), `app/market/page.tsx` (the hub), `app/market/layout.tsx`,
`app/(public)/method/page.tsx`, `lib/market-pages.ts`, `lib/market-story.ts`,
`lib/market-page.ts`, `lib/method-copy.ts`, `components/market-page/`. Tests:
`test_market_pages.py`, `test_market_story.py`, `test_requirements.py`,
`market-page.test.ts`, `seo.test.ts`, `analytics.test.ts`.
Design: `docs/local/editorial-prototype.html`, `docs/local/market-pages-editorial.html`.

## Why these pages

The first pages decision (`docs/local/first-pages-decision.html`, 7 Oct)
found one Learner question the data answers honestly today: what entry level
software jobs ask for. Search results for it are opinion lists; a counted
answer is rare, and it has a real finding: entry level ads name languages,
senior ads name systems. A junior reading it has a CV to check, so the page
ends in the same CV scan as everywhere else.

`/method` answers "can I trust these numbers?" for every page: sources, the
hand picked employer list and its skew, one job counted once, how skills,
levels and years are read, and what we can't see. Every line is written from
the code it describes, named beside it in `lib/method-copy.ts`.

## Definitions

- **Counted like the product.** The same live pool and rules as the landing
  count and the daily snapshot: `snapshot.counted()` (daily sources only, the
  same title at the same employer once, across boards and cities), profiles at
  the current `PROFILER_VERSION`. Skills are counted over readable jobs
  (profile not `thin`). The page reads families, levels and years from the
  stored profiles, so a fix to `roles.py` or `requirements.py` reaches it with
  the next profiler version, with no rule copied.
- **Software, broadly:** `software_engineering`, `backend`, `frontend`,
  `full_stack`, `mobile` (`market_pages.SOFTWARE`).
- **Entry level** (`market_pages.is_entry_level`), any of:
  1. the product's junior level: `intern`, `entry` or `junior`;
  2. an early career title (`entry_title`, the one place this rule lives):
     intern, internship, co op, werkstudent, working student, praktikum,
     apprentice; or graduate, grad, new grad, entry level, early career,
     junior, jr when no senior word (senior, staff, lead, principal, manager,
     director, head, architect, chief, vp) sits beside them;
  3. a **required** figure of 2 years or less, unless the level is senior,
     lead or principal. "Ideally 2 years" does not count.
- **Senior**, for the contrast: senior, lead or principal level in the same
  families, minus anything entry level.
- **Internships:** level `intern` or an intern title.
- **Remote:** the board's remote flag.
- **US vs elsewhere** (`market_pages.place`): the location text split on
  `;`, `|`, `/` and "or", each part read by `location.country_named`, the
  helper ranking already uses. Any US part makes it US; only other countries
  makes it elsewhere; no country named ("Remote", "Hybrid") is counted as
  unknown, never guessed.
- **Employers:** distinct employers by the duplicate rule's company key, so
  "Shift" and "Shift Ltd" are one. The largest is named as most of its jobs
  spell it.

## The 100 rule

`publishable` is false under 100 readable entry level jobs. Then the page
shows the count, the job list and counts of internships, remote jobs and
places, and says plainly why it shows no shares. No skill table, no contrast
chart, no "X of Y" fact, no largest employer's share: under 100 jobs a share
describes a few employers more than the market (Stripe alone was 13 of about
88 clean software engineering jobs on 6 Oct). The share image follows the
same rule.

## The endpoint

`GET /market/page/entry-level-software`. Built with `/market/look` from one
read of the pool (`market_look.compute` returns both), so the two never
disagree and the pool is read once. Same cache rules: built in the
background, stale while rebuilding, 503 with `Retry-After` before the first
build, `Cache-Control: public, max-age=3600`, gzip. An unknown page name is a
404 before anything is read; the name is checked against `PAGES`.

Returned: `taken_at`, `profiler_version`, `families`, `min_readable`,
`publishable`, `jobs`, `readable`, `employers`, `internships`, `remote`,
`places {us, elsewhere, unknown}`, `largest_employer {name, jobs}`, `skills`
(top 15 by readable entry level jobs naming it: `any`, `required`,
`senior_any`, `senior_required`), `contrast` (up to 4 skills leaning to entry
level and 4 to senior, at least 3 points apart, from the top 40 of either),
`senior {jobs, readable}`, `required_median {entry, senior}`, `titles` (up to
40, `[title, company, level, required years]`, one employer at a time) and
`names` (display names) and `inline_names` (the names that read differently
mid sentence). Never a job's text.

Since the editorial template every page also returns `story`
(`market_story.py`): `compare {jobs, readable}`, `breadth`, `skills` (the 40
most named: category, any, required, employers, compare_any, broad),
`headline`, `finding` (the lead finding, below), `squares`, `languages {per_job, bars}`, `contrast`, `categories`,
`years {buckets, stated, unstated}` and `sections`.

## The editorial template (2026-10-07)

The founder approved the pages as reporting, not a dashboard
(`docs/local/market-pages-editorial.html`): data, then what it shows. One
template, `components/market-page/MarketArticle.tsx`, serves all five pages,
server rendered at `/market/{name}` (ISR, 5 minutes; a failed fetch during a
revalidation keeps the last good page, `builtForPage`). In reading order:

1. **Kicker** "Market / {page}" (the breadcrumb), the **question** above the
   headline ("What are AI jobs actually asking for?"), the **lead finding** as
   the H1 ("Two in three AI jobs name LLMs"; since 2026-10-08, rules below),
   and a **dek**: "We counted {n} {page} jobs at {e} employers on {date}.",
   then the count behind the finding ("191 of the 287 we could read name LLMs.").
2. **Byline**: Counted by Glassbox, `<time>` updated, counted again every day;
   share, copy link and cite buttons.
3. **Lead visual**: the job count and one square per job. Lime = names the
   headline skill (the one highlight), outlined = internship. Squares shrink
   with the count (24, 14 or 9 px; 17, 10 or 6 on a phone). A deliberate gap
   above it (132 px desktop, 88 phone, founder's call).
4. **Framing**: what was counted, each job once.
5. **At a glance**: three findings, each one full sentence with its count, an
   anchor (`#finding-…`) and a copy control (the sentence plus a tagged link to
   the finding). Skill, then the contrast, then years; levels or languages fill
   in on pages without them.
6. **Finding sections**, each only when its data clears the thresholds below.
   Heading = the finding, a sentence before, one `<figure>` (title, mono
   subtitle with the orange slash and a job chip, the picture as server HTML
   with `role="img"` and a data `aria-label`, a caption and a source line), a
   table twin where a chart has many rows, a sentence after.
   - *Languages*: the broad languages, bars with the comparison as a grey tick.
   - *Contrast*: broad skills leaning to the page, then to its comparison set,
     two sided rows.
   - *Beyond the languages*: up to 4 skill categories (`skills.txt`'s category
     column), 3 bars each.
   - *Years*: a pull stat ("52 of 69") and the years asked as one split bar.
   - *Levels* (role pages): junior, mid, senior, not stated.
   - *Who is hiring, and where*: employers, the largest one, US / elsewhere /
     no country (hatched), internships, remote.
7. **The CV ask**, as a question (`MarketCvAsk` on `AskCard`, since
   2026-10-07; `decisions/cv-ask.md`): "How many of these are on your CV?",
   "? of 15" over the 15 broad skills the page's jobs name most, "Find out".
   One sheet per page (`MarketAskProvider`) also serves the sticky line in the
   title bar ("? of 15 skills here on your CV"; at the foot on a phone),
   which hides while the card is in view and after a scan. After a scan the
   card answers ("9 of these are on your CV"), every skill in the figures
   carries the visitor's mark, green on the CV or grey dashed not yet, and a
   line counts them (`SkillName`, `ScanStatus`).
8. **How we counted**, the jobs in a `<details>` fold, a cite line.
9. **The rail**: In this count (jobs, employers, internships, remote, date) and
   More from the count (the other pages with their job counts, the hub,
   /method). Sticky beside the article on a desktop, under it on a phone.

A slim title bar with the question and the CV button slides in once the lead
visual has scrolled away (an instant switch under reduced motion).

**Words.** Every sentence is a template over the numbers
(`lib/market-story.ts`), so it is checked by construction and changes with the
data. Headings state what the data shows and never tell anyone what to do.
Templates avoid verb agreement with skill names ("58 of the 135 jobs name
Python", not "LLMs appears").

**Comparison sets.** Entry level page: senior software jobs (as before). Role
page: the senior jobs of the same family (the founder's spec), so its contrast
reads "Senior AI jobs name LLMs more often".

### The breadth rule

`market_story.broad(skill)`, the one place it lives: a skill may be
highlighted, lead the squares, head a finding or appear in a figure only when
jobs at **10 or more employers** (`BREADTH_EMPLOYERS`) name it. Under that, one
company's hiring can make a pattern (Spring Boot on 7 Oct: 14 entry level jobs,
8 at Robinhood; Ruby: 9 of 13 at Stripe). Figures show broad skills only, and
say so in their caption.

### Thresholds (named constants in `market_story.py`)

| Section | Shown when |
|---|---|
| any section, any share | 100 readable jobs (`MIN_READABLE`, the 100 rule) |
| Languages | 3 broad languages (`MIN_LANGUAGES`); up to 7 bars |
| Contrast | a comparison set of 100 readable jobs, and broad skills at least 3 points apart both ways (`CONTRAST_MIN_POINTS`); up to 3 each way |
| Beyond the languages | a category with 2 broad skills (`MIN_CATEGORY_BROAD`) named by 20 jobs (`MIN_CATEGORY_JOBS`); up to 4 |
| Years | 30 jobs that state required years (`MIN_YEARS_STATED`); buckets 0, 1, 2, 3+ (entry) or 0-2, 3-4, 5-7, 8+ (roles) |
| Levels | role pages, 50 jobs with a stated level (`MIN_LEVELS_STATED`) |
| Who is hiring | always, over the 100 rule |

Under the 100 rule the page keeps the question, the count, the squares
(no highlight), the CV ask, the method and the jobs, and says in one calm
sentence why it shows no shares.

**Payload.** The squares are four counts (skill, both, internship, neither),
not a list per job: they are drawn grouped, so the counts are the picture.
About 11 KB a page.

### Finding headlines (2026-10-08)

Each page's H1 is its lead finding, chosen by `market_story.finding` (one
place, so the page, the hub card, the share image, the Article markup, the
cite line and "At a glance" agree) and worded by `headline` in
`lib/market-story.ts`. The question stays in the `<title>`, the meta
description (first) and the kicker line: that is what people search for.

Which skills may lead: broad ones (the breadth rule), never the skill that
names the job type itself (`market_pages.DEFINING`, next to `ROLES`:
machine learning on the machine learning page, a generic "AI" on the AI page,
"DevOps" on the DevOps page). The lead visual's lime follows the same skill.

The first pattern that applies (thresholds are named constants):

| Pattern | When | Words |
|---|---|---|
| years | one number of years is asked by 60% or more of the jobs that state years (`YEARS_USUALLY`; a range like "3 or more" never counts) | “Entry level” usually means two years |
| share | the lead skill is named by 60% or more (`FRACTION_FROM`) | Two in three AI jobs name LLMs; a fraction from `FRACTIONS` only within 2 points (`FRACTION_POINTS`), else "63% of …" |
| tied | the top two within 2 points (`TIED_POINTS`) | Python and distributed systems are almost tied at the top of software engineering jobs |
| pair | the top two within 5 points, both 40% or more (`PAIR_POINTS`, `PAIR_FROM`) | … each appear in **nearly** half (both under 50%) or **about** half (both 45 to 55%) of … jobs; otherwise this pattern doesn't apply |
| half | the lead skill at 45 to 55% (`HALF`) | Half of DevOps jobs name incident response |
| leads | anything else | Python leads DevOps jobs, named in 79 of 199 |

Why "pair" says "about" as well as "nearly": the machine learning page (8 Oct)
has Python at 54% and LLMs at 52%. "Nearly half" would be false for 54%, and
"Half of machine learning jobs name Python" hides the more striking fact that
LLMs are named almost as often. "Python and LLMs each appear in about half of
machine learning jobs" is both true and the stronger lead.

Words: numbers under ten in words; skill names mid sentence from
`inline_names` (`skills.inline`: ordinary nouns in lower case, "distributed
systems", "incident response"; products, languages and acronyms as named).
"Machine Learning", "Deep Learning" and "Computer Vision" are now sentence
case in `skills.txt`, like every other generic skill. When the years lead, the
years section's heading gives the count instead of repeating the H1.

Live, 8 Oct 2026 (v6 profiles, read only): entry level software "“Entry level”
usually means two years" (55 of 72); software engineering "Python and
distributed systems are almost tied …" (36% and 35%); AI "Two in three AI jobs
name LLMs" (191 of 287); machine learning "Python and LLMs each appear in about
half …" (54% and 52%, machine learning itself skipped); DevOps "Terraform / IaC
and Kubernetes are almost tied …" (46% and 45%).

**Hub cards** (`app/market/page.tsx`): kicker "{page} · {n} jobs · {date}",
the headline as the title (the card's one link, stretched over the card, so
its accessible name is the headline), the question and the count behind the
finding, "Read" with an arrow, and `FindingSquare`: 100 squares, each 1% of
what the finding counts, the finding's share lit in lime (for the years
finding, the share asking that number of years). 132 px wide, 88 on a phone,
on the right at every width.

**Charts:** a skill's name in a figure is never cut off with an ellipsis. It
wraps (two lines at most for today's names) and drops the examples in
brackets (`chartName`: "AI assistants", the full name as the label's title).

### Search and sharing

- Title from the data: "What entry level software jobs ask for: 136 jobs
  counted · Glassbox". The description: the question, the finding, the count
  and its date. The share image shows the finding headline, the count behind
  it and the squares.
- Canonical via `publicPage`; `robots max-image-preview:large`; og type article.
- Share image per page (`app/market/[page]/opengraph-image.tsx`) and the hub,
  drawn by `components/market-page/ShareImage.tsx` (next/og reads ttf, not
  woff2, so `app/fonts/og/` holds static cuts of the brand faces). The pages sit outside the
  `(public)` route group because a group adds a hash to the image's address;
  the Article markup names the plain one.
- Article JSON-LD (headline, `datePublished` = `FIRST_PUBLISHED` 2026-10-07,
  `dateModified` = the count's `taken_at`, author and publisher Organization
  Glassbox, image) and a BreadcrumbList matching "Market / {page}".
- Sitemap: the hub and five pages, `lastmod` = the day counted.
- Links: the rail, the hub, the footer ("Market"), the header's Resources menu
  (Market and How it works), /product, /method, and the home count card links
  to a role page when its job type has one.

### Analytics

`cta_clicked {where, ask}` (`ask`: `card` or `sticky`), `fact_copied {page}` and `scan_started` /
`scan_finished {from}` carry the page's name; a name that is not one of the
five (`lib/market-names.ts`) is dropped before sending, so no free text rides
in on it.

## Two misreads fixed (requirements-v6)

Found while drafting the page, fixed where they live:

- **"Member of Technical Staff" read as lead** (`roles.title_level`). OpenAI,
  xAI and Abridge use it for every level; its "staff" made all 88 in the pool
  lead, interns and new grads included. It is now a role name, and the rest of
  the title decides. An intern, working student, apprentice or new grad title
  is never senior or lead ("Senior Year Intern" is an intern), unless the job
  runs the programme (manager, director, head, coordinator, recruiter).
- **An internship read as 10 required years** (`requirements._experience`).
  "Grown a lot in the last 10 years" is company history: "in / over / during
  the last / past" now marks prose (30 required figures in the pool change,
  most of them Monzo's). And an intern or graduate title that seems to require
  more than 3 years (`MAX_EARLY_CAREER_YEARS`) reads as unstated: the figure
  is somewhere else in the ad.

`PROFILER_VERSION` is now `requirements-v6`: the next daily run re-profiles the
whole pool, and snapshots start a new series. Run
`python -m src.jobpool.daily --profile-only` on production before the push, or
the API will count nothing at v6 until the daily run.

## Role pages (backend, 2026-10-07)

**Status:** built and served; the editorial template above renders them.

One page per job family, from the same read and the same rules as the entry
level page (`market_pages.role(family, rows)`, `ROLES`):

| Page name | Family |
|---|---|
| `software-engineering` | `software_engineering` (only; backend, frontend, full stack and mobile are their own families) |
| `ai` | `ai` |
| `machine-learning` | `machine_learning` |
| `devops` | `devops` |

`GET /market/page/{name}` serves them; `PAGES` is the one known list, so any
other name (a family name such as `machine_learning` included) is a 404 before
anything is read.

Returned: `taken_at`, `profiler_version`, `families`, `min_readable`,
`publishable` (100 readable jobs, as above), `jobs`, `readable`, `employers`,
`remote`, `places {us, elsewhere, unknown}`, `largest_employer {name, jobs}`
(the same helper as the entry level page, `_hiring`), `levels {junior, mid,
senior, unstated}` (the landing count's buckets, `market_look.bucket`),
`skills` (top 15 by readable jobs naming it: `any`, `required`), `together`,
`titles` (up to 30, one employer at a time, `[title, company, level, required
years]`) and `names`. Never a job's text.

**Named together** (`together`): for each of the top 3 skills, `any` is the
readable jobs naming it, and `with` the 5 skills those same jobs name most
beside it, each with its job count ("Of the 490 software engineering jobs
that name Python, 222 also name Go"). Named means required, preferred or
mentioned; a skill is never listed beside itself.

Live, 7 Oct 2026 (v5 profiles, read only): software engineering 1,379 jobs
(1,366 readable), AI 288 (287), machine learning 194 (194), DevOps 203 (200).
All four clear the 100 rule.

## Later

A 30 day window once snapshot history allows (raises the count, smooths the
internship season). Monthly archive URLs, "what changed", a CSV with Dataset
markup, skill pages. A share image per finding.
