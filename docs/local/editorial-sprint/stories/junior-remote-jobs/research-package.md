# Where Are the Junior Remote Jobs?
## Editorial research package, 28 October 2026

Status: research package on a non-production branch. No production code or data changed.

## Editorial decision

**Lead with the title gap, not a claim about remote jobs becoming more senior.**

In the 27 October reference pool, 56/1,807 jobs flagged remote (3.10%) and 364/3,426 jobs not flagged remote (10.62%) have titles explicitly signalling early career. This measures how vacancies are advertised. It does not measure who employers would accept, who applied, or who was hired.

The same-employer/same-family direct-ATS check points in the same descriptive direction: across 38 strata and 35 employers, 13/296 flagged-remote jobs (4.39%) and 38/355 jobs not flagged remote (10.70%) have early-career titles. Among nine strata with at least three jobs in each mode, the remote share is lower in four, equal in five, and higher in none. This is not causal and has not yet been re-run after the family audit.

### Count reconciliation gate

A fresh read-only query at approximately 2026-10-27 21:13 UTC reproduced 1,807 flagged-remote jobs and 123 unknown-status jobs, and the early-title numerators of 56 and 364. It returned 3,422, rather than 3,426, jobs not flagged remote. The four-record difference is entirely in the non-early-title count in that query. Recent closures are visible, but the exact four rows have not been reconciled to the earlier reference query.

Do not silently replace the supplied reference counts with the later query or publish the post-audit denominator as final. The audit sensitivity below is provisional until the four records are resolved.

## Current evidence and publication-safe language

| Measure | Reference result | What it means |
|---|---:|---|
| Explicit early-career title, flagged remote | 56/1,807 (3.10%) | Title wording only |
| Explicit early-career title, not flagged remote | 364/3,426 (10.62%) | Title wording only |
| Internships/co-ops among those early titles, flagged remote | 36 jobs | 36 jobs, not 36% |
| Graduate/junior/entry titles, flagged remote | 20 jobs | Excludes internship/co-op titles |
| Internships/co-ops among those early titles, not flagged remote | 259 jobs | Excludes graduate/junior/entry titles |
| Graduate/junior/entry titles, not flagged remote | 105 jobs | Excludes internship/co-op titles |

The title rule in backend/src/jobpool/market_pages.py is exact and title-only: an internship/co-op/working-student/apprentice title qualifies regardless of other level words; otherwise graduate, new grad, grad, entry-level, early-career, junior or jr qualifies only if no senior/staff/lead/principal/manager/director/head/architect/chief/VP word appears. Do not mix this measure with Glassbox's broader entry-level rule, which also uses parsed profile fields.

### The remote flag is not the same as fully remote

In the reference cross-tab, only 701/5,356 jobs (13.1%) have a source-provided workplace type. Among the 1,807 jobs flagged remote, 1,431 have no explicit workplace type, 287 are marked Hybrid, and 89 are explicitly Remote. The 89 explicitly Remote records in that pool all come from Ashby. Use the terms **flagged remote**, **explicitly Remote**, **Hybrid**, **OnSite**, and **workplace type missing** separately.

### Source sensitivity before the family audit

| Source group | Flagged remote | Not flagged remote |
|---|---:|---:|
| Direct ATS | 30/600 (5.00%) | 220/1,515 (14.52%) |
| Arbeitnow | 4/188 (2.13%) | 142/1,881 (7.55%) |
| Remote-only aggregators | 22/1,019 (2.16%) | No comparable non-remote group |

These are pre-audit figures. Recompute them from the final row-level audit before publication. The pattern is not explained solely by remote-only aggregators, but the sources and roles are not interchangeable.

### Family audit

The expanded title scan surfaced 73 candidate records for manual scope review:

| Decision | Count | Treatment |
|---|---:|---|
| Exclude as not a software-engineering vacancy | 42 | Physical/product design, hardware/process, industrial quality/reliability, purchasing, and one founder-program listing |
| Keep in scope | 26 | Explicit software engineering, software reliability, software validation or software systems work |
| Ambiguous | 5 | Mixed-discipline, system-validation or customer-escalation roles; retain in broad pool and test strict sensitivity separately |

