# PILAR-2b / CP2B Maps — Platform Overview & Development History

> **Internal reference document — NIPE/UNICAMP CP2B.**
> Snapshot: **v3.0.3** · June 2026. Combines the platform's development timeline with a full
> structural breakdown of the system as it exists today (architecture, methodology, data, governance,
> stack), plus an honest **implemented-vs-aspirational** ledger.
>
> Sources: repository code, `CHANGELOG.md`, `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md`,
> `docs/planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md`, and the canonical parameter/migration set.

---

## 0. The arc in one sentence

From a **Streamlit prototype** (`cp2b_maps`, Folium + SQLite) → a complete re-platform into a
**Next.js + FastAPI + PostGIS microservices system** (`NewLook`, ~967 commits) → **INPI-registered and
live** at cp2b.unicamp.br (`Pilar-2b`, v3.0.3) → **scientifically audited** (FDE + 100%-forward
methodology) → now **validated against real-world ANP/ANEEL plant data**, with the leap from São Paulo
to national coverage already scaffolded.

### Repository lineage
| Repo | Role | Signal |
|---|---|---|
| `cp2b_maps` | Streamlit **prototype** (V1→V2) | ~87 commits · Python 99.5% · Folium + SQLite/GeoParquet · 15 residue types · 645 municipalities |
| `NewLook` | V3 **engine room** (full dev history) | ~967 commits · TypeScript 46% / PLpgSQL 31% / Python 21% · Vercel |
| `Pilar-2b` | Public, **INPI-registered release** | Clean mirror · v3.0.3 · cp2b.unicamp.br |

The 87 → 967 commit jump is the V2→V3 re-platforming story in one number.

---

## 1. Development Timeline

| Era | When | Version / Repo | Milestone |
|---|---|---|---|
| **0 — Streamlit prototype** | ~2025 | `cp2b_maps` | Folium maps, SQLite + GeoParquet, 15 residue types, 645 municipalities, MapBiomas overlays. Proved the concept; couldn't scale. |
| **1 — V2 baseline** | 2025-10-13 | `2.0.0` | 8 functional modules, **Bagacinho IA (RAG)**, WCAG 2.1 Level A, 20+ references, FAPESP-validated data. |
| **2 — V3 pivot** | 2025-11-16 | `3.0.0-alpha` / `NewLook` | Re-platform to **Next.js + FastAPI + PostGIS** microservices. |
| **3 — Hardening** | 2025-12-07 | `3.0.1` | Streamlit legacy removed (~97 MB); repo 120→23 MB (−80%); patched **CVE-2025-66478 (CVSS 10.0 RCE)**. |
| **4 — Public-readiness** | 2026-04-12 | `3.0.2` | Internal infra stripped from public repo; further CVE pinning. |
| **5 — Institutionalization** | 2026-05-18 | `3.0.3` | **INPI BR512026003115-0** (50-yr); **live** at cp2b.unicamp.br (Apache2 + PM2); Sankey flows. |
| **6 — Scientific-rigor sprint** | 2026-05 → 06 | migrations 012→016 | 100%-forward methodology; FDE audit; **IBGE PAM unit correction** (cane → 4 sub-streams; citrus ×0.50) removing a 3.6× cane / ~2× citrus over-estimate; FIESP benchmark; reference unification + DOI audit; kinetic curves. |
| **7 — Real-world validation & national scaffolding** | 2026-06 | `analysis/`, migration 007 | **ANP biomethane** (20 plants, monthly 2020→2026, utilization) + **ANEEL biogas-electricity** (546 units, 152 MW) as a validation layer; **133 IBGE intermediate regions** live. |

---

## 2. Full Platform Structure (current state)

### 2.1 API Architecture
- **REST-only FastAPI** backend (no GraphQL). OpenAPI/Swagger auto-schema at `/docs` (non-prod only),
  `/openapi.json` available.
- **Internal consumption only** — CORS locked to `cp2b.unicamp.br`, Vercel previews, Cloudflare Pages,
  and localhost dev ports. No public/external API yet.
- **Endpoint groups** (`/api/v1/`, ~15): `auth`, `municipalities` (645 SP + GeoJSON), `geospatial`
  (PostGIS, buffers, bounds), `analysis` (residue aggregation), `maps`, `infrastructure` (railway,
  pipeline, substation proximity), `proximity` (1–100 km + MapBiomas), `mapbiomas` (raster tiles,
  Collection 8), `residuos` (50+ types, BMP/TS/VS + references), `statistics`, `scientific` (kinetics),
  `technology-routes` (10+ pathways), `codigestion` (C:N clustering), `intermediate-regions`
  (133 IBGE regions), `calculator` (viability + lead capture).
- Auth: **JWT (HS256) + HTTP Bearer**; Supabase integration partially deprecated in favor of local
  PostgreSQL. Rate limiting via `slowapi`.
