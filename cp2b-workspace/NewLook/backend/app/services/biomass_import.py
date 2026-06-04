"""
Direct biomass import from the authoritative per-municipality tonnage table.

The biomass availability map must show REAL available-biomass tonnage, not values
reverse-derived from biogas. This module maps the master residue-streams table
(CP2B_HANDOFF/01_master_residue_streams_SP_2023.csv, column `residue_tons_yr`)
onto the municipality biomass columns, with sector and total roll-ups.

Pure functions only (no I/O) so the mapping is unit-testable; the loader script
(scripts/load_biomass_from_master.py) handles CSV reading and the database write.

Streams with authoritative tonnage in the master table:
    sugarcane, soybean, corn, coffee, citrus (agricultural),
    cattle, swine, poultry, aquaculture (livestock).
Streams WITHOUT tonnage in this table (carried as 0 here; supply later):
    rsu_organic, rpo_pruning (urban — pre-calculated as biogas only),
    forestry (no municipality biomass column).
"""

from __future__ import annotations

from typing import Iterable, Mapping

from app.services.biomass_availability import (
    RESIDUE_BIOMASS_CONFIGS,
    SECTOR_FIELDS,
    number_value,
)

# Master-CSV stream key → canonical residue key used by the municipality columns.
# forestry has no biomass column and is intentionally excluded.
STREAM_TO_RESIDUE_KEY: dict[str, str] = {
    "sugarcane": "sugarcane",
    "soybean": "soybean",
    "corn": "corn",
    "coffee": "coffee",
    "citrus": "citrus",
    "cattle": "cattle",
    "swine": "swine",
    "poultry": "poultry",
    "aquaculture": "aquaculture",
    "rsu_organic": "rsu",
    "rpo_pruning": "rpo",
}

# Streams present in the master table that have no per-municipality biomass column.
UNMAPPED_STREAMS = frozenset({"forestry"})

_CONFIG_BY_KEY = {c.key: c for c in RESIDUE_BIOMASS_CONFIGS}
_RESIDUE_KEYS = tuple(c.key for c in RESIDUE_BIOMASS_CONFIGS)


def empty_biomass_record() -> dict[str, float]:
    """A municipality biomass record with all residue/sector/total fields at 0."""
    rec: dict[str, float] = {c.biomass_field: 0.0 for c in RESIDUE_BIOMASS_CONFIGS}
    for field in SECTOR_FIELDS.values():
        rec[field] = 0.0
    rec["total_biomass_tons_year"] = 0.0
    return rec


def roll_up(record: dict[str, float]) -> dict[str, float]:
    """Recompute sector totals and grand total from per-residue biomass fields."""
    sector_totals = {sector: 0.0 for sector in SECTOR_FIELDS}
    for cfg in RESIDUE_BIOMASS_CONFIGS:
        sector_totals[cfg.sector] += record.get(cfg.biomass_field, 0.0)
    for sector, field in SECTOR_FIELDS.items():
        record[field] = round(sector_totals[sector], 2)
    record["total_biomass_tons_year"] = round(sum(sector_totals.values()), 2)
    return record


def build_municipality_biomass(
    rows: Iterable[Mapping[str, object]],
    *,
    ibge_field: str = "ibge_code",
    stream_field: str = "residue_stream",
    tons_field: str = "residue_tons_yr",
) -> dict[str, dict[str, float]]:
    """Aggregate master-CSV rows into per-municipality biomass records.

    Returns {ibge_code: {<residue>_biomass_tons_year: tons, ...sector totals,
    total_biomass_tons_year}}. Multiple rows for the same municipality+stream are
    summed. Unknown/unmapped streams (e.g. forestry) are ignored.
    """
    out: dict[str, dict[str, float]] = {}
    for row in rows:
        ibge = str(row.get(ibge_field, "")).strip()
        stream = str(row.get(stream_field, "")).strip()
        if not ibge or stream in UNMAPPED_STREAMS:
            continue
        key = STREAM_TO_RESIDUE_KEY.get(stream)
        if key is None:
            continue
        tons = number_value(row.get(tons_field))
        if tons <= 0:
            # still ensure the municipality exists in output with zeros
            out.setdefault(ibge, empty_biomass_record())
            continue
        rec = out.setdefault(ibge, empty_biomass_record())
        rec[_CONFIG_BY_KEY[key].biomass_field] += tons

    for rec in out.values():
        roll_up(rec)
    return out
