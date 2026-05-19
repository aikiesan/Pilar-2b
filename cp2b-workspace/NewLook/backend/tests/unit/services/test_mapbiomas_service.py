"""
Unit tests for MapBiomas Service
Tests land use analysis from raster data within analysis buffers
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from collections import Counter
from pathlib import Path

from app.services.mapbiomas_service import (
    MapBiomasService,
    MAPBIOMAS_CLASSES,
    RASTERIO_AVAILABLE
)


@pytest.fixture
def mock_rasterio_available():
    """Mock rasterio as available"""
    with patch("app.services.mapbiomas_service.RASTERIO_AVAILABLE", True):
        yield


@pytest.fixture
def mock_rasterio_not_available():
    """Mock rasterio as not available"""
    with patch("app.services.mapbiomas_service.RASTERIO_AVAILABLE", False):
        yield


@pytest.fixture
def mock_raster_exists():
    """Mock raster file exists"""
    with patch.object(Path, 'exists', return_value=True):
        yield


@pytest.fixture
def mock_raster_not_exists():
    """Mock raster file does not exist"""
    with patch.object(Path, 'exists', return_value=False):
        yield


class TestInitialization:
    """Test service initialization"""

    def test_initialization_with_rasterio(self, mock_rasterio_available):
        """Test service initializes when rasterio is available"""
        service = MapBiomasService()

        assert service._rasterio_available is True
        assert service.raster_path is not None
        assert service._raster_info is None

    def test_initialization_without_rasterio(self, mock_rasterio_not_available):
        """Test service initializes gracefully without rasterio"""
        service = MapBiomasService()

        assert service._rasterio_available is False

    def test_coordinate_transformers_initialized(self, mock_rasterio_available):
        """Test coordinate transformers are created"""
        service = MapBiomasService()

        assert service.wgs84_to_utm is not None
        assert service.utm_to_wgs84 is not None


class TestGetRasterInfo:
    """Test _get_raster_info method"""

    def test_get_raster_info_when_unavailable(self, mock_rasterio_not_available):
        """Test returns None when rasterio not available"""
        service = MapBiomasService()

        info = service._get_raster_info()

        assert info is None

    @patch("app.services.mapbiomas_service.rasterio")
    def test_get_raster_info_caches_metadata(self, mock_rasterio, mock_rasterio_available, mock_raster_exists):
        """Test raster metadata is cached after first read"""
        # Mock rasterio.open
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.bounds = (-48, -25, -45, -22)
        mock_src.__enter__.return_value.res = (0.0001, 0.0001)
        mock_src.__enter__.return_value.nodata = 0
        mock_src.__enter__.return_value.width = 10000
        mock_src.__enter__.return_value.height = 10000

        mock_rasterio.open.return_value = mock_src

        service = MapBiomasService()

        # First call should read from file
        info1 = service._get_raster_info()
        # Second call should use cache
        info2 = service._get_raster_info()

        assert info1 == info2
        # rasterio.open should only be called once
        assert mock_rasterio.open.call_count == 1

    def test_get_raster_info_when_file_not_exists(self, mock_rasterio_available, mock_raster_not_exists):
        """Test returns None when raster file doesn't exist"""
        service = MapBiomasService()

        info = service._get_raster_info()

        assert info is None


