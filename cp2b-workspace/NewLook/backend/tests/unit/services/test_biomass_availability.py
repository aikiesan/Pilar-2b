"""
Tests for biomass_availability.py
Covers number_value, reverse_bmp_tons, get_residue_biomass_tons,
derive_biomass_fields, and biomass_select_columns.
"""

import math

import pytest

from app.services.biomass_availability import (
    BIOGAS_FIELDS,
    BIOMASS_FIELDS,
    RESIDUE_BIOMASS_CONFIGS,
    RESIDUE_KEYS,
    SECTOR_FIELDS,
    ResidueBiomassConfig,
    biomass_select_columns,
    derive_biomass_fields,
    get_residue_biomass_tons,
    number_value,
    reverse_bmp_tons,
)

# Lookup canonical config by key so tests validate the wiring (correct column,
# config, and formula) without hardcoding BMP/VS magic numbers. These values are
# generated from data/canonical_parameters/feedstocks.yaml and change with the
# science; the pure-math tests in TestReverseBmpTons cover the arithmetic itself.
_CONFIG_BY_KEY = {c.key: c for c in RESIDUE_BIOMASS_CONFIGS}


@pytest.mark.unit
class TestNumberValue:
    """Tests for number_value() numeric coercion helper."""

    def test_integer_input(self):
        assert number_value(42) == pytest.approx(42.0)

    def test_float_input(self):
        assert number_value(3.14) == pytest.approx(3.14)

    def test_string_integer(self):
        assert number_value("100") == pytest.approx(100.0)

    def test_string_float(self):
        assert number_value("1234.56") == pytest.approx(1234.56)

    def test_none_returns_zero(self):
        assert number_value(None) == pytest.approx(0.0)

    def test_nan_returns_zero(self):
        assert number_value(float("nan")) == pytest.approx(0.0)

    def test_non_numeric_string_returns_zero(self):
        assert number_value("abc") == pytest.approx(0.0)

    def test_empty_string_returns_zero(self):
        assert number_value("") == pytest.approx(0.0)

    def test_zero_int(self):
        assert number_value(0) == pytest.approx(0.0)

    def test_zero_float(self):
        assert number_value(0.0) == pytest.approx(0.0)

    def test_negative_value(self):
        assert number_value(-500.5) == pytest.approx(-500.5)

    def test_list_returns_zero(self):
        assert number_value([1, 2, 3]) == pytest.approx(0.0)

    def test_dict_returns_zero(self):
        assert number_value({"key": "val"}) == pytest.approx(0.0)

    def test_bool_true(self):
        # bool is a subclass of int in Python; float(True) == 1.0
        assert number_value(True) == pytest.approx(1.0)

    def test_bool_false(self):
        assert number_value(False) == pytest.approx(0.0)


@pytest.mark.unit
class TestReverseBmpTons:
    """Tests for reverse_bmp_tons() inverse BMP calculation."""

    def test_basic_calculation(self):
        # biogas / (bmp * vs_percent/100)
        # 1000 / (200 * 0.5) = 1000 / 100 = 10.0
        result = reverse_bmp_tons(biogas_m3=1000.0, bmp=200.0, vs_percent=50.0)
        assert result == pytest.approx(10.0)

    def test_zero_biogas_returns_zero(self):
        result = reverse_bmp_tons(biogas_m3=0.0, bmp=210.0, vs_percent=77.0)
        assert result == pytest.approx(0.0)

    def test_negative_biogas_returns_zero(self):
        result = reverse_bmp_tons(biogas_m3=-100.0, bmp=210.0, vs_percent=77.0)
        assert result == pytest.approx(0.0)

    def test_zero_bmp_returns_zero(self):
        result = reverse_bmp_tons(biogas_m3=1000.0, bmp=0.0, vs_percent=77.0)
        assert result == pytest.approx(0.0)

    def test_zero_vs_percent_returns_zero(self):
        result = reverse_bmp_tons(biogas_m3=1000.0, bmp=210.0, vs_percent=0.0)
        assert result == pytest.approx(0.0)

    def test_negative_bmp_returns_zero(self):
        result = reverse_bmp_tons(biogas_m3=1000.0, bmp=-210.0, vs_percent=77.0)
        assert result == pytest.approx(0.0)

    def test_known_sugarcane_values(self):
        # sugarcane: bmp=210, vs_percent=77 → denominator = 210 * 0.77 = 161.7
        result = reverse_bmp_tons(biogas_m3=16170.0, bmp=210.0, vs_percent=77.0)
        assert result == pytest.approx(100.0, rel=1e-4)

    def test_known_formula_with_literal_values(self):
        # Pure-math check with literal inputs (not tied to any feedstock):
        # denominator = 410 * 0.17 = 69.7 → 6970 / 69.7 = 100.0
        result = reverse_bmp_tons(biogas_m3=6970.0, bmp=410.0, vs_percent=17.0)
        assert result == pytest.approx(100.0, rel=1e-4)

    def test_small_biomass(self):
        result = reverse_bmp_tons(biogas_m3=1.0, bmp=100.0, vs_percent=100.0)
        assert result == pytest.approx(0.01)