The row-level decisions and rationale are in family-audit.csv. This is a manual scope ledger, not a production-classifier change. Some roles containing words like hardware, silicon, structural or reliability are genuine software jobs; do not exclude by keyword alone.

Applying the 42 explicit exclusions to the current SQL reproduction gives:

- Flagged remote: 52/1,798 = 2.89%.
- Not flagged remote: 358/3,392 = 10.55%.
- Unknown status: 6/120 = 5.00%.

If the four non-remote records in the supplied reference pool remain eligible and in scope, the second denominator would be 3,396 and the share 358/3,396 = 10.54%. The strict-scope sensitivity therefore points to about **2.89% versus 10.54-10.55%**, but do not publish it as final until the four rows are reconciled. This sensitivity keeps the five ambiguous cases in the broad pool. A stricter sensitivity should also exclude those five and show the change.

### Experience requirements: do not publish the current aggregate yet

The profile field is a detected required threshold, not a maximum years value. It must never be described as "0-2 years", and missing must not be interpreted as zero.

The checked-in v6 parser recognises numeric phrases, but the section classifier can mark a later qualification block as stop when an earlier section such as About Us or What We Offer is classified as a stop section. It stays stopped until another recognised marker appears. Some real qualification headings do not reopen the section:

- Holiday World, "Software Engineer Internship (UNPAID)": What We Offer precedes What You'll Have; the description contains "2+ years of experience working with the MERN stack", but the profile says unstated.
- LangChain, "FullStack Engineer, AI Observability & Evals Platform": the description begins with ABOUT US; the later HOW TO BE SUCCESSFUL IN THIS ROLE heading is not recognised, and the "2+ years" phrase is ignored.
- Tebi, "Engineering Manager": About Us precedes What You'll Bring; the "2+ years" phrase is ignored.

The targeted query found 109 descriptions containing the exact phrase "2+ years of experience", with three corresponding profiles unstated. Another 39 descriptions contain "at least 2 years" or "minimum 2 years", with one corresponding profile unstated. Check the two phrase sets for overlap before reporting a distinct-row total.

**Recommended non-production fix and test plan:** recognise headings such as What You'll Have, What You'll Bring, and How to Be Successful in This Role, and test that a qualification heading can reopen parsing after an earlier stop heading. Add regression cases for the three real examples and nearby variants. Only after tests pass should a future release bump the profiler version and reprofile in a controlled deployment. No code change or reprofile was performed in this sprint.

### AI requirements: supporting context, not the headline

Before the family audit, mapped AI/ML technical requirements appeared in 462/1,791 readable flagged-remote jobs and 736/3,398 readable jobs not flagged remote. Among early-title jobs the rates were 9/56 (16.1%) and 59/361 (16.3%). AI-assistant requirements appeared in 3/56 and 23/361. These are vocabulary-based classifications, not an exhaustive search for every AI phrase. Recompute after the family audit. Current evidence does not establish an AI-specific penalty for early-career remote roles.

### Historical and causal limits

- Requirements-v6 snapshots cover 20 days, 8-27 October 2026, and aggregate by family without a remote dimension.
- job_observations has 4,026 observations across 965 distinct jobs. It is not a complete historical market series.
- Do not claim remote jobs are becoming more senior, harder to get, or less accessible over time.
- Job descriptions do not reveal applicant pools, interview rates, hiring decisions or employer intent.
- Geography belongs in a secondary context layer. Quora's New Grad listing, for example, is explicitly Remote but limited to eligible US and Canadian candidates. That is a separate eligibility constraint, not a reason to make geography the central story.

## Working headline and deck

# Where Are the Junior Remote Jobs?

In Glassbox's current software-job pool, listings flagged remote are much less likely to carry an explicit early-career title. The qualifications beneath those titles are more mixed, and the remote label itself is not always as clear as it looks.

## Article outline

