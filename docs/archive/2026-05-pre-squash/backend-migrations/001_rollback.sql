-- ============================================================================
-- PILAR-2b V3 - Rollback Performance Optimization Migration
-- Rollback for: 001_add_performance_indexes.sql
-- ============================================================================

BEGIN;

RAISE NOTICE 'Rolling back performance optimization migration...';

-- Drop indexes
DROP INDEX IF EXISTS idx_municipalities_biogas CASCADE;
DROP INDEX IF EXISTS idx_municipalities_region CASCADE;
DROP INDEX IF EXISTS idx_municipalities_population CASCADE;
DROP INDEX IF EXISTS idx_municipalities_area CASCADE;
DROP INDEX IF EXISTS idx_municipalities_region_biogas CASCADE;
DROP INDEX IF EXISTS idx_municipalities_biogas_sectors CASCADE;
DROP INDEX IF EXISTS idx_municipalities_geometry CASCADE;
DROP INDEX IF EXISTS idx_municipalities_centroid CASCADE;
DROP INDEX IF EXISTS idx_biogas_plants_municipality CASCADE;
DROP INDEX IF EXISTS idx_biogas_plants_sector CASCADE;
DROP INDEX IF EXISTS idx_biogas_plants_status CASCADE;
DROP INDEX IF EXISTS idx_biogas_plants_location CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_index_usage CASCADE;
DROP VIEW IF EXISTS v_query_performance CASCADE;

RAISE NOTICE 'Rollback completed successfully';
RAISE NOTICE 'Note: Table statistics (ANALYZE) cannot be rolled back';

COMMIT;
