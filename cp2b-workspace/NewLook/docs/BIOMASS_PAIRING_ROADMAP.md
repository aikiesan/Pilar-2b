# PILAR-2b — Biomass Pairing Visualization: Full Project Roadmap

## 1. Current State (as of 2026-05-03)

### 1.1 Infrastructure
| Layer | Tech | Status |
|-------|------|--------|
| DB | PostgreSQL 15 + PostGIS 3.4 (`cp2b-db-dev`) | ✅ Running |
| Backend | FastAPI + uvicorn --reload (`cp2b-backend-dev`, port 8000) | ✅ Running |
| Frontend | Next.js 16 + Turbopack (`cp2b-frontend-dev`, port 3006) | ✅ Running |
| URL | `http://localhost:3006/pilar2b/pt-BR/map` | ✅ Working |
| Root redirect | `http://localhost:3006/` → `/pilar2b/pt-BR` | ✅ Added today |

### 1.2 Database Schema (key tables)

**`municipalities`** — 645 rows, all with PostGIS geometry
- `ibge_code` (PK), `municipality_name`
- `geometry(MultiPolygon,4326)`, `centroid(Point,4326)`
- Pre-aggregated biogas columns: `total_biogas_m3_year`, `agricultural_biogas_m3_year`, `livestock_biogas_m3_year`, `urban_biogas_m3_year`, `rsu_biogas_m3_year`, `rpo_biogas_m3_year`
- Per-crop biogas: `sugarcane/soybean/corn/coffee/citrus_biogas_m3_year`
- Per-livestock biogas: `cattle/swine/poultry/aquaculture_biogas_m3_year`
- Biomass tonnage: `*_biomass_tons_year` / `*_residues_tons_year`
- `potential_category` (ALTO / MEDIO / BAIXO / SEM DADOS — computed at query time)
- `forestry_biogas_m3_year` (stubbed = 0, pipeline not yet built)

**`residuos`** — 38+ waste/residue types with biochemical constants
- `bmp` (Biochemical Methane Potential, m³ CH4/ton VS)
- `ts_percent` (Total Solids %), `vs_ts_ratio` (Volatile Solids / Total Solids)
- `cn_ratio` (Carbon:Nitrogen ratio) ← **key field for pairing**
- `fde_disponibilidade`, `fde_eficiencia` (availability & efficiency factors)
- Linked to `sectors` / `subsectors`

**`sectors` / `subsectors`** — taxonomy: Agricultural, Livestock, Urban, Aquaculture

**Infrastructure tables** — `gas_pipelines`, `power_substations`, `power_transmission_lines`, `wastewater_treatment_plants`, `biogas_plants`

### 1.3 Backend API Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/v1/municipalities/geojson` | 645 polygons with full biogas props | ✅ Working |
| GET | `/api/v1/municipalities/` | Paginated list | ✅ Working |
| GET | `/api/v1/municipalities/{id}` | Single municipality detail | ✅ Working |
| GET | `/api/v1/municipalities/stats/summary` | Totals | ✅ Working |
| GET | `/api/v1/geospatial/municipalities` | Basic list from PostGIS | ✅ Working |
| GET | `/api/v1/geospatial/statistics/summary` | SP-wide stats | ✅ Working |
| GET | `/api/v1/geospatial/municipalities/centroids` | Point layer | ✅ Working |
| GET | `/api/v1/geospatial/municipalities/polygons` | Polygon layer (geospatial.py) | ✅ Working |
| GET | `/api/v1/geospatial/proximity` | ST_DWithin proximity analysis | ✅ Working |
| GET | `/api/v1/codigestion/residue-cn-matrix` | C/N ratios for all residue types | ✅ Working |
| GET | `/api/v1/codigestion/clusters` | Pre-computed pairing clusters | ✅ Working |

### 1.4 Frontend Pages

| Route | Description | Status |
|-------|-------------|--------|
| `/pt-BR/map` | Main interactive map (Leaflet + biogas choropleth) | ✅ Working |
| `/pt-BR/dashboard` | Dashboard shell | ✅ Working |
| `/pt-BR/dashboard/proximity` | Proximity analysis UI | ✅ Built |
| `/pt-BR/dashboard/advanced-analysis` | Advanced filters | ✅ Built |
| `/pt-BR/dashboard/compare` | Municipality comparison | ✅ Built |
| `/pt-BR/dashboard/scientific-database` | Residue DB browser | ✅ Built |
| `/pt-BR/dashboard/technology-routes` | Technology pathways | ✅ Built |

