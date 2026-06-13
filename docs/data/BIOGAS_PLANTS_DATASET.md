# Real-world Biogas/Biomethane Plants Dataset (Brazil, SP-first)

**Files**
- `analysis/data/05_biogas_plants_brazil.csv` — one row per plant (plant-level).
- `analysis/data/05b_biogas_aggregates_by_state.csv` — state/national aggregate figures (kept separate).
- `analysis/data/05_biogas_plants_brazil.xlsx` — both of the above as two sheets, for manual review.
- `analysis/build_biogas_plants_dataset.py` — reproducible generator (geocodes SP plants from the
  existing municipality centroids in `01_master_residue_streams_SP_2023.csv`).

**Scope:** São Paulo exhaustive + major national plants. Gathered June 2026 via a multi-source web
sweep, prioritizing official/operator sources. Currently **18 plants** (13 SP, 5 national).

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
