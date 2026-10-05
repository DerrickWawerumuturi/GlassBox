-- What the live job pool asked for on a given day, per role family: written
-- once a day by src/jobpool/snapshot.py after the pool is profiled.
--
-- Summaries, not sightings (decisions/market-snapshots.md). One row per job per
-- day (job_observations, observe=True) would add ~16k rows a day to answer
-- questions that only ever need counts. Profiles are overwritten when a posting
-- changes and jobs will eventually be deleted (decisions/job-retention.md), so
-- without this table "what was asked for last month" cannot be rebuilt.
--
-- Counts from different profiler versions are not comparable: the version is
-- part of the key, and a rules change starts a new series.

create table if not exists market_snapshots (
    taken_on         date not null,
    profiler_version text not null,
    family           text not null,
    postings         int  not null,
    readable         int  not null,
    seniority        jsonb not null,
    skills           jsonb not null,
    taken_at         timestamptz not null default now(),

    primary key (taken_on, profiler_version, family)
);

comment on column market_snapshots.postings is
    'Live roles in the family that day. A role cross-posted on several boards or
     cities counts once (opportunities.duplicate_key).';
comment on column market_snapshots.readable is
    'Of those, postings with enough text to read requirements from (profile not
     thin). The honest denominator for skill shares.';
comment on column market_snapshots.seniority is
    'Roles per seniority level, e.g. {"junior": 12, "senior": 40}.';
comment on column market_snapshots.skills is
    'Readable roles naming each skill as [required, preferred, mentioned], e.g.
     {"python": [31, 6, 2]}. A role counts once per skill, in its strongest kind.';
