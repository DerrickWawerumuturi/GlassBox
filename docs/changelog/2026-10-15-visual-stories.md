# 2026-10-15: five visual stories, and /market as a grid of stories (refs #10)

Decision: `docs/decisions/market-pages.md` ("Stories"); also `design-system.md` (the stories' faces),
`cv-ask.md` (the story and grid asks), `analytics.md` (new `where` places). Brand book: `docs/brand/guidelines.html`
(06, 10, the log, still open). Review page: `docs/local/stories-review.html`. Prototypes the founder approved today:
`docs/local/editorial-sprint/stories/` and `market-home/`.

## The change

- **Five stories**, one under each market page, each fixed to the week of 12 October 2026:
  `/market/entry-level-software/pick-a-side`, `/market/software-engineering/the-lobby`, `/market/ai/contents-may-vary`,
  `/market/machine-learning/peak-python`, `/market/devops/within-eleven-jobs`. A static folder per story under
  `app/market/[page]/`, as the years page: any other page name is a 404, and no story reads the publication.
- **One data module per story** (`frontend/src/lib/stories/<slug>.ts`), a comment per figure naming its line in the
  week's data pack. Every sentence is written from it, so moving a story to the 19 Oct week is a data edit; the story's
  test names each sentence the new numbers must still bear out.
- **Server rendered**: every word and figure is in the HTML; small client components run the interactions (the scratch
  cards, the lift, the box, the sighting arm, the crane). Without script the figures still read.
- **Each story** says its week near the top and in every source line, links its live page, ends with the CV ask
  (the peek button, the market page's sheet, about the skills the story counts) and "How we counted" with its scope.
  Own canonical, title, description, Article and BreadcrumbList markup, and a 1200×630 share image from its data.
- **/market** is the grid after the prototype: covers, pill and date, the finding, a plain link to each live weekly page,
  the years page's card from the live count, how we count, the CV card fifth; filters by kind. Reads the publication as
  before (live links, years card, week); no new rebuilds.
- **Live market pages** list their story first under "More from the count". The sitemap lists the stories.
- **Fonts**: Hanken Grotesk (stories and grid); Bebas Neue, Limelight, Bungee, Allerta Stencil, one per story and the
  grid's covers; each with its OFL in `app/fonts/`, one font module each so a route loads only its own.
- **Analytics**: `cta_clicked.where` adds `story_<slug>` per story and `market` for the grid's CV card.

## Cost

Nothing new runs on its own. Stories are static: 0 Azure API, 0 Neon, 0 Vercel function calls per visit or per
day; built at deploy only. The hub reads the publication exactly as before (one row at build and at the Monday
revalidation). A click on "Compare your CV" wakes the API as on every market page, only when a person clicks.

## Before the push

Refresh each story's data module to the week of 19 October, re-check every number against that week's live pages,
and run the tests.
