# Decision: one match score for every job

**Status:** in place for every path — analyses, the pool, pasted links.
**Files:** `backend/src/matching/matcher.py` (`match`), `requirements.py`
(`profile_job`), `candidate.py` (`Candidate.from_cv`); callers below. How the
score is built, and why fit rather than similarity: `decisions/fit-matching.md`.

## The rule

There is no second scoring algorithm. Whatever path a job arrives by, its
score is `match(candidate, profile_job(job), job)`:

| Path | Candidate from | Job profile from | Caller |
|---|---|---|---|
| Opportunities (the daily pool) | saved CV + location preferences | `job_profiles`, stored by the daily run | `jobpool/opportunities.py` |
| An analysis' ranked jobs | the scan's ParsedQuery (with dated positions) | computed in memory | `JobRadarAgent.score_jobs` |
| A pasted link, on review | saved CV | computed in memory | `jobpool/service.py` |
| A pasted link, when saved | saved CV | `job_profiles` | `services/applications.py::_score` |
| A bookmark from Opportunities | the score the page showed | — | `toggle_bookmark` |

`application.match_method` records the scorer (`jobradar-fit-v2`) beside every
stored `match_score`, so a later scorer is never compared with this one as if
they were one scale. Rows scored by the retired weighted cosine keep
`jobradar-similarity-v1`.

## Why the candidate is rebuilt per request

A CV edit should change every match at once, and rebuilding the candidate is
milliseconds. Nothing per user is stored: the expensive half — reading each
posting — happens once per posting, in the daily run.

## What is still not scored

Imported applications (`services/application_import.py`) link to a pool job
when their URL matches one, but are not scored at import: an import is history,
and a score against today's CV would say little about an application made
months ago with another one.
