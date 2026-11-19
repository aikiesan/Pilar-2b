"""Guards for analysis/build_bacias_aterro.py.

The catchments come straight from the CETESB `Dispoe_em` field. These tests fail
if a CETESB name stops matching an IBGE municipality, if an alias points to a
name the IBGE list does not have, if a new `Dispoe_em` form would be read
silently, or if a municipality could land in two catchments.
"""

import csv
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("bacias", ROOT / "analysis" / "build_bacias_aterro.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)
R = C.R
D = R.load(R.DIGESTATE, "digestate")
NAMES = D.names()
BY_NAME = {R.norm(n): c for c, n in NAMES.items()}
YEARS = ("2022", "2023", "2024")


@pytest.mark.parametrize("text, expected", [
    ("Caieiras - A.P.", [("Caieiras", "A.P.")]),
    ("São Paulo - CDR", [("São Paulo", "CDR")]),
    ("Pariquera-Açu", [("Pariquera-Açu", "")]),
    ("Uberaba - MG", [("Uberaba", "MG")]),
    ("Jambeiro - A.P., Santos - A.P.", [("Jambeiro", "A.P."), ("Santos", "A.P.")]),
    ("", []),
])
def test_parse_destinations(text, expected):
    assert C.parse_destinations(text) == expected


def test_unknown_suffix_is_refused():
    with pytest.raises(ValueError):
        C.parse_destinations("Caieiras - XYZ")


def test_aliases_point_to_ibge_names_only():
    ibge = set(NAMES.values())
    for cetesb, target in C.ALIASES.items():
        assert target in ibge and cetesb not in ibge


@pytest.mark.parametrize("ano", YEARS)
def test_every_cetesb_name_matches_an_ibge_municipality(ano):
    records, unmatched = C.read_iqr(C.IQR, ano, BY_NAME)
    assert unmatched == []
    assert len(records) == len({r["ibge_code"] for r in records}) == 645


@pytest.mark.parametrize("ano", YEARS)
def test_each_municipality_is_in_one_catchment_or_listed_apart(ano):
    records, _ = C.read_iqr(C.IQR, ano, BY_NAME)
    groups = C.catchments(records)
    inside = [r["ibge_code"] for recs in groups.values() for r in recs]
    assert len(inside) == len(set(inside))
    outside = {r["ibge_code"] for r in records if r["situacao"] not in ("proprio", "outro_sp")}
    assert set(inside) | outside == {r["ibge_code"] for r in records}
    assert not set(inside) & outside
    for (code, suffix), recs in groups.items():
        assert code in NAMES and suffix in C.SP_SUFFIXES
        assert all(r["destinos"] == [(code, r["destinos"][0][1], suffix)] for r in recs)


def test_situation_follows_the_cetesb_field():
    with C.IQR.open(encoding="utf-8") as fh:
        raw = {r["nome"]: r for r in csv.DictReader(fh) if r["ano"] == "2024"}
    records, _ = C.read_iqr(C.IQR, "2024", BY_NAME)
    for r in records:
        dispoe = raw[r["nome_cetesb"]]["dispoe_em"]
        if not dispoe:
            assert r["situacao"] == "sem_destino"
        elif "," in dispoe:
            assert r["situacao"] == "multiplo"
        elif dispoe.rsplit(" - ", 1)[-1] in C.OTHER_UFS:
            assert r["situacao"] == "fora_sp"
        if raw[r["nome_cetesb"]]["iqr"] == "-1":
            assert r["iqr"] is None


def test_catchment_is_the_sum_of_its_members():
    S = D.load_scenario_module()
    A = R.atlas_landfill()
    with D.MASTER.open(encoding="utf-8-sig") as fh:
        master = {r["CD_GEOCODI"].strip(): r for r in csv.DictReader(fh)}
    records, _ = C.read_iqr(C.IQR, "2024", BY_NAME)
    groups = C.catchments(records)
    key = max(groups, key=lambda k: len(groups[k]))
    members = [{"ibge_code": r["ibge_code"], "municipio": ""} for r in groups[key]]
    row, mem = R.block_row(S, D, A, "x", "x", members, master, None, 15_000.0, None)
    assert row["membros"] == len(mem) == len(groups[key])
    n = len(mem)
    assert row["ch4_aterro_nm3_dia"] == pytest.approx(sum(m["ch4_aterro_nm3_dia"] for m in mem), abs=n)
    assert row["ch4_digestao_nm3_dia"] == pytest.approx(sum(m["ch4_digestao_nm3_dia"] for m in mem), abs=n)


def test_cp2b_steps_need_the_verified_snapshot(tmp_path, monkeypatch):
    B = R.load(R.RECONCILIATION, "biogram_reconciliation")
    monkeypatch.setattr(B, "CP2B_SNAPSHOT", tmp_path)
    assert C.cp2b_rsu_steps(B) == (None, {})
    (tmp_path / B.loader_constant("FILES")["levels"]).write_text("ibge_code,substrate\n", encoding="utf-8")
    assert C.cp2b_rsu_steps(B) == (None, {})  # wrong checksum: refused, never read


def test_deduction_share_by_intermediate_region():
    muns = {"1": {"nm_rgint": "A"}, "2": {"nm_rgint": "A"}, "3": {"nm_rgint": "B"}}
    steps = {
        "1": {"n3_antes": 100.0, "uso_existente": 75.0},
        "2": {"n3_antes": 40.0, "uso_existente": 30.0},
        "3": {"n3_antes": 10.0, "uso_existente": 0.0},
        "4": {"n3_antes": 0.0, "uso_existente": 0.0},
    }
    assert C.deduction_by_region(steps, muns) == {"A": (0.75, 0.75), "B": (0.0, 0.0)}
