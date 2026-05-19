"""
Tests for validation_service.py
Covers ValidationService.validate_coordinates, validate_radius,
check_buffer_overlap, validate_analysis_request, is_point_in_ocean,
and the ValidationError exception class.
"""

import pytest

from app.services.validation_service import (
    SAO_PAULO_BOUNDS,
    ValidationError,
    ValidationService,
)

# A coordinate well inside São Paulo state used as a "good" default.
_VALID_LAT = -22.9
_VALID_LNG = -47.1


@pytest.mark.unit
class TestValidationError:
    """Tests for the custom ValidationError exception."""

    def test_is_exception_subclass(self):
        err = ValidationError("msg", "CODE")
        assert isinstance(err, Exception)

    def test_message_stored(self):
        err = ValidationError("bad coords", "INVALID_COORDINATES")
        assert err.message == "bad coords"

    def test_code_stored(self):
        err = ValidationError("bad coords", "INVALID_COORDINATES")
        assert err.code == "INVALID_COORDINATES"

    def test_suggestion_defaults_to_none(self):
        err = ValidationError("msg", "CODE")
        assert err.suggestion is None

    def test_suggestion_stored_when_provided(self):
        err = ValidationError("msg", "CODE", "try this")
        assert err.suggestion == "try this"

    def test_str_representation_contains_message(self):
        err = ValidationError("something went wrong", "CODE")
        assert "something went wrong" in str(err)

    def test_can_be_raised_and_caught(self):
        with pytest.raises(ValidationError) as exc_info:
            raise ValidationError("oops", "ERR", "fix it")
        assert exc_info.value.code == "ERR"


