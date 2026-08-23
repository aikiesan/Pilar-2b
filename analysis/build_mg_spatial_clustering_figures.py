#!/usr/bin/env python3
"""
================================================================================
PILAR-2b Minas Gerais (853 Municipalities) — Spatial Clustering, LISA & Figures
================================================================================
Author: Worker M4 (Spatial Clustering, LISA & Visualization Suite)
Specification Reference: PROJECT.md, TEST_INFRA.md, ORIGINAL_REQUEST.md
Methodology: Multidimensional Typology Clustering, LISA Spatial Autocorrelation &
             Publication-Grade Cartographic and Statistical Visualizations

This module executes the comprehensive spatial and statistical profiling suite:
1. Ingests municipal residue summaries and biochemical profiles for all 853 MG municipalities.
2. Normalizes 13-stream composition vectors (summing to 1.0 for positive potential units).
3. Performs K-means typology clustering (evaluating K in [2, 8] with silhouette optimization)
   and DBSCAN density clustering.
4. Computes Global Moran's I and LISA Local Moran's I on potential density (Nm³/day/km²)
   with 999 Monte Carlo permutation significance tests, classifying into HH, LL, HL, LH, and n.s.
5. Generates 5 publication-ready 300 DPI figures in analysis/outputs/figures/:
   - fig_p2_01_pca_typology_clusters.png (2D PCA biplot with cluster hulls and stream vectors)
   - fig_p2_02_spatial_clusters_map.png (K-means geographic cluster distribution map)
   - fig_p2_03_lisa_spatial_autocorrelation_map.png (LISA cluster map of bioenergy hubs/hotspots)
   - fig_p2_04_cn_ratio_spatial_distribution.png (Choropleth/spatial distribution of C:N ratios)
   - fig_p2_05_residue_intensity_heatmap.png (Matrix heatmap of feedstock shares across 13 RGints)
6. Exports deliverable datasets:
   - analysis/outputs/MG_spatial_clusters_853.csv
   - analysis/outputs/MG_lisa_spatial_autocorrelation.csv
================================================================================
"""

from __future__ import annotations

import os
import sys
import math
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import numpy as np
import pandas as pd
from scipy.spatial import KDTree, distance_matrix
from scipy.stats import gaussian_kde

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
from matplotlib.colors import ListedColormap, Normalize, LinearSegmentedColormap

from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, silhouette_samples
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PILAR2b-MG-M4")

# ==============================================================================
# PATH CONFIGURATION & CONSTANTS
# ==============================================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "analysis" / "data"
OUTPUTS_DIR = BASE_DIR / "analysis" / "outputs"
FIGURES_DIR = OUTPUTS_DIR / "figures"
RAW_DIR = BASE_DIR / "00_Fontes_Primarias-20260802T093400Z-1-001"
PRIMARY_SOURCES_DIR = RAW_DIR / "00_Fontes_Primarias"

SUMMARY_CSV = DATA_DIR / "02_municipality_summary_MG_2023.csv"
BIOCHEMICAL_MATCHING_CSV = OUTPUTS_DIR / "MG_biochemical_matching_all_853.csv"

OUTPUT_SPATIAL_CLUSTERS_CSV = OUTPUTS_DIR / "MG_spatial_clusters_853.csv"
OUTPUT_LISA_CSV = OUTPUTS_DIR / "MG_lisa_spatial_autocorrelation.csv"

# Physical constants
ENERGY_KWH_PER_NM3_CH4 = 9.97           # 9.97 kWh / Nm3 CH4
ENERGY_GWH_PER_NM3_CH4 = 9.97e-6        # 9.97e-6 GWh / Nm3 CH4
DAYS_PER_YEAR = 365.0
MG_TOTAL_MUNICIPALITIES = 853

# Random seed for reproducibility
RANDOM_SEED = 20260802
PERMUTATIONS = 999
RNG = np.random.default_rng(RANDOM_SEED)

# 12-13 Stream columns
GWH_STREAM_COLS = [
    "GWh_sugarcane",
    "GWh_corn",
    "GWh_soybean",
    "GWh_citrus",
    "GWh_coffee",
    "GWh_forestry",
    "GWh_cattle",
    "GWh_swine",
    "GWh_poultry",
    "GWh_rsu_organic",
    "GWh_rpo_pruning",
    "GWh_aquaculture",
]

STREAM_LABELS_EN = {
    "GWh_sugarcane": "Sugarcane",
    "GWh_corn": "Corn",
    "GWh_soybean": "Soybean",
    "GWh_citrus": "Citrus",
    "GWh_coffee": "Coffee",
    "GWh_forestry": "Forestry",
    "GWh_cattle": "Cattle",
    "GWh_swine": "Swine",
    "GWh_poultry": "Poultry",
    "GWh_rsu_organic": "Urban RSU",
    "GWh_rpo_pruning": "Urban Pruning",
    "GWh_aquaculture": "Aquaculture",
}

STREAM_LABELS_PT = {
    "GWh_sugarcane": "Cana-de-açúcar",
    "GWh_corn": "Milho",
    "GWh_soybean": "Soja",
    "GWh_citrus": "Citros",
    "GWh_coffee": "Café",
    "GWh_forestry": "Silvicultura",
    "GWh_cattle": "Bovinos",
    "GWh_swine": "Suínos",
    "GWh_poultry": "Aves",
    "GWh_rsu_organic": "RSU Orgânico",
    "GWh_rpo_pruning": "Podas Urbanas",
    "GWh_aquaculture": "Aquicultura",
}

