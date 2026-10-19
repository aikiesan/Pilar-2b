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
