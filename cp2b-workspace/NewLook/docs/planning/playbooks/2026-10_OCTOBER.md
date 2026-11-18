# October 2026 playbook — National FDE + MapBiomas C10.1 + restricted areas v1

## Weeks 1–2 — FDE methodology goes national

1. Parameter audit: for each FDE factor (FC collection, FCo competing uses,
   FS seasonality, FL logistics — `docs/data/FDE_METHODOLOGY.md`), decide
   per-state or per-region values. Sources: UNICA/CONSECANA (center-south vs
   north-northeast harvest calendars), EMBRAPA regional manure factors,
   state-level competing-use data. Every parameter gets a citation row in
   `FEEDSTOCK_FACTORS_LITERATURE_TABLE.md`.
2. Schema: parameters move from constants to a table keyed by (feedstock,
   uf|region) — migration 022. Loader in `data/canonical_parameters/*.yaml`
   pattern (the canonical_loader already exists).
3. Recompute nationally (`recalculate_biogas_canonical.py` extended):
   - SP with SP parameters → **must reproduce the paper's numbers exactly**
     (regression gate; this is the make-or-break check);
   - other states with their sourced parameters, else conservative defaults
     flagged `data_confidence='low'`.
4. Confidence surfaced in the UI: choropleth hatching/badge for
   provisional/low municipalities (honesty layer for the papers).

## Week 2–3 — MapBiomas Collection 10.1 ingest (the data you already have)

5. `ingest/sources/mapbiomas_c10/`: LULC class areas per municipality +
   the 2008–2024 transition matrices (15 classes; sugarcane, soy, corn focus).
   Rasters stay on the VM (record URL + SHA-256 in METADATA.json); what gets
   promoted are per-municipality/per-RGint aggregate tables
   (`staging.mapbiomas_c10_areas`, `staging.mapbiomas_c10_transitions`).
6. Gates: class-area totals per municipality vs MapBiomas' own statistics
   platform (±0.5%); transition-matrix row/col sums equal class areas
   (internal consistency); cross-source vs PAM planted area for
   sugarcane/soy/corn (r² threshold, documented outliers).
7. Retire the Collection 8 code path in `mapbiomas_service.py` (July settled
   the naming; this lands the data). One collection, everywhere, verified:
   `grep -rn "collection" backend/app | grep -vi "10"` → empty.

## Week 3 — LAPIG pastures + cattle crossing

8. `ingest/sources/lapig_pastures/`: pasture quality/degradation per
   municipality (Atlas das Pastagens). Cross-source gate vs MapBiomas pasture
   class area (same land, two mappers — expect r² > 0.8).
9. Analysis join: degraded-pasture area × PPM cattle density → manure biogas
   opportunity ranking (feeds the readiness score in November).

## Week 4 — restricted-areas wave 1

10. Three ingests under the contract (geometry-only sources; key validation =
    feature counts + total area vs the agency's own published figures):
    - CNUC conservation units (ICMBio/MMA shapefiles);
    - FUNAI indigenous lands;
    - IBGE urban perimeters (áreas urbanizadas).
11. Composite: `restricted_areas` table (geometry, category, severity
    no-go|caution, source, reference_year) → one PMTiles layer → map toggle
    with per-category legend.

## Exit criteria

- [ ] Every BR municipality has a biomass profile with a confidence flag
- [ ] SP paper numbers reproduced exactly post-refactor (report committed)
- [ ] MapBiomas C10.1 promoted (areas + transitions); Collection 8 code gone
- [ ] LAPIG promoted; degraded-pasture × cattle ranking queryable
- [ ] Restricted layer v1 (3 sources) live on the map
- [ ] Sources promoted: total ≥ 9 of 14 · Indicator column filled
