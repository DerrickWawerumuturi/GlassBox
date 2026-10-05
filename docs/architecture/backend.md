# Backend architecture

FastAPI service. `main.py` holds the routes; everything they call lives under
`src/`, grouped by what it is about rather than by kind of code.

## Layout

```
main.py                              routes, auth, status codes — no business logic
skill_db_relax_20.json               EMSI skill database, read by SkillNer from the working directory
src/Agent/                           CV analysis (a scan)
  Framework/
    JobRadarAgent.py                 orchestrator; score_jobs ranks through src/matching
    SearchEngine.py                  search legs, dedupe, eligibility filter
    providers.py                     JSearch, The Muse, Jooble, and the job pool
    MarketAnalyzer.py                skill demand, gaps, presence, coverage
  utils/
    llm_client.py                    GroqModel("user" | "cv"): text -> ParsedQuery / CVQuery
    prompts.py                       prompts for both
    location.py                      location resolution, eligibility, tiers, fit
    skill_extractor.py               SkillNer wrapper, canonical EMSI names (market charts)
    extraction_pool.py               process pool for extraction
    embedder.py                      MiniLM: the off-market filter before extraction
    parser.py                        extract skills for a list of jobs
    types.py                         pydantic + dataclass models, API request models
src/matching/                        how well a CV fits a job — the one match score
  skills.py + skills.txt             technology vocabulary: aliases, related-skill credit
  roles.py                           role family and level from a title (jobs and CVs)
  requirements.py                    a posting -> JobProfile (years, skills by section, gates)
  candidate.py                       a CV -> Candidate (skills, years per track from dates)
  matcher.py                         gates, quality, multipliers, reasons
  discover.py + discover_report.py   where skills.txt is thin, and candidates for a person to approve
  skills_rejected.txt                terms reviewed and turned down; never suggested again
src/jobpool/                         jobs from outside an analysis
  sources.py                         every daily-fetch board adapter, fetch_all, pool windows
  posting.py                         provider fields -> clean values: HTML, dates, display
  daily.py                           the scheduled pool refresh and profiling
  snapshot.py                        the day's market snapshot: what the live pool asks for, per family
  opportunities.py                   the pool matched to one user's CV
  extract.py                         a pasted URL -> job fields (SSRF-guarded fetch)
  service.py                         extract + pool lookup + match + storing the posting
  retention.py                       read-only lifecycle report
src/cv/current_user.py               JWT -> claims (required and optional)
src/database/
  session.py                         pooled connections (Neon)
  migrate.py                         SQL migration runner
  fingerprint.py                     posting identity: resolve_identity, fingerprints
  migrations/*.sql                   schema, applied in filename order
  models/job.py                      row-shape dataclasses
  repositories/                      SQL, one module per table group
  services/
    ingestion.py                     pipeline storage (searches, jobs, skills, profiles)
    users.py                         resolve_user_id, a user's data, their Candidate
    applications.py                  the application tracker
    spreadsheet.py                   reading a tracker spreadsheet (pure)
    application_import.py            preview and import, with duplicate detection; matching afterwards
tests/                               pytest; test_api_user_data needs DATABASE_URL,
                                     test_api_pool_and_import a LOCAL database
```

## Request lifecycle

`main.py::analyze` reads the upload's text and runs the agent:

```python
async with analysis_lock:
    cv_text = await _pdf_text(file)
    return await run_in_threadpool(_agent().run, cv_text, preferences)
```

Both steps are offloaded because they are synchronous and slow; running them
inline pinned the event loop and made the whole API unreachable. The lock is
required *because* of the offload — see `decisions/` and the changelog.

The analysis stack (spaCy, SkillNer, sentence-transformers) is **not** imported
when `main.py` loads. `_agent()` imports it on first use and startup warms it in
the background, so after a scale-from-zero every other route answers in under a
second instead of waiting ~10s for models.

Every signed-in request becomes a user through `services/users.py::resolve_user_id`,
which refuses non-numeric (stale-session) subjects on every route. Unhandled
errors become a generic 500 from a middleware registered inside CORS, so the
browser gets a readable error and never the raw exception text.

## Pipeline stages

### 1. GroqModel("user") → ParsedQuery

`llm_client.GroqModel("user").parse(cv_text)` calls Groq with `SYSTEM` +
`USER_PROMPT`, `response_format={"type": "json_object"}`, `temperature=0`, and
validates the reply into `ParsedQuery`. `GroqModel("cv")` is the same call with
`ONBOARDING_PROMPT` and `CVQuery`, used by `/cv/parse`.

