# CP2b canonical audit: every non-CP2b potential and factor source

Read-only audit. Nothing in the code base was changed. This file is the only
deliverable.

**Canonical source ("CP2b")** in this document means one of the following:

- the migration-034 tables `municipality_cp2b_potential`, `cp2b_parameters` and `cp2b_spatial_fl`;
- the view `municipality_cp2b_map`;
- the `/api/v1/cp2b/*` endpoints.

Every other place that serves, computes or displays a biogas, methane or
biomethane potential, or an availability factor, is listed below.

**Proposal vocabulary.** Each item gets exactly one primary proposal:

| Tag | Meaning |
|---|---|
| **CP2b** | Read from CP2b: the view, the tables or `/cp2b/*`. |
| **Legacy** | Label it as legacy ("estimativa anterior (legado)" / "previous estimate (legacy)") and keep it. |
| **Hide** | Hide it behind the `METHOD_PAGES_ENABLED` switch. |
| **Remove** | Remove it from the served or visible surface. |

**Paths.** All paths are relative to `cp2b-workspace/NewLook/` unless they start with `cp2b-workspace/`.

---

## 1. Scope and how it was checked

### Refs

| Ref | Commit | Role |
|---|---|---|
| `origin/feat/cp2b-v5.1-potential` | `cbd05103` | "main + #229". This branch (`feat/cp2b-canonical-audit`) starts here. |
| `origin/main` | `32921d44` | Two commits not in cbd05103: #241 (CI) and #242 (a11y). Neither touches potentials. |
| `origin/claude/optimistic-tesla-jywjys` | `bd42cce5` | Redesign branch. It contains cbd05103 and 18 more commits. It was audited without checkout, using only `git grep` and `git show`. |

**Branch relationship.**

- `feat/cp2b-canonical-audit` was branched from `origin/feat/cp2b-v5.1-potential`. `git merge-base feat/cp2b-canonical-audit origin/feat/cp2b-v5.1-potential` returns `cbd0510348de09f11cb454591fb2e54ce2d7734b`. That is the tip of `origin/feat/cp2b-v5.1-potential` and the parent of this branch's audit commit.
- `git merge-base --is-ancestor cbd05103 bd42cce5` is true. Every HEAD finding therefore also exists on the redesign branch, unless it says otherwise.
- `git diff --name-status cbd05103 bd42cce5` shows changes only under `frontend/`. The redesign does not touch backend, docs or data.

**Step 0.** "Step 0" is being prepared in another session on the redesign branch and is not pushed. It will:

- hide the old FDE factor tables in the catalogue and landing behind `METHOD_PAGES_ENABLED`;
- add "estimativa anterior (legado)" labels to the old tools.

This audit is against `bd42cce5`. Items that Step 0 is expected to cover are marked *(Step 0 pending)*.

**Step 0 is now available** as commit `b1be4a4e` (parent `bd42cce5`). It is local in the main checkout and has not been pushed. It was read with `git show b1be4a4`; it was not merged or checked out. Section 11 lists every place it labelled "estimativa anterior (legado)" and everything it put behind `METHOD_PAGES_ENABLED`, so that Prompt 3 can remove or rebuild each one. Sections 2-10 still describe `bd42cce5`.

### Commands used (representative)

```bash
git fetch origin main feat/cp2b-v5.1-potential claude/optimistic-tesla-jywjys
git checkout -b feat/cp2b-canonical-audit origin/feat/cp2b-v5.1-potential

# HEAD (main+#229)
grep -rn -E "biogas_m3_year|biogas_m3_yr|ch4_real|ch4_ideal|fde|FDE|fcp|fator_realista|0\.625|9\.9[47]|0\.00997" backend/app backend/scripts frontend/src
grep -rn "/cp2b/" frontend/src            # -> no consumer
python3 keys2.py frontend/messages/pt-BR.json   # walks the JSON; key ~ /fde|fcp/i or value ~ /FDE|FCp/

# Redesign, without checkout
git diff --name-status cbd05103 origin/claude/optimistic-tesla-jywjys -- cp2b-workspace/NewLook
git grep -n -E "residueFDE|calculateFDE|fcp|FDE|biogas|ch4|cp2b|0\.625|DETAILED_RESIDUES" \
    origin/claude/optimistic-tesla-jywjys -- \
    ":(literal)cp2b-workspace/NewLook/frontend/src/app/[locale]/data" \
    ":(literal)cp2b-workspace/NewLook/frontend/src/app/[locale]/method" \
    cp2b-workspace/NewLook/frontend/src/components/data cp2b-workspace/NewLook/frontend/src/lib/legendExports.ts
git show origin/claude/optimistic-tesla-jywjys:cp2b-workspace/NewLook/frontend/src/lib/featureFlags.ts
git show origin/claude/optimistic-tesla-jywjys:cp2b-workspace/NewLook/frontend/src/data/residueCatalog.ts
git show origin/claude/optimistic-tesla-jywjys:cp2b-workspace/NewLook/frontend/messages/en.json > r-en.json
```

### How totals were obtained

No database was available in the audit session.

- A total is given only when it can be derived from a file in the repository. The file and the arithmetic are shown.
- Otherwise the cell says "not computed here (needs DB)" and points to a numbered query in section 10. Table and column names in those queries were checked against the migrations.

**Unit conventions.**

- "M/day" = million Nm³ per day.
- "bi/yr" = billion (1e9) Nm³ per year.
- The legacy columns `*_biogas_m3_year` hold METHANE, not biogas. `backend/app/api/v1/endpoints/geospatial.py` L1045-1051 says this itself.
- They are listed as "Nm³ CH4/yr (labelled biogas)".

### Reference state totals derivable from repo files

| ID | Quantity | Value | Derivation |
|---|---|---|---|
| T1 | Legacy theoretical potential, SP. This is the content of `municipalities.*_biogas_m3_year` and of `residue_streams_sp2023.biogas_m3_yr`. | **19,900,698,323 Nm³ CH4/yr = 54.52 M/day** | Sum of column `legacy_theoretical_biogas` over the 12 rows of `docs/data/biogas_canonical_state_summary.csv`, ÷365e6. Matches the "19.9 bi" comment at `frontend/src/components/map/DesktopLeftPanel.tsx` L636 and `potencial_teorico` in `data/canonical_parameters/SP_TOTAIS_CONSOLIDADOS_2026-07-30.json`. DB confirmation: Q1, Q4. |
| T2 | T1 as "raw biogas" (÷0.625) | 31.84 bi/yr = 87.24 M/day | 19,900,698,323 / 0.625. Same figure in `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json`. |
| T3 | Legacy per-stream split of T1 (Nm³ CH4/yr) | sugarcane 12.38e9; rsu 1.556e9; cattle 1.454e9; corn 1.361e9; soybean 1.223e9; swine 603e6; forestry 599.8e6; poultry 308.5e6; citrus 285e6; coffee 95.3e6; rpo 31.2e6; aquaculture 130e3 | Same CSV, per row. |
| T4 | "Canonical practical" min / medio / max from the yaml FDE engine | 5.99e9 / 7.50e9 / 11.84e9 Nm³/yr = 16.41 / 20.54 / 32.43 M/day | Same CSV, columns `canonical_practical_*`. The link between these columns and the `map_metrics` bands served on the map is unverified (Q12). |
| T5 | Atlas SP 2020 Real / Ideal (columns `ch4_real_*` / `ch4_ideal_*`) | 7.83 / 9.84 bi Nm³ CH4/yr = 21.46 / 26.96 M/day | `docs/HANDOFF_2026-07-30.md` L62; `docs/data/METODOLOGIA_RESUMO_APRESENTACAO_2026-08-01.md` L17; `docs/DECISOES_METODOLOGICAS.md` L11. DB confirmation: Q3. |
| T6 | Legacy band scenarios claimed in `frontend/src/data/scenarioFactors.ts` L16-17 | Base/Médio ≈ 6.5, Fronteira ≈ 16.4, Otimista ≈ 26.3 M/day "biogás" | Code comment only. Not re-derived. |
| T7 | Advanced-analysis default | 44.84e9 × 0.532 ≈ 23.9e9; × 0.625 ≈ 14.9e9 m³ CH4/yr | Code comment `frontend/src/types/analysis.ts` L17-19. The 44.84e9 base is not traceable to any file found. |
| C1 | **CP2b v5.1 canonical totals, med** | N1 64.77, N2 41.66, N3 19.18, N4 16.36 M/day | `EXPECTED_STATE_TOTALS` in `backend/scripts/load_cp2b_potential.py` (n1 2.36426e10, n2 1.52076e10, n3 7.00187e9, n4 5.97171e9 Nm³/yr), ÷365e6. Agrees with the values given for this audit. Verify with Q6. |

---

## 2. Summary: counts by proposal

Code, exports and docs are counted per item. An item is one logical
occurrence, which can span several lines or files. i18n is counted in keys per
locale; pt-BR and en carry the same key sets on both branches.

| Area | CP2b | Legacy | Hide | Remove | Total |
|---|---:|---:|---:|---:|---:|
| §3 Backend (HEAD; identical on redesign) | 19 | 11 | 0 | 7 | 37 |
| §4.1 Frontend, main+#229 (also on redesign, some files moved) | 17 | 8 | 0 | 4 | 29 |
| §4.2 Frontend, redesign-only additions | 3 | 0 | 8 | 0 | 11 |
| §5 Exports (dossier XLSX/PDF, CSV) | 10 | 2 | 0 | 0 | 12 |
| §7 Docs and data files | 3 | 18 | 0 | 0 | 21 |
| **Items total** | **52** | **39** | **8** | **11** | **110** |
| §6 i18n FDE/FCp keys, HEAD (per locale) | 27 | 13 | 0 | 0 | 40 |
| §6 i18n FDE/FCp keys added by redesign (per locale) | 2 | 0 | 32 | 0 | 34 |
| §6 i18n other potential strings (per locale) | 6 | 6 | 6 | 4 | 22 |
| **i18n keys total (per locale)** | **35** | **19** | **38** | **4** | **96** |

**Redesign key count.** The redesign has 73 FDE/FCp keys in total. That is 40
inherited, minus `landing.features.collaborative.features[3]` which the
redesign dropped, plus 34 new keys.

---

## 3. Backend

The backend is the same on HEAD and on the redesign. Line numbers refer to
`cbd05103`.

**Global consumer finding.** No frontend file calls `/api/v1/cp2b/*`:
`grep -rn "/cp2b/" frontend/src` finds nothing on HEAD, and `git grep` on the
redesign finds only a patch note. CP2b reaches the UI only in these ways:

- `ch4_cp2b_*` / `biogas_cp2b_*` fields merged into `/municipalities/geojson`;
- the `scenarios` block of `/geospatial/statistics/summary` (`_cp2b_tiers`);
- `/municipalities/{ibge}/metrics`;
- the dossier.

