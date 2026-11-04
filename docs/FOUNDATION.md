# Glassbox project foundation

These standards are mandatory for all Glassbox work. They apply to routine tasks as well as urgent work. Do not silently ignore a rule. If a request conflicts with a standard, explain the conflict and ask for direction. Never invent missing context or claim an operation succeeded without verifying it.

## Token and context efficiency

- Use the minimum context, reasoning, tool calls and output needed to complete the task accurately.
- Read user-named files and relevant project instructions first. Search only the files and code paths needed for the request; do not repeat searches without new evidence.
- Do not conduct broad audits when a focused inspection will answer the question. Keep progress updates and reports concise.
- If essential source material is absent, state exactly what is missing and ask for it. Do not reconstruct or substitute it.

## Task scope and execution

- Complete the authorized task, but do not expand it into unrelated cleanup, refactoring, research or polish.
- Preserve all user work: tracked, untracked, staged, unstaged and ignored. Before editing, inspect the relevant status and files. Do not overwrite a file without checking whether it exists and contains work.
- If a command fails, determine whether it blocks the task. Do not retry environmental failures repeatedly.
- Use targeted validation appropriate to the change. Do not run unrelated tests or production checks.

## Git safety and authorization

- Git actions require explicit authorization for the specific operation. Do not stage, commit, push, merge, rebase, reset, clean or stash unless explicitly requested.
- Never force-push or rewrite shared history. Inspect branch ancestry before pushing; report non-fast-forward conditions before choosing a recovery sequence.
- Before an authorized commit, review the exact staged diff and identify secrets, credentials, environment files, generated artifacts and ownership-unclear files. Never include `.env` files or secret values. Ask about ambiguous content rather than silently including or excluding it.
- Do not claim a commit, push or deployment succeeded until the resulting state is verified. Keep later article work separable when requested.

## Code quality and verification

- Follow the existing architecture and local instructions. Reuse current components, styles, conventions and dependencies. Avoid broad changes.
- Read any nested `AGENTS.md` files that apply to the touched area, including `frontend/AGENTS.md` for frontend changes.
- Confirm actual callers and behavior before removing or replacing code. Keep secrets, CV text, personal data and sensitive headers out of logs, analytics, screenshots and tests.
- Add focused regression coverage for behavior changes. Run relevant checks and report exact commands/results. Never run plain backend `pytest` if it can load `backend/.env`; use the documented safe database-free or throwaway-database command.
- Do not run migrations, production writes, deploys, secret rotations, load tests or service configuration changes without explicit authorization.

## Glassbox product principles

- Glassbox counts what technology job ads ask for and shows people where their skills stand. “We show, you decide”: do not prescribe what people should learn or where to apply.
- Use a calm, plain, evidence-led voice. Say “jobs” in user-facing copy. Avoid hype and unsupported claims.
- State populations, dates, denominators, sources and methods. Keep required, preferred, mentioned and unstated distinct. A missing value is not zero; an absent requirement is not proof of entry-level work.
- Preserve privacy. Never expose `.env` values, API keys, tokens, database connection strings, CV content, personal data or sensitive request headers. Production checks are read-only by default.

## Editorial research and evidence

- Verify the underlying source and calculation before writing a claim. Distinguish direct observations, interpretation and inference.
- Define sampling, inclusion rules, exclusions, dates and denominators. Do not present a sample as representative without evidence, combine repeated observations as independent jobs, imply causation from observational comparisons, or claim change over time without comparable historical data.
- Attribute external research accurately and distinguish its dataset and method from Glassbox evidence. Cite primary sources where practical.
- Preserve reviewed draft wording, claims, caveats, sources and methodology unless a correction is verified or the user authorizes editing. Never fill gaps with plausible invented material.
- Treat reconstructions as reconstructions. Do not fabricate source audio, transcripts, waveforms, timestamps, documents or quotations.

## Visual identity and design

- Preserve Glassbox’s existing brand marks, mascots, icons, charts, story components and approved design decisions. Inspect and reuse assets before proposing replacements.
- Product data conventions: green/lime indicates a skill on a CV only where defined; neutral grey hatching indicates a gap or not stated; orange is for actions and annotations, not a default data category. State any story-specific encoding and provide a text equivalent.
- Editorial display headlines use Source Serif 4; reading text uses Hanken Grotesk; JetBrains Mono is for data labels and technical notes. Follow existing font loading and route conventions.
- Use human-created or properly licensed final editorial artwork. AI may assist with code and layout exploration, but must not supply final editorial artwork. Credit sources and licenses.
- Design for mobile, keyboard and touch; provide captions, source notes and accessible descriptions. Respect reduced motion and keep essential findings available without animation.
- References such as The Pudding (`https://pudding.cool/`), Search Party and Johnny Harris inform storytelling techniques only. Do not copy their designs or substitute their identity for Glassbox’s.

## Article implementation and publication

- Implement the complete reviewed article, not a placeholder or prototype. Use the supplied draft and visual brief as the source of truth; do not substitute another manuscript or strengthen its claims.
- Build the specifically agreed visuals and interactions from verified evidence. Add clear captions, source notes, caveats and honest reconstruction labels.
- Follow existing story/page infrastructure and keep route, metadata, image paths and navigation consistent with the site. Check responsive rendering, accessibility and reduced-motion behavior locally.
- Local implementation is not publication. Do not claim a page is live unless deployment completed and the public URL was verified. Do not deploy or publish without explicit authorization.

## Communication and completion

- Give concise status updates when useful. Report blockers as soon as they are known and state what is blocked versus what can proceed.
- Final reports state files changed, behavior delivered, verification results, remaining risks and whether work is local, tested, committed, pushed or deployed.
- Stop when the authorized acceptance criteria are met. Do not continue unrelated exploration or polishing.

## Updating these rules

When the same avoidable mistake recurs, add the smallest durable rule that prevents it. Check for conflict with existing standards, update this foundation, and keep root `AGENTS.md` concise with a link here. Do not copy project history or one-off task details into permanent rules. Rule changes do not retroactively authorize Git or production operations.
