# Cluster Analysis — São Paulo Biogas Potential

This directory contains exploratory cluster analysis of the 645-municipality biogas potential dataset, used to inform co-digestion pathways and infrastructure planning in PILAR-2b.

---

## Structure

```
analysis/
├── data/          # Input datasets (SP-2023 handoff: master streams, summaries, conversion factors)
└── outputs/       # Analysis results and visualizations
```

## Outputs

| File | Description |
|------|-------------|
| `outputs/cluster_analysis.csv` | Municipality cluster assignments with centroid distances and dominant residue type per cluster |
| `outputs/cluster_pca.png` | PCA scatter plot — municipalities projected onto first two principal components, colored by cluster |
| `outputs/cluster_heatmap.png` | Heatmap of normalized residue stream intensities per cluster |
| `outputs/cluster_sizes.png` | Bar chart showing the number of municipalities per cluster |

## Method

K-means clustering was applied to normalized residue stream vectors (agricultural, livestock, urban) across all 645 municipalities. PCA was used for dimensionality reduction and visualization. Results inform the co-digestion C:N ratio optimization module in the PILAR-2b backend.

## Related Code

- Backend service: `cp2b-workspace/NewLook/backend/app/services/codigestion_service.py`
- Data loading script: `cp2b-workspace/NewLook/backend/scripts/cp2b_clustering.py`

---

## Strategy prototypes (2026-10)

Reproducible scripts behind `cp2b-workspace/NewLook/docs/planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`. They read their reference numbers from the backend scripts instead of retyping them, and the uncertainty, realization, digestate, mandate, route-conversion, BNDES-benchmark, Integra Resíduos and landfill-catchment scripts have guard tests in `tests/`.

