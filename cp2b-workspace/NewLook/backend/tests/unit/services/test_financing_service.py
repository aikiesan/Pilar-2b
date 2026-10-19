"""Financing observatory (C18): CAPEX per m³/d from the BNDES deals in canonical_parameters."""

import pytest

from app.services import financing_service as F
from app.services.canonical_loader import load_financing_params


@pytest.fixture(scope="module")
def params():
    return load_financing_params()


def _deal(name, cap, total="", financing="", group="", rota="aterro"):
    return {
        "projeto": name,
        "uf": "SP",
        "municipio": name,
        "rota": rota,
        "financiamento_bndes_mi_brl": financing,
        "fundo_clima_mi_brl": "",
        "investimento_total_mi_brl": total,
        "grupo_investimento": group,
        "capacidade_m3_dia": str(cap),
        "data_aprovacao": "2026-01",
        "fonte_url": f"https://example.org/{name}",
    }


ASSUMPTIONS = {
    "taxas_capital": {"valores": [0.10]},
    "vida_util_anos": {"valor": 20},
    "fator_capacidade": {"valor": 0.90},
}


def test_capital_recovery_factor():
    assert F.crf(0.10, 20) == pytest.approx(0.11746, rel=1e-4)


def test_every_deal_has_a_source_a_capacity_and_a_known_route(params):
    for d in params["operacoes"]:
        assert d["fonte_url"].startswith("https://")
        assert float(d["capacidade_m3_dia"]) > 0
        assert d["rota"].split()[0] in {"aterro", "agroindustrial"}
        assert d["investimento_total_mi_brl"] or d["financiamento_bndes_mi_brl"] or d["grupo_investimento"]


def test_basis_total_beats_financing_and_groups_share_one_total():
    params = {
        "premissas": ASSUMPTIONS,
        "grupos_investimento": {"g": {"investimento_total_mi_brl": 30.0}},
        "operacoes": [
            _deal("a", 10_000, total="20"),
            _deal("b", 10_000, financing="10"),
            _deal("c", 5_000, financing="9", group="g"),
            _deal("d", 5_000, financing="9", group="g"),
        ],
    }
    by = {b["project"]: b for b in F.benchmarks(params)}
    assert by["a"]["basis"] == "total" and by["a"]["capex_brl_per_m3d"] == pytest.approx(2000)
    assert by["b"]["lower_bound"] and by["b"]["capex_brl_per_m3d"] == pytest.approx(1000)
    group = by["c + d"]
    assert group["basis"] == "joint_total" and group["capex_brl_per_m3d"] == pytest.approx(3000)
    assert group["bndes_mi_brl"] == 18 and group["fundo_clima_mi_brl"] is None
    levelized = by["a"]["levelized"][0]["brl_per_m3"]
    assert levelized == pytest.approx(2000 * F.crf(0.10, 20) / (365 * 0.90))


def test_a_group_without_deals_is_an_error():
    params = {
        "premissas": ASSUMPTIONS,
        "grupos_investimento": {"ghost": {"investimento_total_mi_brl": 1.0}},
        "operacoes": [_deal("a", 1, total="1")],
    }
    with pytest.raises(ValueError):
        F.benchmarks(params)


def test_summary_ranges_leave_lower_bounds_out(params):
    s = F.summary(params)
    assert s["totals"]["deals"] == len(params["operacoes"])
    landfill = [p for p in s["projects"] if p["route_key"] == "aterro" and not p["lower_bound"]]
    assert s["by_route"]["aterro"]["n"] == len(landfill)
    assert s["by_route"]["aterro"]["capex_min"] == min(p["capex_brl_per_m3d"] for p in landfill)
    # The agro-industrial plants include the digester, so they cost more per m³/d.
    assert s["by_route"]["agroindustrial"]["capex_min"] > s["by_route"]["aterro"]["capex_max"]
