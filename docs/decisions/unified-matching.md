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
| An imported row with a link, after the import | saved CV | `job_profiles` | `services/application_import.py::match_imported` |

`application.match_method` records the scorer (`jobradar-fit-v2`) beside every
stored `match_score`, so a later scorer is never compared with this one as if
they were one scale. Rows scored by the retired weighted cosine keep
`jobradar-similarity-v1`.

## Why the candidate is rebuilt per request

A CV edit should change every match at once, and rebuilding the candidate is
milliseconds. Nothing per user is stored: the expensive half — reading each
posting — happens once per posting, in the daily run.

## Imported applications

An imported row is scored against the CV saved today, not the one the user
applied with months ago, which JobRadar never saw. So its score reads "how you
fit this job now", and its CV column stays empty rather than claiming a CV.
Rows without a link have no posting to read and stay unscored.
