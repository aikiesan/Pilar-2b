"""Guards for analysis/build_sp_realization_index.py.

    pytest tests/test_sp_realization_index.py -v
"""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_sp_realization_index.py"
_spec = importlib.util.spec_from_file_location("sp_irm", SCRIPT)
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)


def test_cp2b_totals_are_read_from_the_loader_not_retyped():
    t = R.cp2b_state_totals()
    assert round(t[("med", "n4")]) == 5_971_705_062
    assert t[("med", "n1")] >= t[("med", "n2")] >= t[("med", "n3")] >= t[("med", "n4")]


def test_atlas_real_matches_published_reference():
    assert round(R.atlas_real_total()) == 7_832_143_834


def test_days_in_month_handles_leap_years():
    assert R.days_in_month(2, 2024) == 29
    assert R.days_in_month(2, 2026) == 28
    assert R.days_in_month(2, 2100) == 28
    assert R.days_in_month(4, 2026) == 30


def test_sp_series_sums_every_biomethane_product():
    prod = R.sp_monthly_production()
    # 04/2026 has two SP rows: BIOMETANO + BIOMETANO COMPRIMIDO
    assert round(prod[(2026, 4)]) == round(3293745.043 + 231407.0)


def test_authorised_capacity_uses_latest_month_only():
    cap, month = R.sp_authorised_capacity()
    assert month == "04/2026"
    # Gasgrid (last report 06/2022, never produced) must not be counted
    assert round(cap) == 557_816


def test_biogas_bracket_reads_the_latest_cibiogas_state_figure():
    biogas, year, source = R.sp_biogas_production()
    assert biogas == 4.9e6 and year == "2025" and "CIBiogás" in source
