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
from app.services.canonical_loader import (
    biomass_tons_from_collected_waste,
    biomass_tons_from_units,
)
from app.services.biomass_availability import number_value
from app.services.energy_parameters import UPGRADING_EFFICIENCY

# Streams with authoritative biomass tonnage loaded from master CSV (agricultural)
AGRI_STREAMS: tuple[str, ...] = ("sugarcane", "soybean", "corn", "coffee", "citrus")
# Streams with head count in master CSV — biomass requires generation coefficient
LIVESTOCK_STREAMS: tuple[str, ...] = ("cattle", "swine", "poultry", "aquaculture")
# Streams that are population-derived
URBAN_STREAMS: tuple[str, ...] = ("rsu", "sludge_primary", "sludge_secondary")
URBAN_ACTIVITY_STREAMS: tuple[str, ...] = ("rsu",)
PPM_STREAMS: tuple[str, ...] = ("cattle", "swine", "poultry")

ACTIVITY_VARIABLES: dict[str, str] = {
    "bovino": "cattle",
    "suino_total": "swine",
    "galinaceos_total": "poultry",
    "populacao_total": "population",
    "rdo_coletado": "rdo_coletado",
}

ALL_STREAMS: tuple[str, ...] = AGRI_STREAMS + LIVESTOCK_STREAMS + URBAN_STREAMS

# Sector key -> its streams. Keys match the `{sector}_biomass_tons_year` columns
# and the panel's Agrícola/Pecuária/Urbano breakdown.
SECTOR_STREAMS: dict[str, tuple[str, ...]] = {
    "agricultural": AGRI_STREAMS,
    "livestock": LIVESTOCK_STREAMS,
    "urban": URBAN_STREAMS,
}


@dataclass
class StreamMetrics:
    """Per-scenario metrics for a single feedstock stream at one municipality."""

    stream: str
    has_biomass: bool  # True when authoritative biomass data is available
    biomass_gross: float  # t/yr (single value; measured input)
    biomass_corrected: dict[str, float]  # t/yr per scenario (× availability)
    # RAW BIOGAS vs METHANE ARE DIFFERENT QUANTITIES — keep them apart.
    # BMP is measured in NmL CH4/gVS, so the forward chain yields METHANE. Raw
    # biogas is that methane divided by the feedstock's CH4 fraction (52–72% in
    # the canonical corpus, median 57%), i.e. roughly 1.8x larger.
    # Conflating them made biomethane/"biogás" read 0.97 — a methane-recovery
    # figure wearing a biogas label — when the physically meaningful
    # biomethane/biogas ratio is ~0.53.
    biogas_m3: dict[str, float]  # m³/yr per scenario — RAW biogas (CH4 + CO2)
    biogas_ch4_m3: dict[str, float]  # m³/yr per scenario — methane only
    biomethane_m3: dict[str, float]  # m³/yr per scenario — upgraded methane


