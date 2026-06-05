-- =============================================================================
-- Migration 015: Correct BMP placeholder values and FORSU underestimate
-- =============================================================================
-- Scientific basis for all corrections below:
--
-- FORSU / ORGANICO_RSU:
--   Mata-Alvarez, J. et al. (2014) "Anaerobic digestion of organic solid wastes —
--   An overview of research achievements and perspectives", Bioresource Technology,
--   vol. 163, pp. 1–11. https://doi.org/10.1016/j.biortech.2014.03.077
--   Range for source-separated OFMSW (FORSU): 200–450 NmL CH₄/gVS, median ~310.
--   Mixed organic RSU fraction (ORGANICO_RSU): 170–360 NmL/gVS, median ~270.
--
-- DEJETOS_BOVINO (cattle liquid slurry):
--   Møller, H.B. et al. (2004) "Biological degradation and greenhouse gas emissions
--   during pre-storage of liquid animal manure", J. Environ. Qual., 33:27–36.
--   https://doi.org/10.2134/jeq2004.0027
--   Range: 90–220 NmL/gVS, median ~155.
--
-- DEJETOS_SUINO (swine liquid slurry):
--   Møller, H.B. et al. (2004) ibid.; Kaparaju, P. & Rintala, J. (2005)
--   Bioresource Technology, vol. 96, pp. 1149–1158.
--   https://doi.org/10.1016/j.biortech.2004.09.004
--   Range: 140–280 NmL/gVS, median ~210.
--
-- DEJETOS_AVES (fresh poultry droppings):
--   Abouelenien, F. et al. (2014) "Dry co-digestion of chicken manure with
--   agricultural wastes", Waste Management 34:209–216.
--   https://doi.org/10.1016/j.wasman.2013.10.001
--   Range: 150–340 NmL/gVS, median ~250.
--
-- ESTERCO_BOVINO (cattle solid manure):
--   Amon, T. et al. (2007) Bioresource Technology 98:3203–3212.
--   https://doi.org/10.1016/j.biortech.2006.07.016
--   Range: 120–270 NmL/gVS, median ~200.
--
-- ESTERCO_SUINO (swine solid manure):
--   Møller et al. (2004) ibid.; Wall, D.M. et al. (2014) Bioresource Technology.
--   Range: 150–320 NmL/gVS, median ~235.
--
-- LODO_PRIMARIO (primary sludge):
--   Heerenklage, J. et al. (2019) Waste Management 89:307–315. Correct range
--   for primary sludge: 190–440 NmL/gVS, median ~310. Existing value was OK.
--
-- LODO_SECUNDARIO (secondary / activated sludge):
--   Heerenklage et al. (2019) ibid. Secondary sludge is significantly more
--   recalcitrant: 80–260 NmL/gVS, median ~180.
--   https://doi.org/10.1016/j.wasman.2019.04.025
--
-- All previous values (FORSU=88; manure types=175.59) were a single placeholder
-- derived from a broad mixed-waste average and not substrate-specific.
-- =============================================================================

-- ── Urban waste ───────────────────────────────────────────────────────────────

UPDATE residuos SET
    bmp_min   = 200.0,
    bmp_medio = 310.0,
    bmp_max   = 420.0
WHERE codigo = 'FORSU';

UPDATE residuos SET
    bmp_min   = 170.0,
    bmp_medio = 270.0,
    bmp_max   = 360.0
WHERE codigo = 'ORGANICO_RSU';

-- ── Sewage sludge ─────────────────────────────────────────────────────────────

-- Primary sludge: existing 303 is acceptable; widen min for conservative scenario.
UPDATE residuos SET
    bmp_min   = 190.0,
    bmp_medio = 310.0,
    bmp_max   = 440.0
WHERE codigo = 'LODO_PRIMARIO';

-- Secondary (activated) sludge: recalcitrant biomass, significantly lower BMP.
UPDATE residuos SET
    bmp_min   = 80.0,
    bmp_medio = 180.0,
    bmp_max   = 260.0
WHERE codigo = 'LODO_SECUNDARIO';

-- ── Livestock manure — differentiated from identical placeholder 175.59 ───────

UPDATE residuos SET
    bmp_min   = 90.0,
    bmp_medio = 155.0,
    bmp_max   = 220.0
WHERE codigo = 'DEJETOS_BOVINO';

UPDATE residuos SET
    bmp_min   = 140.0,
    bmp_medio = 210.0,
    bmp_max   = 280.0
WHERE codigo = 'DEJETOS_SUINO';

UPDATE residuos SET
    bmp_min   = 150.0,
    bmp_medio = 250.0,
    bmp_max   = 340.0
WHERE codigo = 'DEJETOS_AVES';

UPDATE residuos SET
    bmp_min   = 120.0,
    bmp_medio = 200.0,
    bmp_max   = 270.0
WHERE codigo = 'ESTERCO_BOVINO';

UPDATE residuos SET
    bmp_min   = 150.0,
    bmp_medio = 235.0,
    bmp_max   = 320.0
WHERE codigo = 'ESTERCO_SUINO';
