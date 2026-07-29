#!/usr/bin/env python3
"""Spatial concentration statistics for canonical municipal CH4 results."""

from __future__ import annotations

from collections import defaultdict

TOP_N = (10, 50, 100, 203)
CONCENTRATION_THRESHOLDS_PERCENT = (67.0,)


def quantity(value: float | int, unit: str) -> dict:
    """Represent a numeric result without losing its unit."""
    return {"value": value, "unit": unit}


def lorenz_curve(values: list[float]) -> list[dict]:
    """Return Lorenz coordinates ordered from the smallest observation."""
    ordered = sorted(max(0.0, value) for value in values)
    total = sum(ordered)
    count = len(ordered)
    points = [
        {
            "municipalities_cumulative": quantity(0.0, "percent"),
            "ch4_cumulative": quantity(0.0, "percent"),
        }
    ]
    cumulative = 0.0
    for index, value in enumerate(ordered, 1):
        cumulative += value
        points.append(
            {
                "municipalities_cumulative": quantity(100.0 * index / count, "percent"),
                "ch4_cumulative": quantity(100.0 * cumulative / total if total else 0.0, "percent"),
            }
        )
    return points


def gini(values: list[float]) -> float:
    """Population Gini coefficient for non-negative observations."""
    ordered = sorted(max(0.0, value) for value in values)
    total = sum(ordered)
    count = len(ordered)
    if not count or not total:
        return 0.0
    weighted = sum((index + 1) * value for index, value in enumerate(ordered))
    return (2.0 * weighted) / (count * total) - (count + 1.0) / count


def compute_spatial_concentration(
    municipalities: list[dict],
    *,
    value_key: str,
) -> dict:
    """Compute Lorenz, Gini, top-N and IBGE intermediate-region shares."""
    values = [float(row[value_key]) for row in municipalities]
    state_total = sum(values)
    descending = sorted(municipalities, key=lambda row: float(row[value_key]), reverse=True)

    top_n = []
    for requested_n in TOP_N:
        selected = descending[:requested_n]
        selected_total = sum(float(row[value_key]) for row in selected)
        top_n.append(
            {
                "requested_municipalities": quantity(requested_n, "municipality"),
                "included_municipalities": quantity(len(selected), "municipality"),
                "ch4_cumulative": quantity(selected_total, "m3_CH4/year"),
                "state_total_cumulative": quantity(
                    100.0 * selected_total / state_total if state_total else 0.0,
                    "percent",
                ),
            }
        )

    concentration_thresholds = []
    for threshold in CONCENTRATION_THRESHOLDS_PERCENT:
        cumulative = 0.0
        included = 0
        for row in descending:
            cumulative += float(row[value_key])
            included += 1
            if not state_total or 100.0 * cumulative / state_total >= threshold:
                break
        concentration_thresholds.append(
            {
                "target": quantity(threshold, "percent"),
                "municipalities_required": quantity(included, "municipality"),
                "ch4_cumulative": quantity(cumulative, "m3_CH4/year"),
                "state_total_cumulative": quantity(
                    100.0 * cumulative / state_total if state_total else 0.0,
                    "percent",
                ),
            }
        )

    region_totals: dict[tuple[str, str], float] = defaultdict(float)
    region_counts: dict[tuple[str, str], int] = defaultdict(int)
    for row in municipalities:
        key = (row["intermediate_region_code"], row["intermediate_region_name"])
        region_totals[key] += float(row[value_key])
        region_counts[key] += 1

    regions = [
        {
            "intermediate_region_code": code,
            "intermediate_region_name": name,
            "municipalities": quantity(region_counts[(code, name)], "municipality"),
            "ch4": quantity(total, "m3_CH4/year"),
            "state_total": quantity(100.0 * total / state_total if state_total else 0.0, "percent"),
        }
        for (code, name), total in sorted(
            region_totals.items(), key=lambda item: item[1], reverse=True
        )
    ]

    return {
        "metric": "ch4_practical",
        "lorenz_curve": lorenz_curve(values),
        "gini": quantity(gini(values), "dimensionless_0_to_1"),
        "top_n": top_n,
        "concentration_thresholds": concentration_thresholds,
        "by_ibge_intermediate_region": regions,
    }