@dataclass
class MunicipalityMapMetrics:
    """All 4-metric × 3-scenario metrics for one municipality."""

    ibge_code: str
    streams: dict[str, StreamMetrics] = field(default_factory=dict)
    # Municipality-level totals (sum across streams, per scenario)
    biomass_gross_total: float = 0.0
    biomass_gross_total_by_scenario: dict[str, float] = field(
        default_factory=lambda: {sc: 0.0 for sc in SCENARIOS}
    )
    biomass_corrected_total: dict[str, float] = field(
        default_factory=lambda: {sc: 0.0 for sc in SCENARIOS}
    )
    biogas_total: dict[str, float] = field(default_factory=lambda: {sc: 0.0 for sc in SCENARIOS})
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
            out[f"biomass_gross_{sc}_tons_yr"] = round(
                self.biomass_gross_total_by_scenario[sc], 2
            )
            out[f"biomass_corrected_{sc}_tons_yr"] = round(self.biomass_corrected_total[sc], 2)
            out[f"biogas_{sc}_m3_yr"] = round(self.biogas_total[sc], 2)
            out[f"biogas_ch4_{sc}_m3_yr"] = round(self.biogas_ch4_total[sc], 2)
            out[f"biomethane_{sc}_m3_yr"] = round(self.biomethane_total[sc], 2)

        # Per-sector totals, so the municipality panel can break any metric down
        # by agrícola/pecuária/urbano without deriving anything client-side.
        #
        # Only biomass had a sector split before this, and it came from the legacy
        # `{sector}_biogas_m3_year` columns, which are populated for 645 São Paulo
        # municipalities and nobody else. Biomethane had no sector split at all and
        # bioenergy had none. The panel therefore either showed São Paulo-shaped
        # numbers or fell back to inventing them — the reverse-BMP class of bug
        # that #151 removed from the popup.
        #
        # Bioenergy is deliberately NOT emitted: it is biogas CH4 × a fixed
        # MWh/m³ factor, so serving it separately would duplicate a value that can
        # be converted exactly, and invite the two to drift.
        for sector, streams in SECTOR_STREAMS.items():
            members = [self.streams[s] for s in streams if s in self.streams]
            if not members:
                continue
            for sc in SCENARIOS:
                out[f"{sector}_biogas_{sc}_m3_yr"] = round(sum(m.biogas_m3[sc] for m in members), 2)
                out[f"{sector}_biogas_ch4_{sc}_m3_yr"] = round(
                    sum(m.biogas_ch4_m3[sc] for m in members), 2
                )
                out[f"{sector}_biomethane_{sc}_m3_yr"] = round(
                    sum(m.biomethane_m3[sc] for m in members), 2
                )
        return out

    def to_published_biogas_dict(self) -> dict[str, float]:
        """Compatibility fields backed by the same canonical calculation as the map.

        Older public surfaces still consume ``*_biogas_m3_year``.  Serving those
        names is safe only when their values are produced here, at request time;
        the identically named database columns are legacy snapshots (DEC-008).
        """
        out = {
            "total_biogas_m3_year": round(self.biogas_total["medio"], 2),
            "total_biogas_m3_day": round(self.biogas_total["medio"] / 365.0, 2),
        }
        for sector, streams in SECTOR_STREAMS.items():
            out[f"{sector}_biogas_m3_year"] = round(
                sum(self.streams[s].biogas_m3["medio"] for s in streams if s in self.streams),
                2,
            )
        for stream in ALL_STREAMS:
            metric = self.streams.get(stream)
            if metric is not None:
                out[f"{stream}_biogas_m3_year"] = round(metric.biogas_m3["medio"], 2)
        energy_mwh = self.biogas_ch4_total["medio"] * 0.00997
        out["energy_potential_mwh_year"] = round(energy_mwh, 2)
        out["energy_potential_kwh_day"] = round(energy_mwh * 1000.0 / 365.0, 2)
        out["co2_reduction_tons_year"] = round(energy_mwh * 0.4, 2)
        return out


def _zero_scenario_dict() -> dict[str, float]:
    return {sc: 0.0 for sc in SCENARIOS}


