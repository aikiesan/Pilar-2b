-- =============================================================================
-- PILAR-2b V3 — Manuscript Data Validation Queries
-- =============================================================================
-- Purpose : Replace estimated/hardcoded values in the manuscript with
--           database-verified figures.
--
-- Sections covered
--   • Section 3.1 / Table 4  — facility-level MAE validation (20.8%)
--   • Section 3.2            — feedstock composition (sugarcane 84.6% / 61.3%)
--   • Aggregate state total  — 19.69 M m³/dia
--   • Municipality tier counts — 125 industrial-scale / 293 medium / etc.
--
-- Run via psql:
--   psql "$DATABASE_URL" -f scripts/validate_manuscript_data.sql
-- Or in Supabase SQL editor (paste individual blocks).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Quick sanity check — total municipalities with data
-- ---------------------------------------------------------------------------
SELECT
    COUNT(*)                                    AS total_municipalities,
    COUNT(*) FILTER (WHERE total_biogas_m3_year > 0)  AS with_biogas_data,
    COUNT(*) FILTER (WHERE total_biogas_m3_year IS NULL
                        OR total_biogas_m3_year = 0)  AS no_data
FROM municipalities;


-- ---------------------------------------------------------------------------
-- 1. State aggregate — total biogas potential
--    Manuscript claim: 19.69 M m³/dia (≈ 7,187 M m³/ano)
--    Conversion: m³/ano ÷ 365 = m³/dia
-- ---------------------------------------------------------------------------
SELECT
    ROUND(SUM(total_biogas_m3_year)::numeric, 0)         AS total_m3_ano,
    ROUND(SUM(total_biogas_m3_year)::numeric / 365, 0)   AS total_m3_dia,
    -- Express in millions
    ROUND(SUM(total_biogas_m3_year)::numeric / 1e6, 4)   AS total_M_m3_ano,
    ROUND(SUM(total_biogas_m3_year)::numeric / 365 / 1e6, 4) AS total_M_m3_dia,
    -- Manuscript value for comparison
    19.69                                                 AS manuscript_M_m3_dia,
    ROUND(
        SUM(total_biogas_m3_year)::numeric / 365 / 1e6
        - 19.69,
    4)                                                    AS delta_M_m3_dia
FROM municipalities
WHERE total_biogas_m3_year > 0;


-- ---------------------------------------------------------------------------
-- 2. Municipality tier counts
--    Tiers based on daily biogas production threshold (m³/dia):
--      Industrial-scale : ≥ 10 000 m³/dia  (≥ 3 650 000 m³/ano)
--      Medium           :  1 000 – 9 999   (  365 000 – 3 649 999 m³/ano)
--      Small / municipal:   100 –   999    (   36 500 –   364 999 m³/ano)
--      Micro            :     1 –    99    (      365 –    36 499 m³/ano)
--      No viable output : < 1 m³/dia
--
--    Manuscript claims: 125 industrial-scale, 293 medium
-- ---------------------------------------------------------------------------
SELECT
    CASE
        WHEN total_biogas_m3_year >= 3650000  THEN 'industrial_scale (≥10k m³/d)'
        WHEN total_biogas_m3_year >= 365000   THEN 'medium (1k–10k m³/d)'
        WHEN total_biogas_m3_year >= 36500    THEN 'small (100–999 m³/d)'
        WHEN total_biogas_m3_year >= 365      THEN 'micro (1–99 m³/d)'
        ELSE                                       'non_viable (<1 m³/d)'
    END                                             AS tier,
    COUNT(*)                                        AS municipality_count,
    ROUND(SUM(total_biogas_m3_year)::numeric / 365, 0) AS tier_total_m3_dia,
    ROUND(
        100.0 * COUNT(*) / SUM(COUNT(*)) OVER (),
    2)                                              AS pct_of_total
