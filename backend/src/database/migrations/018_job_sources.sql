-- Which source each job came from, how each fetch of each source went, and
-- when a job closed. Additive: the old revision keeps working beside it.
-- Policy: docs/decisions/job-sources.md ("Closing jobs") and job-retention.md.
--
-- Before this, a job was live while it had been seen in the last 3 days, so a
-- failed fetch and a closed job looked the same. Now a job from a complete
-- board closes only on evidence: two successful, full fetches of its own
-- source that don't list it (src/jobpool/sources.py, closes_by_absence).

alter table jobs add column if not exists source         text;
alter table jobs add column if not exists closed_at      timestamptz;
alter table jobs add column if not exists missed_fetches smallint not null default 0;

comment on column jobs.source is
    'The collector source that last listed the job: "greenhouse:stripe",
     "arbeitnow", "ke:myjobmag". NULL for jobs only users brought in, and for
     old rows the backfill could not place (src/database/backfill_job_source.py).';
comment on column jobs.closed_at is
    'When the job was taken as closed: missing from 2 full fetches of its
     source in a row, or its source retired. Cleared if it is listed again.';
comment on column jobs.missed_fetches is
    'Full fetches of its source in a row that did not list it. Reset to 0
     whenever the source lists it.';

-- The closing step reads one source's open jobs per fetch.
create index if not exists jobs_open_source_idx on jobs (source) where closed_at is null;


-- One row per source per collection run. Small: about 280 sources, 4 runs a day.
create table if not exists source_runs (
    id          bigint generated always as identity primary key,
    run_at      timestamptz not null,
    source      text not null,
    finished_at timestamptz not null default now(),
    ok          boolean not null,
    jobs        int not null default 0,
    whole       boolean not null default false,
    closed      int not null default 0,
    retired     boolean not null default false,
    error       text
);

create index if not exists source_runs_source_idx on source_runs (source, run_at desc);
create index if not exists source_runs_run_idx    on source_runs (run_at desc);

comment on column source_runs.run_at is
    'When the collection run started; every source of one run shares it.';
comment on column source_runs.ok is
    'The fetch answered and its jobs were saved. A failed fetch changes no job.';
comment on column source_runs.jobs is
    'Jobs the source listed, before the 90 day age cut.';
comment on column source_runs.whole is
    'A complete read that may close jobs: a complete board, read to the end,
     with at least half its usual count. Window feeds are never full.';
comment on column source_runs.closed is
    'Jobs this fetch closed (missing from 2 full fetches in a row).';
comment on column source_runs.retired is
    'The source has failed every fetch for 7 days: its jobs are closed and it
     should come out of companies.txt.';
