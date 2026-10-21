"""Guards for analysis/build_sp_green_corridors.py (C24)."""

import csv
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "analysis" / "build_sp_green_corridors.py"
_spec = importlib.util.spec_from_file_location("sp_green_corridors", SCRIPT)
G = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(G)
M = G.load(G.C25, "sp_biolng_santos")
B = G.load(M.RECONCILIATION, "biogram_reconciliation")


def test_point_segment_distance():
    a, b = (-23.0, -47.0), (-23.0, -46.0)
    assert G.point_segment_km((-23.0, -46.5), a, b) == pytest.approx(0.0, abs=1e-9)
    # 0.1° of latitude off the middle of the segment is 11.1 km.
    assert G.point_segment_km((-22.9, -46.5), a, b) == pytest.approx(11.12, abs=0.05)
    # Beyond an end, the distance is to that end, not to the infinite line.
    beyond = (-23.0, -45.5)
    assert G.point_segment_km(beyond, a, b) == pytest.approx(B.haversine_km(*beyond, *b), rel=0.01)


def test_every_station_and_anchor_has_an_ibge_code():
    index = G.name_index()
    counts, n = G.stations_by_municipality(index)
    with G.STATIONS.open(encoding="utf-8") as fh:
        assert n == sum(1 for _ in csv.DictReader(fh)) == sum(counts.values())
    muns = B.municipalities()
    assert set(counts) <= set(muns)
    for _roads, anchors in G.CORRIDORS.values():
        assert all(G.norm(a) in index and index[G.norm(a)] in muns for a in anchors)
    assert index[G.norm("São Paulo")] == G.CAPITAL


def test_plants_that_barely_deliver_do_not_count_as_supply():
    plants = G.plants(M, 0.6)
    names = {p["planta"]: p for p in plants}
    assert not any(n.startswith("Gasgrid") for n in names)
    assert not G.producing(names["Biometano Verde Paulínia (OneBio)"])
    assert G.producing(names["Essencis Biometano (Caieiras)"])


def test_corridor_counts_are_consistent():
    muns = B.municipalities()
    index = G.name_index()
    counts, n = G.stations_by_municipality(index)
    rows = G.corridor_rows(B, M, muns, index, counts, G.plants(M, 0.6), {}, None)
    assert [r["corredor"] for r in rows] == list(G.CORRIDORS)
    for r in rows:
        assert 0 <= r["postos_sem_planta_50km"] <= r["postos_gnv"] <= n
        assert r["postos_gnv_fora_da_capital"] <= r["postos_gnv"]
        assert r["plantas_produzindo"] <= r["plantas_anp"]
        assert r["extensao_km"] > 0 and r["cp2b_n3_m3_dia"] is None
    # The capital's stations sit on the corridors that start there.
    dutra = next(r for r in rows if r["corredor"] == "Dutra")
    assert dutra["postos_gnv"] - dutra["postos_gnv_fora_da_capital"] == counts[G.CAPITAL]


def test_truck_order_of_magnitude():
    # 29 kg/100 km at 0.667 kg/m³ is about 0.43 m³/km.
    assert G.truck_m3_day(M) == pytest.approx(0.29 / M.CH4_KG_M3 * G.TRUCK_KM_DAY)
