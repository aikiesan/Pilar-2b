"""Mandate panel (C26): published targets, indicative ones scaled, coverage from ANP."""

import pytest

from app.services import mandate_service as M
from app.services.canonical_loader import load_mandate_params


def _row(month, uf, m3):
    return {"mesano": month, "uf": uf, "producao_m3": str(m3)}


def _params(rows):
    return {
        "versao": "t",
        "m3_por_cgob": 100,
        "metas": [
            {
                "ano": 2026,
                "reducao_pct": 0.5,
                "volume_m3_ano": 1000,
                "volume_m3_dia": 100,
                "status": "vigente",
                "ato": "a",
                "fonte": "f",
            },
            {"ano": 2028, "reducao_pct": 3.0, "status": "indicativa", "ato": "a", "fonte": "f"},
        ],
        "producao": {"fonte": "anp", "linhas": rows},
        "cgob": {"registro_publico": False, "nota": "n"},
    }


def test_monthly_series_sums_products_and_divides_by_the_days():
    rows = [_row("02/2024", "SP", 290), _row("02/2024", "SP", 290), _row("02/2024", "PR", 290)]
    (feb,) = M.monthly_production(rows)
    assert feb == {"month": "2024-02", "br_m3_day": 30.0, "sp_m3_day": 20.0}


def test_indicative_targets_scale_the_latest_published_volume():
    goals = {t["year"]: t for t in M.targets(_params([]))}
    assert not goals[2026]["volume_estimated"] and goals[2026]["cgob_year"] == 10
    assert goals[2028]["volume_estimated"] and goals[2028]["volume_m3_day"] == pytest.approx(600)
    assert goals[2028]["cgob_year"] is None


def test_coverage_is_the_latest_month_over_each_target():
    p = M.panel(_params([_row("01/2026", "SP", 31 * 50), _row("01/2026", "RJ", 31 * 50)]))
    first = p["targets"][0]
    assert first["coverage"] == pytest.approx(1.0) and first["sp_share"] == pytest.approx(0.5)
    assert p["latest"]["sp_share_of_br"] == pytest.approx(0.5)


def test_without_a_published_volume_or_rows_it_refuses():
    params = _params([])
    with pytest.raises(ValueError):
        M.panel(params)
    params["metas"] = params["metas"][1:]
    with pytest.raises(ValueError):
        M.targets(params)


def test_canonical_targets_are_official_and_ordered():
    goals = M.targets(load_mandate_params())
    assert [t["year"] for t in goals] == sorted(t["year"] for t in goals)
    by = {t["year"]: t for t in goals}
    assert by[2026]["status"] == "vigente" and by[2026]["volume_m3_day"] == 504800
    assert by[2027]["cgob_year"] == pytest.approx(3632492)
    assert all(t["volume_estimated"] == (t["status"] == "indicativa") for t in goals)


def _route_params(prices=(100, 400)):
    return {
        "pci_ch4_kwh_m3": 10.0,
        "rendimento_eletrico": 0.4,
        "molecula_brl_m3": 2.0,
        "atributo_referencia_brl_m3": 1.0,
        "fonte_molecula_atributo": "f",
        "url_molecula_atributo": "u",
        "purificacao_eur_mwh": 20.0,
        "brl_por_eur": 5.0,
        "fonte_purificacao": "f",
        "precos_eletricidade": [{"chave": f"p{i}", "brl_mwh": p} for i, p in enumerate(prices)],
        "fonte_eletricidade": "f",
        "url_eletricidade": "u",
        "biogas_sp_m3_dia": 1000,
        "fracao_ch4": [0.5, 0.7],
        "fonte_biogas_sp": "f",
    }


def test_both_routes_pay_the_same_at_the_breakeven_attribute():
    r = M.route_switch({"troca_de_rota": _route_params()})
    # 10 kWh × 0.4 = 4 kWh of power per m³; upgrading 10/1000 MWh × €20 × 5 = R$ 1.
    assert r["upgrading_brl_m3"] == pytest.approx(1.0)
    for row in r["prices"]:
        biomethane = (
            r["molecule_brl_m3"] + row["breakeven_attribute_brl_m3"] - r["upgrading_brl_m3"]
        )
        assert biomethane == pytest.approx(row["electricity_route_brl_m3"])
    low, high = r["prices"]
    assert low["breakeven_attribute_brl_m3"] == pytest.approx(0.4 - 1.0)  # wins with no attribute
    assert high["breakeven_attribute_brl_m3"] == pytest.approx(1.6 - 1.0)
    assert r["sp_burned_ch4_m3_day"] == pytest.approx(600)


def test_at_the_threshold_price_no_attribute_is_needed():
    r = M.route_switch({"troca_de_rota": _route_params()})
    at = M.route_switch({"troca_de_rota": _route_params(prices=(r["threshold_brl_mwh"],))})
    assert at["prices"][0]["breakeven_attribute_brl_m3"] == pytest.approx(0.0, abs=1e-12)
    assert r["threshold_brl_mwh"] == pytest.approx(250)


def test_panel_without_route_parameters_still_works():
    assert M.panel(_params([_row("01/2026", "SP", 31)]))["route_switch"] is None


def test_canonical_route_switch():
    r = M.panel(load_mandate_params())["route_switch"]
    assert r["upgrading_brl_m3"] == pytest.approx(1.19, abs=0.01)
    assert r["threshold_brl_mwh"] == pytest.approx(281, abs=1)
    by = {row["electricity_brl_mwh"]: row["breakeven_attribute_brl_m3"] for row in r["prices"]}
    assert by[185] < 0 and by[250] < 0
    assert by[300] == pytest.approx(0.07, abs=0.01)
    assert by[450] == pytest.approx(0.64, abs=0.01)
    # Even the self-consumption case needs less than the attribute the tariff already pays.
    assert by[450] < r["reference_attribute_brl_m3"]
    assert r["sp_burned_ch4_m3_day"] == pytest.approx(2.94e6)
