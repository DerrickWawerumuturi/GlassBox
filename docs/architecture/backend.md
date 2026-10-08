# Backend architecture

FastAPI service. `main.py` holds the routes; everything they call lives under
`src/`, grouped by what it is about rather than by kind of code.

## Layout

```
main.py                              routes, auth, status codes — no business logic
src/api/market.py                    public routes: GET /market/look, GET /market/page/{name}, POST /market/ad
src/api/daily_counts.py              daily totals: scans started, finished, failed, reused; accounts created
skill_db_relax_20.json               EMSI skill names, a dictionary for discover.py only (not in the image)
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
    embedder.py                      MiniLM: the off-market filter
    parser.py                        a scan's skills, from requirement profiles
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
  market_look.py                     the same count live, for the landing page (GET /market/look)
  market_pages.py                    public market pages from the same read (GET /market/page/{entry-level-software, software-engineering, ai, machine-learning, devops})
  market_story.py                    each page's `story`: what its editorial sections are written from, the breadth rule, the thresholds
  ad_reader.py                       a pasted ad or link -> its asks (POST /market/ad)
  safe_fetch.py                      SSRF-guarded fetch for public routes: pinned IP, 8 s, 2 MB, 3 hops
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
    users.py                         resolve_user_id, a user's data, their Candidate, the kept CV profile
    applications.py                  the application tracker
    spreadsheet.py                   reading a tracker spreadsheet (pure)
    application_import.py            preview and import, with duplicate detection; matching afterwards
tests/                               pytest; test_api_user_data needs DATABASE_URL,
                                     test_api_pool_and_import a LOCAL database
```

## Request lifecycle

`main.py::analyze` checks the upload (`src/cv/upload.py`: a PDF of 10 MB or less, else 413 or 415, before the analysis queue), reads its text, gets a parsed profile, and matches it:

```python
data = await upload.pdf_bytes(file)                          # 413 / 415 before the queue
async with analysis_lock:
    cv_text = await _pdf_text(data)
    query = await _parsed_cv(cv_text, file.filename, user)   # Groq, or the kept profile
    result = await run_in_threadpool(_agent().match, query, preferences)
```

The agent is two calls: `JobRadarAgent.parse` (the one Groq call) and
`JobRadarAgent.match` (search, rank, market; no LLM). For a signed-in user,
`_parsed_cv` reuses the profile kept in `latest_cvs` when the text's sha256
matches and the parser version is current; otherwise it parses and replaces
the kept row. `POST /analyze/reuse` runs `match` on the kept profile with no
upload at all. Only the profile is kept, never the PDF or the text
(`decisions/cv-storage.md`).

Both steps are offloaded because they are synchronous and slow; running them
inline pinned the event loop and made the whole API unreachable. The lock is
required *because* of the offload — see `decisions/` and the changelog.

The analysis stack (sentence-transformers and torch) is **not** imported when
`main.py` loads. `_agent()` imports it on first use and startup warms it in the
background, so after a scale-from-zero every other route answers in under a
second instead of waiting for the model.

Every signed-in request becomes a user through `services/users.py::resolve_user_id`,
which refuses non-numeric (stale-session) subjects on every route. A write by
an unknown user creates them; that response carries `X-Account-Created: 1`
(a middleware, exposed through CORS) for analytics' `signed_up`. Unhandled
errors become a generic 500 from a middleware registered inside CORS, so the
browser gets a readable error and never the raw exception text.

`/analyze` and `/analyze/reuse` are each counted as one scan (`@daily_counts.scan`):
started on the way in, then finished or failed. The same middleware counts
`accounts_created` when it sends the header. The writes run on one background
thread into `daily_counts`, one row per UTC day; a failed write is logged and
dropped, and the request never waits (`decisions/analytics.md`, "Server side counts").

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
"Custom Backend", "Workflows" and "Curiosity". SkillNer, spaCy and their code
were deleted on 2026-10-05. See `decisions/skill-vocabulary.md`.

### 4. The off-market filter

`all-MiniLM-L6-v2` runs **before** the postings are read for skills, scoring the user's role + skills
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