| Script | What it answers | Output |
|---|---|---|
| `build_sp_real_uncertainty.py` | How wide is the SP Cenário Real once parameter uncertainty is propagated, and which parameters drive it? (Monte Carlo + Sobol, numpy only) | `outputs/sp_real_uncertainty/` |
| `build_sp_realization_index.py` | What share of the mobilisable potential does SP actually produce as biomethane, month by month? (ANP open data) | `outputs/sp_realization_index/` |
| `build_sp_opportunity_sites.py` | Where would biogas plants go if supply were captured within a per-stream radius? (greedy maximal covering, checked against ANP plants and a random baseline) | `outputs/sp_opportunity_sites/` |
| `build_sp_digestate_nutrients.py` | How much N-P-K would SP digestate carry, and how much of it is genuinely new versus already returned to the soil today? | `outputs/sp_digestate_nutrients/` |
| `build_sp_mandate_coverage.py` | How much biomethane does each year's official mandate target require (same volumes as the platform's `/mandate` panel), and how far do SP's production, capacity, burned biogas and potential go towards it? | `outputs/sp_mandate_coverage/` |
| `build_sp_route_conversion.py` | Per Nm³ of CH4, when does selling biomethane beat burning biogas for power? (break-even environmental attribute by electricity price) | `outputs/sp_route_conversion/` |
| `build_bndes_capex_benchmarks.py` | What does a m³/day of biomethane capacity cost in Brazil, from public BNDES approvals? (deals: `cp2b-workspace/NewLook/data/canonical_parameters/bndes_biometano_operacoes.csv`; arithmetic: the backend `financing_service.py`) | `outputs/bndes_capex_benchmarks/` |
| `build_biogram_reconciliation.py` | Where and why does the IEA BioGRAM disagree with PILAR for SP (state, 11 regions, 30 sites)? Computes the PILAR side and the areas to draw; the BioGRAM side is typed into `data/07_biogram_sp_seed.csv`. Needs `outputs/sp_opportunity_sites/sites.csv`. | `outputs/biogram_reconciliation/` |
| `build_biogram_national_share.py` | Is the C16 map reading coherent with Brazil? SP's share of the national crop, herd and population (IBGE 2023) × BioGRAM 1.2 Brazil, against the map reading and PILAR N3. National gaps go in `data/08_brasil_totais_2023_seed.csv`. Needs `outputs/biogram_reconciliation/pilar_por_area.csv`. | `outputs/biogram_national_share/` |
| `build_sp_biolng_santos.py` | C25 (speculative): how much methane lies within 50–200 km of the port of Santos (Atlas Real, CP2b N3 with the snapshot, ANP plants), what bio-LNG scale it supports, and what FuelEU Maritime would pay per m³ against the domestic attribute. Reuses the reconciliation helpers and the mandate parameters. | `outputs/sp_biolng_santos/` |
| `build_sp_green_corridors.py` | C24: CNG stations from the ANP price survey (`data/sources/anp/anp_postos_gnv_sp.csv`, written by `ingest_anp_postos_gnv.py`) along six SP highway corridors, the ANP plants producing within 50 km, Atlas Real (and CP2b N3 with the snapshot), and the stations with no producing plant nearby. Reuses the reconciliation helpers and the C25 plant table. | `outputs/sp_green_corridors/` |
| `build_integra_residuos.py` | C23: per Integra Resíduos block, collected RSU and FORSU, methane by digestion and by landfill capture (Atlas Tabela V.6 ratio, alternatives not a sum), share of the minimum plant scale, the new digestate nutrient, landfill CAPEX from the BNDES benchmarks, nearby landfill/FORSU plants and a draft pre-feasibility card (C2). Block members are typed with their source into `data/09_integra_residuos_blocos_seed.csv`; until then a labelled IBGE intermediate region runs as a demonstration. | `outputs/integra_residuos/` |
| `build_bacias_aterro.py` | C23 v2: the regional blocks that already exist. Groups SP municipalities by the destination CETESB records in `Dispoe_em` (IQR layer, `data/sources/cetesb/`) and runs each landfill catchment through the C23 block calculation: both methane routes, minimum scale, new nutrient, CAPEX and the capture plants already in the destination. Municipalities with several destinations, a destination outside SP or an empty field are listed apart, never assigned. `--ano 2022\|2023\|2024`. | `outputs/integra_residuos/bacias_aterro/` |
| `build_cp2b_fluxos.py` | CP2b × Atlas Real, step by step, for vinasse, filter cake, cattle, swine, poultry, sewage and RSU. The platform headline already serves CP2b N3/N4; the prototypes use the Atlas Real chain. Splits the gap per stream into N1 ÷ Atlas, FC, FCo, existing use and FS × FL, by state and IBGE intermediate region, and flags streams more than 20 % apart at N4. The CP2b side needs the verified v5.1 snapshot. | `outputs/cp2b_fluxos/` |
| `build_evidencia_bmp.py` | BMP evidence library. Places each record of the Literature Watch `REGISTRY_bmp` (dated copy in `data/literature_watch/`) against the CP2b v5.1 BMP range and the `feedstocks.yaml` range for the same substrate code. Only raw substrates are judged; a value outside a range is evidence to check, not an error. Lists the registry's substrates that CP2b does not model. The CP2b column needs the verified v5.1 snapshot. | `outputs/evidencia_bmp/` |
| `build_evidencia_geracao.py` | Manure generation evidence. Maps each record of the Literature Watch `REGISTRY_livestock_generation` (dated copy in `data/literature_watch/`) to a CP2b element (g, ST, SV, or dry matter g × ST) in CP2b units, with the quoted number checked against the record, and places it against the CP2b v5.1 range. Broiler litter per flock is reported as the flocks per year that would match CP2b. The CP2b column needs the verified v5.1 snapshot. | `outputs/evidencia_geracao/` |
| `build_evidencia_fde.py` | Availability factor evidence. Reads each record of the Literature Watch `REGISTRY_fde_factors` (dated copy in `data/literature_watch/`) by the definition its source uses. Records with the CP2b definition (FC = collection efficiency, FCo = left after competing uses, FS = mass retained after a documented loss per DEC-013) are placed against the CP2b v5.1 range; the rest (share of farms, days on feed, harvest windows, haul distances in km, "not used as fertiliser") are listed with the reason they are not compared. The CP2b column needs the verified v5.1 snapshot. | `outputs/evidencia_fde/` |
| `build_sensibilidade_cp2b.py` | Sensitivity of CP2b v5.1 to the literature, keeping the N1 → N4 cascade. Each scenario swaps one parameter (g, ST, SV, BMP on N1; FC on N2; FCo on N3a; FS on N4) for the value the evidence libraries give, recomputes every municipality with U and FS × FL kept, and reports state N1–N4 against the CP2b min–max band. Scenarios are literature values, hypotheses the method team must settle, and definitions the article must rule out. Also checks the snapshot against the loader totals and the cascade identities, and reviews each substrate against the three evidence libraries. Needs the verified v5.1 snapshot (levels and parameters). | `outputs/sensibilidade_cp2b/` |

```bash
python3 analysis/build_sp_real_uncertainty.py
python3 analysis/build_sp_realization_index.py
python3 analysis/build_sp_opportunity_sites.py
python3 analysis/build_sp_digestate_nutrients.py
python3 analysis/build_sp_mandate_coverage.py
python3 analysis/build_sp_route_conversion.py
python3 analysis/build_bndes_capex_benchmarks.py
python3 analysis/build_biogram_reconciliation.py
python3 analysis/build_biogram_national_share.py
python3 analysis/build_sp_biolng_santos.py
python3 analysis/build_sp_green_corridors.py
python3 analysis/build_integra_residuos.py
python3 analysis/build_bacias_aterro.py
python3 analysis/build_cp2b_fluxos.py
python3 analysis/build_evidencia_bmp.py
python3 analysis/build_evidencia_geracao.py
python3 analysis/build_evidencia_fde.py
python3 analysis/build_sensibilidade_cp2b.py
pytest tests/test_sp_real_uncertainty.py tests/test_sp_realization_index.py tests/test_sp_digestate_nutrients.py tests/test_sp_mandate_coverage.py tests/test_sp_route_conversion.py tests/test_bndes_capex_benchmarks.py tests/test_biogram_reconciliation.py tests/test_biogram_national_share.py tests/test_sp_biolng_santos.py tests/test_sp_green_corridors.py tests/test_integra_residuos.py tests/test_bacias_aterro.py tests/test_cp2b_fluxos.py tests/test_evidencia_bmp.py tests/test_evidencia_geracao.py tests/test_evidencia_fde.py tests/test_sensibilidade_cp2b.py
```
