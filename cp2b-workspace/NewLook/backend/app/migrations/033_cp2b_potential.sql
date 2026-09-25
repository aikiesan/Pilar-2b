-- 033_cp2b_potential.sql
--
-- CP2b method v5.1: resource potential for São Paulo's 645 municipalities at
-- four levels, per substrate and scenario. Loaded by
-- scripts/load_cp2b_potential.py from the snapshot in
-- data/raw/cp2b_potential/2026/ (gitignored; see the loader for the checksums).
--
-- The four levels (Brosowski et al., 2016, adapted):
--   N1 theoretical  = A x g x TS x VS x BMP
--   N2 technical    = N1 x FC   (straw left for soil, animals housed, ...)
--   N3 mobilisable  = max(0, N2 x FCo - U)   <- the CP2b HEADLINE figure
--   N4 accessible   = N3 x FS x FL          (FL on the OSM road network, variant B)
-- Scenarios min / med / max take every element at the same end of its range.
--
-- WHY NEW TABLES AND NOT MORE ch4_* COLUMNS ON municipalities: the Real/Ideal
-- scenarios (migrations 026/029) are the Atlas de Bioenergia SP 2020 method.
-- CP2b is a different method with different levels, scenarios and substrates
-- (sugarcane here includes the 5-15% SURPLUS bagasse the Atlas excludes).
-- Writing it into the Real/Ideal columns would mix two quantities under one
-- name. The two live side by side; the map offers CP2b N3/N4 as extra tiers.
--
-- UNITS: every volume is Nm3 of METHANE per year, never biogas. Biogas and
-- biomethane equivalents are stored separately, from the substrate-specific
-- CH4 fraction, 1% upgrading loss and 96% CH4 product purity.
--
-- Provisional parameters: 11 of the 17 substrates carry at least one element
-- marked 'provisorio' in cp2b_parameters.status (57.6% of state N3 in med).
--
-- Idempotent: safe to re-run. Creates empty tables; the loader fills them.
-- Apply with: python scripts/run_migrations.py

CREATE TABLE IF NOT EXISTS municipality_cp2b_potential (
    ibge_code        integer          NOT NULL,
    substrate        text             NOT NULL,   -- CP2b code (17): PALHA, VINHACA, ...
    residue          text             NOT NULL,   -- map filter vocabulary (029): sugarcane, cattle, ...
    sector           text             NOT NULL CHECK (sector IN ('agricultural', 'livestock', 'urban')),
    lignocellulosic  boolean          NOT NULL,
    scenario         text             NOT NULL CHECK (scenario IN ('min', 'med', 'max')),
    n1_ch4_nm3_year  double precision NOT NULL CHECK (n1_ch4_nm3_year >= 0),
    n2_ch4_nm3_year  double precision NOT NULL CHECK (n2_ch4_nm3_year >= 0),
    n3_before_existing_use_ch4_nm3_year  double precision NOT NULL,
    existing_use_subtracted_ch4_nm3_year double precision NOT NULL,
    n3_ch4_nm3_year  double precision NOT NULL CHECK (n3_ch4_nm3_year >= 0),
    n4_ch4_nm3_year  double precision NOT NULL CHECK (n4_ch4_nm3_year >= 0),
    n3_biogas_eq_nm3_year     double precision,
    n3_biomethane_eq_nm3_year double precision,
    n4_biogas_eq_nm3_year     double precision,
    n4_biomethane_eq_nm3_year double precision,
    ch4_fraction_in_biogas    double precision,
    fs_x_fl          double precision,
    method_version   text             NOT NULL,
    loaded_at        timestamptz      NOT NULL DEFAULT now(),
    PRIMARY KEY (ibge_code, substrate, scenario),
    -- The cascade only ever discounts. Tolerance absorbs float round-off.
    CONSTRAINT cp2b_levels_monotonic CHECK (
        n4_ch4_nm3_year <= n3_ch4_nm3_year + 1e-6
        AND n3_ch4_nm3_year <= n2_ch4_nm3_year + 1e-6
        AND n2_ch4_nm3_year <= n1_ch4_nm3_year + 1e-6
    )
);

-- Hot path: the map view and the state summary read one scenario at a time.
CREATE INDEX IF NOT EXISTS idx_cp2b_potential_scenario ON municipality_cp2b_potential (scenario);
CREATE INDEX IF NOT EXISTS idx_cp2b_potential_residue  ON municipality_cp2b_potential (residue);

COMMENT ON TABLE municipality_cp2b_potential IS
  'CP2b method: N1-N4 in Nm3 CH4/yr per municipality x substrate x scenario (SP, 645). '
  'METHANE, not biogas. N3 = mobilisable (headline); N4 = N3 x FS x spatial FL (variant B).';
COMMENT ON COLUMN municipality_cp2b_potential.existing_use_subtracted_ch4_nm3_year IS
  'Methane already recovered by operating plants (ANP, ANEEL SIGA/GD), subtracted within N3.';
COMMENT ON COLUMN municipality_cp2b_potential.fs_x_fl IS
  'Storage factor x spatial logistic factor: N4 / N3 for this row.';