| ID | file:line | What is served or computed | Actual unit | State total today | Proposal |
|---|---|---|---|---|---|
| B1 | `backend/app/api/v1/endpoints/geospatial.py` L164-345 (`/geospatial/municipalities/geojson`; `json_build` of legacy fields L259-277; `min_biogas` filter L334; `ORDER BY total_biogas` L345) | Per-municipality `total/agricultural/livestock/urban_biogas_m3_year` | Nm³ CH4/yr (labelled biogas) | T1 = 19.90e9/yr (54.52 M/day), Q1 | **CP2b**: serve `ch4_cp2b_n4/n3_*` from `municipality_cp2b_map`; filter and sort on N4. |
| B2 | `geospatial.py` L368-406 (`/municipalities/centroids`, field `biogas`) | Legacy total per point | Nm³ CH4/yr | T1 | **CP2b** |
| B3 | `geospatial.py` L429-606 (`/municipalities/polygons`) | Legacy total and sector fields | Nm³ CH4/yr | T1 | **CP2b** |
| B4 | `geospatial.py` L617-641 (`/municipalities` list; sort and rank by `total_biogas_m3_year`) | Ranking by legacy total | Nm³ CH4/yr | T1 | **CP2b** (rank by N4) |
| B5 | `geospatial.py` L667-722 (`/municipalities/{id}`, legacy fields L707-722). Consumed by `/compare` (F14). | Legacy total and sectors | Nm³ CH4/yr | T1 | **CP2b** |
| B6 | `geospatial.py` L810-851 (`/rankings`, columns L820-823, `biogas_m3_year` L851) | Rankings | Nm³ CH4/yr | T1 | **CP2b** |
| B7 | `geospatial.py` L968-1111 (`/geospatial/statistics/summary`, read by the frontend via `geospatialClient.ts` L295). Legacy keys L1045-1072: `total_biogas_m3_year`, `total_methane_*`, `total_raw_biogas_*` (÷0.625, L868), `total_biomethane_*` (= CH4). Also `top_municipality` L1078, `sector_breakdown` L1085-1106, note L1111. SP filter `ibge_code LIKE '35%'` L997-1005. | Legacy state totals next to the CP2b `scenarios` block | Nm³ CH4/yr; raw biogas ÷0.625 | `total_biogas` = T1 19.90e9; raw = T2 31.84e9; biomethane = 19.90e9. Confirm with Q1/Q13. | **Legacy**: keep the keys, add a `legacy: true` marker, never use them as the headline. |
| B8 | `geospatial.py` L952 (`_cp2b_tiers` `energy_mwh_year = ch4 × CH4_LHV 9.94 / 1000`, constant L873) | Energy of the CP2b tiers | MWh/yr **thermal** (LHV, no conversion efficiency) | N4: 5.97171e9 × 9.94 kWh = **59,359 GWh/yr**; N3: 69,599 GWh/yr. The canonical figure is **22,624 GWh/yr** = 5.97171e9 × 9.97 × 0.38 (electrical). | **CP2b**: adopt the CP2b energy convention (Q-5 in §9). |
| B9 | `backend/app/api/v1/endpoints/municipalities.py` L353-364, L528-545 (legacy fields in `/municipalities/geojson`; stripped by `_DETAIL_ONLY_RE` L118-120 when `fields=map`); `potential_category = _cat(total_biogas)` L384-391, L501 | Legacy totals (full payload) and potential class | Nm³ CH4/yr | T1 | **CP2b**: class from N4. |
| B10 | `municipalities.py` L477 (`compute_municipality_map_metrics(...).to_flat_dict()`). Keys: `biogas_{min,medio,max}_m3_yr`, `biogas_ch4_*`, `biomethane_*`, `{sector}_*`. | ±FDE bands from the yaml engine. The band scenarios left the map but still resolve via `?scenario=`. | m³/yr biogas, CH4, biomethane | Not computed here (needs runtime), Q12; candidate is T4. | **Remove** from the served payload. |
| B11 | `municipalities.py` L613-621 (collection metadata: "legacy V2 import", "±FDE envelope") | Method metadata | — | — | **Legacy**: reword to name CP2b v5.1 as the served method. |
| B12 | `municipalities.py` L704-722 (`/municipalities/stats/summary`: `SUM(total_biogas_m3_year)`, **no SP filter**) | State total | Nm³ CH4/yr | Not computed here (needs DB), Q2. Equals T1 only if non-SP rows are 0/NULL. | **CP2b** (sum N4/N3 from the view) |
| B13 | `municipalities.py` L729 (`/municipalities/`) and L875 (`/municipalities/{municipality_id}`), both `SELECT *` | **Still serves `ch4_real_*` / `ch4_ideal_*` (Atlas SP 2020)** and every legacy column. This contradicts "no longer served" in #229. | Nm³ CH4/yr | T5 (7.83 / 9.84 bi/yr), Q3 | **Remove**: whitelist the columns and drop the Atlas columns. |
| B14 | `municipalities.py` L793-865 (`/municipalities/{ibge}/metrics`) | CP2b detail (fine) plus map_metrics bands plus legacy columns | mixed | per municipality | **Legacy** for the non-CP2b block |
| B15 | `backend/app/api/v1/endpoints/analysis.py` L28-49 (`RESIDUE_COLUMNS`), L53-84 (`FRONTEND_CODE_TO_STREAM`) | Maps the 25 frontend residue codes to legacy streams. **`URB_LODO_PRIMARIO` / `URB_LODO_SECUNDARIO` → `rsu_organic`** (L75-76): sewage sludge is counted as MSW. `IND_CASCA_EUCALIPTO` → forestry; six `IND_*` → None. | — | — | **CP2b**: map to the 17 substrates (§8.3). |
| B16 | `analysis.py` L90-216 (`/analysis/by-residue`; `residue_streams_sp2023.biogas_m3_yr` or legacy columns L200-216) | Per-municipality potential for selected residues | Nm³ CH4/yr (labelled biogas) | T1 when every residue is selected (Q4) | **CP2b** (`municipality_cp2b_potential` per substrate) |
| B17 | `analysis.py` L236 (`/statistics/by-category`), L295/L323 (`/statistics/by-stream`), L347 (`/statistics/by-region`), L384 (`/distribution`) | Aggregates of `residue_streams_sp2023.biogas_m3_yr` | Nm³ CH4/yr | T1 / T3 (Q4) | **CP2b** |
| B18 | `backend/app/api/v1/endpoints/statistics.py` L18-56 (`/api/v1/statistics/summary`: `total_biogas`, `energy_potential_mwh`, sectors), L79-106 (`/statistics/category/{category}`) | A second state summary. No frontend consumer: the frontend reads `/geospatial/statistics/summary`. SP filter not visible (unverified). | Nm³ CH4/yr; MWh | Not computed here (needs runtime), Q14 | **Remove** (after checking for external consumers) |
| B19 | `backend/app/api/v1/endpoints/intermediate_regions.py` L55 (`/geojson`), L110-120 (`/rankings`), L151-154 (list sort), L174 (`/{ibge_code}` `SELECT *`), L209-244 (`/cluster`); table `intermediate_regions.total_biogas_m3_year` (`backend/migrations/007_intermediate_regions.sql` L19) filled by `backend/scripts/load_national_intermediate_data.py` | Regional totals aggregated from legacy municipality totals. Non-SP rows are 0. | Nm³ CH4/yr | Not computed here (needs DB), Q5. Should equal T1. | **CP2b** (aggregate N4 by region) |
| B20 | `backend/app/api/v1/endpoints/proximity.py` L150-317 (`/proximity/analyze`, `include_biogas_potential`, `total_biogas_m3_year` L317); `backend/app/services/proximity_service.py` L209, L274, L291-367 (`aggregate_biogas_potential` over legacy columns) | Potential in a radius | Nm³ CH4/yr | per query | **CP2b** |
| B21 | `proximity_service.py` L560-605 (MapBiomas land-use estimate `estimated_biogas_m3 = residue_tons × TS × VS × avg BMP`, from table `residuos`) | Theoretical CH4 from land-use area, no availability factor | Nm³ CH4/yr (labelled biogas) | per query | **Legacy** ("theoretical, not CP2b") |
| B22 | `backend/app/services/codigestion_service.py` L252-362 (`cluster_biogas`, pair `combined_biogas`), L392-445 (typology weights), L543-555 (pairing candidates); endpoints `codigestion.py` `/clusters`, `/clusters/{id}`, `/municipality-typology`, `/pairing-candidates` | Cluster and pair potentials from legacy columns | Nm³ CH4/yr | per cluster | **CP2b**: N4 per substrate. `cp2b_spatial_fl` already carries the codigestion FL variants. |
| B23 | `backend/app/api/v1/endpoints/residuos.py` L129 (`/residuos/`, `SELECT r.*`), L526 (`/residuos/{id}`, `SELECT *`) | Columns `fc/fcp/fs/fl_{min,medio,max}` and `fator_pessimista/realista/otimista` (app/migrations/003); `fde`, `fde_availability`, `fde_efficiency` if `backend/migrations/002_add_fde_validation*.sql` was applied (unverified) | dimensionless factors | n/a (factors) | **CP2b**: for the 17 substrates, serve `cp2b_parameters` (via `/cp2b/parameters`) and flag the others as legacy. |
| B24 | `residuos.py` L409 (`/residuos/compare`, `fator_realista`) | Factor comparison | dimensionless | n/a | **CP2b** |
| B25 | `residuos.py` L295 (`/residuos/conversion-factors/`, table `conversion_factors`: `factor_value`, `final_factor`, `safety_margin_percent`) | Legacy V2 per-unit yield factors (unit per row; not inspected in the DB) | per row (unverified) | n/a | **Legacy** |
| B26 | `backend/app/services/map_metrics.py` L40 (`UPGRADING_EFFICIENCY 0.97`), L100-136 (`to_flat_dict`), L167-205 (`_compute_from_stored_biogas` ±FDE envelope) | Engine behind B10 | m³/yr | Q12 | **Remove** from the request path (keep it as a diagnostic). |
| B27 | `backend/app/services/biogas_forward.py` L1-159 (`FDE = FC × FCo × FS × FL × eta`, default `ch4_pct` 60) | Forward engine used by map_metrics and canonical_loader | — | — | **Remove** from the serving path, together with B26. |
| B28 | `backend/app/services/canonical_loader.py`, `biomass_availability.py`, `_canonical_biomass_configs.py`; data `data/canonical_parameters/feedstocks.yaml` (26 feedstocks, `fde.components{fc,fco,fs,fl}`, `availability`, `eta`) | Yaml factor source | dimensionless | n/a | **CP2b**: generate the 17 CP2b substrates from `cp2b_parameters` (§8.4). |
| B29 | `backend/app/migrations/003_residuos_schema.sql` L89-105 (factor columns); `004_import_panorama_data.sql` (38 residues with factor triples; `ON CONFLICT` updates only BMP/TS/VS/chemistry); `027_fix_fde_monotonicity.sql` (reorders 43/152 triples; `_medio` untouched) | DB factor tables | dimensionless | n/a | **Legacy** (no migration rewrite; add a column comment in a future migration) |
| B30 | `backend/migrations/002_add_fde_validation.sql`, `002_add_fde_validation_all_residues.sql` (`residuos.fde`, `fde_availability`, `fde_efficiency`) | Older FDE values (e.g. 0.2125) | dimensionless | n/a | **Legacy** |
| B31 | `backend/app/migrations/026_scenarios_real_ideal.sql` (`ch4_real_m3_year`, `ch4_ideal_m3_year`, `ch4_{real,ideal}_{agricultural,livestock,urban,forestry}_m3_year`, table `scenario_parameters`); `029_scenarios_per_residue.sql` | Atlas Real/Ideal columns, still in `municipalities` and served by B13 | Nm³ CH4/yr | T5 | **Remove** (drop in a new migration once B13 is fixed) |
| B32 | `backend/migrations/012_cp2b_residue_streams.sql` (`residue_streams_sp2023.biogas_m3_yr`, `energy_GWh_yr`, `energy_MWh_yr`); `013_cp2b_municipality_summary.sql` (`municipality_summary`, `mun_total_gwh`) | Legacy 2023 stream table. **"cp2b" in these names means the centre, not the v5.1 method.** | Nm³ CH4/yr; GWh thermal | T1 / T3 (Q4) | **Legacy** (consider renaming or commenting "legacy 2023 streams") |
| B33 | Writers of legacy columns: `backend/scripts/sync_db_canonical.py` (fills `municipalities.*_biogas_m3_year` from `residue_streams_sp2023`; MWh at 9.97 kWh/m³), `recalculate_biogas_canonical.py`, `import_v2_municipalities.py`, `cp2b_load_data.py` (loads 012/013) | Produce T1 | Nm³ CH4/yr | T1 | **Legacy** |
| B34 | `backend/scripts/load_scenarios_real_ideal.py`, `sp_scenarios_real_ideal.py` | Produce T5 | Nm³ CH4/yr | T5 | **Remove** (with B31) |
| B35 | Diagnostics: `backend/scripts/sp_fde_cascade.py`, `sp_theoretical_vs_mobilisable.py`, `compute_sp_canonical_totals.py` (source of T4/T6), `verify_sp_potential_scenarios.py`, `validate_fde_traceability.py`, `validate_manuscript_data.sql`, `run_manuscript_validation.py`; `scripts/calculate_fde_all_residues.py`, `scripts/generate_fde_migration_sql.py` | Legacy cascade and FDE calculators | — | T4, T6 | **Legacy** |
| B36 | `backend/scripts/load_national_intermediate_data.py` | Aggregates legacy totals into `intermediate_regions` (B19) | Nm³ CH4/yr | Q5 | **CP2b** |
| B37 | Data files: `data/fde_all_residues.json`, `data/fde_all_residues_patch.json`, `data/sao_paulo_biogas_potential_fde.json`, `backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx` (source of `residueFactors.ts`), `data/canonical_parameters/fde_flow_factors.csv` (Atlas Real/Ideal factors per flow), `data/canonical_parameters/SP_TOTAIS_CONSOLIDADOS_2026-07-30.json`, `docs/data/biogas_canonical_state_summary.csv`, `backend/data/sample_municipalities.json` | Legacy factor and total snapshots | — | T1-T5 | **Legacy** |

