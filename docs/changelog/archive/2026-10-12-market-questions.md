# 2026-10-12: market pages answer the questions people search (fixes #2)

Decision: `docs/decisions/market-pages.md` ("Searched questions", "Years of experience").
Review page: `docs/local/market-questions-review.html`.

## What changed

- New page `/market/entry-level-software/years-of-experience`: how many years
  entry level software jobs ask for, read from early career titles (most state
  none), with all software jobs for scale. Own share image, canonical, Article,
  BreadcrumbList and FAQPage markup, sitemap, weekly refresh paths.
- Backend: the entry level body carries `experience {titled, software}`
  (`market_pages.experience`, buckets 0 to 5+ via `market_story.buckets`, the
  renamed `_buckets`). `market_pages.ANSWERS` lists the answer pages;
  `refresh_site.pages()` opens them after a publication.
- The five market pages: title names the searched question ("AI engineer
  skills, counted from 288 jobs"), description answers it with a count and the
  week, the entry level dek adds its most named skill, and up to four
  "Questions this count answers" with FAQPage markup.

## Found, and fixed (founder, 12 Oct)

`required_median` is the median number of required skills per job, not years.
The entry level page's years ("“Entry level” usually means two years") were
mostly the definition answering itself: jobs requiring two years or less count
as entry level. Now the entry level page never leads with its own years and
has no years section (`market_story.story(own_years=False)`, and the same in
the frontend for publications built before). It leads with its next finding
("Nearly half of entry level software jobs name Python" on the 12 Oct pool: 276 of 560 is 49.3%, so one "half" rule now gives a single skill the pair's words, "nearly" under 50% and "about" from 50%) and "At a
glance" points to the years page.

## The line above the headline is gone (founder, 12 Oct)

"The skills AI jobs name, counted" above the H1 on the five pages, and the
question above the years page's H1. The breadcrumb sits above the H1. The
searched question stays in the title, description and question blocks.

## Data

`experience` reaches the API with the first publication after the push (19 Oct),
or after `python -m src.jobpool.publish --now` on production.
