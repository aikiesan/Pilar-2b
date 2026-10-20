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
    panel = M.panel(_params([_row("01/2026", "SP", 31)]))
    assert panel["route_switch"] is None
    assert panel["revenue_stack"] is None


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


def _stack_params():
    return {
        "m3_por_cgob": 100,
        "troca_de_rota": _route_params(),
        "pilha_de_receitas": {
            "fossil_referencia_g_co2e_mj": 100.0,
            "precos_cbio": [{"chave": "c", "brl": 50.0}],
            "densidade_co2_kg_m3": 2.0,
            "digestato_valor_por_destino": {"ja_reciclado": 0.8, "reposicao": 0.15, "novo": 0.05},
            "url_regra_cgob": "u",
            "url_critica_cgob_cbio": "u",
            "url_cbio": "u",
            "url_fossil_referencia": "u",
            "url_mercado_cativo_verde": "u",
        },
    }


def test_cbio_ceiling_is_the_fossil_reference_times_the_energy():
    r = M.revenue_stack(_stack_params())
    # 10 kWh = 36 MJ per m³; 36 MJ × 100 g/MJ = 3.6 kg = 0.0036 CBIO.
    assert r["cbio_per_m3_max"] == pytest.approx(0.0036)
    assert r["cbio_prices"][0]["brl_m3_max"] == pytest.approx(0.18)


def test_biogenic_co2_per_m3_of_methane_runs_from_rich_to_lean_biogas():
    low, high = M.revenue_stack(_stack_params())["co2_kg_per_m3"]
    # 70 % CH4: 0.3/0.7 m³ CO2 per m³ CH4; 50 %: 1 m³; at 2 kg/m³.
    assert low == pytest.approx(0.3 / 0.7 * 2.0)
    assert high == pytest.approx(2.0)


def test_canonical_revenue_stack():
    params = load_mandate_params()
    r = M.panel(params)["revenue_stack"]
    # Molecule and attribute are the route card's, never a second copy.
    assert r["molecule_brl_m3"] == params["troca_de_rota"]["molecula_brl_m3"]
    assert r["attribute_brl_m3"] == params["troca_de_rota"]["atributo_referencia_brl_m3"]
    assert r["cbio_per_m3_max"] == pytest.approx(0.0031, abs=1e-4)
    by = {c["key"]: c["brl_m3_max"] for c in r["cbio_prices"]}
    assert by["jan_fev_2026"] == pytest.approx(0.10, abs=0.01)
    assert by["media_2025"] == pytest.approx(0.17, abs=0.01)
    assert r["co2_kg_per_m3"] == pytest.approx([1.06, 1.62], abs=0.01)
    assert sum(r["digestate_value_share"].values()) == pytest.approx(1.0)