**Not counted.** These are out of scope or compute nothing:

- `/scientific/kinetics` (`backend/app/api/v1/endpoints/scientific.py` L51) serves BMP curves.
- `/calculator/submit` (`backend/app/routers/calculator.py` L78) only stores what the client computed.
- `/geospatial/proximity` (`geospatial.py` L757) returns names only.

---

## 4. Frontend

### 4.1 main + #229 (HEAD). Also present on the redesign.

**Paths that moved on the redesign** (similarity from `git diff -M`):

| HEAD path | Redesign path |
|---|---|
| `dashboard/advanced-analysis` | `/analysis` (89%) |
| `dashboard/technology-routes` | `/calculator` (100% for the engine) |
| `dashboard/compare` | `/compare` (89%) |
| `dashboard/proximity` | `/proximity` (91%) |
| `dashboard/scientific-database` | `/method/science-base` (87%) |

Line numbers below are HEAD's.

**What is already CP2b.** The following are not occurrences:

- `SERVED_*` field maps in `frontend/src/data/scenarioFactors.ts`, e.g. L99-100: `biogas_cp2b_n4/n3_m3_year`.
- `SERVED_BIOMETHANE_PER_CH4` (0.99/0.96).
- The Real/Ideal branches of `lib/mapValues.ts`.
- `MunicipalityProfilePanel.tsx` L108-118 under Real/Ideal.
- The CP2b shares on `app/[locale]/municipality/[ibge_code]/page.tsx` L210-250.
- The `DesktopLeftPanel` headline under Real/Ideal.

**`DATA_EXPORT_ENABLED = false`** (`frontend/src/lib/featureFlags.ts` L26) gates `ExportControl`, the analysis CSV and the proximity CSV. **The dossier XLSX/PDF links are not gated** (`municipality/[ibge_code]/page.tsx` L269, L329, L336).

| ID | file:line | What is shown or computed | Actual unit | State total today | Proposal |
|---|---|---|---|---|---|
| F1 | `frontend/src/data/scenarioFactors.ts` L12-17 (header with T6), L139-151 (`SCENARIO_RESIDUE_FACTORS`), L192-215 (`applyScenarioToProps`) | Legacy band multipliers on `*_biogas_m3_year`. The bands are off the map (`MAP_SCENARIOS` L167-170 = real/ideal) but still resolve via `?scenario=`. | Nm³ CH4/yr | T6 (claimed) | **Remove** |
| F2 | `scenarioFactors.ts` L124 (`CH4_FRACTION_OF_BIOGAS = 0.625`) | CH4 → biogas conversion. The CP2b equivalents imply a different fraction: 16.36/29.0 = 0.564 (N4); 19.18/34.05 = 0.563 (N3). | — | — | **Legacy**: keep only for legacy conversions; CP2b serves its own `biogas_cp2b_*`. |
| F3 | `frontend/src/lib/mapValues.ts` L105-122 (`pickScenario`), L223 / L244 / L286 band branches of `getBiogas/Methane/BiomethaneScenarioValue` | Read `biogas_{min,medio,max}_m3_yr`, `biogas_ch4_*`, `biomethane_*` (B10) | m³/yr | Q12 | **Remove** (band branches) |
| F4 | `mapValues.ts` L310 (`MWH_PER_M3_CH4 = 0.00997`), L318 (`getBioenergyScenarioValue`) | Bioenergy = CP2b CH4 × 9.97 kWh | MWh/yr **thermal** | N4: 5.97171e9 × 9.97 = 59,538 GWh/yr vs canonical 22,624 GWh/yr electrical | **CP2b** (energy convention, §9 Q-5) |
| F5 | `mapValues.ts` L394 (`getSectorScenarioValue` band stems) | Sector values under the bands | m³/yr | Q12 | **Remove** |
| F6 | `frontend/src/components/map/DesktopLeftPanel.tsx` L636-645 | Headline falls back to `total_biogas_m3_year` ("theoretical") when the scenario is not served | Nm³ CH4/yr | T1 19.9 bi/yr (comment L636) | **Remove** (the fallback; with F1 and F3 gone it is unreachable) |
| F7 | `frontend/src/app/[locale]/municipality/[ibge_code]/page.tsx` L255 (`energyMWh = total × 0.00997`) | Energy on the municipality page | MWh/yr thermal | per municipality | **CP2b** (energy convention) |
| F8 | `frontend/src/components/map/ComparisonPanel.tsx` L60-100 | Legacy `*_biogas_m3_year` from map features. These are stripped by `fields=map`, so the panel likely shows "—" (unverified at runtime). | Nm³ CH4/yr | — | **CP2b** |
| F9 | `frontend/src/components/ui/GlobalSearch.tsx` L64 (sort), L212 (display) `total_biogas_m3_year` | Same stripped field | Nm³ CH4/yr | — | **CP2b** |
| F10 | `frontend/src/components/map/MapComponent.tsx` L697 (band comment), L748-756 (`minBiogas`/`maxBiogas` and sector filters on legacy fields) | Filters that are likely inert because the fields are stripped | Nm³ CH4/yr | — | **CP2b** |
| F11 | `frontend/src/components/map/IntermediateRegionsMapLayer.tsx` L8, L76, L91-105 | Choropleth and popup of `total_biogas_m3_year` from `/intermediate-regions/geojson` (B19) | Nm³ CH4/yr | Q5 | **CP2b** |
| F12 | `frontend/src/components/map/ProximityMap.tsx` L123-270 (`biogas_m3_year`) | Radius potential (B20) | Nm³ CH4/yr | per query | **CP2b** |
| F13 | `frontend/src/components/map/CodigestionClusterLayer.tsx` L60; `CodigestionDetailPanel.tsx` L104, L184 | Cluster and pair biogas (B22) | Nm³ CH4/yr | per cluster | **CP2b** |
| F14 | `frontend/src/app/[locale]/dashboard/compare/page.tsx` L17-21 (type), L61 (fetch `/api/v1/geospatial/municipalities/{id}`, B5), L196-217 (rows) | Legacy total and sector rows. On the redesign: `app/[locale]/compare/page.tsx` L18-21, L212-235. | Nm³ CH4/yr (labelled biogas) | per municipality | **CP2b** |
| F15 | `frontend/src/lib/api/geospatialClient.ts` L95-106 (fallback summary), L203-255 (`/municipalities` list, legacy fields, `potential_category`) | Client for B4 / B7 | Nm³ CH4/yr | T1 | **CP2b** |
| F16 | `frontend/src/types/geospatial.ts` L29, L193, L295-319 | Types of the legacy fields | — | — | **CP2b** (types follow the payload) |
| F17 | `frontend/src/contexts/ComparisonContext.tsx` L14 (`total_biogas_m3_year` in the selection) | Selection chip value | Nm³ CH4/yr | — | **CP2b** |
| F18 | `frontend/src/app/[locale]/about/page.tsx` L143, L189, L470 (`AnimatedCounter end={4.6e9}` "m³ biogás/ano"), L478 (`6.4e6` biomethane, FIESP). On the redesign: same values at `about/page.tsx` L367-371. | Hard-coded state potential | claimed m³ biogas/yr | 4.6e9: no file derives it (it matches none of T1-T7 or C1) | **CP2b** (read N4 from `/cp2b/summary`; cite FIESP as an external benchmark) |
| F19 | `frontend/src/app/[locale]/dashboard/advanced-analysis/page.tsx`: header L6; imports `calculateFDE`/`calculateWeightedFDE` L79-90; `CODE_TO_STREAM` L100-116 (L110: sludge → `rsu_organic`); `computeRPRAdjustedBiogas` L118-155 (`crop_tons × rpr × bmp × 1000`, no TS/VS); theoretical L215-235; `effectiveFactors` with a √(avg FDE) approximation L288-297; `fdeAdjustedPotential` L302-303; CSV L500-512 (gated); KPI "Potencial Real (FDE)" L721-730 | The multi-criteria tool: legacy totals × user FDE | Nm³ CH4/yr (labelled biogas) | Theoretical = sum over `/analysis/*` (B16/B17) ≈ T1 (Q4); FDE-adjusted depends on sliders; default T7 | **Legacy** *(Step 0 pending)*, then rebuild (§8.5) |
| F20 | `frontend/src/types/analysis.ts` L16-25 (`DEFAULT_FACTORS` 0.90/0.20/0.88/0.84 → FDE 0.532), L28-33 (`FACTOR_RANGES`), L36-38 (`calculateFDE = fc × (1 − fcp) × fs × fl`), L57-95 (`PREDEFINED_SCENARIOS`, comments "~20.1B", "~15.3B m³ CH₄/yr near FIESP ~16B"), L111-150 (`FACTOR_DOCUMENTATION`), L192 (`RESIDUE_SCENARIOS`), L248-290 (`calculateWeightedFDE`) | Legacy factor model | dimensionless | T7 | **Legacy** |
| F21 | `frontend/src/components/analysis/FactorRangeSliders.tsx` L5-139; `PerResidueFactorEditor.tsx` L9-147 (default `{0.85, 0.3, 0.85, 0.8}` L61); `ScenarioComparator.tsx` L26-208 | FC/FCp/FS/FL sliders | dimensionless | — | **CP2b**: rebuild as FC/FCo/FS/FL per substrate with min/med/max (§8.5) |
| F22 | `frontend/src/components/analysis/MethodologyPanel.tsx` L53-152 (formula `FDE = FC × (1−FCp) × FS × FL` L102-108) | Method text inside the tool | — | — | **Legacy** (until F21 lands) |
| F23 | `frontend/src/components/analysis/charts/PotentialCascadeChart.tsx` L5-222 | Theoretical → FDE cascade | Nm³ CH4/yr | depends on F19 | **CP2b** (N1 → N2 → N3 → N4 from `/cp2b/summary`) |
| F24 | `frontend/src/components/analysis/charts/BiomassFlowSankey.tsx` L15, L88, L323, L453, L467, **L520 `ch4Equivalent = availableBiogas × ch4Fraction`** | **Double conversion**: the input is already CH4, and it is multiplied by 0.625 again. The benchmark label is "FIESP ~16 bi m³ CH₄/ano". | shown as m³ CH4/yr, actually CH4 × 0.625 | understated by a factor 0.625 relative to its own input | **CP2b** (N-level flows); the bug disappears with the rebuild |
| F25 | `components/analysis/TopMunicipalitiesMiniCard.tsx` L15-132; `charts/RegionalPieChart.tsx` L70-83; `charts/TopMunicipalitiesChart.tsx` L52; `charts/CategoryComparisonChart.tsx`; `charts/DistributionHistogram.tsx` | Rankings and distributions of legacy totals (B17) | Nm³ CH4/yr | T1 / T3 | **CP2b** |
| F26 | `components/analysis/ReferencesModal.tsx` L120 ("Fatores de correção FDE"), L395 (literature: 84.99 bi Nm³/yr, 43.23 bi biomethane) | Literature text | — | — | **Legacy** |
| F27 | `frontend/src/data/residueFactors.ts` L1-10 (source `backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx`), L47-508 (`DETAILED_RESIDUES`, 25 residues with fc/fcp/fs/fl/bmp/rpr) | Frontend factor table (§8.1) | dimensionless | n/a | **Legacy** (its CP2b-matching rows move to `cp2b_parameters`, §8.4) |
| F28 | `frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts` L97-100 (`SUGARCANE_STREAMS`: e.g. bagaço `fde .20`, palha `.40`, vinhaça `.90`, torta `.35`), L104-109 (`LIVESTOCK_PPB` m³ biogas/head/yr: swine 200, cattle_beef 350, cattle_dairy 500, poultry_eggs 1.4, poultry_meat 0.8), L141-150 (`CROP_PARAMS` avail corn .50, soy .45, coffee .70, citrus .60), L294-348 (`calcBiogasFrom*`), L189-191 (tiers); `BIOMETANO_BRL 4.50`; `CH4_LHV_MJ 35.8`. Steps `StepAtividade`, `StepOutputs`, `StepSazonalidade`, `ResultsDashboard`, `BiogasCalculator`. | Plant-scale calculator with its own factors | m³ biogas/yr | per project | **Legacy** *(Step 0 pending)*, then re-base (§8.5) |
| F29 | `frontend/src/app/[locale]/dashboard/scientific-database/page.tsx` L87-96 (KPI "Fatores FDE" = share of residues with complete fc/fcp/fs/fl medio); `frontend/src/types/scientific.ts` L69 (`hasCompleteFde`); `services/scientificApi.ts` L63 (`/residuos/?limit=500`). On the redesign: `/method/science-base/page.tsx` L93-95. | Coverage KPI over the DB factor table (B23) | % | n/a | **Legacy** |

