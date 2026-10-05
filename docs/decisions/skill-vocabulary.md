# Decision: one closed skill vocabulary, grown by review

**Status:** all four steps done. Steps 1–3 on 2026-10-01; step 4 (SkillNer and spaCy deleted) on 2026-10-05.
**Files:** `backend/src/matching/skills.txt`, `skills.py`, `discover.py`, `discover_report.py`, `skills_rejected.txt`

## The problem

The Market tab's top skills kept coming back as "Custom Backend", "Workflows",
"Collaboration", "Curiosity". Every fix added to a denylist
(`skill_extractor.py`: `DENYLISTED_SURFACE_FORMS`, `NOT_SKILLS`) and new junk
took its place.

The cause is how SkillNer works. It is an open search over EMSI's 31,278 entries,
which list "Workflows", "Custom Backend", "Accounting" and "Scale" as **hard
skills**. Postings are full of those words, so a denylist can never be finished.

Measured on 60 live tech postings (Airtable, Amplitude, Asana, Braze, Brex),
2026-10-01:

| | SkillNer | skills.txt |
|---|---|---|
| Top 5 | Collaboration, Infrastructure, Workflows, Leadership, Decision Making | REST API, Python, Observability, SQL, Machine learning |
| Python's rank | 22nd (5 postings) | 2nd (15) |
| The employer's own name | "Asana" counted as a skill | never |
| Time for 60 postings | 131 s | milliseconds |

## The decision

**Only skills in `skills.txt` are counted, anywhere.** A skill is a concrete,
nameable tool, technology or method a CV could list and a course could teach:
Python, SQL, Kubernetes, Figma, A/B testing. Soft skills, generic nouns, job
titles, fields of study and company names are not skills.

Opportunities, the fit scores and the daily snapshot already read `skills.txt`.
The Market tab moves to it too, so the app has one idea of what a skill is.

## The cost, and how it is paid

A closed list misses what nobody has listed. On 2026-10-01 it had 165 skills,
mostly for developers. Coverage, measured as the share of readable postings
where it finds 3+ skills, was 29% for design and 32% for product, against 89–95%
for backend, full-stack and data. A designer's CV would mostly have come up
empty. Switching the Market tab first would have made design worse, so the
order is:

1. **Discovery report** (`python -m src.matching.discover --html …`). Coverage per
   family, plus candidates from the live pool's requirement sections:
   - EMSI hard-skill names, used only as a dictionary;
   - new tool names by shape (CamelCase, `.js`, letters with digits);
   - minus what the vocabulary already finds, the employer's own name and
     `skills_rejected.txt`.

   Candidates are ranked by specificity, meaning how much more common a term is
   in the family than across the pool. Terms under 1.5× are hidden: on the first
   run "Scale", "Make" and "Track" sat at 0.9–1.4×.
2. **Grow `skills.txt` family by family** from the report, each addition approved
   by a person. Rejections go to `skills_rejected.txt`, so they never come back.
3. **Switch the Market tab** to the vocabulary once every family in the audience
   covers at least 80%.
4. **Remove SkillNer and spaCy** from the container: about 400 MB+ resident
   (`changelog/2026-08-25-container-oom.md`) and about 2 s a posting.
   Done 2026-10-05.

## Rules for the vocabulary

- Additions come from the report (real postings), not from memory, and a person
  approves each one.
- Spellings of one skill are aliases of one key ("Photoshop" = "Adobe Photoshop").
- EMSI's skill types are not trusted: it calls "Workflows" a hard skill.
- A spelling is one phrase: its words may be joined by spaces, hyphens or
  slashes, never a comma ("product, design" is two teams).
- A skill that postings also use as a quality is gated: `?observability[...]`
  resolves on a CV, but in a posting counts only in a sentence that also says a
  context word.
- The employer's own name is never a skill: "Datadog" at Datadog is who is
  hiring.
- `non_tech`, `other` and `ai_data` are measured but not mined. They are outside
  the audience; pass `--family` to mine one anyway.

## Step 2 result (2026-10-01, `requirements-v2`)

The first review was delegated by the founder ("make the decisions") and made
against the definition above. `skills.txt` went from 165 to 247 skills (82 new), and 16
existing skills gained spellings (e.g. statistics: experimental design; SQL:
relational databases). 299 terms went to `skills_rejected.txt`. About 100
borderline terms were left unreviewed and stay in the report (stakeholder
management, product marketing, solution architecture, SRE…).

Coverage on a fresh local pool (10,732 postings):

| Family | v1 | v2 | Bar |
|---|---|---|---|
| Design | 29% | 76% | 80% |
| Product | 33% | 58% | 60% |
| QA | 57% | 69% | 80% |
| AI engineering | 62% | 75% | 80% |
| IT support | 66% | 84% | 80% |
| Embedded | 71% | 83% | 80% |
| Data analytics | 72% | 83% | 80% |
| Software engineering | 75% | 83% | 80% |
| Security | 85% | 95% | 80% |
| Machine learning | 83% | 94% | 80% |

