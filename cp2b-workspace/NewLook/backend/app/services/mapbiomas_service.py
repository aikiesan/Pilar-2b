"""
PILAR-2b V3 - MapBiomas Raster Service
Land use analysis from MapBiomas raster data within analysis buffers
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path
import numpy as np
from collections import Counter

# Optional rasterio import - requires GDAL system dependencies
try:
    import rasterio
    from rasterio.mask import mask
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False
    rasterio = None
    mask = None

from shapely.geometry import Point, mapping
from shapely.ops import transform
import pyproj

logger = logging.getLogger(__name__)

# MapBiomas land use classes for São Paulo agricultural areas
# Based on MapBiomas Collection 8.0
MAPBIOMAS_CLASSES = {
    15: {
        "name": "Pastagem",
        "color": "#FFD966",
        "category": "agricultural"
    },
    9: {
        "name": "Silvicultura",
        "color": "#6D4C41",
        "category": "forestry"
    },
    39: {
        "name": "Soja",
        "color": "#E1BEE7",
        "category": "agricultural"
    },
    20: {
        "name": "Cana-de-açúcar",
        "color": "#C5E1A5",
        "category": "agricultural"
    },
    40: {
        "name": "Arroz",
        "color": "#FFCDD2",
        "category": "agricultural"
    },
    62: {
        "name": "Algodão",
        "color": "#F8BBD9",
        "category": "agricultural"
    },
    41: {
        "name": "Outras Temporárias",
        "color": "#DCEDC8",
        "category": "agricultural"
    },
    46: {
        "name": "Café",
        "color": "#8D6E63",
        "category": "agricultural"
    },
    47: {
        "name": "Citros",
        "color": "#FFA726",
        "category": "agricultural"
    },
    35: {
        "name": "Dendê",
        "color": "#66BB6A",
        "category": "agricultural"
    },
    48: {
        "name": "Outras Perenes",
        "color": "#A1887F",
        "category": "agricultural"
    },
    # Additional classes that might appear
    0: {
        "name": "Sem dados",
        "color": "#000000",
        "category": "nodata"
    },
    3: {
        "name": "Formação Florestal",
        "color": "#1F8D49",
        "category": "forest"
    },
    4: {
        "name": "Formação Savânica",
        "color": "#7DC975",
        "category": "forest"
    },
    11: {
        "name": "Área Alagada",
        "color": "#519799",
        "category": "water"
    },
    12: {
        "name": "Formação Campestre",
        "color": "#D6BC74",
        "category": "grassland"
    },
    21: {
        "name": "Mosaico Agricultura-Pastagem",
        "color": "#FFEFC3",
        "category": "agricultural"
    },
    24: {
        "name": "Infraestrutura Urbana",
        "color": "#AF2A2A",
        "category": "urban"
    },
    25: {
        "name": "Outra Área não Vegetada",
        "color": "#FF99FF",
        "category": "other"
    },
    33: {
        "name": "Rio, Lago e Oceano",
        "color": "#0000FF",
        "category": "water"
    }
}

# Path to MapBiomas raster
MAPBIOMAS_DIR = Path(__file__).parent.parent.parent / "data" / "mapbiomas"
RASTER_PATH = MAPBIOMAS_DIR / "mapbiomas_agropecuaria_sp_2024.tif"

# Coordinate reference systems
WGS84 = "EPSG:4326"
UTM_23S = "EPSG:31983"


class MapBiomasService:
    """Service for MapBiomas raster analysis"""

    def __init__(self):
        """Initialize service and check raster availability"""
        self.raster_path = RASTER_PATH
        self._raster_info = None
        self._rasterio_available = RASTERIO_AVAILABLE

        # Coordinate transformers
        self.wgs84_to_utm = pyproj.Transformer.from_crs(
            WGS84, UTM_23S, always_xy=True
        ).transform
        self.utm_to_wgs84 = pyproj.Transformer.from_crs(
            UTM_23S, WGS84, always_xy=True
        ).transform

        if not RASTERIO_AVAILABLE:
            logger.warning("Rasterio not available - MapBiomas analysis disabled")
        elif not self.raster_path.exists():
            logger.warning(f"MapBiomas raster not found at {self.raster_path}")

    def _get_raster_info(self) -> Optional[Dict[str, Any]]:
        """Get cached raster metadata"""
        if not self._rasterio_available:
            return None
        if self._raster_info is None and self.raster_path.exists():
            with rasterio.open(self.raster_path) as src:
                self._raster_info = {
                    "crs": str(src.crs),
                    "bounds": src.bounds,
                    "resolution": src.res,
                    "nodata": src.nodata,
                    "width": src.width,
                    "height": src.height
                }
        return self._raster_info

    def analyze_buffer(
        self, lat: float, lng: float, radius_km: float
    ) -> Dict[str, Any]:
        """
        Analyze MapBiomas land use within a buffer.

        Creates a circular buffer around the point and samples all
        MapBiomas pixels within, calculating area percentages by class.

        Args:
            lat: Latitude of center point
            lng: Longitude of center point
            radius_km: Radius in kilometers

        Returns:
            Dictionary with land use analysis results
        """
        if not self._rasterio_available:
            return {
                "error": "Rasterio library not installed - MapBiomas analysis unavailable",
                "total_area_km2": 0,
                "by_class": {},
                "dominant_class": "unknown",
                "agricultural_percent": 0
            }

        if not self.raster_path.exists():
            return {
                "error": "MapBiomas raster not available",
                "total_area_km2": 0,
                "by_class": {},
                "dominant_class": "unknown",
                "agricultural_percent": 0
            }

        try:
            # Create buffer geometry
            point = Point(lng, lat)
            point_utm = transform(self.wgs84_to_utm, point)
            buffer_utm = point_utm.buffer(radius_km * 1000)
            buffer_wgs84 = transform(self.utm_to_wgs84, buffer_utm)

            # Open raster and extract pixels in buffer
            with rasterio.open(self.raster_path) as src:
                # Get raster CRS to ensure buffer is in correct projection
                if src.crs != WGS84:
                    # Transform buffer to raster CRS
                    raster_crs = pyproj.CRS(src.crs)
                    wgs84_crs = pyproj.CRS(WGS84)
                    transformer = pyproj.Transformer.from_crs(
                        wgs84_crs, raster_crs, always_xy=True
                    ).transform
                    buffer_for_mask = transform(transformer, buffer_wgs84)
                else:
                    buffer_for_mask = buffer_wgs84

                # Mask raster with buffer geometry
                try:
                    out_image, out_transform = mask(
                        src,
                        [mapping(buffer_for_mask)],
                        crop=True,
                        nodata=0,
                        filled=True
                    )
                except Exception as e:
                    logger.warning(f"Mask operation failed: {e}")
                    return self._empty_result()

                # Flatten to 1D array and remove nodata
                data = out_image[0].flatten()
                nodata_value = src.nodata if src.nodata is not None else 0

                # Filter out nodata
                valid_data = data[data != nodata_value]

                if len(valid_data) == 0:
                    return self._empty_result()

                # Count pixels by class
                pixel_counts = Counter(valid_data)
                total_pixels = len(valid_data)

                # Calculate pixel area in km²
                # Resolution is in degrees, convert to approximate km²
                res_x, res_y = src.res

                # Approximate conversion at São Paulo latitude (~22°S)
                # 1 degree latitude ≈ 111 km
                # 1 degree longitude ≈ 111 * cos(22°) ≈ 103 km
                km_per_deg_lat = 111.0
                km_per_deg_lng = 111.0 * np.cos(np.radians(abs(lat)))

                pixel_area_km2 = abs(res_x * km_per_deg_lng * res_y * km_per_deg_lat)

                # Build results by class
                by_class = {}
                agricultural_pixels = 0

                for class_id, count in pixel_counts.items():
                    class_id = int(class_id)
                    class_info = MAPBIOMAS_CLASSES.get(class_id, {
                        "name": f"Classe {class_id}",
                        "color": "#808080",
                        "category": "unknown"
                    })

                    area_km2 = count * pixel_area_km2
                    percent = (count / total_pixels) * 100

                    by_class[str(class_id)] = {
                        "class_id": class_id,
                        "name": class_info["name"],
                        "color": class_info["color"],
                        "category": class_info["category"],
                        "pixel_count": int(count),
                        "area_km2": round(area_km2, 4),
                        "percent": round(percent, 2)
                    }

                    # Sum agricultural pixels
                    if class_info["category"] == "agricultural":
                        agricultural_pixels += count

                # Find dominant class
                if pixel_counts:
                    dominant_class_id = pixel_counts.most_common(1)[0][0]
                    dominant_info = MAPBIOMAS_CLASSES.get(int(dominant_class_id), {})
                    dominant_class = dominant_info.get("name", f"Classe {dominant_class_id}")
                else:
                    dominant_class = "unknown"

                # Calculate total area and agricultural percentage
                total_area_km2 = total_pixels * pixel_area_km2
                agricultural_percent = (agricultural_pixels / total_pixels * 100) if total_pixels > 0 else 0

                return {
                    "total_area_km2": round(total_area_km2, 2),
                    "by_class": by_class,
                    "dominant_class": dominant_class,
                    "agricultural_percent": round(agricultural_percent, 2),
                    "total_pixels": total_pixels,
                    "pixel_resolution_m": round(np.sqrt(pixel_area_km2) * 1000, 2)
                }

        except Exception as e:
            logger.error(f"MapBiomas analysis failed: {e}")
            return {
                "error": str(e),
                "total_area_km2": 0,
                "by_class": {},
                "dominant_class": "error",
                "agricultural_percent": 0
            }

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            "total_area_km2": 0,
            "by_class": {},
            "dominant_class": "no_data",
            "agricultural_percent": 0,
            "note": "No MapBiomas data found in buffer area"
        }

    def get_class_info(self) -> Dict[str, Any]:
        """
        Return MapBiomas class definitions.

        Useful for building legends and color scales.
        """
        return {
            "classes": MAPBIOMAS_CLASSES,
            "source": "MapBiomas Collection 8.0",
            "year": 2024,
            "region": "São Paulo - Áreas Agropecuárias"
        }
