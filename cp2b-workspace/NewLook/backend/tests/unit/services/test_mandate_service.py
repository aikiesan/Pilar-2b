"""Mandate panel (C26): published targets, indicative ones scaled, coverage from ANP."""

import pytest

from app.services import mandate_service as M
from app.services.canonical_loader import load_mandate_params

SOURCES = {
    "f": {
        "titulo": "t",
        "curta": "c",
        "autor": "a",
        "data": "2026-10",
        "url": "https://x",
        "tipo": "oficial",
    },
    "g": {
        "titulo": "t",
        "curta": "c",
        "autor": "PILAR-2b",
        "data": "2026-10",
        "url": None,
        "tipo": "estimativa",
    },
}


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
        "producao": {"fontes": ["f"], "linhas": rows},
        "cgob": {"registro_publico": False, "fontes": ["f"]},
        "fontes": SOURCES,
        "fontes_verificadas_em": "2026-10-20",
        "fontes_painel": ["f"],
        "onde_conferir": ["f"],
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
        "purificacao_eur_mwh": 20.0,
        "brl_por_eur": 5.0,
        "precos_eletricidade": [{"chave": f"p{i}", "brl_mwh": p} for i, p in enumerate(prices)],
        "biogas_sp_m3_dia": 1000,
        "fracao_ch4": [0.5, 0.7],
        "fontes": {"molecula": ["f"], "autoconsumo": ["g"]},
    }


def test_both_routes_pay_the_same_at_the_breakeven_attribute():
    r = M.route_switch({"troca_de_rota": _route_params(), "fontes": SOURCES})
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
    assert [x["key"] for x in r["references"]["molecula"]] == ["f"]
    assert r["references"]["autoconsumo"][0]["url"] is None


def test_references_resolve_in_order_and_refuse_unknown_keys_or_kinds():
    refs = M.references({"fontes": SOURCES}, ["g", "f"])
    assert [r["key"] for r in refs] == ["g", "f"]
    assert refs[1] == {
        "key": "f",
        "title": "t",
        "short": "c",
        "publisher": "a",
        "date": "2026-10",
        "url": "https://x",
        "kind": "oficial",
        "note": None,
    }
    with pytest.raises(ValueError):
        M.references({"fontes": SOURCES}, ["missing"])
    with pytest.raises(ValueError):
        M.references({"fontes": {"h": {**SOURCES["f"], "tipo": "blog"}}}, ["h"])


def test_every_canonical_source_is_used_dated_and_linked():
    params = load_mandate_params()
    registry = params["fontes"]
    used = set(params["fontes_painel"]) | set(params["onde_conferir"])
    used |= set(params["producao"]["fontes"]) | set(params["cgob"]["fontes"])
    used |= {t["fonte"] for t in params["metas"]}
    for block in ("troca_de_rota", "pilha_de_receitas", "co2_biogenico"):
        for keys in params[block]["fontes"].values():
            used |= set(keys)
    # Every figure cites a registered source, and every registered source is cited.
    assert used == set(registry)
    for key, f in registry.items():
        assert f["titulo"] and f["autor"] and str(f["data"])[:4].isdigit(), key
        # The short citation sits on the button beside each figure.
        assert 0 < len(f["curta"]) <= 32, key
        # Only the platform's own assumptions go without a link.
        if f["tipo"] == "estimativa":
            assert f["url"] is None, key
        else:
            assert f["url"].startswith("https://"), key
    # The panel resolves them all without error.
    panel = M.panel(params)
    assert panel["sources_checked"] == "2026-10-20"
    assert {r["key"] for r in panel["where_to_check"]} <= set(registry)


def test_at_the_threshold_price_no_attribute_is_needed():
    r = M.route_switch({"troca_de_rota": _route_params(), "fontes": SOURCES})
    at = M.route_switch(
        {"troca_de_rota": _route_params(prices=(r["threshold_brl_mwh"],)), "fontes": SOURCES}
    )
    assert at["prices"][0]["breakeven_attribute_brl_m3"] == pytest.approx(0.0, abs=1e-12)
    assert r["threshold_brl_mwh"] == pytest.approx(250)


def test_panel_without_route_parameters_still_works():
    panel = M.panel(_params([_row("01/2026", "SP", 31)]))
    assert panel["route_switch"] is None
    assert panel["revenue_stack"] is None
    assert panel["biogenic_co2"] is None