Appending the full JSON schema to the system prompt was tried and removed: on a
real CV it made `experience_level` flip between Mid and Senior and caused a JSON
validation failure, for ~600 more tokens per call.

`ParsedQuery` carries the role, skill list, experience level, location and
several unused-but-parsed fields. Every field is optional. The agent maps it
field by field into a `SearchQuery` (`SearchQuery.from_parsed`) for the search.

Model and key come from `GROQ_MODEL_NAME` / `GROQ_API_KEY`.

### 1b. Persistence (interleaved, not a stage)

Storage is a side branch off the orchestrator, not a step the analysis waits on.
`JobRadarAgent` makes three fail-soft calls into `JobIngestionService`: record
the search, persist raw postings before parsing, persist extracted skills after
it. Nothing downstream reads from the database, and a failure degrades JobRadar
to its previous behaviour rather than failing the request.

See `decisions/persistent-job-storage.md`, and the storage section below.

### 2. SearchEngine → list[Job]

Four providers in `providers.py`. `JobProvider.search` owns timing, failure
handling and the run-log entry; a provider only builds its request and maps
fields. Each declares which search legs it serves:

| Provider | Legs | Key |
|---|---|---|
| JSearch | local, remote, fallback | required |
| The Muse | local, remote, fallback | required |
| Jooble | local, fallback | optional |
| Pool | local, remote, fallback | database |

RemoteOK and Remotive are read through the pool: the daily fetch stores their
whole boards, and their live search filters barely filter.

A search resolves the user's location, then runs `local:<country>` and
`remote:global` concurrently. Below `MIN_JOBS_FLOOR = 15` usable postings it
widens to `fallback:us` / `fallback:gb`. Every call carries
`REQUEST_TIMEOUT = (5, 30)`.

Results are deduplicated by the same identity storage uses (`resolve_identity`),
and postings the user cannot hold are dropped by the same rule ranking uses
(`location_tier(...) == "ineligible"`). `get_jobs` returns a `SearchOutcome`
with the jobs and a coverage report.

Adzuna stays out: it truncates descriptions to 500 characters, and its country
list excludes Kenya.

See `decisions/location-aware-search.md`.

### 3. Skills from profiles → (jobs, readable)

`parser.parse_retrieved_jobs(raw_jobs, profiles)` returns every posting with
text as `ProcessedJob(job, skills)`, plus the readable subset. A posting's skills
are its requirement profile's (required, preferred, mentioned, then the title's),
named by the one vocabulary in `src/matching/skills.txt`: the same profile the fit
score, Opportunities and the market snapshot read. Stored profiles are reused
(`JobIngestionService.stored_profiles`); anything else is profiled in
milliseconds. Only readable postings (profile not `thin`) feed `MarketAnalyzer`,
since a short summary names few skills and would deflate every frequency. If a
scan has nothing readable, every posting is used.

Until 2026-10-01 this step ran SkillNer in an `ExtractionPool` of worker
processes, at seconds a posting, and its open EMSI search kept surfacing
"Custom Backend", "Workflows" and "Curiosity". `skill_extractor.py`,
`extraction_pool.py`, `stored_skills` and `persist_skills` remain for a week as a
rollback path, and the scan path no longer imports them. See
`decisions/skill-vocabulary.md`.

### 4. The off-market filter

`all-MiniLM-L6-v2` runs **before** extraction, scoring the user's role + skills
against each job title and dropping postings below `alpha × best_score`. This
keeps off-market postings — copywriter, sales, aviation — out of the market
statistics, which weight every posting equally. It is the only use of
embeddings left. See `decisions/embeddings.md`.

### 5. Matching + MarketAnalyzer

`JobRadarAgent.score_jobs` builds a `Candidate` from the ParsedQuery (whose
dated positions give years per track) and runs every job through
`src/matching` — the same matcher Opportunities and pasted links use. Each job
is scored on its stored profile (`stored_profiles`), which `persist_jobs` has
just refreshed, so it scores exactly as it does in Opportunities; only a job
that could not be stored is profiled in memory. Jobs
behind a gate (ineligible, too senior, too many years short) are `unlikely` and
sort after every job the user can get. See `decisions/fit-matching.md`.

`MarketAnalyzer.analyze` aggregates skill frequency, gaps, user presence and
coverage across all jobs. See `decisions/market-analyzer.md`.

## Daily pool and matching

