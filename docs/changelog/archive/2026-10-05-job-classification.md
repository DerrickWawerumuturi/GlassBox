# 2026-10-05 — Job classification: families and levels audited

**Files:** `backend/src/matching/roles.py`, `requirements.py` (PROFILER_VERSION
`requirements-v3`), `tests/test_requirements.py`.

Audited against the live pool (26,613 jobs, read-only queries). 1,322 jobs change family.

- **"AI" names the domain, not the job.** Non-technical AI titles (counsel,
  account executives, product marketing, policy) go to `non_tech`; titles that
  also name a technical function (iOS, backend, security, support, data
  engineering) go to that function. 189 left `ai` for `non_tech`.
- **Physical-product QA leaves `qa`:** manufacturing, hardware, propulsion,
  battery and metrology quality or test roles go to `non_tech` or `embedded`.
- **The non-tech list** gained what the pool showed missing (policy, SEO, GTM,
  payroll, partnerships, events, enablement, German tax and care titles): 906
  jobs leave `other`.
- **Levels:** "manager" in product, project and account titles names the
  function, so product roles stop reading as 90% lead (now
  15%). A year range places the level at its
  middle ("2–5 years" is mid), while the gate still uses the lower end.
- 33 tests from real mislabelled titles; 22 fail on the old rules.
- The next daily run re-profiles every job (new profiler version); market
  snapshots start a new series.
