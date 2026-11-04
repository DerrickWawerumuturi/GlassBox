# 2026-10-01 — the skill list learns design, product, security and more (requirements-v2)

Step 2 of `decisions/skill-vocabulary.md`. The discovery report's suggestions
were reviewed against the definition (a concrete tool, technology or method a
CV could list and a course could teach). The founder delegated the calls.

---

### The vocabulary

**Files:** `backend/src/matching/skills.txt`, `backend/src/matching/skills_rejected.txt`

- **82 new skills, 165 → 247.**
  - Design: typography, visual design, product design, prototyping,
    interaction design, information architecture, design systems, Adobe
    Creative Suite, user research, brand, graphic and web design, illustration,
    motion, art direction, video editing.
  - Product: project management, agile/Scrum, PRDs, change and release
    management, business analysis, technical writing.
  - Security: IAM, DevSecOps, hardening, vulnerability management, network,
    endpoint and cloud security, threat detection, supply-chain security,
    forensics, cryptography.
  - Data and ML: business intelligence, data governance and quality, causal
    inference, operations research, forecasting, anomaly detection, feature
    engineering, recommender systems, model optimization, LLM serving, AI agents,
    speech AI.
  - Infra, IT, QA and others: distributed systems, system design, load and API
    testing, root cause analysis, help-desk tools, Google Workspace,
    Microsoft 365, device management, HPC, virtualization.
- **16 existing skills gained spellings.** For example, statistics: experimental
  design; SQL: relational databases; embedded systems: FreeRTOS; Redux: NgRx.
- **Merges, not duplicates.** Photoshop, Illustrator and InDesign are one skill
  (Adobe Creative Suite). Usability testing and UX research are user research.
  "A/B testing" already lived under statistics.
- **Left out on purpose:**
  - plain "Illustrator", which is also a job title;
  - company names that are also tools (Asana, OpenAI, Slack), because their own
    postings would inflate them;
  - plain "agile", which is an adjective in most prose.
- **299 terms rejected:** soft skills, generic engineering words (debugging,
  algorithms, scalability), fields and titles, company names, and benefits text
  read as skills ("Family Planning", "Childbirth"). About 100 borderline terms
  were left unreviewed and stay in the report.

### "REST APIs" needs building, not a mention

The bare spellings "api" and "apis" (since v1) made "Our APIs serve millions" and
"the OpenAI API" count as the skill REST APIs. That made it a top skill nearly
everywhere, and it inflated coverage and fit scores. Those spellings are gone.
"build / develop / design APIs", "API design", "RESTful" and "REST" in a list
still count. The OpenAI API still counts as LLMs, as it always did.

### A bar per family

**Files:** `backend/src/matching/discover.py`, `discover_report.py`

Coverage is judged against `COVERAGE_BAR` (80%), except product (60%,
`FAMILY_BARS`). Its postings ask mostly for judgement and strategy, which are
not skills by this definition, and padding the list with soft skills would bring
back the junk it replaced.

### Deploys re-read the pool

**File:** `.github/workflows/deploy.yml`

The daily 05:00 run already re-profiles anything with an older version. The gap
was the hours between a deploy that bumps the version and that run: Opportunities
reads only current-version profiles, so it would be empty. The deploy now runs
`python -m src.jobpool.daily --profile-only` right after the migrations, with the
same image and secret. It is incremental: about a second with nothing stale, and
1–2 minutes after a vocabulary change.

Checked: the daily job's minimal install (no ML stack, as in `job-pool.yml`)
imports `daily.py` and runs both the snapshot and `--profile-only` cleanly.

### The profiler version

**File:** `backend/src/matching/requirements.py`

`PROFILER_VERSION` is now `requirements-v2`, and its comment now says a
`skills.txt` change needs a bump too. Without the bump, stored profiles would
never be re-read with the new skills, because they are re-profiled only when the
text or the version changes. Market snapshots start a new series under v2, as
designed.

### Effect

Coverage (readable postings where the list finds 3+ skills), fresh local pool of
10,732 postings:

| Family | v1 | v2 | Bar |
|---|---|---|---|
| Design | 29% | 76% | 80% |
| Product | 33% | 58% | 60% |
| QA | 57% | 69% | 80% |
| AI engineering | 62% | 75% | 80% |
| IT support | 66% | 84% | 80% |
| Embedded | 71% | 83% | 80% |
| Data analytics | 72% | 83% | 80% |
| Software engineering | 75% | 83% | 80% |
| Machine learning | 83% | 94% | 80% |
| Security | 85% | 95% | 80% |

The v1 figures include the broad "api" spelling, so they overstate v1 a little.
v2 is measured without it. AI's most-asked skills now read LLMs 60%, Python 39%,
AI agents 38%, machine learning 37%.

Design's most-asked skills now read Figma 42%, product design 38%, design systems
37%, prototyping 33%, typography 26%, visual design 26%.

### Tests

- `tests/test_skills_vocabulary.py` (new):
  - every spelling belongs to one skill (the loader would otherwise silently move
    it);
  - nothing in `skills_rejected.txt` is also a skill;
  - a design posting reads as design;
  - spellings of one skill land on one key.

  Checked by breaking each: a duplicate spelling, a rejected term made a skill,
  and the v1 vocabulary each failed the matching test.
- `test_rest_apis_need_building_not_a_passing_mention`: checked by putting the
  bare "api, apis" back, which fails it.
- `test_each_family_carries_its_own_bar`.
- `tests/test_discover.py`: its example "unknown" terms (typography, visual
  design) are now known, so the tests use calligraphy and signage design.

Backend: 293 passed against a local Postgres, and 268 passed + 2 skipped with
`DATABASE_URL=""`. No matching test changed its result.

### Deploying

The deploy workflow now re-profiles right after the migrations (above), so no
manual step is needed. Opportunities can be briefly empty while that runs (1–2
minutes).

### Open

Below their bars: design 76%, AI 75%, QA 69% and product 58%. A second review
round on these four comes before step 3.
