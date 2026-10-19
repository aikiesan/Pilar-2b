"""Guards for analysis/build_biogram_national_share.py.

    pytest tests/test_biogram_national_share.py -v
"""

import csv
import importlib.util
import math
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_biogram_national_share.py"
_spec = importlib.util.spec_from_file_location("biogram_share", SCRIPT)
N = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(N)


@pytest.fixture(scope="module")
def sp():
    return N.sp_totals()


def test_tabs_cover_every_biogram_group_once():
    bra = N.R.biogram_national("BRA")
    groups = [g for t, gs in N.TABS.items() if t != N.R.TOTAL for g in gs]
    assert sorted(groups) == sorted(k for k in bra if k != "Total")
    assert sorted(N.TABS[N.R.TOTAL]) == sorted(groups)
    assert set(N.TABS) == set(N.R.MAP_GROUPS)


def test_national_totals_come_from_the_ingest_gates():
    assert N.published_national("pam_1612", "sugarcane_production_t") == 782_000_000
    assert N._literal(N.DEMOGRAPHICS, "PUBLISHED_CENSO_POPULATION") == 203_080_756


def test_seed_columns_exist_in_the_sp_master(sp):
    seeded = {r["indicador"]: r["coluna_sp"] for r in N.national_seed().values()}
    used = {src[1]: col for items in N.CROP_GROUPS.values() for col, src in items if src[0] == "seed"}
    used |= {src[1]: col for col, src in N.HERDS.values() if src[0] == "seed"}
    assert used == seeded
    assert set(seeded.values()) <= set(sp)


def test_share_bounds_are_ordered_and_sugarcane_is_exact(sp):
    share = N.shares(sp, N.national_seed())
    assert set(share) == set(N.TABS[N.R.TOTAL])
    assert all(0 < s["low"] <= s["high"] < 1 for s in share.values())
    assert math.isclose(share["Sugar crops"]["low"], sp["prod_t_Cana_de_açúcar"] / 782_000_000)


def test_filling_the_seed_makes_the_share_exact(sp):
    seed = N.national_seed()
    for k in ("arroz", "trigo", "sorgo"):
        seed[k] = {**seed[k], "valor_brasil": "10000000"}
    s = N.shares(sp, seed)["Cereals and grains"]
    assert s["low"] == s["high"]
    cols = [c for c, _ in N.CROP_GROUPS["Cereals and grains"]]
    assert math.isclose(s["low"], sum(sp[c] for c in cols) / (131_900_000 + 3 * 10_000_000))


def test_expected_total_is_the_sum_of_the_tabs(sp):
    exp = N.expected(N.shares(sp, N.national_seed()), N.R.biogram_national("BRA"))
    parts = [v for t, v in exp.items() if t != N.R.TOTAL]
    assert math.isclose(exp[N.R.TOTAL][0], sum(lo for lo, _ in parts))
    assert math.isclose(exp[N.R.TOTAL][1], sum(hi for _, hi in parts))


def test_position():
    assert N.position(5, 6, 8) == "-17% abaixo da faixa"
    assert N.position(7, 6, 8) == "dentro da faixa"
    assert N.position(9, 6, 8) == "+12% acima da faixa"
