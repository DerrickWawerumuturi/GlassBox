# 2026-10-13: Lever read one request a second (fixes #9)

Decision: `docs/decisions/job-sources.md` (robots.txt). Review page:
`docs/local/lever-crawl-delay-review.html`.

- Lever's API hosts ask for `Crawl-delay: 1`. The collector read boards on 24
  threads, so several Lever boards could be asked for at once.
- New `backend/src/jobpool/crawl_delay.py`: a pacer per host. Requests to a
  listed host go one at a time, each at least its delay after the previous one
  ended. Unlisted hosts pass straight through. `sources._json` goes through it,
  so the collector and pasted Lever links (`extract.py`) both wait their turn.
- `fetch_all` gives Lever boards one worker of their own (`sources.PACED_ATS`),
  so waiting Lever boards never hold the shared pool's threads.
- Run time: 9 Lever boards, about 14 s in their own lane, beside a 37 s fetch
  phase (run 2026-10-13 00:38 UTC, 268 sources, whole job about 7 minutes of a
  30 minute limit). Expected change to the run: none.
- Tests: `backend/tests/test_crawl_delay.py`, a fake clock and fake HTTP. Three
  failed without the change; the fourth guards that other hosts never sleep.
