"""One municipality-level canonical pipeline shared by scripts and public APIs."""

from __future__ import annotations

import csv
import functools
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

from app.services.biogas_forward import SCENARIOS, Range, calculate_feedstock
from app.services.canonical_loader import (
    STREAM_SUBPOPULATIONS,
    biomass_tons_from_code,
    biomass_tons_from_collected_waste,
    biomass_tons_from_units,
    get_params,
    get_params_for_stream,
    mill_delivery_fraction,
)

UPGRADING_EFFICIENCY = 0.97
CITRUS_RESIDUE_FRACTION = 0.50
SUGARCANE_SUBSTREAMS: tuple[tuple[str, str, float, bool], ...] = (
    ("cana_bagaco", "BAGACO", 0.280, True),
    ("cana_torta", "TORTA_FILTRO", 0.030, True),
    ("cana_palha", "PALHA", 0.053, False),
    ("cana_vinhaca", "VINHACA", 0.420, True),
)
AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee")
LIVESTOCK_SIMPLE = ("swine", "poultry")

# Dry-solids production per measured treated-sewage volume. Von Sperling &
# Gonçalves (2001), table 3.1, gives 35--45 gSS/cap/day for primary sludge and
# 25--35 gSS/cap/day for secondary activated sludge. Dividing those bands by
# the declared 150 L/cap/day design sewage flow gives the factors below.
SLUDGE_DRY_SOLIDS_KG_M3: dict[str, Range] = {
    "LODO_PRIMARIO": Range(0.233, 0.267, 0.300),
    "LODO_SECUNDARIO": Range(0.167, 0.200, 0.233),
}

_ROOT = Path(__file__).resolve().parents[3]
SNIS_ACTIVITY_PATH = (
    _ROOT / "data" / "canonical_parameters" / "snis_sp_activity_2022.csv"
)


def _range_dict(value: Range) -> dict[str, float]:
    return {scenario: value.get(scenario) for scenario in SCENARIOS}


def _constant(value: float) -> dict[str, float]:
    return {scenario: value for scenario in SCENARIOS}


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


@functools.lru_cache(maxsize=1)
def load_snis_activity_snapshot(path: str | None = None) -> dict[str, dict[str, float]]:
    source = Path(path) if path else SNIS_ACTIVITY_PATH
    output: dict[str, dict[str, float]] = {}
    for row in csv.DictReader(source.open(encoding="utf-8")):
        output[row["ibge_code"]] = {
            key: _number(value)
            for key, value in row.items()
            if key not in {"ibge_code", "municipality_name"}
        }
    return output


@dataclass
class CanonicalFeedstockMetrics:
    feedstock: str
    canonical_code: str
    public_stream: str
    sector: str
    provenance: str
    biomass_gross: dict[str, float]
    biomass_mobilizable: dict[str, float]
    ch4: dict[str, float]
    biogas: dict[str, float]
    biomethane: dict[str, float]
    availability: dict[str, float]


@dataclass
class CanonicalMunicipalityMetrics:
    ibge_code: str
    municipality_name: str
    activity_route: str
    feedstocks: dict[str, CanonicalFeedstockMetrics] = field(default_factory=dict)
    totals: dict[str, dict[str, float]] = field(
        default_factory=lambda: {
            metric: {scenario: 0.0 for scenario in SCENARIOS}
            for metric in (
                "biomass_gross",
                "biomass_mobilizable",
                "ch4",
                "biogas",
                "biomethane",
            )
        }
    )


