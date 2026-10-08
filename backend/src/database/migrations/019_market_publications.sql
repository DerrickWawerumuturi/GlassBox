-- The public market, published once a week (decisions/market-publication.md).
-- /market/look and /market/page/* serve only the latest published row, so the
-- site shows a count that passed its checks, never one computed on request.
--
-- A week can have several rows: rejected candidates (gates only, no payload),
-- then the one that passed. market_snapshots stays the daily internal history.

create table if not exists market_publications (
    id               bigint generated always as identity primary key,
    week             date not null,
    as_of            timestamptz not null,
    published_at     timestamptz,
    status           text not null,
    profiler_version text not null,
    jobs             int not null,
    gates            jsonb not null,
    look             jsonb,
    pages            jsonb,
    created_at       timestamptz not null default now(),

    constraint market_publications_status_check check (status in ('published', 'rejected')),
    constraint market_publications_payload_check
        check (status <> 'published' or (look is not null and pages is not null and published_at is not null))
);

create index if not exists market_publications_published_idx
    on market_publications (published_at desc) where status = 'published';
create index if not exists market_publications_week_idx on market_publications (week, status);

comment on column market_publications.week is
    'The Monday of the ISO week this publication is for.';
comment on column market_publications.as_of is
    'When the jobs counted were collected: the end of the latest successful
     collection run. The date the pages show.';
comment on column market_publications.jobs is
    'Every counted job, all job types: the number the size gates compare.';
comment on column market_publications.gates is
    'Each check, whether it passed, and its numbers. A rejected row says why.';
comment on column market_publications.look is
    'The /market/look body. NULL on a rejected row.';
comment on column market_publications.pages is
    'Every /market/page/{name} body, by name. NULL on a rejected row.';
