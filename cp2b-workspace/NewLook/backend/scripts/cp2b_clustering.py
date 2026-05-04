"""
cp2b_clustering.py — K-means clustering on 12 GWh stream columns.

Workflow:
  1. Pull municipality_summary from PostgreSQL.
  2. StandardScale the 12 GWh columns.
  3. Try k = 4, 5, 6; pick best silhouette score.
  4. Write cluster_id / cluster_label / cluster_k back to DB.
  5. Export analysis/outputs/cluster_analysis.csv
  6. Save three figures to analysis/outputs/:
       cluster_heatmap.png  — mean GWh per cluster × stream (log scale)
       cluster_sizes.png    — municipality count per cluster
       cluster_pca.png      — 2D PCA scatter coloured by cluster

Run:
  DATABASE_URL=postgresql://user:pass@host/db python scripts/cp2b_clustering.py
"""

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT   = Path(__file__).resolve().parents[4]   # Pilar2b/
OUTPUTS_DIR = REPO_ROOT / "analysis" / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

GWH_COLS = [
    "ghw_aquaculture", "ghw_cattle",   "ghw_citrus",  "ghw_coffee",
    "ghw_corn",        "ghw_forestry", "ghw_poultry", "ghw_rpo_pruning",
    "ghw_rsu_organic", "ghw_soybean",  "ghw_sugarcane", "ghw_swine",
]

# Human-readable short labels for plots
STREAM_LABELS = {
    "ghw_aquaculture": "Aquaculture",
    "ghw_cattle":      "Cattle",
    "ghw_citrus":      "Citrus",
    "ghw_coffee":      "Coffee",
    "ghw_corn":        "Corn",
    "ghw_forestry":    "Forestry",
    "ghw_poultry":     "Poultry",
    "ghw_rpo_pruning": "RPO/Pruning",
    "ghw_rsu_organic": "RSU (urban)",
    "ghw_soybean":     "Soybean",
    "ghw_sugarcane":   "Sugarcane",
    "ghw_swine":       "Swine",
}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("ERROR: DATABASE_URL env var not set.")
    return psycopg2.connect(url)


def fetch_summary(conn) -> pd.DataFrame:
    query = """
        SELECT ms.ibge_code,
               rs.municipality_name,
               ms.ghw_aquaculture, ms.ghw_cattle,   ms.ghw_citrus,  ms.ghw_coffee,
               ms.ghw_corn,        ms.ghw_forestry, ms.ghw_poultry, ms.ghw_rpo_pruning,
               ms.ghw_rsu_organic, ms.ghw_soybean,  ms.ghw_sugarcane, ms.ghw_swine,
               ms.mun_potential_class, ms.nm_rgint,  ms.mun_dominant_stream,
               ms.mun_total_GWh,   ms.mun_n_streams, ms.lat, ms.lon
        FROM municipality_summary ms
        LEFT JOIN (
            SELECT DISTINCT ON (ibge_code) ibge_code, municipality_name
            FROM residue_streams_sp2023
            ORDER BY ibge_code
        ) rs USING (ibge_code)
        ORDER BY ms.ibge_code
    """
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    return pd.DataFrame(rows, columns=cols)


# ---------------------------------------------------------------------------
# Clustering
# ---------------------------------------------------------------------------
def run_kmeans(X_scaled: np.ndarray, k_range=(4, 5, 6)):
    best_k, best_score, best_labels, best_model = None, -1, None, None
    for k in k_range:
        km = KMeans(n_clusters=k, n_init=20, random_state=42)
        labels = km.fit_predict(X_scaled)
        score  = silhouette_score(X_scaled, labels)
        print(f"  k={k}  silhouette={score:.4f}")
        if score > best_score:
            best_k, best_score, best_labels, best_model = k, score, labels, km
    print(f"  → Best k={best_k} (silhouette={best_score:.4f})")
    return best_k, best_labels, best_model


