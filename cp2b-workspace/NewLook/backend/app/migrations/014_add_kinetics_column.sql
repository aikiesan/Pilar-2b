-- Migration 014: Add kinetics JSONB column to residuos table.
-- The /api/v1/scientific/kinetics endpoint queries r.kinetics but the column
-- was never included in the original 003_residuos_schema migration.
-- Column is nullable; rows without kinetics data are simply excluded by the
-- WHERE r.kinetics IS NOT NULL filter in the endpoint.

ALTER TABLE residuos
    ADD COLUMN IF NOT EXISTS kinetics JSONB;
