# 2026-10-05: public market routes for the landing page

**Files:** `backend/src/api/market.py` (new), `backend/src/jobpool/market_look.py` (new),
`backend/src/jobpool/ad_reader.py` (new), `backend/src/jobpool/safe_fetch.py` (new),
`backend/src/jobpool/snapshot.py`, `backend/src/database/repositories/profile_repository.py`,
`backend/src/jobpool/posting.py`, `backend/main.py`; tests `test_market_look.py`,
`test_market_ad.py`, `test_safe_fetch.py` (new), `test_posting.py`.
Decision: `docs/decisions/market-look.md`.

## New

- `GET /market/look`: today's count per technical role family. Jobs, readable
  jobs, seniority in four buckets, the top 150 skills, up to 14 titles a level
  and about 6 sample ads a level. Same counting rules as the daily snapshot.
  Cached an hour in process; `Cache-Control: public, max-age=3600`.
- `POST /market/ad`: a pasted ad (text or link) to its title, family, level
  and the skills it asks for, required or optional. Never stored or logged.
- `safe_fetch.py`: the link fetch for public routes. Pins the checked IP (Host
  and SNI carry the name), 8 s, 2 MB streamed, 3 redirects each re-checked.

## Changed

- `snapshot.counted()` and `snapshot.pool_rows()`: the snapshot's dedupe and
  pool read, now shared with the live count so the two cannot drift.
- `profile_repository.COUNTED`: the live pool with only the counted fields.
  Same WHERE clause as `POOL` (now `_LIVE`). The snapshot uses it too.
- `posting.html_to_text` runs in linear time on broken markup. A stray `<` is
  escaped and comments are cut before parsing; the trailing-fragment cut is a
  search, not a backtracking regex. 50 KB of `"<a x "` took over two minutes
  before; 2 MB of it takes about a second now. Output is unchanged on all
  26,606 stored descriptions, so `PROFILER_VERSION` stays `requirements-v4`.

## Measured on the production pool (read only)

- 12,986 live rows. SQL about 110 ms on the server, 1.2 to 4 s to a laptop
  (transfer). Aggregation 0.1 to 0.3 s.
- 18 families. Body 179 KB, 40 KB gzipped.

## Owed

- No rate limiter exists in the API; `/market/ad` should get one.
- No GZip middleware; the look body would shrink to about a fifth.