def compute_canonical_municipality(
    row: Mapping[str, Any],
    *,
    activity: Mapping[str, float],
) -> CanonicalMunicipalityMetrics:
    """Compute every instantiated feedstock from activity to final gas volumes."""
    code = str(row.get("ibge_code") or "")
    co111 = _number(activity.get("co111_rdo_t_2022") or activity.get("rdo_coletado"))
    population = _number(activity.get("population_2022") or activity.get("population"))
    activity_route = "snis_co111" if co111 > 0 else "population_fallback"
    output = CanonicalMunicipalityMetrics(
        ibge_code=code,
        municipality_name=str(row.get("municipality_name") or row.get("name") or ""),
        activity_route=activity_route,
    )

    def add(
        label: str,
        canonical_code: str,
        public_stream: str,
        sector: str,
        provenance: str,
        biomass: dict[str, float],
    ) -> None:
        params = get_params(canonical_code)
        ch4: dict[str, float] = {}
        biogas: dict[str, float] = {}
        for scenario in SCENARIOS:
            result = calculate_feedstock(biomass[scenario], params)
            ch4[scenario] = result.ch4_practical_m3[scenario]
            biogas[scenario] = result.biogas_practical_m3[scenario]
        mobilizable = {
            scenario: biomass[scenario] * params.availability.get(scenario)
            for scenario in SCENARIOS
        }
        biomethane = {
            scenario: ch4[scenario] * UPGRADING_EFFICIENCY
            for scenario in SCENARIOS
        }
        metric = CanonicalFeedstockMetrics(
            feedstock=label,
            canonical_code=canonical_code,
            public_stream=public_stream,
            sector=sector,
            provenance=provenance,
            biomass_gross=biomass,
            biomass_mobilizable=mobilizable,
            ch4=ch4,
            biogas=biogas,
            biomethane=biomethane,
            availability={
                scenario: params.availability.get(scenario) for scenario in SCENARIOS
            },
        )
        output.feedstocks[label] = metric
        for scenario in SCENARIOS:
            output.totals["biomass_gross"][scenario] += biomass[scenario]
            output.totals["biomass_mobilizable"][scenario] += mobilizable[scenario]
            output.totals["ch4"][scenario] += ch4[scenario]
            output.totals["biogas"][scenario] += biogas[scenario]
            output.totals["biomethane"][scenario] += biomethane[scenario]

    cane = _number(row.get("sugarcane_biomass_tons_year"))
    delivery = mill_delivery_fraction("sugarcane")
    if delivery is None:
        raise RuntimeError("sugarcane has no mill_delivery_fraction")
    for label, canonical_code, fraction, mill_delivered in SUGARCANE_SUBSTREAMS:
        base = cane * fraction
        biomass = {
            scenario: base * delivery.get(scenario) if mill_delivered else base
            for scenario in SCENARIOS
        }
        add(
            label,
            canonical_code,
            "sugarcane",
            "agricultural",
            f"pam_cane_x_{fraction:g}" + ("_x_mill_delivery" if mill_delivered else ""),
            biomass,
        )

    citrus = _number(row.get("citrus_biomass_tons_year")) * CITRUS_RESIDUE_FRACTION
    add(
        "citrus",
        "BAGACO_CITROS",
        "citrus",
        "agricultural",
        "pam_fruit_x_0.50",
        _constant(citrus),
    )
    for stream in AGRICULTURAL_DIRECT:
        canonical_code = {
            "soybean": "PALHA_SOJA",
            "corn": "PALHA_MILHO",
            "coffee": "CASCA_CAFE",
        }[stream]
        add(
            stream,
            canonical_code,
            stream,
            "agricultural",
            "csv_residue_tonnes",
            _constant(_number(row.get(f"{stream}_biomass_tons_year"))),
        )

    cattle = _number(row.get("cattle_biomass_tons_year"))
    for label, canonical_code, fraction in STREAM_SUBPOPULATIONS["cattle"]:
        add(
            label,
            canonical_code,
            "cattle",
            "livestock",
            f"ppm_head_count_x_{fraction:g}",
            _range_dict(biomass_tons_from_code(canonical_code, cattle * fraction)),
        )
    for stream in LIVESTOCK_SIMPLE:
        add(
            stream,
            {"swine": "DEJETOS_SUINO", "poultry": "CAMA_AVIARIO"}[stream],
            stream,
            "livestock",
            "ppm_head_count",
            _range_dict(
                biomass_tons_from_units(
                    stream, _number(row.get(f"{stream}_biomass_tons_year"))
                )
            ),
        )

    if co111 > 0:
        forsu = biomass_tons_from_collected_waste("rsu", co111)
        forsu_provenance = "SNIS_2022_CO111_x_organic_fraction_of_rdo"
    else:
        forsu = biomass_tons_from_units("rsu", population)
        forsu_provenance = "IBGE_2022_population_fallback"
    add(
        "forsu",
        "FORSU",
        "rsu",
        "urban",
        forsu_provenance,
        _range_dict(forsu),
    )

    treated_m3 = _number(activity.get("es006_treated_sewage_1000m3_2022")) * 1000.0
    if treated_m3 > 0:
        for label, canonical_code, public_stream in (
            ("lodo_primario", "LODO_PRIMARIO", "sludge_primary"),
            ("lodo_secundario", "LODO_SECUNDARIO", "sludge_secondary"),
        ):
            params = get_params(canonical_code)
            dry_factor = SLUDGE_DRY_SOLIDS_KG_M3[canonical_code]
            # kgDS/m3 × m3 / 1000 = tDS; convert activity to wet tonnes at the
            # declared reference (medio) TS. The engine then applies its TS
            # uncertainty band exactly once to the min/medio/max chemistry.
            wet = {
                scenario: (treated_m3 * dry_factor.get(scenario) / 1000.0)
                / (params.ts.medio / 100.0)
                for scenario in SCENARIOS
            }
            add(
                label,
                canonical_code,
                public_stream,
                "urban",
                "SNIS_2022_ES006_x_dry_solids_per_m3",
                wet,
            )

    return output
