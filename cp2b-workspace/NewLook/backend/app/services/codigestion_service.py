"""
codigestion_service.py
======================
Identifies spatial co-digestion opportunity clusters across São Paulo
municipalities based on:
  1. Geographic proximity (30 km default radius) — union-find grouping
  2. C:N ratio complementarity — pairs that move combined C:N toward 20–30 range
  3. Minimum biomass threshold — filters negligible residue streams

This is a SPATIAL SCREENING TOOL. Results indicate opportunities worth
exploring in laboratory settings. Chemical feasibility must be validated
experimentally before implementation.

C:N optimal range: 20–30 (midpoint 25) for mesophilic anaerobic digestion.
"""

import logging
import math
from pathlib import Path
from functools import lru_cache
from typing import Optional

from app.services.biomass_availability import (
    BIOMASS_FIELDS,
    BIOGAS_FIELDS,
    derive_biomass_fields,
)

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

CN_OPTIMAL_LOW  = 20.0
CN_OPTIMAL_HIGH = 30.0
CN_OPTIMAL_MID  = 25.0

RESIDUE_META = {
    "sugarcane":   {"label": "Palha de Cana",       "sector": "agricultural", "codigo": "palha_cana"},
    "soybean":     {"label": "Palha de Soja",       "sector": "agricultural", "codigo": "palha_soja"},
    "corn":        {"label": "Palha de Milho",      "sector": "agricultural", "codigo": "palha_milho"},
    "coffee":      {"label": "Casca de Café",       "sector": "agricultural", "codigo": "casca_cafe"},
    "citrus":      {"label": "Bagaço de Citros",    "sector": "agricultural", "codigo": "bagaco_citros"},
    "cattle":      {"label": "Esterco Bovino",      "sector": "livestock",    "codigo": "esterco_bovino_fresco"},
    "swine":       {"label": "Dejetos de Suínos",   "sector": "livestock",    "codigo": "dejetos_suinos_liquidos"},
    "poultry":     {"label": "Cama de Aviário",     "sector": "livestock",    "codigo": "cama_aviario"},
    "aquaculture": {"label": "Resíduo Aquicultura", "sector": "livestock",    "codigo": None},
    "rsu":         {"label": "FORSU (RSU Orgânico)","sector": "urban",        "codigo": "forsu_ur_rsu"},
    "rpo":         {"label": "Lodo de ETE",         "sector": "urban",        "codigo": "lodo_primario_ete"},
}

RESIDUE_KEYS = list(RESIDUE_META.keys())

SHAPEFILE_PATH = (
    Path(__file__).parent.parent.parent.parent / "data" / "shapefiles" / "SP_Municipios_2024.shp"
)


# ─── C:N scoring ─────────────────────────────────────────────────────────────

def _cn_role(cn: float) -> str:
    if cn < CN_OPTIMAL_LOW:
        return "nitrogen_donor"
    if cn > CN_OPTIMAL_HIGH:
        return "carbon_donor"
    return "balanced"


def _weighted_cn(biomass_a: float, cn_a: float, biomass_b: float, cn_b: float) -> float:
    total = biomass_a + biomass_b
    if total <= 0:
        return CN_OPTIMAL_MID
    return (biomass_a * cn_a + biomass_b * cn_b) / total


def _improvement_score(cn_combined: float, cn_a: float, cn_b: float) -> float:
    dist_a        = abs(cn_a        - CN_OPTIMAL_MID)
    dist_b        = abs(cn_b        - CN_OPTIMAL_MID)
    dist_combined = abs(cn_combined - CN_OPTIMAL_MID)
    return round((dist_a + dist_b) / 2.0 - dist_combined, 2)


def _blend_ratio(biomass_a: float, biomass_b: float) -> str:
    total = biomass_a + biomass_b
    if total <= 0:
        return "0:0"
    pct_a = round(biomass_a / total * 100, 1)
    return f"{pct_a}:{round(100 - pct_a, 1)}"


# ─── Spatial grouping ─────────────────────────────────────────────────────────

