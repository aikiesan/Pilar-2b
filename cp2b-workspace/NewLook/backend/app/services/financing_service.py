"""
Financing observatory: what a m³/day of biomethane capacity costs in Brazil
(Estratégia 2027, C18), from public BNDES approvals.

For each project, or project group when only a joint total was published:

    capex_brl_per_m3d = total investment ÷ capacity
                        (the BNDES financing alone when no total was published:
                        a lower bound, flagged `lower_bound`)
    levelized         = capex × CRF(rate, life) ÷ (365 × capacity factor)
                        R$ per m³ produced, capital only (no O&M, no feedstock)

Inputs live in data/canonical_parameters: bndes_biometano_operacoes.csv (one
source per row) and financiamento_biometano.yaml (assumptions, joint totals).
`read` is the only I/O; it needs nothing from the app, so the analysis
prototype loads this file directly.
"""

from __future__ import annotations

import csv
from pathlib import Path

DEALS_CSV = "bndes_biometano_operacoes.csv"
PARAMS_YAML = "financiamento_biometano.yaml"
DAYS_PER_YEAR = 365


def read(directory: Path) -> dict:
    """The YAML, with the CSV rows under `operacoes`."""
    import yaml

    params = yaml.safe_load((directory / PARAMS_YAML).read_text(encoding="utf-8"))
    with (directory / DEALS_CSV).open(encoding="utf-8") as fh:
        params["operacoes"] = list(csv.DictReader(fh))
    return params


def crf(rate: float, years: int) -> float:
    """Capital recovery factor."""
    return rate / (1 - (1 + rate) ** -years)


def _num(value: str | None) -> float | None:
    return float(value) if value not in (None, "") else None


def _sum(values: list[float | None]) -> float | None:
    known = [v for v in values if v is not None]
    return sum(known) if known else None


def _entry(deals: list[dict], investment_mi: float, basis: str, assumptions: dict) -> dict:
    capacity = sum(float(d["capacidade_m3_dia"]) for d in deals)
    capex = investment_mi * 1e6 / capacity
    years, cf = assumptions["vida_util_anos"]["valor"], assumptions["fator_capacidade"]["valor"]
    return {
        "project": " + ".join(d["projeto"] for d in deals),
        "uf": "/".join(d["uf"] for d in deals),
        "municipality": "/".join(d["municipio"] for d in deals),
        "route": deals[0]["rota"],
        "route_key": deals[0]["rota"].split()[0],
        "capacity_m3_day": capacity,
        "basis": basis,
        "lower_bound": basis == "financing",
        "capex_brl_per_m3d": capex,
        "levelized": [
            {"rate": r, "brl_per_m3": capex * crf(r, years) / (DAYS_PER_YEAR * cf)}
            for r in assumptions["taxas_capital"]["valores"]
        ],
        "bndes_mi_brl": _sum([_num(d["financiamento_bndes_mi_brl"]) for d in deals]),
        "fundo_clima_mi_brl": _sum([_num(d["fundo_clima_mi_brl"]) for d in deals]),
        "approved": max(d["data_aprovacao"] for d in deals),
        "sources": sorted({d["fonte_url"] for d in deals}),
    }


def benchmarks(params: dict) -> list[dict]:
    """One entry per project or joint-total group, cheapest per m³/d first."""
    assumptions = params["premissas"]
    deals = params["operacoes"]
    out = []
    for group, spec in (params.get("grupos_investimento") or {}).items():
        members = [d for d in deals if d["grupo_investimento"] == group]
        if not members:
            raise ValueError(f"investment group {group!r} names no deal")
        out.append(_entry(members, spec["investimento_total_mi_brl"], "joint_total", assumptions))
    for d in deals:
        if d["grupo_investimento"]:
            continue
        total = _num(d["investimento_total_mi_brl"])
        if total is None:
            out.append(_entry([d], _num(d["financiamento_bndes_mi_brl"]), "financing", assumptions))
        else:
            out.append(_entry([d], total, "total", assumptions))
    return sorted(out, key=lambda b: b["capex_brl_per_m3d"])


def summary(params: dict) -> dict:
    """The observatory: projects, the CAPEX range per route, and the totals."""
    projects = benchmarks(params)
    by_route: dict[str, list[float]] = {}
    for b in projects:
        if not b["lower_bound"]:
            by_route.setdefault(b["route_key"], []).append(b["capex_brl_per_m3d"])
    deals = params["operacoes"]
    a = params["premissas"]
    return {
        "version": params["versao"],
        "assumptions": {
            "rates": a["taxas_capital"]["valores"],
            "life_years": a["vida_util_anos"]["valor"],
            "capacity_factor": a["fator_capacidade"]["valor"],
        },
        "projects": projects,
        "by_route": {
            k: {"n": len(v), "capex_min": min(v), "capex_max": max(v)} for k, v in by_route.items()
        },
        "totals": {
            "deals": len(deals),
            "bndes_mi_brl": _sum([_num(d["financiamento_bndes_mi_brl"]) for d in deals]),
            "fundo_clima_mi_brl": _sum([_num(d["fundo_clima_mi_brl"]) for d in deals]),
            "capacity_m3_day": sum(float(d["capacidade_m3_dia"]) for d in deals),
        },
    }
