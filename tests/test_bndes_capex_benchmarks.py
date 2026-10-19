"""Guards for analysis/build_bndes_capex_benchmarks.py and its seed CSV."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_bndes_capex_benchmarks.py"
_spec = importlib.util.spec_from_file_location("bndes", SCRIPT)
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)


def test_every_deal_has_a_source_and_capacity():
    for d in B.load_deals():
        assert d["fonte_url"].startswith("https://")
        assert float(d["capacidade_m3_dia"]) > 0


def test_joint_totals_name_existing_projects():
    names = {d["projeto"] for d in B.load_deals()}
    for group in B.JOINT_TOTALS_MI_BRL:
        assert set(group) <= names


def test_financing_only_entries_are_flagged_as_lower_bounds():
    bm = {b["projeto"]: b for b in B.benchmarks(B.load_deals())}
    onebio = next(b for n, b in bm.items() if "Onebio" in n)
    assert onebio["limite_inferior"] and onebio["base"] == "só financiamento BNDES"
    assert all(not b["limite_inferior"] for b in bm.values() if b["base"].startswith("investimento"))


def test_capital_recovery_factor():
    assert B.crf(0.10, 20) == pytest.approx(0.11746, rel=1e-4)
