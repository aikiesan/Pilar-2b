-- 037_timeseries_preliminary_quality.sql
--
-- Adds 'preliminary' to the quality vocabulary of municipality_timeseries.
--
-- IBGE publishes the newest year of every PAM and PPM table as preliminary
-- ("Os dados do último ano divulgado são RESULTADOS PRELIMINARES e podem sofrer
-- alterações até a próxima divulgação") and revises it at the next release.
-- The Biomass Brasil Pipeline (bbp) flags that year, and promote_pam.py /
-- promote_ibge_ppm.py --source bbp write its rows with quality 'preliminary'.
--
-- The map's "latest year" readers skip those rows (municipalities.py,
-- _load_activity_counts), so a preliminary year is visible in the series and
-- the dossier but does not move the headline numbers. When the year is
-- re-exported as final and promoted again, the same rows turn 'measured' (the
-- upsert key is unchanged) and the headline moves to it on its own.
--
-- Safe to re-run: the constraint is dropped and recreated.
--
-- Apply:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--        -f app/migrations/037_timeseries_preliminary_quality.sql
-- Check:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'municipality_timeseries_quality_check';
--   SELECT source_id, year, quality, count(*) FROM municipality_timeseries
--   WHERE quality = 'preliminary' GROUP BY 1, 2, 3;

ALTER TABLE municipality_timeseries
    DROP CONSTRAINT IF EXISTS municipality_timeseries_quality_check;

ALTER TABLE municipality_timeseries
    ADD CONSTRAINT municipality_timeseries_quality_check
    CHECK (quality IN ('measured', 'interpolated', 'proxy', 'estimated', 'preliminary'));

COMMENT ON COLUMN municipality_timeseries.quality IS
    'Per-row lineage: measured | interpolated | proxy | estimated | preliminary '
    '(preliminary = IBGE''s newest, not yet final year; skipped by latest-year readers).';
