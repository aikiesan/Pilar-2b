-- C24: export the highway segments of the six green corridors from the platform's
-- own road layers (MapBiomas 10.1 INFRAESTRUTURA, table infrastructure_features).
-- Only the road codes the corridors use, inside a box around São Paulo state; the
-- corridor script then keeps the segments near each corridor's anchor line, which
-- drops e.g. the Régis Bittencourt half of BR-116.
--
-- Run from the repo root with the dev database up:
--   docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps -At \
--     < analysis/sql/export_corridor_highways.sql \
--     > analysis/data/sources/mapbiomas/rodovias_corredores_sp.geojson
SELECT json_build_object(
    'type', 'FeatureCollection',
    'source', 'MapBiomas 10.1 INFRAESTRUTURA (structure_state_highway, structure_federal_highway) via infrastructure_features',
    'features', coalesce(json_agg(json_build_object(
        'type', 'Feature',
        'properties', json_build_object(
            'layer_id', layer_id,
            'sigla', attributes->>'sigla',
            'concession', attributes->>'concession',
            'revestimen', attributes->>'revestimen',
            'situacaofi', attributes->>'situacaofi',
            'nrpistas', attributes->>'nrpistas'),
        'geometry', ST_AsGeoJSON(geometry, 5)::json) ORDER BY attributes->>'sigla', id), '[]'::json))
FROM infrastructure_features
WHERE layer_id IN ('highway_state', 'highway_federal')
  AND attributes->>'sigla' ~ '(^|[^0-9])(SP-330|SP-348|BR-116|SP-150|SP-160|SP-310|SP-270|SP-300)([^0-9]|$)'
  AND ST_Intersects(geometry, ST_MakeEnvelope(-53.2, -25.4, -44.1, -19.7, 4326));
