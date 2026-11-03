# Junior remote jobs — v8 research package (provisional)

**Status: DO NOT PUBLISH.** This is a 3 November 2026 production snapshot using `requirements-v8`. PR #58 is extending the family classifier to cover additional hardware, aerospace and industrial false positives. Re-run the full query and audit after v9 is deployed and the next successful source collection has persisted the Ashby workplace correction.

## Scope and snapshot

- Profile version: `requirements-v8`; 71,097 job profiles, latest profile timestamp 2026-11-03 06:39:49 UTC.
- Current pool: active, not archived or closed; posted/first-seen in the last 90 days; liveness follows the shared pool windows (3 days for complete boards, 30 days for window feeds and legacy rows).
- Providers: Greenhouse, Ashby, Lever, Workable, RemoteOK, Remotive, Arbeitnow, Jobicy, Himalayas (including regional feed rows), We Work Remotely, and the five Kenyan RSS boards plus the retired Summit feed while its rows age out.
- Family scope: `software_engineering`, `backend`, `frontend`, `full_stack`, `mobile`.
- Raw eligible rows: 6,980.
- Production `duplicate_key(company, title)` semantics: 5,772 distinct role keys.
- Editorial normalization additionally aliases known employer variants (Astera Labs Early Career, Graphcore Early Careers, MORSE Corp Co-op Opportunities, Tenstorrent University Jobs, Rocket Lab Corporation, Varda Space Industries) and known seasonal/location variants. This yields 5,726 editorial role keys before scope exclusions.
- Manual audit ledger: 272 source rows, 235 unique role keys after aliases; 92 include, 135 exclude, 8 ambiguous. The 8 ambiguous keys are excluded from the strict result and retained only for sensitivity. See [family-audit-v8-complete-2026-11-03.csv](family-audit-v8-complete-2026-11-03.csv).

## Strict v8 result

After applying the manual scope decisions:

| Remote flag group | Counted roles | Early-career title signals | Share |
|---|---:|---:|---:|
| Remote-flagged | 1,614 | 31 | 1.92% |
| Not remote-flagged | 3,856 | 335 | 8.69% |
| Unknown | 113 | 6 | 5.31% |
| **Total** | **5,583** | **372** | **6.66%** |

The early-title share is 6.77 percentage points higher in the not-remote-flagged group, or 4.52 times the remote-flagged share. Wilson 95% intervals: remote-flagged 1.36–2.71%; not-remote-flagged 7.84–9.62%. Treat these as descriptive snapshot rates, not a causal estimate.

The early-title proxy is title-only: intern, internship, co-op, Werkstudent/working student, Praktik, apprentice, graduate/new grad/grad, entry-level, early-career, junior and jr. It is not a verified statement of experience requirements or applicant eligibility.

## Workplace labels: the crucial caveat

The database `remote` boolean is not equivalent to an explicit workplace label. The strict pool breaks down as follows:

| Raw workplace label | Remote flag | Roles | Early-title signals |
|---|---|---:|---:|
| Remote | Remote-flagged | 94 | 1 |
| Hybrid | Not remote-flagged | 273 | 26 |
| Onsite | Not remote-flagged | 293 | 33 |
| No workplace label | Remote-flagged | 1,520 | 30 |
| No workplace label | Not remote-flagged | 3,290 | 276 |
| No workplace label | Unknown | 113 | 6 |

Only 94 of 1,614 remote-flagged roles (5.8%) explicitly carry a Remote workplace label; 1,520 (94.2%) have no explicit workplace label. Only 1 of the 94 explicitly remote-labelled roles has an early-career title signal (1.1%). Thirty of the 31 remote-flagged early-title roles have no explicit workplace label.

Ashby previously set its `remote` boolean true for Hybrid listings. The query applies the source's explicit workplace type at analysis time: Remote -> true; Hybrid/OnSite -> false. The persisted production rows still need the next successful source collection to demonstrate that normalization has been written through; do not publish until that refresh is verified.

## Source-mix sensitivity

| Source group | Remote-flagged | Early | Not remote-flagged | Early | Unknown | Early |
|---|---:|---:|---:|---:|---:|---:|
| Direct ATS (Greenhouse, Ashby, Lever, Workable) | 296 | 1 | 1,661 | 179 | 113 | 6 |
| Aggregators (RemoteOK, Remotive, Arbeitnow, Jobicy, Himalayas, We Work Remotely) | 1,318 | 30 | 2,157 | 154 | — | — |
| Kenyan RSS boards | — | — | 38 | 2 | — | — |

Thirty of the 31 remote-flagged early-title roles come from aggregators; one comes from a direct ATS. Within direct ATS, the title-signal share is 0.34% (1/296) in the remote-flagged group and 10.78% (179/1,661) in the not-remote-flagged group. Within aggregators, it is 2.28% (30/1,318) versus 7.14% (154/2,157). The pattern is present in both groups, but source-specific remote flags and missing workplace labels prevent treating the combined remote-flagged denominator as 1,614 explicitly remote jobs.

## Employer concentration

- Remote-flagged early-title roles: 31 across 29 employers; no employer contributes more than 2.
- Not-remote-flagged early-title roles: 335 across 181 employers; maximum 11 at one employer.
- The largest not-remote employer groups include MORSE Corp (11), Palantir (10), Skydio (10), Affirm (7), Stripe (7), Graphcore (6), HP IQ (6), and Rivianvw.Tech (6). These are counts after the editorial employer aliases.

## Parser QA

In fresh v8 software-family jobs last seen within 14 days, 153 descriptions containing one of the explicit phrases `2+ years of experience`, `at least 2 years`, or `minimum 2 years` were all classified as required; none remained `unstated`. Production spot checks: Holiday World Software Engineer Internship -> 2 required years; Tebi Engineering Manager -> 7 required years. A LangChain regression is covered by a test fixture, but that posting was not present in the current production slice.

## Publication gates

1. Merge PR #58 only after backend tests and Vercel preview pass.
2. Deploy v9 and wait for a successful source collection/reprofile; confirm the Ashby `remote` flag matches explicit workplace type.
3. Re-run the same 90-day pool query on v9. Re-run the expanded physical-signal title scan and manually audit residual false positives/ambiguous roles.
4. Rebuild the strict count, workplace/source/employer sensitivity tables and story copy from v9 only.
5. Keep the v8 figures archived for auditability; do not combine profiler versions or present remote-flagged as explicit remote.

The v8 snapshot series itself has no daily snapshot. Existing `market_snapshots` series: v6 has 26 dates (8 Oct–2 Nov); v7 has one date (3 Nov). The next version starts a separate series.
