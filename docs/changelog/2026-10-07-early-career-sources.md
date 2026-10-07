# 2026-10-07 — More early career jobs in the pool

**Files:** `backend/src/jobpool/sources.py`, `backend/src/jobpool/companies.txt`,
`backend/tests/test_daily_pool.py`, `docs/decisions/job-sources.md` (new),
`docs/architecture/overview.md`.

## Why

The entry level software page counted 136 jobs; early career tech across all
families was 329 (production pool, read only, 7 Oct). Most early career roles
sit on company boards the pool did not read, and Arbeitnow, the source with the
best early career rate, was read only to page 2.

## What changed

- **Arbeitnow reads its whole feed.** `arbeitnow()` follows the feed's pages until
  it ends (28 pages on 7 Oct), capped by `ARBEITNOW_PAGES` (40). A later page
  failing keeps what was read; a dead first page still fails the source.
- **80 company boards added** to `companies.txt`: 4 campus or early career
  boards, 42 boards with early career roles outside the US too (Celonis, Jump
  Trading, DRW, IMC, Tower Research, Veeam, Alarm.com, Rocket Lab, Shift
  Technology, Docplanner, Back Market, The Exploration Company, Ekimetrics,
  Telus Digital, Cato Networks...), and 34 US boards with 5 or more each.
  The rule and the boards left out are in `decisions/job-sources.md`.

## Measured effect (7 Oct, in memory, the pool's own rules)

| | Before | After |
|---|---|---|
| Early career tech jobs | 329 | about 1,125 |
| outside the US | 137 | about 372 |
| Entry level software jobs | 136 | about 509 |
| outside the US | 49 | about 139 |
| Tech share of counted jobs | 42% | about 44% |
| Counted jobs | 11,333 | about 18,000 |

Board counts move with hiring seasons; these are one day's.

## Tests

`test_daily_pool.py`: the feed is read to its end, the page cap holds, and a
later failed page keeps earlier pages while a failed first page fails the
source. All three fail on the old two page loop.

## After the push

Run "refresh job pool" by hand once. Expect about 27,000 jobs fetched from
about 274 sources and about 6,000 profiled; the run should stay under 5 minutes.
