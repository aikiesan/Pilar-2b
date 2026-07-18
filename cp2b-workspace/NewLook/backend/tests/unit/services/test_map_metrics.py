"""
Tests for map_metrics.py — 4-metric × 3-scenario forward biogas calculation.
"""

import pytest

from app.services.biogas_forward import FeedstockParams, Range
from app.services.map_metrics import (
    AGRI_STREAMS,
    UPGRADING_EFFICIENCY,
    MunicipalityMapMetrics,
    StreamMetrics,
    _compute_from_biomass,
    _compute_from_stored_biogas,
    compute_stream_metrics,
)


def _make_params(
    bmp=200.0,
    ts=25.0,
    vs_of_ts=80.0,
    ch4_pct=57.0,
    avail=0.30,
    fde_full=0.195,
) -> FeedstockParams:
    return FeedstockParams(
        bmp=Range.constant(bmp),
        ts=Range.constant(ts),
        vs_of_ts=Range.constant(vs_of_ts),
        ch4_pct=ch4_pct,
        fde=Range.constant(fde_full),
        availability=Range.constant(avail),
    )


@pytest.mark.unit
class TestComputeFromBiomass:
    def test_basic_formula_matches_theoretical(self):
        params = _make_params(
            bmp=115.0, ts=58.9, vs_of_ts=90.0, ch4_pct=55.0, avail=0.1399, fde_full=0.09793
        )
        bio_c, ch4, biometh = _compute_from_biomass(100.0, params)
        # biomass_corrected = 100 × 0.1399 = 13.99
        assert bio_c["medio"] == pytest.approx(13.99, rel=1e-3)
        # CH4 = 100 × 0.589 × 0.90 × 115 × 0.09793
        expected_ch4 = 100.0 * (58.9 / 100) * (90.0 / 100) * 115.0 * 0.09793
        assert ch4["medio"] == pytest.approx(expected_ch4, rel=1e-3)
        # biomethane = ch4 × 0.97
        assert biometh["medio"] == pytest.approx(ch4["medio"] * UPGRADING_EFFICIENCY, rel=1e-3)

    def test_zero_biomass_returns_zeros(self):
        params = _make_params()
        bio_c, ch4, biometh = _compute_from_biomass(0.0, params)
        assert all(v == 0.0 for v in bio_c.values())
        assert all(v == 0.0 for v in ch4.values())

    def test_scenario_ordering_min_lt_max(self):
        params = FeedstockParams(
            bmp=Range(100.0, 200.0, 300.0),
            ts=Range(20.0, 25.0, 30.0),
            vs_of_ts=Range(70.0, 80.0, 90.0),
            ch4_pct=57.0,
            fde=Range(0.10, 0.20, 0.30),
            availability=Range(0.15, 0.30, 0.45),
        )
        bio_c, ch4, biometh = _compute_from_biomass(1000.0, params)
        assert bio_c["min"] < bio_c["medio"] < bio_c["max"]
        assert ch4["min"] < ch4["medio"] < ch4["max"]
        assert biometh["min"] < biometh["medio"] < biometh["max"]


@pytest.mark.unit
class TestComputeFromStoredBiogas:
    def test_medio_matches_stored(self):
        params = _make_params(ch4_pct=57.0, fde_full=0.20, avail=0.30)
        stored_biogas = 1_000_000.0  # m³/yr
        _, _, ch4, _ = _compute_from_stored_biogas(stored_biogas, params)
        expected_ch4_medio = stored_biogas * 0.57
        assert ch4["medio"] == pytest.approx(expected_ch4_medio, rel=1e-3)

    def test_upgrading_applied(self):
        params = _make_params()
        _, _, ch4, biometh = _compute_from_stored_biogas(500_000.0, params)
        assert biometh["medio"] == pytest.approx(ch4["medio"] * UPGRADING_EFFICIENCY, rel=1e-3)

    def test_min_less_than_max(self):
        params = FeedstockParams(
            bmp=Range(100.0, 200.0, 300.0),
            ts=Range(20.0, 25.0, 30.0),
            vs_of_ts=Range(70.0, 80.0, 90.0),
            ch4_pct=57.0,
            fde=Range(0.10, 0.20, 0.30),
            availability=Range(0.15, 0.30, 0.45),
        )
        _, _, ch4, biometh = _compute_from_stored_biogas(1_000_000.0, params)
        assert ch4["min"] < ch4["medio"] < ch4["max"]
        assert biometh["min"] < biometh["medio"] < biometh["max"]

    def test_zero_biogas_returns_zero(self):
        params = _make_params()
        biomass_gross, bio_c, ch4, biometh = _compute_from_stored_biogas(0.0, params)
        assert biomass_gross == 0.0
        assert all(v == 0.0 for v in ch4.values())


