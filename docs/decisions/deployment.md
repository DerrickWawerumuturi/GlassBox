# Decision: deployment

**Files:** `Dockerfile`, `.dockerignore`

Deployed as a single container to **Azure Container Apps** — app
`jobradar-backend`, resource group `jobradar-rg`, region `southafricanorth`,
Consumption workload profile, image from `jobradarregistry.azurecr.io/jobradar`.

The database is Neon in `eu-central-1` (Frankfurt), so every SQL statement the
API sends crosses from South Africa to Europe and back. Code that talks to the
database per item is slow for that reason alone: the spreadsheet import once
took about six statements a row, which made a large sheet take minutes. Write
batches (one statement for many rows) wherever a request touches many rows.
Moving the API to a European region would make each statement near-free, at the
cost of one longer hop per request for users in Africa.

The ACA configuration lives in the portal, not in this repository. Nothing here
declares it, which is why the sizing fault in
`docs/changelog/2026-08-25-container-oom.md` was invisible to code review.

## Sizing: 1 vCPU / 2 GiB (2 vCPU / 4 GiB until 2026-10-19)

Driven by memory, not by CPU. `main.py:7` triggers the module-level singleton at
`JobRadarAgent.py:92`, and **uvicorn does not bind its port until that import
returns**. Resident in the main process before the first request:

| | Approx. RSS |
|---|---|
| `en_core_web_lg` vectors (`skill_extractor.py:10`, module scope) | 392 MiB |
| skillNer `SKILL_DB` (31,278 entries) + `PhraseMatcher` over all of it | several hundred MB |
| torch + MiniLM (`embedder.py:34`) | ~400 MB |

Each extraction worker then forks and builds its own `SkillExtractor`. At 1 GiB
the container never survived the import; see the changelog for the evidence.

Measured in the container (`docker stats`, `--memory=4g`, 2 workers):

```
after import, before any request   1.18 GiB     <- exceeded the old 1 GiB limit on its own
peak during pool extraction        3.25 GiB     <- 81% of 4 GiB
```

Those two numbers are the whole sizing argument. The first is why the container
could not boot at 1 GiB. The second is why the worker count has to be pinned:
at the default of 4 workers the same peak does not fit in 4 GiB either.

**Since 2026-10-05** the first two rows and the extraction workers are gone:
the scan stopped loading spaCy and SkillNer on 2026-10-01, and step 4 of
`decisions/skill-vocabulary.md` removed them from the image (about 485 MiB of
packages, model and data). torch + MiniLM is what remains. The 2 vCPU / 4 GiB
size has not been re-measured since; it is now generous, not tight.

**Since 2026-10-12** torch is gone too (MiniLM on ONNX Runtime,
`decisions/embeddings.md`). Measured locally with the analysis stack loaded:
490 MiB before, 251 MiB after (`docker stats`). The size is unchanged; whether
to shrink it is the founder's call.

