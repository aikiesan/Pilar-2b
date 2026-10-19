"""Guards for analysis/build_sp_route_conversion.py."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_sp_route_conversion.py"
_spec = importlib.util.spec_from_file_location("sp_route", SCRIPT)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)
S = M.load(M.SCEN, "sp_scen")


def test_routes_are_equal_at_the_breakeven_attribute():
    for e in M.ELECTRICITY_BRL_MWH:
        a = M.breakeven_attribute(S, e)
        assert M.biomethane_value(S, a) == pytest.approx(M.electricity_value(S, e))


def test_breakeven_electricity_needs_no_attribute():
    e = M.breakeven_electricity(S)
    assert M.breakeven_attribute(S, e) == pytest.approx(0.0, abs=1e-12)


def test_uses_scenario_script_energy_constants():
    assert M.electricity_value(S, 1000.0) == pytest.approx(S.CH4_LHV_KWH_M3 * S.ETA_ELETRICA)
