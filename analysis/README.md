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

Two reproducible scripts behind `cp2b-workspace/NewLook/docs/planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`. Both read their reference numbers from the backend scripts instead of retyping them, and both have guard tests in `tests/`.

| Script | What it answers | Output |
|---|---|---|
| `build_sp_real_uncertainty.py` | How wide is the SP Cenário Real once parameter uncertainty is propagated, and which parameters drive it? (Monte Carlo + Sobol, numpy only) | `outputs/sp_real_uncertainty/` |
| `build_sp_realization_index.py` | What share of the mobilisable potential does SP actually produce as biomethane, month by month? (ANP open data) | `outputs/sp_realization_index/` |

```bash
python3 analysis/build_sp_real_uncertainty.py
python3 analysis/build_sp_realization_index.py
pytest tests/test_sp_real_uncertainty.py tests/test_sp_realization_index.py
```