Design's top skills now read Figma, product design, design systems, prototyping,
typography, visual design.

**Decided 2026-10-01:**

- **Product's bar is 60%.** Its postings ask mostly for judgement and strategy,
  which are not skills by this definition, and soft skills would bring the junk
  back (`FAMILY_BARS`).
- **"REST APIs" needs building, not a mention.** The bare "api"/"apis" spellings
  are gone; "build/design/develop APIs", "API design" and "RESTful" remain. AI's
  top skills now read LLMs, Python, AI agents, machine learning instead of REST
  APIs.

## Round two, and the ceiling (2026-10-01)

A second review on the four families under their bars added only what was
genuinely a skill: Lean/Six Sigma, knowledge graphs, reverse engineering,
LangSmith/Langfuse, query optimization, design research, experience design.
Then the postings still under 3 skills were read directly:

- **Design:** portfolio, craft, mission. They name no tools.
- **Product:** strategy, ownership, equal-opportunity text.
- **AI:** "sales", "account", "commercial": sales roles titled "AI …" and
  classified into `ai` by `roles.classify_family`.
- **QA:** "supplier quality", "manufacturing": hardware quality roles in `qa`.

So the vocabulary is at its natural ceiling for these families. The rest is
postings that list no tools, plus a family-classification issue (sales titles in
`ai`, manufacturing quality in `qa`), which is tracked separately. Adding soft
skills to cross the bar would reintroduce what this replaced. Step 3 went ahead
on the evidence: the Market tab's output for these families is accurate, just
shorter.

## Step 3 (2026-10-01)

The scan's skills now come from requirement profiles (`parser.parse_retrieved_jobs`),
and the CV's through the same vocabulary (`parser.cv_skill_names`). SkillNer is
not imported on the scan path, so spaCy's `en_core_web_lg` and the 31k EMSI
matchers no longer load in the app. Step 4 deletes them from the code and the
image.

## Step 4 (2026-10-05)

Deleted `skill_extractor.py`, `extraction_pool.py`, `skill_repository.py`,
`stored_skills`, `persist_skills`, `token_dist.json` and the local
`en_core_web_lg` folder; `skillner` and `spacy` left `requirements.txt`, and the
Dockerfile no longer installs the model or copies the EMSI files. Packages that
only they needed, measured in the venv: en_core_web_lg 424.5 MiB,
spaCy, SkillNer and 18 dependencies 54 MiB (nltk, thinc, blis, srsly...), plus 7 MB of JSON: about
485 MiB less in the image. A test fails if anything in the backend imports
either again.

`skill_db_relax_20.json` stays in the repository: `discover.py` reads it as a
dictionary of EMSI names. It is in `.dockerignore`. The `skills` and
`job_skills` tables stay in the database, unused.

## Observability, and three over-broad rules (2026-10-05, `requirements-v4`)

Observability topped the backend family: 50 of 126 readable live jobs. Of 30
sampled by hand, 16 asked for observability tooling or practice and 14 used
the word as a quality ("debugging, observability, and test coverage"), a team
or product name, or the employer's own name. Three rules, each general:

| Rule | Before | After |
|---|---|---|
| Bare "observability" only with a practice word in its sentence (monitoring, metrics, traces, logs, alerting, telemetry, dashboards, SLOs) or as "observability tools/tooling/stack/solutions" | quality lists counted | 11 of 14 sampled dropped |
| A multi-word spelling never spans a comma or full stop | "product, design" 415 times | 0 |
| The employer's own name is not a skill | "Datadog" at Datadog 4,256 times | 0 |

On the 30-job sample: all 16 real asks still match, 11 of the 14 false ones
drop. Live pool, readable jobs, before and after:

| Family | Observability | Product design |
|---|---|---|
| Backend | 50 → 29 / 126 (1st → 10th) | 17 → 4 |
| Software engineering | 556 → 261 / 1,701 | 159 → 31 |
| DevOps | 81 → 64 / 176 (1st → 5th) | |
| AI | 74 → 28 / 305 | |
| Product | 66 → 20 / 608 | |
| Full stack | 21 → 10 / 107 | 23 → 1 |
| Frontend | 13 → 5 / 48 | 20 → 5 |
| Mobile | | 19 → 5 |
| Design | | 85 → 81 / 200 |

The employer rule also moved Databricks in solutions (128 → 45 / 592), Git in
backend (30 → 10, GitLab's own postings) and MongoDB, Cloudflare and Twilio.

Left alone, worth a look later: `ml` as Machine learning in product postings
("AI/ML products", 101 hits); `on call rotation` as Incident response (devops
72 / 176); `relational databases` as SQL; a tool name used as a company
("Grafana Labs CEO" as an investor).

