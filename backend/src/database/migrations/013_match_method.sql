-- Which scorer produced application.match_score, so scores from different
-- scorers are never compared as if they were one scale, and unscored rows can
-- be found and scored later.
--   'jobradar-similarity-v1'  JobRadarAgent.score_jobs (embeddings + location tiers)
--   null                      not scored yet (e.g. created from a pasted link)

alter table application add column if not exists match_method text;

update application set match_method = 'jobradar-similarity-v1'
where match_score is not null and match_method is null;

create index if not exists application_unscored_idx
    on application (job_id) where match_score is null and job_id is not null;
