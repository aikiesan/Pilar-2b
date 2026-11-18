"""
Backend source-of-truth helpers for municipality biomass availability.

The local database currently has non-zero per-residue biogas estimates but
zeroed biomass tonnage columns. These helpers preserve any populated biomass
columns and derive a documented fallback from biogas using reverse-BMP factors.

VS basis: all vs_percent values below are on a WET WEIGHT basis (g VS / 100 g
wet biomass), NOT percent-of-TS. The reverse-BMP formula is:
    biomass_wet_tons = biogas_m3 / (BMP_NmL_gVS × vs_percent_wet / 100)
This is consistent with load_biomass_tons.py but differs from the SQL residuos
table, where vs_medio represents VS as % of TS (dry-weight basis).
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


# All values generated from data/canonical_parameters/feedstocks.yaml via
# scripts/generate_from_canonical.py. BMP in NmL CH₄/gVS (dry-weight VS basis).
# vs_percent = VS % wet weight = ts_medio × vs_of_ts_medio / 100 (see module docstring).
# Re-run the generator after editing feedstocks.yaml — do NOT edit these values directly.
#
# Primary DOI per feedstock:
#   sugarcane: https://doi.org/10.1016/j.indcrop.2021.113498
#     (Paulose et al. 2021; BMP 187.9→165 practical)
#   soybean:   https://doi.org/10.1016/j.wasman.2015.10.021   (Kafle & Chen 2016)
#   corn:      https://doi.org/10.1016/j.biortech.2011.12.074 (Herrmann et al. 2012)
#   coffee:    https://doi.org/10.1016/j.biteb.2021.100830    (Okonkwo et al. 2021)
#   citrus:    https://doi.org/10.1016/j.biortech.2014.07.074 (Wikandari et al. 2014)
#   cattle:    https://doi.org/10.1016/j.biortech.2006.07.016 (Amon et al. 2007)
#   swine:     https://doi.org/10.2134/jeq2004.0027           (Møller et al. 2004)
#   poultry:   https://doi.org/10.1016/j.wasman.2013.10.001   (Abouelenien et al. 2014)
#   rsu/FORSU: https://doi.org/10.1016/j.biortech.2014.03.077 (Mata-Alvarez et al. 2014)
#   rpo/lodo:  https://doi.org/10.1016/j.wasman.2019.04.025   (Heerenklage et al. 2019)
RESIDUE_BIOMASS_CONFIGS: tuple[ResidueBiomassConfig, ...] = (
    # sugarcane: BAGACO representative (bmp=165); vs_wet = 58.9×90/100 = 53.0%
    # BMP raised from 115 to 165 NmL/gVS per Paulose et al. 2021 (187.9 untreated mesophilic)
    ResidueBiomassConfig(
        "sugarcane",
        "agricultural",
        "sugarcane_biomass_tons_year",
        "sugarcane_biogas_m3_year",
        165.0,
        53.0,
    ),
    # soybean: PALHA_SOJA representative (bmp=220, Kafle 2016); vs_wet = 84×85/100 = 71.4%
    # MAPPING FIX 2026-06: CSV stream is field straw (PALHA_SOJA), NOT processing hull.
    ResidueBiomassConfig(
        "soybean",
        "agricultural",
        "soybean_biomass_tons_year",
        "soybean_biogas_m3_year",
        220.0,
        71.4,
    ),
    # corn: PALHA_MILHO (bmp=230); vs_wet = 82×86/100 = 70.5%
    ResidueBiomassConfig(
        "corn", "agricultural", "corn_biomass_tons_year", "corn_biogas_m3_year", 230.0, 70.5
    ),
    # coffee: CASCA_CAFE (bmp=165, corpus-revised 2026-06); vs_wet = 88×93/100 = 81.8%
    ResidueBiomassConfig(
        "coffee", "agricultural", "coffee_biomass_tons_year", "coffee_biogas_m3_year", 165.0, 81.8
    ),
    # citrus: BAGACO_CITROS (bmp=230); vs_wet = 18×88/100 = 15.8%
    ResidueBiomassConfig(
        "citrus", "agricultural", "citrus_biomass_tons_year", "citrus_biogas_m3_year", 230.0, 15.8
    ),
    # cattle: ESTERCO_BOVINO (bmp=200); vs_wet = 25×78/100 = 19.5%
    ResidueBiomassConfig(
        "cattle", "livestock", "cattle_biomass_tons_year", "cattle_biogas_m3_year", 200.0, 19.5
    ),
    # swine: DEJETOS_SUINO liquid (bmp=245, corpus-revised 2026-06); vs_wet = 3×80/100 = 2.4%
    ResidueBiomassConfig(
        "swine", "livestock", "swine_biomass_tons_year", "swine_biogas_m3_year", 245.0, 2.4
    ),
    # poultry: CAMA_AVIARIO (bmp=280); vs_wet = 25×69.8/100 = 17.5%
    ResidueBiomassConfig(
        "poultry", "livestock", "poultry_biomass_tons_year", "poultry_biogas_m3_year", 280.0, 17.5
    ),
    # aquaculture: not yet in canonical YAML; placeholder retained
    ResidueBiomassConfig(
        "aquaculture",
        "livestock",
        "aquaculture_biomass_tons_year",
        "aquaculture_biogas_m3_year",
        200.0,
        15.0,
    ),
    # rsu/FORSU: bmp=360 (corpus-revised 2026-06; was 310); vs_wet = 30.58×85/100 = 26.0%
    ResidueBiomassConfig(
        "rsu", "urban", "rsu_biomass_tons_year", "rsu_biogas_m3_year", 360.0, 26.0
    ),
    # rpo/poda urbana: bmp=175 (Pognani 2011); vs_wet = 55×87/100 = 47.85%
    # MAPPING FIX 2026-06: rpo is urban pruning waste (PODA_URBANA), NOT sewage sludge.
    ResidueBiomassConfig(
        "rpo", "urban", "rpo_biomass_tons_year", "rpo_biogas_m3_year", 175.0, 47.85
    ),
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


# Coverage of one stream at one municipality. Mirrors the `quality` vocabulary of
# municipality_timeseries / municipality_biomass_provenance, plus NO_DATA, which
# is not a quality but the absence of a provenance row.
COVERAGE_NO_DATA = "no_data"
# Aggregates only: some contributing streams are known and some are not, so the
# sum is a floor rather than a total. Never let this render as an ordinary value.
COVERAGE_PARTIAL = "partial"


def raw_value(value: Any) -> float | None:
    """Parse to float, preserving the difference between absent and zero.

    number_value() collapses None and 0 to the same 0.0. That is exactly what
    makes a municipality we never loaded indistinguishable from one that
    genuinely has no biomass — 5,059 municipalities carry a seeded 0 for
    sugarcane and only 133 of those zeros are real. Use this wherever the
    distinction matters; use number_value() where a float is genuinely wanted.
    """
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed == parsed else None  # NaN is not a measurement


def reverse_bmp_tons(biogas_m3: float, bmp: float, vs_percent: float) -> float:
    denominator = bmp * (vs_percent / 100.0)
    if denominator <= 0 or biogas_m3 <= 0:
        return 0.0
    return biogas_m3 / denominator


def get_residue_biomass_tons(
    row: Mapping[str, Any],
    residue_key: str,
    *,
    allow_reverse_fallback: bool = True,
) -> float:
    """Return stored per-residue biomass tonnage.

    With authoritative biomass loaded (scripts/load_biomass_from_master.py),
    stored values are the source of record. When `allow_reverse_fallback` is
    False, NO biogas→biomass back-calculation is performed and a missing value
    returns 0.0 (the biomass availability map shows only measured data).
    """
    config = _CONFIG_BY_KEY[residue_key]
    stored = number_value(row.get(config.biomass_field))
    if stored > 0:
        return stored
    if not allow_reverse_fallback:
        return 0.0
    return reverse_bmp_tons(
        number_value(row.get(config.biogas_field)),
        config.bmp,
        config.vs_percent,
    )


def derive_biomass_fields(
    row: Mapping[str, Any],
    *,
    allow_reverse_fallback: bool = True,
) -> dict[str, float]:
    """Return per-residue, sector, and total biomass fields for one row.

    Set `allow_reverse_fallback=False` once authoritative biomass tonnage is
    loaded so the map uses real data only (no reverse-BMP back-calculation)."""
    residue_values: dict[str, float] = {}
    sector_totals = {sector: 0.0 for sector in SECTOR_FIELDS}

    for config in RESIDUE_BIOMASS_CONFIGS:
        value = round(
            get_residue_biomass_tons(
                row, config.key, allow_reverse_fallback=allow_reverse_fallback
            ),
            2,
        )
        residue_values[config.biomass_field] = value
        sector_totals[config.sector] += value

    derived: dict[str, float] = dict(residue_values)
    for sector, field in SECTOR_FIELDS.items():
        stored = number_value(row.get(field))
        derived[field] = round(stored if stored > 0 else sector_totals[sector], 2)

    stored_total = number_value(row.get("total_biomass_tons_year"))
    total = (
        stored_total
        if stored_total > 0
        else sum(derived[field] for field in SECTOR_FIELDS.values())
    )
    derived["total_biomass_tons_year"] = round(total, 2)
    return derived


def _aggregate_coverage(coverages: Iterable[str]) -> str:
    """Coverage of a sum, from the coverage of its parts.

    `partial` is the load-bearing state: a total built from some known and some
    unknown streams is a floor, not a total. Outside São Paulo the agricultural
    sector is entirely no_data while livestock may be known, so the biomass
    TOTAL there is partial — and must never be painted as though it were the
    whole picture, because the missing part is ~77% of it.
    """
    seen = list(coverages)
    if not seen or all(c == COVERAGE_NO_DATA for c in seen):
        return COVERAGE_NO_DATA
    if any(c == COVERAGE_NO_DATA for c in seen):
        return COVERAGE_PARTIAL
    if any(c != "measured" for c in seen):
        return next(c for c in seen if c != "measured")
    return "measured"


def derive_biomass_with_coverage(
    row: Mapping[str, Any],
    *,
    provenance: Mapping[str, str],
    derived_tons: Mapping[str, float] | None = None,
    allow_reverse_fallback: bool = False,
) -> dict[str, Any]:
    """Per-residue/sector/total biomass, each paired with an explicit coverage.

    `provenance` maps stream key -> quality ('measured', 'estimated', ...) and
    comes from municipality_biomass_provenance. A stream absent from it is
    no_data, and its value is emitted as None — never 0.0. This is the whole
    point: the stored column cannot tell us, because every unloaded municipality
    was seeded with 0 (see migration 025).

    `derived_tons` supplies tonnage that is NOT in a stored column, keyed by
    stream. Livestock and urban tonnage live nowhere in `municipalities` — the
    {cattle,swine,poultry}_biomass_tons_year columns hold IBGE head COUNTS, not
    tonnes — so the endpoint computes them from PPM head counts / population via
    canonical_loader.biomass_tons_from_units() and passes them here. When a
    stream is present in `derived_tons`, that value is authoritative and the
    stored column is ignored; its coverage must come from `provenance` as usual.

    `allow_reverse_fallback` back-calculates tonnage from legacy biogas for
    streams with no provenance, tagging them 'estimated'. Off by default: for an
    availability map, an invented tonnage is worse than an honest gap.
    """
    derived_tons = derived_tons or {}
    values: dict[str, float | None] = {}
    coverage: dict[str, str] = {}
    by_sector: dict[str, list[str]] = {sector: [] for sector in SECTOR_FIELDS}

    for config in RESIDUE_BIOMASS_CONFIGS:
        quality = provenance.get(config.key)
        if config.key in derived_tons:
            stored: float | None = raw_value(derived_tons[config.key])
        else:
            stored = raw_value(row.get(config.biomass_field))

        if quality is not None and stored is not None:
            value, cov = round(stored, 2), quality
        elif allow_reverse_fallback:
            biogas = raw_value(row.get(config.biogas_field))
            if biogas is not None and biogas > 0:
                value = round(reverse_bmp_tons(biogas, config.bmp, config.vs_percent), 2)
                cov = "estimated"
            else:
                value, cov = None, COVERAGE_NO_DATA
        else:
            value, cov = None, COVERAGE_NO_DATA

        values[config.biomass_field] = value
        coverage[config.key] = cov
        by_sector[config.sector].append(cov)

    derived: dict[str, Any] = dict(values)
    for key, cov in coverage.items():
        derived[f"{key}_biomass_coverage"] = cov

    sector_totals: dict[str, float | None] = {}
    for sector, field in SECTOR_FIELDS.items():
        members = [c for c in RESIDUE_BIOMASS_CONFIGS if c.sector == sector]
        known = [values[m.biomass_field] for m in members if values[m.biomass_field] is not None]
        cov = _aggregate_coverage(by_sector[sector])
        total = round(sum(known), 2) if known else None
        derived[field] = total
        derived[f"{sector}_biomass_coverage"] = cov
        sector_totals[sector] = total

    known_totals = [t for t in sector_totals.values() if t is not None]
    derived["total_biomass_tons_year"] = round(sum(known_totals), 2) if known_totals else None
    derived["total_biomass_coverage"] = _aggregate_coverage(coverage.values())
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
