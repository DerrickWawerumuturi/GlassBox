-- Daily totals counted by the API itself (decisions/analytics.md, "Server side
-- counts"): the truth when ad blockers or Do Not Track hide PostHog's events.
-- One row per UTC day, counters only. Nothing here says who: no user ids, no
-- addresses, no file names, no CV content.

create table if not exists daily_counts (
    day              date primary key,
    scans_started    int not null default 0,
    scans_finished   int not null default 0,
    scans_failed     int not null default 0,
    cv_reused        int not null default 0,
    accounts_created int not null default 0
);

comment on column daily_counts.day is
    'The UTC day, from the database clock.';
comment on column daily_counts.scans_started is
    'POST /analyze and POST /analyze/reuse requests that reached the route.
     /cv/parse is the other half of an upload scan and is not counted.';
comment on column daily_counts.scans_finished is
    'Of those, the ones that returned a result.';
comment on column daily_counts.scans_failed is
    'Of those, the ones that raised: not a PDF, nothing to reuse, an error.
     started - finished - failed is scans cut off by a restart.';
comment on column daily_counts.cv_reused is
    'Scans started from the kept CV (POST /analyze/reuse). Also in scans_started.';
comment on column daily_counts.accounts_created is
    'Responses that said X-Account-Created: a first write that succeeded.';