### 4.2 Redesign-only additions (bd42cce)

**Switch state.** `METHOD_PAGES_ENABLED = false` is defined on the redesign only, at `frontend/src/lib/featureFlags.ts` L45. With it off:

- `/method`, `/method/fde`, `/method/scenarios` and `/method/validation` answer 404 (`components/method/requireMethodPages.ts` L6);
- they are left out of the menus, sitemap and breadcrumbs.

`/data`, `/data/[sector]`, `/data/[sector]/[residue]`, the landing page and the three file routes are **public**.

| ID | file:line (redesign) | What is shown | Actual unit | State total | Proposal |
|---|---|---|---|---|---|
| R1 | `frontend/src/data/residueCatalog.ts` L1-55 (catalogue keyed on `DETAILED_RESIDUES`; `residueFDE` L47-50 = `calculateFDE`) | The 25 legacy residues as public "data products" | dimensionless | n/a | **Hide** *(Step 0 pending)* |
| R2 | `frontend/src/components/data/ResidueTable.tsx` L3, L8, L16, L33-34, L61, L76 (FDE column on `/data/[sector]`) | FDE per residue | % | n/a | **Hide** *(Step 0 pending)* |
| R3 | `frontend/src/app/[locale]/data/[sector]/[residue]/page.tsx`: L59, L77-80 (fact "Disponibilidade (FDE)"); L106-141 (method tab: FC/FCp/FS/FL table, "Resulting FDE", and `method_potential`); L169-180 (API tab points to `GET /residuos/?limit=500`, B23) | Legacy FDE as a product fact. **The page shows residueFactors.ts values but sends API users to `/residuos`, which returns different DB values.** Example (bagasse): FE FCp 1.0 gives FDE 0; DB `fcp_medio` 0.18 and `fator_realista` 0.14. No `/cp2b/*` link. | % | n/a | **Hide** *(Step 0 pending)*; later re-key the catalogue on the 17 substrates |
| R4 | `frontend/src/app/[locale]/page.tsx` L18-19, L46-52 (counts: `residues = DETAILED_RESIDUES.length` = 25; sector lists from the catalogue), L58 (steps `data`, `factors`, `potential`) | Landing counts and "how a number is made" built on the FDE residues | count | 25 residues vs 17 CP2b substrates | **Hide** *(Step 0 pending)* |
| R5 | `frontend/src/app/[locale]/method/fde/page.tsx` L2-133 (table of the 25 residues with FC/FCp/FS/FL/FDE, `abbr('fcp') = 'FCp'` L37) | Factor page | — | n/a | **Hide** (already: flag off). Must be rewritten to v5.1 before the flag flips: title "Fatores de disponibilidade (cascata CP2b)", no "FCp". |
| R6 | `frontend/src/app/[locale]/method/page.tsx` L46 (`fde`, `potential` cards; keys `method.overview.fde_formula`, `potential_formula`) | "Potential = Generation × FDE × BMP" | — | — | **Hide** (already) |
| R7 | `frontend/src/app/[locale]/method/scenarios/page.tsx` L2-50, which renders: `method.scenarios.definitions` ("follow the Atlas de Bioenergia SP 2020"); `ideal_body` ("All the residue generated is collected"); `ch4_body` ("Methane is taken as {share} [62.5 %] of raw biogas … the same value on the server and in the browser", L12, L45) | **Three claims that contradict CP2b.** Real/Ideal are CP2b N4/N3, not Atlas. N3 still applies FC and FCo. CP2b biogas equivalents use substrate-specific CH4 fractions (~0.564 implied). | — | — | **Hide** (already); rewrite before release |
| R8 | `frontend/src/app/[locale]/method/validation/page.tsx` L13, L37 (confidence lists over `DETAILED_RESIDUES`) | Legacy confidence levels | — | — | **Hide** (already) |
| R9 | `frontend/src/lib/legendExports.ts` L28-35 (`residueCodesCsv`), served at `/data/pilar2b-residue-codes.csv` (`app/data/pilar2b-residue-codes.csv/route.ts`) | Public CSV of the 25 legacy residue codes as "the" residue code list | — | — | **CP2b**: publish the 17 substrate codes; keep the legacy codes in a separate column |
| R10 | `legendExports.ts` L18-25, L42-52, L65-90 (`mapLegendCsv`, `qgisRampsXml`), served at `/data/pilar2b-map-legend.csv` and `/data/pilar2b-qgis-ramps.xml`; breaks from `frontend/src/lib/mapMetrics.ts` L409-463 (exists on HEAD too) | Published reference class limits for biogas/biomethane/methane/bioenergy. These were set for the legacy distribution. The comment L411 says biogas ≈ 1.8 × CH4, but the platform factor is 1/0.625 = 1.6. | m³/day; MWh | — | **CP2b** (re-derive the fallback breaks from the N4 distribution) |
| R11 | `frontend/src/components/comparison/ComparisonPicker.tsx` L108 (`total_biogas_m3_year: feature.properties.total_biogas_m3_year` from `useGeospatialData`, i.e. `fields=map`) | Stripped legacy field, so likely `undefined` (unverified at runtime) | Nm³ CH4/yr | — | **CP2b** |

**Not counted.**

- `components/data/ResidueLiveFacts.tsx` L68-74 shows BMP and CH4 content from `/residuos` (inputs, not potentials).
- `components/data/DataCard.tsx` L7 is a comment example.
- `frontend/src/data/patch-notes.json` L74-75 describes `/cp2b/*` correctly.

---

## 5. Exports (dossier XLSX/PDF and CSV)

The dossier endpoints are `GET /api/v1/municipalities/{ibge}/dossie.xlsx|pdf`
(`municipalities.py` L962, L973). They are linked from the municipality page
and **not gated**. #229 already adds CP2b Real/Ideal rows and a `legacy_value`
note.

| ID | file:line | What is exported | Actual unit | State total | Proposal |
|---|---|---|---|---|---|
| E1 | `backend/app/services/municipality_exports.py` L145-149 (XLSX "Resumo": "Potencial total" = `total_biogas_m3_year` labelled m³ biogas with `legacy_value` note; daily L148; `potential_class` L149) | Headline potential | Nm³ CH4/yr (labelled biogas) | per municipality (T1 statewide) | **CP2b**: N4 as the headline; the CP2b rows at L160-161 are already right |
| E2 | `municipality_exports.py` L152-153 (energy) | Energy | MWh/yr thermal (legacy column) | per municipality | **CP2b** (energy convention) |
| E3 | `municipality_exports.py` L172-203 ("Setores": shares from legacy columns next to CP2b real/ideal) | Sector split | Nm³ CH4/yr | T3 | **CP2b** (view has `ch4_cp2b_n4_{sector}`) |
| E4 | `municipality_exports.py` L226-259 ("Resíduos": `coalesce(muni legacy, residue_streams_sp2023.biogas_m3_yr)`, `energy_mwh_yr`) | Per-stream table | Nm³ CH4/yr; MWh | T3 | **CP2b** (per substrate from `municipality_cp2b_potential`, med) |
| E5 | `municipality_exports.py` L647-650 (PDF `pdf_total_biogas`, `pdf_energy`) | PDF headline | Nm³ CH4/yr; MWh thermal | per municipality | **CP2b** |
| E6 | `municipality_exports.py` L667 (PDF sector bars) | Sector bars | Nm³ CH4/yr | per municipality | **CP2b** |
| E7 | `municipality_exports.py` L683-700 (PDF stream table `biogas_m3_yr`, `energy_mwh_yr`) | Stream table | Nm³ CH4/yr; MWh | per municipality | **CP2b** |
| E8 | `backend/app/services/dossier_text.py`. PT: `sec_biogas` L116, `total_potential` L117, `daily` L118, `class` L119, `energy` L121, `col_biogas` L141, `col_energy` L144, `legacy_label` / `legacy_value` L178-183, `pdf_method_note` L184-188, `pdf_total_biogas` L190, `pdf_energy` L191, `pdf_col_biogas` L208. EN mirrors at L239-327. | Labels for E1-E7 | — | — | **Legacy**: they must keep saying "legado" while E1-E7 carry legacy values; reword when they switch to CP2b |
| E9 | `backend/app/services/municipality_dossier.py` L27 (section `residue_streams`; L34 is the CP2b view section, fine) | Data gathering for E4/E7 | — | — | **CP2b** |
| E10 | `frontend/src/components/map/ExportControl.tsx` L112-139 (CSV "cp2b-biogas-data": total, sector and residue `*_biogas_m3_year` from map features). Gated by `DATA_EXPORT_ENABLED = false`. | The fields are stripped by `fields=map`, so the file would carry blanks or zeros. **The file name says "cp2b".** | Nm³ CH4/yr | — | **CP2b** (before the flag is turned on) |
| E11 | `advanced-analysis/page.tsx` L500-512 (CSV with FDE columns; gated L596, L1064) | Analysis CSV | — | — | **Legacy** (with F19) |
| E12 | `frontend/src/services/proximityApi.ts` L85, L187, L262, L292; `dashboard/proximity/page.tsx` L183-198 (CSV labels; gated L42, L434) | Proximity CSV | Nm³ CH4/yr | per query | **CP2b** |

