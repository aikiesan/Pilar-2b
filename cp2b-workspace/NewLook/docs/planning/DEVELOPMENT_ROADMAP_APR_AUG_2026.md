# PILAR-2b Development Roadmap — April–August 2026

**Period:** April 26 – August 22, 2026  
**Team:** 1 developer  
**Goals:** National policy platform + academic publication support  
**FAPESP Grant:** 2025/08745-2

---

## Current State (April 2026)

### What is fully functional
- São Paulo State: 645 municipalities with FDE-corrected biogas potential
- 38 validated residues with correction factors (FDE = availability × efficiency)
- Proximity analysis (1–100 km radius, MapBiomas integration)
- Interactive choropleth map, dashboard, scientific database (58 references)
- Technology route visual builder (75% complete)
- User authentication (Supabase + JWT)

### What exists in the repo but is NOT yet activated

| Asset | Location | Status |
|---|---|---|
| 133 intermediate region centroids | `backend/data/shapefiles/brazil/br_intermediary_regions_centroids.csv` | Ready |
| 17,689 pre-computed distances | `backend/migrations/br_intermediary_regions_distances.sql` | Ready to run |
| Brazil GeoJSON + Parquet | `backend/data/shapefiles/brazil/` | Ready |
| IBGE 67-sector I-O documentation | `docs/data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md` | Documented |

### Blockers for national expansion (minimal)
- Geographic gating hardcoded to SP bounds in `backend/app/api/v1/endpoints/geospatial.py` (lines 28–33)
- National municipal data not yet loaded to Supabase (only SP 645 municipalities)

---

## Strategic Direction

**Phase 1 (April–June):** Unlock national coverage at intermediate region level  
**Phase 2 (June–August):** Layer economic modeling and cluster analysis  

**Why intermediate regions first (not 5,570 municipalities):**  
- 133 regions is feasible solo; full municipal Brazil would be 8× the data complexity
- Distance matrix already computed for all 133 pairs
- This is the right unit for Leontief I-O analysis and policy decisions
- SP State data serves as validation; national map is the publication result chapter

**For the academic paper:**  
- SP State → methodology validation chapter (already live)  
- National intermediate regions → results chapter (Phase 1 output)  
- Cluster identification + economic modeling → discussion/impact chapter (Phase 2 output)

---

## Phase 1 — National Expansion at Intermediate Region Level
**April 26 – June 27, 2026 | 8 weeks**

### Sprint 1 — Remove Geographic Constraints
**Duration:** 1 week

**Files to modify:**

| File | Change |
|---|---|
| `backend/app/api/v1/endpoints/geospatial.py` lines 28–33 | Remove SP lat/lon bounds (`[-25,-19]`, `[-54,-44]`); load Brazil shapefile instead of SP_Municipios_2024 |
| `backend/app/api/v1/endpoints/municipalities.py` lines 133–135 | Remove SP administrative region hardcoding |
| `backend/app/api/v1/endpoints/analysis.py` | Add Brazil-wide query path alongside SP path |
| `frontend/src/app/[locale]/map/page.tsx` | Expand map bounds to full Brazil |

---

### Sprint 2 — Load National Intermediate Region Data to Supabase
**Duration:** 2 weeks

**New Supabase table: `intermediate_regions`**

```sql
CREATE TABLE intermediate_regions (
  ibge_code          VARCHAR(7) PRIMARY KEY,
  name               TEXT NOT NULL,
  state              VARCHAR(2),
  area_km2           FLOAT,
  population         INTEGER,
  density            FLOAT,
  total_biogas_m3_year        FLOAT,
  agricultural_biogas_m3_year FLOAT,
  livestock_biogas_m3_year    FLOAT,
  urban_biogas_m3_year        FLOAT,
  energy_potential_mwh_year   FLOAT,
  geometry           GEOMETRY(MULTIPOLYGON, 4326)
);
```

**Data pipeline — new script: `scripts/load_national_intermediate_data.py`**

Steps:
1. Aggregate PAM/IBGE municipal crop data (soy, sugarcane, corn) → intermediate regions → apply FDE → biogas m³/year
2. Distribute CONAB state-level data to intermediate regions by area weight
3. Load IBGE population / density / area for 133 intermediate regions
4. Apply existing correction factors from `data/fde_all_residues.json` (valid for all Brazil)
5. Run `backend/migrations/br_intermediary_regions_distances.sql` (already written)

**Reuse:** `scripts/calculate_fde_all_residues.py` — FDE engine applies unchanged to national data.

---

### Sprint 3 — Activate Intermediate Region API Endpoints
**Duration:** 1 week

**New file: `backend/app/api/v1/endpoints/intermediate_regions.py`**

```
GET  /api/v1/intermediate-regions/                → list all 133 with biogas summary
GET  /api/v1/intermediate-regions/{ibge_code}     → single region detail + geometry
GET  /api/v1/intermediate-regions/geojson         → GeoJSON for map rendering
GET  /api/v1/intermediate-regions/rankings        → top regions by potential
POST /api/v1/intermediate-regions/cluster         → trigger cluster analysis
```