@pytest.mark.unit
class TestValidateCoordinates:
    """Tests for ValidationService.validate_coordinates()."""

    # --- Happy-path: valid SP coordinates ---

    def test_valid_coordinates_inside_sp(self):
        is_valid, error, suggestion = ValidationService.validate_coordinates(_VALID_LAT, _VALID_LNG)
        assert is_valid is True
        assert error is None
        assert suggestion is None

    def test_valid_coordinates_on_sp_min_lat_boundary(self):
        # Exactly at the southern edge should be valid (inclusive bounds)
        lat = SAO_PAULO_BOUNDS["min_lat"]
        lng = _VALID_LNG
        is_valid, _, _ = ValidationService.validate_coordinates(lat, lng)
        assert is_valid is True

    def test_valid_coordinates_on_sp_max_lat_boundary(self):
        lat = SAO_PAULO_BOUNDS["max_lat"]
        lng = _VALID_LNG
        is_valid, _, _ = ValidationService.validate_coordinates(lat, lng)
        assert is_valid is True

    def test_valid_coordinates_on_sp_min_lng_boundary(self):
        lat = _VALID_LAT
        lng = SAO_PAULO_BOUNDS["min_lng"]
        is_valid, _, _ = ValidationService.validate_coordinates(lat, lng)
        assert is_valid is True

    def test_valid_coordinates_on_sp_max_lng_boundary(self):
        lat = _VALID_LAT
        lng = SAO_PAULO_BOUNDS["max_lng"]
        is_valid, _, _ = ValidationService.validate_coordinates(lat, lng)
        assert is_valid is True

    # --- Invalid types ---

    def test_non_numeric_lat_returns_false(self):
        is_valid, error, suggestion = ValidationService.validate_coordinates("abc", _VALID_LNG)
        assert is_valid is False
        assert error is not None

    def test_non_numeric_lng_returns_false(self):
        is_valid, error, suggestion = ValidationService.validate_coordinates(_VALID_LAT, "abc")
        assert is_valid is False
        assert error is not None

    def test_none_lat_returns_false(self):
        is_valid, _, _ = ValidationService.validate_coordinates(None, _VALID_LNG)
        assert is_valid is False

    # --- WGS-84 out-of-bounds ---

    def test_lat_above_90_returns_false(self):
        is_valid, error, _ = ValidationService.validate_coordinates(91.0, _VALID_LNG)
        assert is_valid is False
        assert "Latitude" in error

    def test_lat_below_minus_90_returns_false(self):
        is_valid, error, _ = ValidationService.validate_coordinates(-91.0, _VALID_LNG)
        assert is_valid is False
        assert "Latitude" in error

    def test_lat_exactly_90_is_valid_wgs84(self):
        # lat=90 is within WGS-84 range, but likely outside SP; just check no crash
        is_valid, error, _ = ValidationService.validate_coordinates(90.0, _VALID_LNG)
        # Outside SP bounds, so invalid — but error should mention SP, not WGS-84
        assert is_valid is False

    def test_lat_exactly_minus_90_is_invalid_wgs84_or_sp(self):
        is_valid, _, _ = ValidationService.validate_coordinates(-90.0, _VALID_LNG)
        assert is_valid is False

    def test_lng_above_180_returns_false(self):
        is_valid, error, _ = ValidationService.validate_coordinates(_VALID_LAT, 181.0)
        assert is_valid is False
        assert "Longitude" in error

    def test_lng_below_minus_180_returns_false(self):
        is_valid, error, _ = ValidationService.validate_coordinates(_VALID_LAT, -181.0)
        assert is_valid is False
        assert "Longitude" in error

    # --- Outside São Paulo state ---

    def test_point_south_of_sp_bounds_returns_false(self):
        lat = SAO_PAULO_BOUNDS["min_lat"] - 0.1
        is_valid, error, _ = ValidationService.validate_coordinates(lat, _VALID_LNG)
        assert is_valid is False
        assert "São Paulo" in error

    def test_point_north_of_sp_bounds_returns_false(self):
        lat = SAO_PAULO_BOUNDS["max_lat"] + 0.1
        is_valid, error, _ = ValidationService.validate_coordinates(lat, _VALID_LNG)
        assert is_valid is False
        assert "São Paulo" in error

    def test_point_west_of_sp_bounds_returns_false(self):
        lng = SAO_PAULO_BOUNDS["min_lng"] - 0.1
        is_valid, error, _ = ValidationService.validate_coordinates(_VALID_LAT, lng)
        assert is_valid is False
        assert "São Paulo" in error

    def test_point_east_of_sp_bounds_returns_false(self):
        lng = SAO_PAULO_BOUNDS["max_lng"] + 0.1
        is_valid, error, _ = ValidationService.validate_coordinates(_VALID_LAT, lng)
        assert is_valid is False
        assert "São Paulo" in error

    # --- Ocean heuristic ---

    def test_ocean_point_returns_false(self):
        # lng must be in (-44.5, -44.2] to pass SP bounds check but still trigger
        # the ocean heuristic (lng > -44.5 and lat < -23.5).
        is_valid, error, _ = ValidationService.validate_coordinates(-24.0, -44.4)
        assert is_valid is False
        assert "oceano" in error.lower() or "ocean" in error.lower()

    def test_suggestion_provided_on_ocean_error(self):
        is_valid, error, suggestion = ValidationService.validate_coordinates(-24.0, -44.4)
        assert is_valid is False
        assert suggestion is not None


@pytest.mark.unit
class TestValidateRadius:
    """Tests for ValidationService.validate_radius()."""

    def test_valid_radius_in_range(self):
        is_valid, error, suggestion = ValidationService.validate_radius(30.0)
        assert is_valid is True
        assert error is None
        assert suggestion is None

    def test_radius_exactly_one(self):
        is_valid, _, _ = ValidationService.validate_radius(1.0)
        assert is_valid is True

    def test_radius_exactly_100(self):
        is_valid, _, _ = ValidationService.validate_radius(100.0)
        assert is_valid is True

    def test_radius_zero_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius(0)
        assert is_valid is False
        assert error is not None

    def test_radius_negative_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius(-5.0)
        assert is_valid is False
        assert error is not None

    def test_radius_below_one_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius(0.5)
        assert is_valid is False
        assert "pequeno" in error.lower() or "small" in error.lower()

    def test_radius_above_100_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius(101.0)
        assert is_valid is False
        assert error is not None

    def test_radius_non_numeric_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius("big")
        assert is_valid is False
        assert error is not None

    def test_radius_none_returns_false(self):
        is_valid, error, _ = ValidationService.validate_radius(None)
        assert is_valid is False

    def test_large_radius_warning_logged(self, caplog):
        import logging
        with caplog.at_level(logging.WARNING, logger="app.services.validation_service"):
            is_valid, _, _ = ValidationService.validate_radius(75.0)
        assert is_valid is True
        assert any("75" in record.message for record in caplog.records)

    def test_radius_decimal_valid(self):
        is_valid, _, _ = ValidationService.validate_radius(12.5)
        assert is_valid is True


