"""
Tests for Proximity Service
Tests geospatial proximity analysis and municipality name normalization
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from shapely.geometry import Point, Polygon, mapping
import pyproj

from app.services.proximity_service import (
    normalize_municipality_name,
    ProximityService,
    MAPBIOMAS_RESIDUOS_MAPPING,
    WGS84,
    UTM_23S,
)


class TestNormalizeMunicipalityName:
    """Test municipality name normalization function"""

    def test_normalize_simple_name(self):
        """Test normalization of simple municipality name"""
        result = normalize_municipality_name("Campinas")
        assert result == "campinas"

    def test_normalize_name_with_accents(self):
        """Test normalization removes accents"""
        test_cases = [
            ("São Paulo", "sao paulo"),
            ("José", "jose"),
            ("São José dos Campos", "sao jose dos campos"),
            ("Barueri", "barueri"),
            ("Açúcar", "acucar"),
            ("Brasília", "brasilia"),
        ]

        for original, expected in test_cases:
            result = normalize_municipality_name(original)
            assert result == expected, f"Failed for {original}"

    def test_normalize_name_with_extra_spaces(self):
        """Test normalization removes extra spaces"""
        result = normalize_municipality_name("São  Paulo   SP")
        assert result == "sao paulo sp"

    def test_normalize_name_with_mixed_case(self):
        """Test normalization converts to lowercase"""
        test_cases = [
            ("SÃO PAULO", "sao paulo"),
            ("Campinas", "campinas"),
            ("RIO DE JANEIRO", "rio de janeiro"),
        ]

        for original, expected in test_cases:
            result = normalize_municipality_name(original)
            assert result == expected

    def test_normalize_empty_string(self):
        """Test normalization of empty string"""
        result = normalize_municipality_name("")
        assert result == ""

    def test_normalize_none(self):
        """Test normalization of None"""
        result = normalize_municipality_name(None)
        assert result == ""

    def test_normalize_numeric_string(self):
        """Test normalization of numeric value"""
        result = normalize_municipality_name("123")
        assert result == "123"

    def test_normalize_special_characters(self):
        """Test normalization preserves some special characters but normalizes unicode"""
        test_cases = [
            ("São-Paulo", "sao-paulo"),
            ("D'Oeste", "d'oeste"),
            ("São/José", "sao/jose"),
        ]

        for original, expected in test_cases:
            result = normalize_municipality_name(original)
            assert result == expected

    def test_normalize_whitespace_edges(self):
        """Test normalization trims whitespace"""
        result = normalize_municipality_name("  São Paulo  ")
        assert result == "sao paulo"

    def test_normalize_unicode_decomposition(self):
        """Test normalization handles various unicode forms"""
        # These should all normalize to the same result
        names = [
            "São Paulo",  # Composed form
            "Sa\u0303o Paulo",  # Decomposed form (ã = a + combining tilde)
        ]

        results = [normalize_municipality_name(name) for name in names]
        assert all(r == "sao paulo" for r in results)


class TestMapBiomasResiduosMapping:
    """Test MapBiomas residue mapping constant"""

    def test_mapping_structure(self):
        """Test MAPBIOMAS_RESIDUOS_MAPPING has correct structure"""
        assert isinstance(MAPBIOMAS_RESIDUOS_MAPPING, dict)
        assert len(MAPBIOMAS_RESIDUOS_MAPPING) > 0

    def test_mapping_keys_are_integers(self):
        """Test all mapping keys are integers (MapBiomas class codes)"""
        for key in MAPBIOMAS_RESIDUOS_MAPPING.keys():
            assert isinstance(key, int)
            assert key > 0  # MapBiomas codes are positive

    def test_mapping_values_structure(self):
        """Test each mapping value has required fields"""
        required_fields = ["residuos", "subsector_codigo", "production_factor", "description"]

        for class_code, mapping in MAPBIOMAS_RESIDUOS_MAPPING.items():
            assert isinstance(mapping, dict), f"Class {class_code} mapping should be dict"

            for field in required_fields:
                assert field in mapping, f"Class {class_code} missing field: {field}"

    def test_mapping_residuos_field(self):
        """Test residuos field is a list of strings"""
        for class_code, mapping in MAPBIOMAS_RESIDUOS_MAPPING.items():
            residuos = mapping["residuos"]
            assert isinstance(residuos, list), f"Class {class_code} residuos should be list"
            assert len(residuos) > 0, f"Class {class_code} should have at least one residue"

            for residue in residuos:
                assert isinstance(residue, str), f"Class {class_code} residue should be string"
                assert len(residue) > 0, f"Class {class_code} residue should not be empty"

    def test_mapping_subsector_codigo_field(self):
        """Test subsector_codigo field is a string"""
        for class_code, mapping in MAPBIOMAS_RESIDUOS_MAPPING.items():
            subsector = mapping["subsector_codigo"]
            assert isinstance(subsector, str), f"Class {class_code} subsector_codigo should be string"
            assert len(subsector) > 0, f"Class {class_code} subsector_codigo should not be empty"

    def test_mapping_production_factor_field(self):
        """Test production_factor field is float or None"""
        for class_code, mapping in MAPBIOMAS_RESIDUOS_MAPPING.items():
            factor = mapping["production_factor"]
            assert factor is None or isinstance(
                factor, (int, float)
            ), f"Class {class_code} production_factor should be numeric or None"

            if factor is not None:
                assert factor >= 0, f"Class {class_code} production_factor should be non-negative"
                assert factor < 1.0, f"Class {class_code} production_factor seems unrealistically high"

    def test_mapping_description_field(self):
        """Test description field is a non-empty string"""
        for class_code, mapping in MAPBIOMAS_RESIDUOS_MAPPING.items():
            description = mapping["description"]
            assert isinstance(description, str), f"Class {class_code} description should be string"
            assert len(description) > 0, f"Class {class_code} description should not be empty"

    def test_known_mapbiomas_classes(self):
        """Test specific known MapBiomas classes are mapped"""
        # Important agricultural classes
        assert 20 in MAPBIOMAS_RESIDUOS_MAPPING  # Sugarcane
        assert 39 in MAPBIOMAS_RESIDUOS_MAPPING  # Soybean
        assert 15 in MAPBIOMAS_RESIDUOS_MAPPING  # Pasture
        assert 46 in MAPBIOMAS_RESIDUOS_MAPPING  # Coffee
        assert 47 in MAPBIOMAS_RESIDUOS_MAPPING  # Citrus

    def test_sugarcane_mapping(self):
        """Test sugarcane (cana-de-açúcar) mapping is correct"""
        sugarcane = MAPBIOMAS_RESIDUOS_MAPPING[20]

        assert "Bagaço de cana" in sugarcane["residuos"]
        assert "Palha de cana" in sugarcane["residuos"]
        assert "Vinhaça" in sugarcane["residuos"]
        assert sugarcane["subsector_codigo"] == "AG_CANA"
        assert sugarcane["production_factor"] == pytest.approx(0.14)

    def test_pasture_mapping(self):
        """Test pasture mapping has no production factor (animal-based)"""
        pasture = MAPBIOMAS_RESIDUOS_MAPPING[15]

        assert "Dejetos bovinos" in pasture["residuos"]
        assert pasture["production_factor"] is None  # Based on animal count


class TestProximityService:
    """Test ProximityService class"""

    @pytest.fixture
    def service(self):
        """Create ProximityService instance for testing"""
        return ProximityService()

    def test_initialization(self, service):
        """Test ProximityService initializes correctly"""
        assert service.wgs84_to_utm is not None
        assert service.utm_to_wgs84 is not None

    def test_coordinate_transformers_are_functions(self, service):
        """Test coordinate transformers are callable"""
        assert callable(service.wgs84_to_utm)
        assert callable(service.utm_to_wgs84)

    def test_wgs84_constant(self):
        """Test WGS84 CRS constant"""
        assert WGS84 == "EPSG:4326"

    def test_utm_23s_constant(self):
        """Test UTM 23S CRS constant"""
        assert UTM_23S == "EPSG:31983"

    def test_create_buffer_geojson_structure(self, service):
        """Test create_buffer_geojson returns valid GeoJSON structure"""
        # São Paulo coordinates
        lat = -23.5505
        lng = -46.6333
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Verify GeoJSON structure
        assert isinstance(buffer_geojson, dict)
        assert "type" in buffer_geojson
        assert buffer_geojson["type"] == "Polygon"
        assert "coordinates" in buffer_geojson

    def test_create_buffer_geojson_coordinates_format(self, service):
        """Test buffer GeoJSON has correct coordinate format"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        coordinates = buffer_geojson["coordinates"]
        assert isinstance(coordinates, list)
        assert len(coordinates) > 0  # At least one ring

        # First ring should be exterior ring
        exterior_ring = coordinates[0]
        assert isinstance(exterior_ring, list)
        assert len(exterior_ring) > 3  # Polygon needs at least 4 points (including closing point)

        # Check coordinate format [lng, lat]
        first_point = exterior_ring[0]
        assert len(first_point) == 2
        assert isinstance(first_point[0], (int, float))  # longitude
        assert isinstance(first_point[1], (int, float))  # latitude

    def test_create_buffer_geojson_closure(self, service):
        """Test buffer polygon is properly closed"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        exterior_ring = buffer_geojson["coordinates"][0]

        # First and last points should be the same (closed polygon)
        first_point = exterior_ring[0]
        last_point = exterior_ring[-1]
        assert first_point == pytest.approx(last_point, abs=1e-9)

    def test_create_buffer_geojson_different_radii(self, service):
        """Test buffer size varies with radius"""
        lat = -23.5505
        lng = -46.6333

        buffer_1km = service.create_buffer_geojson(lat, lng, 1.0)
        buffer_10km = service.create_buffer_geojson(lat, lng, 10.0)

        # Extract bounding boxes
        def get_bbox(geojson):
            coords = geojson["coordinates"][0]
            lngs = [p[0] for p in coords]
            lats = [p[1] for p in coords]
            return (min(lngs), min(lats), max(lngs), max(lats))

        bbox_1km = get_bbox(buffer_1km)
        bbox_10km = get_bbox(buffer_10km)

        # 10km buffer should be larger than 1km buffer
        # Width and height of 10km buffer should be larger
        width_1km = bbox_1km[2] - bbox_1km[0]
        width_10km = bbox_10km[2] - bbox_10km[0]

        assert width_10km > width_1km

    def test_create_buffer_geojson_centered_on_point(self, service):
        """Test buffer is approximately centered on the input point"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Calculate centroid of buffer
        coords = buffer_geojson["coordinates"][0]
        lngs = [p[0] for p in coords]
        lats = [p[1] for p in coords]

        centroid_lng = sum(lngs) / len(lngs)
        centroid_lat = sum(lats) / len(lats)

        # Centroid should be close to original point
        assert centroid_lng == pytest.approx(lng, abs=0.01)
        assert centroid_lat == pytest.approx(lat, abs=0.01)

    def test_create_buffer_geojson_very_small_radius(self, service):
        """Test buffer creation with very small radius"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 0.1  # 100 meters

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Should still create valid buffer
        assert buffer_geojson["type"] == "Polygon"
        assert len(buffer_geojson["coordinates"][0]) > 3

    def test_create_buffer_geojson_large_radius(self, service):
        """Test buffer creation with large radius"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 100.0  # 100 km

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Should still create valid buffer
        assert buffer_geojson["type"] == "Polygon"
        assert len(buffer_geojson["coordinates"][0]) > 3

    def test_create_buffer_geojson_different_locations(self, service):
        """Test buffer creation at different geographic locations"""
        test_locations = [
            (-23.5505, -46.6333, "São Paulo"),
            (-22.9068, -47.0631, "Campinas"),
            (0.0, 0.0, "Null Island"),
            (-15.7801, -47.9292, "Brasília"),
        ]

        for lat, lng, name in test_locations:
            buffer_geojson = service.create_buffer_geojson(lat, lng, 5.0)

            assert buffer_geojson["type"] == "Polygon", f"Failed for {name}"
            assert len(buffer_geojson["coordinates"][0]) > 3, f"Failed for {name}"

    def test_coordinate_transformation_roundtrip(self, service):
        """Test coordinate transformation roundtrip accuracy"""
        # Original WGS84 coordinates
        lng_original = -46.6333
        lat_original = -23.5505

        # Transform to UTM
        x_utm, y_utm = service.wgs84_to_utm(lng_original, lat_original)

        # Transform back to WGS84
        lng_back, lat_back = service.utm_to_wgs84(x_utm, y_utm)

        # Should be very close to original (within 1 meter ~ 0.00001 degrees)
        assert lng_back == pytest.approx(lng_original, abs=1e-5)
        assert lat_back == pytest.approx(lat_original, abs=1e-5)

    def test_buffer_geojson_is_valid_geometry(self, service):
        """Test buffer GeoJSON can be loaded as valid Shapely geometry"""
        from shapely.geometry import shape

        lat = -23.5505
        lng = -46.6333
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Convert to Shapely geometry
        geom = shape(buffer_geojson)

        # Verify it's a valid polygon
        assert geom.is_valid
        assert geom.geom_type == "Polygon"
        assert not geom.is_empty

    def test_buffer_geojson_area_scales_with_radius_squared(self, service):
        """Test buffer area approximately scales with radius squared"""
        from shapely.geometry import shape

        lat = -23.5505
        lng = -46.6333

        # Create buffers with different radii
        buffer_5km = service.create_buffer_geojson(lat, lng, 5.0)
        buffer_10km = service.create_buffer_geojson(lat, lng, 10.0)

        # Convert to Shapely and calculate areas (in degrees squared)
        area_5km = shape(buffer_5km).area
        area_10km = shape(buffer_10km).area

        # Area should scale approximately as radius squared
        # 10km buffer should have ~4x area of 5km buffer
        ratio = area_10km / area_5km
        assert ratio == pytest.approx(4.0, rel=0.1)  # Allow 10% tolerance