1. **Start with a real exception.** Quora's "Full Stack Software Engineer, New Grad" listing explicitly says Remote. It asks for a 2025 or 2026 graduate and foundational computer-science knowledge; previous software and AI-project experience are preferred, not the core minimum.
2. **Count the words.** Show 56/1,807 versus 364/3,426. Define the exact title-only rule. State that the measure describes advertised labels, not actual candidate eligibility.
3. **Lift the workplace label.** Separate explicitly Remote, Hybrid, OnSite and workplace type missing. The stored remote boolean is not enough to call all 1,807 jobs fully remote.
4. **Read beneath the title.** Place Quora beside Coinbase's "Software Engineer - Crypto Data Foundations", a Remote - USA role that asks for two or more years building and operating production systems. Mark minimum requirements separately from preferred skills and AI-tool language.
5. **Test the pattern.** Show source-specific comparisons and the same-employer/same-family direct-ATS check. Explain that the pattern is descriptive, not causal. Re-run source counts after the final scope audit.
6. **The AI detour.** Use a small side note showing nearly equal mapped AI/ML requirement rates among early-title jobs. Explain the vocabulary limitation; do not turn this into a separate AI article.
7. **Say what the data cannot tell us.** No historical remote-specific trend, no applicant or hiring outcomes, and no reason-for-disclosure inference. Close with the Glassbox principle: we show, you decide.

## Distinctive storyboard: The Title Scanner

No stock-tech imagery, no AI-generated people, and no reuse of the previous crowd/ladder/drawn-people treatment. Build the sequence from actual job-title strips, official job-ad excerpts, HTML/CSS/SVG and restrained motion.

### Frame 1: The specimen
A cropped, legible Quora job-title card on warm paper. An acetate overlay reveals New Grad and the explicit Remote label. It is an example, not a representative sample.

### Frame 2: The wall
Thousands of actual titles in two typographic fields. A narrow scanning slit highlights only terms in the exact early-career title rule. The count settles on the supplied reference: 56 of 1,807 versus 364 of 3,426. A footnote says "title labels, not hiring outcomes".

### Frame 3: Lift the workplace label
The same title wall remains in place while a transparent second layer shows Remote, Hybrid, OnSite and type missing. The motion reveals the data-quality issue instead of hiding it.

### Frame 4: Read the requirements
Two source-linked cards, Quora and Coinbase. Use consistent marks for title, minimum qualification, preferred qualification and AI/tool language. Do not imply that two examples represent all remote jobs.

### Frame 5: Stress-test the count
Small multiples for direct ATS and Arbeitnow, followed by the same-employer/same-family check. Preserve differences by source; do not smooth them into a universal claim. Replace these counts with post-audit results before publishing.

### Frame 6: The receipt
A compact paper methods card: snapshot date, fresh/live window, title rule, cross-source deduplication, unknown work-mode handling, 73-record scope audit, parser limitation and four-record denominator discrepancy. The years chart remains withheld until the parser is validated.

