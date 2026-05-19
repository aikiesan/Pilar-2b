-- ============================================================================
-- PILAR-2b Platform - Remove Economic Simulation Tables
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Copy-paste this ENTIRE file
-- 4. Click "Run"
-- ============================================================================
--
-- This script removes all economic modeling tables and data from the database
-- including IBGE I-O Leontief 2015 data and 4-sector aggregate economic data.
--
-- CAUTION: This operation is irreversible. Make sure you have backups if needed.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Drop views first (they depend on tables)
-- ============================================================================

DROP VIEW IF EXISTS vw_recent_brazil_simulations CASCADE;
DROP VIEW IF EXISTS vw_brazil_states_summary CASCADE;
DROP VIEW IF EXISTS vw_brazil_regions_summary CASCADE;
DROP VIEW IF EXISTS v_state_economic_summary CASCADE;
DROP VIEW IF EXISTS v_top_regions_by_vab CASCADE;
DROP VIEW IF EXISTS v_economic_multipliers CASCADE;

-- ============================================================================
-- Drop functions (they may depend on tables)
-- ============================================================================

DROP FUNCTION IF EXISTS get_top_brazil_regions(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_distance_between_regions(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_brazil_regions_by_state(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_region_distance(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_region_by_coordinates(DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS clean_expired_simulation_cache() CASCADE;

-- ============================================================================
-- Drop Brazil-wide economic simulation tables (Migration 008, 009)
-- ============================================================================

DROP TABLE IF EXISTS br_simulation_history CASCADE;
DROP TABLE IF EXISTS br_employment_coefficients CASCADE;
DROP TABLE IF EXISTS br_region_distances CASCADE;
DROP TABLE IF EXISTS br_intermediate_regions CASCADE;

-- ============================================================================
-- Drop São Paulo immediate regions tables (Migration 004, 006, 007)
-- ============================================================================

DROP TABLE IF EXISTS simulation_cache CASCADE;
DROP TABLE IF EXISTS conversion_factors CASCADE;
DROP TABLE IF EXISTS leontief_matrix CASCADE;
DROP TABLE IF EXISTS immediate_regions CASCADE;

-- ============================================================================
-- Success message
-- ============================================================================

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '✅ All economic simulation tables removed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed tables:';
    RAISE NOTICE '  ✓ br_simulation_history';
    RAISE NOTICE '  ✓ br_employment_coefficients';
    RAISE NOTICE '  ✓ br_region_distances';
    RAISE NOTICE '  ✓ br_intermediate_regions';
    RAISE NOTICE '  ✓ simulation_cache';
    RAISE NOTICE '  ✓ conversion_factors';
    RAISE NOTICE '  ✓ leontief_matrix';
    RAISE NOTICE '  ✓ immediate_regions';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed views:';
    RAISE NOTICE '  ✓ vw_recent_brazil_simulations';
    RAISE NOTICE '  ✓ vw_brazil_states_summary';
    RAISE NOTICE '  ✓ vw_brazil_regions_summary';
    RAISE NOTICE '  ✓ v_state_economic_summary';
    RAISE NOTICE '  ✓ v_top_regions_by_vab';
    RAISE NOTICE '  ✓ v_economic_multipliers';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed functions:';
    RAISE NOTICE '  ✓ get_top_brazil_regions()';
    RAISE NOTICE '  ✓ get_distance_between_regions()';
    RAISE NOTICE '  ✓ get_brazil_regions_by_state()';
    RAISE NOTICE '  ✓ calculate_region_distance()';
    RAISE NOTICE '  ✓ get_region_by_coordinates()';
    RAISE NOTICE '  ✓ clean_expired_simulation_cache()';
    RAISE NOTICE '';
    RAISE NOTICE 'PILAR-2b is now free of economic modeling components!';
END $$;
