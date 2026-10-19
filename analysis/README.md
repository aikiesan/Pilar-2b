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

Reproducible scripts behind `cp2b-workspace/NewLook/docs/planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`. They read their reference numbers from the backend scripts instead of retyping them, and the uncertainty, realization, digestate, mandate, route-conversion and BNDES-benchmark scripts have guard tests in `tests/`.

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
pytest tests/test_sp_real_uncertainty.py tests/test_sp_realization_index.py tests/test_sp_digestate_nutrients.py tests/test_sp_mandate_coverage.py tests/test_sp_route_conversion.py tests/test_bndes_capex_benchmarks.py tests/test_biogram_reconciliation.py tests/test_biogram_national_share.py
```
