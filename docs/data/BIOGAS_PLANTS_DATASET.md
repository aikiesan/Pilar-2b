# Real-world Biogas/Biomethane Plants Dataset (Brazil, SP-first)

> **Expansion pass (2026-06): now built on official ANP "Dados Abertos" data.** The biomethane
> plants are no longer web-sourced estimates — they come from the ANP plant-level registry (CNPJ,
> authorized capacity, processed volume, utilization). See "ANP primary source" below.

**Files**
- `analysis/data/05_biogas_plants_brazil.csv` — one row per plant (**28 plants**: 20 ANP-authorized
  biomethane + 8 retained non-ANP power/planned).
- `analysis/data/05b_biogas_aggregates_by_state.csv` — state/national aggregate figures (kept separate).
- `analysis/data/05c_anp_biometano_plants_latest.csv` — ANP latest monthly snapshot, one row/plant.
- `analysis/data/05d_anp_biometano_production_state_monthly.csv` — ANP state×month×product production (m³).
- `analysis/data/05e_anp_biometano_plant_volume_monthly.csv` — ANP plant×month processed volume + utilization.
- `analysis/data/05f_anp_fleet_stats.csv` — fleet summary (capacity & count by state, SP share, utilization).
- `analysis/data/05_biogas_plants_brazil.xlsx` — multi-sheet (plants, anp_latest, fleet_stats,
  production_monthly, state_aggregates).
- `analysis/data/sources/anp/` — vendored raw ANP CSVs (provenance).
- `analysis/build_anp_biometano_dataset.py` — **current** generator (ANP integration + analysis).
- `analysis/build_biogas_plants_dataset.py` — original web-research generator (superseded; kept for history).

**Scope:** São Paulo exhaustive + major national plants. Biomethane plants from ANP Dados Abertos
(monthly 2020→2026); landfill *power* UTEs and planned SABESP plants from web/operator sources.

## ANP primary source (biomethane registry)
The `05c`–`05f` files and all `anp_status=anp_authorized` rows derive from two official ANP files
(vendored under `analysis/data/sources/anp/`): a plant-level **Capacidade** registry (authorized
biomethane m³/d, biogas-processing m³/d, processed biogas m³/d, utilization %) and a state-level
**Produção** series. Key facts (latest snapshot): **20 ANP-authorized biomethane plants, 10 in SP**;
national authorized capacity **≈1.23 M m³/d**; **SP ≈48%** of national capacity; **17/20 operating**
(processed>0); **median utilization ≈21%** — i.e. the fleet runs far below authorized capacity.

### New ANP columns in `05_biogas_plants_brazil.csv`
`cnpj`, `biogas_processing_nm3_day`, `processed_biogas_nm3_day_latest`, `utilization_pct_latest`,
`anp_status` (`anp_authorized` | `not_in_anp_biomethane_registry`). `biomethane_nm3_day` for ANP rows
= **authorized** capacity. `status` adds `authorized` (registered, no production yet) and `inactive`
(reporting lapsed, e.g. Gasgrid — a 2021–22 SP authorization that never produced).

### Parsing caveat (MG)
ANP numbers are Brazilian-formatted (`.` thousands, `,` decimal in Capacidade). In the Produção file
`.` is decimal; Minas Gerais shows near-zero values (e.g. `32.009`) consistent with a nascent plant
(ZEG Aroeira/Tupaciguara ramping) — flagged `mg_anomaly_flag` rather than reinterpreted.

### Deferred — ANEEL electrical generation
Biogas-fueled *electricity* UTEs live in ANEEL's SIGA / GD datasets. The owner's full file is ~1.5 GB
(local only). The uploaded ANEEL `...termeletrica.csv` is a technical-attributes table (no fuel
type/município); it joins to the big file via `CodGeracaoDistribuida`. Deferred to a later pass.

## Why two files
Plant-level rows and state aggregates must never be mixed: the aggregates are edition-sensitive and
counted differently per source. They live in `05b_*` and are for context only.

