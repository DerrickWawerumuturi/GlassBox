# Glassbox

**Job ads list everything. Glassbox counts what today's jobs really ask for, and shows you where you stand.**

Glassbox is job hunt intelligence. Every day it reads new jobs from public job
boards and counts the skills they ask for. Add your CV and it shows which of
those skills you already have, how they connect, which jobs fit, and where your
applications stand. It shows; you decide. It never tells you what to learn or
where to apply.

Live at **[seeglassbox.com](https://seeglassbox.com)**.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/product/market-demand-desktop-dark.webp">
  <img alt="Market charts: what the jobs in a scan ask for, the CV's skills in green" src="frontend/public/product/market-demand-desktop-light.webp">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/product/opportunities-desktop-dark.webp">
  <img alt="Opportunities: jobs matched to a CV, each with the skills it asks for" src="frontend/public/product/opportunities-desktop-light.webp">
</picture>

The screenshots use an example CV against real public jobs.

## Features

- **Look around first.** The home page shows today's count without a CV: how
  many jobs of each type are open, at which level, and the titles behind the
  count. Paste any job ad, or a link to one, and see which of its asks are
  common and which are rare.
- **Market.** A scan reads your CV, gathers matching jobs and counts what they
  ask for. Four views: an overview, demand, your skills, and the skills not on
  your CV yet. Green is on your CV. Grey hatching is not yet.
- **Your skills.** Bridges: your skills on the left, the skills these jobs ask
  for that your CV doesn't list on the right, joined when jobs ask for both.
- **Opportunities.** The daily job pool matched to your CV. Each job gets a
  match and a tier (strong, good, stretch, out of reach) and says why.
- **Applications.** Every job you applied to, in one list: statuses, the date
  you applied, jobs from other sites by link, and a spreadsheet import.
- **Your saved CV.** Signed in, a new scan can reuse the skills read from your
  latest CV, without uploading it again.

Without an account, a scan's results stay in your browser. Signing in keeps them
with your account, across devices.

## How it works

**The daily job pool.** A GitHub Actions job (`.github/workflows/job-pool.yml`,
05:00 UTC) runs `python -m src.jobpool.daily`. It reads company boards on
applicant tracking systems (listed in `backend/src/jobpool/companies.txt`),
remote job aggregators and regional job boards, keeps jobs from the last 90
days, and stores them. See `docs/decisions/persistent-job-storage.md` and
`docs/decisions/job-retention.md`.

**One job, counted once.** A job is stored once per board, by its board's id.
When the same role at the same employer appears on two boards, the count and
Opportunities fold it into one (`duplicate_key` in
`backend/src/jobpool/opportunities.py`).

**Real skill names only.** Skills come from a closed vocabulary,
`backend/src/matching/skills.txt`, grown by review. A phrase like "custom
backend" is never a skill. Jobs and CVs are read against the same list, so both
sides speak one vocabulary. See `docs/decisions/skill-vocabulary.md`.

**Profiling.** Each job is read into a requirements profile: required,
preferred and mentioned skills, role family, level and years asked. It is rules
and dictionary lookups, no model. Only new, edited or outdated jobs are read
again (`PROFILER_VERSION`).

**Snapshots.** After each run, the profiled pool is counted into
`market_snapshots`: one row per role family per day. It is the record of what
jobs asked for on a past day. See `docs/decisions/market-snapshots.md`.

**Today's count.** `GET /market/look` serves the home page: the live pool,
counted by the snapshot's rules, built in the background and cached. `POST
/market/ad` reads a pasted ad or link; it stores nothing, fetches links through
an address guard, and is rate limited. See `docs/decisions/market-look.md`.

**A scan.** `POST /analyze` reads the CV's text with Groq, searches for matching
jobs (JSearch, The Muse, Jooble and the pool), drops roles outside the CV's
market with a small embedding model (all-MiniLM-L6-v2,
`docs/decisions/embeddings.md`), and counts what the rest ask for
(`docs/decisions/market-analyzer.md`).

**Matching.** One matcher scores a job against a CV: role fit, required and
preferred skills, level, experience and location, each part explained. See
`docs/decisions/fit-matching.md` and `docs/decisions/unified-matching.md`.

## Privacy

- We never store your PDF. We read its text, then delete the file straight away.
- To read it, we send that text to Groq, an AI service from a US company. It
  picks out your skills, roles and experience.
- Not signed in: we keep nothing about you on our servers. Your results stay in
  your own browser.
- Signed in: we keep only what matching needs from your latest CV (your skills,
  the roles you aim for, your level, years of experience, education level,
  location and languages), the file name, the date we read it and a fingerprint
  of the text. Never the file or its text, your name, contact details, links or
  summary.
- You can delete the skills we kept, or all your data, from your profile.
  Deleting your account removes everything.
- Page analytics use PostHog without cookies or screen recordings. It never
  receives your CV, its file name or your skills.
- Fonts are served from our own site, so your browser makes no requests to
  Google Fonts.

The full text is on [seeglassbox.com/your-cv](https://seeglassbox.com/your-cv)
and [seeglassbox.com/privacy](https://seeglassbox.com/privacy). See also
`docs/decisions/cv-storage.md` and `docs/decisions/privacy-pages.md`.

## Architecture

```
            Browser
               │
     ┌─────────┴───────────────────────────┐
     ▼                                     ▼
 seeglassbox.com                       api.seeglassbox.com
 frontend/  Next.js on Vercel          backend/  FastAPI on Azure Container Apps
 pages, sign in (Auth.js, Google),     scans, matching, the job pool,
 mints a short lived token  ─────────▶ GET /market/look, POST /market/ad
                                           │
                                           ▼
                                   Postgres on Neon (Frankfurt)
                                           ▲
 GitHub Actions ───────────────────────────┘
   deploy.yml    push to main (backend): test, migrate, deploy
   job-pool.yml  05:00 UTC: fetch, profile, snapshot
```

The site is served from seeglassbox.com by Vercel. The API is at
api.seeglassbox.com: a custom domain on the Azure container app, with a
certificate Azure manages. DNS for both is on Cloudflare. The browser calls the
API directly, at the address in `NEXT_PUBLIC_API_BASE_URL`. All analysis happens
in the backend; the frontend only presents it. See `docs/architecture/overview.md`
and `docs/decisions/deployment.md`.

```
backend/
  main.py              the API's routes
  src/api/             the public market routes and the rate limit
  src/jobpool/         the daily pool: sources, profiling, snapshots, today's count
  src/matching/        the skill vocabulary and the matcher
  src/database/        connections, repositories, services, migrations
  src/Agent/, src/cv/  scans: the search, the CV parser, sign in checks
  tests/
frontend/
  src/app/             pages (the home page, /analysis, /dashboard, /product, /about)
  src/components/      landing, dashboard and shared components (shadcn on Base UI)
  src/lib/             API calls, stores and display helpers
  public/product/      product screenshots
docs/
  architecture/  decisions/  changelog/
.github/workflows/     deploy.yml, job-pool.yml
```

## Run it locally

You need Python 3.11, Node.js 22, and a Postgres database of your own (Docker is
the simplest way).

**Database**

```sh
docker run -d --name glassbox-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=glassbox -p 127.0.0.1:5433:5432 postgres:16-alpine
```

**Backend**

```sh
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `backend/.env`:

- `DATABASE_URL` and `DATABASE_URL_DIRECT`: both your local database, for example
  `postgresql://postgres:dev@127.0.0.1:5433/glassbox`. Set both: migrations use
  the direct one.
- `API_JWT_SECRET`: any long random string. The frontend needs the same value.
- `GROQ_API_KEY`, `GROQ_MODEL_NAME`: for reading CVs and scans.
- `JSEARCH_API_KEY`, `JSEARCH_HOST`, `MUSE_API_KEY`, `JOOBLE_API_KEY`: job
  search providers for scans. Jooble is optional.
- `ALLOWED_ORIGINS`: `http://localhost:3000`.

Then:

```sh
python -m src.database.migrate --status   # list applied and pending migrations
python -m src.database.migrate            # apply them
python -m src.jobpool.daily               # optional: fill the job pool (a few minutes)
uvicorn main:app --reload --port 7456
```

The first scan downloads the embedding model.

**Frontend**

```sh
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Fill in `frontend/.env.local`:

- `NEXT_PUBLIC_API_BASE_URL`: `http://127.0.0.1:7456`.
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`.
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: Google sign in through
  Auth.js. The OAuth client needs `http://localhost:3000/api/auth/callback/google`
  as a redirect URI.
- `API_JWT_SECRET`: the same value as the backend's.
- `NEXT_PUBLIC_POSTHOG_KEY`: leave empty to turn analytics off.

Open [localhost:3000](http://localhost:3000).

## Tests

**Backend**, from `backend/` with the venv active. Always set `DATABASE_URL` on
the command line: plain `pytest` loads `backend/.env`, and if that file points at
a real database, the database tests write to it.

Against a throwaway Postgres (run the migrations on it first):

```sh
docker run -d --name glassbox-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=jobradar_test -p 127.0.0.1:55432:5432 postgres:16-alpine
export TEST_DB=postgresql://postgres:test@127.0.0.1:55432/jobradar_test
DATABASE_URL=$TEST_DB DATABASE_URL_DIRECT=$TEST_DB python -m src.database.migrate
DATABASE_URL=$TEST_DB python -m pytest -q
```

Without a database, as CI runs them (the database tests skip):

```sh
DATABASE_URL="" python -m pytest -q
```

**Frontend**, from `frontend/`:

```sh
npx tsc --noEmit
npm test          # vitest
npm run build
```

## Deploy

- **Backend.** A push to `main` that touches `backend/` runs
  `.github/workflows/deploy.yml`: it builds the image, runs the tests inside it,
  pushes it to the registry, applies outstanding migrations, profiles any jobs
  the new rules haven't read, then updates the container app. Migrations are
  additive, so the old revision keeps working while they run. See
  `docs/decisions/deployment.md`.
- **Frontend.** Vercel builds and deploys `frontend/` on every push to `main`.
- **Job pool.** `.github/workflows/job-pool.yml` runs every day at 05:00 UTC,
  and on demand.

## Docs

- `docs/architecture/`: how the system fits together. Start with `overview.md`,
  then `backend.md` and `frontend.md`.
- `docs/decisions/`: one file per decision, with the reasons and what was
  measured (matching, the skill vocabulary, snapshots, deployment, privacy and
  more).
- `docs/changelog/`: dated notes for each change.
