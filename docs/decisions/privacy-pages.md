# Decision: what the privacy pages say, and where each statement comes from

**Status:** written 2026-10-05. **Pages:** `/privacy`, `/your-cv`
(`frontend/src/app/(public)/`). Every statement was checked against the code.
Change a page when the code it cites changes.

| Statement | Source |
|---|---|
| We never store your PDF; it is read, then deleted at once | `backend/main.py` `_pdf_text`: a temp file, removed in `finally` (both `/analyze` and `/cv/parse`) |
| The CV sheet, while reading: "The file is deleted once it's read." (since 2026-10-07, `decisions/cv-ask.md`) | the same `_pdf_text` `finally` |
| The CV sheet, signed out: "Keep them with a free account, to compare again later." | `cv-store.tsx` moves the browser's CV skills to the account on sign in (kept by `kept_cv`); Opportunities compares them with each day's jobs |
| Its text goes to Groq, an AI service from a US company | `llm_client.py` `GroqModel` (`groq` SDK). Where Groq processes it is not visible in our code |
| Not signed in: nothing kept on our servers; results stay in the browser | `analysis-store.tsx` and `cv-store.tsx` save to the server only when authenticated; otherwise `localStorage` |
| Signed in: only what matching needs (skills, roles aimed for, level, years, education level, location, languages), file name, date, a fingerprint of the text; never the file or its text | `src/matching/kept_cv.py` on `cvs`, `latest_cvs` and `application.cv_snapshot` (`decisions/cv-storage.md`, "Keep less") |
| Never the CV's name, contact details, links, summary, companies, dates or schools | `kept_cv.PERSONAL` and `PROFILE_DROP`; tests `test_kept_cv.py`, `test_api_user_data.py` |
| Years worked out from job dates when read, then the dates dropped | `candidate.derive`, stored as `derived` |
| Also the latest scan results and tracked applications | `analyses` via `PUT /analysis`, `application` |
| Delete the kept skills, or all data, from the profile; deleting the account removes everything | `DELETE /cv/latest`, `DELETE /account/data` (`delete_user_data`), `DELETE /account` (cascade) |
| Database in the EU: Neon, Frankfurt | `DATABASE_URL` host `…eu-central-1.aws.neon.tech` |
| Google sign-in: name, email address and profile picture | NextAuth Google provider, default scope `openid email profile` (`app/auth.ts`) |
| PostHog (US): pages and a few steps; no cookies or recordings; Do Not Track; never the CV, file name or skills | `lib/analytics.ts` and `decisions/analytics.md` |
| First page: the referring site's name and the link's campaign tags, never the full link | `visitSource` and `scrub` in `lib/analytics.ts` (since 2026-10-07) |
| Our own fonts, no requests to Google Fonts | `app/fonts` with `next/font/local` |

## Corrections to the brief (2026-10-05, first draft)

The brief listed some claims that the code does not support. The pages say
what the code does instead:

- "We keep only the skills, file name and date": signed-in users also keep
  the CV breakdown on their profile, the latest scan and their applications,
  and the kept profile holds roles, dates, level and location too.
- "Analytics: pages only": a few product steps are sent as well.
- "Google sign-in: name and email only": the profile picture comes too.

Since then the founder chose to keep less (decisions/cv-storage.md, "Keep
less"), so the first correction no longer applies: the CV breakdown is no
longer stored.
