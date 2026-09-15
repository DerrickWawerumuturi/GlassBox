-- Where a user wants to work, as ranking input. Null means "derive it": from
-- the CV's location, else the deployment default (JOBRADAR_DEFAULT_COUNTRY).
-- Shape: {"country_code": "ke", "city": "Nairobi", "order": [tier, ...]}
-- Tiers and their meaning: backend/src/Agent/utils/location.py (TIERS).

alter table users add column if not exists location_preferences jsonb;