@pytest.mark.unit
class TestCheckBufferOverlap:
    """Tests for ValidationService.check_buffer_overlap()."""

    def test_small_radius_center_of_state_no_overlap(self):
        # Roughly center of SP state
        result = ValidationService.check_buffer_overlap(-22.0, -48.5, 10.0)
        assert result["extends_beyond_state"] is False
        assert result["directions"] == []
        assert "warning" not in result

    def test_large_radius_causes_overlap(self):
        # A point near the southern boundary with a large radius should extend south
        result = ValidationService.check_buffer_overlap(
            SAO_PAULO_BOUNDS["min_lat"] + 0.1, -48.5, 50.0
        )
        assert result["extends_beyond_state"] is True
        assert "sul" in result["directions"]

    def test_result_contains_required_keys(self):
        result = ValidationService.check_buffer_overlap(-22.0, -48.5, 10.0)
        assert "extends_beyond_state" in result
        assert "directions" in result

    def test_overlap_result_contains_warning_key(self):
        result = ValidationService.check_buffer_overlap(
            SAO_PAULO_BOUNDS["min_lat"] + 0.1, -48.5, 100.0
        )
        if result["extends_beyond_state"]:
            assert "warning" in result

    def test_directions_list_type(self):
        result = ValidationService.check_buffer_overlap(-22.0, -48.5, 10.0)
        assert isinstance(result["directions"], list)


@pytest.mark.unit
class TestValidateAnalysisRequest:
    """Tests for ValidationService.validate_analysis_request() end-to-end."""

    def test_valid_request_returns_valid_dict(self):
        result = ValidationService.validate_analysis_request(_VALID_LAT, _VALID_LNG, 10.0)
        assert result["valid"] is True
        assert result["coordinates"]["latitude"] == _VALID_LAT
        assert result["coordinates"]["longitude"] == _VALID_LNG
        assert result["radius_km"] == 10.0

    def test_invalid_coordinates_raises_validation_error(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidationService.validate_analysis_request(200.0, _VALID_LNG, 10.0)
        assert exc_info.value.code == "INVALID_COORDINATES"

    def test_invalid_radius_raises_validation_error(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidationService.validate_analysis_request(_VALID_LAT, _VALID_LNG, -1.0)
        assert exc_info.value.code == "INVALID_RADIUS"

    def test_result_has_warnings_list(self):
        result = ValidationService.validate_analysis_request(_VALID_LAT, _VALID_LNG, 10.0)
        assert isinstance(result["warnings"], list)

    def test_large_radius_adds_performance_warning(self):
        result = ValidationService.validate_analysis_request(_VALID_LAT, _VALID_LNG, 50.0)
        assert any("30 km" in w for w in result["warnings"])

    def test_small_radius_no_performance_warning(self):
        result = ValidationService.validate_analysis_request(_VALID_LAT, _VALID_LNG, 5.0)
        assert all("30 km" not in w for w in result["warnings"])


@pytest.mark.unit
class TestIsPointInOcean:
    """Tests for ValidationService.is_point_in_ocean()."""

    def test_inland_point_not_in_ocean(self):
        # SP capital is firmly inland
        assert ValidationService.is_point_in_ocean(-23.55, -46.63) is False

    def test_eastern_coast_point_in_ocean(self):
        # lng > -44.2 and lat < -23.0 → True
        assert ValidationService.is_point_in_ocean(-24.0, -44.0) is True

    def test_southern_coast_point_in_ocean(self):
        # lng > -47.8 and lat < -25.0 → True
        assert ValidationService.is_point_in_ocean(-25.1, -47.0) is True

    def test_northern_point_not_in_ocean(self):
        # lat > -23.0, should not trigger eastern check
        assert ValidationService.is_point_in_ocean(-22.0, -44.0) is False

    def test_western_point_not_in_ocean(self):
        # lng < -47.8, should not trigger southern check
        assert ValidationService.is_point_in_ocean(-25.1, -48.0) is False