### 1.5 Data Sources
- **Tabular**: `A:/CP2B_Maps_V2/data/database/cp2b_maps.db` (SQLite, 645 municipalities)
- **Spatial**: `A:/CP2B_Maps_V2/data/shapefile/SP_Municipios_2024.shp` (IBGE 2024, EPSG:4674→4326)
- **Biochemical constants**: `backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx`

### 1.6 Seeding Commands (fresh install)
```bash
# 1. Run all migrations
for f in backend/app/migrations/0*.sql; do
  cat "$f" | docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps
done

# 2. Seed municipalities (tabular)
python backend/scripts/import_v2_municipalities.py

# 3. Import geometry
python backend/scripts/import_shapefile_geometry.py

# 4. Seed residue/technology data
cat backend/data/seed_technologies_expanded.sql | docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps
```

---

## 2. The Science: C/N Co-digestion Pairing

### 2.1 Why C/N Ratio Matters
Anaerobic digestion requires a carbon:nitrogen ratio of **20–30:1** for optimal methanogenesis. Outside this window:
- **C/N < 20** (too much N): ammonia toxicity, process inhibition
- **C/N > 30** (too much C): nitrogen starvation, low biogas yield

### 2.2 Residue C/N Profiles (from `residuos` table)

| Category | Residue Type | Typical C/N | Label |
|----------|-------------|-------------|-------|
| **C-rich** | Sugarcane bagasse | 80–150 | ← LEFT |
| **C-rich** | Corn stover | 60–100 | ← LEFT |
| **C-rich** | Soybean straw | 50–80 | ← LEFT |
| **C-rich** | Coffee husks | 40–60 | ← LEFT |
| **Balanced** | Citrus waste | 25–35 | CENTER |
| **N-rich** | Cattle manure | 10–25 | RIGHT → |
| **N-rich** | Swine manure | 6–10 | RIGHT → |
| **N-rich** | Poultry manure | 3–8 | RIGHT → |
| **N-rich** | RSU (municipal waste) | 15–25 | RIGHT → |
| **N-rich** | Wastewater sludge | 5–15 | RIGHT → |

### 2.3 Municipality C/N Profile (weighted average)
Each municipality's effective C/N = Σ(biomass_tons × cn_ratio) / Σ(biomass_tons) across all active residue streams.

- **LEFT municipality**: dominant agricultural biomass → high C/N → needs a N-rich partner
- **RIGHT municipality**: dominant livestock / urban → low C/N → needs a C-rich partner
- **BALANCED**: C/N already 20–30 → can co-digest internally

### 2.4 Pairing Score Formula
```
improvement = |cn_before - 25| - |cn_blended - 25|
```
Where `cn_blended = (biomass_A × cn_A + biomass_B × cn_B) / (biomass_A + biomass_B)`

Higher score = greater improvement from pairing.

---

## 3. Full Feature Roadmap

### Phase 0 — Backend: C/N Municipality Profile Endpoint ✅ Partial
**Goal:** Expose per-municipality C/N data via API.

**What exists:**
- `/api/v1/codigestion/residue-cn-matrix` returns C/N per residue type
- `/api/v1/codigestion/clusters` identifies pairings (uses `codigestion_service.py`)

**What's missing:**
- `GET /api/v1/codigestion/municipality-cn-profiles` — returns one record per municipality:
  ```json
  {
    "ibge_code": "3505708",
    "municipality_name": "Barretos",
    "cn_ratio_weighted": 42.3,
    "cn_label": "C-RICH",
    "dominant_residue": "sugarcane",
    "total_biomass_tons_year": 180000,
    "residue_breakdown": {
      "sugarcane": { "tons": 150000, "cn": 95, "biogas_m3": 2100000 },
      "cattle":    { "tons":  30000, "cn": 18, "biogas_m3":  420000 }
    }
  }
  ```
- `GET /api/v1/codigestion/pairing-candidates?ibge_code=3505708&radius_km=50` — for a selected municipality, returns ranked pairing partners within radius

