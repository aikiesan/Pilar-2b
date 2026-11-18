# National Expansion Feasibility — ABIOVE Ingestion + Spatial Layers

> Feasibility study for scaling PILAR-2b's spatial database from São Paulo
> (645 municipalities) to national coverage (5,570 municipalities / 133 RGINTs),
> using the ABIOVE July-2026 deliverable as the primary data source, plus a
> triage of the MapBiomas 10.1 shapefile collection for the web map.
>
> Companion docs: `BRAZIL_EXPANSION_ROADMAP.md` (master plan),
> `backend/ingest/README.md` (ingestion contract), `docs/data/METADATA.json`
> (lineage). _Author: analysis pass 2026-07-15._

---

## 0. Verdict

**Feasible, and materially de-risked versus the roadmap's own baseline.** The
platform already has (a) an 8-gate ingestion contract with a copyable template,
(b) migration 021 which lands the national spine (`states`, `municipalities.uf`,
`staging` schema, promote ledger), and (c) a query layer keyed on 7-digit
`ibge_code`. The ABIOVE deliverable ships its **own authoritative
name→`ibge_code`→RGINT crosswalk** (`Lookup_Espacial`, 5,570 rows), which
removes the single biggest ingestion risk — fuzzy municipality-name matching.

Three hard constraints remain, all documented in the deliverable itself and none
a blocker for ingestion — but the third changes *what confidence level* the
ingested data may claim:

