-- Job lifecycle signals, so a future cleanup can tell a stale posting nobody
-- touched from one a user showed interest in. Nothing here deletes anything.
-- Policy: docs/decisions/job-retention.md
--
-- Already enforced before this migration: application.job_id references jobs
-- ON DELETE RESTRICT, so a job with any application cannot be deleted at all.

alter table jobs add column if not exists last_shown_at       timestamptz;
alter table jobs add column if not exists last_interaction_at timestamptz;
alter table jobs add column if not exists archived_at         timestamptz;

comment on column jobs.last_shown_at is
    'Last time the job appeared in a stored analysis for some user. A weak signal:
     seen in a result list, not necessarily looked at.';
comment on column jobs.last_interaction_at is
    'Last time any user saved, applied to or moved an application for this job.';
comment on column jobs.archived_at is
    'Soft archive. Set by a future cleanup instead of deleting; archived jobs
     are excluded from the pool and from URL lookups.';

-- application(user_id, job_id) cannot serve a lookup by job_id alone, which is
-- what the delete-restrict check and the retention view both need.
create index if not exists application_job_idx on application (job_id) where job_id is not null;


create or replace function jobs_touch_interaction() returns trigger
language plpgsql as $$
begin
    if new.job_id is not null then
        update jobs set last_interaction_at = now() where id = new.job_id;
    end if;
    return new;
end $$;

drop trigger if exists application_touches_job on application;
create trigger application_touches_job
    after insert or update of status, job_id on application
    for each row execute function jobs_touch_interaction();


create or replace function jobs_touch_shown() returns trigger
language plpgsql as $$
begin
    update jobs set last_shown_at = now()
    where id in (
        select (r->'job'->'job'->>'db_id')::bigint
        from jsonb_array_elements(coalesce(new.data->'ranked_jobs', '[]'::jsonb)) r
        where (r->'job'->'job'->>'db_id') ~ '^[0-9]+$'
    );
    return new;
end $$;

drop trigger if exists analysis_touches_jobs on analyses;
create trigger analysis_touches_jobs
    after insert or update of data on analyses
    for each row execute function jobs_touch_shown();


-- Backfill from what already exists.
update jobs j set last_interaction_at = a.latest
from (select job_id, max(last_status_at) latest from application where job_id is not null group by job_id) a
where a.job_id = j.id and j.last_interaction_at is null;

update jobs j set last_shown_at = s.shown
from (
    select (r->'job'->'job'->>'db_id')::bigint job_id, max(an.updated_at) shown
    from analyses an, jsonb_array_elements(coalesce(an.data->'ranked_jobs', '[]'::jsonb)) r
    where (r->'job'->'job'->>'db_id') ~ '^[0-9]+$'
    group by 1
) s
where s.job_id = j.id and j.last_shown_at is null;


-- What a cleanup would do with each job, if one ran. Windows are the proposal
-- in the decision record, not an enforced policy.
create or replace view job_retention as
select j.id,
       j.provider,
       j.first_seen_at,
       j.last_seen_at,
       j.last_shown_at,
       j.last_interaction_at,
       j.archived_at,
       exists (select 1 from application a where a.job_id = j.id) as has_application,
       case
           when exists (select 1 from application a where a.job_id = j.id) then 'protected'
           when j.last_interaction_at > now() - interval '365 days'          then 'interacted'
           when j.last_shown_at       > now() - interval '180 days'          then 'shown'
           when j.last_seen_at        > now() - interval '30 days'           then 'active'
           else 'stale'
       end as retention_class
from jobs j;
