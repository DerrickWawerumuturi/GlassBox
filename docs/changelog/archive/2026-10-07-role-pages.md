# 2026-10-07: role pages, the counts

Four more public market pages, backend only: what software engineering, AI,
machine learning and DevOps jobs ask for, counted from the live pool.
The frontend waits for the editorial redesign of the market pages.
Decision: `docs/decisions/market-pages.md` (Role pages). Review: `docs/local/role-pages.html`.

## Backend

- `src/jobpool/market_pages.py`: `role(family, rows)` builds one family's page:
  jobs, readable, employers, remote, US vs elsewhere vs unknown, largest
  employer, level split, top 15 skills (any and required), skills named
  together with the top 3 (5 each, with counts), up to 30 titles and
  employers, and `publishable` (100 readable jobs).
- `ROLES` names the pages: `software-engineering`, `ai`, `machine-learning`,
  `devops`. `PAGES` now holds all five, so `GET /market/page/{name}` serves
  them and anything else is a 404 before a read.
- `_hiring()` is shared by the entry level and role pages. The entry level
  page's body is unchanged.
- Tests: `test_market_pages.py`, 11 new cases (61 in all). Breaking the family
  filter or listing a skill beside itself fails 4 of them.

## Numbers on the 7 Oct pool (v5 profiles, read only)

| Page | Jobs | Readable | Employers |
|---|---|---|---|
| software-engineering | 1,379 | 1,366 | 256 |
| ai | 288 | 287 | 107 |
| machine-learning | 194 | 194 | 81 |
| devops | 203 | 200 | 100 |
| entry-level-software | 136 | 135 | 67 |

All clear the 100 rule.