### Art direction and motion
- Warm paper, Source Serif 4-style editorial typography, mono labels and black ink.
- Glassbox orange (#f5532a) only for the scan window and annotations; use lime sparingly to mark matched title words.
- Motion is a literal scan and layer reveal, not a metaphor of people being rejected by a filter.
- Use source-linked text excerpts rather than screenshots that obscure the words. If using screenshots, preserve enough context to avoid misrepresenting the ad.
- Build the visuals from original SVG/CSS and real data. No generic stock-tech imagery.

## Specific visual journalism references

- **Bloomberg Graphics, "Gasoline Prices Around the World: The Real Cost of Filling Up"**: compare multiple lenses instead of making one ranking do all the work. Glassbox should separate title wording, workplace-type evidence and source sensitivity.
- **ProPublica, "Busted"**: open with a concrete case and use it to reveal a wider pattern. Here the specimen is a real job ad, followed by the title wall.
- **The Markup, "How We Assessed the Accuracy of Predictive Policing Software"**: make validation, data choices and limitations visible, especially where the parsed profile disagrees with source text.
- **Rest of World, "The hidden Kenyan workers training China's AI models"**: ground abstract technology claims in actual labour and working conditions. For Glassbox, that is a reporting lesson, not permission to infer employer motives from job ads.

The graphic should perform a reasoning step, not decorate the prose.

## Publication inventory and placement

The existing inventory includes:

- /market/entry-level-software/is-entry-level-dead
- /market/entry-level-software/pick-a-side
- /market/software-engineering/the-lobby
- /market/ai/ai-on-your-cv
- /market/ai/contents-may-vary
- /market/machine-learning/peak-python
- /market/devops/within-eleven-jobs

This is a distinct new story. A candidate slug is /market/entry-level-software/where-are-the-junior-remote-jobs, but it has not been implemented or route-validated. Distribution/channel planning remains parked.

## Salary transparency boundary

Glassbox can measure salary disclosure rates and compare disclosure patterns by role, source, seniority and workplace label when salary fields are sufficiently populated. The job data cannot establish why an employer discloses or withholds pay. Reasons require external research, employer statements or interviews. Keep that as a separate investigation.

## Read-only query for the title and scope sensitivity

This diagnostic query uses only SELECTs. It mirrors the live/fresh windows and title-only rule, applies the explicit 42-ID exclusion ledger, and exposes the current four-row discrepancy rather than concealing it. Run against the same reference timestamp when comparing snapshots.

~~~sql
WITH eligible AS (
  SELECT j.id, j.provider, j.source, j.title, j.company, j.remote,
         j.posted_at, j.first_seen_at, j.last_seen_at, p.family
  FROM public.jobs j
  JOIN public.job_profiles p ON p.job_id = j.id
  WHERE j.archived_at IS NULL
    AND j.closed_at IS NULL
    AND p.profiler_version = 'requirements-v6'
    AND j.provider IN (
      'greenhouse','ashby','lever','workable','remoteok','remotive',
      'arbeitnow','jobicy','himalayas','weworkremotely','myjobmag',
      'corporatestaffing','careerpointkenya','jobwebkenya','jobsinkenya',
      'summitrecruitment'
    )
    AND COALESCE(j.posted_at, j.first_seen_at) > now() - interval '90 days'
    AND (
      j.last_seen_at > now() - interval '3 days'
      OR (
        (j.source IS NOT NULL OR j.provider NOT IN
          ('greenhouse','ashby','lever','workable','arbeitnow'))
        AND j.last_seen_at > now() - interval '30 days'
      )
    )
),
normalised AS (
  SELECT *,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(company,'')), '[^a-z0-9]+', ' ', 'g'),
      '\m(ltd|limited|inc|llc|plc|gmbh|co|corp|corporation|company|group|holdings)\M',
      ' ', 'g'
    )) AS company_key,
    trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(title,'')), '[^a-z0-9]+', ' ', 'g'),
        '\m(remote|hybrid|onsite|on site|m|w|d|f|x|20[0-9][0-9]|summer|winter|fall|spring)\M',
        ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )) AS title_key
  FROM eligible
),
software_scope AS (
  SELECT * FROM normalised
  WHERE family IN ('software_engineering','backend','frontend','full_stack','mobile')
),
dedup AS (
  SELECT *,
    row_number() OVER (
      PARTITION BY company_key, title_key
      ORDER BY coalesce(posted_at, first_seen_at) DESC, id DESC
    ) AS rn
  FROM software_scope
),
pool AS (
  SELECT *,
    CASE
      WHEN title ~* '\m(intern|interns|internship|co-?op|werkstudent\w*|working student|praktik\w*|apprentice\w*)\M'
        THEN true
      WHEN title ~* '\m(graduate|new grad|grad|entry[- ]level|early[- ]career|junior|jr)\M'
       AND title !~* '\m(senior|sr|staff|lead|principal|manager|director|head|architect|chief|vp)\M'
        THEN true
      ELSE false
    END AS early_title
  FROM dedup
  WHERE rn = 1
),
audited AS (
  SELECT *,
    id IN (
      254210,254211,1369836,909750,1336248,522695,543951,276467,1208568,1559683,257450,
      253794,1558362,253782,251738,1260619,690714,690713,250443,250492,690692,614793,754775,
      251831,253560,253555,253517,253557,253466,1217192,543563,1183620,254562,659958,1267525,
      255010,995321,909787,253829,1319509,254954,435089
    ) AS audited_exclude
  FROM pool
)
SELECT
  CASE WHEN remote IS TRUE THEN 'flagged remote'
       WHEN remote IS FALSE THEN 'not flagged remote'
       ELSE 'unknown' END AS work_mode,
  count(*) AS jobs_before_audit,
  count(*) FILTER (WHERE early_title) AS early_titles_before_audit,
  count(*) FILTER (WHERE NOT audited_exclude) AS jobs_after_explicit_exclusions,
  count(*) FILTER (WHERE NOT audited_exclude AND early_title) AS early_titles_after_exclusions,
  count(*) FILTER (WHERE audited_exclude) AS excluded_jobs,
  count(*) FILTER (WHERE audited_exclude AND early_title) AS excluded_early_titles
