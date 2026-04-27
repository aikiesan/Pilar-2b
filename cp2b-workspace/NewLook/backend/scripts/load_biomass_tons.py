"""
load_biomass_tons.py
====================
Loads biomass availability (tons/year) into the municipalities table.

Primary source:
  MapBiomas Collection 10 CSV (FINAL_FILES-20260426T151225Z-3-001)
  → land use area (ha) per municipality per year (we use 2024 column)
  → multiply by per-crop residue yield factors (t biomass residue / ha)

Secondary source (reverse BMP formula):
  For livestock, urban, and corn residues where MapBiomas class is
  either not available or mixed (class 41 = Other Temporary Crops):
    biomass_tons = biogas_m3 / (BMP_medio × VS_medio/100)
  where BMP in NmL CH4/g VS → m³ CH4/t VS (multiply by 1).

Cross-validation:
  For crops covered by both methods (sugarcane, soybean, coffee, citrus),
  both are computed and the divergence is logged to biomass_validation_log.csv.
  PAM-based (MapBiomas × yield) is stored as the authoritative value.

Yield factors used (t biomass residue per ha harvested):
  - Sugarcane (class 20):  12 t/ha  [80 t/ha cane × 15% straw — theoretical palhiço]
  - Soybean   (class 39):   4 t/ha  [~3.5 t/ha grain × 1.15 residue ratio]
  - Corn      (class 41*):  4.5 t/ha [mixed class — proxy for corn stover, noted in log]
  - Coffee    (class 46):   0.6 t/ha [1.5 t cherry/ha × 40% husks/pulp]
  - Citrus    (class 47):   5 t/ha  [40 t fruit/ha × 12.5% processing residue]
  * Class 41 = Other Temporary Crops; corn is dominant in SP but not exclusive.

Effective BMP parameters for reverse-BMP (livestock/urban):
  - Cattle:      BMP=210 NmL/gVS, VS=12.5% (esterco_bovino_fresco dominant)
  - Swine:       BMP=210 NmL/gVS, VS=3.5%  (dejetos_suinos_liquidos)
  - Poultry:     BMP=270 NmL/gVS, VS=50%   (weighted: cama_aviario + aves_frescos)
  - Aquaculture: BMP=200 NmL/gVS, VS=15%   (estimated organic residue)
  - RSU:         BMP=410 NmL/gVS, VS=17%   (forsu_ur_rsu)
  - RPO:         BMP=210 NmL/gVS, VS=3.1%  (avg lodo_primario + lodo_secundario)

Usage:
  Run from the backend/ directory after applying migration 006:
    python scripts/load_biomass_tons.py
  Or with a custom CSV path:
    MAPBIOMAS_CSV=/path/to/MB_col10_municipios.csv python scripts/load_biomass_tons.py
"""

import os
import sys
import csv
import math
import logging
from pathlib import Path
from typing import Optional

# Allow running from backend/ or backend/scripts/
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

MAPBIOMAS_CSV = os.environ.get(
    "MAPBIOMAS_CSV",
    str(Path(__file__).parent.parent.parent.parent.parent
        / "FINAL_FILES-20260426T151225Z-3-001"
        / "FINAL_FILES"
        / "CSV"
        / "MB_col10_municipios.csv")
)
YEAR_COLUMN = "2024"
VALIDATION_LOG = str(Path(__file__).parent / "biomass_validation_log.csv")
DIVERGENCE_THRESHOLD = 0.20  # Flag if MapBiomas vs BMP methods differ > 20%

# MapBiomas class_id → residue type + yield factor (t biomass residue / ha)
MAPBIOMAS_YIELD = {
    20: {"key": "sugarcane", "yield_t_ha": 12.0,
         "note": "80 t/ha cane × 15% straw (theoretical palhiço)"},
    39: {"key": "soybean",   "yield_t_ha": 4.0,
         "note": "~3.5 t/ha grain × 1.15 residue ratio"},
    41: {"key": "corn",      "yield_t_ha": 4.5,
         "note": "Other Temporary Crops proxy — corn is dominant in SP but class is mixed"},
    46: {"key": "coffee",    "yield_t_ha": 0.6,
         "note": "1.5 t cherry/ha × 40% husks/pulp dry matter"},
    47: {"key": "citrus",    "yield_t_ha": 5.0,
         "note": "40 t fruit/ha × 12.5% processing residue (peel + bagasse)"},
}