## Schema — `05_biogas_plants_brazil.csv`
Kept compatible with the existing `validation_plants` table
(`backend/migrations/010_create_validation_plants.sql`) so a future loader can ingest it unchanged.

| column | meaning |
|---|---|
| `plant_id` | stable slug PK |
| `plant_name` · `operator` | |
| `sector` | controlled: `landfill` · `sugarcane` · `sanitation` · `agro` · `industry` |
| `feedstock` | e.g. `landfill_gas`, `vinasse_filtercake`, `vinasse_filtercake_manure`, `sewage_sludge`, `msw_forsu`, `swine_manure` |
| `municipality` · `uf` · `lat` · `lon` | SP geocoded from repo centroids; non-SP from IBGE seat coords |
| `status` | controlled: `operating` · `construction` · `planned` · `deactivated` |
| `year_online` | |
| **`elec_capacity_mw`** | electrical capacity (MW) — power plants only |
| **`biogas_nm3_day`** | raw biogas volume (Nm³/day) |
| **`biomethane_nm3_day`** | upgraded biomethane volume (Nm³/day) |
| `annual_output_value` · `annual_output_unit` | e.g. 170000 MWh/year, 26000000 Nm3/year |
| `data_confidence` | `primary` (operator/official report) · `secondary` (news citing official) |
| `source_name` · `source_url` | official/source link for the row |
| `notes` | caveats, investment, offtake, source disagreements |

**Hard rule, enforced by the generator:** electrical capacity (MW) and gas volume (Nm³/day) are in
**separate columns and never coerced** into each other. A landfill power plant reports MW; a
biomethane plant reports Nm³/day; some report both.

## Data-quality notes (read before using)
- **Counts vs volume:** SP does **not** lead Brazil in plant *count* (Paraná does, ~525 in the 2025
  Panorama) — SP leads in *volume* (~4.9 M Nm³/day, ~84% sugar-energy). Earlier "SP = 348 plants"
  figures were stale; plant counts shift each Panorama edition. See `05b_*`.
- **Confidence:** 8 rows `primary` (operator/official), 10 `secondary` (reputable news citing
  official figures). Promote to `primary` as primary sources are confirmed.
- **Year/status drift:** a few plants (e.g. Raízen Costa Pinto) have conflicting years across
  sources; the `notes` field records the disagreement rather than guessing.

## Known sourcing gap — primary databases blocked here
This environment's network egress policy blocks two authoritative hosts, so they could **not** be
fetched programmatically. Pull them manually and they slot straight in:
- **ANEEL SIGA** (plant-level fiscalised MW, filter Fonte∈{Biogás, Resíduos Sólidos Urbanos, Gás de
  Aterro}, UF=SP, Fase=Operação):
  `https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel`
  → CSV: `.../resource/11ec447d-698d-4ab8-977f-b424d5deee6a/download/siga-empreendimentos-geracao.csv`
- **ABiogás "Panorama do Biogás 2024"**:
  `https://abiogas.org.br/wp-content/uploads/2025/06/PANORAMA-DO-BIOGAS-2024.pdf`
- **ABiogás/FIESP "O Biometano em São Paulo 2025"** (same report referenced by the FIESP-benchmark work):
  `https://abiogas.org.br/wp-content/uploads/2025/06/O-Biometano-em-Sao-Paulo_Potencial-e-Medidas-para-alavancar-a-producao_2025.pdf`

## Regenerate
```bash
python3 analysis/build_biogas_plants_dataset.py
```
Edit the `PLANTS` / `AGGREGATES` lists in the generator to add rows; SP municipalities auto-geocode.

## Not done this pass (deferred by owner)
Loader into `validation_plants` and wiring into `/api/v1/infrastructure/biogas-plants/geojson` +
`InfrastructureLayer.tsx`. The schema is intentionally compatible so this is a later, no-reshape step.