- Key files: `backend/app/api/v1/api.py` (routing), `backend/app/api/v1/endpoints/`.

### 2.2 Biomass Potential Methodology
- **Potential tiers:**
  - **Theoretical** = `biomass_wet × (TS/100) × (VS_of_TS/100) × BMP` (no FDE).
  - **Technical (practical)** = theoretical `× FDE`.
  - **Economic** = viability/payback via `/calculator` (no explicit spatial economic-potential tier yet).
- **FDE = FC · FCo · FS · FL · η** — collection efficiency × competing-use × seasonal availability ×
  logistical constraints × conversion efficiency, each as a **min/medio/max** band → uncertainty is
  *factor-attributable*, not a black box.
- **Scenarios:** canonical **min / medio / max** propagation. A **named-scenario layer**
  (Linha de Base / Médio Prazo / Otimista + **"Fronteira do Biogás"**) is partially landed on the
  frontend and slated for full API/docs rollout (Phase 3).
- **IBGE PAM unit correction (Phase 1):** sugarcane decomposed into **4 sub-streams**
  (bagaço ×0.280, torta ×0.030, palha ×0.053, vinhaça ×0.420); citrus peel ×0.50 (FUNDECITRUS).
  Removed a **3.6× cane** and **~2× citrus** systematic over-estimate.
- **Defensible SP result (medio, Phase 1-corrected):** biogás **6.39 M m³/day** (envelope 1.32–25.78);
  CH₄ 3.57; biometano 3.46. Sugar-energy complex = **64.9%**. Guarded by **11 regression tests**
  (`test_biomass_residue_fractions.py`).
- Key files: `backend/app/services/biogas_forward.py`, `canonical_loader.py`,
  `backend/scripts/compute_sp_canonical_totals.py`, `data/canonical_parameters/feedstocks.yaml`.

### 2.3 ML / Spatial-Analytics Methods
- **Implemented (deterministic spatial analytics):**
  - **Co-digestion clustering** — Union-Find spatial grouping (haversine ≤30 km) scored by **C:N
    complementarity** toward the 20–30 optimum. *Feasibility screening, not a build recommendation.*
    (`backend/app/services/codigestion_service.py`)
  - **Proximity analysis** — PostGIS buffers (1–100 km) + MapBiomas land-use aggregation; 5-min cache.
  - **Infrastructure overlay** — distance to railway, pipeline, substation.
- **Aspirational / roadmap:** **MCDA** (test scaffold exists; endpoint logic minimal), **siting
  optimization** (beyond proximity + cluster screening), classic clustering (k-means/DBSCAN — not used;
  union-find chosen instead). scikit-learn is available in the stack.

### 2.4 Data Sources & Spatial Levels
- **Sources:** MapBiomas (Collection 8), IBGE/PAM (Produção Agrícola Municipal), IBGE Census 2022
  (population) + 2017 (intermediate-region boundaries), CONAB (state crops), UNICA/CONSECANA
  (sugarcane), FUNDECITRUS (citrus peel 50%), EMBRAPA (generation factors). **ANP** (biomethane) and
  **ANEEL** (biogas electricity) now exist as a **dataset layer in `analysis/data/`** but are **not yet
  wired into the backend/DB**.
- **Spatial granularity:** **645 SP municipalities** (primary, live) · **133 IBGE intermediate regions**
  (Phase-1 national-expansion, live) · full Brazil 5,570 municipalities (roadmap).
- **Geographic gating:** SP bounds enforced in `geospatial.py` (lat [-25,-19], lon [-54,-44]);
  "remove geographic constraints" is an explicit Phase-1 roadmap task.

### 2.5 Data Versioning / Citation / Governance
- **Single source of truth:** dated, versioned `data/canonical_parameters/feedstocks.yaml`
  (38 feedstocks) auto-propagated to SQL/Python/TypeScript via a generator script.
- **References:** `references_unified.csv` (DOIs, peer-review flags, suspect-DOI detection); ~58
  curated references; DOI/URL audit docs under `docs/data/`.
- **Migrations:** Alembic-versioned (001→017); latest `016_canonical_sync.sql`,
  `017_create_calculator_leads.sql`. `010_create_validation_plants.sql` **exists** (real-world
  predicted-vs-measured table) but is **not yet populated** — the ANP/ANEEL dataset is the intended feed.
- **IP / citation:** **INPI BR512026003115-0** (50-yr, SHA-512 hash, Law 9.609/1998); GPL-3.0;
  FAPESP 2024/01112-1 (CP2Bsd) and 2025/08745-2 (national expansion). **Zenodo dataset DOIs** are a
  roadmap item (for API-bound citation traceability).

### 2.6 Tech Stack Specifics
- **Backend:** FastAPI 0.136, Uvicorn 0.47, SQLAlchemy 2.0, Alembic; GeoPandas/Shapely/PyProj/Rasterio;
  Pandas/NumPy/scikit-learn; JWT auth; slowapi rate limiting.
