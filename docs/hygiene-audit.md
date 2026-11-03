# Codebase hygiene audit — 2026-11-03

Scope: documentation, AI coding instructions, dependency manifests, and frontend route/component inventory on `main` at `cd1ca816a555cad793f48675617e28ae575c2d27`.

## Changes

- Added one root `AGENTS.md` for shared repository guidance. Root `CLAUDE.md` imports it, while `frontend/AGENTS.md` retains the generated Next.js-specific rules.
- Consolidated the old `docs/architecture/overview-frontend.md` into the current monorepo documentation. It described a two-repository product and duplicated the purpose of `docs/architecture/frontend.md`, whose route inventory includes the current editorial market pages, story components, and visual assets.
- Removed the stale “Two system overviews” and “No CLAUDE.md” follow-ups from `docs/todo.md`.

## Audit findings

- **Dependencies:** no packages were removed. The GitHub source view did not provide a complete, reliable repository-wide import and runtime/configuration analysis to prove any dependency unused. Keep the existing frontend and backend packages until that analysis can be run in a checkout.
- **Components and routes:** no code was removed. The current frontend architecture documents the editorial routes and shared components, but a static documentation review is insufficient proof that any component is dead or duplicated at runtime.
- **Branches:** inspected the branch list before work. Existing topic and parallel `*-current-main` branches were left unchanged.

## Verification

- Confirmed repository default branch `main` at the commit above and found no open pull requests before creating this hygiene branch.
- Reviewed the root README, architecture overview, frontend and backend architecture references, applications API contract, frontend coding rules, dependency manifests, route inventory, and the stale todo entries.
- Tests, typecheck, lint, and build were not run: this workspace is a read-only project mirror without a writable repository checkout or installed project dependencies. The changes are documentation-only; GitHub Actions validation may run after the PR opens.