---

## 6. i18n

**Files.** `frontend/messages/pt-BR.json` and `frontend/messages/en.json`. Both branches have identical key sets in the two locales.

**Selection rule.** A key is included if its path matches `/fde|fcp/i` or its value contains `FDE` or `FCp`.

**Naming.** "FDE" becomes "Fatores de disponibilidade (cascata CP2b)" / "Availability factors (CP2b cascade)". That name is used only together with v5.1 values, never to label old FDE numbers, and no "FCp" may be visible.

### 6.1 FDE/FCp keys on HEAD: 40 per locale

pt-BR lines: 178, 180, 219, 233, 1044, 1054, 1063, 1068, 1085, 1087, 1091, 1110, 1111, 1391, 1672, 1673, 1749, 1757-1759, 1768-1774, 1784-1786, 1793, 1796, 1799, 1840-1868.

| Namespace | Keys | Proposal |
|---|---|---|
| `landing.screenshots` (2) | `scientific_basis.alt`, `scientific_basis.description` | **Legacy** |
| `landing.features` (2) | `mcda.features[0]`, `collaborative.features[3]` | **Legacy** |
| `pages.advanced_analysis` (7) | `subtitle`, `kpi_fde`, `label_fde`, `chart_scenario_comparison`, `csv_fde`, `industrial_selection_body`, `table_summary` | **Legacy** *(Step 0 pending)* |
| `pages.scientific_database` (2) | `kpi.fde`, `kpi.fde_hint` | **Legacy** |
| `pages.municipality` (1) | `print_sources` | **CP2b** (cite CP2b v5.1 as the source of the printed figures) |
| `charts` (2) | `cascade_title`, `cascade_fde_label` | **CP2b** (N1-N4 cascade) |
| `analysis.factors` (1) | `fcp_label` | **CP2b** (FCo, v5.1 semantics) |
| `analysis.factor_docs` (3) | `fcp_title`, `fcp_desc`, `fcp_context` | **CP2b** |
| `analysis.methodology_panel` (8) | `title`, `formula_heading`, `formula`, `about_heading`, `about_text`, `interp_high_detail`, `interp_medium_detail`, `interp_low_detail` | **CP2b** |
| `analysis.scenario_comparator` (3) | `fde_label`, `col_fcp`, `col_fde` | **CP2b** |
| `analysis.per_residue_editor` (8) | `subtitle`, `empty_state`, `current_fde`, `default_fde`, `fde_calc_heading`, `fcp_label`, `fcp_desc`, `average_fde` | **CP2b** |
| `analysis.factor_sliders` (1) | `resulting_fde` | **CP2b** |

Totals: **CP2b** 27, **Legacy** 13.

### 6.2 FDE/FCp keys added on the redesign: 34 per locale

The redesign total is 73: 40 inherited, minus `landing.features.collaborative.features[3]`, plus these 34.

Redesign pt-BR lines of the new keys: 33, 54, 223, 225, 246, 1638, 2483, 2512, 2513, 2572, 2576, 2594, 2596, 2602, 2603, 2607-2609, 2613, 2614, 2630, 2715-2717, 2723-2730 (and the `method.fde` block that follows).

| Namespace | Keys | Proposal |
|---|---|---|
| `common.nav` (1) | `method_fde` | **Hide** (already gated); rename when shown |
| `common.nav_descriptions` (1) | `method_fde` | **Hide** (already gated) |
| `metadata` (1) | `description` | **CP2b** (rewrite) |
| `pages.about` (1) | `faq.potential.a` ("Available potential applies … correction factors (FDE)") | **CP2b** (rewrite to the N1-N4 cascade) |
| `home.counts` (1) | `residues` ("residues with FDE factors") | **Hide** *(Step 0 pending)* |
| `home.how` (2) | `steps.factors.title`, `steps.factors.body` ("collection (FC), competing uses (FCp), seasonality (FS) and logistics (FL)") | **Hide** *(Step 0 pending)* |
| `data_catalog.table` (2) | `caption`, `fde` | **Hide** *(Step 0 pending)* |
| `data_catalog.product` (10) | `card_scope`, `card_source`, `fact_fde`, `fact_fde_note`, `method_heading`, `method_formula`, `method_lede`, `method_result`, **`method_potential`**, `validation_source` | **Hide** *(Step 0 pending)*. `method_potential` claims "generation × FDE × BMP, in the real and ideal scenarios", which is **false**: Real/Ideal are CP2b N4/N3. |
| `method.overview` (3) | `fde_formula`, `fde_formula_note`, `potential_formula` | **Hide** (already gated) |
| `method.fde` (12) | `title`, `lede`, `factors_heading`, `context_label`, `competition_note`, `table_heading`, `table_caption`, `col_residue`, `col_sector`, `col_confidence`, `bands_heading`, `bands_lede` | **Hide** (already gated). `title` = "Availability factors (FDE)" must become "Availability factors (CP2b cascade)" with v5.1 values. `competition_note` explains "(1 − FCp)" and must go. |

Totals: **Hide** 32, **CP2b** 2.

### 6.3 Other potential strings (not FDE/FCp): 22 keys per locale

| Keys (pt-BR line on HEAD) | Content | Proposal |
|---|---|---|
| `Map.scenario_fronteira_tip` (427), `pages.advanced_analysis.frontier_note` (1035), `analysis.scenarios.frontier_desc` (1733), `analysis.residue_scenarios.frontier_desc` (≈1743) | Band "Fronteira" scenario, "31 resíduos", "supera o benchmark FIESP (~6,4 Mm³/d de biometano)" | **Remove** (4) |
| `pages.advanced_analysis.kpi_theoretical` (1053) | "Potencial Teórico" | **Legacy** (1) |
| `charts.category_comparison_dataset` / `_tooltip` / `_yaxis` (1679-1681), `charts.histogram_title` (1683), `charts.histogram_xaxis` (1685) | "Potencial Total (bilhões m³/ano)" and similar, labelled biogas | **Legacy** (5) |
| `charts.sankey_title` (1694), `charts.sankey_node_theoretical` (1698), `charts.sankey_benchmark_label` (1716, "Referência FIESP: ~16 bilhões m³ CH₄/ano") | Sankey | **CP2b** (3) |
| `pages.about.stat_biogas` (1418), `stat_biogas_short` (1423), `unit_m3_biogas` (1506) | Units of the hard-coded 4.6e9 counter (F18) | **CP2b** (3) |
| Redesign: `home.how.steps.potential.title`, `home.how.steps.potential.body` (redesign en L2516-2517: "… gives biogas and biomethane per year, in the real and ideal scenarios") | Misattributes Real/Ideal to FDE × BMP | **Hide** (2) *(Step 0 pending)* |
| Redesign: `method.scenarios.definitions`, `real_body`, `ideal_body`, `ch4_body` (redesign en L2741-2746) | See R7 | **Hide** (4), already gated; rewrite |

Totals: **Remove** 4, **Legacy** 6, **CP2b** 6, **Hide** 6.

**Already CP2b on HEAD (not counted):** `Map.scenario_real_tip`, `Map.scenario_ideal_tip` and `Map.scenario_served_note` (en L430-432) describe CP2b N4/N3 correctly.

---

## 7. Docs and data files

| ID | file:line | Content | Unit / total | Proposal |
|---|---|---|---|---|
| D1 | `docs/data/FDE_METHODOLOGY.md` L25, L35 (`FDE = Availability × Efficiency`; `FDE = (1 − Competing_Uses) × Collection_Factor × η`), L67-69, L143-175 (e.g. cattle 21.25%, vinasse 7.7%, sludge 9.0%, bagasse 0%) | A fourth FDE definition (with η) | factors | **Legacy** |
| D2 | `docs/data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md` L15 (12.45 bi → 2.16 bi methane, 17.3%) | Old state totals | Nm³/yr | **Legacy** |
| D3 | `docs/data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md` (32 FDE mentions) | Literature factor table | factors | **Legacy** |
| D4 | `docs/data/README_FEEDSTOCK_FACTORS_SYNC.md` L157 (`FDE = FC × (1 − FCo) × FS × FL`), L163, L169-188 | Yet another sign convention (1 − FCo) | factors | **Legacy** |
| D5 | `docs/data/SCIENTIFIC_AUDIT_REPORT.md` (42 FDE mentions) | Factor audit | — | **Legacy** |
| D6 | `docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md` L386-388 (theoretical 22.21 bi; practical 2.38 bi; draft 12.85 bi) | Old totals | Nm³/yr | **Legacy** |
| D7 | `docs/data/RESULTADOS_SP_PARA_PAPER_2026-07-30.md` | Old results | — | **Legacy** |
| D8 | `docs/data/METODOLOGIA_RESUMO_APRESENTACAO_2026-08-01.md` L17 (21.46 / 26.96 M/day) | Atlas Real/Ideal (T5) | M/day | **Legacy** |
| D9 | `docs/data/METODOLOGIA_CENARIOS_SP_2026-07-30.md` | Atlas scenarios | — | **Legacy** |
| D10 | `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | Status of old totals | — | **Legacy** |
| D11 | `docs/data/FDE_TRACEABILITY_MATRIX.md` | FDE provenance | — | **Legacy** |
| D12 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md`, `docs/FOSS4G_2026.md` | Conference material | — | **Legacy** |
| D13 | `docs/DECISOES_METODOLOGICAS.md` L11 ("resultado de referência de 7,832 bi Nm³ CH₄/ano … Atlas Real … forma multiplicativa FDE"), L28 | States the Atlas/FDE figure as THE reference result | Nm³/yr (T5) | **CP2b**: add a superseding decision that CP2b v5.1 N4 (16.36 M/day) is the reference |
| D14 | `docs/HANDOFF_2026-07-30.md` L62 (Real 7.83 bi, Ideal 9.84 bi) | T5 | Nm³/yr | **Legacy** |
| D15 | `docs/CALCULATOR_METHODOLOGY.md` | Calculator factors (F28) | — | **Legacy** |
| D16 | `docs/auditorias/A_distancia_por_setor_atlas_vs_nossos_2026-08-07.md` (18 FDE mentions), `B_reexpressao_fde_2026-08-08.md`, `A_atlas_ancoragem_etapa1_2026-08-08.md`, `A17_…`, `A18_…`, `A19_…` | Past audits | — | **Legacy** |
| D17 | `README.md` L14, L63 ("FDE correction factors … 31 feedstocks"), L229-231, L352 | Public project description. 31 feedstocks vs 25 (residueFactors.ts), 26 (yaml), 38 (DB) and 17 (CP2b). | — | **CP2b** (rewrite to the CP2b cascade) |
| D18 | `docs/api/API_DOCUMENTATION.md` L111-334 (examples with `total_biogas_m3_year`; no `/cp2b/*`) | API reference | — | **CP2b** (document `/cp2b/*` and the view fields) |
| D19 | `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/planning/*` (roadmaps and playbooks mentioning FDE) | History and planning | — | **Legacy** |
| D20 | `docs/data/METADATA.json` (`epe_ben_2024` role "FDE factor sourcing") | Dataset metadata | — | **Legacy** |
| D21 | `docs/data/FIESP_BENCHMARK_EXTRACTION.md`, `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` | External benchmark (FIESP 0.625 fraction; ~6.4 M/day biomethane) | — | **Legacy** (external reference, keep) |

The data files are listed under B37.

---

## 8. Factors

### 8.1 Semantics: four sources, four meanings

