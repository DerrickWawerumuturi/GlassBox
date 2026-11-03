# Research brief: Where do the 2 years come from?

**Status:** the two year set was verified ad by ad on 15 Oct 2026 (`docs/local/editorial-sprint/section/verification.md`, record level evidence in `verification.json`). **Use 125, not 134, and 71 and 60, not 72 and 59.** Both sets were read ad by ad. Recount on the publications of 19 Oct, 26 Oct and 2 Nov before publishing.

## Verified 15 Oct: the junior titled set
- Software titles saying junior, jr, new grad, graduate, entry level or early career (plural "Early Careers" included), internships aside: 75, minus 4 repeat postings of the same role (two countries, two cities, two campus postings) → **71**.
- **60 of 71 state no required minimum**: 53 give no number at all, 4 give only a ceiling ("a maximum of 3 years", "up to 3 to 4 years", "no more than 18 months" twice), 2 mention years only as preferred, 1 asks two years only of bachelor's holders.
- 11 state a required minimum: 4 start at zero (0, 0–2, 0–2, 0–4), 3 at about a year (1+, 1+, 1–3), 4 at two or three (2+, 2–3, 3, 3+).
- Parser misreads found: "a maximum of 3 years" and "up to 3 to 4 years" read as minimums; "Four (4) years ... may be substituted for a degree" read as 4 required; "three (3) years ... Seven (7) years may substitute" read as 7; "no more than 18 months" not read.
- Across the 60, by keyword (rough): experience 51, projects or portfolio or GitHub 45, a degree 39, internships or co-ops 25, "no experience required" 0.

## Verified 15 Oct: the two year set
- Definition: the experience an ad states as required has a lower bound of two years ("2+", "at least two", "minimum of 2", "two (2) years", or a range starting at two). Not "exactly two years": 80 say 2+, 43 give a range, 2 say two years.
- 134 read by the parser → 11 left out after reading (2 "up to two years", 1 "1 or 2 years", 1 conditional on a bachelor's, 6 not software engineering jobs, 1 duplicate role) → 2 added (missed by the section splitter) → **125**.
- Title says: no level word 90, level II/III/mid 27, senior 3, junior or early career 2, associate or level I 2, staff 1. "Member of Technical Staff" counts as no level word; "Early Careers" counts as early career.
- 35 name a top to their range (most often 4 years, 17 ads); 90 name none.
- 69 employers; the largest has 16 (13%). At most 3 per employer: 101 ads, 71 no level word, 2 junior.
- 53 US, 54 elsewhere, 18 not stated: not US weighted.

## Question
How do job titles and the years of experience an ad states relate, in the software ads we count? Where do the "2 years" ads sit?

## Snapshot and query
- Live pool read once, read only, 14 Oct 2026 12:31 UTC (`snapshot.pool_rows`, counted with `snapshot.counted`: daily sources only, one role per employer). Scripts: scratchpad `explore.py`, `years_story.py`; the sample used for sketches is `docs/local/two-years-sample.json` (titles only).
- 26,175 counted jobs; 4,039 in the five software families (`market_pages.SOFTWARE`); **2,847 whose title names a software role** (developer, software, full stack, backend, frontend, mobile, platform or application engineer, a language plus engineer, member of technical staff, SRE). The other 1,192 are mechanical, nuclear, welding and similar "engineer" titles that the family classifier lets through. That's a separate issue for the market pages.

## Rules
- **Years:** `profile.years` with `years_kind == "required"`. "Preferably 2 years" counts as not stated.
- **Early career title:** `market_pages.entry_title` (graduate, new grad, grad, entry level, early career, junior, jr; none with a senior word beside it). Internship titles (`_INTERN_TITLE`) are their own rung.
- **Other rungs (story only, by title words):** associate / level I; level II, III, mid; senior; staff, lead, principal, manager, architect, head, director; **no level word in the title**.

## The table (software titled ads)

| Title says | Ads | Employers | State years | 0–1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|---|---|---|
| Internship | 172 | 99 | 4 (2%) | 4 | 0 | 0 | 0 | 0 |
| Junior, new grad, graduate | 72 | 53 | 13 (18%) | 6 | 2 | 3 | 1 | 1 |
| Associate, level I | 15 | 12 | 9 (60%) | 8 | 1 | 0 | 0 | 0 |
| No level in the title | 935 | 454 | 458 (49%) | 25 | 95 | 132 | 49 | 157 |
| Level II, III, mid | 95 | 42 | 71 (75%) | 1 | 26 | 20 | 4 | 20 |
| Senior | 911 | 417 | 585 (64%) | 0 | 3 | 27 | 57 | 498 |
| Staff, lead, principal, manager | 647 | 229 | 437 (68%) | 5 | 7 | 11 | 12 | 402 |

- **Two year ads:** 134, at 77 employers (largest 16). 95 have no level in the title, 26 level II or mid, 7 staff or lead, 3 senior, 2 junior, 1 associate. With at most 3 per employer: 110 ads, same shape.
- **Junior titled, no number:** 59 of 72 (82%), at 53 employers. Kept at 3 per employer the share is unchanged. By title word: junior/jr 28 ads (7 state), new grad 27 (3), graduate 11, early career 6. By place: US 28, elsewhere 29, unknown 15. Both splits are too small to publish as findings.

## Hand checks
- **The 59 junior titled ads without a number:** all read. 2 mention years, both as "preferred" or "preferably" (correctly not counted). Keyword counts, rough: 50 mention experience in some form; 20 mention internships or co-ops; 45 mention projects, a portfolio or GitHub; 39 a degree; 0 say no experience is required.
- **The 134 two year ads:** 88 say "2+ years" or "2 years"; 34 give a range starting at 2 (one employer's "2–12+ years" template appears 16 times); 2 say "up to two years"; 10 other wording. 15 random ads read in full: all consistent with the parse except the two "up to" cases.
- **Bug found:** "up to two years" is parsed as a required minimum of 2. Affects every page that counts years. Needs its own fix, test and recount before this story ships (`implementation-notes.md`).
- **Rule gaps found while sketching:** "Early Careers" (plural) isn't matched by `entry_title`; "Associate" was missed by the sketch's associate rule when capitalised. Both move a handful of ads between rungs; fix in the real implementation and recount.

## What the data can't say
How anyone screens. Whether a "2+ years" ad would consider a graduate. Why titles omit a level. Anything about ads outside the boards we read. The pool is about 40% US, 36% elsewhere, 23% unknown this week; a shift in one board's volume moves the mix.

## Stability
One snapshot. Publish only if, on three Mondays, the junior row stays roughly 75 to 90% without a number and two year ads with junior titles stay in single digits. Record each recount here.

| Date | Software titled | Junior titled | No number | Two year ads | Of which junior |
|---|---|---|---|---|---|
| 14 Oct (pool) | 2,847 | 72 | 59 | 134 | 2 |
| 19 Oct | | | | | |
| 26 Oct | | | | | |
| 2 Nov | | | | | |
