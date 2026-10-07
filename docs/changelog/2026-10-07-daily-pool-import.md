# 2026-10-07 — The daily job pool starts again

**Files:** `backend/src/Agent/utils/versions.py` (new), `llm_client.py`,
`src/database/services/users.py`; test `tests/test_daily_imports.py` (new).

## What broke

The 05:00 refresh failed on 6 and 7 Oct with `ModuleNotFoundError: No module
named 'groq'`, so today's count stayed at 5 Oct. The saved CV work (5 Oct) made
`services/users.py` import `PARSER_VERSION` from `llm_client`, which imports
`groq`. The daily job reaches `users.py` through `snapshot` and `opportunities`,
and `job-pool.yml` installs only the fetcher's packages, not `groq`.

## The fix

- `PARSER_VERSION` lives in `src/Agent/utils/versions.py`, a module with no
  imports. `users.py` reads it there; `llm_client` re-exports it, so
  `llm_client.PARSER_VERSION` still works.
- `test_daily_imports.py` imports the daily job in a fresh interpreter with every
  package from `requirements.txt` that the workflow doesn't install blocked. It
  fails on `groq` without the fix.

## Also found

- The daily snapshot had never run on the schedule. Its code reached GitHub with
  the 5 Oct push, and the runs since crashed on import. The only row
  (1 Oct, `requirements-v1`) was taken locally. A read only dry run on today's
  pool counted 11,774 rows into 21 families without error, so the first
  scheduled run after the push should write the first `requirements-v4` row.
- After the push: run the "refresh job pool" workflow by hand once, and check
  its log ends with `snapshot: N families`.