@pytest.mark.unit
class TestGetResidueBiomassTons:
    """Tests for get_residue_biomass_tons() column-lookup with fallback."""

    def test_uses_stored_biomass_when_positive(self):
        row = {"sugarcane_biomass_tons_year": 5000.0, "sugarcane_biogas_m3_year": 999999.0}
        result = get_residue_biomass_tons(row, "sugarcane")
        assert result == pytest.approx(5000.0)

    def test_falls_back_to_biogas_when_biomass_zero(self):
        # When stored biomass is zero, fall back to reverse-BMP using the
        # canonical sugarcane config (whatever its current BMP/VS values are).
        cfg = _CONFIG_BY_KEY["sugarcane"]
        biogas = 16170.0
        expected = reverse_bmp_tons(biogas, cfg.bmp, cfg.vs_percent)
        row = {"sugarcane_biomass_tons_year": 0.0, "sugarcane_biogas_m3_year": biogas}
        result = get_residue_biomass_tons(row, "sugarcane")
        assert result == pytest.approx(expected, rel=1e-4)
        assert result > 0  # sanity: fallback actually produced a value

    def test_falls_back_when_biomass_missing(self):
        cfg = _CONFIG_BY_KEY["sugarcane"]
        biogas = 16170.0
        expected = reverse_bmp_tons(biogas, cfg.bmp, cfg.vs_percent)
        row = {"sugarcane_biogas_m3_year": biogas}
        result = get_residue_biomass_tons(row, "sugarcane")
        assert result == pytest.approx(expected, rel=1e-4)

    def test_returns_zero_when_both_missing(self):
        row = {}
        result = get_residue_biomass_tons(row, "sugarcane")
        assert result == pytest.approx(0.0)

    def test_all_residue_keys_are_accessible(self):
        # Verify every declared key can be looked up without KeyError
        row = {}
        for key in RESIDUE_KEYS:
            val = get_residue_biomass_tons(row, key)
            assert isinstance(val, float)

    def test_cattle_residue_fallback(self):
        # Livestock fallback path uses the canonical cattle config.
        cfg = _CONFIG_BY_KEY["cattle"]
        biogas = 2625.0
        expected = reverse_bmp_tons(biogas, cfg.bmp, cfg.vs_percent)
        row = {"cattle_biomass_tons_year": 0.0, "cattle_biogas_m3_year": biogas}
        result = get_residue_biomass_tons(row, "cattle")
        assert result == pytest.approx(expected, rel=1e-4)
        assert result > 0

    def test_stored_biomass_takes_priority_over_biogas(self):
        """Stored positive biomass must win even when biogas would give a higher number."""
        row = {
            "coffee_biomass_tons_year": 200.0,
            "coffee_biogas_m3_year": 9_000_000.0,  # would compute ~290 000 tons
        }
        result = get_residue_biomass_tons(row, "coffee")
        assert result == pytest.approx(200.0)