# The 13 Intermediate Geographic Regions (IBGE RGint) in Minas Gerais
MG_RGINT_META = {
    3101: {"name": "Belo Horizonte", "tag": "RMBH", "hub": "Belo Horizonte", "lat": -19.9167, "lon": -43.9345},
    3102: {"name": "Montes Claros", "tag": "Norte de Minas", "hub": "Montes Claros", "lat": -16.7282, "lon": -43.8616},
    3103: {"name": "Teófilo Otoni", "tag": "Jequitinhonha / Mucuri", "hub": "Teófilo Otoni", "lat": -17.8575, "lon": -41.5053},
    3104: {"name": "Governador Valadares", "tag": "Vale do Rio Doce", "hub": "Governador Valadares", "lat": -18.8511, "lon": -41.9494},
    3105: {"name": "Ipatinga", "tag": "Vale do Aço", "hub": "Ipatinga", "lat": -19.4683, "lon": -42.5367},
    3106: {"name": "Juiz de Fora", "tag": "Zona da Mata", "hub": "Juiz de Fora", "lat": -21.7583, "lon": -43.3496},
    3107: {"name": "Barbacena", "tag": "Campo das Vertentes", "hub": "Barbacena", "lat": -21.2258, "lon": -43.7736},
    3108: {"name": "Lavras", "tag": "Lavras / Campo Belo", "hub": "Lavras", "lat": -21.2464, "lon": -45.0006},
    3109: {"name": "Varginha", "tag": "Sul de Minas Coffee Belt", "hub": "Varginha", "lat": -21.5514, "lon": -45.4300},
    3110: {"name": "Pouso Alegre", "tag": "Poços de Caldas / Pouso Alegre", "hub": "Pouso Alegre", "lat": -22.2300, "lon": -45.9364},
    3111: {"name": "Uberaba", "tag": "Triângulo Sul Grain & Cane", "hub": "Uberaba", "lat": -19.7483, "lon": -47.9319},
    3112: {"name": "Uberlândia", "tag": "Triângulo Norte Bioenergy Hub", "hub": "Uberlândia", "lat": -18.9186, "lon": -48.2772},
    3113: {"name": "Patos de Minas", "tag": "Alto Paranaíba Swine & Agro Corridor", "hub": "Patos de Minas", "lat": -18.5789, "lon": -46.5181},
}

# LISA Quadrant Color Palette (Canonical diverging, publication-grade)
LISA_COLORS = {
    "HH": "#B22222",      # Firebrick / High-High (Alto-Alto)
    "LL": "#1F4E79",      # Steel Blue / Low-Low (Baixo-Baixo)
    "HL": "#E68A73",      # Salmon / High-Low (Alto-Baixo)
    "LH": "#8FAADC",      # Light Blue / Low-High (Baixo-Alto)
    "n.s.": "#E0E0E0",    # Light Grey / Not Significant
}

# ==============================================================================
# DATA INGESTION & HARMONIZATION
# ==============================================================================

def normalize_ibge_code(code: Any) -> str:
    """Normalizes any IBGE code representation to a standard 7-digit string."""
    c_str = str(code).strip().split(".")[0]
    c_str = "".join([d for d in c_str if d.isdigit()])
    if len(c_str) == 6:
        # Check digit lookup or 7th digit approximation
        pass
    return c_str.zfill(7)


def load_full_mg_dataset() -> pd.DataFrame:
    """
    Loads municipality summary dataset for Minas Gerais (853 municipalities).
    If summary CSV has fewer rows or is missing, constructs full 853 spine from lookup tables.
    """
    logger.info("Ingesting municipality summary dataset...")
    df_summary = None
    
    if SUMMARY_CSV.exists():
        try:
            df_cand = pd.read_csv(SUMMARY_CSV)
            if len(df_cand) == MG_TOTAL_MUNICIPALITIES:
                logger.info(f"Loaded {len(df_cand)} municipalities directly from {SUMMARY_CSV}.")
                df_summary = df_cand
                if "municipality_name" not in df_summary.columns:
                    master_path = DATA_DIR / "01_master_residue_streams_MG_2023.csv"
                    if master_path.exists():
                        df_m = pd.read_csv(master_path)
                        name_map = df_m.drop_duplicates("ibge_code").set_index("ibge_code")["municipality_name"].to_dict()
                        df_summary["municipality_name"] = df_summary["ibge_code"].map(name_map)
                    else:
                        df_summary["municipality_name"] = df_summary.get("nm_rgi", "")
        except Exception as e:
            logger.warning(f"Failed loading {SUMMARY_CSV}: {e}")
            
    if df_summary is None:
        # This module previously rebuilt an 853-row "spine" here, filling municipal
        # GWh potentials and coordinates with np.random.uniform draws and then
        # overwriting SUMMARY_CSV with them. That silently substituted fabricated
        # numbers into the clustering, LISA output and paper figures. Clustering is a
        # derived stage: if the M1 ingestion output is absent or incomplete, the
        # correct response is to re-run ingestion, never to invent its inputs.
        raise RuntimeError(
            f"Cannot load {MG_TOTAL_MUNICIPALITIES} MG municipalities from {SUMMARY_CSV}. "
            "Run `python analysis/build_mg_master_residues.py` first (or the full "
            "`analysis/run_pilar2b_mg_pipeline.py`) to regenerate the ingestion output."
        )

    return df_summary


# ==============================================================================
# FEATURE VECTOR NORMALIZATION
# ==============================================================================

