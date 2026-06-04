"""
Tests for biogas_forward.py — the forward biomass→biogas calculation engine.

Verifies the unit-cancellation formula, the FDE practical adjustment, the
min/medio/max envelope ordering, biogas-from-CH4 conversion, aggregation, and
that the forward path is the exact inverse of the reverse-BMP path used by
biomass_availability.py (round-trip consistency).
"""

import pytest

from app.services.biogas_forward import (
    SCENARIOS,
    BiogasResult,
    FeedstockParams,
    Range,
    aggregate,
    biogas_from_ch4,
    calculate_feedstock,
    theoretical_ch4_m3,
)
from app.services.biomass_availability import reverse_bmp_tons


@pytest.mark.unit
class TestRange:
    def test_get_each_scenario(self):
        r = Range(1.0, 2.0, 3.0)
        assert r.get("min") == 1.0
        assert r.get("medio") == 2.0
        assert r.get("max") == 3.0

    def test_constant(self):
        r = Range.constant(0.5)
        assert (r.min, r.medio, r.max) == (0.5, 0.5, 0.5)


@pytest.mark.unit
class TestTheoreticalCh4:
    def test_basic_formula(self):
        # 100 wet tons × 50% TS × 90% VS/TS × 115 BMP
        # = 100 × 0.5 × 0.9 × 115 = 5175 m3 CH4
        assert theoretical_ch4_m3(100.0, 115.0, 50.0, 90.0) == pytest.approx(5175.0)

    def test_zero_biomass(self):
        assert theoretical_ch4_m3(0.0, 115.0, 50.0, 90.0) == 0.0

    def test_negative_biomass(self):
        assert theoretical_ch4_m3(-10.0, 115.0, 50.0, 90.0) == 0.0

    def test_zero_bmp(self):
        assert theoretical_ch4_m3(100.0, 0.0, 50.0, 90.0) == 0.0

    def test_zero_ts(self):
        assert theoretical_ch4_m3(100.0, 115.0, 0.0, 90.0) == 0.0

    def test_zero_vs(self):
        assert theoretical_ch4_m3(100.0, 115.0, 50.0, 0.0) == 0.0


@pytest.mark.unit
class TestBiogasFromCh4:
    def test_60_percent(self):
        # 600 m3 CH4 at 60% → 1000 m3 biogas
        assert biogas_from_ch4(600.0, 60.0) == pytest.approx(1000.0)

    def test_zero_ch4(self):
        assert biogas_from_ch4(0.0, 60.0) == 0.0

    def test_zero_pct(self):
        assert biogas_from_ch4(600.0, 0.0) == 0.0


@pytest.mark.unit
class TestCalculateFeedstock:
    @pytest.fixture
    def bagaco(self):
        # Canonical BAGACO values
        return FeedstockParams(
            bmp=Range(86.25, 115.0, 220.0),
            ts=Range(50.0, 58.9, 66.0),
            vs_of_ts=Range(76.5, 90.0, 97.0),
            ch4_pct=55.0,
            fde=Range(0.10, 0.18, 0.25),
        )

    def test_medio_theoretical(self, bagaco):
        # 1000 wet tons × 58.9% × 90% × 115 = 60961.5
        res = calculate_feedstock(1000.0, bagaco)
        assert res.ch4_theoretical_m3["medio"] == pytest.approx(60961.5, rel=1e-4)

    def test_practical_applies_fde(self, bagaco):
        res = calculate_feedstock(1000.0, bagaco)
        expected = 60961.5 * 0.18
        assert res.ch4_practical_m3["medio"] == pytest.approx(expected, rel=1e-4)

    def test_biogas_volume_from_ch4(self, bagaco):
        res = calculate_feedstock(1000.0, bagaco)
        ch4 = res.ch4_practical_m3["medio"]
        assert res.biogas_practical_m3["medio"] == pytest.approx(ch4 / 0.55, rel=1e-4)

    def test_scenario_envelope_ordering(self, bagaco):
        # min scenario must be the lowest, max the highest (genuine envelope)
        res = calculate_feedstock(1000.0, bagaco)
        assert res.ch4_theoretical_m3["min"] <= res.ch4_theoretical_m3["medio"] <= res.ch4_theoretical_m3["max"]
        assert res.ch4_practical_m3["min"] <= res.ch4_practical_m3["medio"] <= res.ch4_practical_m3["max"]

    def test_fde_defaults_to_theoretical(self):
        # No FDE provided → practical == theoretical (FDE = 1.0)
        params = FeedstockParams(
            bmp=Range.constant(200.0),
            ts=Range.constant(30.0),
            vs_of_ts=Range.constant(80.0),
            ch4_pct=60.0,
        )
        res = calculate_feedstock(100.0, params)
        for sc in SCENARIOS:
            assert res.ch4_practical_m3[sc] == pytest.approx(res.ch4_theoretical_m3[sc])

    def test_fde_clamped_to_unit_interval(self):
        # FDE > 1 must be clamped to 1.0 (no free energy)
        params = FeedstockParams(
            bmp=Range.constant(200.0),
            ts=Range.constant(30.0),
            vs_of_ts=Range.constant(80.0),
            fde=Range.constant(1.5),
        )
        res = calculate_feedstock(100.0, params)
        assert res.ch4_practical_m3["medio"] == pytest.approx(res.ch4_theoretical_m3["medio"])

    def test_zero_biomass_all_zero(self, bagaco):
        res = calculate_feedstock(0.0, bagaco)
        for sc in SCENARIOS:
            assert res.ch4_theoretical_m3[sc] == 0.0
            assert res.biogas_practical_m3[sc] == 0.0


@pytest.mark.unit
class TestAggregate:
    def test_empty_is_zero(self):
        res = aggregate({})
        for sc in SCENARIOS:
            assert res.ch4_theoretical_m3[sc] == 0.0

    def test_sums_scenarios(self):
        params = FeedstockParams(
            bmp=Range.constant(100.0),
            ts=Range.constant(50.0),
            vs_of_ts=Range.constant(100.0),
            ch4_pct=50.0,
        )
        a = calculate_feedstock(10.0, params)   # 10 × 0.5 × 1.0 × 100 = 500
        b = calculate_feedstock(20.0, params)   # 20 × 0.5 × 1.0 × 100 = 1000
        agg = aggregate({"a": a, "b": b})
        assert agg.ch4_theoretical_m3["medio"] == pytest.approx(1500.0)


@pytest.mark.unit
class TestRoundTripWithReverseBmp:
    """Forward and reverse paths must be mutually consistent.

    biomass_availability.reverse_bmp_tons uses vs_percent on a WET basis:
        biomass = biogas / (BMP × vs_wet/100)
    The forward path uses TS × VS_of_TS, where vs_wet = TS × VS_of_TS / 100.
    Feeding the forward theoretical CH4 back through reverse_bmp must recover the
    original biomass (theoretical, FDE=1)."""

    def test_forward_then_reverse_recovers_biomass(self):
        biomass_in = 250.0
        ts, vs_of_ts, bmp = 58.9, 90.0, 115.0
        vs_wet = ts * vs_of_ts / 100.0  # 53.01

        ch4 = theoretical_ch4_m3(biomass_in, bmp, ts, vs_of_ts)
        biomass_out = reverse_bmp_tons(ch4, bmp, vs_wet)

        assert biomass_out == pytest.approx(biomass_in, rel=1e-6)