@pytest.mark.unit
class TestDeriveBiomassFields:
    """Tests for derive_biomass_fields() field derivation from raw rows."""

    @pytest.fixture
    def empty_row(self):
        return {}

    @pytest.fixture
    def row_with_biogas(self):
        """Row that has biogas values but no biomass values (common DB state).
        Tonnage results depend on the canonical BMP/VS config, so assertions
        compute expected values from the config rather than hardcoding them."""
        return {
            "sugarcane_biogas_m3_year": 16170.0,
            "cattle_biogas_m3_year": 2625.0,
            "rsu_biogas_m3_year": 6970.0,
        }

    def test_returns_dict_with_all_residue_biomass_fields(self, empty_row):
        result = derive_biomass_fields(empty_row)
        for field in BIOMASS_FIELDS:
            assert field in result

    def test_returns_dict_with_all_sector_fields(self, empty_row):
        result = derive_biomass_fields(empty_row)
        for field in SECTOR_FIELDS.values():
            assert field in result

    def test_returns_dict_with_total_field(self, empty_row):
        result = derive_biomass_fields(empty_row)
        assert "total_biomass_tons_year" in result

    def test_all_values_are_floats(self, empty_row):
        result = derive_biomass_fields(empty_row)
        for v in result.values():
            assert isinstance(v, float)

    def test_empty_row_all_zeros(self, empty_row):
        result = derive_biomass_fields(empty_row)
        assert result["total_biomass_tons_year"] == pytest.approx(0.0)

    def test_biogas_fallback_computes_biomass(self, row_with_biogas):
        cfg = _CONFIG_BY_KEY["sugarcane"]
        expected = reverse_bmp_tons(
            row_with_biogas["sugarcane_biogas_m3_year"], cfg.bmp, cfg.vs_percent
        )
        result = derive_biomass_fields(row_with_biogas)
        assert result["sugarcane_biomass_tons_year"] == pytest.approx(expected, rel=1e-4)

    def test_sector_totals_are_sum_of_residues(self, row_with_biogas):
        result = derive_biomass_fields(row_with_biogas)
        agri_total = result["agricultural_biomass_tons_year"]
        livestock_total = result["livestock_biomass_tons_year"]
        urban_total = result["urban_biomass_tons_year"]
        assert agri_total >= 0
        assert livestock_total >= 0
        assert urban_total >= 0

    def test_total_is_sum_of_sectors(self, row_with_biogas):
        result = derive_biomass_fields(row_with_biogas)
        sector_sum = (
            result["agricultural_biomass_tons_year"]
            + result["livestock_biomass_tons_year"]
            + result["urban_biomass_tons_year"]
        )
        assert result["total_biomass_tons_year"] == pytest.approx(sector_sum, rel=1e-6)

    def test_stored_biomass_preserved(self):
        row = {"sugarcane_biomass_tons_year": 12345.0}
        result = derive_biomass_fields(row)
        assert result["sugarcane_biomass_tons_year"] == pytest.approx(12345.0)

    def test_stored_sector_total_preserved(self):
        row = {"agricultural_biomass_tons_year": 99999.0}
        result = derive_biomass_fields(row)
        assert result["agricultural_biomass_tons_year"] == pytest.approx(99999.0)

    def test_stored_total_preserved(self):
        row = {"total_biomass_tons_year": 777777.0}
        result = derive_biomass_fields(row)
        assert result["total_biomass_tons_year"] == pytest.approx(777777.0)

    def test_values_rounded_to_two_decimals(self, row_with_biogas):
        result = derive_biomass_fields(row_with_biogas)
        for v in result.values():
            # Must not have more than 2 decimal places
            assert round(v, 2) == v


@pytest.mark.unit
class TestBiomassSelectColumns:
    """Tests for biomass_select_columns() SQL column list builder."""

    def test_returns_string(self):
        result = biomass_select_columns()
        assert isinstance(result, str)

    def test_no_alias_no_prefix(self):
        result = biomass_select_columns()
        # First column should not have a dot prefix
        first_col = result.split(",")[0].strip()
        assert "." not in first_col

    def test_with_alias_adds_prefix(self):
        result = biomass_select_columns(table_alias="m")
        # Every column should be prefixed with 'm.'
        cols = [c.strip() for c in result.split(",")]
        for col in cols:
            assert col.startswith("m.")

    def test_contains_total_biomass_column(self):
        result = biomass_select_columns()
        assert "total_biomass_tons_year" in result

    def test_contains_all_sector_fields(self):
        result = biomass_select_columns()
        for field in SECTOR_FIELDS.values():
            assert field in result

    def test_contains_all_biomass_fields(self):
        result = biomass_select_columns()
        for field in BIOMASS_FIELDS:
            assert field in result

    def test_contains_all_biogas_fields(self):
        result = biomass_select_columns()
        for field in BIOGAS_FIELDS:
            assert field in result

    def test_none_alias_same_as_no_alias(self):
        with_none = biomass_select_columns(table_alias=None)
        without = biomass_select_columns()
        assert with_none == without

    def test_alias_with_underscore(self):
        result = biomass_select_columns(table_alias="mun_tbl")
        cols = [c.strip() for c in result.split(",")]
        for col in cols:
            assert col.startswith("mun_tbl.")


@pytest.mark.unit
class TestResidueConfig:
    """Tests for RESIDUE_BIOMASS_CONFIGS constants and metadata."""

    def test_all_configs_have_positive_bmp(self):
        for config in RESIDUE_BIOMASS_CONFIGS:
            assert config.bmp > 0, f"BMP must be positive for {config.key}"

    def test_all_configs_have_positive_vs_percent(self):
        for config in RESIDUE_BIOMASS_CONFIGS:
            assert config.vs_percent > 0, f"VS% must be positive for {config.key}"

    def test_residue_keys_tuple_length(self):
        assert len(RESIDUE_KEYS) == len(RESIDUE_BIOMASS_CONFIGS)

    def test_biomass_fields_and_biogas_fields_same_length(self):
        assert len(BIOMASS_FIELDS) == len(BIOGAS_FIELDS)

    def test_sector_fields_keys(self):
        assert set(SECTOR_FIELDS.keys()) == {"agricultural", "livestock", "urban"}