FROM municipalities
GROUP BY 1
ORDER BY
    CASE
        WHEN total_biogas_m3_year >= 3650000  THEN 1
        WHEN total_biogas_m3_year >= 365000   THEN 2
        WHEN total_biogas_m3_year >= 36500    THEN 3
        WHEN total_biogas_m3_year >= 365      THEN 4
        ELSE 5
    END;


-- ---------------------------------------------------------------------------
-- 3. Feedstock composition — actual vs. theoretical
--    Manuscript: 84.6% sugarcane (theoretical) / 61.3% (practical)
--    These percentages are calculated from the biogas contribution of each
--    feedstock relative to the total.
-- ---------------------------------------------------------------------------
SELECT
    -- Sugarcane
    ROUND(100.0 * SUM(COALESCE(sugarcane_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS sugarcane_pct,

    -- Soybean
    ROUND(100.0 * SUM(COALESCE(soybean_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS soybean_pct,

    -- Corn
    ROUND(100.0 * SUM(COALESCE(corn_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS corn_pct,

    -- Coffee
    ROUND(100.0 * SUM(COALESCE(coffee_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS coffee_pct,

    -- Citrus
    ROUND(100.0 * SUM(COALESCE(citrus_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS citrus_pct,

    -- All agricultural combined
    ROUND(100.0 * SUM(COALESCE(agricultural_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS agricultural_total_pct,

    -- Livestock combined
    ROUND(100.0 * SUM(COALESCE(livestock_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS livestock_pct,

    -- Urban combined
    ROUND(100.0 * SUM(COALESCE(urban_biogas_m3_year, 0))
          / NULLIF(SUM(total_biogas_m3_year), 0), 2)    AS urban_pct,

    -- Grand total for cross-check (should equal 100%)
    ROUND(100.0 * (
        SUM(COALESCE(agricultural_biogas_m3_year, 0))
        + SUM(COALESCE(livestock_biogas_m3_year, 0))
        + SUM(COALESCE(urban_biogas_m3_year, 0))
    ) / NULLIF(SUM(total_biogas_m3_year), 0), 2)       AS sector_sum_check_pct

FROM municipalities
WHERE total_biogas_m3_year > 0;


-- ---------------------------------------------------------------------------
-- 4. Per-feedstock absolute totals (for cross-referencing Table 4)
-- ---------------------------------------------------------------------------
SELECT
    'sugarcane'    AS feedstock,
    ROUND(SUM(COALESCE(sugarcane_biogas_m3_year,    0))::numeric, 0) AS m3_ano,
    ROUND(SUM(COALESCE(sugarcane_biogas_m3_year,    0))::numeric / 365, 0) AS m3_dia
FROM municipalities
UNION ALL
SELECT 'soybean',
    ROUND(SUM(COALESCE(soybean_biogas_m3_year,      0))::numeric, 0),
    ROUND(SUM(COALESCE(soybean_biogas_m3_year,      0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'corn',
    ROUND(SUM(COALESCE(corn_biogas_m3_year,          0))::numeric, 0),
    ROUND(SUM(COALESCE(corn_biogas_m3_year,          0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'coffee',
    ROUND(SUM(COALESCE(coffee_biogas_m3_year,        0))::numeric, 0),
    ROUND(SUM(COALESCE(coffee_biogas_m3_year,        0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'citrus',
    ROUND(SUM(COALESCE(citrus_biogas_m3_year,        0))::numeric, 0),
    ROUND(SUM(COALESCE(citrus_biogas_m3_year,        0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'cattle',
    ROUND(SUM(COALESCE(cattle_biogas_m3_year,        0))::numeric, 0),
    ROUND(SUM(COALESCE(cattle_biogas_m3_year,        0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'swine',
    ROUND(SUM(COALESCE(swine_biogas_m3_year,         0))::numeric, 0),
    ROUND(SUM(COALESCE(swine_biogas_m3_year,         0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'poultry',
    ROUND(SUM(COALESCE(poultry_biogas_m3_year,       0))::numeric, 0),
    ROUND(SUM(COALESCE(poultry_biogas_m3_year,       0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'aquaculture',
    ROUND(SUM(COALESCE(aquaculture_biogas_m3_year,   0))::numeric, 0),
    ROUND(SUM(COALESCE(aquaculture_biogas_m3_year,   0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'rsu',
    ROUND(SUM(COALESCE(rsu_biogas_m3_year,           0))::numeric, 0),
    ROUND(SUM(COALESCE(rsu_biogas_m3_year,           0))::numeric / 365, 0)
FROM municipalities
UNION ALL
SELECT 'rpo',
    ROUND(SUM(COALESCE(rpo_biogas_m3_year,           0))::numeric, 0),
    ROUND(SUM(COALESCE(rpo_biogas_m3_year,           0))::numeric / 365, 0)
FROM municipalities
ORDER BY m3_ano DESC;


-- ---------------------------------------------------------------------------
-- 5. MAE validation — facility-level
--    Manuscript claim: 20.8% Mean Absolute Error at facility level
--    (Table 4 row "Facility-level MAE")
--
--    This query computes the implied MAE if the database stores both
--    a measured value and a modelled value. Adjust column names if your
--    schema differs (e.g., 'measured_biogas_m3_year', 'modelled_biogas_m3_year').
--
--    If the table only stores the modelled value, use the comparison against
--    Tabela 4 reference values provided externally.
-- ---------------------------------------------------------------------------

-- Check which columns exist (run this first to see what's available):
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'municipalities'
  AND column_name ILIKE ANY(ARRAY[
      '%measured%', '%observed%', '%actual%',
      '%modelled%', '%predicted%', '%estimated%',
      '%reference%', '%validated%'
  ])
ORDER BY column_name;

-- If 'measured_biogas_m3_year' exists, calculate MAE:
/*
SELECT
    COUNT(*)                                                AS n_facilities,
    ROUND(AVG(
        ABS(total_biogas_m3_year - measured_biogas_m3_year)
        / NULLIF(measured_biogas_m3_year, 0) * 100
    )::numeric, 2)                                          AS mae_pct,
    ROUND(SQRT(AVG(
        POWER(total_biogas_m3_year - measured_biogas_m3_year, 2)
    ))::numeric, 2)                                         AS rmse_m3_ano,
    ROUND(CORR(total_biogas_m3_year, measured_biogas_m3_year)::numeric, 4) AS r_squared_proxy
FROM municipalities
WHERE measured_biogas_m3_year > 0
  AND total_biogas_m3_year > 0;
*/


-- ---------------------------------------------------------------------------
-- 6. Regional distribution (for pie chart / Table 5 validation)
-- ---------------------------------------------------------------------------
SELECT
    administrative_region,
    COUNT(*)                                                  AS n_municipalities,
    ROUND(SUM(total_biogas_m3_year)::numeric, 0)              AS total_m3_ano,
    ROUND(SUM(total_biogas_m3_year)::numeric / 365, 0)        AS total_m3_dia,
    ROUND(
        100.0 * SUM(total_biogas_m3_year)
        / NULLIF((SELECT SUM(total_biogas_m3_year) FROM municipalities), 0),
    2)                                                        AS pct_of_state
FROM municipalities
WHERE total_biogas_m3_year > 0
GROUP BY administrative_region
ORDER BY total_m3_ano DESC;


-- ---------------------------------------------------------------------------
-- 7. Tier counts cross-referenced with potential_category column
--    (the column computed by the API at classification time)
-- ---------------------------------------------------------------------------
SELECT
    potential_category,
    COUNT(*)                                                  AS n_municipalities,
    ROUND(SUM(total_biogas_m3_year)::numeric / 365, 0)        AS total_m3_dia,
    ROUND(MIN(total_biogas_m3_year)::numeric / 365, 1)        AS min_m3_dia,
    ROUND(MAX(total_biogas_m3_year)::numeric / 365, 0)        AS max_m3_dia,
    ROUND(AVG(total_biogas_m3_year)::numeric / 365, 0)        AS avg_m3_dia
FROM municipalities
GROUP BY potential_category
ORDER BY total_m3_dia DESC;
