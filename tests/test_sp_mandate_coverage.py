"""Guards for analysis/build_sp_mandate_coverage.py."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_sp_mandate_coverage.py"
_spec = importlib.util.spec_from_file_location("sp_mandate", SCRIPT)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)


def test_volume_share_exceeds_ghg_target_because_biomethane_is_not_zero_carbon():
    assert M.volume_share(1.0) > 0.01
    assert M.volume_share(1.0) == pytest.approx(0.01 / (1 - 8.55 / M.CI_NATURAL_GAS))


def test_2026_target_is_the_cnpe_value():
    assert 0.5 in M.TARGETS_PCT and "CNPE" in M.TARGETS_PCT[0.5]


def test_national_production_includes_sp_and_other_states():
    R = M.load_irm()
    br, month = M.national_production_latest(R)
    (y, m), sp = max(R.sp_monthly_production().items())
    assert month == f"{m:02d}/{y}"
    assert br > sp / R.days_in_month(m, y) > 0
