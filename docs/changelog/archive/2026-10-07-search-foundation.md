# 2026-10-07 — Search foundation: canonicals, share previews, sources

**Why:** the SEO audit of 7 Oct found every page telling Google it was a copy of
`/`, the home page shared without an image, a home page cached without its count
after an API restart, and analytics unable to say where a visit came from.

**Files:** frontend `src/lib/seo.ts` (new), `app/layout.tsx`, `app/sitemap.ts`,
`app/not-found.tsx` (new), `app/(landing)/page.tsx`, the four `(public)` pages,
`app/(auth)/sign-in/layout.tsx` (new), `app/(product)/dashboard/layout.tsx` and
`analysis/layout.tsx` (their client bodies moved to
`components/dashboard/DashboardShell.tsx` and `AnalysisShell.tsx`),
`lib/landing/look-server.ts`, `lib/analytics.ts`, `lib/api.ts`; backend
`main.py`, `src/database/services/users.py`,
`src/database/repositories/user_repository.py`. Tests: `lib/seo.test.ts`,
`lib/api.test.ts` (new), `lib/analytics.test.ts`, `lib/landing/look-server.test.ts`,
`backend/tests/test_account_created.py` (new), `test_api_user_data.py`,
`test_latest_cv.py`.

## Canonicals

- The root layout no longer sets `canonical: "/"`. App pages and the 404 now
  carry no canonical.
- `/`, `/product`, `/about`, `/privacy` and `/your-cv` each name themselves,
  through `publicPage(path, ...)` in `lib/seo.ts`. It also sets `og:url`. A
  future `/market/...` or `/method` page calls the same function and adds its
  path to `PUBLIC_PATHS` for the sitemap.

## Share previews

Next merges metadata shallowly, so the home page's own `openGraph` dropped the
image, site name and type. `publicPage` now builds the full block every time:
`og:image` (the existing `opengraph-image`), `og:site_name`, `og:type website`,
`og:url`, and `twitter:card summary_large_image` with the image. The home page
keeps its own share title and description.

## Site name

The home page's JSON-LD is now one `@graph`: `WebSite` (name Glassbox,
alternateName "See Glassbox" and "seeglassbox.com"), `Organization` (logo
`/icons/icon-512.png`, absolute) and the `WebApplication`.
`applicationCategory: BusinessApplication` is gone: none of Google's
SoftwareApplication categories fits a job seeker's tool, and the property is
only recommended.

## Sitemap

The five public pages. `/sign-in` dropped. No `lastmod` (it was the build time),
no `priority` or `changefreq`.

## Titles and the 404

`Sign in · Glassbox`, `Analysis · Glassbox`, `Dashboard · Glassbox`. The pages
and layouts there are client components, so a small server layout now gives the
title and renders the old client body. A new `app/not-found.tsx`: one sentence,
a link home, the slim footer, one `<title>`. Status stays 404 with `noindex`.

## The count during revalidation

`lookForPage` used to return nothing whenever `/market/look` failed, and the
thin page was cached for 5 minutes. Now, in a running production server, a
failure throws, and Next keeps serving the last good page. At build and in dev
it still falls back. Details: `decisions/market-look.md`, "On the landing page".

## Where a visit came from, and signed_up

- The first pageview of a page load carries `ref_domain` (hostname only, our
  own site dropped) and the five `utm_*` values (100 characters, no address or
  email shaped values). `scrub` checks both again; a full referrer or a query
  string never leaves.
- `signed_up` now fires. Accounts are created on the first write, so the
  backend says so: the upsert returns `(xmax = 0) as created`, and that
  response carries `X-Account-Created: 1` (exposed through CORS). `lib/api.ts`
  sends `signed_up` when it sees it. No migration.
- `/privacy` says it: "On the first page you open, it also gets the name of
  the site that sent you, like reddit.com, and any campaign tags in the link.
  Never the full link." `/your-cv` says nothing about analytics, so it is
  unchanged.
- `decisions/analytics.md` no longer says "not yet shipped".

## For the founder

- Vercel: set `www.seeglassbox.com` to redirect to the apex with a permanent
  (308) redirect. Today it is a 307.
- After the push: check `/`, `/product`, `/about` in Search Console's URL
  Inspection for the new canonicals, and resubmit the sitemap.
