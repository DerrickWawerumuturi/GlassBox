# Glassbox weekly job counts

How many tech jobs were open each week, and how many of them named each skill.
Counted every Monday by [Glassbox](https://seeglassbox.com) from public job
boards. The numbers are exactly the ones the site showed that week.

Method: <https://seeglassbox.com/method>

## Files

One folder per week (`2026-10-12/`, named by the week's Monday, UTC), and the
same three files for all weeks together in this folder.

| File | One row per | Columns |
|---|---|---|
| `job_types.csv` | week and job type | `week`, `job_type`, `jobs_counted`, `jobs_readable`, `employers` |
| `skills.csv` | week, job type and skill | `week`, `job_type`, `skill`, `jobs_naming`, `jobs_requiring`, `jobs_readable`, `share_naming`, `employers` |
| `experience.csv` | week, group and years | `week`, `group`, `years_bucket`, `jobs` |

`datapackage.json` describes every column (a [Frictionless](https://frictionlessdata.io/) data package).

### What each number counts

- **job_type** is a market page on the site: `ai`, `machine-learning`, `devops`,
  `software-engineering` and `entry-level-software` (seeglassbox.com/market/ plus the name).
  Entry level software spans five job types (software engineering, backend,
  frontend, full stack, mobile), so its jobs are also in other rows.
- **jobs_counted**: open jobs of that type that week. The same title at the same
  employer counts once, however many boards or cities list it.
- **jobs_readable**: of those, jobs whose ad is long enough (800 characters or
  more) to read skills from. Skill shares are over this number.
- **employers**: distinct employers among the jobs counted (on `skills.csv`: among
  the jobs naming that skill).
- **jobs_naming**: readable jobs that name the skill anywhere in the ad.
  **jobs_requiring**: readable jobs that list it as required.
  **share_naming** = jobs_naming / jobs_readable, to 4 decimals.
- **experience.csv** counts software jobs by the years of experience they
  require: `early career titles` (titles saying intern, graduate, new grad,
  entry level, early career or junior) and `all software`. Buckets 0, 1, 2, 3,
  4, 5+ and `unstated` (no required number in the ad). Weeks from 12 October
  2026 on; earlier weeks have no rows.

Skills are read by fixed rules from a list of about 250 skills, not by a
language model. A skill named in words that aren't on the list isn't counted.

## What is left out

- **Skills named at fewer than 10 employers.** One company's hiring can make a
  pattern; the site doesn't show those skills and neither does this file. Each
  week holds at most the 40 skills each job type's jobs name most.
- **Skill rows for a job type with fewer than 100 readable jobs.** Its job
  counts are still in `job_types.csv`.
- **Anything about a single job:** no company names, titles, links or ad text.

## Which way the count leans

Read this before comparing these numbers with the whole job market.

- About 255 employer boards (Greenhouse, Ashby, Lever, Workable) were chosen by
  hand. They lean toward US employers, AI companies and fast growing tech firms,
  and many of their jobs are senior.
- Big employers that post only on their own career sites or on Workday aren't counted.
- Job sites and feeds list only their newest jobs, so their share moves with how
  often they post.
- A change in which boards are read moves the totals. A week whose total jumps
  more than 60% or falls more than 25% is held back until checked.

## Sources

Jobs are read every six hours from public job board APIs and feeds; the count
is published once a week.

- Employer boards on **Greenhouse**, **Ashby**, **Lever** and **Workable** (their public job board APIs).
- Job sites: [Remote OK](https://remoteok.com), [Remotive](https://remotive.com),
  [Arbeitnow](https://www.arbeitnow.com), [Jobicy](https://jobicy.com),
  [Himalayas](https://himalayas.app) and [We Work Remotely](https://weworkremotely.com).
  Several of them ask to be named and linked as a source; they are, here.
- Kenyan job feeds: [MyJobMag](https://www.myjobmag.co.ke),
  [Corporate Staffing](https://www.corporatestaffing.co.ke),
  [Career Point Kenya](https://www.careerpointkenya.co.ke),
  [Jobweb Kenya](https://jobwebkenya.com),
  [Summit Recruitment](https://www.summitrecruitment-search.com) and
  [Jobs in Kenya](https://www.jobsinkenya.co.ke).

This dataset holds counts only. It reproduces no job ad, title, link or
company name from any source. The jobs belong to the employers and boards that
posted them.

## Licence

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Use it for anything,
including commercially; credit it as:

> Glassbox weekly job counts, seeglassbox.com

## How to cite

```
Glassbox (2026). Glassbox weekly job counts [Data set]. https://seeglassbox.com/method
```

```bibtex
@misc{glassbox_job_counts,
  author = {{Glassbox}},
  title  = {Glassbox weekly job counts},
  year   = {2026},
  url    = {https://seeglassbox.com/method},
  note   = {Weekly CSV files, CC BY 4.0}
}
```

## Changes to the files

- **Schema 1** (13 October 2026): `job_types.csv`, `skills.csv`, `experience.csv`
  for the weeks of 5 and 12 October 2026 onward.
