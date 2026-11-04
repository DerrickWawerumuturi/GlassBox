# 2026-10-19: fewer reads out of Neon

Neon's free plan allows 5 GB of data out a month. On 19 Oct the project was at 87.1%. Two reads were repeated for
nothing. Decisions: `docs/decisions/market-snapshots.md` ("Once a day"), `docs/decisions/deployment.md` ("A wake
reads nothing from Neon unless a request needs it"). Review page: `docs/local/fewer-neon-reads-review.html`.

## The change

- **The day's snapshot is taken once** (`src/jobpool/snapshot.py`, `snapshot_repository.taken`). It counts the whole
  live pool, about 15 MB out of Neon, and the collector runs 4 times a day. The first run of the UTC day takes it;
  later runs print "snapshot: today's is taken already". `python -m src.jobpool.snapshot` still replaces the day's row.
- **The API reads nothing at startup** (`main.py`, `src/api/market.py`). `market.keep_fresh` loaded the published
  count, about 290 kB, on every wake, a scanner's 404 included. The first `/market` request loads it now, through the
  path `market_look._built` already had (503 with Retry-After for a few seconds).

## Tests

`test_snapshot.py`: a later run the same day reads no pool (fails without the check); the first run and a run by
hand take it. `test_market_look.py`: startup, `/health` and a scanner's `/.env` read nothing, and the first
`/market/look` loads the count (fails with `keep_fresh` back). `test_api_pool_and_import.py` replaces the day's row
by hand. Local database: 707 passed. Without a database: 657 passed, 21 skipped.

## Cost

Fewer calls, never more: no new request, schedule or background work. About 45 MB a day less out of Neon from the
snapshot, and about 290 kB less per API wake.
