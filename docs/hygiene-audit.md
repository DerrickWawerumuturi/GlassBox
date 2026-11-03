# Codebase hygiene audit — 2026-11-03

Scope: documentation, AI coding instructions, dependency manifests, and frontend route/component inventory on `main` at `cd1ca816a555cad793f48675617e28ae575c2d27`.

## Changes

- Added one root `AGENTS.md` for shared repository guidance. Root `CLAUDE.md` imports it, while `frontend/AGENTS.md` retains the generated Next.js-specific rules.
- Consolidated the old `docs/architecture/overview-frontend.md` into the current monorepo documentation. It described a two-repository product and duplicated the purpose of `docs/architecture/frontend.md`, whose route inventory includes the current editorial market pages, story components, and visual assets.
- Removed the stale “Two system overviews” and “No CLAUDE.md” follow-ups from `docs/todo.md`.

## Audit findings

- **Dependencies:** removed frontend `recharts` after current source searches found no Recharts imports or API symbols; the only current source match was an orphan helper file. Removed its 33 now-unreachable lockfile package entries. Backend requirements were left unchanged because source search did not establish a removable package.
- **Components and routes:** removed `frontend/src/lib/chart-ramp.ts`. Its five exports had no callers, and its comments describe the retired Recharts charts. Left active route, dashboard, hand-built SVG chart, and editorial story components unchanged.
- **Branches:** inspected the branch list before work. Existing topic and parallel `*-current-main` branches were left unchanged.

## Verification

- Confirmed repository default branch `main` at the commit above and found no open pull requests before creating this hygiene branch.
- Reviewed the root README, architecture overview, frontend and backend architecture references, applications API contract, frontend coding rules, dependency manifests, route inventory, stale todo entries, and GitHub source-search results for Recharts/helper references.
- Parsed the updated manifest and lockfile and statically pruned lockfile entries unreachable from all remaining root dependencies (574 package entries before; 541 after).
- Vitest, typecheck, lint, and local build were not run: this workspace is a read-only project mirror without installed dependencies. A Vercel preview build is expected on the follow-up PR.