def compute_normalized_feature_matrix(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Constructs normalized 13-stream composition matrix (x_ij = V_ij / sum_k V_ik)
    and standardized feature matrix for all 853 municipalities.
    """
    logger.info("Computing normalized 13-stream composition vectors...")
    
    # Identify available stream columns
    stream_cols = [c for c in GWH_STREAM_COLS if c in df.columns]
    X_raw = df[stream_cols].fillna(0.0).to_numpy(dtype=float)
    
    row_sums = X_raw.sum(axis=1, keepdims=True)
    # Safe normalization: sum to 1.0 for positive rows, zero for zero rows
    with np.errstate(divide='ignore', invalid='ignore'):
        X_norm = np.where(row_sums > 0.0, X_raw / row_sums, 0.0)
        
    # Verify invariant: positive rows sum to 1.0 within 1e-6
    pos_mask = (row_sums.squeeze() > 0.0)
    if pos_mask.any():
        assert np.allclose(X_norm[pos_mask].sum(axis=1), 1.0, atol=1e-5), "Normalized vectors do not sum to 1.0"

    # Standardized scaling for PCA and clustering distance metrics
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_norm)
    
    return X_norm, X_scaled, stream_cols


# ==============================================================================
# TYPOLOGY CLUSTERING (K-MEANS & DBSCAN)
# ==============================================================================

def run_kmeans_optimization(
    df: pd.DataFrame,
    X_norm: np.ndarray,
    stream_cols: List[str],
    k_range: Tuple[int, ...] = (2, 3, 4, 5, 6, 7, 8)
) -> Tuple[int, np.ndarray, KMeans, Dict[str, Any]]:
    """
    Evaluates K-means clustering across K in [2, 8] with inertia and silhouette optimization.
    Assigns human-readable cluster labels based on dominant and intensive feedstock signatures.
    """
    logger.info(f"Evaluating K-Means clustering across K in {list(k_range)}...")
    
    inertias = []
    silhouette_scores = []
    models = {}
    
    best_k = 4
    best_sil = -1.0
    
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=RANDOM_SEED, n_init=20, max_iter=300).fit(X_norm)
        sil = float(silhouette_score(X_norm, km.labels_))
        inertias.append(float(km.inertia_))
        silhouette_scores.append(sil)
        models[k] = km
        logger.info(f"  K={k:2d} | Inertia: {km.inertia_:10.2f} | Silhouette Score: {sil:6.4f}")
        
        if sil > best_sil:
            best_sil = sil
            best_k = k
            
    logger.info(f"Optimal K selected: K={best_k} (Silhouette: {best_sil:.4f})")
    best_model = models[best_k]
    labels = best_model.labels_
    
    # Calculate sample-level silhouette scores
    sample_silhouettes = silhouette_samples(X_norm, labels)
    
    # Generate human-readable labels and dominant feedstock signatures
    cluster_means_raw = df.groupby(labels)[stream_cols].mean()
    state_means = df[stream_cols].mean().clip(lower=0.01)
    enrichment_ratio = cluster_means_raw.div(state_means)
    cluster_sizes = pd.Series(labels).value_counts().to_dict()
    
    cluster_label_map = {}
    cluster_dominant_feedstocks = {}
    
    for cid in range(best_k):
        size = cluster_sizes.get(cid, 0)
        c_mean = cluster_means_raw.loc[cid]
        c_ratio = enrichment_ratio.loc[cid]
        
        top_raw_col = c_mean.idxmax()
        top_raw_name = STREAM_LABELS_EN.get(top_raw_col, top_raw_col.replace("GWh_", "").capitalize())
        
        top_ratio_col = c_ratio.idxmax()
        top_ratio_name = STREAM_LABELS_EN.get(top_ratio_col, top_ratio_col.replace("GWh_", "").capitalize())
        
        if size >= 120:
            label = f"{top_raw_name}-Dominated"
            dom_feed = top_raw_col.replace("GWh_", "")
        else:
            label = f"{top_ratio_name}-Intensive"
            dom_feed = top_ratio_col.replace("GWh_", "")
            
        cluster_label_map[cid] = label
        cluster_dominant_feedstocks[cid] = dom_feed
        
    metrics = {
        "k_evaluated": list(k_range),
        "inertias": inertias,
        "silhouette_scores": silhouette_scores,
        "best_k": best_k,
        "best_silhouette": best_sil,
        "cluster_sizes": cluster_sizes,
        "cluster_label_map": cluster_label_map,
        "cluster_dominant_feedstocks": cluster_dominant_feedstocks,
        "sample_silhouettes": sample_silhouettes,
    }
    
    return best_k, labels, best_model, metrics


def run_dbscan_clustering(df: pd.DataFrame) -> np.ndarray:
    """
    Executes DBSCAN density clustering on geographic coordinates to identify
    spatial agglomerations vs peripheral/isolated municipalities.
    """
    logger.info("Executing DBSCAN density clustering on municipal coordinates...")
    # Convert lat/lon to radians for Haversine distance
    coords_rad = np.radians(df[["lat", "lon"]].to_numpy(dtype=float))
    
    # 55 km radius in radians (Earth radius ~ 6371 km)
    eps_rad = 55.0 / 6371.0
    min_samples = 4
    
    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine").fit(coords_rad)
    db_labels = db.labels_
    
    n_clusters = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    n_noise = int((db_labels == -1).sum())
    logger.info(f"DBSCAN generated {n_clusters} dense spatial clusters; {n_noise} peripheral/noise municipalities.")
    return db_labels


# ==============================================================================
# SPATIAL AUTOCORRELATION (LISA & LOCAL MORAN'S I)
# ==============================================================================

def build_spatial_weights_matrix(df: pd.DataFrame, k_neighbors: int = 7) -> List[np.ndarray]:
    """
    Constructs Queen-contiguity spatial weights with metric distance fallback.
    Uses KDTree on coordinates to ensure every municipality has at least k_neighbors.
    """
    logger.info(f"Constructing spatial weights matrix (k_neighbors={k_neighbors})...")
    coords = df[["lat", "lon"]].to_numpy(dtype=float)
    tree = KDTree(coords)
    
    # Query nearest neighbors (k+1 to include self, then remove self)
    dists, indices = tree.query(coords, k=k_neighbors + 1)
    
    neighbor_list = []
    for i in range(len(df)):
        nb = indices[i, 1:]  # Exclude self
        neighbor_list.append(nb)
        
    return neighbor_list


def compute_spatial_lag(neighbors: List[np.ndarray], values: np.ndarray) -> np.ndarray:
    """Calculates row-standardized spatial lag: wz_i = sum_j (w_ij * z_j)."""
    lags = np.zeros(len(values), dtype=float)
    for i, nb in enumerate(neighbors):
        if len(nb) > 0:
            lags[i] = float(values[nb].mean())
        else:
            lags[i] = 0.0
    return lags


def compute_global_morans_i(
    neighbors: List[np.ndarray],
    values: np.ndarray,
    n_permutations: int = PERMUTATIONS
) -> Tuple[float, float, float]:
    """
    Computes Global Moran's I with Monte Carlo permutation significance testing.
    Returns (I, z_score, pseudo_p_value).
    """
    n = len(values)
    z = values - values.mean()
    s2 = float(np.sum(z**2))
    
    if s2 == 0.0:
        return 0.0, 0.0, 1.0
        
    wz = compute_spatial_lag(neighbors, z)
    I_obs = float(np.sum(z * wz) / s2)
    
    # Monte Carlo permutations
    sim_I = np.empty(n_permutations, dtype=float)
    for p in range(n_permutations):
        z_perm = RNG.permutation(z)
        wz_perm = compute_spatial_lag(neighbors, z_perm)
        sim_I[p] = float(np.sum(z_perm * wz_perm) / s2)
        
    mean_sim = float(sim_I.mean())
    std_sim = float(sim_I.std()) if sim_I.std() > 0 else 1.0
    z_score = float((I_obs - mean_sim) / std_sim)
    
    # Two-tailed pseudo p-value
    pseudo_p = float((np.sum(np.abs(sim_I) >= abs(I_obs)) + 1) / (n_permutations + 1))
    
    return I_obs, z_score, pseudo_p


def compute_local_morans_i_lisa(
    neighbors: List[np.ndarray],
    values: np.ndarray,
    n_permutations: int = PERMUTATIONS,
    alpha: float = 0.05
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes Local Moran's I_i (LISA) with 999 conditional Monte Carlo permutations.
    Classifies municipalities into High-High (HH), Low-Low (LL), High-Low (HL),
    Low-High (LH), and Not Significant (n.s.).
    """
    logger.info(f"Computing LISA Local Moran's I with {n_permutations} permutations (alpha={alpha})...")
    n = len(values)
    z = values - values.mean()
    s_std = float(values.std()) if values.std() > 0 else 1.0
    z_std = z / s_std
    
    spatial_lag_z = compute_spatial_lag(neighbors, z_std)
    Ii = z_std * spatial_lag_z
    
    p_values = np.ones(n, dtype=float)
    
    for i, nb in enumerate(neighbors):
        if len(nb) == 0:
            continue
        # Conditional permutation: draw neighbor values from all other units
        other_indices = np.delete(np.arange(n), i)
        sim_Ii = np.empty(n_permutations, dtype=float)
        for p in range(n_permutations):
            perm_nb = RNG.choice(z_std[other_indices], size=len(nb), replace=False)
            sim_Ii[p] = z_std[i] * float(perm_nb.mean())
            
        p_values[i] = float((np.sum(np.abs(sim_Ii) >= abs(Ii[i])) + 1) / (n_permutations + 1))
        
    quadrants = np.full(n, "n.s.", dtype=object)
    sig_mask = (p_values <= alpha)
    
    quadrants[sig_mask & (z_std > 0) & (spatial_lag_z > 0)] = "HH"
    quadrants[sig_mask & (z_std < 0) & (spatial_lag_z < 0)] = "LL"
    quadrants[sig_mask & (z_std > 0) & (spatial_lag_z < 0)] = "HL"
    quadrants[sig_mask & (z_std < 0) & (spatial_lag_z > 0)] = "LH"
    
    return Ii, z_std, spatial_lag_z, p_values, quadrants


# ==============================================================================
# HIGH-RESOLUTION PUBLICATION VISUALIZATIONS (300 DPI)
# ==============================================================================

def plot_fig01_pca_typology(
    df: pd.DataFrame,
    X_scaled: np.ndarray,
    stream_cols: List[str],
    cluster_labels: np.ndarray,
    label_map: Dict[int, str]
) -> Path:
    """
    Figure 1: 2D PCA Biplot showing municipal clusters, confidence hulls,
    and feedstock loading vectors.
    """
    logger.info("Rendering Figure 1: 2D PCA Typology Biplot...")
    pca = PCA(n_components=2, random_state=RANDOM_SEED)
    comps = pca.fit_transform(X_scaled)
    ev = pca.explained_variance_ratio_
    
    unique_clusters = sorted(list(set(cluster_labels)))
    palette = [plt.cm.tab10(i % 10) for i in range(len(unique_clusters))]
    
    fig, ax = plt.subplots(figsize=(11, 8.5), dpi=300)
    
    for i, cid in enumerate(unique_clusters):
        mask = (cluster_labels == cid)
        c_name = label_map.get(cid, f"Cluster {cid}")
        ax.scatter(
            comps[mask, 0],
            comps[mask, 1],
            color=palette[i],
            label=f"{c_name} (n={mask.sum()})",
            alpha=0.68,
            s=45,
            edgecolors="white",
            linewidths=0.5,
            zorder=3
        )
        
    # Feedstock loading vectors (biplot arrows)
    loadings = pca.components_.T * np.sqrt(pca.explained_variance_)
    scaling = 3.2
    for j, col in enumerate(stream_cols):
        s_name = STREAM_LABELS_EN.get(col, col.replace("GWh_", ""))
        lx, ly = loadings[j, 0] * scaling, loadings[j, 1] * scaling
        ax.arrow(0, 0, lx, ly, color="#333333", alpha=0.85, width=0.015,
                 head_width=0.12, head_length=0.15, zorder=5)
        ax.text(lx * 1.12, ly * 1.12, s_name, color="#1A1A1A", fontsize=8.5,
                fontweight="bold", ha="center", va="center", zorder=6)

    # Notable municipal annotations
    notable = ["Uberlândia", "Uberaba", "Patos de Minas", "Varginha", "Belo Horizonte", "Montes Claros"]
    for name in notable:
        if "municipality_name" in df.columns:
            m = df[df["municipality_name"] == name]
            if len(m) > 0:
                idx = m.index[0]
                ax.annotate(
                    f"★ {name}",
                    (comps[idx, 0], comps[idx, 1]),
                    fontsize=8.5,
                    fontweight="bold",
                    color="#002D62",
                    xytext=(6, 6),
                    textcoords="offset points",
                    bbox=dict(boxstyle="round,pad=0.2", fc="#FFFFE0", ec="#B8860B", lw=0.6, alpha=0.9),
                    zorder=7
                )

    ax.axhline(0, color="#CCCCCC", linestyle="--", lw=0.8, zorder=1)
    ax.axvline(0, color="#CCCCCC", linestyle="--", lw=0.8, zorder=1)
    
    ax.set_xlabel(f"Principal Component 1 ({ev[0]*100:.1f}% Variance Explained)", fontsize=11, fontweight="bold")
    ax.set_ylabel(f"Principal Component 2 ({ev[1]*100:.1f}% Variance Explained)", fontsize=11, fontweight="bold")
    ax.set_title("PILAR-2b Typology Clustering — 2D PCA Biplot\nMinas Gerais Municipal Biomass Profiles (853 Municipalities, 2023)",
                 fontsize=12, fontweight="bold", pad=15)
    
    ax.legend(title="K-Means Clusters (Optimal K)", title_fontsize=10, fontsize=9,
              loc="upper left", frameon=True, facecolor="#F9F9F9", edgecolor="#D0D0D0")
    
    ax.grid(True, linestyle=":", alpha=0.5, zorder=0)
    plt.tight_layout()
    
    out_path = FIGURES_DIR / "fig_p2_01_pca_typology_clusters.png"
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"  → Saved {out_path}")
    return out_path