@pytest.mark.unit
class TestComputeStreamMetrics:
    def test_biomass_stream_uses_forward(self):
        row = {"sugarcane_biomass_tons_year": 1000.0, "sugarcane_biogas_m3_year": 0.0}
        params = _make_params(bmp=115.0, ts=58.9, vs_of_ts=90.0, avail=0.1399, fde_full=0.09793)
        sm = compute_stream_metrics("sugarcane", row, params)
        assert sm is not None
        assert sm.has_biomass is True
        assert sm.biomass_gross == pytest.approx(1000.0)
        assert sm.biomass_corrected["medio"] == pytest.approx(139.9)

    def test_biogas_only_stream_uses_fallback(self):
        row = {"cattle_biomass_tons_year": 0.0, "cattle_biogas_m3_year": 500_000.0}
        params = _make_params(ch4_pct=57.0, fde_full=0.20, avail=0.30)
        sm = compute_stream_metrics("cattle", row, params)
        assert sm is not None
        assert sm.has_biomass is False
        assert sm.biogas_ch4_m3["medio"] == pytest.approx(500_000.0 * 0.57, rel=1e-3)

    def test_no_data_returns_none(self):
        row = {"sugarcane_biomass_tons_year": 0.0, "sugarcane_biogas_m3_year": 0.0}
        params = _make_params()
        assert compute_stream_metrics("sugarcane", row, params) is None

    def test_biomethane_is_upgrading_fraction_of_ch4(self):
        row = {"sugarcane_biomass_tons_year": 5000.0}
        params = _make_params(avail=0.20, fde_full=0.14)
        sm = compute_stream_metrics("sugarcane", row, params)
        for sc in ("min", "medio", "max"):
            assert sm.biomethane_m3[sc] == pytest.approx(
                sm.biogas_ch4_m3[sc] * UPGRADING_EFFICIENCY, rel=1e-6
            )


@pytest.mark.unit
class TestMunicipalityMapMetrics:
    def test_to_flat_dict_contains_all_keys(self):
        m = MunicipalityMapMetrics(ibge_code="3500105")
        m.biomass_gross_total = 1000.0
        m.biomass_corrected_total = {"min": 100.0, "medio": 200.0, "max": 300.0}
        m.biogas_ch4_total = {"min": 50.0, "medio": 100.0, "max": 150.0}
        m.biomethane_total = {"min": 48.5, "medio": 97.0, "max": 145.5}
        d = m.to_flat_dict()
        assert "biomass_gross_total_tons_yr" in d
        for sc in ("min", "medio", "max"):
            assert f"biomass_corrected_{sc}_tons_yr" in d
            assert f"biogas_ch4_{sc}_m3_yr" in d
            assert f"biomethane_{sc}_m3_yr" in d

    def test_agri_streams_defined(self):
        assert "sugarcane" in AGRI_STREAMS
        assert "citrus" in AGRI_STREAMS
        assert "cattle" not in AGRI_STREAMS


@pytest.mark.unit
class TestCanonicalIntegration:
    """Integration tests: load real canonical params and verify metrics are sane."""

    def test_sugarcane_agri_stream_produces_nonzero(self):
        """Forward calculation from 1000 t/yr sugarcane bagasse → nonzero CH4."""
        from app.services.canonical_loader import get_params_for_stream

        row = {"sugarcane_biomass_tons_year": 1000.0}
        params = get_params_for_stream("sugarcane")
        sm = compute_stream_metrics("sugarcane", row, params)
        assert sm is not None
        assert sm.has_biomass is True
        assert sm.biogas_ch4_m3["medio"] > 0
        assert sm.biomethane_m3["medio"] < sm.biogas_ch4_m3["medio"]

    def test_livestock_stream_fallback_from_biogas(self):
        """When cattle biomass=0, legacy biogas column is used as fallback."""
        from app.services.canonical_loader import get_params_for_stream

        row = {"cattle_biomass_tons_year": 0.0, "cattle_biogas_m3_year": 1_000_000.0}
        params = get_params_for_stream("cattle")
        sm = compute_stream_metrics("cattle", row, params)
        assert sm is not None
        assert sm.has_biomass is False
        assert sm.biogas_ch4_m3["medio"] > 0

    def test_biomass_override_ignores_the_head_count_column(self):
        """Livestock columns hold head counts. With an override, biogas potential
        is computed from real tonnage, not the head count read as tonnes."""
        from app.services.canonical_loader import get_params_for_stream

        # Column says 205,686,533 (birds). Real manure tonnage is ~9.26M.
        row = {"poultry_biomass_tons_year": 205_686_533}
        params = get_params_for_stream("poultry")

        from_column = compute_stream_metrics("poultry", row, params)
        from_override = compute_stream_metrics("poultry", row, params, biomass_override=9_255_894.0)
        assert from_override.biomass_gross == 9_255_894.0
        # The override yields ~22x less biogas than the head count would.
        assert from_override.biogas_ch4_m3["medio"] < from_column.biogas_ch4_m3["medio"] / 10

    def test_override_makes_a_zero_column_stream_computable(self):
        """Outside SP the columns are 0, so without an override no metric exists.
        The override is what makes biogas potential national."""
        from app.services.canonical_loader import get_params_for_stream

        row = {"cattle_biomass_tons_year": 0}
        params = get_params_for_stream("cattle")
        assert compute_stream_metrics("cattle", row, params) is None
        sm = compute_stream_metrics("cattle", row, params, biomass_override=40_000.0)
        assert sm is not None and sm.biogas_ch4_m3["medio"] > 0

    def test_params_availability_lt_one(self):
        """All canonical streams with FDE blocks must have availability < 1."""
        from app.services.canonical_loader import get_params_for_stream

        for stream in (
            "sugarcane",
            "corn",
            "coffee",
            "citrus",
            "soybean",
            "cattle",
            "swine",
            "poultry",
            "rsu",
            "rpo",
        ):
            try:
                params = get_params_for_stream(stream)
                assert params.availability.medio <= 1.0, f"{stream} availability > 1"
                assert (
                    params.availability.min <= params.availability.medio
                ), f"{stream} availability not ordered"
            except KeyError:
                pass  # some streams may not have canonical mapping yet