def make_cluster_labels(df: pd.DataFrame, labels: np.ndarray, model: KMeans) -> dict:
    """Return {cluster_id: human_label}.

    Large clusters (>=100 muns): absolute dominant stream — what is highest in raw GWh.
    Small clusters (<100 muns): relative signature — what is MOST elevated vs global mean.
    Using ratio vs global mean for small clusters avoids sugarcane swamping every label
    even when the cluster's distinguishing feature is a different stream.
    """
    tmp = df[GWH_COLS].copy()
    tmp["cluster_id"] = labels
    sizes       = tmp.groupby("cluster_id").size()
    raw_means   = tmp.groupby("cluster_id")[GWH_COLS].mean()
    global_mean = df[GWH_COLS].mean().clip(lower=0.01)
    ratio       = raw_means.div(global_mean)   # how elevated vs state average

    MIN_GWH = 1.0  # ignore streams where cluster mean < 1 GWh/yr (avoids near-zero inflation)

    mapping = {}
    for cid, row in raw_means.iterrows():
        if sizes[cid] >= 100:
            top = row.idxmax()
            suffix = "dominated"
        else:
            valid = ratio.loc[cid].where(raw_means.loc[cid] >= MIN_GWH, other=0)
            top = valid.idxmax()
            suffix = "intensive"
        name = STREAM_LABELS[top].lower().replace("/", "-").replace(" ", "-")
        mapping[cid] = f"{name}-{suffix}"
    return mapping


def print_cluster_profiles(df: pd.DataFrame):
    """Print a readable summary table for each cluster."""
    print("\n--- Cluster Profiles ---")
    global_mean = df[GWH_COLS].mean()
    for cid in sorted(df["cluster_id"].unique()):
        sub  = df[df["cluster_id"] == cid]
        label = sub["cluster_label"].iloc[0]
        print(f"\nCluster {cid} — {label} (n={len(sub)})")
        means = sub[GWH_COLS].mean().sort_values(ascending=False)
        for col, val in means.items():
            ratio = val / global_mean[col] if global_mean[col] > 0.01 else 0
            bar   = "█" * min(int(ratio * 5), 30)
            print(f"  {STREAM_LABELS[col]:>12}  {val:8.1f} GWh/yr  x{ratio:.2f}  {bar}")
        if "nm_rgint" in sub.columns:
            top_regions = sub["nm_rgint"].value_counts().head(3).to_dict()
            print(f"  Top regions: {top_regions}")
        dom = sub["mun_dominant_stream"].value_counts().head(3).to_dict()
        print(f"  Dominant streams: {dom}")