def _biomethane_from_ch4(ch4_dict: dict[str, float]) -> dict[str, float]:
    return {sc: ch4_dict[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}


def load_activity_counts(cursor: Any, ibge_codes: list[str]) -> dict[str, dict[str, float]]:
    """Load the latest activity drivers used by every canonical public surface."""
    if not ibge_codes:
        return {}
    cursor.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'municipality_timeseries'
        LIMIT 1
        """
    )
    if cursor.fetchone() is None:
        return {}
    cursor.execute(
        """
        SELECT DISTINCT ON (ibge_code, variable)
               ibge_code, variable, value
        FROM municipality_timeseries
        WHERE variable = ANY(%s)
          AND ibge_code = ANY(%s)
        ORDER BY ibge_code, variable, year DESC
        """,
        (list(ACTIVITY_VARIABLES), ibge_codes),
    )
    out: dict[str, dict[str, float]] = {}
    for row in cursor.fetchall():
        key = ACTIVITY_VARIABLES.get(row["variable"])
        if key and row["value"] is not None:
            out.setdefault(str(row["ibge_code"]), {})[key] = float(row["value"])
    return out


def derive_activity_biomass(
    *,
    head: Mapping[str, float],
    population: float | None,
    collected_waste: float | None = None,
) -> tuple[dict[str, float], dict[str, str]]:
    """Convert PPM/SNIS activity into canonical gross tonnage and provenance."""
    tons: dict[str, float] = {}
    provenance: dict[str, str] = {}
    for stream, count in head.items():
        tons[stream] = biomass_tons_from_units(stream, count).medio
        provenance[stream] = "estimated"

    if collected_waste is not None and collected_waste > 0:
        tons["rsu"] = biomass_tons_from_collected_waste("rsu", collected_waste).medio
        provenance["rsu"] = "measured"

    if population is not None and population > 0:
        for stream in URBAN_ACTIVITY_STREAMS:
            if stream not in tons:
                tons[stream] = biomass_tons_from_units(stream, population).medio
                provenance[stream] = "estimated"
    return tons, provenance


def compute_published_municipality_metrics(
    row: Mapping[str, Any],
    *,
    activity: Mapping[str, float] | None = None,
) -> MunicipalityMapMetrics:
    """Run the exact municipality pipeline used by the canonical batch script."""
    from app.services.canonical_municipality import (
        compute_canonical_municipality,
        load_snis_activity_snapshot,
    )

    code = str(row.get("ibge_code") or "")
    merged_activity = dict(load_snis_activity_snapshot().get(code, {}))
    merged_activity.update(activity or {})
    if not merged_activity.get("population_2022") and row.get("population"):
        merged_activity["population_2022"] = float(row["population"])
    canonical = compute_canonical_municipality(row, activity=merged_activity)
    metrics = MunicipalityMapMetrics(ibge_code=code)

    grouped: dict[str, list[Any]] = {}
    for feedstock in canonical.feedstocks.values():
        grouped.setdefault(feedstock.public_stream, []).append(feedstock)
    for stream, members in grouped.items():
        gross = sum(member.biomass_gross["medio"] for member in members)
        corrected = {
            scenario: sum(member.biomass_mobilizable[scenario] for member in members)
            for scenario in SCENARIOS
        }
        biogas = {
            scenario: sum(member.biogas[scenario] for member in members)
            for scenario in SCENARIOS
        }
        ch4 = {
            scenario: sum(member.ch4[scenario] for member in members)
            for scenario in SCENARIOS
        }
        biomethane = {
            scenario: sum(member.biomethane[scenario] for member in members)
            for scenario in SCENARIOS
        }
        metrics.streams[stream] = StreamMetrics(
            stream=stream,
            has_biomass=True,
            biomass_gross=gross,
            biomass_corrected=corrected,
            biogas_m3=biogas,
            biogas_ch4_m3=ch4,
            biomethane_m3=biomethane,
        )

    metrics.biomass_gross_total = canonical.totals["biomass_gross"]["medio"]
    metrics.biomass_gross_total_by_scenario = dict(canonical.totals["biomass_gross"])
    metrics.biomass_corrected_total = dict(canonical.totals["biomass_mobilizable"])
    metrics.biogas_total = dict(canonical.totals["biogas"])
    metrics.biogas_ch4_total = dict(canonical.totals["ch4"])
    metrics.biomethane_total = dict(canonical.totals["biomethane"])
    return metrics


def _compute_from_biomass(
    biomass_tons: float,
    params: FeedstockParams,
) -> tuple[dict[str, float], dict[str, float], dict[str, float], dict[str, float]]:
    """Full forward calculation from authoritative biomass tonnage.

    Returns (biomass_corrected, biogas_m3, biogas_ch4_m3, biomethane_m3), each a
    scenario dict. `biogas_practical_m3` was already computed here and thrown
    away; it is the raw biogas volume (CH4 + CO2), derived from the methane via
    the feedstock's own ch4_pct.
    """
    result: BiogasResult = calculate_feedstock(biomass_tons, params)
    biomass_corrected = {
        sc: round(biomass_tons * params.availability.get(sc), 2) for sc in SCENARIOS
    }
    biomethane = _biomethane_from_ch4(result.ch4_practical_m3)
    return (
        biomass_corrected,
        result.biogas_practical_m3,
        result.ch4_practical_m3,
        biomethane,
    )


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
        biomass_corrected, biogas, ch4, biomethane = _compute_from_biomass(biomass_tons, params)
        return StreamMetrics(
            stream=stream,
            has_biomass=True,
            biomass_gross=round(biomass_tons, 2),
            biomass_corrected=biomass_corrected,
            biogas_m3=biogas,
            biogas_ch4_m3=ch4,
            biomethane_m3=biomethane,
        )
    else:
        biomass_gross, biomass_corrected, ch4, biomethane = _compute_from_stored_biogas(
            biogas_m3, params
        )
        # Legacy path: only a stored CH4 figure exists, so raw biogas is
        # reconstructed from the same ch4_pct the forward engine would have used.
        ch4_fraction = (params.ch4_pct or 0.0) / 100.0
        biogas = {
            sc: round(ch4[sc] / ch4_fraction, 2) if ch4_fraction > 0 else 0.0 for sc in SCENARIOS
        }
        return StreamMetrics(
            stream=stream,
            has_biomass=False,
            biomass_gross=biomass_gross,
            biomass_corrected=biomass_corrected,
            biogas_m3=biogas,
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
            metrics.biogas_total[sc] += sm.biogas_m3[sc]
            metrics.biogas_ch4_total[sc] += sm.biogas_ch4_m3[sc]
            metrics.biomethane_total[sc] += sm.biomethane_m3[sc]

    # Round totals
    metrics.biomass_gross_total = round(metrics.biomass_gross_total, 2)
    metrics.biomass_gross_total_by_scenario = {
        sc: metrics.biomass_gross_total for sc in SCENARIOS
    }
    for sc in SCENARIOS:
        metrics.biomass_corrected_total[sc] = round(metrics.biomass_corrected_total[sc], 2)
        metrics.biogas_ch4_total[sc] = round(metrics.biogas_ch4_total[sc], 2)
        metrics.biomethane_total[sc] = round(metrics.biomethane_total[sc], 2)

    return metrics