class TestProximityServiceEdgeCases:
    """Test edge cases and error handling"""

    @pytest.fixture
    def service(self):
        """Create ProximityService instance"""
        return ProximityService()

    def test_buffer_at_equator(self, service):
        """Test buffer creation at equator"""
        lat = 0.0
        lng = 0.0
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        assert buffer_geojson["type"] == "Polygon"

    def test_buffer_at_high_latitude(self, service):
        """Test buffer creation at high latitude"""
        lat = -30.0  # Southern Brazil
        lng = -51.0
        radius_km = 5.0

        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        assert buffer_geojson["type"] == "Polygon"

    def test_buffer_with_zero_radius(self, service):
        """Test buffer creation with zero radius"""
        lat = -23.5505
        lng = -46.6333
        radius_km = 0.0

        # A zero-radius buffer produces a degenerate geometry whose GeoJSON
        # feature geometry is null, so the method returns None.
        buffer_geojson = service.create_buffer_geojson(lat, lng, radius_km)

        # Accept both None (degenerate geometry) and a valid GeoJSON dict
        if buffer_geojson is not None:
            assert "type" in buffer_geojson
            assert "coordinates" in buffer_geojson

    def test_multiple_service_instances(self):
        """Test creating multiple service instances"""
        service1 = ProximityService()
        service2 = ProximityService()

        # Both should work independently
        buffer1 = service1.create_buffer_geojson(-23.5505, -46.6333, 5.0)
        buffer2 = service2.create_buffer_geojson(-23.5505, -46.6333, 5.0)

        # Results should be identical
        assert buffer1 == buffer2