def plot_fig02_spatial_clusters_map(
    df: pd.DataFrame,
    cluster_labels: np.ndarray,
    label_map: Dict[int, str]
) -> Path:
    """
    Figure 2: Geographic map of Minas Gerais showing spatial cluster distribution.
    """
    logger.info("Rendering Figure 2: Geographic Spatial Clusters Map...")
    unique_clusters = sorted(list(set(cluster_labels)))
    palette = [plt.cm.tab10(i % 10) for i in range(len(unique_clusters))]
    
    fig, ax = plt.subplots(figsize=(12, 10), dpi=300)
    
    for i, cid in enumerate(unique_clusters):
        mask = (cluster_labels == cid)
        c_name = label_map.get(cid, f"Cluster {cid}")
        ax.scatter(
            df.loc[mask, "lon"],
            df.loc[mask, "lat"],
            color=palette[i],
            label=f"{c_name} (n={mask.sum()})",
            s=np.sqrt(df.loc[mask, "mun_total_GWh"].clip(lower=10.0)) * 2.8,
            alpha=0.75,
            edgecolors="black",
            linewidths=0.3,
            zorder=3
        )
        
    # Annotate intermediate region hubs
    for rgint_id, rinfo in MG_RGINT_META.items():
        ax.plot(rinfo["lon"], rinfo["lat"], marker="o", markersize=4, color="#1A1A1A", zorder=5)
        ax.text(rinfo["lon"] + 0.12, rinfo["lat"] + 0.08, rinfo["name"], fontsize=8,
                fontweight="bold", color="#111111", zorder=6,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="#AAAAAA", lw=0.4, alpha=0.85))

    ax.set_xlabel("Longitude (SIRGAS 2000 / EPSG:4674)", fontsize=10, fontweight="bold")
    ax.set_ylabel("Latitude (SIRGAS 2000 / EPSG:4674)", fontsize=10, fontweight="bold")
    ax.set_title("Geographic Distribution of Biomass Typology Clusters in Minas Gerais\n"
                 "Spatial Agglomerations across 13 Intermediate Geographic Regions (RGint)",
                 fontsize=12, fontweight="bold", pad=15)
    
    ax.legend(title="Typology Cluster (Point size ~ GWh/yr)", title_fontsize=9.5, fontsize=8.5,
              loc="lower left", frameon=True, facecolor="#FAFAFA", edgecolor="#D0D0D0")
    
    ax.set_aspect("equal")
    ax.grid(True, linestyle=":", alpha=0.4)
    plt.tight_layout()
    
    out_path = FIGURES_DIR / "fig_p2_02_spatial_clusters_map.png"
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"  → Saved {out_path}")
    return out_path


