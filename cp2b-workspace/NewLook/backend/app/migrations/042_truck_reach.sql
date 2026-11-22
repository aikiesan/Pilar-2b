-- =============================================================================
-- Migration 042: truck reach, routes computed once and stored
-- =============================================================================
-- For every open biogas and biomethane site in São Paulo (landfills, ethanol
-- mills, biomethane and biogas plants): the shortest truck routes from each
-- town centre (IBGE municipal seat) within 90 minutes to the site, and from the
-- site to the nearest gas pipeline. The map's Truck reach tool reads one row
-- per click through GET /api/v1/truck-reach/{site_id} (signed-in only). Nothing
-- is routed at request time.
--
-- Built offline by scripts/build_truck_reach.py on the OpenStreetMap road graph
-- of São Paulo, with truck speed caps by road class (truck_build.caps); loaded
-- by scripts/load_truck_reach.py.
--
-- Sites carry position, name, type and town only. No per-site methane,
-- capacity or pipeline-distance figures: those are unpublished model results.
--
-- Migration 040 is reserved for sign-in with approval (Part 2); 041 is land
-- cover per municipality.
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/042_truck_reach.sql
-- Then:        python scripts/load_truck_reach.py --file <truck_reach.json.gz>
-- Idempotent: safe to re-run. Until the loader runs the tables are empty and
-- the endpoints answer {"available": false}.
-- =============================================================================

CREATE TABLE IF NOT EXISTS truck_site (
    site_id    TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    tipo       TEXT NOT NULL,
    ibge_code  TEXT NOT NULL,
    municipio  TEXT NOT NULL,
    geom       geometry(Point, 4326) NOT NULL,
    snap_m     INTEGER NOT NULL,
    at_town_centre BOOLEAN NOT NULL,
    CONSTRAINT truck_site_tipo CHECK (tipo IN ('aterro', 'etanol', 'biometano', 'biogas')),
    CONSTRAINT truck_site_sp CHECK (LEFT(ibge_code, 2) = '35'),
    CONSTRAINT truck_site_snap CHECK (snap_m >= 0)
);

CREATE TABLE IF NOT EXISTS truck_reach (
    site_id    TEXT NOT NULL REFERENCES truck_site (site_id) ON DELETE CASCADE,
    ibge_code  TEXT NOT NULL,
    minutes    REAL NOT NULL,
    km         REAL NOT NULL,
    PRIMARY KEY (site_id, ibge_code),
    CONSTRAINT truck_reach_minutes CHECK (minutes >= 0 AND minutes <= 90),
    CONSTRAINT truck_reach_km CHECK (km >= 0)
);

CREATE TABLE IF NOT EXISTS truck_route (
    site_id       TEXT PRIMARY KEY REFERENCES truck_site (site_id) ON DELETE CASCADE,
    tree          JSONB NOT NULL,
    pipeline      JSONB,
    built_at      TIMESTAMPTZ NOT NULL,
    graph_source  TEXT NOT NULL
);

-- One row: how the routes were built, for the tool's window to cite.
CREATE TABLE IF NOT EXISTS truck_build (
    id                  BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    built_at            TIMESTAMPTZ NOT NULL,
    graph_source        TEXT NOT NULL,
    caps                JSONB NOT NULL,
    other_cap           REAL NOT NULL,
    town_limit_min      REAL NOT NULL,
    pipeline_limit_min  REAL NOT NULL,
    grid_m              REAL NOT NULL
);

COMMENT ON TABLE truck_site IS
    'Open biogas and biomethane sites in SP for Truck reach: position, name, type, town. '
    'From Data_Biogas unidades.geojson, closed landfills left out. Loaded by '
    'scripts/load_truck_reach.py; derived, never edit directly.';
COMMENT ON COLUMN truck_site.snap_m IS
    'Metres from the site to the road node its routes start from.';
COMMENT ON COLUMN truck_site.at_town_centre IS
    'True when the source gives no plant position and the site sits on its town''s seat '
    '(within 300 m): its routes start from the town, not from the plant.';
COMMENT ON TABLE truck_reach IS
    'Town centres (IBGE 2022 municipal seats) a truck reaches the site from within 90 minutes.';
COMMENT ON COLUMN truck_reach.minutes IS
    'Truck minutes from the town centre to the site on the shortest route.';
COMMENT ON TABLE truck_route IS
    'Route tree per site for the map. tree: flat [lon1,lat1,lon2,lat2,t1,t2,...], point 1 '
    'the end nearer the site at minute t1; pipeline: {lon,lat,kind,minutes,km,tree} or null.';
COMMENT ON TABLE truck_build IS
    'How the truck routes were built: road graph, truck speed caps by road class (km/h), limits.';

-- =============================================================================
-- Verification (after the loader):
--   SELECT tipo, count(*) FROM truck_site GROUP BY tipo ORDER BY tipo;
--   -- expect aterro 300, biogas 2, biometano 6, etanol 119 (build of 2026-11-22)
--   SELECT count(*) FROM truck_reach WHERE site_id = 'ITB_SP_0005';  -- 51
--   SELECT count(*) FROM truck_route WHERE pipeline IS NULL;          -- 7
--   SELECT count(*) FROM truck_site WHERE at_town_centre;             -- 372
-- =============================================================================
