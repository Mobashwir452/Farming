-- 1. Add Latitude and Longitude mapping coordinates to track land positioning.
ALTER TABLE farms ADD COLUMN lat REAL;
ALTER TABLE farms ADD COLUMN lng REAL;
