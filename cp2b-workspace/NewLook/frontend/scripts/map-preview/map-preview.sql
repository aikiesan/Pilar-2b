-- The landing page's map preview (public/images/map-preview-sp.svg) as SVG
-- path data, one "layer|path data" row per path. See build-map-preview.mjs.
--
-- Frame: São Paulo plus a margin of about 0.6°, so the neighbouring states and
-- the sea show around it. Lon/lat are scaled by cos(22.57°) (the state's
-- middle latitude) onto a 600-unit-wide frame; ST_AsSVG flips y.
--
-- Layers:
--   land   the neighbouring states, clipped to the frame (the basemap)
--   0..8   SP municipalities. Same view the map opens on: biomass
--          (total_biomass_tons_year) in eight equal-count classes over the
--          municipalities with a positive value; 0 is a measured zero
--   edge   the state of São Paulo's outline
--
-- Simplification at 0.02° is about 1.3 units, below what shows at thumbnail
-- size. Every geometry is clipped to the frame before it is unioned.
\pset format unaligned
\pset tuples_only on
\pset fieldsep '|'
WITH f AS (
  SELECT ST_MakeEnvelope(-53.7, -25.9, -43.6, -19.2, 4326) AS frame,
         cos(radians(22.57)) AS c,
         600.0 / ((53.7 - 43.6) * cos(radians(22.57))) AS k
), land AS (
  SELECT m.uf, ST_SimplifyPreserveTopology(ST_Union(ST_Intersection(m.geometry, f.frame)), 0.02) AS g
  FROM municipalities m, f
  WHERE m.uf <> 'SP' AND m.geometry && f.frame
  GROUP BY m.uf
), sp AS (
  SELECT total_biomass_tons_year AS v, ST_SimplifyPreserveTopology(geometry, 0.02) AS g
  FROM municipalities WHERE uf = 'SP'
), cls AS (
  SELECT g, CASE WHEN v > 0 THEN ntile(8) OVER (PARTITION BY v > 0 ORDER BY v) ELSE 0 END AS cl
  FROM sp
), layers AS (
  SELECT 0 AS ord, 'land' AS layer, g FROM land
  UNION ALL SELECT 1, cl::text, g FROM cls
  UNION ALL SELECT 2, 'edge', ST_SimplifyPreserveTopology(ST_Union(geometry), 0.02) FROM municipalities WHERE uf = 'SP'
)
SELECT layer, string_agg(ST_AsSVG(ST_Affine(l.g, f.c * f.k, 0, 0, f.k, 53.7 * f.c * f.k, 19.2 * f.k), 1, 1), ' ')
FROM layers l, f
WHERE NOT ST_IsEmpty(l.g)
GROUP BY ord, layer ORDER BY ord, layer;
