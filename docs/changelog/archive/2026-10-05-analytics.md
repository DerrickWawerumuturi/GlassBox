# 2026-10-05 — Product analytics (PostHog, US cloud)

**Files:** `frontend/src/lib/analytics.ts` (+ test), `components/AnalyticsProvider.tsx`,
`app/layout.tsx`, `next.config.ts`, `.env.example`, the five product pages,
`components/Hero.tsx`, `dashboard/scan/page.tsx`. Decision: `decisions/analytics.md`.

- Pageviews (path only, once per path), scan events (started, uploaded,
  reused, finished with seconds and jobs, failed with stage), `view_opened`
  per page and Market view. No cookies or storage, no autocapture or
  recording, DNT respected, no-op without a key.
- Sent through `/ingest`, rewritten to `us.i.posthog.com`, so blockers of
  PostHog's domain don't drop events.
- Property allowlists in `track()` and a `before_send` scrub; tests show a
  file name, skills and an email never get through.
- Found while testing: the scrub had removed PostHog's own `token` and
  `distinct_id`, so custom events were dropped; and pages fired before the
  provider started PostHog. Both fixed and tested.
- Follow-ups for the backend: `signed_up`, and identify by the internal user id.
