"""
Direct biomass import from the authoritative per-municipality tonnage table.

The biomass availability map must show REAL available-biomass tonnage, not values
reverse-derived from biogas. This module maps the master residue-streams table
(analysis/data/01_master_residue_streams_SP_2023.csv, column `residue_tons_yr`)
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

# IMPORTANT — the master CSV `residue_tons_yr` column is OVERLOADED by sector:
#   * agricultural streams : tonnes of residue per year   (direct biomass tonnage)
#   * livestock streams    : ANIMAL HEAD COUNT            (NOT tonnage!)
#                            (verified: biogas = head × cf, cf in m³/head/yr)
#   * urban streams        : 0  (biogas pre-calculated; biomass is population-derived)
# Therefore only agricultural streams can be mapped to biomass tonnage directly.
# Livestock tonnage = head × manure_generation (t/head/yr); urban tonnage =
# population × per-capita generation (t/cap/yr). Those coefficients are supplied
# via generation_coeffs to avoid silently storing head counts as tonnes.

AGRICULTURAL_STREAM_TO_KEY: dict[str, str] = {
    "sugarcane": "sugarcane",
    "soybean": "soybean",
    "corn": "corn",
    "coffee": "coffee",
    "citrus": "citrus",
}

# Livestock streams: residue_tons_yr is HEAD COUNT. key → residue column key.
LIVESTOCK_STREAM_TO_KEY: dict[str, str] = {
    "cattle": "cattle",
    "swine": "swine",
    "poultry": "poultry",
    "aquaculture": "aquaculture",
}

# Urban streams: tonnage is population-derived. key → residue column key.
URBAN_STREAM_TO_KEY: dict[str, str] = {
    "rsu_organic": "rsu",
    "rpo_pruning": "rpo",
}

# Backwards-compatible full mapping (used only where a residue key is needed).
STREAM_TO_RESIDUE_KEY: dict[str, str] = {
    **AGRICULTURAL_STREAM_TO_KEY,
    **LIVESTOCK_STREAM_TO_KEY,
    **URBAN_STREAM_TO_KEY,
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
    population_field: str = "populacao_2022",
    livestock_t_per_head: Mapping[str, float] | None = None,
    urban_t_per_capita: Mapping[str, float] | None = None,
) -> dict[str, dict[str, float]]:
    """Aggregate master-CSV rows into per-municipality biomass TONNAGE records.

    - Agricultural streams: residue_tons_yr is used directly (tonnes).
    - Livestock streams: residue_tons_yr is HEAD COUNT → tonnes only if
      `livestock_t_per_head[key]` (t manure/head/yr) is provided; otherwise 0
      (we never store head counts as tonnes).
    - Urban streams: tonnes = population × `urban_t_per_capita[key]` (t/cap/yr)
      if provided; otherwise 0.

    Returns {ibge_code: {<residue>_biomass_tons_year, sector totals, total}}.
    """
    livestock_t_per_head = livestock_t_per_head or {}
    urban_t_per_capita = urban_t_per_capita or {}
    out: dict[str, dict[str, float]] = {}
    pop_by_ibge: dict[str, float] = {}
    urban_added: set[tuple[str, str]] = set()

    for row in rows:
        ibge = str(row.get(ibge_field, "")).strip()
        stream = str(row.get(stream_field, "")).strip()
        if not ibge or stream in UNMAPPED_STREAMS:
            continue
        rec = out.setdefault(ibge, empty_biomass_record())
        pop_by_ibge.setdefault(ibge, number_value(row.get(population_field)))
        raw = number_value(row.get(tons_field))

        if stream in AGRICULTURAL_STREAM_TO_KEY:
            key = AGRICULTURAL_STREAM_TO_KEY[stream]
            if raw > 0:
                rec[_CONFIG_BY_KEY[key].biomass_field] += raw  # raw is tonnes
        elif stream in LIVESTOCK_STREAM_TO_KEY:
            key = LIVESTOCK_STREAM_TO_KEY[stream]
            coeff = livestock_t_per_head.get(key, 0.0)  # t manure/head/yr
            if raw > 0 and coeff > 0:
                rec[_CONFIG_BY_KEY[key].biomass_field] += raw * coeff  # head × t/head
        elif stream in URBAN_STREAM_TO_KEY:
            key = URBAN_STREAM_TO_KEY[stream]
            coeff = urban_t_per_capita.get(key, 0.0)  # t/cap/yr
            pop = pop_by_ibge.get(ibge, 0.0)
            # add once per municipality+stream to avoid double-counting on repeats
            if coeff > 0 and pop > 0 and (ibge, stream) not in urban_added:
                rec[_CONFIG_BY_KEY[key].biomass_field] += pop * coeff
                urban_added.add((ibge, stream))

    for rec in out.values():
        roll_up(rec)
    return out
