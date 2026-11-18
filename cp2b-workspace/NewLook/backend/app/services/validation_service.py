"""
Input Validation Service for PILAR-2b V3
Sprint 4: Task 4.2 - Error Handling & Edge Cases

Handles:
- Point in ocean validation
- Radius extending beyond São Paulo
- Invalid coordinates
- Out-of-bounds checks
"""

import logging
from typing import Optional, Tuple

from shapely.geometry import Point

logger = logging.getLogger(__name__)

# São Paulo State approximate bounds (lat/lng)
SAO_PAULO_BOUNDS = {
    "min_lat": -25.3,  # Southernmost point
    "max_lat": -19.8,  # Northernmost point
    "min_lng": -53.1,  # Westernmost point
    "max_lng": -44.2,  # Easternmost point
}


class ValidationError(Exception):
    """Custom exception for validation errors"""

    def __init__(self, message: str, code: str, suggestion: str = None):
        self.message = message
        self.code = code
        self.suggestion = suggestion
        super().__init__(self.message)


class ValidationService:
    """Service for validating proximity analysis inputs"""

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate if coordinates are valid and within São Paulo State

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            Tuple of (is_valid, error_message, suggestion)
        """
        # Check if coordinates are valid numbers
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            return (
                False,
                "Invalid coordinates",
                "Provide numbers for latitude and longitude.",
            )

        # Check basic lat/lng bounds
        if not -90 <= lat <= 90:
            return (
                False,
                "Latitude out of range",
                f"Latitude must be between -90 and 90 (got {lat}).",
            )

        if not -180 <= lng <= 180:
            return (
                False,
                "Longitude out of range",
                f"Longitude must be between -180 and 180 (got {lng}).",
            )

        # Check if point is within São Paulo State bounds
        if not (SAO_PAULO_BOUNDS["min_lat"] <= lat <= SAO_PAULO_BOUNDS["max_lat"]):
            return (
                False,
                "Point outside São Paulo State",
                "Pick a point within the state's borders.",
            )

        if not (SAO_PAULO_BOUNDS["min_lng"] <= lng <= SAO_PAULO_BOUNDS["max_lng"]):
            return (
                False,
                "Point outside São Paulo State",
                "Pick a point within the state's borders.",
            )

        # Check if point is in ocean (simple heuristic - eastern coast check)
        if lng > -44.5 and lat < -23.5:
            logger.warning("Point possibly in ocean (coordinates withheld from logs)")
            return (
                False,
                "Point possibly in the ocean",
                "Pick a point on land within the state.",
            )

        return True, None, None

    @staticmethod
    def validate_radius(radius_km: float) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate analysis radius

        Args:
            radius_km: Radius in kilometers

        Returns:
            Tuple of (is_valid, error_message, suggestion)
        """
        if not isinstance(radius_km, (int, float)):
            return False, "Invalid radius", "Provide a number for the radius."

        if radius_km <= 0:
            return False, "Radius must be positive", "The radius must be greater than zero."

        if radius_km < 1:
            return (
                False,
                "Radius too small",
                "Use a radius of at least 1 km for a meaningful analysis.",
            )

        if radius_km > 100:
            return (
                False,
                "Radius too large",
                "The maximum radius is 100 km; larger ones give unreliable results.",
            )

        # Warning for large radius
        if radius_km > 50:
            logger.warning("Large radius requested: %s km", float(radius_km))

        return True, None, None

    @staticmethod
    def check_buffer_overlap(lat: float, lng: float, radius_km: float) -> dict:
        """
        Check if analysis buffer extends beyond São Paulo State

        Args:
            lat: Center latitude
            lng: Center longitude
            radius_km: Radius in kilometers

        Returns:
            Dict with overlap information
        """
        # Create buffer circle
        point = Point(lng, lat)

        # Convert radius to approximate degrees (1 degree ≈ 111 km at equator)
        radius_deg = radius_km / 111.0

        # Create approximate circular buffer
        buffer = point.buffer(radius_deg)

        # Get buffer bounds
        minx, miny, maxx, maxy = buffer.bounds

        # Check if buffer extends beyond state bounds
        extends_south = miny < SAO_PAULO_BOUNDS["min_lat"]
        extends_north = maxy > SAO_PAULO_BOUNDS["max_lat"]
        extends_west = minx < SAO_PAULO_BOUNDS["min_lng"]
        extends_east = maxx > SAO_PAULO_BOUNDS["max_lng"]

        extends_beyond = any([extends_south, extends_north, extends_west, extends_east])

        result = {"extends_beyond_state": extends_beyond, "directions": []}

        if extends_south:
            result["directions"].append("south")
        if extends_north:
            result["directions"].append("north")
        if extends_west:
            result["directions"].append("west")
        if extends_east:
            result["directions"].append("east")

        if extends_beyond:
            direction_str = ", ".join(result["directions"])
            result["warning"] = (
                f"Part of the radius extends {direction_str} beyond São Paulo State; "
                "results may be incomplete."
            )
            logger.warning(f"Buffer extends beyond state: {direction_str}")

        return result

    @staticmethod
    def validate_analysis_request(lat: float, lng: float, radius_km: float) -> dict:
        """
        Comprehensive validation of proximity analysis request

        Args:
            lat: Latitude
            lng: Longitude
            radius_km: Radius in kilometers

        Returns:
            Dict with validation results

        Raises:
            ValidationError: If validation fails
        """
        # Validate coordinates
        coords_valid, coords_error, coords_suggestion = ValidationService.validate_coordinates(
            lat, lng
        )
        if not coords_valid:
            raise ValidationError(coords_error, "INVALID_COORDINATES", coords_suggestion)

        # Validate radius
        radius_valid, radius_error, radius_suggestion = ValidationService.validate_radius(radius_km)
        if not radius_valid:
            raise ValidationError(radius_error, "INVALID_RADIUS", radius_suggestion)

        # Check buffer overlap
        overlap_info = ValidationService.check_buffer_overlap(lat, lng, radius_km)

        result = {
            "valid": True,
            "coordinates": {"latitude": lat, "longitude": lng},
            "radius_km": radius_km,
            "warnings": [],
        }

        if overlap_info["extends_beyond_state"]:
            result["warnings"].append(overlap_info["warning"])

        # Add performance recommendations
        if radius_km > 30:
            result["warnings"].append("A radius above 30 km makes the analysis slower.")

        return result

    @staticmethod
    def is_point_in_ocean(lat: float, lng: float) -> bool:
        """
        Enhanced check if point is in ocean

        Uses more precise coastline heuristics

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            True if point is likely in ocean
        """
        # São Paulo coastline is roughly at longitude -44.5 to -46.0
        # Points east of -44.2 with latitude < -23.0 are likely in ocean

        # Eastern coast check
        if lng > -44.2 and lat < -23.0:
            return True

        # Southern coast check (near Cananéia)
        if lng > -47.8 and lat < -25.0:
            return True

        return False
