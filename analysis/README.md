# Cluster Analysis — São Paulo Biogas Potential

This directory contains exploratory cluster analysis of the 645-municipality biogas potential dataset, used to inform co-digestion pathways and infrastructure planning in PILAR-2b.

---

## Structure

```
analysis/
├── data/          # Input datasets (mirrors CP2B_HANDOFF/)
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
