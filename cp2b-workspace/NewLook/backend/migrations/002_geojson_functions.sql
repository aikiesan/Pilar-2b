-- PILAR-2b V3 - GeoJSON Functions for Supabase
-- Run this in Supabase SQL Editor to enable direct GeoJSON fetching

-- ============================================================================
-- FUNCTION: Get municipalities as GeoJSON FeatureCollection
-- Returns complete GeoJSON structure for map display
-- ============================================================================

CREATE OR REPLACE FUNCTION get_municipalities_geojson()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'type', 'FeatureCollection',
    'features', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            COALESCE(geometry, centroid)
          )::jsonb,
          'properties', jsonb_build_object(
            'id', id,
            'name', municipality_name,
            'ibge_code', COALESCE(ibge_code, ''),
            'area_km2', COALESCE(area_km2, 0),
            'population', COALESCE(population, 0),
            'population_density', CASE
              WHEN area_km2 > 0 THEN COALESCE(population, 0) / area_km2
              ELSE 0
            END,
            'immediate_region', COALESCE(immediate_region, ''),
            'intermediate_region', COALESCE(intermediate_region, ''),
            'immediate_region_code', '',
            'intermediate_region_code', '',
            'total_biogas_m3_year', COALESCE(total_biogas_m3_year, 0),
            'agricultural_biogas_m3_year', COALESCE(agricultural_biogas_m3_year, 0),
            'livestock_biogas_m3_year', COALESCE(livestock_biogas_m3_year, 0),
            'urban_biogas_m3_year', COALESCE(urban_biogas_m3_year, 0),
            'sugarcane_biogas_m3_year', COALESCE(sugarcane_biogas_m3_year, 0),
            'soybean_biogas_m3_year', COALESCE(soybean_biogas_m3_year, 0),
            'corn_biogas_m3_year', COALESCE(corn_biogas_m3_year, 0),
            'coffee_biogas_m3_year', COALESCE(coffee_biogas_m3_year, 0),
            'citrus_biogas_m3_year', COALESCE(citrus_biogas_m3_year, 0),
            'cattle_biogas_m3_year', COALESCE(cattle_biogas_m3_year, 0),
            'swine_biogas_m3_year', COALESCE(swine_biogas_m3_year, 0),
            'poultry_biogas_m3_year', COALESCE(poultry_biogas_m3_year, 0),
            'aquaculture_biogas_m3_year', COALESCE(aquaculture_biogas_m3_year, 0),
            'forestry_biogas_m3_year', 0,
            'rsu_biogas_m3_year', COALESCE(rsu_biogas_m3_year, 0),
            'rpo_biogas_m3_year', COALESCE(rpo_biogas_m3_year, 0),
            'sugarcane_residues_tons_year', 0,
            'soybean_residues_tons_year', 0,
            'corn_residues_tons_year', 0,
            'potential_category', CASE
              WHEN COALESCE(total_biogas_m3_year, 0) > 100000000 THEN 'ALTO'
              WHEN COALESCE(total_biogas_m3_year, 0) > 10000000 THEN 'MEDIO'
              WHEN COALESCE(total_biogas_m3_year, 0) > 0 THEN 'BAIXO'
              ELSE 'SEM DADOS'
            END
          )
        )
      )
      FROM municipalities
      WHERE geometry IS NOT NULL OR centroid IS NOT NULL
    ),
    'metadata', jsonb_build_object(
      'total_municipalities', (SELECT COUNT(*) FROM municipalities WHERE geometry IS NOT NULL OR centroid IS NOT NULL),
      'region', 'São Paulo',
      'source', 'supabase'
    )
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Get municipalities with geometry for individual features
-- ============================================================================

CREATE OR REPLACE FUNCTION get_municipalities_with_geometry()
RETURNS TABLE (
  id integer,
  geometry jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    ST_AsGeoJSON(COALESCE(m.geometry, m.centroid))::jsonb as geometry
  FROM municipalities m
  WHERE m.geometry IS NOT NULL OR m.centroid IS NOT NULL;
END;
$$;

-- ============================================================================
-- FUNCTION: Get single municipality as GeoJSON Feature
-- ============================================================================

CREATE OR REPLACE FUNCTION get_municipality_geojson(municipality_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(
        COALESCE(geometry, centroid)
      )::jsonb,
      'properties', jsonb_build_object(
        'id', id,
        'name', municipality_name,
        'ibge_code', COALESCE(ibge_code, ''),
        'area_km2', COALESCE(area_km2, 0),
        'population', COALESCE(population, 0),
        'total_biogas_m3_year', COALESCE(total_biogas_m3_year, 0),
        'agricultural_biogas_m3_year', COALESCE(agricultural_biogas_m3_year, 0),
        'livestock_biogas_m3_year', COALESCE(livestock_biogas_m3_year, 0),
        'urban_biogas_m3_year', COALESCE(urban_biogas_m3_year, 0)
      )
    )
    FROM municipalities
    WHERE id = municipality_id
  );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_municipalities_geojson() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_municipalities_with_geometry() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_municipality_geojson(integer) TO authenticated, anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_municipalities_geojson() IS 'Returns all municipalities as a GeoJSON FeatureCollection for map display';
COMMENT ON FUNCTION get_municipalities_with_geometry() IS 'Returns municipality IDs with their geometries as GeoJSON';
COMMENT ON FUNCTION get_municipality_geojson(integer) IS 'Returns a single municipality as a GeoJSON Feature';