**Since 2026-10-19** the app runs at 1 vCPU / 2 GiB (revision `--0000052`,
founder's yes, `az containerapp update --cpu 1.0 --memory 2.0Gi`). 251 MiB fits
eight times over. Half the price of every awake second; a scan's CPU bound
parts may take longer, to be watched on the next scans. `deploy.yml` sets only
the image, so a deploy keeps the size.

Consumption locks CPU and memory to a fixed ratio (0.5→1Gi, 1→2Gi, 1.5→3Gi,
2→4Gi), so memory cannot be bought without CPU. The 2 vCPU is wanted anyway —
extraction is ~80% of runtime and superlinear in posting length.

## Scale to zero, capped at one replica

`minReplicas: 0`, `maxReplicas: 1`.

Scale-to-zero because this is a low-traffic service and Consumption bills per
vCPU-second and GiB-second only while a replica runs; the monthly free grant
(180,000 vCPU-s / 360,000 GiB-s per subscription) covers roughly 25 hours of
active runtime at this size.

`maxReplicas: 1` is a spend guardrail. It costs almost nothing in throughput —
`/analyze` is already serialised behind `analysis_lock` (`main.py:44-56`), so a
second replica only helps genuinely concurrent users — while an uncapped fan-out
to 10 replicas of 2 vCPU could exhaust the grant in a few hours.

The cost of scale-to-zero is that every cold request pays the full model load
(~43s measured). That is why the probes below matter, and why nothing in the
boot path may touch the network.

Two billing facts (Microsoft Learn, "Billing in Azure Container Apps",
https://learn.microsoft.com/en-us/azure/container-apps/billing): the reduced
*idle* rate applies only to a revision with a minimum replica count above
zero, so with `minReplicas: 0` every second a replica runs is billed at the
active rate; and a revision scaled to zero costs nothing. The free grant per
subscription per calendar month is 180,000 vCPU-seconds, 360,000 GiB-seconds
and 2 million requests. So the cost is the time a replica is up, whatever it
does while up. Each wake keeps it up for at least the `cooldownPeriod`
(300 s) after the last request.

## What wakes the API, and the cold start (2026-10-12, GitHub issue #4)

Measured read only (Azure Monitor metrics at one minute, Log Analytics
console and system logs), 5 to 12 Oct 2026:

- A replica ran 5,181 of the 11,519 minutes (28% on 6 Oct, 55 to 64% on 7 to
  11 Oct): 517 wakes, a median 6 minutes each (start plus the 300 s
  cooldown), and 414 of them saw 3 requests or fewer. At 2 vCPU that is
  621,720 vCPU-seconds in 8 days, against a monthly free grant of 180,000.
- The first request after each quiet spell of over 6 minutes was
  `GET /market/look` 477 times, a market page 40 times, `/` 13 times, a
  signed in route 12 times, `/health` 3 times and scanners (`/.env` and the
  like) a handful. Wakes were spread evenly over the 24 hours. `/market/look`
  is only read by the server render of `/`, `/about` and `/product`, so
  nearly every wake was a page rebuild: every public page had
  `revalidate = 300` and the API fetch `next.revalidate: 300`, so any visit or
  crawler after 5 quiet minutes rebuilt a page against the API.
- `market.keep_fresh` (one database check every 10 minutes) doesn't keep a
  replica up: scaling follows HTTP requests, and the sessions ended about 5
  minutes after the last one. CPU over 0.01 core in only 463 of the 5,181 up
  minutes. It stays as it is.

Fix, frontend: every public page and the fetch now `revalidate` once a day
(86,400 s). The weekly publication revalidates the pages and opens each one
(`market-publication.md`), so a day is only the safety net; `next build`
still prerenders them all. Locally, after a build, visits to `/`, `/about`,
`/market`, a market page, the sitemap and a share image made no API call. The
browser's only call on public pages is `GET /health` when the CV sheet opens
(`wakeApi`), which is the visitor asking to scan. That held for signed out
visitors only until 2026-10-19 (below).

### Public pages read the database, not the API (2026-10-12, GitHub issue #5)

A day was still a timer: any visit after a quiet day rebuilt a page against
the API, and the weekly refresh woke it on purpose. Now the public pages read
the published week from Neon (`frontend/src/lib/published.ts`) and have
`revalidate = false`: they are built at deploy and rebuilt only when the
Monday publication calls `/api/revalidate` (`market-publication.md`, "The
frontend"). The refresh job no longer wakes the API.

What each automatic behaviour now calls, per day:

| What | Azure API | Neon | Vercel functions |
|---|---|---|---|
| A visit to a public page or share image | 0 | 0 | 0 (served from the cache) |
| The Monday refresh, once a week | 0 (was 1 wake, about 6 min) | 1 + 18 reads a week, about 3 a day | 1 + 18 renders a week, about 3 a day |
| A deploy (Production or Preview) | 0 | 18 reads | 0 at run time (renders in the build) |

Each read is one query for one row, under 1 MB (look and pages). That is
under 20 MB of transfer a week, against Neon's free plan allowance of several
GB a month (5 GB when this was written), and about 80 function invocations a
month against Vercel Hobby's 1 million. The reads on Monday come right after
the collector wrote the publication, so Neon is already awake: no extra
compute wake. The 18: `/`, `/about`, `/product`, `/market`, five market pages,
the years page, the sitemap, and seven share images.

### The site's database login (2026-10-12, issue #5)

The site logs in as `glassbox_site`, created by the founder in the Neon SQL
editor (not the console's Roles page: roles made there join `neon_superuser`).
It can connect, use schema `public` and `select` from `market_publications`,
nothing else; `default_transaction_read_only = on`; `statement_timeout = 15s`.
Its pooled address (`-pooler` host, `sslmode=verify-full`) is
`MARKET_DATABASE_URL` on Vercel for Production and Preview. The main database
password stays in the backend, GitHub secrets and Azure. Set the variable
before pushing code that reads it: without it `next build` fails on purpose and
Vercel keeps the last deployment live.

Where a cold start goes (median over 657 replica starts; p90 in brackets):

| Step | Seconds |
|---|---|
| replica scheduled to image pull starting | 2.0 |
| image pull, 588 MB compressed | 10.4 (11.6) |
| container created and started | 2.0 |
| process start to uvicorn listening | 1.4 (2.1) |
| scheduled to first request served | 19.3 (28.6) |
| scheduled to first 200 | 24.4 |
| analysis stack loaded, after uvicorn (20 s delay + load) | 24.9 |

291 of the 659 starts answered 503 first while the publication loaded. The
request's wait before the replica is scheduled isn't logged; the 43 s a
visitor saw is that wait plus the steps above plus a 503 retry.

Fix, backend: no torch (`decisions/embeddings.md`), and pandas, anthropic,
xai-sdk, ipython and pgvector dropped from `requirements.txt` (nothing
imports them; `requests`, which `providers.py` imports and xai-sdk used to
bring, is now listed). Measured locally (`linux/amd64` under emulation on an
Apple laptop, so slower than Azure):

| | Before | After |
|---|---|---|
| image (compressed, as pulled) | 587 MB | 224 MB |
| site-packages | 1.7 GB | 302 MB (+ 87 MB model) |
| `import main` | 1.5 to 1.7 s | 1.3 to 1.6 s |
| analysis stack load | 8.5 to 8.8 s | 1.3 to 1.6 s |
| container start to `/health` | 2.2 to 2.8 s | 1.9 to 2.0 s |
| container start to analysis stack loaded | 10 to 14 s | 3.3 s |

The pull time on Azure after deploy is to be read from the same system logs
(`PulledImage`, "in N s"); it isn't estimated here.

Not changed, the founder's call: `cooldownPeriod` (300 s, the floor on every
wake) and the 2 vCPU / 4 GiB size. Both are Azure settings, not code.

### Signed in page loads stop waking the API (2026-10-19, GitHub issue #15)

Measured from the container app's logs, 12 to 19 Oct: 59 wakes. 18 were
scanners asking for `.env` and `.git/config` (all 404), 18 signed in page loads,
13 the old market rebuilds (all on 12 Oct, none since), 10 health checks.
Each wake lasts about 6 minutes: the 300 s cooldown after the last request.

A signed in visit to any page, public ones included, asked for three things:
`GET /analysis` (`AnalysisProvider`) and `GET /cv` (`CVProvider`), both in the
root layout, and `GET /cv/latest` from the header's CV sheet (`useCvScan`), which
every page carries. Now (`frontend/src/lib/account-sync.ts`):

- The two stores fetch only on the product's pages (`/dashboard`, `/analysis`,
  `/onboarding`), once per page load. Public pages paint from this browser's
  copy, which the product pages and every scan keep current.
- The CV sheet reads the kept CV when it opens, not when the page loads. Opening
  it already wakes the API (`wakeApi`).

Calls a day: fewer, never more. Each avoided wake saves about 6 awake minutes
(about $0.02 at 1 vCPU) and about 0.025 Neon compute hours.

### A wake reads nothing from Neon unless a request needs it (2026-10-19)

Startup no longer loads the market count (`market.keep_fresh` is gone): it read
the publication row, about 290 kB, on every wake, a scanner's 404 included. The
first `/market` request loads it (`market_look._built`, 503 with Retry-After
meanwhile). Today nothing calls `/market` on a schedule: the site reads Neon
itself. Calls a day: fewer database reads, no new request.

## Probes: startup and readiness, no liveness

```yaml
- type: Startup       # TCP 8000, period 5s, failureThreshold 60  → 300s grace
- type: Readiness     # GET /health, period 10s, failureThreshold 3
```

The default ACA probe targets `/`, and there is **no `/` route** — only `/health`
(`main.py:30`) and `/analyze`. A replica coming up from zero therefore never
became routable, and the request held during scale-from-zero died at the fixed
240s ingress timeout while the revision itself reported `Healthy`.

The startup probe is TCP rather than HTTP on purpose: the port binding *is* the
signal that the import finished, and it needs no route to exist yet.

**No liveness probe, deliberately.** `/analyze` holds `analysis_lock` and
saturates the extraction pool for minutes at a time. A liveness probe that timed
out under that load would kill the container in the middle of an analysis, which
is a worse failure than the one it would be guarding against.

## Nothing in the boot path may touch the network

Two dependencies download themselves at import unless baked in, both inside the
startup window and both on the critical path of every scale-from-zero:

- **MiniLM** — the embedder loads it when the analysis stack loads. The image
  pre-fetches the files `embedder.py` names (`MODEL_FILES`, pinned revision)
  and pins `HF_HOME=/opt/hf` with `HF_HUB_OFFLINE=1`.
- **skillNer's databases** (until 2026-10-05) — `skillNer/general_params.py`
  opened `skill_db_relax_20.json` **relative to the working directory** and,
  failing that, fetched it from `raw.githubusercontent.com` with an unguarded
  `response.json()`, so a 404 killed uvicorn before it bound. The image copied
  both JSON files to `/app`. SkillNer is gone; `skill_db_relax_20.json` stays in
  the repository for the discovery report only and is kept out of the image.

This is the classic works-locally-fails-in-the-container shape: a development
checkout already had those files at the repository root, so the `try` branch
succeeded instantly and the remote fallback was never exercised.

## The 240s ingress limit is a real constraint

Consumption enforces a **fixed, non-configurable 240-second request timeout**;
raising it requires Premium Ingress. `docs/architecture/backend.md` records 46
postings taking 434s. A large `/analyze` will therefore exceed the timeout and
return 504 from a container that is perfectly healthy.

The durable fix is to make `/analyze` asynchronous — POST returns a job id and
the frontend polls — which also removes the cold start from the request path
entirely. That is a cross-repo change: the response contract, including the
double nesting at `ranked_jobs[i].job.job`, is mirrored verbatim by the frontend.

The 434 s figure was SkillNer extraction. Since 2026-10-01 a scan reads skills
from requirement profiles in milliseconds, and the `JOBRADAR_MAX_EXTRACTION_CHARS`
lever went with SkillNer on 2026-10-05.

## The spaCy model (removed 2026-10-05)

`en_core_web_lg` (~424 MiB unpacked, one 392 MiB file, over GitHub's 100 MB
per-file limit) was never in the repository; the image installed it from the
spacy-models wheel at build time. Step 4 of `decisions/skill-vocabulary.md`
removed it, spaCy and SkillNer from `requirements.txt` and the Dockerfile.

## Build for linux/amd64 explicitly

The ACA nodes are amd64. `docker build` on an Apple Silicon machine produces an
**arm64** image that pushes to the registry perfectly happily and then cannot
run, so the platform has to be forced:

```bash
docker build --platform linux/amd64 -t jobradar:<tag> .
docker tag jobradar:<tag> jobradarregistry.azurecr.io/jobradar:<tag>
docker push jobradarregistry.azurecr.io/jobradar:<tag>
az containerapp update -n jobradar-backend -g jobradar-rg \
  --image jobradarregistry.azurecr.io/jobradar:<tag>
```

The `docker build` in `CLAUDE.md` has no `--platform` because it is for running
the image locally, where the native architecture is what you want.

## Secrets

Values are currently set as plaintext `env` entries on the container app, which
means anyone with Reader on the resource group can read every provider key and
the full Neon connection string via `az containerapp show`. They belong in
container app secrets, referenced as `secretref:`. Note that `GROQ_API_KEY` is
import-fatal (`llm_client.py:14`), so it must not be absent during a migration
to secrets; every other key merely disables its provider.

## A deploy prepares the database before the new revision

`deploy.yml` runs two one-off containers from the new image before
`az containerapp update`, both against `JOBRADAR_DATABASE_URL`:

1. `python -m src.database.migrate`: additive migrations, so the old revision
   keeps working.
2. `python -m src.jobpool.daily --profile-only`: re-profiles jobs whose profile
   is from another `PROFILER_VERSION`. Opportunities reads only current-version
   profiles, so a release that bumps the version (a rules or `skills.txt` change)
   would otherwise show an empty list until the 05:00 pool run. It is
   incremental: about a second when nothing is stale, 1–2 minutes for the whole
   pool (~11k jobs). While it runs, the old revision's list thins out as its
   profiles are replaced.
