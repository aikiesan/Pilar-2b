"""Guards for analysis/build_sp_route_conversion.py and the panel's route-switch parameters."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "analysis" / "build_sp_route_conversion.py"
_spec = importlib.util.spec_from_file_location("sp_route", SCRIPT)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)
R = M.route()


def test_routes_are_equal_at_the_breakeven_attribute():
    for price in R["prices"]:
        biomethane = M.biomethane_value(R, price["breakeven_attribute_brl_m3"])
        assert biomethane == pytest.approx(price["electricity_route_brl_m3"])


def test_yaml_energy_constants_are_the_scenario_scripts():
    S = M.load(M.NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py", "sp_scen")
    assert R["params"]["pci_ch4_kwh_m3"] == S.CH4_LHV_KWH_M3
    assert R["params"]["rendimento_eletrico"] == S.ETA_ELETRICA


def test_yaml_sp_biogas_is_the_realization_index_input():
    irm = M.load(ROOT / "analysis" / "build_sp_realization_index.py", "sp_irm")
    biogas, _year, _source = irm.sp_biogas_production()
    assert R["params"]["biogas_sp_m3_dia"] == biogas
    assert tuple(R["params"]["fracao_ch4"]) == irm.BIOGAS_CH4_FRACTION