# ---------------------------------------------------------------------------
# DB write-back
# ---------------------------------------------------------------------------
def write_clusters(conn, df: pd.DataFrame):
    rows = [
        (int(r.cluster_id), r.cluster_label, int(r.cluster_k), int(r.ibge_code))
        for _, r in df.iterrows()
    ]
    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            UPDATE municipality_summary
               SET cluster_id    = data.cluster_id,
                   cluster_label = data.cluster_label,
                   cluster_k     = data.cluster_k,
                   updated_at    = NOW()
              FROM (VALUES %s) AS data(cluster_id, cluster_label, cluster_k, ibge_code)
             WHERE municipality_summary.ibge_code = data.ibge_code
            """,
            rows,
            template="(%s, %s, %s, %s)",
            page_size=200,
        )
    conn.commit()
    print(f"  → Updated {len(rows):,} rows in municipality_summary")


# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------
def export_csv(df: pd.DataFrame):
    out = OUTPUTS_DIR / "cluster_analysis.csv"
    df.to_csv(out, index=False)
    print(f"  → {out}")


def plot_heatmap(df: pd.DataFrame):
    # Mean GWh per cluster × stream (original scale, not scaled)
    pivot = df.groupby("cluster_label")[GWH_COLS].mean()
    pivot.columns = [STREAM_LABELS[c] for c in GWH_COLS]
    # log1p so sugarcane doesn't swamp everything
    log_pivot = np.log1p(pivot)

    fig, ax = plt.subplots(figsize=(13, max(4, len(pivot) * 1.2)))
    sns.heatmap(
        log_pivot,
        annot=pivot.round(1),
        fmt=".1f",
        cmap="YlOrRd",
        linewidths=0.5,
        ax=ax,
        cbar_kws={"label": "log(1 + mean GWh/yr)"},
    )
    ax.set_title("Mean Energy Potential per Cluster × Stream\n(annotation = raw GWh/yr)", fontsize=12)
    ax.set_ylabel("Cluster")
    ax.set_xlabel("Residue Stream")
    plt.tight_layout()
    out = OUTPUTS_DIR / "cluster_heatmap.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  → {out}")


def plot_sizes(df: pd.DataFrame):
    counts = df.groupby(["cluster_id", "cluster_label"]).size().reset_index(name="count")
    counts = counts.sort_values("cluster_id")
    labels = counts["cluster_label"]
    values = counts["count"]

    fig, ax = plt.subplots(figsize=(max(6, len(counts) * 1.5), 5))
    bars = ax.bar(labels, values, color=plt.cm.tab10.colors[: len(counts)])
    ax.bar_label(bars, padding=3)
    ax.set_title("Number of Municipalities per Cluster", fontsize=12)
    ax.set_xlabel("Cluster")
    ax.set_ylabel("Municipalities")
    ax.set_ylim(0, values.max() * 1.15)
    plt.xticks(rotation=20, ha="right")
    plt.tight_layout()
    out = OUTPUTS_DIR / "cluster_sizes.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  → {out}")


def plot_pca(df: pd.DataFrame, X_scaled: np.ndarray):
    pca   = PCA(n_components=2, random_state=42)
    comps = pca.fit_transform(X_scaled)
    ev    = pca.explained_variance_ratio_

    unique_clusters = sorted(df["cluster_id"].unique())
    palette = plt.cm.tab10.colors

    fig, ax = plt.subplots(figsize=(10, 7))
    for i, cid in enumerate(unique_clusters):
        mask  = df["cluster_id"] == cid
        label = df.loc[mask, "cluster_label"].iloc[0]
        ax.scatter(
            comps[mask, 0], comps[mask, 1],
            c=[palette[i % 10]], label=label,
            alpha=0.65, s=40, edgecolors="white", linewidths=0.4,
        )

    # Annotate notable municipalities
    notable = {3550308: "São Paulo", 3543402: "Ribeirão Preto", 3549904: "Piracicaba"}
    for ibge, name in notable.items():
        idx = df.index[df["ibge_code"] == ibge]
        if len(idx):
            i = idx[0]
            ax.annotate(name, (comps[i, 0], comps[i, 1]),
                        fontsize=8, xytext=(5, 5), textcoords="offset points")

    ax.set_xlabel(f"PC1 ({ev[0]*100:.1f}% var)")
    ax.set_ylabel(f"PC2 ({ev[1]*100:.1f}% var)")
    ax.set_title("PCA Projection — K-Means Clusters\n(São Paulo municipalities, 2023 biogas potential)", fontsize=11)
    ax.legend(loc="best", fontsize=9)
    plt.tight_layout()
    out = OUTPUTS_DIR / "cluster_pca.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  → {out}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    conn = get_conn()
    try:
        print("Fetching municipality_summary …")
        df = fetch_summary(conn)
        print(f"  → {len(df):,} rows")

        print("Scaling 12 GWh columns …")
        X = df[GWH_COLS].fillna(0).values
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        print("Running K-Means (k = 4, 5, 6) …")
        best_k, labels, model = run_kmeans(X_scaled)

        label_map = make_cluster_labels(df, labels, model)
        df["cluster_id"]    = labels
        df["cluster_label"] = df["cluster_id"].map(label_map)
        df["cluster_k"]     = best_k

        print(f"\nCluster distribution:")
        print(df.groupby(["cluster_id", "cluster_label"]).size().to_string())
        print_cluster_profiles(df)

        print("\nWriting cluster labels to DB …")
        write_clusters(conn, df)

        print("\nExporting outputs …")
        export_csv(df)
        plot_heatmap(df)
        plot_sizes(df)
        plot_pca(df, X_scaled)

        print("\nDone. Files written to:", OUTPUTS_DIR)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
