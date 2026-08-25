-- Minimal, self-contained PostGIS seed for the OGC test stack.
-- Auto-loaded by the postgis image on first init (mounted into
-- /docker-entrypoint-initdb.d by tests/ogc/docker-compose.ogc.yml).
--
-- Goal: give GeoServer real, publishable features for every layer the
-- provisioning script publishes, WITHOUT the full data import (shapefiles/GDAL)
-- and WITHOUT the Supabase auth.users FKs in 001_initial_schema.sql. Column
-- names + geometry columns match production so the prod swap is seamless.
-- All geometries EPSG:4326. A few small features around real SP cities.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── municipalities (polygons + biogas potential; the main layer) ─────────────
CREATE TABLE IF NOT EXISTS municipalities (
    id                   SERIAL PRIMARY KEY,
    municipality_name    VARCHAR(100) NOT NULL,
    ibge_code            VARCHAR(7) UNIQUE,
    total_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    geometry             GEOMETRY(MultiPolygon, 4326),
    centroid             GEOMETRY(Point, 4326)
);

INSERT INTO municipalities (municipality_name, ibge_code, total_biogas_m3_year, geometry, centroid) VALUES
  ('Campinas',       '3509502', 52000000,
   ST_Multi(ST_GeomFromText('POLYGON((-47.15 -22.95, -46.95 -22.95, -46.95 -22.80, -47.15 -22.80, -47.15 -22.95))', 4326)),
   ST_SetSRID(ST_MakePoint(-47.06, -22.90), 4326)),
  ('São Paulo',      '3550308', 480000000,
   ST_Multi(ST_GeomFromText('POLYGON((-46.75 -23.65, -46.50 -23.65, -46.50 -23.45, -46.75 -23.45, -46.75 -23.65))', 4326)),
   ST_SetSRID(ST_MakePoint(-46.63, -23.55), 4326)),
  ('Ribeirão Preto', '3543402', 31000000,
   ST_Multi(ST_GeomFromText('POLYGON((-47.90 -21.25, -47.70 -21.25, -47.70 -21.10, -47.90 -21.10, -47.90 -21.25))', 4326)),
   ST_SetSRID(ST_MakePoint(-47.81, -21.17), 4326));

CREATE INDEX IF NOT EXISTS idx_min_municipalities_geom ON municipalities USING GIST (geometry);

-- ── biogas_plants (points) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS biogas_plants (
    id         SERIAL PRIMARY KEY,
    plant_name VARCHAR(200),
    status     VARCHAR(50),
    location   GEOMETRY(Point, 4326) NOT NULL
);
INSERT INTO biogas_plants (plant_name, status, location) VALUES
  ('UTGE Campinas',    'Operational', ST_SetSRID(ST_MakePoint(-47.05, -22.91), 4326)),
  ('Biogás São Paulo', 'Planned',     ST_SetSRID(ST_MakePoint(-46.60, -23.52), 4326));
CREATE INDEX IF NOT EXISTS idx_min_plants_loc ON biogas_plants USING GIST (location);

-- ── gas_pipelines (lines) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gas_pipelines (
    id            SERIAL PRIMARY KEY,
    pipeline_name VARCHAR(200),
    geometry      GEOMETRY(MultiLineString, 4326) NOT NULL
);
INSERT INTO gas_pipelines (pipeline_name, geometry) VALUES
  ('Gasoduto SP-Campinas',
   ST_Multi(ST_GeomFromText('LINESTRING(-47.06 -22.90, -46.85 -23.10, -46.63 -23.55)', 4326)));
CREATE INDEX IF NOT EXISTS idx_min_pipes_geom ON gas_pipelines USING GIST (geometry);

-- ── power_transmission_lines (lines) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS power_transmission_lines (
    id        SERIAL PRIMARY KEY,
    line_name VARCHAR(200),
    geometry  GEOMETRY(MultiLineString, 4326) NOT NULL
);
INSERT INTO power_transmission_lines (line_name, geometry) VALUES
  ('LT 440kV Exemplo',
   ST_Multi(ST_GeomFromText('LINESTRING(-47.81 -21.17, -47.40 -22.00, -47.06 -22.90)', 4326)));

-- ── power_substations (points) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS power_substations (
    id               SERIAL PRIMARY KEY,
    substation_name  VARCHAR(200),
    location         GEOMETRY(Point, 4326) NOT NULL
);
INSERT INTO power_substations (substation_name, location) VALUES
  ('SE Campinas', ST_SetSRID(ST_MakePoint(-47.08, -22.89), 4326));

-- ── wastewater_treatment_plants (points) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wastewater_treatment_plants (
    id       SERIAL PRIMARY KEY,
    ete_name VARCHAR(200),
    location GEOMETRY(Point, 4326) NOT NULL
);
INSERT INTO wastewater_treatment_plants (ete_name, location) VALUES
  ('ETE Piçarrão', ST_SetSRID(ST_MakePoint(-47.10, -22.93), 4326));