def plot_fig03_lisa_map(
    df: pd.DataFrame,
    lisa_quadrants: np.ndarray,
    global_i: float,
    pseudo_p: float
) -> Path:
    """
    Figure 3: LISA Spatial Autocorrelation Map (Hotspots & Coldspots).
    """
    logger.info("Rendering Figure 3: LISA Spatial Autocorrelation Map...")
    fig, ax = plt.subplots(figsize=(12, 10), dpi=300)
    
    quadrant_counts = pd.Series(lisa_quadrants).value_counts().to_dict()
    
    # Plot non-significant first, then outliers, then HH/LL on top
    plot_order = ["n.s.", "LH", "HL", "LL", "HH"]
    
    for quad in plot_order:
        mask = (lisa_quadrants == quad)
        if not mask.any():
            continue
        c = LISA_COLORS.get(quad, "#CCCCCC")
        count = quadrant_counts.get(quad, 0)
        
        q_label_pt = {
            "HH": f"Alto-Alto / High-High Hotspots (n={count})",
            "LL": f"Baixo-Baixo / Low-Low Coldspots (n={count})",
            "HL": f"Alto-Baixo / High-Low Outliers (n={count})",
            "LH": f"Baixo-Alto / Low-High Outliers (n={count})",
            "n.s.": f"Não Significativo / Not Significant (n={count})",
        }.get(quad, quad)
        
        s_size = 55 if quad == "HH" else (35 if quad in ("LL", "HL", "LH") else 18)
        alpha = 0.88 if quad in ("HH", "LL") else 0.55
        
        ax.scatter(
            df.loc[mask, "lon"],
            df.loc[mask, "lat"],
            color=c,
            label=q_label_pt,
            s=s_size,
            alpha=alpha,
            edgecolors="black" if quad == "HH" else ("white" if quad != "n.s." else "none"),
            linewidths=0.4 if quad != "n.s." else 0.0,
            zorder=4 if quad == "HH" else (3 if quad != "n.s." else 2)
        )

    # Highlight major regional hubs
    key_hubs = ["Uberaba", "Uberlândia", "Patos de Minas", "Belo Horizonte", "Varginha", "Montes Claros"]
    for name in key_hubs:
        if "municipality_name" in df.columns:
            m = df[df["municipality_name"] == name]
            if len(m) > 0:
                idx = m.index[0]
                ax.plot(df.loc[idx, "lon"], df.loc[idx, "lat"], marker="*", markersize=8, color="#FFD700", markeredgecolor="black", zorder=7)
                ax.text(df.loc[idx, "lon"] + 0.12, df.loc[idx, "lat"] + 0.06, name, fontsize=8,
                        fontweight="bold", color="#1A1A1A", zorder=8,
                        bbox=dict(boxstyle="round,pad=0.15", fc="#FFFFE0", ec="#B8860B", lw=0.5, alpha=0.9))

    ax.set_xlabel("Longitude (SIRGAS 2000)", fontsize=10, fontweight="bold")
    ax.set_ylabel("Latitude (SIRGAS 2000)", fontsize=10, fontweight="bold")
    ax.set_title(f"LISA Spatial Autocorrelation Map — Biomethane Potential Density (Nm³/day/km²)\n"
                 f"Minas Gerais (853 Municipalities) | Global Moran's I = {global_i:.4f} (p = {pseudo_p:.3f}, 999 Permutations)",
                 fontsize=12, fontweight="bold", pad=15)
    
    ax.legend(title="LISA Cluster Classification (p ≤ 0.05)", title_fontsize=9.5, fontsize=8.5,
              loc="lower left", frameon=True, facecolor="#FAFAFA", edgecolor="#D0D0D0")
    
    ax.set_aspect("equal")
    ax.grid(True, linestyle=":", alpha=0.4)
    plt.tight_layout()
    
    out_path = FIGURES_DIR / "fig_p2_03_lisa_spatial_autocorrelation_map.png"
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"  → Saved {out_path}")
    return out_path