# Effective BMP parameters for reverse-BMP method (per municipality column)
# biomass_tons = biogas_m3 / (BMP × VS/100)
BMP_PARAMS = {
    "cattle":      {"bmp": 210.0, "vs": 12.5},   # esterco_bovino_fresco
    "swine":       {"bmp": 210.0, "vs":  3.5},   # dejetos_suinos_liquidos
    "poultry":     {"bmp": 270.0, "vs": 50.0},   # weighted: cama_aviario + aves_frescos
    "aquaculture": {"bmp": 200.0, "vs": 15.0},   # estimated
    "rsu":         {"bmp": 410.0, "vs": 17.0},   # forsu_ur_rsu
    "rpo":         {"bmp": 210.0, "vs":  3.1},   # avg lodo_primario + lodo_secundario
}

AGRICULTURAL_KEYS = ["sugarcane", "soybean", "corn", "coffee", "citrus"]
LIVESTOCK_KEYS    = ["cattle", "swine", "poultry", "aquaculture"]
URBAN_KEYS        = ["rsu", "rpo"]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def reverse_bmp(biogas_m3: float, bmp: float, vs_pct: float) -> float:
    """
    Reverse BMP formula: estimate raw biomass from biogas volume.
    BMP in NmL CH4/g VS → m³ CH4 per ton VS (numerically equal: BMP m³/t).
    biomass_tons = biogas_m3 / (BMP × VS_fraction)
    Returns 0 if inputs are invalid.
    """
    denom = bmp * (vs_pct / 100.0)
    if denom <= 0 or biogas_m3 <= 0:
        return 0.0
    return round(biogas_m3 / denom, 2)


def load_mapbiomas_sp(csv_path: str) -> dict[str, dict[int, float]]:
    """
    Load MapBiomas CSV filtered to SP state.
    Returns: {municipality_name_lower: {class_id: area_ha_2024}}
    """
    logger.info(f"Loading MapBiomas CSV from: {csv_path}")
    if not Path(csv_path).exists():
        logger.error(f"MapBiomas CSV not found: {csv_path}")
        return {}

    data: dict[str, dict[int, float]] = {}
    row_count = 0

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("state_acronym") != "SP":
                continue
            row_count += 1
            mun = row["municipality"].strip().lower()
            try:
                class_id = int(row["class_id"])
                area_ha = float(row.get(YEAR_COLUMN, 0) or 0)
            except (ValueError, TypeError):
                continue

            if class_id not in MAPBIOMAS_YIELD:
                continue

            if mun not in data:
                data[mun] = {}
            data[mun][class_id] = data[mun].get(class_id, 0.0) + area_ha

    logger.info(f"Loaded {row_count} SP rows, {len(data)} unique municipalities")
    return data


