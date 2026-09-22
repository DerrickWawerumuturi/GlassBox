# Decision: fit matching

**Files:** `backend/src/matching/` — `skills.py` + `skills.txt` (vocabulary),
`roles.py` (family, level), `requirements.py` (the job side), `candidate.py`
(the CV side), `matcher.py` (the score and its reasons).
**Replaces:** the weighted-cosine `SimilarityEngine` (2026-08 to 2026-09).

## The problem with similarity

The previous score was `0.25·title + 0.45·skills + 0.10·experience + 0.20·location`,
the first three being MiniLM cosines between CV text and posting text. Text can
be close while the candidate cannot get the job. Measured on the old code with
the real model:

| Case | Old score |
|---|---|
| 1-year React dev vs **Senior React Engineer, 5+ years** | 61.9% (72.6% if in Nairobi — tied with the junior role) |
| ML learner vs **Senior ML Engineer, 4+ years** | 64.1%, title scoring *higher* than an ML internship |
| Kenya candidate vs **"Remote - US"** | 68.1%, while ineligible |
| Kenya candidate vs a job requiring **US work authorisation** in its text | 74.8% — ranked first |

`experience` was a cosine between two labels ("Mid Level" against an empty
string) and constant; `skills` compared LLM free text ("react aws") with EMSI
names ("React.js Amazon Web Services") inside an embedding. Nothing represented
years, level, required versus preferred, or eligibility — the facts screening
turns on. 56% of the pool's titles are senior or above.

## What was considered

| Approach | Verdict |
|---|---|
| Keyword / exact skills | Fast, explainable, deterministic; blind to synonyms. Kept, with a vocabulary. |
| Normalised taxonomy | **Adopted.** ~160 technologies with aliases ("React.js", "ReactJS", "React"; "Postgres") and directional related-skill credit (Next.js → React 0.8). EMSI's 31k list stays for market charts: for matching it is noisy ("Tracking (Commercial Airline Flight)", "Dyslexia" were top extracted "skills") and SkillNer costs 1–5 s a posting, so pool jobs never had skills (377 of 16,492). |
| Better embeddings (bge / e5 / gte; TechWolf JobBERT-v2 for titles) | Better semantics, same blindness to years, level and eligibility. JobBERT-v2 (~420 MB) is the one worth trying later, as a role-fit signal. |
| Cross-encoder reranker (ms-marco-MiniLM, bge-reranker) | Trained for topical relevance, not qualification; 15–100 ms per pair on 2 vCPU; no outcome labels to calibrate against; not explainable. The top-K stage below is where one would go. |
| LLM extraction of every posting | ~1.4M tokens a day plus a ~25M backfill against free-tier limits, non-deterministic, and able to invent a requirement. Deterministic rules already get the fields needed. The LLM stays where it is — reading the CV once. |
| Precomputed user × job scores | Unnecessary: scoring costs microseconds, so computing on read keeps up with CV edits at no storage cost. |
| **Hybrid: structured extraction + taxonomy + gates + multipliers** | **Chosen.** Rules proven in jobhunt against a real job search (24 behaviour tests), ported and generalised. |

## How a score is built

Job side, once per posting and stored in `job_profiles`: role family and level
from the title (a level stated by the board, the posting's language, or its
years when the title says nothing); years — the **highest** required figure,
since required figures all apply, the lowest preferred one otherwise, a figure
softened in its own clause ("ideally 5+") counting as preferred; required,
preferred and mentioned skills by section, sections opened only by
heading-like markers; the technologies the title names; work authorisation
stated in the body; a non-English working language; a PhD requirement; a stale
intake year.

Candidate side, rebuilt per request from the saved CV: canonical skills;
families from the title, past roles, skills and degree; **professional years
per track from position dates** (overlaps counted once, internships at half,
ML/AI engineering roles counting as software too); languages; location
preferences.

Then:

1. **Gates** — any one makes a job `unlikely`, capped at 34: cannot hold it
   (ineligible tier, or a work-authorisation lock the user does not meet;
   onsite abroad with no sponsorship); two or more levels above the candidate on
   the job's track; three or more years short of a stated requirement; a
   working language the CV does not show; a required PhD; not a technical role
   (or an unclassified one with enough text and nothing technical in common);
   almost none of four or more required skills; an intake for a past year.
2. **Quality** — `0.45·required + 0.25·role + 0.20·seniority + 0.10·preferred`,
   each 0–1; preferred drops out when the posting lists none, and a full
   posting naming no technology counts 0.25 on required (a thin one 0.5).
3. **Multipliers** — experience (0, 1, 2, 3, more years short → 1.0, 0.8, 0.6,
   0.35, 0.15; a preferred figure read two years lighter; no figure → the level
   stands in, else 0.7) and location (local 1.0 … remote unspecified 0.85,
   onsite abroad 0.5, nudged by the user's tier order).

`score = 100 · quality · experience · location`; strong ≥ 75, good ≥ 55,
stretch ≥ 35. Three things make a job a stretch at most, whatever its score: a
role fit below 0.35 (different work, whatever the overlap); less than 40% of
the required skills; a technology named in the title that the CV shows no sign
of ("Python Developer" without Python — a related skill counts).

Hard versus soft: eligibility, level gaps of two, years gaps of three, language
and PhD are hard; skill coverage, role closeness, a one-level or one-year gap
and location preference are soft.

## Explanations

Every match carries `reasons` (tone + sentence, most important first),
`blockers`, the six dimensions, and required/preferred skills split into
matched, partial (through a related skill) and missing:

```
Strong match  92
  ✓ Role fits: Full-stack          ✓ 3/3 required skills
  ✓ Junior role                    ✓ Asks 1+ years of software experience; you have about 1.9
  ✓ Remote, open to your region
```

```
Out of reach  10
  ✓ Role fits: Frontend            ✓ 3/3 required skills
  ✗ Senior role — two or more levels above yours (junior)
  ✗ Asks 5+ years of software experience; you have about 1.1
```

## Validated on the real pool

Read-only against production on 2026-09-22: 12,170 live jobs, profiled in
memory at 15–35 ms each on a heavily loaded laptop and matched against the
saved CV (3.1 software years from its dated roles). The gates did the
separating: 5,606 not technical, 2,562 lead/staff, 757 not open to Kenya, 501
principal/director, 286 with almost none of the required skills.

Three passes over the resulting good fits found seven defects, all fixed and
pinned in `tests/test_matching.py` / `test_requirements.py`:

- a full non-software posting riding the neutral "no skills listed" value;
- overlapping skills lifting a different kind of job to "good";
- "Customer Success Engineer" read as software;
- a "Summer 2024" internship still listed;
- "Security Operations Engineer" read as software;
- the right title and level carrying 4 of 16 required skills to "good";
- "Software Engineer – InterSystems Caché & TrakCare" reading as strong on its
  SQL and REST, the stack itself unknown to the vocabulary.

The end state for that CV is 2 strong, 8 good and 173 stretch. The strong and
good fits are mid-level or open-to-junior software roles open to Kenya, plus a
Nairobi NLP internship. For the ML track, the CV shows no professional
ML years, which is what an internship is for.

## Known limits

- The vocabulary is technical: a design or non-technical CV matches on role
  and level but barely on skills.
- Years come from CV dates as written; a part-time role counts as full time.
- Weights and multipliers are judged, not fitted. `application.match_method`
  (`jobradar-fit-v2`) and outcomes in `application_events` are what a learned
  ranker would be trained on once there are enough of them.
- A sentence-initial "React …" used as a verb still reads as React.
- Bump `PROFILER_VERSION` whenever a rule in `requirements.py` or `roles.py`
  changes; the daily run (or `--profile-only`) re-profiles every job.

## Where a model would go

After the gates and the score, a top-K rerank stage (say the best 200 per
user) is the slot for a cross-encoder or a learned ranker. It would change
order among reachable jobs, never what is reachable.
