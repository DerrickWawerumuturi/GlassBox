-- Keep less of a CV (decisions/cv-storage.md, 2026-10-05): no name, contact
-- details, links, summary, or the companies, dates and schools behind it.
-- Run `python -m src.database.backfill_kept_cv` FIRST: it works out the years
-- and families matching needs before the details go. This migration is the
-- safety net that strips whatever personal keys are still there. No table is
-- dropped and no row deleted.

update cvs
set data = data - 'name' - 'email' - 'phone_number' - 'portfolio' - 'linkedIn'
                - 'professional_summary' - 'experience' - 'education' - 'title'
where data ?| array['name', 'email', 'phone_number', 'portfolio', 'linkedIn',
                    'professional_summary', 'experience', 'education', 'title'];

update latest_cvs
set profile = profile - 'experience' - 'education' - 'notes' - 'job_requirements' - 'company_preferences'
where profile ?| array['experience', 'education', 'notes', 'job_requirements', 'company_preferences'];

update application
set cv_snapshot = cv_snapshot - 'name' - 'email' - 'phone_number' - 'portfolio' - 'linkedIn'
                              - 'professional_summary' - 'experience' - 'education' - 'title'
where cv_snapshot ?| array['name', 'email', 'phone_number', 'portfolio', 'linkedIn',
                           'professional_summary', 'experience', 'education', 'title'];
