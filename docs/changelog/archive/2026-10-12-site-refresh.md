# 2026-10-12: a publication refreshes the site at once (fixes #1)

Decision: `docs/decisions/market-publication.md` ("The frontend", runbook).
Review page: `docs/local/site-refresh-review.html`.

## The problem

The week of 12 October was published at 06:02 UTC. seeglassbox.com kept the
5 October week for about 11 hours (`x-vercel-cache: STALE`, `age: 41580`). Its
pages rebuild only on a visit, the rebuild gives the API 4 s, and the API
scales to zero and takes about 43 s to wake. A failed rebuild keeps the last page.

## The fix

- Backend `src/jobpool/refresh_site.py`: after every publication (scheduled,
  `--now`, `--accept`) `publish.run()` wakes the API (`GET /market/look`, up to
  90 s), `POST`s `${SITE_URL}/api/revalidate` with `Bearer REVALIDATE_SECRET`,
  then opens each page and share image once. No secret: one line, no calls.
  A failure: one warning line; the publication is unchanged.
- Frontend `POST /api/revalidate` (`app/api/revalidate/route.ts`,
  `lib/revalidate.ts`): constant time secret check, 503 unconfigured, 401
  wrong, 429 past 10 a minute; `revalidatePath` for `/`, `/about`, `/product`,
  `/market`, the five market pages, and the `/market` layout (share images).
- `job-pool.yml` passes `REVALIDATE_SECRET` (repository secret) and `SITE_URL`
  to the container by name.

## Setup (founder)

Generate a secret (`openssl rand -hex 32`); set it as the GitHub Actions secret
`REVALIDATE_SECRET` and as the Vercel Production env var `REVALIDATE_SECRET`,
then redeploy the site. Nothing on Azure.

## Tests

Backend `test_refresh_site.py` (new: skip without the secret, wake then
revalidate then open, an API that never wakes, failures never raise, the hook
in `publish.run`), `test_job_pool_workflow.py`. Frontend `revalidate.test.ts`
(503, 401, every path, header cap, rate limit). The hook test and the route
test each failed once with their fix disabled.
