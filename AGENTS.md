# Working in Glassbox

These instructions apply across the repository and to every coding assistant.

## Product and language

- Glassbox counts what technology job ads ask for and shows people where their skills stand. It shows; the user decides. Do not prescribe what to learn or where to apply.
- Be precise about jobs, populations, dates and denominators. Keep required, preferred, mentioned and unstated distinct. A missing value is not zero.
- Use the product's plain, calm voice. Say “jobs,” not “postings,” in user-facing copy. Avoid hype and unsupported claims.
- Read [the brand guide](docs/brand/README.md), [design system decision](docs/decisions/design-system.md) and, for visual stories, [editorial standards](docs/editorial/README.md) before changing their areas.

## Safety and privacy

- Never print, commit or expose `.env` values, API keys, tokens, database connection strings, CV text, personal data or sensitive request headers. Do not read `.env` files into chat or logs.
- Production database checks are read-only unless the user explicitly authorizes a write. Never run a production migration, backfill, deploy, secret rotation, load test or configuration change without explicit authorization.
- Keep CV files and text out of logs, analytics, screenshots and test output. Follow the retention and analytics rules in `docs/decisions/cv-storage.md` and `docs/decisions/analytics.md`.
- Public market pages read published data; do not make them call the paid API or add a schedule, polling loop or retry without documenting its frequency and cost and getting approval for a new schedule.
- Do not edit `backend/GlassBox/`; it is a local Figma plugin.

## Implementation

- Inspect the relevant code, tests and decisions before editing. Preserve existing architecture and user changes; keep scope to the request.
- Reuse existing components, styles, data types and conventions. Do not add dependencies or broad refactors without a clear need.
- Add a focused regression test for behavior changes. Run relevant tests and type checks. Never run plain backend `pytest`: it loads `backend/.env`. Use `DATABASE_URL=""` for database-free tests or the documented throwaway test database.
- Frontend work uses Next.js 16. Read the installed Next.js guide for the API being changed. Check phone widths, both themes and reduced motion where relevant.
- Update architecture or decision documentation when behavior or a durable decision changes. Changelog entries are for meaningful milestones, not routine edits or AI-session reports.
- For an editorial story, verify the evidence first, explore materially different concepts, get the chosen direction approved, and review actual renders before publishing. Keep story-specific art direction; don't turn stories into a generic dashboard.

## Git and operations

- Do not commit or push unless the user asks. Do not merge or deploy unless explicitly requested. Do not add co-author or assistant attribution.
- Do not stage unrelated or pre-existing user changes. State any environment or access limitation plainly.
- Follow `docs/decisions/deployment.md` for deployment and database operations.