class TestAnalyzeBuffer:
    """Test analyze_buffer method"""

    def test_analyze_buffer_without_rasterio(self, mock_rasterio_not_available):
        """Test returns error message when rasterio not available"""
        service = MapBiomasService()

        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=10)

        assert "error" in result
        assert "Rasterio library not installed" in result["error"]
        assert result["total_area_km2"] == 0
        assert result["by_class"] == {}
        assert result["agricultural_percent"] == 0

    def test_analyze_buffer_without_raster_file(self, mock_rasterio_available, mock_raster_not_exists):
        """Test returns error message when raster file not available"""
        service = MapBiomasService()

        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=10)

        assert "error" in result
        assert "MapBiomas raster not available" in result["error"]

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_analyze_buffer_with_data(self, mock_transform, mock_mask_func, mock_rasterio,
                                     mock_rasterio_available, mock_raster_exists):
        """Test successful buffer analysis with land use data"""
        # Mock raster data
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # Simulate pixel data: 70% agricultural (class 20 - sugarcane), 30% forest (class 3)
        pixel_data = np.array([20] * 70 + [3] * 30)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src

        # Mock transform (just return geometry unchanged)
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Verify results
        assert result["total_area_km2"] > 0
        assert "by_class" in result
        assert result["dominant_class"] == "Cana-de-açúcar"  # Class 20
        assert result["agricultural_percent"] == 70.0

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_analyze_buffer_multiple_classes(self, mock_transform, mock_mask_func, mock_rasterio,
                                            mock_rasterio_available, mock_raster_exists):
        """Test buffer analysis with multiple land use classes"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # Mix of classes: sugarcane, coffee, citrus, forest
        pixel_data = np.array([20] * 40 + [46] * 30 + [47] * 20 + [3] * 10)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=10)

        # Should have multiple classes
        assert len(result["by_class"]) == 4
        assert "20" in result["by_class"]  # Sugarcane
        assert "46" in result["by_class"]  # Coffee
        assert "47" in result["by_class"]  # Citrus
        assert "3" in result["by_class"]   # Forest

        # Agricultural classes: 20, 46, 47 = 90%
        assert result["agricultural_percent"] == 90.0

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_analyze_buffer_no_valid_data(self, mock_transform, mock_mask_func, mock_rasterio,
                                         mock_rasterio_available, mock_raster_exists):
        """Test buffer with no valid pixels (all nodata)"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # All pixels are nodata (0)
        pixel_data = np.array([0] * 100)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Should return empty result
        assert result["total_area_km2"] == 0
        assert result["by_class"] == {}
        assert result["dominant_class"] == "no_data"

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    def test_analyze_buffer_mask_exception(self, mock_mask_func, mock_rasterio,
                                          mock_rasterio_available, mock_raster_exists):
        """Test graceful handling of mask operation failure"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"

        mock_mask_func.side_effect = Exception("Mask operation failed")
        mock_rasterio.open.return_value = mock_src

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Should return empty result
        assert result["total_area_km2"] == 0
        assert result["dominant_class"] == "no_data"

    @patch("app.services.mapbiomas_service.rasterio")
    def test_analyze_buffer_general_exception(self, mock_rasterio,
                                             mock_rasterio_available, mock_raster_exists):
        """Test error handling for unexpected exceptions"""
        mock_rasterio.open.side_effect = Exception("Unexpected error")

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        assert "error" in result
        assert "Unexpected error" in result["error"]
        assert result["dominant_class"] == "error"

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_analyze_buffer_unknown_class(self, mock_transform, mock_mask_func, mock_rasterio,
                                         mock_rasterio_available, mock_raster_exists):
        """Test handling of unknown land use class"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # Include an unknown class ID (999)
        pixel_data = np.array([20] * 80 + [999] * 20)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Unknown class should be handled
        assert "999" in result["by_class"]
        assert result["by_class"]["999"]["name"] == "Classe 999"
        assert result["by_class"]["999"]["category"] == "unknown"

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_analyze_buffer_crs_transformation(self, mock_transform, mock_mask_func, mock_rasterio,
                                              mock_rasterio_available, mock_raster_exists):
        """Test buffer handles different raster CRS"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:31983"  # UTM instead of WGS84
        mock_src.__enter__.return_value.res = (30, 30)  # meters
        mock_src.__enter__.return_value.nodata = 0

        pixel_data = np.array([20] * 100)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Should still complete successfully
        assert result["total_area_km2"] > 0
        assert result["dominant_class"] == "Cana-de-açúcar"


class TestEmptyResult:
    """Test _empty_result method"""

    def test_empty_result_structure(self, mock_rasterio_available):
        """Test empty result has correct structure"""
        service = MapBiomasService()

        result = service._empty_result()

        assert result["total_area_km2"] == 0
        assert result["by_class"] == {}
        assert result["dominant_class"] == "no_data"
        assert result["agricultural_percent"] == 0
        assert "note" in result


class TestGetClassInfo:
    """Test get_class_info method"""

    def test_get_class_info_structure(self, mock_rasterio_available):
        """Test get_class_info returns complete class information"""
        service = MapBiomasService()

        info = service.get_class_info()

        assert "classes" in info
        assert "source" in info
        assert "year" in info
        assert "region" in info

    def test_get_class_info_includes_all_classes(self, mock_rasterio_available):
        """Test all MAPBIOMAS_CLASSES are included"""
        service = MapBiomasService()

        info = service.get_class_info()

        assert info["classes"] == MAPBIOMAS_CLASSES
        # Verify key classes exist
        assert 20 in info["classes"]  # Sugarcane
        assert 46 in info["classes"]  # Coffee
        assert 47 in info["classes"]  # Citrus
        assert 15 in info["classes"]  # Pasture

    def test_get_class_info_metadata(self, mock_rasterio_available):
        """Test metadata fields"""
        service = MapBiomasService()

        info = service.get_class_info()

        assert info["source"] == "MapBiomas Collection 8.0"
        assert info["year"] == 2024
        assert "São Paulo" in info["region"]


class TestMapBiomasClasses:
    """Test MAPBIOMAS_CLASSES constant"""

    def test_class_structure(self):
        """Test each class has required fields"""
        for class_id, class_info in MAPBIOMAS_CLASSES.items():
            assert "name" in class_info
            assert "color" in class_info
            assert "category" in class_info
            # Verify color is hex format
            assert class_info["color"].startswith("#")

    def test_agricultural_classes(self):
        """Test agricultural classes are properly categorized"""
        agricultural_classes = {
            class_id: info
            for class_id, info in MAPBIOMAS_CLASSES.items()
            if info["category"] == "agricultural"
        }

        # Should have multiple agricultural classes
        assert len(agricultural_classes) > 5
        # Key agricultural classes
        assert 20 in agricultural_classes  # Sugarcane
        assert 46 in agricultural_classes  # Coffee
        assert 47 in agricultural_classes  # Citrus
        assert 15 in agricultural_classes  # Pasture

    def test_category_types(self):
        """Test all valid category types"""
        categories = {info["category"] for info in MAPBIOMAS_CLASSES.values()}

        assert "agricultural" in categories
        assert "forestry" in categories
        assert "forest" in categories
        assert "water" in categories
        assert "urban" in categories
        assert "nodata" in categories

    def test_specific_classes(self):
        """Test specific known classes"""
        # Sugarcane
        assert MAPBIOMAS_CLASSES[20]["name"] == "Cana-de-açúcar"
        assert MAPBIOMAS_CLASSES[20]["category"] == "agricultural"

        # Coffee
        assert MAPBIOMAS_CLASSES[46]["name"] == "Café"
        assert MAPBIOMAS_CLASSES[46]["category"] == "agricultural"

        # Citrus
        assert MAPBIOMAS_CLASSES[47]["name"] == "Citros"
        assert MAPBIOMAS_CLASSES[47]["category"] == "agricultural"

        # Pasture
        assert MAPBIOMAS_CLASSES[15]["name"] == "Pastagem"
        assert MAPBIOMAS_CLASSES[15]["category"] == "agricultural"


class TestPixelCalculations:
    """Test pixel area and percentage calculations"""

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_pixel_area_calculation(self, mock_transform, mock_mask_func, mock_rasterio,
                                   mock_rasterio_available, mock_raster_exists):
        """Test pixel area calculation is reasonable"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)  # ~100m resolution
        mock_src.__enter__.return_value.nodata = 0

        pixel_data = np.array([20] * 100)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Total area should be reasonable (100 pixels at ~100m resolution)
        assert result["total_area_km2"] > 0
        assert result["total_pixels"] == 100

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_percentage_calculation(self, mock_transform, mock_mask_func, mock_rasterio,
                                   mock_rasterio_available, mock_raster_exists):
        """Test percentage calculations sum to 100"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # Equal distribution: 4 classes with 25 pixels each
        pixel_data = np.array([20] * 25 + [46] * 25 + [47] * 25 + [3] * 25)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Each class should be 25%
        total_percent = sum(cls["percent"] for cls in result["by_class"].values())
        assert abs(total_percent - 100.0) < 0.1  # Allow rounding error

    @patch("app.services.mapbiomas_service.rasterio")
    @patch("app.services.mapbiomas_service.mask")
    @patch("app.services.mapbiomas_service.transform")
    def test_dominant_class_detection(self, mock_transform, mock_mask_func, mock_rasterio,
                                     mock_rasterio_available, mock_raster_exists):
        """Test dominant class is correctly identified"""
        mock_src = MagicMock()
        mock_src.__enter__.return_value.crs = "EPSG:4326"
        mock_src.__enter__.return_value.res = (0.001, 0.001)
        mock_src.__enter__.return_value.nodata = 0

        # 60% coffee, 30% citrus, 10% forest
        pixel_data = np.array([46] * 60 + [47] * 30 + [3] * 10)
        out_image = np.array([pixel_data])

        mock_mask_func.return_value = (out_image, None)
        mock_rasterio.open.return_value = mock_src
        mock_transform.side_effect = lambda transformer, geom: geom

        service = MapBiomasService()
        result = service.analyze_buffer(lat=-23.5505, lng=-46.6333, radius_km=5)

        # Coffee should be dominant
        assert result["dominant_class"] == "Café"
        assert result["by_class"]["46"]["percent"] == 60.0


class TestCoordinateTransformations:
    """Test coordinate transformation logic"""

    def test_transformers_are_callable(self, mock_rasterio_available):
        """Test coordinate transformers can be called"""
        service = MapBiomasService()

        # Should not raise errors
        assert callable(service.wgs84_to_utm)
        assert callable(service.utm_to_wgs84)

    def test_wgs84_to_utm_transformation(self, mock_rasterio_available):
        """Test WGS84 to UTM transformation"""
        service = MapBiomasService()

        # São Paulo coordinates
        lng, lat = -46.6333, -23.5505
        x, y = service.wgs84_to_utm(lng, lat)

        # UTM coordinates should be in meters (large values)
        assert x > 100000  # Easting
        assert y > 7000000  # Northing (southern hemisphere)

    def test_utm_to_wgs84_transformation(self, mock_rasterio_available):
        """Test UTM to WGS84 transformation"""
        service = MapBiomasService()

        # Sample UTM coordinates for São Paulo area
        x, y = 330000, 7400000
        lng, lat = service.utm_to_wgs84(x, y)

        # Should be near São Paulo
        assert -48 < lng < -45
        assert -25 < lat < -22

    def test_round_trip_transformation(self, mock_rasterio_available):
        """Test round-trip transformation preserves coordinates"""
        service = MapBiomasService()

        # Original coordinates
        orig_lng, orig_lat = -46.6333, -23.5505

        # Round trip
        x, y = service.wgs84_to_utm(orig_lng, orig_lat)
        final_lng, final_lat = service.utm_to_wgs84(x, y)

        # Should be very close to original (allow small error)
        assert abs(final_lng - orig_lng) < 0.0001
        assert abs(final_lat - orig_lat) < 0.0001
