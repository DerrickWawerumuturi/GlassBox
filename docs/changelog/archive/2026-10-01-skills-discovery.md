# 2026-10-01 — where the skill list is thin, and what to add

The Market tab's top skills were "Custom Backend", "Workflows" and "Curiosity",
however many denylist entries were added. The fix is to count only skills in
`skills.txt`, which Opportunities, the fit scores and the snapshot already use.
But that list is thin outside developer roles: 29% coverage for design, 32% for
product. This change measures where it is thin and suggests additions from real
postings, for a person to approve. It changes no skill and no chart yet.
Why and the four-step plan: `decisions/skill-vocabulary.md`.

---

### The discovery report

**Files:** `backend/src/matching/discover.py` (new), `backend/src/matching/discover_report.py` (new),
`backend/src/matching/skills_rejected.txt` (new), `backend/src/database/repositories/job_repository.py`
(`descriptions()`)

`python -m src.matching.discover [--html page] [--json file] [--family f] [--top n]`
reads the live pool as the snapshot counts it (daily sources only, one row per
role) and reports two things:

- **Coverage per family.** The share of readable postings in which the
  vocabulary finds at least 3 skills, and the median found. Under 80% is thin.
- **Candidates per family**, from requirement sections only (the whole posting
  when it has no headings):
  - EMSI hard-skill names, used as a dictionary;
  - new tool names by shape, which EMSI lacks: PyTorch, Next.js, D3.

  Dropped: anything overlapping a skill the vocabulary already found, the
  employer's own name ("Asana" in Asana's postings), and `skills_rejected.txt`.
  Ranked by count × specificity. A term must appear in 3+ postings and be 1.5×
  more common in the family than across the pool. Generic words ("Scale",
  "Make", "Track") sat at 0.9–1.4× on the first run.

The `--html` page lists the thinnest families first, each candidate with
postings, specificity and an example sentence, and Add / Reject / Skip. "Copy
decisions" gives plain lines (`ADD typography | design`, `REJECT workflows`) to
apply in a reviewed change. Nothing is written from the page.

First run on a fresh local pool (10,732 postings, 9,090 readable):

| Thin family | Covered | Top candidates |
|---|---|---|
| Design | 29% | Typography (×42), Visual Design (×44), Prototyping, Interaction Design, Information Architecture |
| Product | 33% | Product Management (×8), Project Management, Milestones, Stakeholder Management |
| QA | 57% | Root Cause Analysis, Debugging, Scripting |
| AI engineering | 62% | Prototype, ChatGPT, Data Science |

### Docs

- `decisions/skill-vocabulary.md` (new): why a closed vocabulary, the measured
  comparison with SkillNer, and the four steps.
- `architecture/backend.md`: the new modules and data file under `src/matching/`.

### Tests

`tests/test_discover.py` (new, offline, with a small dictionary):

- unknown dictionary terms and new tool names are suggested;
- what the vocabulary knows is never suggested;
- the employer's name is not a skill;
- rejected terms stay rejected;
- requirement sections are read, and the whole posting only when there are none;
- coverage counts readable postings with 3+ skills;
- candidates must be family-specific and seen often enough;
- families outside the audience are measured but not mined;
- the rejected file ignores comments.

Each guard was checked by switching it off. The vocabulary check
(`skills.canonical(...) is None`) did not fail any test when removed: the
overlap check already excludes those terms. It was redundant and is gone.

Backend: 287 passed against a local Postgres, and 262 passed + 2 skipped with
`DATABASE_URL=""`.

**A test-database note.** `test_api_pool_and_import.py` assumes a pool that
holds only its own postings. A real pool in the same database fails
`test_opportunities_newest_first_with_reasons_and_dates`. Real-pool runs (like
this report) use a separate local database (`jobradar_pool`), never the test one.
