"""
Backend source-of-truth helpers for municipality biomass availability.

The local database currently has non-zero per-residue biogas estimates but
zeroed biomass tonnage columns. These helpers preserve any populated biomass
columns and derive a documented fallback from biogas using reverse-BMP factors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping


@dataclass(frozen=True)
class ResidueBiomassConfig:
    key: str
    sector: str
    biomass_field: str
    biogas_field: str
    bmp: float
    vs_percent: float


# Factors mirror backend/scripts/load_biomass_tons.py. Agricultural values are
# representative averages because the current municipality columns aggregate
# multiple residue streams per crop.
RESIDUE_BIOMASS_CONFIGS: tuple[ResidueBiomassConfig, ...] = (
    ResidueBiomassConfig("sugarcane", "agricultural", "sugarcane_biomass_tons_year", "sugarcane_biogas_m3_year", 210.0, 77.0),
    ResidueBiomassConfig("soybean", "agricultural", "soybean_biomass_tons_year", "soybean_biogas_m3_year", 180.0, 84.0),
    ResidueBiomassConfig("corn", "agricultural", "corn_biomass_tons_year", "corn_biogas_m3_year", 280.0, 77.0),
    ResidueBiomassConfig("coffee", "agricultural", "coffee_biomass_tons_year", "coffee_biogas_m3_year", 350.0, 89.0),
    ResidueBiomassConfig("citrus", "agricultural", "citrus_biomass_tons_year", "citrus_biogas_m3_year", 300.0, 20.0),
    ResidueBiomassConfig("cattle", "livestock", "cattle_biomass_tons_year", "cattle_biogas_m3_year", 210.0, 12.5),
    ResidueBiomassConfig("swine", "livestock", "swine_biomass_tons_year", "swine_biogas_m3_year", 210.0, 3.5),
    ResidueBiomassConfig("poultry", "livestock", "poultry_biomass_tons_year", "poultry_biogas_m3_year", 270.0, 50.0),
    ResidueBiomassConfig("aquaculture", "livestock", "aquaculture_biomass_tons_year", "aquaculture_biogas_m3_year", 200.0, 15.0),
    ResidueBiomassConfig("rsu", "urban", "rsu_biomass_tons_year", "rsu_biogas_m3_year", 410.0, 17.0),
    ResidueBiomassConfig("rpo", "urban", "rpo_biomass_tons_year", "rpo_biogas_m3_year", 210.0, 3.1),
)

RESIDUE_KEYS = tuple(config.key for config in RESIDUE_BIOMASS_CONFIGS)
BIOMASS_FIELDS = tuple(config.biomass_field for config in RESIDUE_BIOMASS_CONFIGS)
BIOGAS_FIELDS = tuple(config.biogas_field for config in RESIDUE_BIOMASS_CONFIGS)
SECTOR_FIELDS = {
    "agricultural": "agricultural_biomass_tons_year",
    "livestock": "livestock_biomass_tons_year",
    "urban": "urban_biomass_tons_year",
}

_CONFIG_BY_KEY = {config.key: config for config in RESIDUE_BIOMASS_CONFIGS}


def number_value(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed == parsed else 0.0


def reverse_bmp_tons(biogas_m3: float, bmp: float, vs_percent: float) -> float:
    denominator = bmp * (vs_percent / 100.0)
    if denominator <= 0 or biogas_m3 <= 0:
        return 0.0
    return biogas_m3 / denominator


def get_residue_biomass_tons(row: Mapping[str, Any], residue_key: str) -> float:
    config = _CONFIG_BY_KEY[residue_key]
    stored = number_value(row.get(config.biomass_field))
    if stored > 0:
        return stored
    return reverse_bmp_tons(
        number_value(row.get(config.biogas_field)),
        config.bmp,
        config.vs_percent,
    )


def derive_biomass_fields(row: Mapping[str, Any]) -> dict[str, float]:
    """Return per-residue, sector, and total biomass fields for one row."""
    residue_values: dict[str, float] = {}
    sector_totals = {sector: 0.0 for sector in SECTOR_FIELDS}

    for config in RESIDUE_BIOMASS_CONFIGS:
        value = round(get_residue_biomass_tons(row, config.key), 2)
        residue_values[config.biomass_field] = value
        sector_totals[config.sector] += value

    derived: dict[str, float] = dict(residue_values)
    for sector, field in SECTOR_FIELDS.items():
        stored = number_value(row.get(field))
        derived[field] = round(stored if stored > 0 else sector_totals[sector], 2)

    stored_total = number_value(row.get("total_biomass_tons_year"))
    total = stored_total if stored_total > 0 else sum(derived[field] for field in SECTOR_FIELDS.values())
    derived["total_biomass_tons_year"] = round(total, 2)
    return derived


def biomass_select_columns(table_alias: str | None = None) -> str:
    """SQL select column list required by derive_biomass_fields."""
    prefix = f"{table_alias}." if table_alias else ""
    columns: Iterable[str] = (
        "total_biomass_tons_year",
        *SECTOR_FIELDS.values(),
        *BIOMASS_FIELDS,
        *BIOGAS_FIELDS,
    )
    return ", ".join(f"{prefix}{column}" for column in columns)
