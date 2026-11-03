# Glassbox coding instructions

These instructions apply across the repository and are shared by Codex, Claude Code, and other assistants that read AGENTS.md. Claude Code users should follow the root `CLAUDE.md` import, which loads this file.

## Working rules

- Read the relevant architecture and decision documents before changing an area. The README links to the current system overview; `docs/architecture/frontend.md` and `docs/architecture/backend.md` describe their respective deployables.
- Keep changes small and scoped. Confirm actual imports, route references, scripts, and runtime behavior before calling a dependency or component unused. Names and apparent duplication are not proof.
- Preserve the editorial market pages, story components, hand-drawn artwork, charts, copy, and visual decisions unless the task explicitly asks to change them.
- Keep analysis and matching on the backend. The frontend presents API results and may format them for display; it must not independently recompute fit, similarity, demand, or skill gaps.
- Do not commit secrets, local environment files, generated data, or build output. Use the checked-in example environment files.
- Run the relevant existing checks when the environment supports them, and report exactly what ran and what could not be verified.

Frontend-specific Next.js instructions live in `frontend/AGENTS.md`; read them before changing frontend code. Do not copy those rules here.