FROM audited
GROUP BY 1
ORDER BY 1;
~~~

## Publication gate

1. Reconcile the four non-remote records between the 27 October reference query and the later read-only rerun.
2. Review the 73-row family ledger, especially the five ambiguous rows. Freeze include/exclude decisions and record the strict-scope sensitivity.
3. Add parser regression tests for the three real heading/years mismatches. Do not modify production code or reprofile in this research sprint.
4. Recompute source sensitivity and the same-employer/family check on the frozen scope.
5. Only then finalise article copy and export the six visual frames. No distribution planning until the article package is approved.


## Verified source links for the article package

### Employer artifacts
- Quora, Full Stack Software Engineer, New Grad (official Ashby listing): https://jobs.ashbyhq.com/quora/5494e6a1-a973-46af-b9f3-57208eb91b52
- Coinbase, Software Engineer - Crypto Data Foundations (official careers listing): https://www.coinbase.com/careers/positions/8304038
- HP IQ, Product Design Engineer (official Greenhouse listing): https://job-boards.greenhouse.io/hpiq/jobs/6144518004
- HP IQ, Product Design Engineering Intern (official Greenhouse listing): https://job-boards.greenhouse.io/hpiq/jobs/6141235004
- Skydio, Product Design Engineer (Early Career) (official Ashby listing): https://jobs.ashbyhq.com/skydio/ba62805c-ebe7-4b99-85af-f58c807b4dd1
- Astranis, Software Defined Radio Hardware Intern (official Greenhouse listing): https://job-boards.greenhouse.io/astranis/jobs/4716088006
- Astera Labs, System Validation Engineer Intern (official Greenhouse listing): https://job-boards.greenhouse.io/asteraearlycareer2027/jobs/4724488005

### Visual journalism
- Bloomberg Graphics, Gasoline Prices Around the World: https://www.bloomberg.com/graphics/gas-prices/
- ProPublica, Busted: https://www.propublica.org/series/busted
- The Markup, How We Assessed the Accuracy of Predictive Policing Software: https://themarkup.org/show-your-work/2023/10/02/how-we-assessed-the-accuracy-of-predictive-policing-software
- Rest of World, The hidden Kenyan workers training China's AI models: https://restofworld.org/2025/kenya-china-ai-workers/

These links identify concrete source artifacts for verification and design study. Recheck availability and page contents at publication time.


### Lead examples to verify at publication time
- Quora, Full Stack Software Engineer, New Grad: https://jobs.ashbyhq.com/quora/5494e6a1-a973-46af-b9f3-57208eb91b52 . The official listing says Remote - Multiple Locations, Canada and United States, and its minimum requirements distinguish graduation/fundamentals from preferred prior software and AI-project experience.
- Coinbase, Software Engineer - Crypto Data Foundations: https://www.coinbase.com/careers/positions/8304038?gh_jid=8304038 . Glassbox stores this as Remote - USA; the live careers index currently lists the role as Remote - USA. The direct job page did not render in the browser check, so re-open the role before publication.
- HP IQ, Product Design Engineer: https://job-boards.greenhouse.io/hpiq/jobs/6144518004 . The official description specifies mechanical parts, 3D CAD, prototyping, design validation and manufacturing.
- Astranis, Software Defined Radio Hardware Intern: https://job-boards.greenhouse.io/astranis/jobs/4716088006 . The official description identifies hardware design and electrical-engineering requirements; the word "software" in "software-defined radio" does not make this a software-engineering vacancy.
- Astera Labs, System Validation Engineer Intern: https://job-boards.greenhouse.io/asteraearlycareer2027/jobs/4724488005 . The official description spans hardware, firmware and applications, with test automation and scripts. This supports retaining it as ambiguous rather than treating it as an obvious false positive.
