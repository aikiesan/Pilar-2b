# November 2026 playbook — Bioeconomics, readiness scoring & ILUC

## Weeks 1–2 — the readiness-score ingest wave (one PR each)

1. **ANP biometano** (`ingest/sources/anp_biometano/`): the assembled CSVs in
   `analysis/data/05c/05d` graduate into the contract. Cross-source gate:
   plant overlap with `validation_plants` (SIGA) — same physical plant in two
   registries; document match rate + method (name+UF fuzzy → CEG where present).
2. **EPE/BEN** (`ingest/sources/epe_ben/`): national energy-balance series
   (uf-level where available). Aggregation gate: exact match to published BEN
   tables (tolerance 0).
3. **SINIR** (`ingest/sources/sinir/`): municipal solid-waste management
   plans (boolean/status per municipality + year). Coverage gate with a real
   allowlist (many municipalities have no plan — that IS the signal).
4. **SICONFI** (`ingest/sources/siconfi/`): municipal fiscal capacity via the
   TCU/SICONFI REST API (RREO/DCA aggregates). Range gate on per-capita
   revenue; cross-source vs IBGE population.
5. **RAIS/CAGED** (`ingest/sources/rais_agro/`): agro-sector employment,
   **RGint aggregates only** (microdata stays out of the DB — aggregate in
   the loader, promote the aggregate).

## Week 2–3 — readiness & viability score

6. Design doc first (`docs/data/READINESS_SCORE_METHODOLOGY.md`): components,
   weights, normalization — every choice cited. Draft components:
   feedstock density (Oct), waste-plan status (SINIR), fiscal capacity
   (SICONFI), agro employment (RAIS), energy context (EPE), existing plants
   (validation_plants), restricted-area share (Oct).
7. Implement as a materialized view or computed table keyed on ibge_code +
   cod_rgint; unit tests on synthetic municipalities with known expected
   scores; sensitivity check (±20% weights → ranking stability documented).
8. UI: score choropleth + per-municipality breakdown panel ("why this score")
   — full component transparency, paper-grade.

## Weeks 3–4 — ABIOVE ILUC/LULC economics at RGint level

9. Inputs are ready by design: C10.1 transition matrices (Oct), PRODES/DETER
   (`ingest/sources/prodes/` — TerraBrasilis WFS, this month), RGint spine.
10. Implement the ABIOVE ILUC pipeline (`analysis/` first, promote outputs):
    2008–2024 transitions for sugarcane/soy/corn per RGint → land-use change
    attribution → economics per the ABIOVE methodology. Validation: national
    crop-expansion totals vs PAM planted-area deltas (cross-source);
    transition consistency already gated in October.
11. INMET normals ingest (`ingest/sources/inmet/`) if time allows (P2 —
    productivity modelling input for 2027; static normals only).
12. Restricted-areas wave 2: APPs (ANA hydrography buffers + slope from SRTM)
    and PRODES embargoes → severity update of the composite layer.

## Exit criteria

- [ ] ANP, EPE, SINIR, SICONFI, RAIS promoted (total ≥ 13 of 14 incl. PRODES)
- [ ] Readiness score live with methodology doc + component breakdown UI
- [ ] ILUC transition analysis reproducible end-to-end from raw rasters
      (one command, documented)
- [ ] Restricted layer v2 (5+ sources)
- [ ] Indicator column filled; December scope confirmed realistic
