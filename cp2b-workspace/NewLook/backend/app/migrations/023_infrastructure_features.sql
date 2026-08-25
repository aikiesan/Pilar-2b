-- =============================================================================
-- Migration 023: national infrastructure features (MapBiomas 10.1 / INFRAESTRUTURA)
-- =============================================================================
-- Roadmap: BRAZIL_EXPANSION_ROADMAP.md §6 (December — infrastructure & grid
-- layers, brought forward because the data is already in hand and cheap).
-- Prerequisite: the national municipality spine (021 + seed script), because
-- point features resolve their ibge_code by spatial join against it.
--
-- WHY ONE TABLE INSTEAD OF ONE PER LAYER
--   These layers are small (543 biogas plants, 780 substations, 1,712
--   transmission lines — ~4,400 features total, vs 5,571 municipality polygons)
--   but their attribute schemas are all different: usina_biogas carries
--   Categoria/Situacao/Escala_pro, frigorificos carries cnpj/sif/classe_1..4,
--   SE_EXISTENTE carries Tensao/Concessionaria. A table per layer would mean a
--   migration per layer forever. One table + a layer_id discriminator + JSONB
--   attributes keeps the map's "toggle a layer" query trivial and lets new
--   layers land as data, not DDL.
--
-- GEOMETRY(Geometry, 4326) — deliberately untyped: these layers mix Point
-- (plants, substations) and LineString (transmission lines, pipelines).
-- Source CRS is EPSG:4674 (SIRGAS 2000), same as the municipal mesh; the loader
-- reprojects to 4326.
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/023_infrastructure_features.sql
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS infrastructure_features (
    id             SERIAL PRIMARY KEY,
    -- Stable slug used by the API/map to toggle a layer ('biogas_plant', ...).
    layer_id       VARCHAR(60)  NOT NULL,
    name           VARCHAR(250),
    geometry       GEOMETRY(Geometry, 4326) NOT NULL,
    -- Resolved municipality. Present for point features (either from the
    -- source's own CD_MUN/cd_geocmu, or by ST_Contains against municipalities
    -- when the source only ships names — usina_biogas has Estado+Municipio and
    -- NO code, and name-matching municipalities is the trap this project keeps
    -- hitting). NULL for lines, which legitimately cross municipalities.
    ibge_code      VARCHAR(7),
    uf             CHAR(2),
    -- Source-specific fields, verbatim. Heterogeneous by design.
    attributes     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    source_id      VARCHAR(60)  NOT NULL,   -- MapBiomas folder, e.g. structure_biogas_plant
    source_file    TEXT,                    -- e.g. usina_biogas.shp
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE infrastructure_features IS
    'National infrastructure point/line layers from MapBiomas 10.1 INFRAESTRUTURA. '
    'Loaded by backend/scripts/load_infrastructure_layers.py, which is idempotent '
    'per layer (delete-then-insert in one transaction). ibge_code on points is '
    'resolved spatially against municipalities.geometry, never by name.';

CREATE INDEX IF NOT EXISTS idx_infra_features_geom  ON infrastructure_features USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_infra_features_layer ON infrastructure_features (layer_id);
CREATE INDEX IF NOT EXISTS idx_infra_features_ibge  ON infrastructure_features (ibge_code);
CREATE INDEX IF NOT EXISTS idx_infra_features_uf    ON infrastructure_features (uf);
-- Layer + UF is the map's hot path once state filtering lands.
CREATE INDEX IF NOT EXISTS idx_infra_features_layer_uf ON infrastructure_features (layer_id, uf);

-- =============================================================================
-- Verification (run after loading):
--   SELECT layer_id, count(*), count(ibge_code) AS with_muni,
--          ST_GeometryType(geometry) FROM infrastructure_features
--   GROUP BY layer_id, ST_GeometryType(geometry) ORDER BY layer_id;
--   -- every point layer should be ~100% resolved to a municipality
-- =============================================================================
