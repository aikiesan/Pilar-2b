"""
PILAR-2b V3 - Shapefile Loader Utility
Loads and converts shapefiles to GeoJSON format
"""

import geopandas as gpd
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

# Path to shapefile data directory
SHAPEFILE_DIR = Path(__file__).parent.parent.parent / "data" / "shapefiles"


class ShapefileLoader:
    """Utility class to load shapefiles and convert to GeoJSON"""

    @staticmethod
    def load_shapefile_as_geojson(filename: str, simplify_tolerance: Optional[float] = None) -> Dict[str, Any]:
        """
        Load a shapefile and convert to GeoJSON format

        Args:
            filename: Shapefile name (without .shp extension)
            simplify_tolerance: Tolerance for geometry simplification (degrees)

        Returns:
            GeoJSON dict with FeatureCollection
        """
        try:
            shapefile_path = SHAPEFILE_DIR / f"{filename}.shp"

            if not shapefile_path.exists():
                logger.warning(f"Shapefile not found: {shapefile_path}")
                # Return empty FeatureCollection instead of raising error
                return {
                    "type": "FeatureCollection",
                    "features": [],
                    "metadata": {
                        "source": f"{filename}.shp",
                        "total_features": 0,
                        "crs": "EPSG:4326",
                        "note": f"Shapefile {filename} não encontrado no servidor",
                        "error": "File not found - shapefile bundle must be deployed to the server"
                    }
                }

            # Read shapefile
            logger.info(f"Loading shapefile: {filename}")
            gdf = gpd.read_file(shapefile_path)

            # Ensure WGS84 (EPSG:4326) for web mapping
            if gdf.crs != "EPSG:4326":
                logger.info(f"Reprojecting {filename} to EPSG:4326")
                gdf = gdf.to_crs("EPSG:4326")

            # Simplify geometry if requested (reduces file size)
            if simplify_tolerance:
                logger.info(f"Simplifying {filename} with tolerance {simplify_tolerance}")
                gdf['geometry'] = gdf['geometry'].simplify(tolerance=simplify_tolerance, preserve_topology=True)

            # Convert datetime/Timestamp columns to strings to avoid JSON serialization errors
            for col in gdf.columns:
                if col == 'geometry':
                    continue
                # Check for datetime64 types
                if pd.api.types.is_datetime64_any_dtype(gdf[col]):
                    gdf[col] = gdf[col].astype(str).replace('NaT', '')
                # Check for object columns that might contain Timestamps
                elif gdf[col].dtype == 'object' and len(gdf) > 0:
                    sample = gdf[col].dropna().iloc[0] if len(gdf[col].dropna()) > 0 else None
                    if sample is not None and hasattr(sample, 'timestamp'):
                        gdf[col] = gdf[col].apply(lambda x: str(x) if pd.notna(x) else '')

            # Convert to GeoJSON
            geojson_str = gdf.to_json()
            geojson_dict = json.loads(geojson_str)

            # Add metadata
            geojson_dict["metadata"] = {
                "source": f"{filename}.shp",
                "total_features": len(gdf),
                "crs": "EPSG:4326",
                "note": f"Dados do shapefile {filename}"
            }

            logger.info(f"Successfully converted {filename} ({len(gdf)} features)")
            return geojson_dict

        except Exception as e:
            logger.error(f"Error loading shapefile {filename}: {str(e)}")
            # Return empty FeatureCollection on any error
            return {
                "type": "FeatureCollection",
                "features": [],
                "metadata": {
                    "source": f"{filename}.shp",
                    "total_features": 0,
                    "crs": "EPSG:4326",
                    "note": f"Erro ao carregar {filename}",
                    "error": str(e)
                }
            }


# Singleton instance
_loader = ShapefileLoader()


def get_shapefile_loader() -> ShapefileLoader:
    """Get shapefile loader instance"""
    return _loader
