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

## Published weekly (2026-10-08)

The pages serve the latest weekly publication (`market-publication.md`), so
they are dated by its week: "Counted in the week of 5 October 2026 · Updated
every Monday" in the byline, "in the week of" in the dek, the squares, the
figures' source lines, the citation and the rail. A body with 0 jobs is no
count and never renders. Lines that were questions are statements: above the
finding, what the page counts ("What AI jobs ask for", since the copy rewrite
of 15 Oct 2026); a chart's subtitle, what its share is of ("Share of the 287
jobs read, by language", then the job chip); a hub card, the count behind its finding. The
hub cards show only the week, the finding, that count and "Read more" (the 100
squares didn't fit at phone width); a page with no count has no card. A level
no job has is left out of the levels sentence instead of written as 0.

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
mid sentence). Never a job's text. `required_median` is the median number of
**required skills** per readable job (entry and senior), not years. Since
2026-10-12 also `experience {titled, software}`: years required by software
jobs with an early career title, and by every software job (below).

Since the editorial template every page also returns `story`
(`market_story.py`): `compare {jobs, readable}`, `breadth`, `skills` (the 40
most named: category, any, required, employers, compare_any, broad),
`headline`, `finding` (the lead finding, below), `squares`, `languages {per_job, bars}`, `contrast`, `categories`,
`years {buckets, stated, unstated}` and `sections`.

## The editorial template (2026-10-07)

The founder approved the pages as reporting, not a dashboard
(`docs/local/market-pages-editorial.html`): data, then what it shows. One
template, `components/market-page/MarketArticle.tsx`, serves all five pages,
server rendered at `/market/{name}` from the published row in the database (static, rebuilt only by
the weekly publication or a deploy since 2026-10-12, issue #5; a failed read during a
revalidation keeps the last good page, `builtForPage`). In reading order:

