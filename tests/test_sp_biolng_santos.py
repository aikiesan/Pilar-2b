"""Guards for analysis/build_sp_biolng_santos.py (C25)."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "analysis" / "build_sp_biolng_santos.py"
_spec = importlib.util.spec_from_file_location("sp_biolng", SCRIPT)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)
B = M.load(M.RECONCILIATION, "biogram_reconciliation")


def test_tonnes_and_cubic_metres_round_trip():
    assert M.ch4_m3_day(M.lng_t_day(37_481)) == pytest.approx(37_481)
    # Ideal gas at 20 °C and 1 atm: 16.043 g/mol × 101325 / (8.314 × 293.15).
    assert M.CH4_KG_M3 == pytest.approx(16.043 * 101325 / (8.314462 * 293.15) / 1000, abs=5e-4)


def test_fueleu_value_is_the_penalty_per_gram_times_the_surplus():
    eur = M.fueleu_eur_per_m3(36.0, 0.0, M.PENALTY_EUR_T, 1.0, year=2025)
    surplus_g = 36.0 * M.FUELEU_REFERENCE_G_MJ * 0.98
    # The penalty works out at about EUR 640 per tCO2e at the reference intensity.
    assert eur == pytest.approx(surplus_g * 642.2e-6, rel=1e-3)
    assert M.fueleu_eur_per_m3(36.0, 0.0, M.PENALTY_EUR_T, 0.5) == pytest.approx(
        M.fueleu_eur_per_m3(36.0, 0.0, M.PENALTY_EUR_T, 1.0) / 2)
    # A fuel at the limit creates no surplus.
    assert M.fueleu_eur_per_m3(36.0, M.fueleu_target(), M.PENALTY_EUR_T, 1.0) == pytest.approx(0.0)


def test_rings_grow_outwards_and_sao_paulo_is_inside_50_km():
    S = B.load_scenario_module()
    rings, _note = M.supply_by_ring(B, S)
    totals = [r["atlas_real_m3_dia"] for r in rings]
    assert totals == sorted(totals) and totals[0] > 0
    muns = B.municipalities()
    sp = muns["3550308"]
    assert B.haversine_km(*M.PORT, sp["lat"], sp["lon"]) < 50


def test_stopped_plants_are_left_out():
    plants = M.anp_plants(B)
    assert plants and all(p["status"] not in M.STOPPED for p in plants)
    assert not any(p["planta"].startswith("Gasgrid") for p in plants)
    assert [p["distancia_km"] for p in plants] == sorted(p["distancia_km"] for p in plants)
