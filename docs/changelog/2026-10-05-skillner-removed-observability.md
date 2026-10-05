# 2026-10-05 — SkillNer and spaCy deleted; Observability stops topping the charts

Two backend changes. Step 4 of `decisions/skill-vocabulary.md` deletes SkillNer
and spaCy, unused since the Market tab moved to the vocabulary on 2026-10-01.
And Observability, the top skill for backend and DevOps, turned out to be
counted mostly from the word used as a quality ("performance, observability and
security"), from team and product names, and from Datadog's own postings.

---

### SkillNer and spaCy deleted

**Files:** `backend/requirements.txt`, `backend/Dockerfile`, `backend/.dockerignore`,
`.gitignore`, `backend/.env.example`, `backend/main.py`,
`backend/src/database/services/ingestion.py`; deleted
`backend/src/Agent/utils/skill_extractor.py`, `extraction_pool.py`,
`backend/src/database/repositories/skill_repository.py`, `backend/token_dist.json`,
and the local (git-ignored) `backend/en_core_web_lg/`.

- `skillner` and `spacy` are out of `requirements.txt`. The Dockerfile no
  longer installs `en_core_web_lg` or copies the two EMSI JSON files.
- `JobIngestionService` loses `stored_skills`, `persist_skills` and the
  extractor version; `JOBRADAR_EXTRACTOR_VERSION`, `JOBRADAR_EXTRACTION_WORKERS`
  and `JOBRADAR_SPACY_MODEL` are gone.
- `skill_db_relax_20.json` stays: the discovery report reads it as a
  dictionary. It is now in `.dockerignore`.
- The `skills` and `job_skills` tables stay in the database, unused.
- **Size:** about 485 MiB less in the image. Measured in the venv as what only
  SkillNer and spaCy needed: en_core_web_lg 424.5 MiB, spaCy 24.5 MiB, nltk
  12.9 MiB, 18 smaller packages 16.6 MiB, plus 7 MB of JSON. The image itself
  was not rebuilt here.
- The three packages were uninstalled from `backend/.venv`; the app and the
  analysis agent import without them.

### Observability needs context

**Files:** `backend/src/matching/skills.py`, `skills.txt`

- New alias form `?word[context words]`: a skill name that resolves on a CV
  but counts in a posting only in a sentence that also says a context word.
  Observability's bare spelling uses it, with monitoring, alerting, metrics,
  logs, traces, telemetry, dashboards, SLOs and instrumentation as context.
- "observability tools", "tooling", "stack", "solutions" count anywhere.
  Prometheus, Grafana, Datadog, OpenTelemetry and the other tools are unchanged.

### A spelling stops at a comma

**File:** `backend/src/matching/skills.py`

- The words of a multi-word alias may be joined only by spaces, hyphens or
  slashes. "Work with product, design and engineering" named Product design 415
  times in the live pool; "data, analytics" named Data analysis 98 times.

### The employer's own name is not a skill

**Files:** `backend/src/matching/requirements.py`,
`backend/src/database/repositories/profile_repository.py`

- `_skills` skips a match whose spelling begins the company's name ("Datadog"
  at Datadog, "GitLab" at GitLab Inc.). The daily profile now reads
  `jobs.company` so the rule applies to the pool.
- `discover.py` no longer suggests a term the vocabulary already knows, so what
  these rules skip does not come back as a candidate.

### Profiler version

`requirements-v3` → `requirements-v4`. v3 was pushed today and was already
re-profiling production (18,000 of 26,613 jobs at v3 when checked), so reusing
it would leave those rows on the old rules. The deploy re-profiles the pool and
the snapshot starts a v4 series.

### Before and after, live pool (readable jobs, 2026-10-05)

| Family | Observability | Product design |
|---|---|---|
| Backend | 50 → 29 / 126 (1st → 10th) | 17 → 4 |
| Software engineering | 556 → 261 / 1,701 | 159 → 31 |
| DevOps | 81 → 64 / 176 (1st → 5th) | |
| AI | 74 → 28 / 305 | |
| Product | 66 → 20 / 608 | |
| Frontend | 13 → 5 / 48 | 20 → 5 |
| Full stack | 21 → 10 / 107 | 23 → 1 |
| Design | | 85 → 81 / 200 |

Hand-judged sample of 30 backend jobs: 16 real asks, all still match; 14
false, 11 now drop. Profiling costs about 0.7 ms more a posting (5.3 → 6.1 ms).

### Tests

- `test_skills_vocabulary.py`: observability as a quality (4 real sentences,
  fail on the old rules), tooling and practice (7 real sentences), a CV still
  resolving "Observability", spellings stopping at a comma.
- `test_requirements.py`: the employer's own name, and a tool the employer does
  not make.
- `test_discover.py`: a known skill left uncounted is not suggested.
- `test_api_pool_and_import.py`: the pool is profiled knowing the employer
  (fails without `j.company` in the stale read).
- `test_scan.py`: nothing in the backend imports spaCy or SkillNer.
- Local Postgres: 355 passed. CI mode (`DATABASE_URL=""`): 328 passed, 2 skipped.

### Not changed

- `ml` as Machine learning in product postings, `on call rotation` as Incident
  response, `relational databases` as SQL: plausible, left for review.
- `frontend/src/components/dashboard/SkillBadge.tsx` still has a comment about
  SkillNer's names; frontend was being edited by another session.