-- Calculation elements with provenance (BASISDATEN layout). Text-only rows
-- (element notes) carry NULL min/med/max.
CREATE TABLE IF NOT EXISTS cp2b_parameters (
    substrate      text NOT NULL,
    residue        text NOT NULL,
    element        text NOT NULL,
    min_value      double precision,
    med_value      double precision,
    max_value      double precision,
    unit           text,
    source         text,
    status         text NOT NULL CHECK (status IN ('cp2b', 'provisorio')),
    method_version text NOT NULL,
    PRIMARY KEY (substrate, element)
);
COMMENT ON TABLE cp2b_parameters IS
  'CP2b calculation elements (min/med/max) with source and status; status = provisorio '
  'marks elements still without a primary source for São Paulo.';

-- Spatial logistic factor per municipality x substrate x scenario, all variants.
CREATE TABLE IF NOT EXISTS cp2b_spatial_fl (
    ibge_code        integer          NOT NULL,
    substrate        text             NOT NULL,
    residuos_codigo  text,            -- residuos.codigo slug (migration 003)
    scenario         text             NOT NULL CHECK (scenario IN ('min', 'med', 'max')),
    fl_b_codigestion_allocated double precision,  -- variant B, principal
    fl_a_codigestion_coverage  double precision,  -- variant A, upper bound
    fl_c_mono_coverage         double precision,  -- variant C, sensitivity
    fl_d_mono_allocated        double precision,  -- variant D, lower bound
    fl_b_straw_any_hub         double precision,  -- B with straw served by any hub
    supply_n3_ch4_nm3_day      double precision,
    method_version   text             NOT NULL,
    PRIMARY KEY (ibge_code, substrate, scenario)
);
COMMENT ON TABLE cp2b_spatial_fl IS
  'CP2b spatial logistic factor (road network, OSM 2026) per municipality x substrate x scenario.';

-- What the map paints: reference scenario only, pivoted to the same
-- ch4_{tier}_{residue}_m3_year shape as the Real/Ideal columns (029), so the
-- residue filter works unchanged. Absent residues/sectors come out NULL.
CREATE OR REPLACE VIEW municipality_cp2b_map AS
SELECT
    ibge_code,
    max(method_version) AS cp2b_method_version,
    sum(n3_ch4_nm3_year) AS ch4_cp2b_n3_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE sector = 'agricultural') AS ch4_cp2b_n3_agricultural_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE sector = 'livestock') AS ch4_cp2b_n3_livestock_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE sector = 'urban') AS ch4_cp2b_n3_urban_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'sugarcane') AS ch4_cp2b_n3_sugarcane_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'soybean') AS ch4_cp2b_n3_soybean_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'corn') AS ch4_cp2b_n3_corn_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'coffee') AS ch4_cp2b_n3_coffee_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'citrus') AS ch4_cp2b_n3_citrus_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'cattle') AS ch4_cp2b_n3_cattle_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'swine') AS ch4_cp2b_n3_swine_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'poultry') AS ch4_cp2b_n3_poultry_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'rsu') AS ch4_cp2b_n3_rsu_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'rpo') AS ch4_cp2b_n3_rpo_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE residue = 'sewage') AS ch4_cp2b_n3_sewage_m3_year,
    sum(n3_ch4_nm3_year) FILTER (WHERE NOT lignocellulosic) AS ch4_cp2b_n3_non_lignocellulosic_m3_year,
    sum(n4_ch4_nm3_year) AS ch4_cp2b_n4_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE sector = 'agricultural') AS ch4_cp2b_n4_agricultural_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE sector = 'livestock') AS ch4_cp2b_n4_livestock_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE sector = 'urban') AS ch4_cp2b_n4_urban_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'sugarcane') AS ch4_cp2b_n4_sugarcane_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'soybean') AS ch4_cp2b_n4_soybean_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'corn') AS ch4_cp2b_n4_corn_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'coffee') AS ch4_cp2b_n4_coffee_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'citrus') AS ch4_cp2b_n4_citrus_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'cattle') AS ch4_cp2b_n4_cattle_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'swine') AS ch4_cp2b_n4_swine_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'poultry') AS ch4_cp2b_n4_poultry_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'rsu') AS ch4_cp2b_n4_rsu_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'rpo') AS ch4_cp2b_n4_rpo_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE residue = 'sewage') AS ch4_cp2b_n4_sewage_m3_year,
    sum(n4_ch4_nm3_year) FILTER (WHERE NOT lignocellulosic) AS ch4_cp2b_n4_non_lignocellulosic_m3_year
FROM municipality_cp2b_potential
WHERE scenario = 'med'
GROUP BY ibge_code;

COMMENT ON VIEW municipality_cp2b_map IS
  'CP2b N3/N4 (med) per municipality, by sector and residue, in Nm3 CH4/yr. Read by /municipalities/geojson and /metrics.';

-- Verify after loading:
--   SELECT scenario, sum(n3_ch4_nm3_year)/365e6 AS n3_M_day, sum(n4_ch4_nm3_year)/365e6 AS n4_M_day
--   FROM municipality_cp2b_potential GROUP BY scenario ORDER BY scenario;
--   -- med: 19.18 / 16.36
