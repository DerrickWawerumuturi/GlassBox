# Backend architecture

FastAPI service. `main.py` holds the routes; everything they call lives under
`src/`, grouped by what it is about rather than by kind of code.

## Layout

```
main.py                              routes, auth, status codes — no business logic
skill_db_relax_20.json               EMSI skill database, read by SkillNer from the working directory
src/Agent/                           CV analysis
  Framework/
    JobRadarAgent.py                 orchestrator; score_jobs is the one match score
    SearchEngine.py                  search legs, dedupe, eligibility filter
    providers.py                     JSearch, The Muse, Jooble, and the job pool
    SimilarityEngine.py              scoring + MarketAnalyzer
  utils/
    llm_client.py                    GroqModel("user" | "cv"): text -> ParsedQuery / CVQuery
    prompts.py                       prompts for both
    location.py                      location resolution, eligibility, tiers, fit
    skill_extractor.py               SkillNer wrapper, canonical names
    extraction_pool.py               process pool for extraction
    embedder.py                      sentence-transformers
    parser.py                        extract skills for a list of jobs
    types.py                         pydantic + dataclass models, API request models
src/jobpool/                         jobs from outside an analysis
  sources.py                         every daily-fetch board adapter + fetch_all
  posting.py                         reading a posting: HTML, dates, experience, workplace, skills
  daily.py                           the scheduled pool refresh
  extract.py                         a pasted URL -> job fields (SSRF-guarded fetch)
  service.py                         extract + pool lookup + storing the posting
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
    ingestion.py                     pipeline storage (searches, jobs, skills)
    users.py                         resolve_user_id + a user's CV, analysis, preferences
    applications.py                  the application tracker
tests/                               pytest; test_api_user_data needs DATABASE_URL
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

### 3. Skill extraction → list[ProcessedJob]

`parser.parse_retrieved_jobs` submits every description to `extraction_pool` and
pairs results back with their job as `ProcessedJob(job, skills)`.

`ExtractionPool` wraps a `ProcessPoolExecutor` whose initializer builds one
`SkillExtractor` per worker and keeps it warm for the process lifetime. Workers
default to `min(4, cpus - 1)`, overridable with `JOBRADAR_EXTRACTION_WORKERS`;
the cap is a memory bound, since each worker holds its own `en_core_web_lg` and
the 31k-entry matchers.

Processes rather than threads: the work is pure CPU, so the GIL blocks any
thread gain, and spaCy pipelines are unsafe to call concurrently on one object.

A posting whose extraction raises is **dropped**, not kept with an empty skill
list — keeping it counted a job toward `jobs_analyzed` that contributed no
skills, deflating every frequency.

### 4. SentenceEmbedder

`all-MiniLM-L6-v2` encodes four facets for the user and for every job: title,
skills, experience, location. See `decisions/embeddings.md`.

The same model also runs **before** extraction, scoring the user's role + skills
against each job title and dropping postings below `alpha × best_score`. This
keeps off-market postings — copywriter, sales, aviation — out of the market
statistics, which weight every posting equally. See the 2026-08-21 changelog.

### 5. SimilarityEngine + MarketAnalyzer

`SimilarityEngine.calculate` scores each job: skills 0.45, title 0.25,
experience 0.10 (embedding similarities) and location 0.20 (tier fit from the
user's location preferences). Jobs the user cannot hold sort after every job
they can. See `decisions/unified-matching.md`. `MarketAnalyzer.analyze` aggregates skill
frequency, gaps, user presence and coverage across all jobs.

See `decisions/similarity-engine.md` and `decisions/market-analyzer.md`.

## The skill vocabulary

Everything downstream of extraction compares skill *strings*, so both sides must
speak one vocabulary.

`SkillExtractor` emits **canonical EMSI names** looked up by `skill_id` from
`SKILL_DB` — not SkillNer's `doc_node_value`, which is the matched span from
lemmatised text and arrives mangled (`big datum`, `machine learn`).

CV skills arrive from the LLM as free text, so `JobRadarAgent` passes them
through `skill_extractor.normalize()` before market analysis, mapping them onto
the same canonical names. Unrecognised skills are kept verbatim rather than
dropped.

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
```

and each user's data: `users` (with `location_preferences`) ─1─n─ `cvs`,
`analyses`, `application` ─1─n─ `application_events`. `application.job_id`
references `jobs` with `on delete restrict`. Job lifecycle signals
(`last_shown_at`, `last_interaction_at`, `archived_at`) and the `job_retention`
view are described in `decisions/job-retention.md`.

`jobs` holds **source data only** — provider values verbatim plus the complete
`raw_payload` as `jsonb`. Everything JobRadar derives lives in `job_skills`, so
the raw/processed split is a table boundary rather than a column prefix.

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

- Only The Muse supplies `experience_level`, so `experience_score` carries
  little ranking signal.
- Skill extraction is **superlinear** in posting length: 46 postings / 85,900
  prepared characters took 434s on four workers, where a linear model predicted
  32s. Capping per-posting length would help more than trimming the corpus.
- `overall_score` compresses into a narrow band (roughly 0.2–0.5), so raw
  percentages read low.
- SkillNer raises on some inputs; those postings are dropped and logged.
- Extraction remains ~80% of runtime, dominated by SkillNer's pairwise
  `token.similarity()` n-gram scoring.
