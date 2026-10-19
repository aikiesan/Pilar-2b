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


def test_targets_are_the_platform_ones_starting_with_the_cnpe_2026_value():
    first = M.load_targets()[0]
    assert (first["year"], first["reduction_pct"], first["status"]) == (2026, 0.5, "vigente")
    assert "CNPE" in first["act"] and not first["volume_estimated"]


def test_official_volume_implies_a_base_wider_than_the_distributed_market():
    assert M.implied_base_m3_day(M.load_targets()[0]) > M.NATIONAL_NG_M3_DAY


def test_platform_anp_series_is_the_analysis_one():
    analysis = M.ROOT / "analysis" / "data" / "05d_anp_biometano_production_state_monthly.csv"
    platform = M.CANONICAL / "anp_biometano_producao_uf_mensal.csv"
    assert platform.read_bytes() == analysis.read_bytes()


def test_national_production_includes_sp_and_other_states():
    R = M.load_irm()
    br, month = M.national_production_latest(R)
    (y, m), sp = max(R.sp_monthly_production().items())
    assert month == f"{m:02d}/{y}"
    assert br > sp / R.days_in_month(m, y) > 0
