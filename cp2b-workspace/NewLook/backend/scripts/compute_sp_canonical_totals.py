#!/usr/bin/env python3
"""Compute the canonical São Paulo inventory from one municipality pipeline."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import yaml  # noqa: E402

from app.services.biogas_forward import SCENARIOS  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_SUBPOPULATIONS,
    get_availability_profile,
)
from app.services.canonical_municipality import (  # noqa: E402
    CITRUS_RESIDUE_FRACTION,
    SUGARCANE_SUBSTREAMS as _PIPELINE_SUGARCANE_SUBSTREAMS,
    SLUDGE_DRY_SOLIDS_KG_M3,
    compute_canonical_municipality,
    load_snis_activity_snapshot,
)
from app.services.map_metrics import compute_published_municipality_metrics  # noqa: E402
from scripts.compute_spatial_concentration import (  # noqa: E402
    compute_spatial_concentration,
    quantity,
)

_NEWLOOK = Path(__file__).resolve().parents[2]
_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"
_CONTEXT = _NEWLOOK.parents[1] / "analysis" / "data" / "02_municipality_summary_SP_2023.csv"
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"
_ENERGY = _NEWLOOK / "data" / "canonical_parameters" / "energy.yaml"
_SNIS = _NEWLOOK / "data" / "canonical_parameters" / "snis_sp_activity_2022.csv"
_CANONICAL_JSON = _NEWLOOK / "docs" / "data" / "canonical_results.json"
_REPORT = (
    _NEWLOOK
    / "docs"
    / "auditorias"
    / "2026-07-consistencia-canonica"
    / "06_adventure-b-canonico_2026-07-30-08-01"
    / "B2-CLOSE_2026-08-01.md"
)
_STREAM_CSV = Path(__file__).parent / "canonical_recalc_output" / "sp_canonical_by_stream.csv"

GUARD_ABSOLUTE_TOLERANCE_M3_YEAR = 0.01
GUARD_RELATIVE_TOLERANCE = 1e-12
FRONTIER_ALPHA = 0.5

# Compatibility exports retained for the residue-fraction guard tests.
_NOTES = {
    "cana_bagaco": "28% wet pressed bagasse/t green cane",
    "cana_torta": "3.0% wet filter cake/t green cane",
    "cana_palha": "field straw; mill delivery does not apply",
    "cana_vinhaca": "0.420 t vinasse/t green cane",
}
SUGARCANE_SUBSTREAMS = [
    (label, code, fraction, delivered, _NOTES[label])
    for label, code, fraction, delivered in _PIPELINE_SUGARCANE_SUBSTREAMS
]
LIVESTOCK_SIMPLE = ("swine", "poultry")
SPLIT_LIVESTOCK = ("cattle",)


def _empty_range() -> dict[str, float]:
    return {scenario: 0.0 for scenario in SCENARIOS}


def _quantity_range(values: dict[str, float], unit: str) -> dict[str, dict]:
    return {scenario: quantity(values[scenario], unit) for scenario in SCENARIOS}


def _frontier(values: dict[str, float]) -> float:
    return values["medio"] + FRONTIER_ALPHA * (values["max"] - values["medio"])


def _git_sha() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=_NEWLOOK, text=True
    ).strip()


def _load_inputs() -> tuple[list[dict], dict[str, dict], dict[str, dict[str, float]]]:
    rows = [
        row
        for row in csv.DictReader(_CSV.open(encoding="utf-8"))
        if (row.get("ibge_code") or "").strip()
    ]
    contexts = {
        row["ibge_code"]: row
        for row in csv.DictReader(_CONTEXT.open(encoding="utf-8-sig"))
    }
    activity = load_snis_activity_snapshot(str(_SNIS))
    if len(rows) != 645 or len(activity) != 645:
        raise RuntimeError(
            f"São Paulo inventory must contain 645 municipalities; "
            f"biomass={len(rows)}, SNIS={len(activity)}"
        )
    missing = sorted({row["ibge_code"] for row in rows} - contexts.keys())
    if missing:
        raise RuntimeError(f"Missing regional context for {missing[:5]}")
    return rows, contexts, activity


def _load_energy_parameters() -> dict:
    with _ENERGY.open(encoding="utf-8") as handle:
        parameters = yaml.safe_load(handle)
    chp = parameters["chp"]
    if not math.isclose(
        float(chp["electrical_efficiency"]) + float(chp["thermal_efficiency"]),
        float(chp["total_useful_efficiency"]),
        rel_tol=0.0,
        abs_tol=1e-12,
    ):
        raise RuntimeError("CHP electrical + thermal efficiencies must equal total")
    return parameters


def compute() -> tuple[list[dict], list, dict]:
    rows, contexts, activity = _load_inputs()
    municipalities = []
    public_comparison = {
        "municipalities_compared": len(rows),
        "municipalities_equal": 0,
        "max_absolute_delta": {
            metric: {scenario: 0.0 for scenario in SCENARIOS}
            for metric in ("biomass_gross", "biomass_mobilizable", "ch4", "biogas", "biomethane")
        },
    }
    for row in rows:
        code = row["ibge_code"]
        canonical = compute_canonical_municipality(row, activity=activity[code])
        public = compute_published_municipality_metrics(row, activity=activity[code])
        public_values = {
            "biomass_gross": public.biomass_gross_total_by_scenario,
            "biomass_mobilizable": public.biomass_corrected_total,
            "ch4": public.biogas_ch4_total,
            "biogas": public.biogas_total,
            "biomethane": public.biomethane_total,
        }
        equal = True
        for metric in public_comparison["max_absolute_delta"]:
            for scenario in SCENARIOS:
                delta = abs(
                    canonical.totals[metric][scenario]
                    - public_values[metric][scenario]
                )
                public_comparison["max_absolute_delta"][metric][scenario] = max(
                    public_comparison["max_absolute_delta"][metric][scenario], delta
                )
                equal &= delta <= 0.01
        if equal:
            public_comparison["municipalities_equal"] += 1
        municipalities.append(
            {
                "row": row,
                "context": contexts[code],
                "activity": activity[code],
                "canonical": canonical,
            }
        )
    if public_comparison["municipalities_equal"] != 645:
        raise RuntimeError(f"Public/canonical reconciliation failed: {public_comparison}")
    return rows, municipalities, public_comparison


def _aggregate(municipalities: list[dict]) -> tuple[dict, dict, dict]:
    metrics = ("biomass_gross", "biomass_mobilizable", "ch4", "biogas", "biomethane")
    totals = {metric: _empty_range() for metric in metrics}
    by_feedstock: dict[str, dict] = {}
    by_sector: dict[str, dict] = {}

    def target(container: dict, key: str, metadata: dict) -> dict:
        if key not in container:
            container[key] = {
                **metadata,
                **{metric: _empty_range() for metric in metrics},
            }
        return container[key]

    for item in municipalities:
        canonical = item["canonical"]
        for metric in metrics:
            for scenario in SCENARIOS:
                totals[metric][scenario] += canonical.totals[metric][scenario]
        for feedstock in canonical.feedstocks.values():
            feedstock_target = target(
                by_feedstock,
                feedstock.feedstock,
                {
                    "feedstock": feedstock.feedstock,
                    "canonical_code": feedstock.canonical_code,
                    "sector": feedstock.sector,
                    "provenance": feedstock.provenance,
                    "availability": dict(feedstock.availability),
                },
            )
            sector_target = target(
                by_sector, feedstock.sector, {"sector": feedstock.sector}
            )
            for metric in metrics:
                source = {
                    "biomass_gross": feedstock.biomass_gross,
                    "biomass_mobilizable": feedstock.biomass_mobilizable,
                    "ch4": feedstock.ch4,
                    "biogas": feedstock.biogas,
                    "biomethane": feedstock.biomethane,
                }[metric]
                for scenario in SCENARIOS:
                    feedstock_target[metric][scenario] += source[scenario]
                    sector_target[metric][scenario] += source[scenario]
    return totals, by_feedstock, by_sector


_MONTH_NAMES = (
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
)


def _monthly_summary(values: list[float]) -> dict:
    peak = max(range(12), key=values.__getitem__)
    valley = min(range(12), key=values.__getitem__)
    return {
        "monthly_ch4_available": [
            {
                "month": month + 1,
                "month_name": _MONTH_NAMES[month],
                "ch4_available": quantity(value, "m3_CH4/month"),
            }
            for month, value in enumerate(values)
        ],
        "peak_month": {"month": peak + 1, "month_name": _MONTH_NAMES[peak]},
        "valley_month": {"month": valley + 1, "month_name": _MONTH_NAMES[valley]},
        "peak_to_valley_ratio": values[peak] / values[valley],
    }


def _temporal_availability(
    municipalities: list[dict],
    feedstocks: dict[str, dict],
    sectors: dict[str, dict],
) -> tuple[dict, dict[str, list[dict]]]:
    """Allocate annual medium CH4 uniformly over each generation window.

    This is availability at the point of generation, before storage dispatch.
    It is intentionally separate from FC × FCo × FL and conserves annual CH4.
    """
    profiles = {
        row["canonical_code"]: get_availability_profile(row["canonical_code"])
        for row in feedstocks.values()
    }
    state = [0.0] * 12
    regions: dict[tuple[str, str], list[float]] = {}
    by_municipality: dict[str, list[dict]] = {}
    for item in municipalities:
        canonical = item["canonical"]
        context = item["context"]
        municipal = [0.0] * 12
        region_key = (context["cd_rgint"], context["nm_rgint"])
        regional = regions.setdefault(region_key, [0.0] * 12)
        for metric in canonical.feedstocks.values():
            profile = profiles[metric.canonical_code]
            monthly = metric.ch4["medio"] / len(profile.window_months)
            for month in profile.window_months:
                municipal[month - 1] += monthly
                regional[month - 1] += monthly
                state[month - 1] += monthly
        by_municipality[canonical.ibge_code] = _monthly_summary(municipal)[
            "monthly_ch4_available"
        ]

    annual = sum(row["ch4"]["medio"] for row in feedstocks.values())
    if not math.isclose(sum(state), annual, rel_tol=1e-12, abs_tol=0.01):
        raise RuntimeError(
            f"B6 temporal allocation changed annual CH4: monthly={sum(state)}, annual={annual}"
        )

    capacity_feedstocks = []
    for row in sorted(
        feedstocks.values(), key=lambda value: value["ch4"]["medio"], reverse=True
    ):
        profile = profiles[row["canonical_code"]]
        factor = 1.0 if profile.storable else profile.days_available_yr / 365.0
        capacity_feedstocks.append(
            {
                "feedstock": row["feedstock"],
                "canonical_code": row["canonical_code"],
                "sector": row["sector"],
                "days_available_yr": profile.days_available_yr,
                "storable": profile.storable,
                "max_storage_days": profile.max_storage_days,
                "point_of_availability": profile.point_of_availability,
                "window_months": list(profile.window_months),
                "source": profile.source,
                "implicit_capacity_factor": factor,
                "ch4_medio": quantity(row["ch4"]["medio"], "m3_CH4/year"),
            }
        )

    def weighted(rows: list[dict]) -> float:
        denominator = sum(row["ch4"]["medio"] for row in rows)
        return sum(
            row["ch4"]["medio"]
            * (
                1.0
                if profiles[row["canonical_code"]].storable
                else profiles[row["canonical_code"]].days_available_yr / 365.0
            )
            for row in rows
        ) / denominator

    capacity_sectors = []
    for sector in sorted(sectors):
        rows = [row for row in feedstocks.values() if row["sector"] == sector]
        capacity_sectors.append(
            {
                "sector": sector,
                "implicit_capacity_factor": weighted(rows),
                "weight": "CH4 medio anual",
            }
        )

    regional_output = []
    for (code, name), values in sorted(regions.items()):
        regional_output.append(
            {
                "intermediate_region_code": code,
                "intermediate_region_name": name,
                **_monthly_summary(values),
            }
        )
    return (
        {
            "interpretation": (
                "generation at the point of availability, uniformly distributed "
                "within window_months; before storage dispatch"
            ),
            "annual_invariance": {
                "monthly_sum_m3_year": sum(state),
                "canonical_ch4_medio_m3_year": annual,
                "delta_m3_year": sum(state) - annual,
                "absolute_tolerance_m3_year": 0.01,
                "status": "pass",
            },
            "state": _monthly_summary(state),
            "by_intermediate_region": regional_output,
            "implicit_capacity_factor": {
                "interpretation": (
                    "engineering utilisation metric, never a discount of potential; "
                    "days_available_yr/365 for non-storable streams and 1.0 where "
                    "declared storage bridges the off-season"
                ),
                "aggregation_weight": "CH4 medio anual",
                "state": weighted(list(feedstocks.values())),
                "by_sector": capacity_sectors,
                "by_feedstock": capacity_feedstocks,
            },
        },
        by_municipality,
    )


def _baseline_expected(path: Path) -> float | None:
    if not path.is_file():
        return None
    previous = json.loads(path.read_text(encoding="utf-8"))
    try:
        return float(previous["totals"]["ch4_practical"]["medio"]["value"])
    except (KeyError, TypeError, ValueError):
        return None


def _guard(current: float, expected: float | None, update_baseline: bool) -> dict:
    result = {
        "expected_source": "docs/data/canonical_results.json:totals.ch4_practical.medio",
        "expected_m3_year": expected,
        "actual_m3_year": current,
        "absolute_tolerance_m3_year": GUARD_ABSOLUTE_TOLERANCE_M3_YEAR,
        "relative_tolerance": GUARD_RELATIVE_TOLERANCE,
        "update_baseline": update_baseline,
    }
    if expected is None:
        result["status"] = "baseline_missing"
        if not update_baseline:
            raise RuntimeError("Canonical guard baseline is missing; use --update-baseline once")
        return result
    result["delta_m3_year"] = current - expected
    result["status"] = (
        "updated"
        if update_baseline
        else "pass"
        if math.isclose(
            current,
            expected,
            rel_tol=GUARD_RELATIVE_TOLERANCE,
            abs_tol=GUARD_ABSOLUTE_TOLERANCE_M3_YEAR,
        )
        else "fail"
    )
    if result["status"] == "fail":
        raise RuntimeError(
            f"REFACTORING REGRESSION: CH4 medio={current:.6f} m3/year, "
            f"baseline={expected:.6f} m3/year"
        )
    return result


def _not_instantiated(instantiated: set[str]) -> list[dict[str, str]]:
    catalog = yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]
    output = []
    for code, entry in catalog.items():
        if code in instantiated:
            continue
        if code == "PODA_URBANA":
            reason = "BMP corpus coverage=none; intentionally not instantiated"
        elif code == "ORGANICO_RSU":
            reason = "FORSU is represented by measured CO111 × organic fraction; alternate RSU model excluded"
        elif code == "ESTERCO_BOVINO":
            reason = "aggregate replaced by the explicit beef/dairy subpopulation split"
        elif code == "DEJETOS_AVES":
            reason = "poultry activity is mapped to CAMA_AVIARIO; alternate substrate excluded"
        else:
            reason = "no municipal activity field mapped in the 2022/2023 São Paulo inventory"
        output.append({"canonical_code": code, "reason": reason})
    return output


def _co_reconciliation() -> dict:
    rows = list(csv.DictReader(_SNIS.open(encoding="utf-8")))
    fields = (
        "co111_rdo_t_2022",
        "co115_rpu_t_2022",
        "co119_rdo_rpu_t_2022",
    )
    comparable = [row for row in rows if all(row[field] != "" for field in fields)]
    deltas = [
        float(row[fields[2]]) - float(row[fields[0]]) - float(row[fields[1]])
        for row in comparable
    ]
    return {
        "query": "SNIS RS 2022, Tabela CO02, same municipality row",
        "identity": "CO119 = CO111 + CO115",
        "comparable_municipalities": len(comparable),
        "equal_within_0_01_t": sum(abs(delta) <= 0.01 for delta in deltas),
        "maximum_absolute_delta_t": max(map(abs, deltas), default=0.0),
    }


def build_results(
    municipalities: list[dict],
    public_comparison: dict,
    *,
    update_baseline: bool,
) -> tuple[dict, list[dict]]:
    energy_parameters = _load_energy_parameters()
    methane_lhv = float(energy_parameters["methane"]["lower_heating_value_kwh_m3"])
    electrical_efficiency = float(energy_parameters["chp"]["electrical_efficiency"])
    thermal_efficiency = float(energy_parameters["chp"]["thermal_efficiency"])
    upgrading_recovery = float(energy_parameters["biomethane"]["upgrading_recovery"])
    totals, feedstocks, sectors = _aggregate(municipalities)
    expected = _baseline_expected(_CANONICAL_JSON)
    guard = _guard(totals["ch4"]["medio"], expected, update_baseline)
    temporal, monthly_by_municipality = _temporal_availability(
        municipalities, feedstocks, sectors
    )
    instantiated = {row["canonical_code"] for row in feedstocks.values()}

    def serialise_rank(rows: list[dict]) -> list[dict]:
        output = []
        for row in rows:
            item = {key: value for key, value in row.items() if key not in (
                "biomass_gross", "biomass_mobilizable", "ch4", "biogas", "biomethane"
            )}
            item.update(
                {
                    "biomass_gross": _quantity_range(row["biomass_gross"], "tonne_wet/year"),
                    "biomass_mobilizable": _quantity_range(
                        row["biomass_mobilizable"], "tonne_wet/year"
                    ),
                    "ch4_practical": _quantity_range(row["ch4"], "m3_CH4/year"),
                    "biogas_practical": _quantity_range(row["biogas"], "m3_biogas/year"),
                    "biomethane": _quantity_range(row["biomethane"], "m3_biomethane/year"),
                }
            )
            return_order = output
            return_order.append(item)
        return output

    feedstock_rows = sorted(
        feedstocks.values(), key=lambda row: row["ch4"]["medio"], reverse=True
    )
    sector_rows = sorted(
        sectors.values(), key=lambda row: row["ch4"]["medio"], reverse=True
    )
    by_municipality = []
    spatial_input = []
    route_counts = defaultdict(int)
    for item in municipalities:
        canonical = item["canonical"]
        context = item["context"]
        route_counts[canonical.activity_route] += 1
        metrics = {
            "biomass_gross": _quantity_range(
                canonical.totals["biomass_gross"], "tonne_wet/year"
            ),
            "biomass_mobilizable": _quantity_range(
                canonical.totals["biomass_mobilizable"], "tonne_wet/year"
            ),
            "ch4_practical": _quantity_range(canonical.totals["ch4"], "m3_CH4/year"),
            "biogas_practical": _quantity_range(
                canonical.totals["biogas"], "m3_biogas/year"
            ),
            "biomethane": _quantity_range(
                canonical.totals["biomethane"], "m3_biomethane/year"
            ),
        }
        by_municipality.append(
            {
                "ibge_code": canonical.ibge_code,
                "municipality_name": canonical.municipality_name,
                "intermediate_region_code": context["cd_rgint"],
                "intermediate_region_name": context["nm_rgint"],
                "forsu_activity_route": canonical.activity_route,
                "snis_co111_t_year": item["activity"]["co111_rdo_t_2022"],
                "snis_es006_1000m3_year": item["activity"][
                    "es006_treated_sewage_1000m3_2022"
                ],
                "monthly_ch4_available": monthly_by_municipality[
                    canonical.ibge_code
                ],
                "totals": metrics,
            }
        )
        spatial_input.append(
            {
                "ibge_code": canonical.ibge_code,
                "municipality_name": canonical.municipality_name,
                "intermediate_region_code": context["cd_rgint"],
                "intermediate_region_name": context["nm_rgint"],
                "ch4_medio": canonical.totals["ch4"]["medio"],
                "ch4_frontier": _frontier(canonical.totals["ch4"]),
            }
        )

    energy = {}
    for scenario in SCENARIOS:
        methane = totals["ch4"][scenario]
        energy[scenario] = {
            "electricity_twh_year": methane
            * methane_lhv
            * electrical_efficiency
            / 1e9,
            "thermal_pj_year": methane
            * methane_lhv
            * thermal_efficiency
            * 3.6e-9,
        }
    measured_forsu = int(route_counts.get("snis_co111", 0))
    fallback_forsu = int(route_counts.get("population_fallback", 0))
    coverage = {
        "snis_series_year": 2022,
        "forsu": {
            "series_year": 2022,
            "measured_field": "CO111",
            "measured_co111_municipalities": measured_forsu,
            "population_fallback_municipalities": fallback_forsu,
            "total_municipalities": measured_forsu + fallback_forsu,
            "measured_share_percent": 100.0
            * measured_forsu
            / (measured_forsu + fallback_forsu),
            "route_counts": dict(route_counts),
        },
        "es006_reported_municipalities": sum(
            item["activity"]["es006_treated_sewage_1000m3_2022"] > 0
            for item in municipalities
        ),
        "es006_not_reported_municipalities": sum(
            item["activity"]["es006_treated_sewage_1000m3_2022"] <= 0
            for item in municipalities
        ),
        "poda_urbana": {
            "coverage": "none",
            "instantiated": False,
            "public_interface": "removed",
            "reason": "corpus and canonical municipal activity are absent",
        },
        "co111_co115_co119_reconciliation": _co_reconciliation(),
    }
    results = {
        "schema_version": "2.1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git_sha": _git_sha(),
        "feedstocks_yaml_sha256": hashlib.sha256(_FEEDSTOCKS.read_bytes()).hexdigest(),
        "energy_parameters_sha256": hashlib.sha256(_ENERGY.read_bytes()).hexdigest(),
        "scenario": {
            "min": "coupled deterministic lower parameter extreme",
            "medio": "coupled deterministic central parameter set",
            "max": "coupled deterministic upper parameter extreme",
        },
        "uncertainty_interpretation": {
            "method": "coupled_parameter_extremes",
            "statistical_propagation": False,
            "monte_carlo": False,
            "limitation": "not confidence intervals, quantiles, or probability distributions",
        },
        "totals": {
            "biomass_gross": _quantity_range(totals["biomass_gross"], "tonne_wet/year"),
            "biomass_mobilizable": _quantity_range(
                totals["biomass_mobilizable"], "tonne_wet/year"
            ),
            "ch4_practical": _quantity_range(totals["ch4"], "m3_CH4/year"),
            "biogas_practical": _quantity_range(totals["biogas"], "m3_biogas/year"),
            "biomethane": _quantity_range(totals["biomethane"], "m3_biomethane/year"),
            "energy": energy,
        },
        "efficiencies": {
            "route": energy_parameters["route"],
            "methane_lhv_kwh_m3": methane_lhv,
            "electrical": electrical_efficiency,
            "thermal": thermal_efficiency,
            "total_useful": float(energy_parameters["chp"]["total_useful_efficiency"]),
            "biomethane_upgrading": upgrading_recovery,
        },
        "by_feedstock": serialise_rank(feedstock_rows),
        "by_sector": serialise_rank(sector_rows),
        "by_municipality": by_municipality,
        "coverage": coverage,
        "parameterized_not_instantiated": _not_instantiated(instantiated),
        "validation": {
            "canonical_guard": guard,
            "public_route_vs_canonical": public_comparison,
        },
        "spatial_concentration": {
            "medio": compute_spatial_concentration(spatial_input, value_key="ch4_medio"),
            "frontier": compute_spatial_concentration(
                spatial_input, value_key="ch4_frontier"
            ),
        },
        "temporal_availability": temporal,
        "provenance": {
            "generator": "backend/scripts/compute_sp_canonical_totals.py",
            "municipal_activity_input": "docs/data/municipality_biomass_tons.csv",
            "snis_activity_input": "data/canonical_parameters/snis_sp_activity_2022.csv",
            "canonical_parameters": "data/canonical_parameters/feedstocks.yaml",
            "energy_parameters": "data/canonical_parameters/energy.yaml",
            "municipalities": quantity(len(municipalities), "municipality"),
            "snis_fields": {
                "CO111": "Quantidade de resíduos domiciliares coletados — Total (t/year)",
                "CO115": "Quantidade de resíduos públicos coletados — Total (t/year)",
                "CO119": "Quantidade total de resíduos coletados — Total (t/year)",
                "ES006": "Volume de esgotos tratado (1,000 m3/year)",
            },
            "sludge_dry_solids_kg_m3": {
                code: {scenario: factor.get(scenario) for scenario in SCENARIOS}
                for code, factor in SLUDGE_DRY_SOLIDS_KG_M3.items()
            },
        },
    }
    return results, feedstock_rows


def _write_stream_csv(feedstocks: list[dict]) -> None:
    _STREAM_CSV.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "feedstock",
        "canonical_code",
        "sector",
        "provenance",
        *[
            f"{metric}_{scenario}"
            for metric in ("biomass_gross", "biomass_mobilizable", "ch4", "biogas", "biomethane")
            for scenario in SCENARIOS
        ],
    ]
    with _STREAM_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in feedstocks:
            writer.writerow(
                {
                    "feedstock": row["feedstock"],
                    "canonical_code": row["canonical_code"],
                    "sector": row["sector"],
                    "provenance": row["provenance"],
                    **{
                        f"{metric}_{scenario}": row[metric][scenario]
                        for metric in (
                            "biomass_gross",
                            "biomass_mobilizable",
                            "ch4",
                            "biogas",
                            "biomethane",
                        )
                        for scenario in SCENARIOS
                    },
                }
            )


def _fmt_range(values: dict, divisor: float) -> str:
    return " / ".join(f"{values[scenario]['value'] / divisor:.4f}" for scenario in SCENARIOS)


def _write_report(results: dict) -> None:
    totals = results["totals"]
    coverage = results["coverage"]
    comparison = results["validation"]["public_route_vs_canonical"]
    energy = totals["energy"]
    efficiencies = results["efficiencies"]
    lines = [
        "# B2-CLOSE — fechamento canônico",
        "",
        "Data de execução: 2026-08-01. Série SNIS declarada: 2022.",
        "",
        "## Resultado reproduzível",
        "",
        "Comando único:",
        "",
        "```bash",
        "python backend/scripts/compute_sp_canonical_totals.py",
        "```",
        "",
        "Ordem das bandas em todas as linhas: **min / médio / max**.",
        "",
        f"- Biomassa bruta: {_fmt_range(totals['biomass_gross'], 1e6)} Mt/ano",
        f"- Biomassa mobilizável: {_fmt_range(totals['biomass_mobilizable'], 1e6)} Mt/ano",
        f"- CH4: {_fmt_range(totals['ch4_practical'], 365e6)} Mm³/dia; "
        f"{_fmt_range(totals['ch4_practical'], 1e6)} Mm³/ano",
        f"- Biogás: {_fmt_range(totals['biogas_practical'], 365e6)} Mm³/dia; "
        f"{_fmt_range(totals['biogas_practical'], 1e6)} Mm³/ano",
        f"- Biometano: {_fmt_range(totals['biomethane'], 365e6)} Mm³/dia; "
        f"{_fmt_range(totals['biomethane'], 1e6)} Mm³/ano",
        "- Bioenergia elétrica: "
        + " / ".join(f"{energy[s]['electricity_twh_year']:.4f}" for s in SCENARIOS)
        + f" TWh/ano (PCI CH4={efficiencies['methane_lhv_kwh_m3']} kWh/m³; "
        + f"ηel={efficiencies['electrical']:.0%})",
        "- Bioenergia térmica: "
        + " / ".join(f"{energy[s]['thermal_pj_year']:.4f}" for s in SCENARIOS)
        + f" PJ/ano (ηth={efficiencies['thermal']:.0%})",
        "",
        "## Blocker 1 — regressão e guard",
        "",
        "A cronologia do Git refuta a atribuição da queda ao `0c0d38a`. O artefato "
        "`cac1f42` contém 1.327.410.889,53 m³/ano (3,636742 Mm³/dia). O commit "
        "`cb7967a`, às 08:20:45, já o substitui por 1.012.444.348,86 m³/ano "
        "(2,773820 Mm³/dia). O `0c0d38a` é posterior, às 08:35:09, e não altera "
        "`feedstocks.yaml`, o script canônico nem `canonical_results.json`.",
        "",
        "A linha que efetivamente mudou o resultado de atividade→CH4 está no catálogo "
        "alterado por `cb7967a`: entre outras mudanças, `BAGACO.bmp.medio` 165→115 "
        "(linha histórica 35), `BAGACO.fco_available.medio` 0,22→0,165 (linha 81), "
        "`ESTERCO_BOVINO_LEITEIRO.fc.medio` 0,88→0,14 (linha 1350) e "
        "`FORSU.fc.medio` 0,90→0,30 (linha 1692). Portanto houve, sim, alteração "
        "paramétrica antes da queda; este lote não a reverteu nem a compensou.",
        "",
        "Separadamente, `0c0d38a` introduziu uma regressão real na rota pública: "
        "`map_metrics.py` colapsava a banda de atividade nas linhas históricas 228, "
        "232 e 238 (`biomass_tons_from_*().medio`) e a linha 420 processava streams "
        "agregados. Cana deixava de ser decomposta em bagaço/torta/palha/vinhaça, "
        "citros não recebia a fração 0,50 e bovinos não eram separados em corte/leite. "
        "Esse mecanismo explica a divergência rota pública×script, mas não a cronologia "
        "da queda 3,6367→2,7738.",
        "",
        "O B1-VERIFY (`cd039da`) agravou o problema: substituiu o esperado do guard de "
        "`3,6367` por `2,4808` e alterou parâmetros do catálogo. Este lote não moveu "
        "parâmetros. O guard agora lê o valor esperado do próprio "
        "`canonical_results.json`, mas compara esse baseline com uma nova execução "
        "independente; ele nunca deriva o esperado do output corrente.",
        "",
        f"Comparação rota pública × script: {comparison['municipalities_equal']}/"
        f"{comparison['municipalities_compared']} municípios iguais; maior delta "
        f"absoluto={max(v for m in comparison['max_absolute_delta'].values() for v in m.values()):.12g}.",
        "",
        "## Blocker 2 — biomassa no mesmo pipeline",
        "",
        "Cada feedstock agora carrega, na mesma instância municipal, biomassa bruta, "
        "biomassa mobilizável, CH4, biogás e biometano. A disponibilidade implícita "
        "`mobilizável/bruta` é gravada no ranking e é exatamente "
        "`FC × FCo × FL`; para FORSU médio: 0,90 × 0,65 × 0,80 = 0,4680.",
        "",
        "## SNIS 2022",
        "",
        f"- FORSU por CO111 medido: {coverage['forsu']['measured_co111_municipalities']} municípios.",
        f"- Fallback populacional explícito: {coverage['forsu']['population_fallback_municipalities']} municípios.",
        f"- ES006 com reporte positivo: {coverage['es006_reported_municipalities']}/645; "
        f"sem reporte: {coverage['es006_not_reported_municipalities']}/645.",
        "- CO111 é RDO coletado; CO115 é RPU coletado; CO119 é o total RDO+RPU. "
        "A consulta usa os três campos da Tabela CO02 e verifica a identidade nas "
        "linhas que reportam os componentes — nenhuma regra de três.",
        f"- Reconciliação CO119=CO111+CO115: "
        f"{coverage['co111_co115_co119_reconciliation']['equal_within_0_01_t']}/"
        f"{coverage['co111_co115_co119_reconciliation']['comparable_municipalities']} "
        f"linhas comparáveis; maior diferença absoluta "
        f"{coverage['co111_co115_co119_reconciliation']['maximum_absolute_delta_t']:.6g} t.",
        "- LODO_PRIMARIO e LODO_SECUNDARIO são instanciados a partir de ES006. "
        "Conversão primário min/médio/max = 0,233/0,267/0,300 kg MS/m³ e secundário "
        "= 0,167/0,200/0,233 kg MS/m³, declarada em "
        "`provenance.sludge_dry_solids_kg_m3`; a massa seca é convertida à base "
        "úmida pela TS canônica média antes do motor, que aplica sua banda TS uma "
        "única vez. Base: 35–45 e 25–35 g SS/hab.d, "
        "respectivamente, divididos pela vazão de projeto declarada de 150 L/hab.d.",
        "- PODA_URBANA permanece `coverage:none` e não é instanciada.",
        "",
        "Fontes oficiais consultadas: [SNIS RS 2022 — planilhas]"
        "(https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/"
        "saneamento/snis/produtos-do-snis/diagnosticos/"
        "Planilha_RS_2022_atualizado_29112024.zip), "
        "`Planilha_Informacoes_RS_2022.xlsx`/Tabela CO02; e "
        "[SNIS AE 2022 — planilhas](https://www.gov.br/cidades/pt-br/acesso-a-"
        "informacao/acoes-e-programas/saneamento/snis/produtos-do-snis/diagnosticos/"
        "Planilhas_AE2022.zip), campo ES006.",
        "Conversão de lodo: [Von Sperling & Gonçalves (2001), tabela 3.1]"
        "(https://repositorio.ufmg.br/bitstream/1843/ENGD-6SXHZW/1/190m.pdf).",
        "",
        "## Ranking por feedstock (CH4 médio)",
        "",
        "| # | Feedstock | Setor | CH4 (Mm³/ano) | disponibilidade implícita média |",
        "|---:|---|---|---:|---:|",
    ]
    for index, row in enumerate(results["by_feedstock"], 1):
        lines.append(
            f"| {index} | {row['feedstock']} | {row['sector']} | "
            f"{row['ch4_practical']['medio']['value']/1e6:.3f} | "
            f"{row['availability']['medio']:.4f} |"
        )
    lines += [
        "",
        "## Ranking por setor (CH4 médio)",
        "",
        "| # | Setor | CH4 (Mm³/ano) |",
        "|---:|---|---:|",
    ]
    for index, row in enumerate(results["by_sector"], 1):
        lines.append(
            f"| {index} | {row['sector']} | "
            f"{row['ch4_practical']['medio']['value']/1e6:.3f} |"
        )
    lines += [
        "",
        "## Feedstocks parametrizados e não instanciados",
        "",
        "| Código | Motivo |",
        "|---|---|",
    ]
    for row in results["parameterized_not_instantiated"]:
        lines.append(f"| {row['canonical_code']} | {row['reason']} |")
    lines += [
        "",
        "## Artefatos e integridade",
        "",
        f"- SHA-256 de `feedstocks.yaml`: `{results['feedstocks_yaml_sha256']}`.",
        "- Snapshot municipal SNIS: `data/canonical_parameters/snis_sp_activity_2022.csv`.",
        "- Resultado: `docs/data/canonical_results.json`.",
        "",
    ]
    _REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="accept an intentional methodology change and replace canonical_results.json",
    )
    parser.add_argument(
        "--write-b2-report",
        action="store_true",
        help="regenerate the archived B2 report explicitly (off by default)",
    )
    args = parser.parse_args()
    _, municipalities, comparison = compute()
    results, feedstocks = build_results(
        municipalities, comparison, update_baseline=args.update_baseline
    )
    _CANONICAL_JSON.write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    _write_stream_csv(feedstocks)
    if args.write_b2_report:
        _write_report(results)
    print(json.dumps({
        "ch4_medio_mm3_day": results["totals"]["ch4_practical"]["medio"]["value"] / 365e6,
        "municipalities_equal": comparison["municipalities_equal"],
        "feedstocks_yaml_sha256": results["feedstocks_yaml_sha256"],
        "canonical_results": str(_CANONICAL_JSON),
        "archived_b2_report_regenerated": bool(args.write_b2_report),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
