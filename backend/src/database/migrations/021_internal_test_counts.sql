-- Separate explicitly credentialed internal scan tests from public usage.
-- No user identifiers, IP addresses, or test credentials are stored.
alter table daily_counts
    add column if not exists test_scans_started int not null default 0,
    add column if not exists test_scans_finished int not null default 0,
    add column if not exists test_scans_failed int not null default 0,
    add column if not exists test_cv_reused int not null default 0;
