"""Guards for analysis/build_biogram_reconciliation.py.

    pytest tests/test_biogram_reconciliation.py -v
"""

import importlib.util
import math
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_biogram_reconciliation.py"
_spec = importlib.util.spec_from_file_location("biogram_recon", SCRIPT)
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)


@pytest.fixture(scope="module")
def built():
    S = R.load_scenario_module()
    muns = R.municipalities()
    return S, muns, R.atlas_real_by_municipality(S, muns), R.build_areas(muns)


def test_crosswalk_covers_every_cp2b_substrate_once():
    subs = [s for c, (ss, _) in R.CATEGORIES.items() for s in ss]
    assert sorted(subs) == sorted(R.loader_constant("SUBSTRATES"))


def test_crosswalk_covers_every_atlas_flow_once(built):
    S = built[0]
    flows = [f for c, (_, ff) in R.CATEGORIES.items() for f in ff]
    assert sorted(flows) == sorted(S.calcular([], "real"))


def test_atlas_allocation_preserves_published_state_total(built):
    _, _, atlas, areas = built
    state = R.aggregate(areas[0]["members"], atlas, None)
    assert round(state[R.TOTAL]["atlas"]) == 7_832_143_834


def test_regions_partition_the_state(built):
    _, muns, atlas, areas = built
    regions = [a for a in areas if a["tipo"] == "regiao_intermediaria"]
    assert len(regions) == 11
    assert sum(len(a["members"]) for a in regions) == len(muns) == 645
    total = sum(R.aggregate(a["members"], atlas, None)[R.TOTAL]["atlas"] for a in regions)
    assert math.isclose(total, R.aggregate(areas[0]["members"], atlas, None)[R.TOTAL]["atlas"], rel_tol=1e-12)


def test_every_site_contains_its_own_municipality(built):
    _, muns, _, areas = built
    sites = [a for a in areas if a["tipo"] == "sitio"]
    assert len(sites) == R.TOP_SITES
    assert all(a["members"] for a in sites)


def test_unit_conversion():
    lhv = 9.94
    assert R.nm3_per_unit("bi_Nm3_ch4_ano", lhv) == 1e9
    assert math.isclose(R.nm3_per_unit("PJ_ano", lhv), 1e15 / (lhv * 3.6e6))
    assert math.isclose(R.nm3_per_unit("GWh_ano", lhv), 1e6 / lhv)
    assert math.isclose(R.nm3_per_unit("bcme_ano", lhv), 36 * R.nm3_per_unit("PJ_ano", lhv))
    with pytest.raises(ValueError):
        R.nm3_per_unit("m3", lhv)


LEVELS = {"atlas": 2.0e9, "n1": 10e9, "n2": 6e9, "n3": 3e9, "n4": 2.5e9}


@pytest.mark.parametrize("bg, escopo, expected", [
    (None, "", "sem dado BioGRAM"),
    (3.2e9, "", "concorda"),
    (9e9, "", "disponibilidade"),
    (1.0e9, "", "parâmetro"),
    (5e9, "excluido", "escopo"),
])
def test_classify_with_cp2b(bg, escopo, expected):
    assert R.classify(bg, LEVELS, escopo) == expected


def test_classify_without_cp2b_falls_back_to_atlas():
    p = {"atlas": 2.0e9, **dict.fromkeys(R.LEVELS)}
    assert R.classify(2.2e9, p) == "concorda"
    assert R.classify(9e9, p) == "parâmetro ou disponibilidade (sem CP2b)"
    assert R.classify(1e8, {"atlas": 0.0, **dict.fromkeys(R.LEVELS)}) == "escopo"


def test_seed_keeps_typed_values(tmp_path, monkeypatch, built):
    areas = built[3]
    monkeypatch.setattr(R, "SEED", tmp_path / "seed.csv")
    rows = R.sync_seed(areas)
    assert len(rows) == len(areas) * len(R.ALL_CATEGORIES)
    text = R.SEED.read_text(encoding="utf-8").replace("SP,estado,São Paulo,total,1,,", "SP,estado,São Paulo,total,1,123,")
    R.SEED.write_text(text, encoding="utf-8")
    again = {(r["area_id"], r["categoria"]): r for r in R.sync_seed(areas)}
    assert again[("SP", "total")]["biogram_valor"] == "123"