- **Database:** **PostgreSQL 15 + PostGIS 3.4**.
- **Frontend:** Next.js 16.2, React 19, TypeScript 5.7, Tailwind 3.4, React-Leaflet + Leaflet.heat,
  Recharts/Chart.js, TanStack Query, next-intl (pt-BR/en), Jest + Playwright.
- **Deployment:** Docker Compose (dev); **Apache2 + PM2** on the UNICAMP VM (`cp2b.unicamp.br`);
  Vercel + Cloudflare Pages (frontend mirrors). Sentry observability is in progress (Unreleased).

---

## 3. Summary — Implemented vs Aspirational

| Capability | Status | Notes |
|---|---|---|
| REST API (FastAPI, OpenAPI) | ✅ Implemented | 15 endpoint groups; internal-only (CORS-locked) |
| GraphQL / public API | ❌ Not yet | Under evaluation for interoperability (QGIS/GEE/dashboards) |
| FDE framework (FC·FCo·FS·FL·η) | ✅ Implemented | 38 feedstocks; min/medio/max bands |
| Theoretical & technical potential | ✅ Implemented | Economic = viability calculator only |
| Named scenarios (incl. Fronteira do Biogás) | ⏳ Partial | min/medio/max canonical; named layer rolling out (Phase 3) |
| Co-digestion clustering (C:N, Union-Find) | ✅ Implemented | Feasibility screening only |
| MCDA / siting optimization | ⏳ Roadmap | Test scaffold; not deployed |
| MapBiomas integration | ✅ Implemented | Collection 8 |
| 645 SP municipalities | ✅ Implemented | Primary spatial unit |
| 133 IBGE intermediate regions | ✅ Implemented | Phase-1 national expansion |
| National 5,570-municipality coverage | ❌ Roadmap | SP gating still active |
| `validation_plants` table | ⚠️ Exists, unpopulated | Migration 010; ANP/ANEEL is the intended feed |
| ANP/ANEEL real-world data | ⚠️ Dataset only | In `analysis/data/`; not yet wired to DB/map |
| Canonical YAML → multi-layer generation | ✅ Implemented | SQL/Python/TS from one source |
| INPI registration | ✅ Implemented | BR512026003115-0 |
| Zenodo dataset DOIs | ❌ Roadmap | For citation-bound API responses |
| Bagacinho IA assistant | ⏳ Roadmap | RAG port from V2 |
| WCAG 2.1 AA | ⏳ Roadmap | V2 reached Level A |
| Sentry observability | ⏳ In progress | Unreleased changelog entry |

---

## 4. Key Figures

| Metric | Value |
|---|---|
| Current version | **v3.0.3** (API 3.0.1 / frontend 3.0.0) |
| Spatial coverage | **645 SP municipalities** + **133 IBGE intermediate regions** |
| Residue / feedstock coverage | 50+ residue types · **38 canonical feedstocks** · ~58 references |
| Technology pathways | 10+ |
| SP mobilisable potential (medio) | **6.39 M m³/day biogás** (envelope 1.32–25.78); CH₄ 3.57; biometano 3.46 |
| Sugar-energy share of potential | **64.9%** |
| FIESP positioning | ~56% of SEMIL/FIESP 2024 viable benchmark (11.4 Mm³/d) — by design (real-availability penalised) |
| Real-world validation data | **20 ANP biomethane plants** (~1.23 M m³/d authorized; ~21% median utilization) · **546 ANEEL units** (152 MW) |
| Database | PostgreSQL 15 + PostGIS 3.4; migrations 001→017 |
| Frontend / backend | Next.js 16.2 / React 19 · FastAPI 0.136 |
| INPI | BR512026003115-0 (issued 2026-05-12, valid 50 yr) |
| Funding | FAPESP 2024/01112-1 · 2025/08745-2 |
| Dev footprint | `cp2b_maps` ~87 commits → `NewLook` ~967 commits → `Pilar-2b` v3.0.3 |

---

## 5. Roadmap Pointers
- **Phase 2** — spatial livestock differentiation (dairy-intensive East vs extensive West; distinct FDE).
- **Phase 3** — named scenarios + "Fronteira do Biogás" across API/frontend/docs.
- **Validation** — populate `validation_plants` from ANP/ANEEL; wire predicted-vs-actual to the map.
- **National expansion** — 133 regions → 5,570 municipalities; remove SP gating.
- **Economic modeling** — Leontief IBGE 67-sector I-O multipliers; MCDA siting optimization.
- **Interoperability** — public/API-first decision (evaluate GraphQL); Zenodo dataset DOIs.
- **Publications** — FOSS4G paper (supplement drafted); national-expansion paper; real-world validation study.

> Detailed forward plan: `docs/planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md`.
> Scientific status & next steps: `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md`.