| Source | Formula used | Competing-use factor | FS | FL | Extra |
|---|---|---|---|---|---|
| **CP2b v5.1** (`cp2b_parameters`, `cp2b_spatial_fl`) | N2 = N1 × FC; N3 = max(0, N2 × FCo − U); N4 = N3 × FS × FL | **FCo = share left for digestion** (multiplied). It replaces (1 − FCp). | **Storage loss**, applied at N4 (migration 034 L13-14: ~0.98-1.00 continuous, 0.85-0.97 stored seasonal) | **Spatial**, per municipality × substrate × scenario from the road network, variant B (`fl_b_codigestion_allocated`). Table 3 gives a state reference with min-max. | **U subtracted at N3**: methane already recovered by operating plants. No η. |
| Frontend `residueFactors.ts` / `types/analysis.ts` | FDE = FC × (1 − FCp) × FS × FL | **FCp = share going to competing uses** (complemented) | Seasonality | Constant per residue | — |
| DB `residuos` (app/migrations 003/004/027) | `fator_realista` = fc × **fcp** × fs × fl. The comment in 027 says "FDE = FC × FCo × FS × FL". | Column named `fcp_medio` but **used multiplicatively as availability** (e.g. BAGACO 0.95 × 0.182 × 0.9 × 0.9 = 0.1399 = `fator_realista`) | Seasonality | Constant | `fde`, `fde_availability`, `fde_efficiency` (backend/migrations/002) |
| `feedstocks.yaml` | availability = FC × FCo × FS × FL; FDE = availability × η | `fco` = surplus fraction (multiplied) | Seasonality | Constant | **η** (conversion efficiency, 0.55-0.85) |

The docs add two more definitions: D1 (Availability × Efficiency) and D4 (FC × (1 − FCo) × FS × FL). So the same symbol carries opposite meanings: frontend `fcp` is about the complement of what DB `fcp` is about.

### 8.2 Values: the three legacy sets (medio)

**CP2b: see `cp2b_parameters`.** The per-substrate CP2b factors are not reproduced here: they belong to the unpublished paper and live only in the checksummed snapshot loaded into `cp2b_parameters` (and `cp2b_spatial_fl` for FL). Compare against the database, never against numbers typed into the repo.

**Columns.**

- **yaml**: `feedstocks.yaml` fc / fco / fs / fl.
- **DB**: migration 004 `fc_medio` / `fcp_medio` (used as availability) / `fs_medio` / `fl_medio`. Migration 027 leaves `_medio` unchanged. The live DB may differ if a later loader rewrote the rows (unverified, Q10).
- **FE**: `residueFactors.ts` fc / **(1 − fcp)** / fs / fl. The complement is shown so that the column is comparable with FCo.

| CP2b substrate | yaml | DB (004) | FE |
|---|---|---|---|
| PALHA (straw) | PALHA .85 / .10 / .90 / .85 | PALHA .55 / .083 / .85 / .75 | AG_CANA_PALHA .85 / .10 / .90 / .85 |
| TORTA_FILTRO | .90 / .30 / .88 / .85 | .95 / .333 / .90 / .90 | .95 / .33 / .90 / .90 |
| VINHACA | .95 / .15 / .90 / .90 | .98 / .111 / .90 / .95 | .95 / .15 / .90 / .90 |
| BAGACO (surplus) | .95 / .22 / .90 / .90 | .95 / .182 / .90 / .90 | .95 / **0.00** / .90 / .90 (FDE 0) |
| PALHA_MILHO | .50 / .1667 / .85 / .67 | .50 / .167 / .85 / .67 | AG_MILHO_PALHA .70 / .15 / .85 / .60 |
| PALHA_SOJA | .75 / .15 / .85 / .55 | .25 / .125 / .75 / .35 | AG_SOJA_PALHA .60 / **0.00** / .80 / .60 (FDE 0) |
| BAGACO_CITROS (citrus pulp) | .85 / .30 / .90 / .75 | .55 / .286 / .70 / .90 | AG_CITROS_BAGACO .85 / .30 / .90 / .75; **AG_CITROS_POLPA .75 / .25 / .90 / .70** |
| CASCA_CAFE | .70 / .50 / .85 / .65 | .87 / .333 / .70 / .80 | AG_CAFE_CASCA .70 / .50 / .85 / .65 |
| AVES_CORTE (broiler litter) | CAMA_AVIARIO .80 / .50 / .90 / .75 | CAMA_AVIARIO .87 / .286 / 1.00 / .85 | PEC_CAMA_AVIARIO .80 / .50 / .90 / .75 |
| AVES_POSTURA (layer manure) | DEJETOS_AVES .75 / .60 / .92 / .70 | DEJETOS_AVES .85 / .25 / 1.00 / .85 | — |
| BOV_LEITE | ESTERCO_BOVINO .55 / .45 / .82 / .65; DEJETOS_BOVINO .75 / .50 / .88 / .68 | ESTERCO_BOVINO .70 / .286 / 1.00 / .77; DEJETOS_BOVINO .70 / .333 / 1.00 / .77 | PEC_ESTERCO_BOVINO .80 / .45 / .85 / .70 |
| BOV_CONFINADO | (same bovine rows) | (same) | (same) |
| **BOV_PASTO_MISTO** (factors: `cp2b_parameters`) | (same bovine rows) | (same) | (same) |
| SUINOS | DEJETOS_SUINO .90 / .55 / .95 / .72; ESTERCO_SUINO .90 / .55 / .95 / .75 | DEJETOS_SUINO .90 / .50 / 1.00 / .90; ESTERCO_SUINO .87 / .455 / 1.00 / .90 | PEC_DEJETOS_LIQUIDOS_SUINO .90 / .55 / .95 / .75 |
| RSU_ORGANICO (OFMSW) | FORSU .90 / .65 / .90 / .80; ORGANICO_RSU .90 / .12 / .92 / .82 | FORSU .50 / .85 / .95 / .80; ORGANICO_RSU .45 / .80 / .95 / .80 | URB_FORSU_SEPARADA .90 / .65 / .90 / .80 |
| LODO_ETE (primary sludge) | LODO_PRIMARIO .85 / .75 / .95 / .90 | LODO_PRIMARIO .96 / .65 / 1.00 / .92 | URB_LODO_PRIMARIO .85 / .75 / .95 / .90 |
| PODA_URBANA | PODA_URBANA .50 / .35 / .80 / .75 | — (no row in 004) | — |

**Range examples** (min / med / max), for the slider discussion:

| Factor | yaml | CP2b |
|---|---|---|
| PALHA fc | .78 / .85 / .92 | — |
| PALHA fco | .05 / .10 / .18 | — |
| BAGACO fco | .15 / .22 / .38 | — |
| VINHACA fco | .10 / .15 / .28 | — |
| PALHA_MILHO fc | .25 / .50 / .65 | — |
| PALHA_MILHO fl | .35 / .67 / .75 | per municipality: see `cp2b_spatial_fl` |

**Reading of the comparison.**

1. **Competing use.** CP2b moves straw's agronomic retention into FC and treats most of what is collected as free for digestion (FCo), where all legacy sets put the restriction on the competing-use factor instead. For several sugarcane streams the gap is large in both directions; check each against `cp2b_parameters` (Q1-Q14), not against this file.
2. **FS.** It is not comparable between CP2b and the legacy sets. CP2b FS is a storage loss; legacy FS is seasonality (0.70-1.00). Equal numbers do not mean the same thing.
3. **FL.** It is not comparable either. CP2b FL is municipal and spatial, with wide spreads across municipalities (`cp2b_spatial_fl`). The legacy FL is a single constant.
4. **U and η.** U (CP2b) and η (yaml) have no counterpart in the other set.
5. **Sliders.** A slider built for one convention will be read with the other unless the labels change. This is the reason for "no visible FCp".

### 8.3 Mapping the 25 frontend FDE residues to the 17 CP2b substrates

| # | FDE residue (`residueFactors.ts`) | CP2b substrate | Match |
|---|---|---|---|
| 1 | URB_LODO_PRIMARIO | LODO_ETE | yes |
| 2 | URB_LODO_SECUNDARIO | LODO_ETE | partial (Table 3 names primary sludge only) |
| 3 | URB_FORSU_SEPARADA | RSU_ORGANICO | partial (source-separated vs total organic fraction) |
| 4 | PEC_DEJETOS_LIQUIDOS_SUINO | SUINOS | yes |
| 5 | PEC_ESTERCO_BOVINO | BOV_LEITE + BOV_CONFINADO + BOV_PASTO_MISTO | partial (1 → 3 split by herd system) |
| 6 | PEC_CAMA_AVIARIO | AVES_CORTE | yes |
| 7 | AG_CANA_BAGACO | BAGACO | yes (CP2b: surplus bagasse) |
| 8 | AG_CANA_PALHA | PALHA | yes |
| 9 | AG_CANA_TORTA_FILTRO | TORTA_FILTRO | yes |
| 10 | AG_CANA_VINHACA | VINHACA | yes |
| 11 | AG_MILHO_PALHA | PALHA_MILHO | yes |
| 12 | AG_SOJA_PALHA | PALHA_SOJA | yes |
| 13 | AG_CITROS_BAGACO | BAGACO_CITROS | partial (same code stem; Table 3 calls the substrate "citrus pulp") |
| 14 | AG_CITROS_CASCAS | BAGACO_CITROS | partial (no separate CP2b substrate; unverified whether it is included) |
| 15 | AG_CITROS_POLPA | BAGACO_CITROS | yes (same substrate) |
| 16 | AG_CAFE_POLPA | — | no match |
| 17 | AG_CAFE_CASCA | CASCA_CAFE | yes |
| 18 | AG_CAFE_MUCILAGEM | — | no match |
| 19 | IND_BAGACO_MALTE | — | no match |
| 20 | IND_TRUB_CERVEJA | — | no match |
| 21 | IND_SORO_LATICINIOS | — | no match |
| 22 | IND_RESIDUO_ABATEDOURO | — | no match |
| 23 | IND_VISCERAS_NAO_COMESTIVEIS | — | no match |
| 24 | IND_RESIDUO_PROCESSAMENTO_VEGETAL | — | no match |
| 25 | IND_CASCA_EUCALIPTO | — | no match (forestry is not a CP2b substrate) |

**FDE → CP2b:** 11 full matches, 5 partial, 9 without a match.

**CP2b → FDE:** 15 of 17 substrates have an FDE counterpart; the three cattle substrates share one. Two have none:

- **AVES_POSTURA**: it exists as DEJETOS_AVES in the yaml and DB, but not in `residueFactors.ts`.
- **PODA_URBANA**: it exists in the yaml only.

**The 17th substrate.** Table 3 lists 16 substrates. The 17th, from `SUBSTRATES` in `backend/scripts/load_cp2b_potential.py`, is **BOV_PASTO_MISTO** (pasture or mixed beef cattle; residue `cattle`; not lignocellulosic). Its FC/FCo/FS/FL come from `cp2b_parameters` (§9 item 2, answered; Q8).