**Files to create/modify:**
- `backend/app/services/codigestion_service.py` — add `get_municipality_cn_profiles()` and `get_pairing_candidates(ibge_code, radius_km)`
- `backend/app/api/v1/endpoints/codigestion.py` — add two new routes

---

### Phase 1 — Map Layer: C/N Choropleth
**Goal:** Color municipalities on the map by their C/N profile instead of (or in addition to) total biogas.

**Map color scheme:**
| Color | Meaning | C/N Range |
|-------|---------|-----------|
| 🔵 Deep blue | Strongly C-rich | > 60 |
| 🟦 Light blue | Moderately C-rich | 40–60 |
| 🟢 Green | Balanced (optimal) | 20–40 |
| 🟠 Orange | Moderately N-rich | 10–20 |
| 🔴 Red | Strongly N-rich | < 10 |

**Implementation:**
- Add `colorMode` toggle to the map toolbar: `[Biogas Potential] [C/N Profile] [Pairings]`
- When `C/N Profile` active: fetch `/api/v1/codigestion/municipality-cn-profiles`, re-color map
- Legend updates to show C/N scale instead of ALTO/MEDIO/BAIXO

**Files to modify:**
- `frontend/src/app/[locale]/map/` — map page component
- New: `frontend/src/components/map/CnChoroLayer.tsx` — Leaflet layer for C/N coloring
- New: `frontend/src/components/map/MapToolbar.tsx` — color mode selector
- New: `frontend/src/hooks/useCnProfiles.ts` — data fetching hook

---

### Phase 2 — Pairing Selection UI
**Goal:** Click any municipality → see compatible pairing partners highlighted on the map.

**Interaction flow:**
1. User clicks a municipality polygon
2. Side panel opens showing:
   - Municipality name, C/N ratio, dominant residue, total biomass
   - "Find Pairing Partners" button + radius slider (10–100 km)
3. Map highlights candidate partners color-coded by pairing improvement score
4. Side panel lists top 5 partners with:
   - Distance, blended C/N, improvement score, combined biogas potential
   - "Add to comparison" action

**Files to create:**
- `frontend/src/components/map/PairingPanel.tsx` — sliding right panel
- `frontend/src/components/map/PairingCandidateCard.tsx` — individual partner card
- `frontend/src/hooks/usePairingCandidates.ts` — fetches `/codigestion/pairing-candidates`

---

### Phase 3 — Cluster View (Pre-computed Optimal Groups)
**Goal:** Show the globally optimal clusters of municipalities for co-digestion.

**What exists:** `/api/v1/codigestion/clusters` already returns clusters with:
- Centroid location, member municipalities, residue pairs, improvement scores

**Frontend work:**
- New map layer: draw convex hulls around cluster members
- Cluster card in sidebar: list members, residue mix, total biogas if co-digested
- Filter by: min improvement score, max radius, min total biomass

**Files to create:**
- `frontend/src/components/map/ClusterHullLayer.tsx`
- `frontend/src/components/map/ClusterSidebar.tsx`

---

### Phase 4 — Residue Breakdown Popup
**Goal:** Clicking a municipality shows a detailed breakdown of ALL residue types, their C/N, tonnage, and biogas contribution — the full "left/right" spectrum visualized as a bar.

**Visual:** Horizontal stacked bar:
```
← C-RICH                               N-RICH →
[==sugarcane 62%==][==corn 18%==][cattle 15%][swine 5%]
                         ↑ blended C/N = 48
                    optimal zone: 20–30
```

**Files to create:**
- `frontend/src/components/map/ResidueBreakdownPopup.tsx`
- `frontend/src/components/charts/CnSpectrumBar.tsx`

---

### Phase 5 — Dashboard: Pairing Analysis Page
**Goal:** Full-screen analysis tool for researchers.

**Features:**
- Table of all 645 municipalities with sortable columns: C/N, dominant residue, total biomass, nearest suitable partner
- Filters: by region, by C/N label (C-rich / N-rich / balanced), by minimum biomass
- Matrix view: 645×645 heatmap of pairing improvement scores (virtualized)
- Export: CSV download of top N pairing opportunities

**Route:** `/pt-BR/dashboard/biomass-pairing` (new page)

