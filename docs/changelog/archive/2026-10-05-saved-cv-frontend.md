# 2026-10-05 — Saved CV: the new-scan pop-up and the profile's Last scan

**Files:** `frontend/src/lib/latest-cv.ts` (+ test), `components/dashboard/ReuseCvDialog.tsx`,
`components/dashboard/LastScanDialog.tsx`, `app/(product)/dashboard/scan/page.tsx`,
`app/(product)/dashboard/profile/page.tsx`. Backend: `decisions/cv-storage.md`.

- **New scan:** a signed-in user with a reusable kept CV gets a pop-up: "Use
  your last CV" (file name, "read on 5 Oct", skill count; the orange button)
  or "Upload a new one". Reuse calls `AnalyzeReuse()`; a 409 says "We've
  updated how CVs are read. Upload it again." Under the upload area: "We keep
  the skills read from your latest CV, not the file. Delete them any time
  from your profile."
- **Profile:** "Last scan" opens the details: file, date, the skills as mint
  pills, and "Delete saved skills" with an inline confirm. "Delete my data"
  forgets them too.
- The scan page intro lost "what to learn next" and an em dash.