1. **Rendering, not data, is the wall.** National municipal geometry cannot be
   served as GeoJSON+SVG (roadmap limits #1/#3). This is a Sep-2026 MapLibre +
   PMTiles item; ABIOVE *attribute* ingestion does not depend on it and can land
   first at RGINT level (133 polygons render fine on Leaflet today).
2. **ABIOVE granularity is RGINT, not municipal, for the transition matrices.**
   The finished products (matrices, seeds, handoff) are 133-region. Only the
   *raw* `MapBiomas_col10` layer is municipal — and it is keyed by **name+UF, no
   code column**. Ingest the municipal raw via the crosswalk; ingest the RGINT
   products directly on `cod_rgint`.
3. **The transition products are PRELIMINARY, not final** (D1 §10.1, D4 §6/§8).
   `LOG_AUDITORIA_INTEGRIDADE_V2.csv`: Status Area 133/133 OK, but **Status Soja
   74/133, Status Pastagem 2/133, Status Geral 2/133 PASS**. Area conservation is
   explicitly *not* evidence of correctness (D1 §3.1). The multi-source
   harmonization that reconciles soy/pasture (D4 P1) is still in progress, and
   matrix coverage is **~92% of territory, not 100%** (~81% base + diagonal
   injection; ~8% residual under-extraction of native classes, pending
   reprocessing). → Ingest transitions behind `data_confidence='provisional'`,
   carry the per-RGINT `Status_*` flags as columns, and gate on them; do **not**
   present transition/ILUC numbers as paper-grade until the harmonized re-run lands.

---

## 1. What the ABIOVE deliverable actually contains

Path: `C:\Users\Lucas\Documents\ILUC_NIPE\ENTREGA_PRODUTO_ABIOVE_JULHO_2026`.
Time series **2008–2024** (16 year-pairs). 15-class LULC system, `versao_classes = 2.0`.

| Folder | Grain | Key column(s) | Rows / size | Feeds |
|--------|-------|---------------|-------------|-------|
| `00_Fontes_Primarias/Lookup_Espacial/` | municipal | `nome_mun`, **`CD_GEOCODI` (7-digit)**, `cod_rgi`, `cod_rgint` | 5,570 | **The crosswalk** — backbone of every join |
| `00_Fontes_Primarias/MapBiomas_col10/MB_col10_municipios.csv` | municipal | `municipality` + `state_acronym` **(NO code)** | 78,835 (≈14 classes × 5,755 munis) | LULC backbone, ground-truth |
| `07_Metodo3_Semente/TRANSICOES_PROPORCOES_RGINT.csv` | RGINT | `rgint` | 94,026 | **Transition seed (M1)** — `pct_coluna` = "where did new soy come from"; central ABIOVE metric |
| `07_Metodo3_Semente/HARVEX_*` | RGINT | `rgint` | 46k–256k | M2 (Joel Risso) alt. transition series |
| `06_Matrizes_Transicao_FINAL/` | RGINT | filename `RGINT{id}` | 134 xlsx | Full 15×15 transition matrices (M1) |
| `05_Handoff_Igor/` | RGINT | filename `{name}_{rgint}` | 135 xlsx | Multi-source per-class series (`tidy` + `completo`) |
| `00_Fontes_Primarias/LAPIG_Vigor/*.csv` | municipal | `geocod_mun` (float→Int64) | 16 files, 35 MB | Pasture vigor → classes 7/8/9 |
| `00_Fontes_Primarias/PAM_RGINT_COMPLETO.csv` | RGINT | `CD_RGINT` | 11,305 | Crop area (soy/corn/cane) |
| `00_Fontes_Primarias/TerraClass*` | municipal | `CD_MUN` | 3.7 MB | Primary/secondary veg split (11–14) |
| `00_Fontes_Primarias/MapBiomas_Segunda_Safra/*.tif` | raster 30m | — | 17 GeoTIFFs, **1.2 GB** | Second-crop corn (class 3) |
| `00_Fontes_Primarias/TerraClass_AMZ_2024/AMZ.2024.M.tif` | raster | — | **646 MB** | AMZ 2024 extension |

### 1.1 The three data traps the deliverable documents (carry into gates)

The ABIOVE index (`00_INDICE_GERAL.md`) is unusually honest about failure modes;
each becomes a **source-specific validation gate** so the trap cannot re-enter
silently:

- **7↔8 vigor/degradation swap.** Class system 2.0 permutes rows *and* columns:
  `{7:8, 8:7, 9:9}`. HARVEX (M2) uses the *old* convention. Any consumer joining
  M1 and M2 without the crosswalk gets a **+72% error on class 7** with all totals
  still balancing — invisible. → Gate: assert the permutation on ingest, abort otherwise.
- **Intra-soy rotation (2↔3) is not land-use change.** Same field alternating
  single/double crop. It numerically dominates ("new soy came from soy"). Every
  seed CSV carries `rotacao_intra_soja ∈ {0,1}`; **filter `= 0`** before any
  origin analysis. → Gate: reject any origin query that forgets the filter.
- **M2-annual is a hypothesis, not a measurement.** `HARVEX_M2_ANUAL_LINEAR.csv`
  splits a 2008→2024 total evenly across 16 steps (HARVEX observes only 2008/2017/2024).
  The `metodo` column stamps this per-row. → Gate: never render M2-annual as if measured.
- **The documentation itself is version-split.** `00_INDICE_GERAL.md` and D1 are
  **v2.0** (current); **D4, D3, and `00_Fontes_Primarias/README_DICIONARIO_PIPELINE.md`
  are v1.0** and carry the *old* class definitions — including the pre-swap LAPIG map
  (`Intermediário→7, Severa→8`, the reverse of v2.0). Reading class semantics off the
  wrong doc silently reintroduces the 7↔8 error. → Single source of truth for classes
  is `00_INDICE_GERAL.md §2` + D1 §3.1–3.2; treat every v1.0 doc as historical. Also use
  v2.0 crop definitions (classes 2/3/4 from PAM tab. 839, not CONAB `pct_2a`).

---

## 2. Ingestion design — one contract, three source modules

The framework in `backend/ingest/` is exactly the right shape for this. Each ABIOVE
stream becomes a `sources/<id>/source.py` copied from `sources/aneel_siga/`,
declaring a `SourceSpec` and implementing `fetch/load/validate/promote`. Migration
021 must be applied first (it creates the `staging` schema and `municipalities.uf`;
`promote()` is intentionally blocked until it exists).

### 2.1 The crosswalk is the enabling primitive

`MB_col10_municipios.csv` has no IBGE code — only `municipality` + `state_acronym`,
and it yields **5,755 distinct name+UF pairs vs 5,570 official** (accents, encoding,
homonyms). Fuzzy name matching at national scale is where naïve pipelines break.
**We don't need it:** `Lookup_Espacial` already maps `nome_mun` → `CD_GEOCODI` →
`cod_rgint` for all 5,570. Load it once into a reference table
(`staging.abibge_municipality_xwalk` or reuse the `municipalities` table after 021),
normalize names (NFKD strip-accents, casefold), and every municipal ABIOVE file
resolves through it. Rows that fail to resolve go to an **explicit allowlist**,
never a silent drop — this is exactly the coverage gate (#2) the contract already enforces.

Proposed module set (one PR each, per roadmap §2 "one source per PR"):

| Source id | Grain | Loads | Promotes to | Notable gate |
|-----------|-------|-------|-------------|--------------|
| `abibge_xwalk` | municipal | `Lookup_Espacial` xlsx | reference table | coverage = 5,570 exactly |
| `abibge_mapbiomas_c10` | municipal | `MB_col10_municipios.csv` via xwalk | `staging.mapbiomas_lulc` → public LULC-by-muni-year | class-area vs MapBiomas platform ±0.5% (roadmap §4.1) |
| `abibge_transitions` | RGINT | `07_Metodo3_Semente` P/Q seeds + `LOG_AUDITORIA_INTEGRIDADE_V2.csv` | `staging.iluc_transitions` → public | conservation 2,128/2,128; `rotacao_intra_soja` present; 7↔8 assert; **carry `Status_Soja`/`Status_Pastagem` per RGINT and set `data_confidence` from them** |

LAPIG, PAM, TerraClass are already reconciled *inside* the ABIOVE handoff/matrices,
so for PILAR-2b's purposes they arrive pre-digested through `abibge_mapbiomas_c10`
and `abibge_transitions`. Ingest them as standalone sources only if the platform needs
the raw per-class series independently (e.g. LAPIG pasture-vigor as its own map layer —
roadmap §4.2 P1, pairs with cattle-waste biogas).

### 2.2 Indexing / schema (extends migration 021)

- Municipal LULC: `(ibge_code, year, class_id) → area_ha`, PK `(ibge_code, year, class_id)`,
  index on `(uf, year)` — matches the state/region-scoped query pattern 021 sets up.
- RGINT transitions: `(cod_rgint, year_pair, origem_id, destino_id) → area_ha, pct_linha,
  pct_coluna, rotacao_intra_soja, metodo`. Index `(cod_rgint, year_pair)`.
- Reuse the existing 133-region tables from `007_intermediate_regions.sql` /
  `br_intermediary_regions_distances.sql` — do **not** create a parallel RGINT dimension.
- `data_confidence` (021 already adds it): SP='validated'; other states start
  'provisional' until per-state FDE parameters land (roadmap §6 October).

### 2.3 Rasters — out of scope for direct DB ingest

The two big raster sets (`MapBiomas_Segunda_Safra` 1.2 GB, `TerraClass_AMZ_2024`
646 MB) are already reduced to tabular class areas inside the deliverable. Ingesting
rasters into PostGIS is unnecessary and expensive; **ingest the derived tables**, keep
the rasters as immutable provenance snapshots referenced in METADATA.json.
(Note the deliverable's own warning: the AMZ 2024 raster is EPSG:4326, so `TabulateArea`
returns degrees² — 77/560 munis already dropped for lack of a 2022 reference. Consume
their harmonized proportional output, not the raster.)

### 2.4 What D3/D4 hand us for free — and a coordination signal

- **D3 is a ready-made national ILUC / deforestation layer.** It already computes,
  per RGINT for 2008–2024: native-veg→pasture accumulated ≈ **36.4 Mha** (4× the next
  transition), pasture→soy ≈ 4.1 Mha, Amazon loss 14.8 Mha, Cerrado loss 11.1 Mha,
  and a pressure ranking (Sinop/MT leads at 2.47 Mha). These map directly onto the
  roadmap's November ILUC surface and double as **aggregation-gate anchors** — the
  ingested tables must reproduce these published totals (with the intra-soy filter on).
  Caveat: D3 is v1.0-labelled but states its native-veg numbers are unaffected by the
  v2.0 class changes (the 7↔8 swap touches only pasture *sub*-classes).
- **CRS handling on ingest.** Source data is **EPSG:4674 (SIRGAS 2000)**; areas are
  computed in **EPSG:5880 (Albers equal-area)**; the platform serves **EPSG:4326**.
  Attribute tables (area_ha) need no reprojection; any geometry (RGINT boundaries for
  the choropleth) reprojects to 4326 on load — never compute area in 4326.
- **The ABIOVE team already plans this integration** (D4 P7: "PostGIS/PostgreSQL
  migration … integração com Lucas Boaro"). This is a coordination opportunity, not a
  parallel build — align the target schema with their intended migration so the two
  efforts converge rather than fork.

---

## 3. MapBiomas 10.1 shapefile triage for the web map

Collection at `C:\Users\Lucas\Documents\SHAPEFILES_MAPBIOMAS_10.1`. Decision driver:
**relevance to biogas/biomass siting × render cost.** The platform serves shapefiles
today one-at-a-time as GeoJSON via `backend/app/utils/shapefile_loader.py`
(`data/shapefiles/`, SP-named files) — fine for small point/line layers, fatal for
large national polygon sets (same wall as the municipal choropleth).

### Tier 1 — ingest now (small, high-siting-value point/line layers)

Mostly under `INFRAESTRUTURA/`. These are points or short lines, tens of KB to a few MB
— cheap as GeoJSON, and directly answer "where can a plant connect / feed":

| Layer | Size | Why |
|-------|------|-----|
| `structure_biogas_plant` | 1.5 M | Existing biogas plants — cross-check vs ANEEL/model |
| `structure_biodiesel_plant`, `structure_ethanol_plant` | 0.2 / 1.0 M | Feedstock competition & co-location |
| `structure_slaughterhouse` | 477 K | Cattle/swine waste point sources |
| `structure_substation`, `structure_transmission_line` | 0.5 / 4.4 M | Grid connection (electricity route) |
| `structure_transportation/distribution_gas_pipeline`, `structure_gas_delivery_point` | ≤9 M | Biomethane injection points |
| `structure_biomass_thermal_power_plant`, `structure_small_hydropower_plant` | ≤3.2 M | Energy context |

These extend the existing `infrastructure.py` endpoint pattern (already serves
substations/pipelines/biogas for SP) from SP files to national files — the smallest
possible change surface.

### Tier 2 — ingest as restricted-area / context layers (roadmap §4.3), best as tiles

Polygon layers valuable for "no-go / caution" siting but too large for per-request GeoJSON
at national scale → build into PMTiles alongside the municipal choropleth (Sep-2026):

- `INDIGENOUS_TERRITORIES_v3` (27 M), `FEDERAL/STATE/MUNICIPAL_PROTECTED_AREAS_*`
  (conservation units), `QUILOMBOS_v2`, `SETTLEMENTS_v3`, `ATLANTIC_FOREST_LAW_v3`,
  `LEGAL_AMAZON_v3`, `BIOMES_v2`, `SEMIARID_v2`, `MATOPIBA_v3`, `AMACRO_v3`.
- Hydrography for APP/water constraints: `BASIN_LEVEL_1/2_*`, `UGRHS_v3`,
  `DHN250_LEVEL_1/2` (skip LEVEL_3 at 69 M unless needed).

### Tier 3 — defer / exclude (huge, low incremental value for siting)

- `CENSUS_TRACTS_v1` (2.8 G), `RURAL/URBAN_CENSUS_TRACTS` (317/64 M),
  `MUNICIPAL_DISTRICTS_v2` (342 M), `POLITICAL_LEVEL_4_v3` (287 M),
  `FLORESTAS_PUBLICAS_NAO_DESTINADAS_v26` (214 M), `AREAS_PRIORITARIAS_DO_MMA` (111 M),
  `archive/` (4.7 G). Census-tract granularity is below the platform's municipal/RGINT
  unit of analysis; ingest only if a specific analysis demands it. Duplicated
  `_v1 (1)` / `_v2 (1)` folders are copies — dedupe before any load.

**Rule for the web map:** anything national and polygonal → PMTiles (don't grow the
GeoJSON path). Points/short lines → the existing GeoJSON endpoint is fine.

---

## 4. Sequenced plan (fits the existing roadmap months)

1. **Apply migration 021** (national spine) on the target DB — prerequisite for every
   promote. Already drafted and reconciled (see memory `project_pilar2b_migration_conflicts`).
2. **`abibge_xwalk` source** — load `Lookup_Espacial`, coverage gate = 5,570. The
   enabling primitive; nothing municipal joins without it.
3. **`abibge_mapbiomas_c10` source** — municipal LULC via xwalk; class-area aggregation
   gate vs MapBiomas platform. First national attribute layer (render at RGINT first).
4. **`abibge_transitions` source** — RGINT P/Q seeds; conservation + 7↔8 + intra-soy gates.
   Powers the "origin of new soy" ILUC surface (roadmap §6 November).
5. **Infrastructure Tier-1 shapefiles** — point `infrastructure.py` at national files.
6. **Tier-2 restricted-area layers** — fold into the PMTiles build (Sep-2026 MapLibre item).

Each step: one PR, `docs/data/ingest_reports/<source>_<year>.md` committed, METADATA.json
entry with DOI/retrieval date (lineage gate blocks `VERIFY` placeholders).

## 5. Verification (how to prove each step works)

- **Contract dry-run, no DB:** `cd backend && python -m ingest.runner run abibge_xwalk --year 2024`
  → gate report written, exit 0. Gates are pure functions over DataFrames, so they run
  in unit tests and CI identically (add fixtures under `tests/unit/ingest/fixtures/`).
- **Crosswalk correctness:** after loading, `SELECT count(*) FROM municipalities WHERE uf IS NULL` = 0;
  unresolved-name count = size of the documented allowlist (assert equal, not just small).
- **021 post-apply checks (already in the migration):** `SELECT sum(municipality_count) FROM states` = 5570;
  `... WHERE uf='SP'` = 645.
- **LULC aggregation:** per-UF class-area sums vs MapBiomas Statistics platform within ±0.5%.
- **Transition integrity:** re-derive "94% of new soy from pasture (2023→2024, `rotacao=0`)"
  from the promoted table — must reproduce the ABIOVE index number.
- **Map:** national RGINT choropleth (133 polygons) renders on current Leaflet behind a
  feature flag before any MapLibre work; Tier-1 infra layers load through `infrastructure.py`.

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Name→code resolution gaps (5,755 vs 5,570) | Use the shipped `CD_GEOCODI` crosswalk, not fuzzy matching; unresolved → explicit allowlist + coverage gate |
| 7↔8 swap / intra-soy / M2-annual traps re-enter silently | Encode each as a source-specific gate that aborts on violation (the deliverable proves each is invisible to totals) |
| National polygon geometry via GeoJSON+SVG | Do not extend the GeoJSON path for national polygons; RGINT-first now, PMTiles+MapLibre for municipal (roadmap Sep) |
| Raster ingest cost / EPSG:4326 degree²-area bug | Ingest the deliverable's derived tables, not the rasters; keep rasters as provenance only |
| RGINT vs municipal grain mismatch | Municipal for raw LULC (via xwalk), RGINT for transition products; reuse existing 133-region tables |
| **Preliminary matrices presented as final** (2/133 Status Geral PASS; harmonization pending) | Ingest transitions as `data_confidence='provisional'`, carry `Status_*` flags, gate on them; hold paper-grade ILUC claims until the harmonized re-run; ~92% coverage stated explicitly |
| **v1.0/v2.0 doc conflict reintroduces 7↔8 error** | Pin class semantics to `00_INDICE_GERAL.md`+D1 (v2.0); treat D3/D4/README_DICIONARIO as historical; assert the swap on ingest |
| Duplicate-load class of bug (cf. TerraClass 2.89× in ABIOVE's own DB, D1 §5.7) | Idempotency gate (#6) + a `count(*)/count(distinct key)=1.00` check per source-year before promote |