def test_canonical_route_switch():
    r = M.panel(load_mandate_params())["route_switch"]
    # 9.94 kWh × € 25/MWh × R$ 5.8/€.
    assert r["upgrading_brl_m3"] == pytest.approx(1.44, abs=0.01)
    # Green Captive Market molecule (Arsesp Del. 1.846/2026): R$ 2.25 − 1.44 over 3.78 kWh/m³.
    assert r["threshold_brl_mwh"] == pytest.approx(214, abs=1)
    by = {row["electricity_brl_mwh"]: row["breakeven_attribute_brl_m3"] for row in r["prices"]}
    # The low and mid PLD sit below the threshold; the high one just above it.
    assert by[135] < 0 and by[190] < 0
    assert by[225] == pytest.approx(0.04, abs=0.01)
    assert by[450] == pytest.approx(0.89, abs=0.01)
    # Even the self-consumption case needs less than the Green Captive Market attribute.
    assert by[450] < r["reference_attribute_brl_m3"]
    assert r["sp_burned_ch4_m3_day"] == pytest.approx(2.94e6)
    # The inputs the page shows rebuild the figures it shows.
    i = r["inputs"]
    assert i["lhv_kwh_m3"] * i["upgrading_eur_mwh"] * i["brl_per_eur"] / 1000 == pytest.approx(
        r["upgrading_brl_m3"]
    )
    yield_mwh = i["lhv_kwh_m3"] * i["electric_efficiency"] / 1000
    assert (r["molecule_brl_m3"] - r["upgrading_brl_m3"]) / yield_mwh == pytest.approx(
        r["threshold_brl_mwh"]
    )
    assert i["sp_biogas_m3_day"] * sum(i["ch4_fraction"]) / 2 == pytest.approx(
        r["sp_burned_ch4_m3_day"]
    )


def _stack_params():
    return {
        "m3_por_cgob": 100,
        "troca_de_rota": _route_params(),
        "pilha_de_receitas": {
            "fossil_referencia_g_co2e_mj": 100.0,
            "precos_cbio": [{"chave": "c", "brl": 50.0}],
            "densidade_co2_kg_m3": 2.0,
            "digestato_valor_por_destino": {"ja_reciclado": 0.8, "reposicao": 0.15, "novo": 0.05},
            "fontes": {"cbio": ["f"]},
        },
        "fontes": SOURCES,
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
    # CO2 at 20 °C and 1 atm, the ANP reference (1.84 kg/m³).
    assert r["co2_kg_per_m3"] == pytest.approx([0.99, 1.51], abs=0.01)
    assert sum(r["digestate_value_share"].values()) == pytest.approx(1.0)


def _co2_params(rows):
    params = _stack_params()
    params["troca_de_rota"]["biogas_sp_m3_dia"] = 1000
    params["co2_biogenico"] = {
        "plantas": {"linhas": rows},
        "mercado_brasil_t_dia": 10,
        "unidade_cocal_t_dia": 48,
        "etanol_mt_ano": 27,
        "biogas_kt_ano": 491,
        "biogas_operando_kt_ano": 99,
        "fontes": {"mercado": ["f"]},
    }
    return params


def _plant(month, uf, name, biogas, capacity):
    return {
        "mesano": month,
        "razao_social": name,
        "uf": uf,
        "municipio": "M",
        "vol_biogas_m3d": str(biogas),
        "cap_biogas_m3d": str(capacity),
    }


def test_biogenic_co2_is_the_biogas_co2_share_times_the_density():
    rows = [
        _plant("04/2026", "SP", "a", 1000, 2000),
        _plant("04/2026", "SP", "b", 3000, 3000),
        _plant("04/2026", "RJ", "c", 9999, 9999),
        _plant("06/2022", "SP", "stale", 9999, 9999),
    ]
    c = M.biogenic_co2(_co2_params(rows))
    assert c["month"] == "2026-04"
    # Only SP plants of the latest month, largest first.
    assert [p["name"] for p in c["plants"]] == ["b", "a"]
    # 1000 m³ of biogas at 30 % and 50 % CO2 (fracao_ch4 0.7 and 0.5), 2 kg/m³.
    assert c["plants"][1]["now_t_day"] == pytest.approx([0.6, 1.0])
    assert c["plants"][1]["capacity_t_day"] == pytest.approx([1.2, 2.0])
    assert c["sp_now_t_year"] == pytest.approx([2.4 * 365, 4.0 * 365])
    assert c["sp_burned_t_year"] == pytest.approx([0.6 * 365, 1.0 * 365])
    assert c["market_t_year"] == 3650


def test_canonical_biogenic_co2():
    c = M.panel(load_mandate_params())["biogenic_co2"]
    assert c["month"] == "2026-04"
    assert len(c["plants"]) == 9  # Gasgrid's 2022 authorization is left out
    assert c["plants"][0]["municipality"] == "CAIEIRAS"
    # All the biogas SP produces, if upgraded: 1.15–1.48 Mt/yr at 1.84 kg/m³.
    assert c["sp_burned_t_year"] == pytest.approx([1.15e6, 1.48e6], rel=0.01)
    # SP plants today already separate several percent of the whole Brazilian market.
    assert 0.05 < c["sp_now_t_year"][0] / c["market_t_year"] < 0.15
    # About twice the whole market (2.0–2.5×).
    assert 1.9 < c["sp_burned_t_year"][0] / c["market_t_year"] < 2.6
