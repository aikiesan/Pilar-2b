"""
Tests for biomass_import.py — direct authoritative biomass mapping (no reverse-BMP).
"""

import pytest

from app.services.biomass_import import (
    AGRICULTURAL_STREAM_TO_KEY,
    LIVESTOCK_STREAM_TO_KEY,
    STREAM_TO_RESIDUE_KEY,
    UNMAPPED_STREAMS,
    URBAN_STREAM_TO_KEY,
    build_municipality_biomass,
    empty_biomass_record,
    roll_up,
)
from app.services.biomass_availability import RESIDUE_BIOMASS_CONFIGS, SECTOR_FIELDS


def _rows(*triples, pop=10000):
    return [
        {"ibge_code": i, "residue_stream": s, "residue_tons_yr": t, "populacao_2022": pop}
        for i, s, t in triples
    ]


@pytest.mark.unit
class TestEmptyRecord:
    def test_has_all_fields_zero(self):
        rec = empty_biomass_record()
        for c in RESIDUE_BIOMASS_CONFIGS:
            assert rec[c.biomass_field] == 0.0
        for f in SECTOR_FIELDS.values():
            assert rec[f] == 0.0
        assert rec["total_biomass_tons_year"] == 0.0


@pytest.mark.unit
class TestRollUp:
    def test_sector_and_total(self):
        rec = empty_biomass_record()
        rec["sugarcane_biomass_tons_year"] = 100.0   # agricultural
        rec["corn_biomass_tons_year"] = 50.0          # agricultural
        rec["cattle_biomass_tons_year"] = 30.0        # livestock
        roll_up(rec)
        assert rec["agricultural_biomass_tons_year"] == pytest.approx(150.0)
        assert rec["livestock_biomass_tons_year"] == pytest.approx(30.0)
        assert rec["total_biomass_tons_year"] == pytest.approx(180.0)


@pytest.mark.unit
class TestBuildMunicipalityBiomass:
    def test_agricultural_tonnage_direct(self):
        out = build_municipality_biomass(_rows(
            ("3500105", "sugarcane", 1000.0),
            ("3500105", "coffee", 200.0),
        ))
        rec = out["3500105"]
        assert rec["sugarcane_biomass_tons_year"] == pytest.approx(1000.0)
        assert rec["coffee_biomass_tons_year"] == pytest.approx(200.0)
        assert rec["agricultural_biomass_tons_year"] == pytest.approx(1200.0)

    def test_livestock_head_not_counted_as_tons_without_coeff(self):
        # residue_tons_yr for cattle is HEAD COUNT; without a coefficient it must NOT
        # be stored as tonnage (the bug we are fixing).
        out = build_municipality_biomass(_rows(("1", "cattle", 42748.0)))
        assert out["1"]["cattle_biomass_tons_year"] == 0.0

    def test_livestock_head_converted_with_coeff(self):
        # 42748 head × 3.65 t manure/head/yr = 156030.2 t
        out = build_municipality_biomass(
            _rows(("1", "cattle", 42748.0)),
            livestock_t_per_head={"cattle": 3.65},
        )
        assert out["1"]["cattle_biomass_tons_year"] == pytest.approx(42748.0 * 3.65)
        assert out["1"]["livestock_biomass_tons_year"] == pytest.approx(42748.0 * 3.65)

    def test_urban_population_derived(self):
        # urban tonnage = population × per-capita coeff
        out = build_municipality_biomass(
            _rows(("1", "rsu_organic", 0.0), pop=50000),
            urban_t_per_capita={"rsu": 0.1},
        )
        assert out["1"]["rsu_biomass_tons_year"] == pytest.approx(5000.0)

    def test_urban_zero_without_coeff(self):
        out = build_municipality_biomass(_rows(("1", "rsu_organic", 0.0), pop=50000))
        assert out["1"]["rsu_biomass_tons_year"] == 0.0

    def test_sums_duplicate_rows(self):
        out = build_municipality_biomass(_rows(
            ("3500105", "corn", 100.0),
            ("3500105", "corn", 50.0),
        ))
        assert out["3500105"]["corn_biomass_tons_year"] == pytest.approx(150.0)

    def test_forestry_is_ignored(self):
        assert "forestry" in UNMAPPED_STREAMS
        out = build_municipality_biomass(_rows(
            ("1", "forestry", 9999.0),
            ("1", "corn", 10.0),
        ))
        # forestry contributes nothing; only corn counts
        assert out["1"]["total_biomass_tons_year"] == pytest.approx(10.0)

    def test_zero_tons_keeps_municipality_with_zeros(self):
        out = build_municipality_biomass(_rows(("1", "aquaculture", 0.0)))
        assert "1" in out
        assert out["1"]["total_biomass_tons_year"] == 0.0

    def test_stream_maps_are_disjoint_and_cover(self):
        a, l, u = set(AGRICULTURAL_STREAM_TO_KEY), set(LIVESTOCK_STREAM_TO_KEY), set(URBAN_STREAM_TO_KEY)
        assert a.isdisjoint(l) and a.isdisjoint(u) and l.isdisjoint(u)
        assert a | l | u == set(STREAM_TO_RESIDUE_KEY)

    def test_blank_ibge_skipped(self):
        out = build_municipality_biomass(_rows(("", "corn", 100.0)))
        assert out == {}

    def test_all_mapped_keys_are_valid_residues(self):
        valid = {c.key for c in RESIDUE_BIOMASS_CONFIGS}
        for stream, key in STREAM_TO_RESIDUE_KEY.items():
            assert key in valid, f"stream {stream} maps to invalid residue key {key}"


@pytest.mark.unit
class TestNoReverseFallback:
    """The biomass map must be able to use real data only (no back-calculation)."""

    def test_fallback_disabled_returns_zero_without_stored(self):
        from app.services.biomass_availability import get_residue_biomass_tons
        # Only biogas present, no stored biomass → with fallback OFF, returns 0
        row = {"sugarcane_biogas_m3_year": 16170.0}
        assert get_residue_biomass_tons(row, "sugarcane", allow_reverse_fallback=False) == 0.0

    def test_fallback_disabled_uses_stored(self):
        from app.services.biomass_availability import get_residue_biomass_tons
        row = {"sugarcane_biomass_tons_year": 4242.0, "sugarcane_biogas_m3_year": 16170.0}
        assert get_residue_biomass_tons(row, "sugarcane", allow_reverse_fallback=False) == pytest.approx(4242.0)

    def test_derive_fields_no_fallback_zero_for_biogas_only(self):
        from app.services.biomass_availability import derive_biomass_fields
        row = {"sugarcane_biogas_m3_year": 16170.0}
        derived = derive_biomass_fields(row, allow_reverse_fallback=False)
        assert derived["sugarcane_biomass_tons_year"] == 0.0
        assert derived["total_biomass_tons_year"] == 0.0