`python -m src.jobpool.daily` (`.github/workflows/job-pool.yml`, 05:00 UTC)
fetches every board in `sources.py` concurrently — company ATS boards listed in
`companies.txt`, the remote aggregators, Kenyan job boards' RSS feeds — keeps
postings from the last 90 days, upserts them, and then profiles only postings
that are new, edited (`content_hash`) or read by older rules
(`PROFILER_VERSION`). It installs no ML stack: profiling is regex and dictionary
lookups, ~10-35 ms a posting. `--profile-only` skips fetching (the backfill after
migration 014 or a rules change); `--dry-run` fetches and stores nothing.

A source failing costs its own postings; the run fails (red in Actions) only
when most sources fail or nothing could be stored.

Last, `snapshot.take()` counts the profiled live pool into `market_snapshots`:
one row per role family per day, with postings, readable postings, seniority mix
and each skill as `[required, preferred, mentioned]`. It is the only record of
what was asked for on a past day, since profiles are overwritten and jobs will
not be kept forever. A failed snapshot is logged and does not fail the run;
`python -m src.jobpool.snapshot` takes it again. See
`decisions/market-snapshots.md`.

`GET /dashboard/opportunities` matches the live pool (`sources.POOL_WINDOWS`:
90 days old at most; boards read in full must have been seen in the last 3
days, anything else in the last 30) against the saved CV, prefiltered in SQL to
the role families the CV points at. Cross-posted copies of one role at one
employer are folded into one row (`also`). Default order is newest first by the
posting's own date, else an estimate from a relative "2 days ago", else when
JobRadar first fetched it — each row says which (`date_basis`). Results are
cached per user and CV fingerprint for ten minutes.

## The skill vocabulary

Everything compares skill *strings*, so both sides speak one vocabulary:
`src/matching/skills.txt`, a closed list grown by review
(`decisions/skill-vocabulary.md`). Postings are read by `skills.scan`, and the
CV's free-text skills by `parser.cv_skill_names`, which uses `resolve_all`.
Both are displayed in the vocabulary's spelling ("React", "PostgreSQL"). Names
the vocabulary does not know are kept as written: still the user's, never
matched.

The SkillNer notes below describe the extractor the scan used until 2026-10-01.
It is kept for a week as a rollback path.

Two denylists filter known-bad matches:

- `DENYLISTED_SURFACE_FORMS` — abbreviation collisions with ordinary prose
  (`San` → Storage Area Network, `com` → Component Object Model, `e` → E
  programming language). `c`, `r` and `go` are deliberately absent; they are
  real languages.
- `DENYLISTED_SKILL_NAMES` — real database entries that are job titles or fields
  of study rather than differentiating skills (`Software Engineering`,
  `Computer Science`, `Job Descriptions`).

`prepare_description()` drops legal, benefits and company-culture blocks, then
keeps only requirements-style sections — about a 66% character reduction, with a
fallback to full text when under 400 characters survive.

## Storage layer

PostgreSQL on Neon. The job pipeline's tables:

```
searches ─1─n─ search_provider_runs
   │
   └─n─ job_observations ─1─ jobs ─n─ job_skills ─1─ skills

market_snapshots   (taken_on, profiler_version, family): daily counts, no job ids
```

and each user's data: `users` (with `location_preferences`) ─1─n─ `cvs`,
`analyses`, `application` ─1─n─ `application_events`. `application.job_id`
references `jobs` with `on delete restrict`. Job lifecycle signals
(`last_shown_at`, `last_interaction_at`, `archived_at`) and the `job_retention`
view are described in `decisions/job-retention.md`.

`jobs` holds **source data only** — provider values verbatim plus the complete
`raw_payload` as `jsonb`. Everything JobRadar derives lives in `job_skills`
(SkillNer's EMSI skills, for market statistics) and `job_profiles` (what a
posting requires, for matching; one row per job, about 300 bytes), so the
raw/processed split is a table boundary rather than a column prefix.

A job's timestamps: `posted_at` is the source's own date, never guessed
(`posted_at_raw` keeps what it said, e.g. "2 days ago"); `first_seen_at` is when
JobRadar fetched it and never moves; `last_seen_at` is the latest sighting;
`updated_at` moves only when the stored posting changed.

Identity is `(provider, external_id)` with a unique constraint; postings without
a provider id get `fp:<sha256[:32]>` over provider/company/title/location/url,
recorded in `identity_source`. Writes are a single batched upsert, so repeating
a search updates `last_seen_at` and appends an observation rather than inserting
duplicates.

`extractor_version` is part of `job_skills`' primary key, so a future extractor
can reprocess stored payloads without destroying the current generation's output.