**Activate existing distance matrix:**
- Spillover analysis: weighted biogas potential using pre-computed distance pairs
- Corridor identification: which region pairs have highest proximity potential
- Reuse `backend/app/services/cache_service.py` (LRU, 5-min TTL)

---

### Sprint 4 — Frontend: Brazil Map + Temporal Layers
**Duration:** 3 weeks

**Map page (`frontend/src/app/[locale]/map/page.tsx`):**
- Replace SP choropleth with Brazil intermediate region choropleth
- Drill-down navigation: Brazil → State → Intermediate Region → Municipality
- Temporal layer selector: MapBiomas year (2000–2023), TerraClass period (biennial)

**New dashboard section: National Overview**
- Brazil heatmap by biogas potential per intermediate region
- Top 20 intermediate regions ranking table (reuse `TopMunicipalitiesChart.tsx`)
- State-level aggregated view

**Infrastructure overlays (data already available — add as toggleable layers):**
- Road network — full Brazil
- Energy grid (substations, transmission lines)
- Gas pipeline network

---

## Phase 2 — Economic Modeling Layer
**June 28 – August 22, 2026 | 8 weeks**

### Sprint 5 — Leontief I-O Integration
**Duration:** 2 weeks (begins when economics team delivers tables)

**New service: `backend/app/services/economic_service.py`**

```python
# Leontief open model: x = (I - A)^{-1} * f
# x = total output vector
# A = 67×67 technical coefficients matrix (IBGE)
# f = final demand vector (biogas sector injection)
# Use scipy.sparse for efficient matrix inversion
```

**New endpoint:**

```
POST /api/v1/economic/leontief
  Input:  { region_ibge_code, investment_brl, technology_route_id }
  Output: {
    direct_jobs, indirect_jobs, induced_jobs,
    gdp_impact_brl,
    energy_substitution_mwh,
    co2_reduction_tonnes,
    multiplier_coefficients
  }
```

**Data source:** IBGE 67-sector national I-O table  
Reference: `docs/data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md`

---

### Sprint 6 — Cluster Identification
**Duration:** 2 weeks

**Algorithm:** DBSCAN (density-based, handles irregular shapes) or K-means

**Cluster input variables:**
- Total biogas potential (m³/year) — normalized
- Infrastructure proximity index (weighted: pipelines > roads > grid)
- Population density (urban demand proxy)
- Agricultural / livestock / urban mix ratio
- FDE-weighted effective availability

**Target output:** 5–8 biogas development clusters across Brazil

**New page: `frontend/src/app/[locale]/dashboard/clusters/page.tsx`**
- Brazil map with cluster coloring
- Cluster profile cards: dominant residues, infrastructure score, economic potential
- Investment priority index per cluster
- Export cluster definitions for academic use

---

### Sprint 7 — Economic Scenario Simulation UI
**Duration:** 2 weeks

**New page: `frontend/src/app/[locale]/dashboard/economic-simulation/page.tsx`**

Features:
- Select intermediate region or cluster
- Set investment level (BRL millions) slider
- Choose technology route (links to existing technology-routes builder)
- Run Leontief multiplier → display job creation, GDP impact, energy substitution, CO2
- Sensitivity sliders: feedstock availability ±%, capex ±%
- Export to PDF / Excel for academic/policy use

---

### Sprint 8 — Academic Export & Documentation
**Duration:** 1 week

- Data export endpoints: full dataset as CSV / Excel with methodology columns
- Statistical summary tables: mean, median, percentiles by region / state / cluster
- All FDE factors, I-O coefficients, data sources documented inline
- API documentation update for all new endpoints
- Update `CHANGELOG.md` to v3.1.0

---

## Complete File Change Map

### Modified (existing files)

| File | Change |
|---|---|
| `backend/app/api/v1/endpoints/geospatial.py` | Remove SP bounds; use Brazil shapefile |
| `backend/app/api/v1/endpoints/municipalities.py` | Remove SP admin region hardcoding |
| `backend/app/api/v1/endpoints/analysis.py` | Add Brazil-wide query path |
| `frontend/src/app/[locale]/map/page.tsx` | Expand to Brazil bounds; drill-down |
| `CHANGELOG.md` | v3.1.0 entry |

### New (created files)

| File | Purpose |
|---|---|
| `scripts/load_national_intermediate_data.py` | ETL: aggregate data → 133 intermediate regions |
| `backend/app/api/v1/endpoints/intermediate_regions.py` | National REST endpoints |
| `backend/app/services/economic_service.py` | Leontief I-O model (scipy.sparse) |
| `frontend/src/app/[locale]/dashboard/clusters/page.tsx` | Cluster visualization |
| `frontend/src/app/[locale]/dashboard/economic-simulation/page.tsx` | Simulation UI |

### Run existing (no code changes needed)

| Asset | Action |
|---|---|
| `backend/migrations/br_intermediary_regions_distances.sql` | Run migration in Supabase |
| `data/fde_all_residues.json` | Load as-is into national pipeline |
| `backend/data/shapefiles/brazil/` | Point geospatial.py to this path |

---

## Reusable Components