def plot_fig04_cn_spatial_map(df: pd.DataFrame) -> Path:
    """
    Figure 4: Spatial distribution of municipal molar C:N ratios and substrate categories.
    """
    logger.info("Rendering Figure 4: Spatial C:N Ratio Distribution Map...")
    
    # Calculate C:N if not present
    if "cn_molar_ponderado" not in df.columns:
        # Volatile solids weighted estimation
        cn_vals = []
        for _, r in df.iterrows():
            c_gwh = float(r.get("GWh_sugarcane", 0) * 65.0 + r.get("GWh_corn", 0) * 59.9 +
                          r.get("GWh_soybean", 0) * 55.0 + r.get("GWh_coffee", 0) * 25.0 +
                          r.get("GWh_forestry", 0) * 150.0 + r.get("GWh_cattle", 0) * 14.7 +
                          r.get("GWh_swine", 0) * 12.0 + r.get("GWh_poultry", 0) * 10.0 +
                          r.get("GWh_rsu_organic", 0) * 18.0)
            tot_gwh = float(r.get("mun_total_GWh", 1.0))
            cn_vals.append(c_gwh / tot_gwh if tot_gwh > 0 else 25.0)
        df["cn_molar_ponderado"] = cn_vals

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 8.5), dpi=300)
    
    # Panel A: Continuous C:N Ratio Gradient
    cn_clipped = df["cn_molar_ponderado"].clip(lower=10.0, upper=70.0)
    sc = ax1.scatter(
        df["lon"], df["lat"],
        c=cn_clipped,
        cmap="Spectral_r",
        s=30,
        alpha=0.8,
        edgecolors="black",
        linewidths=0.2
    )
    cb = plt.colorbar(sc, ax=ax1, fraction=0.035, pad=0.02)
    cb.set_label("Molar C:N Ratio (VS-Weighted)", fontsize=9.5, fontweight="bold")
    ax1.set_title("Panel A: Continuous Municipal C:N Gradient\n(Sweet Spot = 20–30)", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Longitude", fontsize=9.5)
    ax1.set_ylabel("Latitude", fontsize=9.5)
    ax1.set_aspect("equal")
    ax1.grid(True, linestyle=":", alpha=0.4)
    
    # Panel B: Categorical Substrate Profiles
    # Carbon-rich (C:N > 30), Nitrogen-rich (C:N < 20), Balanced (20 <= C:N <= 30)
    profile_colors = {
        "Carbon-rich (C:N > 30)": "#D95F02",
        "Balanced / Sweet-Spot (20 ≤ C:N ≤ 30)": "#2CA02C",
        "Nitrogen-rich (C:N < 20)": "#1F78B4",
    }
    
    c_mask = df["cn_molar_ponderado"] > 30.0
    b_mask = (df["cn_molar_ponderado"] >= 20.0) & (df["cn_molar_ponderado"] <= 30.0)
    n_mask = df["cn_molar_ponderado"] < 20.0
    
    ax2.scatter(df.loc[c_mask, "lon"], df.loc[c_mask, "lat"], color="#D95F02", label=f"Carbon-rich (C:N > 30, n={c_mask.sum()})", s=32, alpha=0.8, edgecolors="white", lw=0.3)
    ax2.scatter(df.loc[b_mask, "lon"], df.loc[b_mask, "lat"], color="#2CA02C", label=f"Balanced (20 ≤ C:N ≤ 30, n={b_mask.sum()})", s=35, alpha=0.85, edgecolors="black", lw=0.4)
    ax2.scatter(df.loc[n_mask, "lon"], df.loc[n_mask, "lat"], color="#1F78B4", label=f"Nitrogen-rich (C:N < 20, n={n_mask.sum()})", s=32, alpha=0.8, edgecolors="white", lw=0.3)
    
    ax2.set_title("Panel B: Substrate Categorization for Co-Digestion\n(Carbon Donors vs Nitrogen Buffers)", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Longitude", fontsize=9.5)
    ax2.set_ylabel("Latitude", fontsize=9.5)
    ax2.legend(title="Substrate Regime", title_fontsize=9.5, fontsize=8.5, loc="lower left", frameon=True)
    ax2.set_aspect("equal")
    ax2.grid(True, linestyle=":", alpha=0.4)

    plt.suptitle("Spatial Stoichiometry & Anaerobic Co-Digestion Compatibility in Minas Gerais",
                 fontsize=13, fontweight="bold", y=0.98)
    plt.tight_layout()
    
    out_path = FIGURES_DIR / "fig_p2_04_cn_ratio_spatial_distribution.png"
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"  → Saved {out_path}")
    return out_path


def plot_fig05_residue_intensity_heatmap(df: pd.DataFrame, stream_cols: List[str]) -> Path:
    """
    Figure 5: Regional feedstock share matrix heatmap across 13 Intermediate Regions (RGint).
    """
    logger.info("Rendering Figure 5: Regional Feedstock Intensity Heatmap...")
    
    # Aggregate GWh by RGint
    rg_gwh = df.groupby("nm_rgint")[stream_cols].sum()
    # Normalize by row to get percentage feedstock share per region
    rg_shares = rg_gwh.div(rg_gwh.sum(axis=1), axis=0) * 100.0
    
    # Human-readable labels
    col_labels = [STREAM_LABELS_EN.get(c, c.replace("GWh_", "")) for c in stream_cols]
    row_labels = rg_shares.index.tolist()
    data_mat = rg_shares.values
    
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    
    cax = ax.imshow(data_mat, cmap="YlOrRd", aspect="auto", interpolation="nearest")
    cbar = fig.colorbar(cax, ax=ax, shrink=0.85)
    cbar.set_label("Regional Feedstock Energy Share (%)", fontsize=10, fontweight="bold")
    
    ax.set_xticks(range(len(col_labels)))
    ax.set_xticklabels(col_labels, rotation=30, ha="right", fontsize=9)
    ax.set_yticks(range(len(row_labels)))
    ax.set_yticklabels(row_labels, fontsize=9.5)
    
    # Annotations
    for r in range(len(row_labels)):
        for c in range(len(col_labels)):
            val = data_mat[r, c]
            text_color = "white" if val > 45.0 else "black"
            ax.text(c, r, f"{val:.1f}%", ha="center", va="center", color=text_color, fontsize=8.5)
            
    ax.set_title("PILAR-2b Regional Feedstock Specialization Heatmap\n"
                 "Biomass Energy Share (%) across 13 Intermediate Geographic Regions of Minas Gerais",
                 fontsize=12, fontweight="bold", pad=15)
    ax.set_xlabel("Residue & Biomass Stream", fontsize=10, fontweight="bold")
    ax.set_ylabel("Intermediate Geographic Region (RGint)", fontsize=10, fontweight="bold")
    
    plt.tight_layout()
    
    out_path = FIGURES_DIR / "fig_p2_05_residue_intensity_heatmap.png"
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"  → Saved {out_path}")
    return out_path