**Files to create:**
- `frontend/src/app/[locale]/dashboard/biomass-pairing/page.tsx`
- `frontend/src/components/dashboard/PairingMatrix.tsx`
- `frontend/src/components/dashboard/MunicipalityPairingTable.tsx`

---

### Phase 6 — Forestry / Silviculture Data Pipeline
**Goal:** Populate `forestry_biogas_m3_year` (currently stubbed as 0).

**Steps:**
1. Source: MapBiomas SP eucalyptus/pine area data (available as GeoTIFF or CSV)
2. New ETL script: `backend/scripts/load_forestry_biomass.py`
3. Update `import_v2_municipalities.py` to include silvicultura (`biogas_silvicultura_m_ano` already in SQLite)

---

### Phase 7 — Production Deploy (Unicamp VM)
**Goal:** Mirror the local Docker setup on the Unicamp VM.

**Steps:**
1. Install Docker + Docker Compose on VM
2. Copy `docker-compose.yml` + `.env.docker`
3. Run full seeding sequence (migrations → tabular → geometry)
4. Configure nginx reverse proxy: `/pilar2b` → port 3006, `/pilar2b/api` → port 8000
5. Set `NEXT_PUBLIC_API_URL=https://cp2b.unicamp.br/pilar2b/api` in `.env.docker`
6. Set up systemd service for auto-restart

---

## 4. Implementation Order (Priority Queue)

| Priority | Phase | Effort | Value |
|----------|-------|--------|-------|
| 1 | Phase 0 — Backend C/N endpoint | 2h | Unblocks all visualization |
| 2 | Phase 1 — C/N choropleth layer | 3h | Core visual feature |
| 3 | Phase 4 — Residue breakdown popup | 2h | Instant insight on click |
| 4 | Phase 2 — Pairing selection UI | 4h | Main interaction feature |
| 5 | Phase 3 — Cluster view | 3h | Pre-computed optimal groups |
| 6 | Phase 5 — Dashboard pairing page | 4h | Power-user tool |
| 7 | Phase 6 — Forestry pipeline | 3h | Data completeness |
| 8 | Phase 7 — Unicamp VM deploy | 2h | Production |

---

## 5. Key File Locations

```
NewLook/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── municipalities.py     ← /municipalities/geojson (PostGIS)
│   │   │   ├── codigestion.py        ← /codigestion/clusters, /residue-cn-matrix
│   │   │   └── geospatial.py         ← /geospatial/proximity, centroids
│   │   ├── services/
│   │   │   └── codigestion_service.py ← cluster logic, C/N math
│   │   ├── core/
│   │   │   ├── config.py             ← CORS origins, DB URL
│   │   │   └── database.py           ← get_db() context manager
│   │   └── migrations/
│   │       └── 013_add_missing_columns.sql ← forestry, potential_category
│   ├── scripts/
│   │   ├── import_v2_municipalities.py ← seeds 645 municipalities from SQLite
│   │   └── import_shapefile_geometry.py ← populates geometry from .shp
│   └── data/
│       └── FDE_Disponibilidade_Residuos_CP2B.xlsx ← biochemical constants
├── frontend/
│   ├── src/
│   │   ├── app/[locale]/
│   │   │   ├── map/                  ← main map page
│   │   │   └── dashboard/            ← all dashboard sub-pages
│   │   ├── components/
│   │   │   ├── map/                  ← Leaflet layers and panels
│   │   │   └── HtmlLang.tsx          ← lang attr setter
│   │   └── lib/
│   │       └── geospatialClient.ts   ← all API calls
│   └── next.config.js                ← basePath=/pilar2b, redirects
└── docker-compose.yml                ← 3-container dev stack
```

---

## 6. Next Session: Start Here

```bash
# 1. Start Docker stack
docker compose up -d

# 2. Verify DB (if fresh install, run seeding commands from §1.6)
docker exec cp2b-db-dev psql -U postgres -d cp2b_maps \
  -c "SELECT COUNT(*) FROM municipalities WHERE geometry IS NOT NULL;"
# Expected: 645

# 3. Check map
# http://localhost:3006/pilar2b/pt-BR/map

# 4. First task: implement Phase 0 backend endpoint
# backend/app/services/codigestion_service.py → add get_municipality_cn_profiles()
# backend/app/api/v1/endpoints/codigestion.py → add GET /municipality-cn-profiles
```