class _UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int):
        px, py = self.find(x), self.find(y)
        if px != py:
            self.parent[px] = py


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _build_spatial_groups(municipalities: list[dict], radius_km: float) -> list[list[dict]]:
    n  = len(municipalities)
    uf = _UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = municipalities[i], municipalities[j]
            if None in (a.get("centroid_lat"), a.get("centroid_lng"),
                        b.get("centroid_lat"), b.get("centroid_lng")):
                continue
            dist = _haversine_km(a["centroid_lat"], a["centroid_lng"],
                                 b["centroid_lat"], b["centroid_lng"])
            if dist <= radius_km:
                uf.union(i, j)

    groups_idx: dict[int, list[int]] = {}
    for i in range(n):
        root = uf.find(i)
        groups_idx.setdefault(root, []).append(i)

    return [
        [municipalities[i] for i in idxs]
        for idxs in groups_idx.values()
        if len(idxs) >= 2
    ]


# ─── Convex hull ─────────────────────────────────────────────────────────────

def _convex_hull_geojson(municipalities: list[dict]) -> Optional[dict]:
    try:
        from shapely.geometry import MultiPoint, mapping
    except ImportError:
        return None

    coords = [
        (m["centroid_lng"], m["centroid_lat"])
        for m in municipalities
        if m.get("centroid_lat") and m.get("centroid_lng")
    ]
    if len(coords) < 2:
        return None

    hull = MultiPoint(coords).convex_hull
    if hull.geom_type != "Polygon":
        hull = hull.buffer(0.05)
    return mapping(hull)


# ─── C:N data from local PostgreSQL ──────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_cn_data() -> dict[str, float]:
    try:
        from app.core.database import get_db
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT codigo, chemical_cn_ratio FROM residuos WHERE chemical_cn_ratio IS NOT NULL")
            rows = cursor.fetchall()
            cursor.close()
        return {row["codigo"]: float(row["chemical_cn_ratio"]) for row in rows}
    except Exception as e:
        logger.error(f"Failed to load C:N data: {e}")
        return {}


def _get_cn(key: str, cn_by_codigo: dict[str, float]) -> float:
    meta   = RESIDUE_META.get(key, {})
    codigo = meta.get("codigo")
    if codigo and codigo in cn_by_codigo:
        return cn_by_codigo[codigo]
    return CN_OPTIMAL_MID


# ─── Main clustering function ─────────────────────────────────────────────────

