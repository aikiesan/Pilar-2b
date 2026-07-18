"""
4-metric × 3-scenario forward biogas potential for the municipality map layer.

Computes for each municipality DB row (from the municipalities table):

  metric 1 — biomass_gross        : raw available biomass (t/yr)
  metric 2 — biomass_corrected    : mobilisable biomass (t/yr × FDE_availability)
  metric 3 — biogas_ch4_m3        : CH4 production potential (m³/yr)
  metric 4 — biomethane_m3        : upgraded biomethane (m³/yr × upgrading efficiency)

Each metric expressed as {"min": ..., "medio": ..., "max": ...} uncertainty envelope.

Stream routing:
  Agricultural streams use the forward calculation from stored biomass tonnage
  ({stream}_biomass_tons_year from load_biomass_from_master.py).

  Livestock streams have biomass=0 until generation coefficients are applied by
  load_biomass_from_master.py. When biomass=0 but legacy biogas is stored, the
  service uses stored biogas as the practical medio estimate with ±30% envelope
  derived from the canonical parameter uncertainty range.

  Urban streams follow the same fallback as livestock.

This module is I/O-free; all external calls are to the canonical loader and
forward engine which are already unit-tested and side-effect free.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from app.services.biogas_forward import (
    SCENARIOS,
    BiogasResult,
    FeedstockParams,
    calculate_feedstock,
)
from app.services.biomass_availability import number_value

UPGRADING_EFFICIENCY: float = 0.97  # membrane / PSA biomethane upgrading

# Streams with authoritative biomass tonnage loaded from master CSV (agricultural)
AGRI_STREAMS: tuple[str, ...] = ("sugarcane", "soybean", "corn", "coffee", "citrus")
# Streams with head count in master CSV — biomass requires generation coefficient
LIVESTOCK_STREAMS: tuple[str, ...] = ("cattle", "swine", "poultry", "aquaculture")
# Streams that are population-derived
URBAN_STREAMS: tuple[str, ...] = ("rsu", "rpo")

ALL_STREAMS: tuple[str, ...] = AGRI_STREAMS + LIVESTOCK_STREAMS + URBAN_STREAMS


@dataclass
class StreamMetrics:
    """Per-scenario metrics for a single feedstock stream at one municipality."""

    stream: str
    has_biomass: bool  # True when authoritative biomass data is available
    biomass_gross: float  # t/yr (single value; measured input)
    biomass_corrected: dict[str, float]  # t/yr per scenario (× availability)
    biogas_ch4_m3: dict[str, float]  # m³/yr per scenario
    biomethane_m3: dict[str, float]  # m³/yr per scenario


@dataclass
class MunicipalityMapMetrics:
    """All 4-metric × 3-scenario metrics for one municipality."""

    ibge_code: str
    streams: dict[str, StreamMetrics] = field(default_factory=dict)
    # Municipality-level totals (sum across streams, per scenario)
    biomass_gross_total: float = 0.0
    biomass_corrected_total: dict[str, float] = field(
        default_factory=lambda: {sc: 0.0 for sc in SCENARIOS}
    )
    biogas_ch4_total: dict[str, float] = field(
        default_factory=lambda: {sc: 0.0 for sc in SCENARIOS}
    )
    biomethane_total: dict[str, float] = field(
        default_factory=lambda: {sc: 0.0 for sc in SCENARIOS}
    )

    def to_flat_dict(self) -> dict[str, Any]:
        """Flatten to property dict suitable for GeoJSON feature properties."""
        out: dict[str, Any] = {
            "biomass_gross_total_tons_yr": round(self.biomass_gross_total, 2),
        }
        for sc in SCENARIOS:
            out[f"biomass_corrected_{sc}_tons_yr"] = round(self.biomass_corrected_total[sc], 2)
            out[f"biogas_ch4_{sc}_m3_yr"] = round(self.biogas_ch4_total[sc], 2)
            out[f"biomethane_{sc}_m3_yr"] = round(self.biomethane_total[sc], 2)
        # Derived: biogas (total, not just CH4) using stream-weighted CH4 fraction
        # Expose CH4 as canonical metric; biogas_total available via /CH4_pct
        return out


def _zero_scenario_dict() -> dict[str, float]:
    return {sc: 0.0 for sc in SCENARIOS}


def _biomethane_from_ch4(ch4_dict: dict[str, float]) -> dict[str, float]:
    return {sc: ch4_dict[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}


def _compute_from_biomass(
    biomass_tons: float,
    params: FeedstockParams,
) -> tuple[dict[str, float], dict[str, float], dict[str, float]]:
    """Full forward calculation from authoritative biomass tonnage.

    Returns (biomass_corrected, biogas_ch4_m3, biomethane_m3) each as scenario dicts.
    """
    result: BiogasResult = calculate_feedstock(biomass_tons, params)
    biomass_corrected = {
        sc: round(biomass_tons * params.availability.get(sc), 2) for sc in SCENARIOS
    }
    biomethane = _biomethane_from_ch4(result.ch4_practical_m3)
    return biomass_corrected, result.ch4_practical_m3, biomethane


def _compute_from_stored_biogas(
    biogas_m3: float,
    params: FeedstockParams,
) -> tuple[float, dict[str, float], dict[str, float], dict[str, float]]:
    """Derive metrics when only legacy stored biogas is available (no biomass tonnage).

    Uses the stored biogas as the MEDIO practical estimate. The min/max envelope
    is constructed by applying the ratio of (min/max FDE) to (medio FDE), so that
    the scenario band reflects the canonical parameter uncertainty range.

    Returns (biomass_gross, biomass_corrected, biogas_ch4_m3, biomethane_m3).
    """
    ch4_medio = biogas_m3 * (params.ch4_pct / 100.0)

    # Scenario envelope: scale from medio by FDE ratio
    fde_m = params.fde.medio if params.fde.medio > 0 else 1.0
    ratio_min = params.fde.min / fde_m
    ratio_max = params.fde.max / fde_m
    ch4_ch4: dict[str, float] = {
        "min": round(ch4_medio * ratio_min, 2),
        "medio": round(ch4_medio, 2),
        "max": round(ch4_medio * ratio_max, 2),
    }
    biomethane = _biomethane_from_ch4(ch4_ch4)

    # Reverse-derive gross biomass from median values for display
    vs_wet = (params.ts.medio / 100.0) * (params.vs_of_ts.medio / 100.0)
    if params.bmp.medio > 0 and vs_wet > 0 and params.fde.medio > 0:
        biomass_gross = ch4_medio / (params.bmp.medio * vs_wet * params.fde.medio)
    else:
        biomass_gross = 0.0

    biomass_corrected: dict[str, float] = {
        "min": round(biomass_gross * params.availability.min, 2),
        "medio": round(biomass_gross * params.availability.medio, 2),
        "max": round(biomass_gross * params.availability.max, 2),
    }

    return round(biomass_gross, 2), biomass_corrected, ch4_ch4, biomethane


def compute_stream_metrics(
    stream: str,
    row: Mapping[str, Any],
    params: FeedstockParams,
    *,
    biomass_override: float | None = None,
) -> StreamMetrics | None:
    """Compute metrics for one stream at one municipality.

    Returns None if no data (both biomass and biogas are absent/zero).

    `biomass_override` supplies tonnage that is not in a stored column — livestock
    and urban, whose columns hold head counts/are empty. When given, it is used as
    the gross biomass instead of the column, so biogas potential is computed from
    real tonnage rather than a head count read as tonnes. See the endpoint's
    _derive_activity_biomass / canonical_loader.biomass_tons_from_units.
    """
    biomass_field = f"{stream}_biomass_tons_year"
    biogas_field = f"{stream}_biogas_m3_year"

    if biomass_override is not None:
        biomass_tons = biomass_override
    else:
        biomass_tons = number_value(row.get(biomass_field))
    biogas_m3 = number_value(row.get(biogas_field))

    if biomass_tons <= 0 and biogas_m3 <= 0:
        return None

    if biomass_tons > 0:
        biomass_corrected, ch4, biomethane = _compute_from_biomass(biomass_tons, params)
        return StreamMetrics(
            stream=stream,
            has_biomass=True,
            biomass_gross=round(biomass_tons, 2),
            biomass_corrected=biomass_corrected,
            biogas_ch4_m3=ch4,
            biomethane_m3=biomethane,
        )
    else:
        biomass_gross, biomass_corrected, ch4, biomethane = _compute_from_stored_biogas(
            biogas_m3, params
        )
        return StreamMetrics(
            stream=stream,
            has_biomass=False,
            biomass_gross=biomass_gross,
            biomass_corrected=biomass_corrected,
            biogas_ch4_m3=ch4,
            biomethane_m3=biomethane,
        )


def compute_municipality_map_metrics(
    row: Mapping[str, Any],
    *,
    ibge_code: str = "",
    streams: tuple[str, ...] = ALL_STREAMS,
    derived_tons: Mapping[str, float] | None = None,
) -> MunicipalityMapMetrics:
    """Compute 4-metric × 3-scenario metrics for all streams at one municipality.

    `derived_tons` maps stream -> gross tonnage for streams not held in a stored
    column (livestock from head counts, urban from population). Passing it makes
    biogas potential national and correct; without it, livestock streams fall back
    to their columns, which hold head counts and yield inflated biogas.

    Lazy-imports canonical loader to keep this module lightweight and testable
    without requiring the YAML file to be present in all environments.
    """
    from app.services.canonical_loader import get_params_for_stream

    derived_tons = derived_tons or {}
    metrics = MunicipalityMapMetrics(ibge_code=ibge_code)

    for stream in streams:
        try:
            params = get_params_for_stream(stream)
        except KeyError:
            continue  # stream has no canonical mapping (e.g. aquaculture placeholder)

        sm = compute_stream_metrics(stream, row, params, biomass_override=derived_tons.get(stream))
        if sm is None:
            continue

        metrics.streams[stream] = sm
        metrics.biomass_gross_total += sm.biomass_gross
        for sc in SCENARIOS:
            metrics.biomass_corrected_total[sc] += sm.biomass_corrected[sc]
            metrics.biogas_ch4_total[sc] += sm.biogas_ch4_m3[sc]
            metrics.biomethane_total[sc] += sm.biomethane_m3[sc]

    # Round totals
    metrics.biomass_gross_total = round(metrics.biomass_gross_total, 2)
    for sc in SCENARIOS:
        metrics.biomass_corrected_total[sc] = round(metrics.biomass_corrected_total[sc], 2)
        metrics.biogas_ch4_total[sc] = round(metrics.biogas_ch4_total[sc], 2)
        metrics.biomethane_total[sc] = round(metrics.biomethane_total[sc], 2)

    return metrics
