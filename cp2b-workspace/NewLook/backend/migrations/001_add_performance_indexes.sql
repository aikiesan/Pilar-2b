-- ============================================================================
-- PILAR-2b V3 - Performance Optimization Migration
-- Issue #10 & #11: Add indexes for common query patterns
-- ============================================================================
-- Author: CP2B Development Team
-- Date: 2025-11-17
-- Version: 3.0.1

BEGIN;

-- Log migration start
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Starting performance optimization migration...';
  RAISE NOTICE 'Time: %', now();
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- 1. INDEXES FOR FILTERING AND SORTING
-- ============================================================================

-- Index for biogas filtering and sorting (DESC for top municipalities)
CREATE INDEX IF NOT EXISTS idx_municipalities_biogas
  ON municipalities(total_biogas_m3_year DESC)
  WHERE total_biogas_m3_year > 0;

-- Index for administrative region filtering
CREATE INDEX IF NOT EXISTS idx_municipalities_region
  ON municipalities(administrative_region);

-- Index for population sorting
CREATE INDEX IF NOT EXISTS idx_municipalities_population
  ON municipalities(population DESC);

-- Index for area sorting
CREATE INDEX IF NOT EXISTS idx_municipalities_area
  ON municipalities(area_km2);

DO $$
BEGIN
  RAISE NOTICE '✓ Created single-column indexes for filtering/sorting';
END $$;

-- ============================================================================
-- 2. COMPOSITE INDEXES FOR COMMON QUERY COMBINATIONS
-- ============================================================================

-- Composite index for region + biogas queries (most common filter combination)
CREATE INDEX IF NOT EXISTS idx_municipalities_region_biogas
  ON municipalities(administrative_region, total_biogas_m3_year DESC)
  WHERE total_biogas_m3_year > 0;

-- Composite index for biogas sectors (for sector analysis)
CREATE INDEX IF NOT EXISTS idx_municipalities_biogas_sectors
  ON municipalities(urban_biogas_m3_year, agricultural_biogas_m3_year, livestock_biogas_m3_year);

DO $$
BEGIN
  RAISE NOTICE '✓ Created composite indexes for query optimization';
END $$;

-- ============================================================================
-- 3. SPATIAL INDEXES (PostGIS)
-- ============================================================================

-- Spatial index on geometry column (if not already created by PostGIS)
CREATE INDEX IF NOT EXISTS idx_municipalities_geometry
  ON municipalities USING GIST(geometry);

-- Spatial index on centroid column for faster point queries
CREATE INDEX IF NOT EXISTS idx_municipalities_centroid
  ON municipalities USING GIST(centroid);

DO $$
BEGIN
  RAISE NOTICE '✓ Created spatial indexes (GIST) for geometry operations';
END $$;

-- ============================================================================
-- 4. BIOGAS PLANTS TABLE INDEXES (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'biogas_plants'
  ) THEN
    -- Index for municipality foreign key
    CREATE INDEX IF NOT EXISTS idx_biogas_plants_municipality
      ON biogas_plants(municipality_id);

    -- Index for sector filtering
    CREATE INDEX IF NOT EXISTS idx_biogas_plants_sector
      ON biogas_plants(sector);

    -- Index for status filtering
    CREATE INDEX IF NOT EXISTS idx_biogas_plants_status
      ON biogas_plants(status);

    -- Spatial index for location
    CREATE INDEX IF NOT EXISTS idx_biogas_plants_location
      ON biogas_plants USING GIST(location);

    RAISE NOTICE '✓ Created indexes on biogas_plants table';
  ELSE
    RAISE NOTICE '⚠ biogas_plants table not found, skipping related indexes';
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATE TABLE STATISTICS FOR QUERY PLANNER
-- ============================================================================

ANALYZE municipalities;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'biogas_plants'
  ) THEN
    ANALYZE biogas_plants;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✓ Updated table statistics for query planner';
END $$;

-- ============================================================================
-- 6. CREATE INDEX MONITORING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

DO $$
BEGIN
  RAISE NOTICE '✓ Created v_index_usage monitoring view';
END $$;

-- ============================================================================
-- 7. CREATE PERFORMANCE ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_query_performance AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%municipalities%'
ORDER BY mean_exec_time DESC
LIMIT 20;

DO $$
BEGIN
  RAISE NOTICE '✓ Created v_query_performance monitoring view';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '⚠ pg_stat_statements not available, skipping v_query_performance view';
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Time: %', now();
  RAISE NOTICE '';
  RAISE NOTICE 'To verify indexes:';
  RAISE NOTICE '  SELECT * FROM v_index_usage;';
  RAISE NOTICE '';
  RAISE NOTICE 'To test query performance:';
  RAISE NOTICE '  EXPLAIN ANALYZE SELECT * FROM municipalities';
  RAISE NOTICE '    WHERE total_biogas_m3_year > 0';
  RAISE NOTICE '    ORDER BY total_biogas_m3_year DESC LIMIT 100;';
  RAISE NOTICE '============================================================';
END $$;

COMMIT;