`python -m src.jobpool.daily` (`.github/workflows/job-pool.yml`, every 6 hours,
inside the deployed image `jobradar:live`) fetches every board in `sources.py`
concurrently — company ATS boards listed in `companies.txt`, the remote
aggregators, Kenyan job boards' RSS feeds — wakes the database (one retry,
`session.wake`), then saves each source in its own transaction
(`ingestion.persist_source`): its jobs from the last 90 days, its fetch in
`source_runs`, and the closing rule (`decisions/job-sources.md`, "Closing
jobs"). Then it reports sources failing for 7 days as retired and profiles
only postings that are new, edited (`content_hash`) or read by older rules
(`PROFILER_VERSION`). `--profile-only` skips fetching; `--dry-run` fetches and
stores nothing.

A source failing costs nothing: its jobs stay as they were. The run fails (red
in Actions) only when most sources fail or nothing could be saved. After the
snapshot, `publish.run()` publishes the week's market if it is due and passes
its gates (`decisions/market-publication.md`).

Last, `snapshot.take()` counts the profiled live pool into `market_snapshots`:
one row per role family per day, with postings, readable postings, seniority mix
and each skill as `[required, preferred, mentioned]`. It is the only record of
what was asked for on a past day, since profiles are overwritten and jobs will
not be kept forever. A failed snapshot is logged and does not fail the run;
`python -m src.jobpool.snapshot` takes it again. See
`decisions/market-snapshots.md`.

`GET /dashboard/opportunities` matches the live pool (`sources.POOL_WINDOWS`:
not closed, 90 days old at most, seen in the last 30 days; a complete board's
row the collector hasn't placed yet, in the last 3) against the saved CV, prefiltered in SQL to
the role families the CV points at. Cross-posted copies of one role at one
employer are folded into one row (`also`). Default order is newest first by the
posting's own date, else an estimate from a relative "2 days ago", else when
JobRadar first fetched it — each row says which (`date_basis`). Results are
cached per user and CV fingerprint for ten minutes.

## Public market routes

Three routes need no sign-in (`src/api/market.py`; `decisions/market-look.md`,
`decisions/market-pages.md`):

- `GET /market/look`: the latest weekly publication's count per technical role
  family (`market_publications`, `src/jobpool/publish.py`), for the landing
  page. Loaded at startup and checked for a newer one every 10 minutes; it is
  counted from the live pool only before the first publication exists. The live pool counted by the snapshot's rules (`snapshot.counted`):
  daily sources only, a cross-posted role once, skills over readable jobs. Per
  family: jobs, readable, seniority in four buckets, the top 150 skills, up to
  14 titles a level and about 6 sample ads a level. Never any ad text. Built
  by `publish.py` once a week; a request only reads what is loaded, 503 with
  `Retry-After` only while a fresh process reads the row.
  Sent gzipped with `Cache-Control: public, max-age=3600`. 503 when there is no database.
- `GET /market/page/{name}`: one public market page, built with the count
  above from the same read of the pool (`market_look.compute`), so the two
  always agree; same cache, 503 and headers. Five pages:
  `entry-level-software` (entry level software jobs against senior ones) and
  one per job family (`software-engineering`, `ai`, `machine-learning`,
  `devops`, against the family's senior jobs). Each has its counts, titles,
  `publishable` (false under 100 readable jobs) and a `story`
  (`market_story.py`): skills with their category, employers and the
  comparison count, the headline skill, the squares, languages per job, the
  contrast, categories, years asked, and the sections the data supports. An
  unknown name is a 404 before anything is read.
- `POST /market/ad`: `{"text"}` (at most 50,000 characters, else 413) or
  `{"url"}`. Read by `profile_job`; returns the title, family, level and the
  skills asked as `req` or `opt`. Nothing is stored or logged. Links go through
  `safe_fetch.py`: 400 for a private or non-web address, 422 when the page
  can't be read.

`POST /market/ad` is rate limited: 20 calls an hour per client, then 429
(`src/api/rate_limit.py`). The client is the connecting address, or the last
`X-Forwarded-For` entry when the connection comes from the platform's ingress.
The count is in memory, which holds while the app runs one replica; with more,
each replica keeps its own count and a restart forgets it
(`decisions/market-look.md`). `GET /market/look` and `GET /market/page/{name}`
need no limit: they only read what was built in the background.

## The skill vocabulary

Everything compares skill *strings*, so both sides speak one vocabulary:
`src/matching/skills.txt`, a closed list grown by review
(`decisions/skill-vocabulary.md`). Postings are read by `skills.scan`, and the
CV's free-text skills by `parser.cv_skill_names`, which uses `resolve_all`.
Both are displayed in the vocabulary's spelling ("React", "PostgreSQL"). Names
the vocabulary does not know are kept as written: still the user's, never
matched.

Three rules keep everyday words from counting (2026-10-05, `requirements-v4`):

- **A spelling stops at a comma or full stop.** The words of a multi-word alias
  may be joined by spaces, hyphens or slashes only, so "product, design and
  engineering" is two teams, not Product design.
- **Some names count only in context.** `?observability[...]` in `skills.txt`
  resolves on a CV, but in a posting it counts only in a sentence that also says
  a practice word (monitoring, metrics, traces, logs...). "Performance,
  observability and security" is a quality, not a tool.
- **The employer's own name is not a skill.** `requirements._skills` skips a
  match whose spelling begins the company's name: "Datadog" at Datadog,
  "GitLab" at GitLab Inc.

## Storage layer

PostgreSQL on Neon. The job pipeline's tables:

```
searches ─1─n─ search_provider_runs
   │
   └─n─ job_observations ─1─ jobs ─1─ job_profiles

job_skills, skills (SkillNer's output until 2026-10-01; nothing reads or writes them)

market_snapshots   (taken_on, profiler_version, family): daily counts, no job ids
market_publications  one row per weekly publication or rejected candidate: gates, /market bodies
source_runs        one row per collector source per run: ok, jobs listed, whole, closed, retired
daily_counts       one row per UTC day: scans started, finished, failed, reused, accounts created; no ids
```

and each user's data: `users` (with `location_preferences`) ─1─n─ `cvs`,
`analyses`, `latest_cvs` (the parsed profile of the latest CV, one row),
`application` ─1─n─ `application_events`. `application.job_id`
references `jobs` with `on delete restrict`. Job lifecycle signals
(`last_shown_at`, `last_interaction_at`, `archived_at`) and the `job_retention`
view are described in `decisions/job-retention.md`.

`jobs` holds **source data only** — provider values verbatim plus the complete
`raw_payload` as `jsonb`. What JobRadar derives lives in `job_profiles` (what a
posting requires, for matching and the market; one row per job, about 300
bytes), so the raw/processed split is a table boundary rather than a column
prefix.

A job's timestamps: `posted_at` is the source's own date, never guessed
(`posted_at_raw` keeps what it said, e.g. "2 days ago"); `first_seen_at` is when
JobRadar fetched it and never moves; `last_seen_at` is the latest sighting;
`updated_at` moves only when the stored posting changed. `source` is the
collector source that last listed it ("greenhouse:stripe"), `closed_at` when its
complete board stopped listing it (two full fetches missed, `missed_fetches`).

Identity is `(provider, external_id)` with a unique constraint; postings without
a provider id get `fp:<sha256[:32]>` over provider/company/title/location/url,
recorded in `identity_source`. Writes are a single batched upsert, so repeating
a search updates `last_seen_at` and appends an observation rather than inserting
duplicates.

`profiler_version` on `job_profiles` plays the same part for the rules: a bump
re-profiles every stored job, and market snapshots start a new series.

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
| `JOBRADAR_RELEVANCE_ALPHA` | Off-market cut, as a fraction of the best title match (default 0.30) |
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
analysis loads MiniLM into the main process. Until 2026-10-01 it also loaded
`en_core_web_lg` and SkillNer's 31k-entry matchers, about 2 GB with the
extraction workers; see `docs/changelog/2026-08-25-container-oom.md`.

## Known limitations

- Years of experience are read from CV dates as written: a part-time or
  freelance role counts as full time.
- The matching vocabulary (`skills.txt`) is technical; roles outside tech match
  on role and level but barely on skills.
- The employer rule reads the company's name as given: a skill named by a
  company that is not the employer ("Grafana Labs CEO" as an investor) still
  counts.
- `job_skills` and `skills` still exist in the database, unused. Dropping them
  is a migration for a later day.