Migrations are numbered `.sql` files tracked in `schema_migrations`:

```
python -m src.database.migrate --status     list applied and pending
python -m src.database.migrate              apply outstanding
```

Two Neon-specific requirements: runtime connections set
`prepare_threshold=None` (the `-pooler` host is PgBouncer in transaction mode),
and migrations use `DATABASE_URL_DIRECT` — the same host without `-pooler`.

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY`, `GROQ_MODEL_NAME` | LLM interpretation |
| `JOBRADAR_GROQ_REASONING_EFFORT` | Preferred reasoning effort for the gpt-oss query interpreter (default `medium`; falls back to `low` on a budget failure) |
| `JOBRADAR_GROQ_MAX_COMPLETION_TOKENS` | Completion cap for that call (default 4096). Counts towards the tokens-per-minute limit even when unused, so raising it can cause a 413 |
| `JSEARCH_API_KEY`, `JSEARCH_HOST` | JSearch provider |
| `MUSE_API_KEY` | The Muse provider |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins for the dashboard (default `http://localhost:3000`). The browser calls the API directly, so an origin missing here refuses the preflight with a 400 |
| `ALLOWED_ORIGIN_REGEX` | Optional pattern for origins that cannot be enumerated, e.g. Vercel preview hostnames. Scope it to your project — `https://.*\.vercel\.app` admits anyone's deployment |
| `DATABASE_URL` | Neon pooled endpoint, used at runtime |
| `DATABASE_URL_DIRECT` | Neon direct endpoint, used by migrations |
| `JOOBLE_API_KEY` | Jooble provider (optional; disabled without it) |
| `JOBRADAR_EXTRACTION_WORKERS` | Override extraction pool size. **Set this explicitly in containers** — the default derives from `os.cpu_count()`, which ignores cgroup CPU quotas and reports the host's cores, so an unset value spins up 4 workers regardless of the container's allocation and each holds its own `en_core_web_lg` |
| `JOBRADAR_EXTRACTOR_VERSION` | Tag written to `job_skills` |
| `JOBRADAR_RELEVANCE_ALPHA` | Off-market cut, as a fraction of the best title match (default 0.30) |
| `JOBRADAR_MAX_EXTRACTION_CHARS` | Per-posting ceiling sent to the annotator (default 4000) |
| `JOBRADAR_SPACY_MODEL` | Path to `en_core_web_lg`. Tried first; otherwise `/app/en_core_web_lg` (the container layout), then the checkout's `en_core_web_lg/en_core_web_lg-3.8.0`, then the installed package |
| `JOBRADAR_DB_POOL_SIZE` | Connection pool max size |
| `API_JWT_SECRET` | Verifies the tokens the frontend mints. Required at import |
| `JOBRADAR_DEFAULT_COUNTRY` | Home market when a CV names no location (default `ke`) |
| `JOBRADAR_POOL_COUNTRIES` | Countries whose remote-eligible roles the daily fetch requests explicitly (default `KE,NG,ZA,GH,UG,RW,TZ,EG`) |
| `JOBRADAR_POOL_REGIONAL_PAGES` | Pages per country for that fetch (default 5) |

Loaded via `python-dotenv` from `.env`. Persistence disables itself when
`DATABASE_URL` is unset. `.env` is in `.dockerignore`, so in a container every
value must come from the platform's environment or secrets. `API_JWT_SECRET` is
read when `main.py` imports; a missing `GROQ_API_KEY` surfaces on the first
analysis or CV parse, because `Groq()` raises in its constructor.

Deployment sizing is a configuration concern of the same kind. The first
analysis loads `en_core_web_lg`, skillNer's 31k-entry matchers and MiniLM into
the main process — about 2 GB — and each extraction worker adds its own
pipeline on top. See `docs/changelog/2026-08-25-container-oom.md`.

## Known limitations

- Years of experience are read from CV dates as written: a part-time or
  freelance role counts as full time.
- The matching vocabulary (`skills.txt`) is technical; roles outside tech match
  on role and level but barely on skills.
- Skill extraction is **superlinear** in posting length: 46 postings / 85,900
  prepared characters took 434s on four workers, where a linear model predicted
  32s. Capping per-posting length would help more than trimming the corpus.
- SkillNer raises on some inputs; those postings are dropped and logged.
- Extraction remains ~80% of a scan's runtime for postings not read before,
  dominated by SkillNer's pairwise `token.similarity()` n-gram scoring.
- A posting SkillNer finds no skills in leaves no `job_skills` rows, so it is
  read again by the next scan that finds it.