def find_codigestion_clusters(
    radius_km: float = 30.0,
    min_biomass_tons: float = 1000.0,
    max_clusters: int = 20,
) -> dict:
    from app.core.database import get_db

    weight_cols_sql = ", ".join(dict.fromkeys((*BIOGAS_FIELDS, *BIOMASS_FIELDS)))
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT id, municipality_name, ibge_code, centroid_lat, centroid_lng, {weight_cols_sql}
                FROM municipalities
                WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL
            """)
            rows = [dict(r) for r in cursor.fetchall()]
            cursor.close()
    except Exception as e:
        logger.error(f"Failed to fetch municipality data: {e}")
        return {"clusters": [], "total_clusters": 0,
                "parameters": {"radius_km": radius_km, "min_biomass_tons": min_biomass_tons}}

    if not rows:
        return {"clusters": [], "total_clusters": 0,
                "parameters": {"radius_km": radius_km, "min_biomass_tons": min_biomass_tons}}

    municipalities = []
    for row in rows:
        biomass_fields = derive_biomass_fields(row)
        municipalities.append({
            "id":           row["id"],
            "name":         row.get("municipality_name", ""),
            "ibge_code":    row.get("ibge_code", ""),
            "centroid_lat": float(row["centroid_lat"]),
            "centroid_lng": float(row["centroid_lng"]),
            **{f"{k}_biogas_m3_year": float(row.get(f"{k}_biogas_m3_year") or 0) for k in RESIDUE_KEYS},
            **biomass_fields,
        })

    logger.info(f"Building spatial groups for {len(municipalities)} municipalities (radius={radius_km} km)...")
    groups = _build_spatial_groups(municipalities, radius_km)
    logger.info(f"Found {len(groups)} multi-municipality groups")

    cn_by_codigo   = _load_cn_data()
    cluster_results = []

    for group_idx, group in enumerate(groups):
        cluster_biomass: dict[str, float] = {}
        cluster_biogas: dict[str, float] = {}
        for key in RESIDUE_KEYS:
            cluster_biomass[key] = round(sum(m.get(f"{key}_biomass_tons_year", 0.0) for m in group), 2)
            cluster_biogas[key] = round(sum(m.get(f"{key}_biogas_m3_year", 0.0) for m in group), 2)

        present = [k for k in RESIDUE_KEYS if cluster_biomass.get(k, 0.0) >= min_biomass_tons]
        if len(present) < 2:
            continue

        avg_lat = sum(m["centroid_lat"] for m in group) / len(group)
        avg_lng = sum(m["centroid_lng"] for m in group) / len(group)

        qualifying_pairs = []
        for i, key_a in enumerate(present):
            for key_b in present[i + 1:]:
                cn_a = _get_cn(key_a, cn_by_codigo)
                cn_b = _get_cn(key_b, cn_by_codigo)
                if cn_a <= 0 or cn_b <= 0:
                    continue
                b_a    = cluster_biomass[key_a]
                b_b    = cluster_biomass[key_b]
                cn_comb = _weighted_cn(b_a, cn_a, b_b, cn_b)
                score   = _improvement_score(cn_comb, cn_a, cn_b)
                if score <= 0:
                    continue
                qualifying_pairs.append({
                    "residue_a": {"key": key_a, "label": RESIDUE_META[key_a]["label"],
                                  "sector": RESIDUE_META[key_a]["sector"], "cn_ratio": cn_a,
                                  "cn_role": _cn_role(cn_a), "biomass_tons_year": b_a,
                                  "biogas_m3_year": cluster_biogas[key_a]},
                    "residue_b": {"key": key_b, "label": RESIDUE_META[key_b]["label"],
                                  "sector": RESIDUE_META[key_b]["sector"], "cn_ratio": cn_b,
                                  "cn_role": _cn_role(cn_b), "biomass_tons_year": b_b,
                                  "biogas_m3_year": cluster_biogas[key_b]},
                    "cn_combined": round(cn_comb, 2),
                    "cn_combined_in_range": CN_OPTIMAL_LOW <= cn_comb <= CN_OPTIMAL_HIGH,
                    "improvement_score": score,
                    "combined_biomass_tons_year": round(b_a + b_b, 2),
                    "combined_biogas_m3_year": round(cluster_biogas[key_a] + cluster_biogas[key_b], 2),
                    "blend_ratio_A_to_B": _blend_ratio(b_a, b_b),
                })

        if not qualifying_pairs:
            continue

        qualifying_pairs.sort(key=lambda p: p["improvement_score"], reverse=True)
        top_pair = qualifying_pairs[0]

        mun_list = sorted(
            [{"ibge_code": m["ibge_code"], "name": m["name"],
              "distance_from_centroid_km": round(_haversine_km(avg_lat, avg_lng, m["centroid_lat"], m["centroid_lng"]), 1)}
             for m in group],
            key=lambda x: x["distance_from_centroid_km"],
        )

        cluster_results.append({
            "cluster_id":         f"cluster_{group_idx:04d}",
            "municipality_count": len(group),
            "municipalities":     mun_list,
            "convex_hull":        _convex_hull_geojson(group),
            "centroid":           {"lat": round(avg_lat, 6), "lng": round(avg_lng, 6)},
            "top_pair":           top_pair,
            "all_qualifying_pairs": qualifying_pairs[:10],
            "all_present_residues": present,
            "cluster_score":      top_pair["improvement_score"],
            "total_biomass_tons_year": round(sum(cluster_biomass.values()), 2),
            "total_biogas_m3_year": round(sum(cluster_biogas.values()), 2),
        })

    cluster_results.sort(key=lambda c: c["cluster_score"], reverse=True)
    top_clusters = cluster_results[:max_clusters]
    for rank, cluster in enumerate(top_clusters, 1):
        cluster["cluster_id"] = f"cluster_{rank:03d}"

    return {
        "clusters":       top_clusters,
        "total_clusters": len(cluster_results),
        "parameters":     {"radius_km": radius_km, "min_biomass_tons": min_biomass_tons},
    }


def _cn_label(cn: float) -> str:
    if cn > 40:
        return "C-RICH"
    if cn < 20:
        return "N-RICH"
    return "BALANCED"


def get_municipality_cn_profiles() -> list[dict]:
    """
    Per-municipality weighted C/N ratio using biomass tonnage × residue C/N.
    Formula: Σ(biomass_i × cn_i) / Σ(biomass_i) across all active residue streams.
    """
    from app.core.database import get_db

    # Weight by biogas_m3_year — proportional to biomass contribution, correctly scales C/N.
    weight_cols_sql = ", ".join(f"{k}_biogas_m3_year" for k in RESIDUE_KEYS)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT ibge_code, municipality_name, centroid_lat, centroid_lng,
                       {weight_cols_sql}
                FROM municipalities
                WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL
            """)
            rows = [dict(r) for r in cursor.fetchall()]
            cursor.close()
    except Exception as e:
        logger.error(f"Failed to fetch municipality data for C/N profiles: {e}")
        return []

    cn_by_codigo = _load_cn_data()
    results = []
    for row in rows:
        breakdown: dict[str, dict] = {}
        total_weight = 0.0
        numerator = 0.0
        for key in RESIDUE_KEYS:
            weight = float(row.get(f"{key}_biogas_m3_year") or 0)
            if weight <= 0:
                continue
            cn = _get_cn(key, cn_by_codigo)
            breakdown[key] = {"biogas_m3": round(weight, 1), "cn": cn}
            total_weight += weight
            numerator += weight * cn

        cn_weighted = round(numerator / total_weight, 2) if total_weight > 0 else CN_OPTIMAL_MID
        dominant = max(breakdown, key=lambda k: breakdown[k]["biogas_m3"], default=None)
        results.append({
            "ibge_code": row["ibge_code"],
            "municipality_name": row["municipality_name"],
            "centroid_lat": float(row["centroid_lat"]),
            "centroid_lng": float(row["centroid_lng"]),
            "cn_ratio_weighted": cn_weighted,
            "cn_label": _cn_label(cn_weighted),
            "dominant_residue": dominant,
            "total_biogas_m3_year": round(total_weight, 1),
            "residue_breakdown": breakdown,
        })
    return results