def normalize_name(name: str) -> str:
    """Lowercase + strip for fuzzy name matching."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = nfkd.encode("ASCII", "ignore").decode("ASCII")
    return ascii_str.strip().lower()


def match_municipality(db_name: str, mb_data: dict) -> Optional[dict[int, float]]:
    """Try exact match, then accent-stripped match."""
    key = db_name.strip().lower()
    if key in mb_data:
        return mb_data[key]
    # Try accent-stripped match
    norm_key = normalize_name(db_name)
    for mb_name, areas in mb_data.items():
        if normalize_name(mb_name) == norm_key:
            return areas
    return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    from app.services.supabase_client import get_supabase_client

    supabase = get_supabase_client()

    # Load MapBiomas data
    mb_data = load_mapbiomas_sp(MAPBIOMAS_CSV)
    if not mb_data:
        logger.warning("No MapBiomas data loaded. Falling back entirely to reverse BMP.")

    # Fetch all municipalities
    logger.info("Fetching municipalities from Supabase...")
    result = supabase.table("municipalities").select(
        "id, municipality_name, "
        "sugarcane_biogas_m3_year, soybean_biogas_m3_year, corn_biogas_m3_year, "
        "coffee_biogas_m3_year, citrus_biogas_m3_year, "
        "cattle_biogas_m3_year, swine_biogas_m3_year, poultry_biogas_m3_year, "
        "aquaculture_biogas_m3_year, rsu_biogas_m3_year, rpo_biogas_m3_year"
    ).execute()

    municipalities = result.data or []
    logger.info(f"Processing {len(municipalities)} municipalities...")

    validation_rows = []
    matched_mb = 0
    updated = 0

    for mun in municipalities:
        mun_id = mun["id"]
        name = mun.get("municipality_name", "")

        # ── MapBiomas area-based estimates ────────────────────────────────────
        mb_areas = match_municipality(name, mb_data) if mb_data else None
        if mb_areas:
            matched_mb += 1

        mb_tons: dict[str, float] = {}
        for class_id, cfg in MAPBIOMAS_YIELD.items():
            key = cfg["key"]
            area_ha = (mb_areas or {}).get(class_id, 0.0)
            mb_tons[key] = round(area_ha * cfg["yield_t_ha"], 2)

        # ── Reverse BMP estimates (cross-validation + livestock/urban) ────────
        bmp_tons: dict[str, float] = {}
        for key, params in BMP_PARAMS.items():
            biogas_col = f"{key}_biogas_m3_year"
            biogas_m3 = float(mun.get(biogas_col) or 0)
            bmp_tons[key] = reverse_bmp(biogas_m3, params["bmp"], params["vs"])

        # Also compute BMP-based estimates for MapBiomas crops (cross-validation)
        bmp_params_crops = {
            "sugarcane": {"bmp": 210.0, "vs": 77.0},  # weighted palha+vinhaça
            "soybean":   {"bmp": 180.0, "vs": 84.0},  # avg palha_soja + casca_soja
            "corn":      {"bmp": 280.0, "vs": 77.0},  # avg palha+casca+sabugo
            "coffee":    {"bmp": 350.0, "vs": 89.0},  # avg casca+polpa
            "citrus":    {"bmp": 300.0, "vs": 20.0},  # avg bagaço+cascas
        }
        for key, params in bmp_params_crops.items():
            biogas_col = f"{key}_biogas_m3_year"
            biogas_m3 = float(mun.get(biogas_col) or 0)
            bmp_tons[key] = reverse_bmp(biogas_m3, params["bmp"], params["vs"])

        # ── Cross-validation: log divergences ────────────────────────────────
        for key in AGRICULTURAL_KEYS:
            mb_val = mb_tons.get(key, 0.0)
            bmp_val = bmp_tons.get(key, 0.0)
            if mb_val > 0 and bmp_val > 0:
                divergence = abs(mb_val - bmp_val) / max(mb_val, bmp_val)
                if divergence > DIVERGENCE_THRESHOLD:
                    validation_rows.append({
                        "municipality": name,
                        "residue": key,
                        "mapbiomas_tons": mb_val,
                        "bmp_reverse_tons": bmp_val,
                        "divergence_pct": round(divergence * 100, 1),
                        "flag": "HIGH_DIVERGENCE" if divergence > 0.5 else "MODERATE_DIVERGENCE",
                    })

        # ── Build final update (MapBiomas primary for crops; BMP for rest) ────
        # Use MapBiomas value if > 0, else fall back to BMP reverse
        def pick(key: str) -> float:
            mb = mb_tons.get(key, 0.0)
            return mb if mb > 0 else bmp_tons.get(key, 0.0)

        final: dict[str, float] = {
            "sugarcane_biomass_tons_year": pick("sugarcane"),
            "soybean_biomass_tons_year":   pick("soybean"),
            "corn_biomass_tons_year":      pick("corn"),
            "coffee_biomass_tons_year":    pick("coffee"),
            "citrus_biomass_tons_year":    pick("citrus"),
            "cattle_biomass_tons_year":    bmp_tons.get("cattle", 0.0),
            "swine_biomass_tons_year":     bmp_tons.get("swine", 0.0),
            "poultry_biomass_tons_year":   bmp_tons.get("poultry", 0.0),
            "aquaculture_biomass_tons_year": bmp_tons.get("aquaculture", 0.0),
            "rsu_biomass_tons_year":       bmp_tons.get("rsu", 0.0),
            "rpo_biomass_tons_year":       bmp_tons.get("rpo", 0.0),
        }

        ag  = sum(final[f"{k}_biomass_tons_year"] for k in AGRICULTURAL_KEYS)
        lv  = sum(final[f"{k}_biomass_tons_year"] for k in LIVESTOCK_KEYS)
        urb = sum(final[f"{k}_biomass_tons_year"] for k in URBAN_KEYS)

        final["agricultural_biomass_tons_year"] = round(ag, 2)
        final["livestock_biomass_tons_year"]    = round(lv, 2)
        final["urban_biomass_tons_year"]        = round(urb, 2)
        final["total_biomass_tons_year"]        = round(ag + lv + urb, 2)

        supabase.table("municipalities").update(final).eq("id", mun_id).execute()
        updated += 1

        if updated % 100 == 0:
            logger.info(f"  Updated {updated}/{len(municipalities)} municipalities...")

    # ── Write validation log ───────────────────────────────────────────────────
    if validation_rows:
        fieldnames = ["municipality", "residue", "mapbiomas_tons",
                      "bmp_reverse_tons", "divergence_pct", "flag"]
        with open(VALIDATION_LOG, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(validation_rows)
        logger.warning(
            f"{len(validation_rows)} divergences logged to {VALIDATION_LOG}"
        )
    else:
        logger.info("No significant divergences detected.")

    logger.info(
        f"Done. Updated {updated} municipalities "
        f"({matched_mb} matched to MapBiomas data, "
        f"{updated - matched_mb} used BMP-only fallback)."
    )


if __name__ == "__main__":
    main()