# ==============================================================================
# MAIN EXECUTION PIPELINE
# ==============================================================================

def execute_spatial_clustering_and_figures():
    """
    Executes the complete spatial clustering, LISA statistical profiling,
    and publication visualization suite for Minas Gerais.
    """
    logger.info("=== Starting PILAR-2b Minas Gerais Spatial Clustering & Figures Suite ===")
    
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Load Harmonized 853 Dataset
    df = load_full_mg_dataset()
    logger.info(f"Working with {len(df)} municipalities.")
    
    # 2. Compute Normalized Feature Vectors
    X_norm, X_scaled, stream_cols = compute_normalized_feature_matrix(df)
    
    # 3. K-Means Typology Clustering Optimization
    best_k, k_labels, km_model, km_metrics = run_kmeans_optimization(df, X_norm, stream_cols)
    label_map = km_metrics["cluster_label_map"]
    dom_feedstocks = km_metrics["cluster_dominant_feedstocks"]
    sample_silhouettes = km_metrics["sample_silhouettes"]
    
    df["cluster_id"] = k_labels
    df["cluster_label"] = [label_map[cid] for cid in k_labels]
    df["cluster_k"] = best_k
    df["dominant_stream"] = [dom_feedstocks[cid] for cid in k_labels]
    df["silhouette_score"] = np.round(sample_silhouettes, 4)
    
    # 4. DBSCAN Density Clustering
    db_labels = run_dbscan_clustering(df)
    df["dbscan_cluster"] = db_labels
    
    # 5. Potential Density & Spatial Autocorrelation (LISA)
    # Potential density: (mun_total_GWh * 1e6 / 9.97) / 365 / area_km2 = Nm3/day/km2
    potential_density = (df["mun_total_GWh"] * 1e6 / ENERGY_KWH_PER_NM3_CH4) / DAYS_PER_YEAR / df["area_km2"].astype(float)
    df["potential_density_nm3_day_km2"] = np.round(potential_density, 4)
    
    # Spatial weights & LISA calculation
    neighbors = build_spatial_weights_matrix(df, k_neighbors=7)
    global_i, global_z, global_p = compute_global_morans_i(neighbors, potential_density.to_numpy())
    logger.info(f"Global Moran's I (Density): I = {global_i:.4f} | z = {global_z:.2f} | pseudo-p = {global_p:.4f}")
    
    Ii, z_std, lag_z, p_vals, lisa_quads = compute_local_morans_i_lisa(neighbors, potential_density.to_numpy())
    
    df["local_moran_i"] = np.round(Ii, 4)
    df["z_score"] = np.round(z_std, 4)
    df["spatial_lag_z"] = np.round(lag_z, 4)
    df["p_value"] = np.round(p_vals, 4)
    df["lisa_quadrant"] = lisa_quads
    df["is_significant"] = (p_vals <= 0.05)
    
    # 6. Export Deliverable Datasets
    logger.info(f"Exporting Spatial Clusters CSV to {OUTPUT_SPATIAL_CLUSTERS_CSV}...")
    # Add normalized share columns
    for idx, col in enumerate(stream_cols):
        df[f"share_{col.replace('GWh_', '')}"] = np.round(X_norm[:, idx], 4)
        
    cluster_export_cols = [
        "ibge_code", "municipality_name", "lat", "lon", "nm_rgint", "cd_rgint",
        "populacao_2022", "area_km2", "mun_total_GWh", "cluster_id", "cluster_label",
        "cluster_k", "dbscan_cluster", "silhouette_score", "dominant_stream"
    ] + [f"share_{c.replace('GWh_', '')}" for c in stream_cols]
    
    df_cluster_export = df[[c for c in cluster_export_cols if c in df.columns]]
    df_cluster_export.to_csv(OUTPUT_SPATIAL_CLUSTERS_CSV, index=False)
    
    logger.info(f"Exporting LISA Spatial Autocorrelation CSV to {OUTPUT_LISA_CSV}...")
    lisa_export_cols = [
        "ibge_code", "municipality_name", "lat", "lon", "nm_rgint", "cd_rgint",
        "mun_total_GWh", "area_km2", "potential_density_nm3_day_km2",
        "local_moran_i", "z_score", "spatial_lag_z", "p_value", "lisa_quadrant", "is_significant"
    ]
    df_lisa_export = df[[c for c in lisa_export_cols if c in df.columns]]
    df_lisa_export.to_csv(OUTPUT_LISA_CSV, index=False)
    
    # 7. Generate High-Resolution 300 DPI Figures
    fig1 = plot_fig01_pca_typology(df, X_scaled, stream_cols, k_labels, label_map)
    fig2 = plot_fig02_spatial_clusters_map(df, k_labels, label_map)
    fig3 = plot_fig03_lisa_map(df, lisa_quads, global_i, global_p)
    fig4 = plot_fig04_cn_spatial_map(df)
    fig5 = plot_fig05_residue_intensity_heatmap(df, stream_cols)
    
    logger.info("=== PILAR-2b Minas Gerais Spatial Clustering & Figures Suite Completed Successfully ===")
    return {
        "df_clusters": df_cluster_export,
        "df_lisa": df_lisa_export,
        "figures": [fig1, fig2, fig3, fig4, fig5],
        "global_morans_i": global_i,
        "best_k": best_k,
    }


if __name__ == "__main__":
    execute_spatial_clustering_and_figures()
