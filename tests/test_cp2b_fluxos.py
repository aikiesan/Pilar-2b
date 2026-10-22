"""Guards for analysis/build_cp2b_fluxos.py.

The comparison reads the Atlas Real chain from the scenario module and the CP2b
substrates from the loader's own list. These tests fail if a stream points to a
flow or substrate that no longer exists, if the per-municipality Atlas values
stop adding up to the state, or if the step factors stop multiplying to N4 ÷ Atlas.
"""

import csv
import importlib.util
import math
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cp2b_fluxos", ROOT / "analysis" / "build_cp2b_fluxos.py")
F = importlib.util.module_from_spec(spec)
spec.loader.exec_module(F)
B = F.B
S = B.load_scenario_module()
ROWS = list(csv.DictReader(B.MASTER.open(encoding="utf-8-sig")))


def test_streams_point_to_existing_flows_columns_and_substrates():
    flows = S.calcular(ROWS[:1], "real")
    subs = B.loader_constant("SUBSTRATES")
    used = [s for v in F.STREAMS.values() for s in v[2]]
    assert len(used) == len(set(used)), "a CP2b substrate in two streams"
    for key, (_, atlas_flows, cp2b_subs, base_col, _) in F.STREAMS.items():
        assert all(f in flows for f in atlas_flows), key
        assert all(s in subs and not subs[s][2] for s in cp2b_subs), key
        assert base_col in ROWS[0], key


def test_municipal_atlas_adds_up_to_the_state():
    by_mun = F.atlas_by_municipality(S, ROWS)
    state = S.calcular(ROWS, "real")
    for key, (_, flows, *_rest) in F.STREAMS.items():
        assert sum(m[key] for m in by_mun.values()) == pytest.approx(sum(state[f] for f in flows), rel=1e-9)


def test_factors_multiply_to_n4_over_atlas():
    row = {"atlas": 100.0, "n1": 150.0, "n2": 90.0, "n3_antes": 81.0, "uso_existente": 21.0, "n3": 60.0, "n4": 48.0}
    f = F.factors(row)
    assert math.prod(f.values()) == pytest.approx(row["n4"] / row["atlas"])
    assert F.main_step(f) == "FC"  # 0.6 is the furthest from 1


def test_atlas_chain_is_written_from_the_module_constants():
    m = F.atlas_method(S)
    assert set(m) == set(F.STREAMS)
    assert F.num(S.TORTA_BMP) in m["torta"] and F.num(S.ESGOTO_PCH4) in m["esgoto"]


def test_cp2b_side_needs_the_verified_snapshot(tmp_path, monkeypatch):
    monkeypatch.setattr(B, "CP2B_SNAPSHOT", tmp_path)
    assert F.cp2b_steps()[0] is None
    (tmp_path / B.loader_constant("FILES")["levels"]).write_text("ibge_code,substrate,scenario\n", encoding="utf-8")
    cp, note = F.cp2b_steps()
    assert cp is None and "recusado" in note
    state, regions = F.build(S, ROWS, B.municipalities(), None)
    text = "\n".join(F.report(state, regions, [], S, note, False))
    assert "Sem o snapshot CP2b verificado" in text and "N4 ÷ Atlas" not in text