**Stream level** (map residue filter). The legacy streams in `residue_streams_sp2023` and T3 are 12. The CP2b residues (the view's `_{residue}` columns) are 11. The differences:

- Legacy has **forestry** and **aquaculture**, which CP2b does not.
- CP2b has **sewage**, which legacy does not: legacy folds sludge into `rsu_organic` (B15, F19).

**Existing link.** `cp2b_spatial_fl.residuos_codigo` already links CP2b substrates to `residuos.codigo` (app/migrations/034, loaded from the raw FL snapshot). Its contents are not in git; Q11 lists it.

### 8.4 Proposal: `cp2b_parameters` as the single source

1. **Authority.** `cp2b_parameters` (min/med/max, unit, source, status, method_version) is the only place where a factor value for the 17 substrates lives. It is loaded from the checksummed snapshot by `load_cp2b_potential.py`. Spatial FL lives only in `cp2b_spatial_fl`.
2. **Backend reads.** `/cp2b/parameters` already exists. `residuos.py` (B23/B24) and `canonical_loader.py` (B28) should take the 17 substrates' factors from it, joined via the `residuos_codigo` link (Q11). Every non-CP2b residue is returned with `method: "legacy"`.
3. **Frontend reads.** The redesign pages are server components using `serverGetJson`, so they can fetch `/cp2b/parameters` at build or request time.
   - If a static copy is needed, generate `frontend/src/data/cp2bParameters.generated.ts` from the same snapshot CSV with a script.
   - Add a test that fails when the generated file and the snapshot checksum differ.
   - Never hand-edit factor numbers in TS again.
4. **Freezing the old sources.**
   - `residueFactors.ts`, the `fde` blocks of `feedstocks.yaml` and the DB `fc/fcp/fs/fl` columns are frozen and labelled legacy.
   - The 9 FDE residues without a CP2b counterpart stay legacy-only (or are removed; §9 Q-9).
5. **Naming.** "Fatores de disponibilidade (cascata CP2b)" / "Availability factors (CP2b cascade)" appears only next to `cp2b_parameters` values. FCo is shown as FCo. No "FCp" anywhere visible.
6. **Provisional status.** Show `status = provisorio` per element, as the API already does. 11 of 17 substrates carry at least one provisional element (migration 034 L34). This status must reach the UI.

### 8.5 Calculator and multi-criteria sliders

**Multi-criteria tool** (F19-F25; `/analysis` on the redesign).

- **Data.** Replace the single global FDE (and the √(avg FDE) approximation) with per-substrate cascades from `/cp2b/municipalities/{ibge}`, which gives levels per substrate together with FL.
- **Sliders, one row per substrate:**

  | Control | Default | Bounds | Behaviour |
  |---|---|---|---|
  | FC | med | `min_value`-`max_value` of `cp2b_parameters` | Disabled and shown as "municipal" for AVES_CORTE, AVES_POSTURA and LODO_ETE, where Table 3 gives FC as municipal. |
  | FCo | med | min-max | — |
  | FS (storage) | med | min-max | — |
  | FL | the municipality's `fl_b_codigestion_allocated` | — | Read-only, with the min-max envelope across scenarios. An optional variant selector B/A/C/D uses the columns already in `cp2b_spatial_fl`. |

- **Recompute in the browser** with the CP2b formula: N2 = N1 × FC; N3 = max(0, N2 × FCo − U); N4 = N3 × FS × FL.
  - N1 and U come from the served data. U is not user-editable. Whether U is served per substrate is unverified (Q-4).
  - The med preset must reproduce C1 exactly. Add that as a test.
- **Presets** become the CP2b scenarios min / med / max (an envelope, not a probability interval), replacing `PREDEFINED_SCENARIOS`.
- **Lignocellulosic toggle.** "Without lignocellulosics" uses `ch4_cp2b_n{3,4}_non_lignocellulosic_m3_year` (expected N3 7.36, N4 6.54 M/day).
- **Until this lands:** label the tool legacy *(Step 0 pending)*, and fix or hide the Sankey double conversion (F24).

**Calculator** (F28; `/calculator` on the redesign).

- **Scope.** It works at plant or project scale from user-entered activity data, so it is not the municipal cascade.
- **Steps:**
  1. Label it "estimativa anterior (legado)" *(Step 0 pending)*.
  2. Re-base the per-substrate inputs on `cp2b_parameters`: generation (`g`), TS, VS, BMP, FC, FCo and FS, if those element names exist (Q-4).
  3. Replace `LIVESTOCK_PPB` (m³ biogas/head/yr) with g × TS × VS × BMP per head.
  4. Use the CP2b substrate CH4 fraction instead of fixed values.
- **FL** does not apply at plant scale. Set it to 1, or derive it from the user's transport distance.
- **Seasonality.** Keep `StepSazonalidade` as the monthly calendar, but do not call it FS, which in CP2b is storage loss.
- **Energy.** Use the convention chosen in Q-5.

---

## 9. Open questions for Lucas

1. **Provisional share.** *Answered:* both the N3 figure (migration 034 L34) and the N4 figure are correct. The UI shows the share for the level being viewed, N4 by default. `/cp2b/summary` returns both as `provisional_share: {n3, n4}`. Q9 checks them against the database.
2. **BOV_PASTO_MISTO.** *Answered:* it stays as the 17th substrate, with its factors from `cp2b_parameters` (Q8). Lucas checks Table 3.
3. **Municipal FC** (broiler, layer, sewage sludge). Should the slider show a state reference or only "municipal"?
4. **Element names** in `cp2b_parameters`. The unit-test fixture has only `BMP`. Confirm the names for FC, FCo, FS, U, g, TS and VS. Is U served per municipality × substrate?
5. **Energy convention.** The platform uses thermal LHV: 9.94 kWh/m³ in the backend, 9.97 in the frontend. That gives 59,359 GWh/yr for N4. The canonical figure is 22,624 GWh/yr electrical (× 0.38). Which one goes on the map metric "bioenergia", the dossier and the summary strip?
6. **CH4 fraction.** The platform uses 0.625 (FIESP) everywhere. The CP2b equivalents imply about 0.564. Should `CH4_FRACTION_OF_BIOGAS` and the `/method/scenarios` text follow CP2b?
7. **Citrus.** Should AG_CITROS_BAGACO, AG_CITROS_CASCAS and AG_CITROS_POLPA all map to BAGACO_CITROS? POLPA is the closest match.
8. **Sewage sludge.** Is LODO_ETE primary sludge only? If so, what happens to URB_LODO_SECUNDARIO?
9. **Non-CP2b residues** (2 coffee, 7 industrial, eucalyptus, and the yaml-only feedstocks). Keep them as legacy catalogue pages, hide them, or remove them?
10. **Band scenarios.** Remove `?scenario=` support for the bands entirely (F1, F3, F5, B10)?
11. **Headline level.** The backend describes Ideal (N3) as "CP2b headline figure" (`geospatial.py` `_cp2b_tiers`). The platform default is N4. Which one is the headline in text?
12. **Outside SP.** MG and other states have no CP2b. Show "no CP2b data" or labelled legacy values?
13. **Dossier headline.** Should "Potencial total" (legacy, labelled) be replaced by N4, or kept as a second, labelled row?
14. **`/api/v1/statistics/summary`** (B18) has no frontend consumer. Can it be removed, or does an external client use it?

---

## 10. Commands Lucas must run locally

Run these from `cp2b-workspace/NewLook/`. In `docker-compose.yml` the database service is `db`, the user `postgres` and the database `cp2b_maps`; production values may differ. Define a helper:

```bash
PSQL='docker compose exec -T db psql -U postgres -d cp2b_maps -c'
```

**Q1. Legacy municipal totals for SP** (B1-B9, E1-E7, F6; expect about T1).

```bash
$PSQL "SELECT count(*) n, sum(total_biogas_m3_year)/1e9 total_bi_yr, sum(total_biogas_m3_year)/365e6 total_M_day,
  sum(agricultural_biogas_m3_year)/1e9 agr, sum(livestock_biogas_m3_year)/1e9 liv, sum(urban_biogas_m3_year)/1e9 urb,
  sum(energy_potential_mwh_year)/1e6 energy_TWh
FROM municipalities WHERE ibge_code LIKE '35%';"
```

**Q2. Same sum with no SP filter** (B12, `/municipalities/stats/summary`).

```bash
$PSQL "SELECT count(*) n, count(*) FILTER (WHERE ibge_code NOT LIKE '35%' AND coalesce(total_biogas_m3_year,0) > 0) non_sp_nonzero,
  sum(total_biogas_m3_year)/1e9 total_bi_yr FROM municipalities;"
```

**Q3. Atlas Real/Ideal columns still in the table** (B13, B31; expect T5).

```bash
$PSQL "SELECT sum(ch4_real_m3_year)/1e9 real_bi, sum(ch4_ideal_m3_year)/1e9 ideal_bi,
  sum(ch4_real_m3_year)/365e6 real_M_day, sum(ch4_ideal_m3_year)/365e6 ideal_M_day
FROM municipalities WHERE ibge_code LIKE '35%';"
```

**Q4. Legacy 2023 streams** (B16, B17, B32, F19, F25; expect T1 / T3).

```bash
$PSQL "SELECT coalesce(residue_stream,'TOTAL') stream, sum(biogas_m3_yr)/1e9 bi_yr, sum(energy_mwh_yr)/1e6 TWh
FROM residue_streams_sp2023 GROUP BY ROLLUP(residue_stream) ORDER BY 2 DESC;"
```

**Q5. Intermediate regions** (B19, B36, F11).

```bash
$PSQL "SELECT count(*) n, count(*) FILTER (WHERE total_biogas_m3_year > 0) nonzero, sum(total_biogas_m3_year)/1e9 bi_yr FROM intermediate_regions;"
```

**Q6. CP2b verification** (C1; expect med 64.77 / 41.66 / 19.18 / 16.36; N3 min-max 7.73-44.96; N4 5.16-42.68).

```bash
$PSQL "SELECT scenario, sum(n1_ch4_nm3_year)/365e6 n1, sum(n2_ch4_nm3_year)/365e6 n2,
  sum(n3_ch4_nm3_year)/365e6 n3, sum(n4_ch4_nm3_year)/365e6 n4,
  sum(n4_biogas_eq_nm3_year)/365e6 n4_biogas, sum(n4_biomethane_eq_nm3_year)/365e6 n4_biomethane
FROM municipality_cp2b_potential GROUP BY scenario ORDER BY scenario;"
```

**Q7. Zero class and Guaíra** (expect 26; 322,472 and 365,766 Nm³/day).

```bash
$PSQL "SELECT count(*) FROM municipality_cp2b_map WHERE ch4_cp2b_n4_m3_year = 0 AND ch4_cp2b_n3_m3_year > 0;"
$PSQL "SELECT ch4_cp2b_n4_m3_year/365 n4_day, ch4_cp2b_n3_m3_year/365 n3_day FROM municipality_cp2b_map WHERE ibge_code = 3517406;"
```

**Q8. Element names and BOV_PASTO_MISTO** (§9 Q-2, Q-4).

```bash
$PSQL "SELECT element, count(*) n, count(*) FILTER (WHERE status='provisorio') prov FROM cp2b_parameters GROUP BY element ORDER BY element;"
$PSQL "SELECT element, min_value, med_value, max_value, unit, status FROM cp2b_parameters WHERE substrate='BOV_PASTO_MISTO' ORDER BY element;"
$PSQL "SELECT substrate, sum(n4_ch4_nm3_year)/365e6 n4_M_day FROM municipality_cp2b_potential WHERE scenario='med' GROUP BY substrate ORDER BY 2 DESC;"
```

**Q9. Provisional share on N3 and N4** (§9 Q-1).

```bash
$PSQL "WITH prov AS (SELECT DISTINCT substrate FROM cp2b_parameters WHERE status='provisorio')
SELECT sum(n3_ch4_nm3_year) FILTER (WHERE substrate IN (SELECT substrate FROM prov)) / sum(n3_ch4_nm3_year) share_n3,
       sum(n4_ch4_nm3_year) FILTER (WHERE substrate IN (SELECT substrate FROM prov)) / sum(n4_ch4_nm3_year) share_n4
FROM municipality_cp2b_potential WHERE scenario='med';"
```

**Q10. Live DB factor values** (B23, §8.2 DB column). The second query fails if `backend/migrations/002_*` was never applied.

```bash
$PSQL "SELECT codigo, fc_medio, fcp_medio, fs_medio, fl_medio, fator_realista FROM residuos WHERE fc_medio IS NOT NULL ORDER BY codigo;"
$PSQL "SELECT codigo, fde, fde_availability, fde_efficiency FROM residuos WHERE fde IS NOT NULL ORDER BY codigo;"
```

**Q11. Existing link between substrates and `residuos` codes** (§8.3, §8.4).

```bash
$PSQL "SELECT DISTINCT substrate, residuos_codigo FROM cp2b_spatial_fl ORDER BY 1, 2;"
```

**Q12. map_metrics bands at runtime** (B10, B26, F3; candidate T4). Requires the backend on :8000. That `ibge_code` is present in `fields=map` is unverified.

```bash
curl -s 'http://localhost:8000/api/v1/municipalities/geojson?fields=map' | jq '
  [.features[].properties | select((.ibge_code|tostring)|startswith("35"))] as $sp |
  { ch4_min:   ([$sp[].biogas_ch4_min_m3_yr   // 0]|add/365e6),
    ch4_medio: ([$sp[].biogas_ch4_medio_m3_yr // 0]|add/365e6),
    ch4_max:   ([$sp[].biogas_ch4_max_m3_yr   // 0]|add/365e6),
    biogas_medio: ([$sp[].biogas_medio_m3_yr  // 0]|add/365e6),
    legacy_total_present: ([$sp[] | select(.total_biogas_m3_year != null)] | length) }'
```

**Q13. The summary the frontend reads** (B7, B8, F6).

```bash
curl -s http://localhost:8000/api/v1/geospatial/statistics/summary | jq '{total_biogas_m3_year, total_raw_biogas_m3_year,
  total_energy_mwh_year, real: .scenarios.real.ch4_m3_day, ideal: .scenarios.ideal.ch4_m3_day,
  real_mwh: .scenarios.real.energy_mwh_year}'
```

**Q14. The unused second summary** (B18).

```bash
curl -s http://localhost:8000/api/v1/statistics/summary | jq .
```

**Q15. Backend tests.** `pytest.ini` runs `tests/unit`, `tests/integration` and `tests/compliance`, with `--cov-fail-under=40`.

```bash
cd backend && pytest -q
pytest tests/unit/test_load_cp2b_potential.py tests/unit/test_municipalities_logic.py -q -o addopts=""
```

**Runtime checks (manual, unverified here).**

- Open `/map` and check whether `ComparisonPanel` (F8), `GlobalSearch` (F9) and the `/compare` picker (R11, redesign) show blanks for the legacy total. These fields are stripped by `fields=map`, unless `useGeospatialData` tops them up (L256).

---

## Not verified in this audit

- Every DB-backed total. Q1-Q14 were not run: no database was available.
- Whether the live `residuos` factor values equal migration 004 (Q10).
- Whether `backend/migrations/002_add_fde_validation*.sql` is applied.
- How the map-payload consumers (F8-F10, R11) behave at runtime.
- The link between the `docs/data/biogas_canonical_state_summary.csv` "canonical_practical" columns (T4) and the served map_metrics bands.
- The element names in `cp2b_parameters` and whether U is served per municipality.
- External consumers of `/api/v1/statistics/summary`.
- Whether `AG_CITROS_CASCAS` is part of CP2b `BAGACO_CITROS`.
- Step 0 (`b1be4a4`) was read from git objects only. Its e2e test `e2e/held-factors.public.spec.ts` was not run, and the rendered pages were not inspected.

---

## 11. Step 0 (`b1be4a4`): removal list for Prompt 3

Step 0 does two things:

- It keeps the older tools' figures and calculations visible, marked "estimativa anterior (legado)".
- With `METHOD_PAGES_ENABLED = false`, it holds back every availability factor shown in the public catalogue and on the landing page.

Prompt 3 rebuilds these on CP2b v5.1. Each row below then has to be undone: the badge removed, or the held-back markup replaced by v5.1 content. Paths are under `cp2b-workspace/NewLook/frontend/`. Line numbers refer to `b1be4a4`.

### 11.1 The badge

- **Component:** `src/components/ui/LegacyBadge.tsx`. Props: `variant: 'default' | 'inverse'` and `className`.
- **Text:** i18n key `common.legacy.label`. pt-BR: "estimativa anterior (legado)" (pt-BR L149). en: "previous estimate (legacy)".
- **Test:** `src/components/ui/__tests__/LegacyBadge.test.tsx`.

When the last use below is gone, delete the component, its test and the `common.legacy.label` key in both locales.

### 11.2 Every LegacyBadge placement (11 renders in 8 files)

| # | file:line (`b1be4a4`) | Where it sits | Variant | Audit items it labels |
|---|---|---|---|---|
| L1 | `src/app/[locale]/analysis/page.tsx` L574 (import L11) | Under the page title and subtitle (`advanced_analysis.title` / `subtitle`) | default, `mt-3` | F19 (the whole multi-criteria tool) |
| L2 | `src/app/[locale]/analysis/page.tsx` L726 | On the `advanced_analysis.kpi_fde` card label ("Potencial Real (FDE)") | default, inline | F19 KPI |
| L3 | `src/components/analysis/MethodologyPanel.tsx` L83 (import L15) | Panel header | default | F22 |
| L4 | `src/components/analysis/PerResidueFactorEditor.tsx` L159 (import L6) | Panel header | default | F21 |
| L5 | `src/components/analysis/FactorRangeSliders.tsx` L112 (import L10) | Panel header | default | F21 |
| L6 | `src/components/analysis/ScenarioComparator.tsx` L119 (import L21) | Header, **loading** state | default | F21 |
| L7 | `src/components/analysis/ScenarioComparator.tsx` L136 | Header, **loaded** state | default | F21 |
| L8 | `src/components/analysis/charts/PotentialCascadeChart.tsx` L220 (import L22) | Header, loaded state | default | F23 |
| L9 | `src/app/[locale]/method/science-base/page.tsx` L99 (`legacy: true` on the `kpi.fde` card), rendered at L154 (import L14) | KPI "Fatores FDE" | default, inline | F29 |
| L10 | `src/app/[locale]/calculator/components/ResultsDashboard.tsx` L190 (import L6) | Results header (coloured band) | **inverse**, `mt-2` | F28 |

L6 and L7 are two renders of the same header, which makes 11 renders across the 10 rows.

**Prompt 3 action per row:**

- L1-L8: rebuild the multi-criteria tool on per-substrate FC/FCo/FS/FL from `cp2b_parameters` and `cp2b_spatial_fl` (§8.5). Then remove each badge. The `kpi_fde` card (L2) becomes an N4 or N3 KPI, and the cascade chart (L8) becomes N1→N4.
- L9: replace the KPI with a CP2b one, for example parameter coverage and provisional status from `/cp2b/parameters`. Then drop `legacy: true` and the badge.
- L10: re-base the calculator per §8.5 (Step 0 left `calculatorEngine.ts` unchanged). Then remove the badge.

The analysis CSV (E11) and the Sankey (F24, which double-applies 0.625) carry no badge. Prompt 3 should cover them together with L1.

### 11.3 What Step 0 put behind `METHOD_PAGES_ENABLED`

With the switch off, the original FDE content is not rendered, and the `*.held.*` text is shown in its place. Prompt 3 should replace the held branch with v5.1 content, not simply turn the switch on. Turning it on would bring back the 25 legacy residues' FDE (R1-R4).

**Code**

| # | file:line (`b1be4a4`) | Held back when the switch is off | Shown instead |
|---|---|---|---|
| H1 | `src/components/data/ResidueTable.tsx` L29, L34 (mobile `dl`, 3 → 1 column), L54, L79, L97 (desktop header and cells) | **FDE and confidence columns** on `/data/[sector]` | Code and BMP only |
| H2 | `ResidueTable.tsx` L70-72 | Table caption `data_catalog.table.caption` | `data_catalog.held.table_caption` |
| H3 | `src/app/[locale]/data/[sector]/[residue]/page.tsx` L79-89 | **Product facts "Disponibilidade (FDE)" and "Confiança"** | — |
| H4 | same file, L97 | — | `data_catalog.held.notice` ("factors under review") |
| H5 | same file, L272 | **The "Método" tab** (`product.tabs.method`: FC/FCp/FS/FL table, resulting FDE, `method_potential`) | Tab removed |
| H6 | same file, L208-216 | **Confidence section** (`product.validation_heading`, `confidence.*`, `confidence_meaning.*`, `validation_source`) | — |
| H7 | same file, L219-225 | Limitations `product.limitations.scope` and `.factors` | `data_catalog.held.limitations_scope` |
| H8 | same file, L46 (metadata) and L262-264 (data card) | `product.card_scope` and `product.card_source` ("FDE_Disponibilidade_Residuos_CP2B") | `data_catalog.held.card_scope` and `held.card_source` |
| H9 | `src/app/[locale]/data/[sector]/page.tsx` L26, L49-51 | `data_catalog.sector_page.lede` | `data_catalog.held.sector_lede` |
| H10 | `src/app/[locale]/data/page.tsx` L17, L31 | `data_catalog.catalog.lede` | `data_catalog.held.catalog_lede` |
| H11 | `src/app/[locale]/page.tsx` (landing) L105 | `home.counts.residues` ("residues with FDE factors") | `home.held.counts_residues` |
| H12 | landing L130 | `home.sectors.lede` | `home.held.sectors_lede` |
| H13 | landing L178, L181 | `home.how.steps.factors.title` / `.body` (FC, FCp, FS, FL named) | `home.held.factors_title` / `factors_body` |

**i18n keys added by Step 0** (same set in pt-BR and en; pt-BR around L2548-2551 and L2705-2711):

| Namespace | Keys |
|---|---|
| `home.held` (4) | `counts_residues`, `factors_title`, `factors_body`, `sectors_lede` |
| `data_catalog.held` (7) | `catalog_lede`, `sector_lede`, `table_caption`, `card_scope`, `card_source`, `notice`, `limitations_scope` |
| `common.legacy` (1) | `label` (§11.1) |

**Prompt 3 action.** Rebuild H1-H13 on CP2b v5.1:

- **Catalogue keys.** Re-key the catalogue on the 17 CP2b substrates (§8.3).
- **Columns, facts and Método tab.** The FDE column and facts become "Fatores de disponibilidade (cascata CP2b)", with FC / FCo / FS / FL from `cp2b_parameters`. The Método tab shows the N1→N4 cascade (§8.1), and no "FCp" appears anywhere.
- **Confidence.** Confidence becomes the `cp2b` / `provisorio` status per element.

Then delete the `*.held.*` keys and the switch branches above. The redesign keys flagged Hide in §6.2 (`data_catalog.table.*`, `data_catalog.product.*`, `home.counts.residues`, `home.how.steps.factors.*`) are the ones H1-H13 hold back. Rewrite them with v5.1 wording rather than restoring them; this applies in particular to `data_catalog.product.method_potential` and `home.how.steps.potential.body` (§6.3).

**Also in Step 0 (not labels).**

- `e2e/held-factors.public.spec.ts`: new. It checks that the landing, the catalogue and every product page show no "FCp", no FDE column and no residue FDE value. Prompt 3 must update it to assert the v5.1 content instead.
- `e2e/data-catalog.public.spec.ts`: adjusted.
- `src/data/patch-notes.json`: entry 3.3.0.
- A science-base copy change, `unavailable`, which no longer claims "the factors above … still hold".

**Still public after Step 0, and not behind the switch.**

- The `/data/pilar2b-residue-codes.csv` route (R9) still lists the 25 legacy codes.
- The `/method/*` pages (R5-R8) were already behind the switch before Step 0, and their text still needs the rewrite described in R5-R7.
- The landing still counts and lists the 25 legacy residues: `DETAILED_RESIDUES.length` at L53, and `residuesInSector` at L48 in `b1be4a4`. Step 0 changed only the label (`home.held.counts_residues` = "residues in the catalogue"). The catalogue and the landing therefore remain keyed on the legacy residue set until Prompt 3 re-keys them on the 17 substrates.
