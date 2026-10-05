# 2026-10-05 — Keep less of a CV

**Files:** `backend/src/matching/kept_cv.py` (new), `candidate.py` (`derive`),
`src/Agent/utils/types.py`, `src/database/services/users.py`,
`applications.py`, `src/database/backfill_kept_cv.py` (new), migration
`017_keep_less_cv.sql`; tests `test_kept_cv.py`, `test_backfill_kept_cv.py`,
`test_latest_cv.py`, `test_api_user_data.py`; frontend privacy pages, CV form
note, profile and application snapshot views. Decision: `cv-storage.md`.

- For signed-in users the stored CV, the kept latest profile and each
  application's snapshot keep only skills, the roles aimed for, level,
  education level, location and languages, plus what matching derived from
  the rest (years per track, families, title phrases, PhD).
- Never kept: name, email, phone, links, summary, companies, dates, schools,
  the parser's free text.
- Matching reads the same from a kept CV as from the full one (tested), and a
  rescan from the kept profile still works.
- Existing rows: `python -m src.database.backfill_kept_cv`, then the 017
  migration (a safety net that strips any key left).
- The display name comes from Google sign-in, never the CV. The privacy pages
  say what is kept now.