def get_pairing_candidates(ibge_code: str, radius_km: float = 50.0) -> list[dict]:
    """
    Top-ranked co-digestion partners for a given municipality within radius_km.
    Ranked by improvement_score = |cn_target − 25| − |cn_blended − 25|.
    """
    profiles = get_municipality_cn_profiles()
    target = next((p for p in profiles if str(p["ibge_code"]) == str(ibge_code)), None)
    if target is None:
        return []

    candidates = []
    for p in profiles:
        if str(p["ibge_code"]) == str(ibge_code):
            continue
        dist = _haversine_km(
            target["centroid_lat"], target["centroid_lng"],
            p["centroid_lat"], p["centroid_lng"],
        )
        if dist > radius_km:
            continue
        b_a = target["total_biogas_m3_year"]
        b_b = p["total_biogas_m3_year"]
        cn_blended = _weighted_cn(b_a, target["cn_ratio_weighted"], b_b, p["cn_ratio_weighted"])
        score = _improvement_score(cn_blended, target["cn_ratio_weighted"], p["cn_ratio_weighted"])
        candidates.append({
            "ibge_code": p["ibge_code"],
            "municipality_name": p["municipality_name"],
            "distance_km": round(dist, 1),
            "cn_ratio_weighted": p["cn_ratio_weighted"],
            "cn_label": p["cn_label"],
            "dominant_residue": p["dominant_residue"],
            "total_biogas_m3_year": p["total_biogas_m3_year"],
            "cn_blended": round(cn_blended, 2),
            "improvement_score": score,
        })

    candidates.sort(key=lambda c: c["improvement_score"], reverse=True)
    return candidates[:20]


def get_residue_cn_matrix() -> dict:
    cn_by_codigo = _load_cn_data()
    residues = []
    for key, meta in RESIDUE_META.items():
        cn = _get_cn(key, cn_by_codigo)
        residues.append({
            "key": key, "label": meta["label"], "sector": meta["sector"],
            "cn_ratio": cn, "in_optimal_range": CN_OPTIMAL_LOW <= cn <= CN_OPTIMAL_HIGH,
            "cn_role": _cn_role(cn),
        })
    return {"residues": residues, "optimal_range": {"low": CN_OPTIMAL_LOW, "high": CN_OPTIMAL_HIGH}}
