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

## Sizing: 2 vCPU / 4 GiB

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

- **MiniLM** — `embedder.py:34` constructs `SentenceTransformer` at import. The
  image now pre-fetches it and pins `HF_HOME=/opt/hf` with `HF_HUB_OFFLINE=1`.
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
