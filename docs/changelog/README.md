# Change history

This directory records product and editorial milestones that explain durable choices. Routine fixes, experiments that did not ship and AI-session activity stay in Git history or in the local review workspace, not as separate changelog files.

Current behavior and rationale live in `docs/architecture/` and `docs/decisions/`. The retained milestone notes cover:

- Platform and operating constraints: [the container memory limit](2026-08-25-container-oom.md).
- Matching and the job pool: [fit matching and applications](2026-09-22-fit-matching-pool-import.md), [market snapshots](2026-10-01-market-snapshots.md), [early-career sources](2026-10-07-early-career-sources.md), and [daily counts](2026-10-08-daily-counts.md).
- CV privacy and the public market: [keeping less CV data](2026-10-05-keep-less-cv.md), [reuse of the latest CV](2026-10-05-latest-cv.md), [the landing market API](2026-10-05-market-look-api.md), [the landing page](2026-10-05-landing-look-around.md), [publishable counts](2026-10-07-publishable-counts.md), [weekly publication](2026-10-08-market-publication.md), and [open data](2026-10-13-open-data.md).
- Editorial work: [the two-years investigation direction](../editorial/sprints/2026-10-14-two-years-art-direction.md), [visual market stories](2026-10-15-visual-stories.md), [the illustrated cast](2026-10-15-cast.md), [Pick a side](2026-10-16-pick-a-side-deck.md), [Count the rings](2026-10-16-years-count-the-rings.md), [Is entry level dead?](2026-10-19-is-entry-level-dead.md), [Do you need AI on your CV now?](2026-10-21-ai-on-your-cv.md), and [the AI title count](2026-10-21-ai-titles.md).
- Visual system: [the paper light theme](2026-10-05-paper-light-mode.md) and [stories open on paper](2026-10-21-stories-open-light.md).

The decisions and architecture documents take precedence when an older milestone note describes behavior that has since changed.

Local historical notes absent from the current GitHub milestone set are preserved in [`archive/`](archive/README.md). The local scan-counter drain and visual-identity milestones remain in this active directory. Architecture and decision documents describe current behavior; these older notes are historical context.
