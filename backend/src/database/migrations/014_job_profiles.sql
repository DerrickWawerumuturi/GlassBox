-- What each job asks for, read from its posting by src/matching/requirements.py:
-- role family, seniority, years, required and preferred skills, work
-- authorisation, language. Derived data, so it lives here and not on `jobs`,
-- which stays source data only (decisions/persistent-job-storage.md).
--
-- One row per job, recomputed only when the posting's text changes
-- (content_hash) or the rules do (profiler_version). Matching a user against
-- the pool reads these rows; nothing about a user is stored, so an edited CV
-- changes every match on the next request. About 300 bytes a job.

create table if not exists job_profiles (
    job_id           bigint primary key references jobs(id) on delete cascade,
    profiler_version text not null,
    content_hash     text not null,
    family           text not null,
    seniority        text not null,
    profile          jsonb not null,
    profiled_at      timestamptz not null default now()
);

-- Opportunities are prefiltered to the role families a CV points at.
create index if not exists job_profiles_family_idx on job_profiles (family);

comment on column job_profiles.content_hash is
    'md5(concat_ws(''|'', title, description, experience_level, employment_type)) of the
     job when profiled. A differing hash means the posting changed and is re-profiled.';


-- An imported application can say "Applied" with no date. Recording the
-- import time instead would invent an application date; unknown is honest.
-- A saved row still never has one.
alter table application drop constraint if exists applications_applied_at_check;
alter table application add constraint applications_applied_at_check
    check (status <> 'saved' or applied_at is null);

comment on column application.created_at is
    'When the application entered JobRadar ("added_at"), whether saved, typed,
     pasted or imported. Distinct from applied_at: when the user applied.';
comment on column application.applied_at is
    'When the user applied: the date they gave, or the first move out of saved.
     NULL for saved rows, and for imported rows whose sheet gave no date.';