1. **Kicker** "Market / {page}" (the breadcrumb), the **lead finding** as
   the H1 ("Two in three AI jobs name LLMs"; since 2026-10-08, rules below),
   and a **dek**: "In the week of {date} we found {n} {page} jobs at {e}
   employers. {r} had an ad long enough to read for skills, and {k} of those
   name {skill}." (copy rewrite, 15 Oct 2026: why {r} and not {n} is said where
   the reader meets it; every later "we read" leans on it).
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
7. **The CV ask** (`MarketCvAsk`, `decisions/cv-ask.md`): since 2026-10-12 one
   "Compare your CV" button (`CompareCv`, the hero's) with "Free. No account
   needed. Your PDF is deleted after reading." under it; the question with a
   blank count and its sticky line in the title bar are gone (founder). One
   sheet per page (`MarketAskProvider`) compares with the 15 broad skills the
   page's jobs name most. After a scan the answer takes the button's place
   ("9 of these are on your CV", `AskCard`), every skill in the figures
   carries the visitor's mark, green on the CV or grey dashed not yet, and a
   line counts them (`SkillName`, `ScanStatus`).
8. **How we counted**, the jobs in a `<details>` fold, a cite line.
9. **The rail**: This page counts (jobs, employers, internships, remote, date)
   and Also this week (the story, the other pages with their job counts, all
   five pages, /method; "In this count" and "More from the count" until 15 Oct 2026). Sticky beside the article on a desktop, under it on a phone.

A slim title bar with the question and the CV button slides in once the lead
visual has scrolled away (an instant switch under reduced motion).

**Words.** Every sentence is a template over the numbers
(`lib/market-story.ts`), so it is checked by construction and changes with the
data. Headings state what the data shows and never tell anyone what to do.
Templates avoid verb agreement with skill names ("58 of the 135 jobs name
Python", not "LLMs appears").

**Words for a first time reader** (founder, 15 Oct 2026; docs/local/copy-rewrite.html).
A term is explained once, where the reader meets it, then trusted: "had an ad
long enough to read for skills" in the dek, then "we read"; "senior, meaning a
senior, lead or principal title" and the breadth rule's reason in the
languages caption, then "same rule as the languages". The week is said in the
byline, each figure's source line and once under the questions, not in every
caption. "Name" leads in headlines and findings; "mention" and "list" take
turns in prose and captions (a skill counts whether required or optional). The
method fold says the same sentence on all ten pages (`readLine`: "We look for
about 250 named skills, by fixed rules, in the {r} ads long enough to read. The
other {n} were too short.").

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

The line above the H1 ("The skills AI jobs name, counted") was removed on
12 Oct (founder): the breadcrumb sits directly above the H1 on the five pages
and the years page. The searched question stays in the title, the meta
description and the question blocks; `topic` remains the H1 when there is no
finding, the rail's link text, a hub card's fallback title, the Article
headline's fallback and the share image's fallback line.

Each page's H1 is its lead finding, chosen by `market_story.finding` (one
place, so the page, the hub card, the share image, the Article markup, the
cite line and "At a glance" agree) and worded by `headline` in
`lib/market-story.ts`. The question stays in the `<title>`, the meta
description and the question blocks: that is what people search for.

Which skills may lead: broad ones (the breadth rule), never the skill that
names the job type itself (`market_pages.DEFINING`, next to `ROLES`:
machine learning on the machine learning page, a generic "AI" on the AI page,
"DevOps" on the DevOps page). The lead visual's lime follows the same skill.

The first pattern that applies (thresholds are named constants):

| Pattern | When | Words |
|---|---|---|
| years | one number of years is asked by 60% or more of the jobs that state years (`YEARS_USUALLY`; a range like "3 or more" never counts); never on the entry level page (12 Oct, below) | Most DevOps jobs that state years ask for 5 years |
| share | the lead skill is named by 60% or more (`FRACTION_FROM`) | Two in three AI jobs name LLMs; a fraction from `FRACTIONS` only within 2 points (`FRACTION_POINTS`), else "63% of …" |
| tied | the top two within 2 points (`TIED_POINTS`) | Python and distributed systems are almost tied at the top of software engineering jobs |
| pair | the top two within 5 points, both 40% or more (`PAIR_POINTS`, `PAIR_FROM`) | … each appear in **nearly** half (both under 50%) or **about** half (both 45 to 55%) of … jobs; otherwise this pattern doesn't apply |
| half | the lead skill at 45 to 55% (`HALF`); the pair's words by one rule (`_half`, 12 Oct): under 50% "nearly", else "about" | Nearly half of entry level software jobs name Python (276 of 560, 49.3%) |
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
- Sitemap: the hub, five pages and the years page, `lastmod` = the day counted.
- Links: the rail, the hub, the footer ("Market"), the header's Market link
  (a plain link since 15 Oct 2026; the Resources menu is gone, and /method sits in
  the footer and on /market), /product, /method, and the home count card links
  to a role page when its job type has one.

### Searched questions (2026-10-12, GitHub issue #2)

Strangers find the pages through search and AI answers, which quote counted
sentences with a date, a sample and a method. So:

- **Title** = the question people search, in their words, then the sample:
  "AI engineer skills, counted from 288 jobs" (`MarketInfo.search`). The
  software engineering page says "Software engineering skills in demand".
- **Description** answers it with a count and the week: "What AI jobs ask for
  most in the week of 12 October 2026: 191 of the 287 ads we read name LLMs
  and 120 name Python." Skills from `leadSkills`: broad ones from
  the headline skill on (a broad skill above it names the job type itself).
- **Dek**: unchanged where the finding is a skill. Where it is years (the
  entry level page) it adds the most named skill's count, so the page answers
  "entry level software engineer requirements" in its first lines.
- **Questions this page answers** (`lib/market-faq.ts`; "Questions this count
  answers" until 15 Oct 2026), the week said once under the heading, then the
  CV ask with its question beside the button (founder's yes, 15 Oct 2026),
  and as FAQPage JSON-LD in the same graph as the Article: up to 4 of skills
  asked most, years (role pages: the most common bucket; entry level page:
  the early career titles' answer below, never the page's own years), two
  or more languages, remote (the board's flag). A question appears only when
  its count exists that week; no answer gives advice.

No new page repeats an existing one: 20 excellent pages beat 500 thin ones.

### Years of experience (2026-10-12)

`/market/entry-level-software/years-of-experience` answers "how many years
of experience do entry level software jobs ask for". Under `[page]` because
it is written from that page's body and its breadcrumb is "Market / Entry
level software / Years of experience"; any other page name is a 404. Its own
share image, canonical, Article + BreadcrumbList + FAQPage markup, sitemap
entry, and the weekly refresh (`lib/revalidate.ts` `MARKET_PATHS`, backend
`refresh_site.pages()` via `market_pages.ANSWERS`).

**Why not the entry level page's own years.** That page counts a job as
entry level when it requires two years or less, and a job with no level in
its title or board gets its level from its years (1 or 2 years reads as
junior, 3 or 4 as mid). So its years answer themselves. Checked read only on
the 12 Oct 2026 pool: of the 156 entry level jobs asking two years, 153 had
no early career title; of the 225 that state years, about 190 were on the page
only because of them. "“Entry level” usually means two years" (156 of 225 on
12 Oct; 136 of 199 the week before) is true of that set and says little about
the market. **Founder, 12 Oct: the entry level page never leads with its own years.**
`market_story.story(..., own_years=False)` for the entry level page: no years
finding and no years section, so it leads with its next finding by the same
rules (12 Oct pool: "Nearly half of entry level software jobs name Python",
276 of 560). The frontend drops a years finding and the years section for the entry
level page too (`finding`, `has` in `lib/market-story.ts`), so a publication
built before the rule (the 12 Oct one) shows no circular sentence either: its
H1 is the page's topic and the dek gives the most named skill, until the next
publication carries the skill finding. "At a glance" points to the years page
with the early career titles' count. Role pages keep their years: their sets
aren't chosen by years.

**What the page reads instead** (`market_pages.experience`, buckets 0, 1, 2,
3, 4, 5 or more by `market_story.buckets`):

- `titled`: software jobs whose title says intern, graduate, new grad, entry
  level, early career or junior (`entry_title`). 12 Oct pool: 328 jobs, 306
  state no required number, 22 do (0: 5, 1: 10, 2: 2, 3: 2, 4: 2, 5+: 1).
  299 of the 306 have no years figure anywhere in the ad.
- `software`: every counted software job. 12 Oct pool: 3,596 jobs, 2,052
  state a number; 254 ask for two years or less, 1,420 for five or more.

Years are the profiler's: the highest required figure, a range from its low
end, "preferred" counts as not stated, and more than 3 years in an intern or
graduate title reads as not stated (`requirements._experience`).

The page: the breadcrumb, the H1 answers ("Most entry level
software jobs don't ask for a number of years" when most state none), the
dek gives the count, the week and the sample, a pull stat, one figure (two
split bars, lime = two years or less, hatched = none stated, table twin), a
counted line for all software jobs, three questions, the CV ask, the method.

**Data.** Publications store their page bodies, so `experience` arrives with
the first publication after the push (19 Oct), or a `publish --now` for the
current week. Until then the page says the count isn't here yet and the
sitemap entry has no lastmod.

**Count the rings (founder, 16 Oct 2026).** The page keeps its address, data,
H1, dek, FAQ (as text, with its FAQPage markup), canonical, share image,
sitemap entry and weekly rebuild, and takes a new look (prototype:
`docs/local/editorial-sprint/years-page/`): a woodpile seen end on, one log end
per job, its rings the years the job asks for. Lime paint is two years or less,
bare wood three or four, dark heartwood five or more (the old chart's cut
points). A **sealed grey end** is a job that states no number and a **bare log**
(only its pith) one that asks for none, so "states no number never means asks
for none" is in the picture. Pile one is the early career titles, opened mixed;
pile two is every software job, opened stacked by rings. "Stack by rings" sorts
a pile into layers; a tap, a hover or the arrow keys read one log aloud. Then
the 22 that state a number (one big log each; above 60, one per group with its
count), the rows as logs on their side cut by share (the fair comparison, since
the piles differ in size), the table twin, the questions, the CV ask, the method.

Still a weekly page: every number and sentence is a function of the week's
`experience` counts in `lib/years-answer.ts` (`kicker`, `stamp`, `pileCaption`,
`ringedHeading`, `ringedLine`, `yardLead`, `roundsLine`, `logWords`,
`pileGroups`, `yearsSections` beside the existing ones). A part the counts can't
fill leaves the page: no early career job states a number, no ringed logs; no
all software count, no yard; one kind of log, no "Stack by rings". The tests try
the prototype's two made up weeks (most state a number: the H1 flips; a thin
week: the ringed logs and the yard go). The piles draw on a canvas once script
runs (`components/years/pile.ts`); the key, the counts, the labels, the table
and the small figures render on the server as text and SVG. No new data, no new
calls. Alfa Slab One (OFL) stamps the planks, the kicker and the big count, and
loads on this page only. The /market card keeps its tags cover and title for now.

### Analytics

`cta_clicked {where}` (the page's name; `years` for the years page; `story_<slug>` for a story and `market` for the
grid's CV card, both since 15 Oct 2026; `ask` retired 12 Oct 2026), `fact_copied {page}` and `scan_started` /
`scan_finished {from}` carry the page's name; a name that is not one of the
five (`lib/market-names.ts`) is dropped before sending, so no free text rides
in on it.

## Stories (2026-10-15, founder)

Visual stories, at least one per market page, each telling one week's count with
its own object and style (prototypes: `docs/local/editorial-sprint/stories/`):
"Is entry level dead?" and "Pick a side" (entry level software), "The lobby is the biggest floor"
(software engineering), "Contents may vary" (AI), "Peak Python" (machine
learning), "Within eleven jobs" (DevOps).

- **Dated, like an article.** A story is fixed to one named week. Its numbers
  are static data in one module per story (`frontend/src/lib/stories/<slug>.ts`),
  a comment per figure naming its line in the week's data pack; its words are
  written from those numbers. It says its week near the top ("This story keeps
  to one week, 12 October 2026. The … page starts a new count every Monday";
  once more, short, after the CV ask), in every source line, its title and its
  share image, and links its live page, which recounts every Monday. Moving a
  story to a new week is a data edit; its tests (`<slug>.test.ts`) check the
  sums and name each sentence the new numbers must still bear out. Refreshed and
  re-checked before it ships (the first refresh: the 19 Oct publication).
- **Addresses.** `/market/<page>/<story>`, a static folder under `app/market/[page]/`
  per story, as the years page: built for its own page name only, any other is
  a 404; no publication read, so only a deploy rebuilds it (no Neon or API call
  on a visit or a build). Each route loads only its own faces.
- **Each story** has Article and BreadcrumbList markup (Market, its page, the
  story), its own canonical, title ("Pick a side: entry level software jobs in
  the week of 12 October 2026"), description (the card line) and a 1200×630
  share image drawn from its data. It ends with "Curious how many of these
  skills are already on your CV?", the peek button (the market page's
  sheet and scan, about the skills the story counts), the week line, and "How we
  counted": what the page counts, the skills rule, where the jobs come from and
  what we can't see (from /method's words).
- **The hub** (`/market`) is a grid of the stories after The Pudding's home:
  covers, a pill and a date, the finding in one line, a plain link to each live
  weekly page (so the hub stays search's way into the live counts), the years
  page's card from the live count, how we count, and the CV card fifth. Filters
  by kind; the Essays filter appears when an essay joins (the two years essay,
  after its recount). The hub still reads the publication for the live links,
  the years card and the week, rebuilt as before.
- **Pick a side, as a real deck (founder, 16 Oct 2026).** The cards are playing
  cards from the CC0 English pattern deck on Wikimedia Commons (the blue back by
  Loren Osborn, the pips from Dmitry Fomin's faces; licence and source in
  `frontend/public/stories/pick-a-side/LICENSES.md`), dealt on green baize with a
  wooden rail, one table per figure, the words on the page's own paper or
  charcoal. The scratch panel is printed with the deck's back. Spades are the
  seven languages the weekly page charts and clubs the other four skills, said in
  one line under "The first card" and derived from `PICK.charted.languages`, so
  the hand's sentence and the pips cannot disagree; a suit never marks the lean
  (it shows before the guess). No joker for Java. Every number, the guess then
  scratch (touch and keyboard), the tally, the table twin and reduced motion are
  unchanged; the foil is gone.
- **The weekly page** lists its stories first under "Also this week". The hub
  pills say "Story" and the filter "Stories"; each card links "Latest count:
  {page} jobs" ("Live count" read as real time; copy rewrite, 15 Oct 2026).
- **A page may have more than one story (19 Oct 2026).** `lib/stories/index.ts`
  lists them in the market pages' order, newest first within a page;
  `storiesFor(page)` gives them all, so the weekly page's rail links each one,
  the hub has a card for each (the newest story leads the grid, the next follows
  the years card) and the sitemap lists each after its page
  (`lib/stories/index.test.ts`).
- **Is entry level dead? (19 Oct 2026).** The entry level page's second story,
  its first chapter (Pick a side is chapter two, linked from step 7). Week of 19
  October 2026: the entry level page of publication id 4
  (`pages.entry-level-software`), with weeks 5 and 12 October (ids 1 and 3) for
  the three weekly points; the two outside facts (Stanford Digital Economy Lab,
  revised 12 Aug 2026; Indeed Hiring Lab, 8 Jul 2026) are linked where they are
  used. One real ad pinned, a guess (100 drawn people, slider keys), then the
  week's 4,536 software jobs as a crowd of drawn people (one per 10 jobs, 25 on
  a phone, rounded) that sorts onto a ladder; the bottom step splits into
  internships and the rest, the titled jobs wear name tags, three weekly points
  say "too early to tell". Featured characters are Pexels photo heads on drawn
  bodies (credited on the page and in `public/stories/is-entry-level-dead/heads/CREDITS.md`).
  It names no skills, so its CV button opens the sheet about the latest jobs, as
  the hub's CV card does, with the founder's own line before it.

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
