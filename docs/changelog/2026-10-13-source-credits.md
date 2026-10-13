# 2026-10-13: every job site credited; Summit Recruitment's feed no longer read (fixes #8)

Decision: `docs/decisions/job-sources.md` (robots.txt and credits). Review page:
`docs/local/source-credits-review.html`.

- /method links every job site whose terms ask for a credit: Remote OK,
  Remotive, Arbeitnow, Jobicy, Himalayas and We Work Remotely. Plain followed
  links, as Remote OK asks. "RemoteOK" is now "Remote OK", its own spelling.
- Summit Recruitment's robots.txt disallows `/feed/`, the address we read.
  `sources.KENYAN_BOARDS` drops it, so the collector no longer fetches it. Its
  jobs already in the pool keep counting and leave 30 days after they were last
  seen (`sources.RETIRED_FEEDS` keeps the provider counted until then). /method
  now says five Kenyan job feeds.
- robots.txt checked for every address the collector reads. One other disallow
  matches: Remotive's `Disallow: /api/*` covers its documented public API. Not
  changed; for the founder.
- Still to do after #7: the source list in `backend/src/jobpool/open_data_readme.md`
  still names Summit Recruitment, and `docs/decisions/open-data.md` still lists
  it as read. Both are #7's files.
- Tests: `test_summit_recruitment_feed_is_not_fetched_but_its_jobs_still_count`
  (backend) and two /method tests in `market-page.test.ts`. Each failed without the change.