| Asset | Reuse in |
|---|---|
| `scripts/calculate_fde_all_residues.py` | Sprint 2 data pipeline |
| `backend/app/services/proximity_service.py` `MAPBIOMAS_RESIDUOS_MAPPING` | Sprint 2 national aggregation |
| `backend/app/services/cache_service.py` | Sprint 3 + Sprint 5 endpoints |
| `frontend/src/components/analysis/charts/TopMunicipalitiesChart.tsx` | Sprint 4 national rankings |
| `frontend/src/components/analysis/charts/RegionalPieChart.tsx` | Sprint 6 cluster profiles |
| All existing `frontend/src/components/analysis/charts/` | Sprint 7 simulation outputs |

---

## Academic Paper Alignment

| Paper Section | Platform Feature | Target Date |
|---|---|---|
| Methodology (FDE framework) | Already live on platform | Now |
| SP State validation & results | Already live on platform | Now |
| National biogas potential mapping | Phase 1 — intermediate region map | June 2026 |
| Cluster identification & characterization | Phase 2 Sprint 6 | July 2026 |
| Economic impact modeling (Leontief) | Phase 2 Sprint 5 | July 2026 |
| Scenario simulation & sensitivity | Phase 2 Sprint 7 | August 2026 |

---

## Data Sources Reference

| Source | Geographic Level | Variables | Status |
|---|---|---|---|
| PAM/IBGE | Municipal (5,570) | Soy, sugarcane, corn production | Ready to load |
| CONAB | State (27) | Soy, sugarcane, corn by state | Ready to load |
| MapBiomas | Pixel → Municipal/Regional | Annual land use 2000–2023 | Partially integrated |
| TerraClass | Pixel → Regional | Biennial deforestation/agriculture | Ready to load |
| IBGE Intermediate Regions | Regional (133) | Population, area, density | Ready to load |
| Road network | National | Highways, roads | Ready to load |
| Energy infrastructure | National | Substations, transmission | Ready to load |
| Gas pipelines | National | Pipeline network | Ready to load |
| IBGE I-O tables (67 sectors) | National | Economic multipliers | Economics team |
| ABIOVE | Municipal/Regional | Correction factors | Integrated (FDE) |
| **ANP Dados Abertos (Biometano)** | **Plant-level + state monthly** | **Authorized capacity, processed volume, utilization %** | **Dataset committed (`analysis/data/05c–05f`); not yet in DB** |
| **ANEEL Geração Distribuída (Biogás)** | **Plant/unit-level (546 units, 152 MW)** | **Installed kW, subtype, class, coords** | **Dataset committed (`analysis/data/05g–05h`); not yet in DB** |

---

## Backlog — Real-World Validation Dataset (added June 2026)

**Why this matters:** We now hold *scientifically usable, source-linked real-world data* on actual
biogas/biomethane plants in Brazil (SP-first) — the empirical counterpart to the model's *potential*
estimates. This is the foundation for a validation layer and for tracking real plant development in
São Paulo. **Do not lose this.**

**What exists now (committed, dataset-only — see `docs/data/BIOGAS_PLANTS_DATASET.md`):**
- `analysis/data/05_biogas_plants_brazil.csv` — 28 plants (20 ANP biomethane + 8 power/planned).
- ANP biomethane: latest snapshot (`05c`), state monthly production 2020→2026 (`05d`), plant monthly
  volume/utilization (`05e`), fleet stats (`05f`). Raw sources vendored under `analysis/data/sources/`.
- ANEEL GD electricity: 546 biogas units, 152 MW (`05g`, `05h`).
- Schema is `validation_plants`-compatible (migration `010`).

**Future work (deferred, in priority order):**
1. **Load into `validation_plants` + wire the map** — build `backend/scripts/load_plants_data.py`
   (pattern: `cp2b_load_data.py`) and surface via `/api/v1/infrastructure/biogas-plants/geojson` +
   `InfrastructureLayer.tsx`. De-dup the 34 SP ANEEL-GD units against the existing
   `Plantas_Biogas_SP.shp` layer (provenance unconfirmed) by coordinate proximity + capacity.
2. **Validation comparison for research queries** — join ANP plant municipalities to the model's
   predicted potential; produce *predicted potential vs authorized capacity vs actual output* per
   municipality (Piracicaba, Narandiba, Caieiras, Paulínia, …). Key insight already visible: fleet
   runs at **~21% median utilization**, so realized output ≪ potential — compare ceilings
   (potential vs authorized capacity), with actual production as a reality-check column.
3. **Track SP plant development over time** — the ANP monthly series enables a live "real plants vs
   modeled potential" dashboard for São Paulo.
4. **ANEEL centralized (SIGA) generation** — larger UTEs not in the GD file; 1.5 GB source is local
   to the owner. Join key `CodGeracaoDistribuida`.

**Strict rule carried forward:** electrical capacity (kW/MW) and gas volume (Nm³/day) stay in
separate columns — never conflated; aggregates kept separate from plant-level rows.

---

*Generated: April 25, 2026 | PILAR-2b v3.0.2 · updated June 13, 2026 (real-world validation dataset)*
