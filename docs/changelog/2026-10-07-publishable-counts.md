# 2026-10-07 — Publishable counts: families, Unity Catalog, years read

**Files:** `backend/src/matching/roles.py`, `requirements.py` (PROFILER_VERSION
`requirements-v5`), `skills.py`, `skills.txt`, `backend/src/jobpool/daily.py`,
`tests/test_requirements.py`, `tests/test_skills_vocabulary.py`,
`tests/test_daily_pool.py`, `tests/test_market_look.py`. Decisions:
`decisions/fit-matching.md` (years, families), `decisions/skill-vocabulary.md`
(Unity Catalog). Review page: `docs/local/publishable-counts.html`.

Goal: counts honest enough for a public sentence like "N of M entry level
software jobs ask for X". Measured on the live pool, read only: 10,067
counted jobs, pulled 7 October 2026 14:02 UTC (last refresh in the data:
6 October 09:26 UTC). Rules applied offline to the stored text; nothing written.

## What changed

- **Families.** Titles that reached software engineering only through
  "engineer" now go where they belong: chip and electronics design to
  `embedded`, physical work (facilities, fire protection, fluids, optical,
  construction, power, controls, data centre) to `non_tech`, a job function
  named first ("Legal Engineer", "Recruiter, Field Engineering") to `non_tech`,
  field, forward deployed, consulting and partner engineering to `solutions`,
  detection, identity and privacy engineers to `security`, IT and technical
  services engineers to `it_support`. The reverse: "Product Management",
  "Head of Product", "Tech Lead" and IT named as a department ("IT Intern")
  leave `other`. 575 counted jobs change family.
- **Unity Catalog** is no longer Unity. A new `!words` alias mark says "not this
  skill". Unity in readable tech jobs: 197 → 10.
- **Years.** The highest required figure stays (542 ads with several figures,
  checked: the lower ones sit inside the overall one). Fixed: a range after
  "experience" read its upper end ("Experience: 5-7+ years" read 7); a privacy
  notice read as a requirement; "No prior experience required" now reads 0.
  The gate still uses a range's lower end and the level its middle.
- **Snapshot failures are loud.** `daily.take_snapshot` prints a GitHub Actions
  `::warning::` annotation instead of a plain line. The run stays green.

## Before and after (counted jobs, 7 October 2026)

| | Before (v4) | After (v5) |
|---|---|---|
| Tech jobs | 4,284 | **4,257** |
| Readable tech jobs | 4,234 | 4,201 |
| Software engineering family | 1,581 | 1,260 |
| Software broad (SWE, backend, frontend, full stack, mobile) | 1,875 | 1,554 |
| Early career, all tech | 271 (74 internships) | **271** (81 internships) |
| Early career, software engineering family | 105 | 81 |
| **Early career, software broad** | 130 (129 readable) | **107 (106 readable)**, 54 employers, Stripe 21 |
| Senior software broad, readable | 1,346 | 1,131 |
| Unity, readable tech jobs | 197 | 10 |

Early career = the product's junior level (intern, entry, junior), or an
intern, graduate, new grad, entry level, junior or "Engineer I" title, or a
required figure of 2 years or less in a title with no senior word.

Early career by family after: software engineering 81, IT support 33, product
25, solutions 24, machine learning 14, full stack 12, data science 12, AI 10,
design 10, data analytics 8, security 7, data engineering 6, backend 6,
embedded 6, QA 5, mobile 5, DevOps 4, frontend 3.

Required years, tech jobs, after (before): a year or less 60 (62), 2 to 4 602
(632), 5 or more 1,977 (1,979), preferred only 79 (82), not stated 1,539
(1,529). The read itself changed 17 tech jobs; the rest is jobs moving in and
out of tech.

## What entry level software ads ask for (software broad, readable)

| Skill | Entry level, of 106 | Senior, of 1,131 |
|---|---|---|
| Python | 47 (44%) | 380 (34%) |
| Go | 37 (35%) | 328 (29%) |
| TypeScript | 30 (28%) | 254 (22%) |
| JavaScript | 29 (27%) | 100 (9%) |
| Java | 27 (25%) | 245 (22%) |
| LLMs | 25 (24%) | 295 (26%) |
| React | 23 (22%) | 195 (17%) |
| Distributed systems | 19 (18%) | 418 (37%) |
| Kubernetes | 16 (15%) | 271 (24%) |
| CI/CD | 7 (7%) | 212 (19%) |
| Incident response | 5 (5%) | 182 (16%) |

"Ask for" counts a skill named anywhere in the ad (required, preferred or
mentioned). Entry level ads name languages; senior ads name systems.

## Deploy

The version bump re-profiles the whole pool. The deploy workflow's "Re-profile
stale jobs" step (`daily --profile-only`) does it before the new image takes
traffic. Opportunities, the market look and snapshots read only
`requirements-v5` profiles, so snapshots start a new series.

## Tests

Tests from real titles and phrasings: 52 fail on the old rules. Backend:
518 passed against the local test database, 486 passed and 4 skipped with
`DATABASE_URL=""`.
