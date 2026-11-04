# 2026-10-01 — the Market tab speaks the same skills as the rest of the app

Step 3 of `decisions/skill-vocabulary.md`. The Market tab's skills came from
SkillNer, an open search over 31,278 EMSI entries. Its top results were
"Custom Backend", "Workflows" and "Curiosity" however many denylist entries were
added, and it cost about 2 seconds a posting. Opportunities, the fit scores and
the market snapshot already read the closed vocabulary (`skills.txt`). Now the
Market tab does too.

---

### Skills from profiles, not SkillNer

**Files:** `backend/src/Agent/utils/parser.py`, `backend/src/Agent/Framework/JobRadarAgent.py`

- `parse_retrieved_jobs(raw_jobs, profiles)` returns `(jobs, readable)`.
  - Each posting's skills are its requirement profile's (required, preferred,
    mentioned, then the title's), in the vocabulary's display spelling.
  - Stored profiles are reused, and the rest are profiled in milliseconds. The
    agent reads the stored profiles once and passes the same ones to
    `score_jobs`.
  - Only readable postings (profile not `thin`) feed `MarketAnalyzer`; thin ones
    are still ranked. If a scan has nothing readable, every posting is used
    rather than showing an empty market.
- `cv_skill_names(names)` puts the CV's skills on the same spelling through
  `resolve_all`, so "react.js" on a CV and "React" in a posting are one skill.
  Unknown names are kept as written, as SkillNer's `normalize()` did.
- The agent no longer builds a `SkillExtractor`, and `parser` no longer imports
  the extraction pool. **spaCy and SkillNer no longer load in the app.**
  `skill_extractor.py`, `extraction_pool.py`, `stored_skills` and
  `persist_skills` stay for a week as a rollback path; step 4 removes them.

On 58 real junior and mid developer postings (local pool), with a React,
TypeScript, Python, Node.js and PostgreSQL CV:

- **Top:** Python 45%, Go 43%, Java 31%, AWS 28%, JavaScript 28%, Observability
  24%, Distributed systems 24%, React 22%, TypeScript 22%, Kubernetes 21%.
- **Gaps:** Go, Java, AWS, Observability, Distributed systems, Kubernetes,
  Google Cloud, AI agents.
- **Yours:** Python, JavaScript, React, TypeScript, PostgreSQL, Git, Node.js.

The same kind of scan previously led with "Custom Backend", "Java",
"Infrastructure" and "Workflows" (`frontend/public/backend/curr02.png`).

### Vocabulary, round two

**File:** `backend/src/matching/skills.txt` (still `requirements-v2`, not yet
released)

Added:
- Lean / Six Sigma;
- knowledge graphs;
- reverse engineering;
- LangSmith and Langfuse (under LangChain);
- query optimization (under SQL);
- design research (under user research);
- experience design (under UI/UX).

The test `test_every_spelling_belongs_to_one_skill` caught "neo4j" being added to
a second skill, and it was removed. Why the four thin families stop here (their
remaining postings name no tools, and some are mis-classified roles):
`decisions/skill-vocabulary.md`, "Round two, and the ceiling".

### Frontend

Nothing to change. Skill names are now the vocabulary's ("React", "PostgreSQL",
"AWS") instead of EMSI's ("React.js", "Amazon Web Services"). The frontend's
removal of trailing "(Programming Language)" qualifiers now simply has nothing to
remove.

### Docs

- `architecture/backend.md`: section 3 is now "Skills from profiles", and "The
  skill vocabulary" describes one vocabulary for both sides, with the SkillNer
  notes kept as history.
- `architecture/overview.md`: the scan diagram and its performance note.
- `decisions/market-analyzer.md`: where the shared vocabulary now comes from.
- `decisions/skill-vocabulary.md`: round two, the ceiling, step 3.

### Tests

`tests/test_scan.py`:
- a scan's skills come from profiles, and stored ones are reused;
- thin postings are ranked but kept out of the market statistics;
- a scan of only thin postings still has a market;
- CV skills are named like posting skills;
- the scan path no longer loads SkillNer (checked in a fresh interpreter).

Each was checked by breaking it: ignoring stored profiles, letting thin postings
into the market, leaving CV names unresolved, and importing SkillNer again each
failed its test.

Backend: 296 passed against a local Postgres, and 271 passed + 2 skipped with
`DATABASE_URL=""`.

### Not checked

A full `/analyze` scan end to end. It needs the Groq key and the live search
providers, and was not run from here. The parts were exercised separately: real
pool postings through `parse_retrieved_jobs` and `MarketAnalyzer` (above), and
the agent's scoring through the tests. Run one scan after deploying, and check
the Market tab.
