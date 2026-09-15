-- Applications created from a pasted job URL, and a job pool that analyses read.
--
-- A reviewed application keeps the user's corrections on the application row.
-- `jobs` stays source data only: one user's edit must never rewrite a posting
-- every other user sees.

alter table application add column if not exists workplace       text;
alter table application add column if not exists employment_type text;
alter table application add column if not exists salary          text;

alter table application drop constraint if exists application_workplace_check;
alter table application add constraint application_workplace_check
    check (workplace is null or workplace in ('remote', 'hybrid', 'onsite'));

comment on column application.salary is
    'As the user reviewed it, e.g. "$120k-$150k / year". Free text on purpose:
     the structured provider figures stay on jobs.salary_min/max.';

-- The daily pool is matched to an analysis by title. Without this, every
-- analysis scans and re-tokenises the whole pool.
create index if not exists jobs_title_fts_idx
    on jobs using gin (to_tsvector('english', coalesce(title, '')));
