# PILAR-2b — Brazil Expansion Roadmap (July → December 2026)

> Master plan for scaling PILAR-2b from São Paulo (645 municipalities) to full
> national coverage (5,570 municipalities, 133 intermediate regions, 27 states),
> written for a solo developer working month-by-month from 2026-07-09 onward.
> Companion docs: `IMPROVEMENT_BACKLOG.md` (stability ledger),
> `POST_FOSS4G_ROADMAP.md` (tracks A–G), `docs/data/METADATA.json` (lineage).

_Created: 2026-07-03. Owner: Lucas Nakamura Cerejo (NIPE/CP2B UNICAMP)._

---

## 1. Where the platform stands today (code-analysis snapshot, 2026-07-03)

**Working and verified:**

- Backend: FastAPI + raw psycopg2 over PostGIS; 14 endpoint modules, 13
  services, migrations 001–020. 944 unit/integration tests pass; coverage
  ~58.7% (enforced floor 40%).
- Frontend: Next.js 16 + React, Leaflet 1.9 / react-leaflet 4. 597 tests in
  24 suites pass; a11y suite green (49/49).
- CI: root `.github/workflows/ci.yml` gates lint, build, unit tests, safety,
  a11y as **hard** gates (hardened over PRs #134/#135). E2E and Bandit remain
  soft gates with documented re-hardening conditions.
- PR #137 adds: internal JWT auth, PII log sanitizer, GeoServer provisioning +
  OGC assembly/acceptance/CITE test tiers — CI fixes for it were pushed
  2026-07-03 (PyJWT CVE-2026-32597 bump, WMS capabilities name fix,
  scanner-safe compose placeholders).

**Scale limits that block national coverage (the honest list):**

| # | Limit | Where | Why it breaks at 5,570 municipalities |
|---|-------|-------|--------------------------------------|
| 1 | Choropleth is raw GeoJSON rendered as SVG | `frontend/src/components/map/MunicipalityLayer.tsx` (react-leaflet `<GeoJSON>`) | 645 SVG polygon nodes already stutter on zoom; ~9× more DOM nodes is unusable. SVG re-transforms every node per zoom frame. |
| 2 | Layer remount on every filter change | `MunicipalityLayer.tsx:267` — `key={biomassType-displayMetric-opacity-...}` | Changing opacity alone tears down and re-creates the whole layer. At national scale each remount is seconds, not ms. |
| 3 | Geometry served as one GeoJSON blob | `backend/app/api/v1/endpoints/geospatial.py` (`/municipalities/geojson`, `ST_AsGeoJSON` + shapefile fallback at `simplify_tolerance=0.001`) | A national municipality GeoJSON is ~100–300 MB unsimplified; even simplified it's tens of MB per request. Needs tiles, not features. |
| 4 | Single-state assumptions | `SP_BBOX` constants, `SP_Municipios_2024` shapefile name, "645" hardcoded in tests/docs, seed scripts | Queries, fixtures, and copy assume SP. Needs a `state`/`uf` dimension and nationally keyed fixtures (7-digit `ibge_code` already helps). |
| 5 | Ingestion is script-per-source, no shared contract | `backend/scripts/load_*.py` (12+ one-off loaders) | Each new source re-invents CSV parsing, validation, idempotency. 7 new sources × 27 states needs one pipeline pattern, not 20 more scripts. |
| 6 | Known data discrepancies flagged but unresolved | `docs/data/METADATA.json` `_status_notes` | MapBiomas Collection 8 (code) vs 9 (paper) vs 10/10.1 (planned); IBGE PAM 2023 vs Censo Agro 2017; ANEEL 19.69 vs 6.39 MW/GW — all must be resolved before paper submission and before national ingest multiplies them. |

**Verdict:** the platform is stable and well-gated for SP. National expansion
is primarily a **data-pipeline and map-rendering** project, not a rewrite.
The backend query layer (keyed on 7-digit `ibge_code`) and the RGint tables
(133, national) already point the right way.

---

## 2. Guiding principles

1. **Validation-first ingestion.** No dataset reaches `main` without its
   validation suite passing in CI. Raw files are immutable snapshots;
   everything derived is reproducible from them.
2. **One source per PR.** Each ingest lands as: loader + staging table +
   validation tests + METADATA.json entry + docs. Small, revertible.
3. **Static data, yearly refresh.** Optimize for read: pre-compute, pre-tile,
   cache hard. <100 users means no premature scaling of serving infra —
   spend the effort on correctness and rendering.
4. **Gates before features** (carried from IMPROVEMENT_BACKLOG.md): never
   flip a red check to blocking; never merge with a red hard gate.
5. **Paper-grade traceability.** Every number the platform shows must trace
   to a METADATA.json source with reference year, URL/DOI, and retrieval date.

---

## 3. Target architecture for national scale

### 3.1 Database (PostGIS)

- Add `states` (27) and extend `municipalities` to 5,570 rows keyed on
  `ibge_code`; add `uf` + `cod_rgint` columns (RGint mapping is IBGE DR 2017,
  already present for the 133 regions).
- Partition or index residue/biomass tables by `uf` — query patterns are
  state- or region-scoped.
- Staging schema (`staging.*`) for every ingest; promotion to `public.*` only
  after validation passes. Keep `validation_plants` (ANEEL/ANP cross-check)
  as its own permanent table.
- Migrations stay sequential SQL files (021+…) as today.

### 3.2 Map serving: tiles, not features

Decision (recommended): **pre-generated vector tiles (PMTiles) for the static
yearly layers + GeoServer/OGC for interoperable access (already in PR #137).**

- Build pipeline: PostGIS → `ogr2ogr`/`tippecanoe` → one `.pmtiles` file per
  layer-year (municipal choropleth attributes baked in as feature properties).
- Serve as static files (Apache range requests — no tile server process to
  babysit on the UNICAMP VM).
- Keep FastAPI GeoJSON endpoints for small payloads (single municipality,
  RGint boundaries, point layers) — they are fine at that size.
- GeoServer (WMS/WFS from PR #137) remains the standards-compliant façade for
  QGIS users and the FOSS4G story; it is not the browser hot path.

### 3.3 Frontend: MapLibre GL migration

Replace Leaflet+SVG with **MapLibre GL JS** (WebGL vector-tile rendering):

- Solves zoom smoothness structurally (GPU rendering, no DOM per polygon).
- Style-driven choropleths: filter/metric changes become `setPaintProperty`
  calls (milliseconds) instead of layer remounts.
- Native PMTiles support via `pmtiles` protocol adapter.
- OSM basemaps (OpenFreeMap / Versatiles or self-hosted) replace raster tiles.
- Migration is incremental: `react-map-gl`/`maplibre` map behind the existing
  `MapComponent` prop surface, one layer at a time, tests ported per layer.
  Interim Leaflet relief (Month 1, before migration): `preferCanvas`,
  memoized style callbacks, remove the remount `key`, tune
  `zoomSnap`/`wheelPxPerZoomLevel`.

### 3.4 Ingestion framework (the "ingestion contract")

> **Status: implemented 2026-07-03** — `backend/ingest/` (gates, CLI runner,
> report writer) with `sources/aneel_siga/` as the copyable template and 48
> unit tests. Operational manual: `docs/data/INGESTION_GUIDE.md`.

One pattern for all sources, replacing one-off scripts:

```
backend/ingest/
  sources/<source_id>/
    fetch.py      # download/copy raw snapshot → data/raw/<source_id>/<yyyy>/
    load.py       # raw → staging.<source_id>_* (typed, keyed on ibge_code/uf)
    validate.py   # source-specific checks (see §5 gate list)
    promote.py    # staging → public tables, in one transaction
  runner.py       # CLI: python -m ingest run <source_id> --year 2024
```

Every `validate.py` must implement the **standard gate battery** (§5) plus
source-specific checks. CI runs validations against a seeded test DB; full
runs happen locally against the real DB and produce a written report in
`docs/data/ingest_reports/<source_id>_<year>.md`.

---

## 4. Data source master plan

### 4.1 Already documented in METADATA.json (carry to completion)

| Source | State today | Work to finish | Key validation |
|--------|-------------|----------------|----------------|
| **ANEEL / SIGA** | Referenced in #114/#137; not ingested | Ingest into `validation_plants`; **resolve the 19.69 vs 6.39 MW/GW discrepancy first** (unit audit: SIGA reports kW; likely a kW→MW→GW conversion slip — re-derive both numbers from the raw CSV and document) | Sum of biogas/biomass plant capacity per state vs ANEEL's own published totals (±1%); plant count per UF; CEG code uniqueness |
| **ANP** | Listed; P0 flag to ingest | Biomethane plants + supply data into validation pipeline | Cross-check plant list overlap with ANEEL SIGA (same plant, two registries); no orphan municipalities |
| **EPE / BEN** | Listed | National energy-balance reference series for the bioeconomics layer | Yearly totals vs published BEN tables (exact match) |
| **MAPA / UNICA / CONSECANA / FUNDECITRUS** | In METADATA; straw seasonality (~236 days) in FDE | Extend seasonality parameters beyond SP (center-south vs north-northeast harvest calendars differ) | Season-day sums per region within documented ranges; FDE factors re-validated per state |
| **MapBiomas** | Collection 8 in code, 9 in paper, 10/10.1 data in hand | **Reconcile to ONE collection (10.1) everywhere**: `mapbiomas_service.py`, correlation queries, paper supplement, METADATA.json | Class-area totals per municipality vs MapBiomas' own statistics platform (±0.5%); transition-matrix row/col sums equal class areas |
| **IBGE PAM / Censo Agro** | PAM 2023 (crops) + Censo Agro 2017 (livestock), flagged inconsistent | Resolve: they are *different streams* — document per-stream reference years explicitly in METADATA.json and the paper; upgrade livestock to PPM (yearly) where possible | Crop tonnage per state vs SIDRA API totals; herd counts vs PPM/SIDRA; no municipality with residue > state total |
| **SNIS** | Listed | Urban solid waste + sewage per municipality (national) | Per-capita generation within plausibility band (0.5–1.5 kg/hab/day); coverage % ≤ 100; missing-data map documented |

### 4.2 New sources (zero PR coverage yet)

| Source | Access | Feeds | Priority |
|--------|--------|-------|----------|
| **LAPIG pastures** | Raster download (Atlas das Pastagens) | Pasture quality/degradation × cattle-waste biogas crossings | P1 — high value, pairs with Censo/PPM livestock |
| **SINIR / IBAMA** | CSV/portal | Municipal solid-waste management plans → readiness scoring | P2 |
| **INMET** | Station REST API | Weather normals → biomass productivity modelling | P2 (static normals first; live API later) |
| **ANA Hidroweb** | REST API | River flow/rainfall → digestate/water constraints, restricted areas | P3 |
| **PRODES / DETER** | TerraBrasilis WFS/downloads | Deforestation → ILUC work + restricted-areas layer | P1 for ILUC paper |
| **RAIS / CAGED** | Microdata (large) | Agro-sector employment → bioeconomics readiness | P3 (aggregate at RGint level only) |
| **TCU / SICONFI** | REST API | Municipal fiscal capacity → implementation viability score | P3 |

### 4.3 Restricted-areas layers (new product surface)

Compose a national "no-go / caution" layer set for biogas plant siting:
conservation units (CNUC/ICMBio), indigenous lands (FUNAI), quilombola areas
(INCRA), APPs (rivers via ANA + slope), urban perimeters (IBGE), PRODES
embargoed areas (IBAMA). Each is an independent ingest under the same
contract; the composite is a boolean/graded raster or tile layer consumed by
the future grid-siting analysis (§7).

---

## 5. Validation, checks, tests — the standard gate battery

Every ingest must pass, in CI, before promote:

1. **Schema gate** — expected columns, types, non-null keys; every row keyed
   by valid 7-digit `ibge_code` (or `cod_rgint`/`uf`) that exists in the
   reference municipality table.
2. **Coverage gate** — row count per UF vs expected municipality counts
   (5,570 total; per-UF table from IBGE); explicit allowlist for legitimately
   missing municipalities, never silent gaps.
3. **Range gate** — every numeric column bounded by documented plausibility
   ranges (checked into `validate.py`, cited in METADATA.json notes).
4. **Aggregation gate** — municipal sums = state totals = national total
   against the source's own published aggregates (tolerance documented
   per source).
5. **Cross-source gate** — at least one consistency check against an
   *independent* source (e.g., ANEEL vs ANP plant lists; SNIS waste vs IBGE
   population; MapBiomas crop area vs PAM planted area, r² threshold).
6. **Idempotency gate** — running the loader twice yields identical tables
   (checksum of promoted rows).
7. **Lineage gate** — METADATA.json entry updated (version, reference year,
   URL, DOI, retrieval date — no `VERIFY` placeholders allowed for promoted
   sources).
8. **Regression gate** — the platform's headline numbers (SP mobilisable
   potential, plant counts, RGint rankings) recomputed and diffed; any change
   must be explained in the ingest report.

Test layers, mapped to the existing suites:

- **Unit** (pytest, hard gate): loaders' parsing/transform logic on fixture
  files (small real excerpts, checked in).
- **Integration** (pytest + PostGIS service container, hard gate): staging →
  validate → promote on a seeded DB.
- **OGC assembly/acceptance** (PR #137 tiers): published layers still serve
  and render non-blank after each promote.
- **E2E** (Playwright, currently soft): re-harden once the seeded-DB test
  backend exists — the national seed DB built for ingestion tests is exactly
  the missing piece flagged in `ci.yml`'s comment; do both together (Month 2).
- **Frontend perf budget** (new, Month 2–3): scripted Playwright trace —
  map initial render < 3 s, zoom interaction ≥ 30 fps on national dataset,
  measured in CI on the seeded backend, reported as a trend not a hard gate.

---

## 6. Month-by-month plan (solo dev, arriving Brazil 2026-07-09)

> Each month below is expanded into a full step-by-step checklist (commands,
> file paths, verification queries, exit criteria) in
> [`playbooks/`](playbooks/README.md) — execute those top to bottom; this
> section stays the strategic summary.

### July 2026 — Consolidation & foundations ("make the base boring")
- ✅ *(done 2026-07-03, remote)* PR #137 CI unblocked: PyJWT CVE bump, OGC WMS
  fix, compose placeholder fix. **Remaining manual step:** mark GitGuardian
  incident 34365115 as false positive in the dashboard (placeholder syntax,
  not a real secret), since historical commits stay flagged.
- Merge #137; process dependabot PRs #115/#119/#120 one at a time on green CI.
- Resolve the three METADATA discrepancies **on paper first** (MapBiomas
  collection, IBGE reference years, ANEEL unit audit) — each closes with a
  one-page note in `docs/data/` and a METADATA.json update.
- Leaflet interim perf pass (canvas renderer, kill remount key, memoize
  styles, zoom tuning) — measurable smoothness win before MapLibre.
- ✅ *(done 2026-07-03, remote)* Ingestion framework (`backend/ingest/`: 8-gate
  battery, CLI runner, report writer, ANEEL SIGA template source, 48 tests,
  `INGESTION_GUIDE.md`, PR template with data-lineage checklist). **Remaining
  July part:** run it on the real SIGA snapshot → `validation_plants`
  (closes the P0 flag), which requires the data — first week back.
- **Exit criteria:** #137 + dependabot merged, main green; ANEEL ingested &
  validated; discrepancy notes merged; zoom no longer stutters on SP data.

### August 2026 — National spine + core sources
- Migration 021: `states`, national `municipalities` (5,570), `uf`/RGint keys;
  national shapefile/geobr geometry import at 2 simplification levels.
- Seeded national test DB (fixtures for CI) → **re-harden E2E gate** and
  backend integration tests against it.
- Ingest under the contract: **IBGE PAM 2023 national**, **Censo Agro/PPM
  livestock national**, **SNIS national**.
- First national choropleth behind a feature flag (Leaflet, RGint level only —
  133 polygons render fine pre-MapLibre).
- **Exit criteria:** national spine tables live; 3 national sources promoted
  with reports; E2E hard gate again; RGint national map demo.

### September 2026 — Rendering at scale (MapLibre + tiles)
- Tile build pipeline (PostGIS → tippecanoe → PMTiles per layer-year), served
  statically; municipal + RGint + state layers.
- MapLibre GL migration of the main map (choropleth, tooltips, legend,
  filters as paint expressions); Leaflet retained for secondary maps until
  parity; port layer tests suite-by-suite.
- Perf budget in CI (trace-based) on the national dataset.
- Start MapLibre OSS contribution habit: file/repro upstream issues found
  during migration; first small PR (docs or bugfix) — this is the on-ramp.
- **Exit criteria:** national municipal choropleth at 60 fps zoom; filter
  changes < 100 ms; all map tests green on MapLibre main map.

### October 2026 — Residue model national + new layers wave 1
- Extend FDE methodology tables/parameters per state (harvest calendars,
  competing uses); recompute biomass/biogas potential nationally; regression
  gate vs SP published numbers (must reproduce the paper's SP results).
- Ingest: **MapBiomas Collection 10.1 LULC + 2008–2024 transition matrices**
  (15 classes; sugarcane/soy/corn focus) at municipality + RGint level.
- Ingest: **LAPIG pastures** + cattle-waste crossing analysis.
- Restricted-areas wave 1: CNUC conservation units, FUNAI indigenous lands,
  urban perimeters → first "restricted" tile layer.
- **Exit criteria:** every BR municipality has a biomass availability profile
  (even if flagged low-confidence); MapBiomas C10.1 is the single collection
  everywhere; restricted layer v1 on the map.

### November 2026 — Bioeconomics, readiness & ILUC
- Ingest: **ANP**, **EPE/BEN**, **SINIR**, **SICONFI**, **RAIS/CAGED
  (RGint aggregates)** → municipal/RGint **readiness & viability scoring**
  (fiscal capacity, waste-plan existence, agro employment, energy context).
- **ABIOVE ILUC/LULC economics** at RGint level from the C10.1 transition
  matrices (sugarcane/soy/corn); PRODES/DETER ingest feeds the ILUC layer.
- Restricted-areas wave 2: APPs (ANA hydrography + slope), PRODES embargoes.
- INMET normals ingest (productivity modelling inputs).
- **Exit criteria:** readiness score visible per municipality/RGint with full
  lineage; ILUC transition analysis reproducible end-to-end from raw rasters.

### December 2026 — Papers, polish, and the 2027 runway
- **Papers:** freeze data (METADATA.json with zero VERIFY placeholders),
  reproduce every figure/table from `run_manuscript_validation.py`-style
  scripts, submit; platform paper cites the national expansion.
- Yearly-refresh runbook: documented, tested dry-run of the full ingest cycle
  (this is the January-each-year playbook).
- Infrastructure & grid-connection layers (ANEEL transmission, gas pipelines
  national — data already modelled for SP in `infrastructure.py`).
- Scope the 2027 **granular grid-siting analysis** (hexgrid/H3 over restricted
  areas + feedstock density + infrastructure distance) as a design doc — the
  restricted + readiness + infrastructure layers built above are its inputs.
- **Exit criteria:** papers submitted; national platform live at
  cp2b.unicamp.br; 2027 siting-analysis design doc merged.

---

### Progress indicators (review at each month's end)

Numbers, not vibes. Each month closes with these measured and written into
this file (edit the table in place — it is the scoreboard):

| Indicator | Baseline (2026-07-03) | Jul | Aug | Sep | Oct | Nov | Dec target |
|---|---|---|---|---|---|---|---|
| Sources promoted through the contract (of 14 in §4) | 0 | | | | | | ≥ 10 |
| METADATA.json `VERIFY` placeholders | >10 | | | | | | **0** |
| Municipalities with a biomass profile | 645 | | | | | | 5,570 |
| Backend tests passing / coverage | 1,028 / 60.98% | | | | | | grow / ≥ 65% |
| Frontend tests passing | 597 | | | | | | grow |
| Hard CI gates (of 9 jobs) | 7 (E2E, Bandit soft) | | | | | | 9 |
| Map: municipal layer render path | GeoJSON+SVG | | | | | | PMTiles+MapLibre |
| Map zoom (national dataset) | n/a (SP only) | | | | | | ≥ 30 fps |
| Filter-change latency on the map | full remount | | | | | | < 100 ms |
| Restricted-area layers live | 0 | | | | | | ≥ 4 |
| Ingest reports committed | 0 | | | | | | 1 per promoted source-year |
| Papers submitted | 0 | | | | | | 2 |

How to measure: tests/coverage from the pytest/jest summaries; fps + filter
latency from the Playwright trace budget (September deliverable); the rest
are counted directly in the repo (grep `VERIFY` in METADATA.json, count
`docs/data/ingest_reports/*.md`, count `ingest/sources/*/`).

### Working rhythm (the month loop)

1. **Month start:** pick the month's §6 block; open one tracking issue per
   deliverable; sequence so a releasable state exists every ~2 weeks.
2. **Every ingest** follows `docs/data/INGESTION_GUIDE.md` steps 0–5 — no
   shortcuts, one source per PR, report committed.
3. **Every PR** uses the template's checklists (data-lineage section for
   ingests); merge only on green hard gates.
4. **Month end:** fill the indicator row above; move anything unfinished
   explicitly into the next month or the §7 parking lot (never silently);
   update IMPROVEMENT_BACKLOG.md with new findings.

## 7. Beyond 2026 (parking lot, do not start early)

- H3/hexgrid multi-criteria siting optimization (restricted areas × feedstock
  × logistics × grid distance) with per-cell explainability.
- OpenData/OSM live-API layers (Overpass-sourced infrastructure refresh).
- pygeoapi / OGC API Features+Tiles migration (Track C of POST_FOSS4G).
- Global Biogas Atlas (Track E / BEPE).
- INMET/ANA live APIs for seasonal dashboards.

## 8. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Solo-dev bandwidth: plan is ambitious | Months are sequenced so each ends releasable; cut scope by dropping P3 sources (RAIS, SICONFI, ANA) first, never by skipping validation gates |
| MapLibre migration stalls mid-way | Incremental per-layer port behind a flag; Leaflet path stays functional until parity; interim Leaflet perf pass already done (July) |
| Data discrepancies surface late | All three known ones are July items, before any national ingest multiplies them |
| National FDE parameters weakly sourced outside SP | Flag confidence per municipality; papers only claim what validation supports |
| VM resources (tiles + GeoServer + DB) | PMTiles are static files (near-zero serve cost); GeoServer optional per `docker-compose.geoserver.yml`; <100 users = no scaling pressure |
