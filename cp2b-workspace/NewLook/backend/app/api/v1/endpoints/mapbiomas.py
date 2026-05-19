"""
MapBiomas API endpoints for raster tile serving
Provides dynamic tile generation from MapBiomas agricultural land use data
"""
from __future__ import annotations

import json
import math
import logging
from pathlib import Path
from io import BytesIO
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Response

try:
    import rasterio
    from rasterio.windows import Window
    from PIL import Image
    import numpy as np
    HAS_RASTER_DEPS = True
except ImportError:
    HAS_RASTER_DEPS = False
    np = None  # type: ignore

logger = logging.getLogger(__name__)

router = APIRouter()

# MapBiomas data directory
MAPBIOMAS_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "mapbiomas"
RASTER_PATH = MAPBIOMAS_DIR / "mapbiomas_agropecuaria_sp_2024.tif"
METADATA_PATH = MAPBIOMAS_DIR / "mapbiomas_metadata.json"

# Tile size
TILE_SIZE = 256

# MapBiomas color mapping (class code -> RGB tuple)
MAPBIOMAS_COLORS = {
    15: (255, 217, 102),   # Pastagem - Yellow
    9: (109, 76, 65),      # Silvicultura - Brown
    39: (225, 190, 231),   # Soja - Light purple
    20: (197, 225, 165),   # Cana-de-açúcar - Light green
    40: (255, 205, 210),   # Arroz - Light pink
    62: (248, 187, 217),   # Algodão - Pink
    41: (220, 237, 200),   # Outras Temporárias - Very light green
    46: (141, 110, 99),    # Café - Light brown
    47: (255, 167, 38),    # Citros - Orange
    35: (102, 187, 106),   # Dendê - Green
    48: (161, 136, 127),   # Outras Perenes - Grayish brown
}


def load_metadata() -> Dict[str, Any]:
    """Load MapBiomas metadata from JSON file"""
    try:
        if METADATA_PATH.exists():
            with open(METADATA_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading metadata: {e}")

    # Default metadata if file not found
    return {
        "year": 2024,
        "name": "MapBiomas Agropecuária SP",
        "crs": "EPSG:4326",
        "bounds": {
            "west": -53.11091487994166,
            "south": -25.35863198693838,
            "east": -44.16099970425887,
            "north": -19.779285588800445
        },
        "classes": {}
    }


def tile_to_bbox(z: int, x: int, y: int) -> tuple:
    """
    Convert tile coordinates to bounding box in WGS84

    Uses Web Mercator tile scheme (TMS/XYZ)

    Args:
        z: Zoom level
        x: Tile X coordinate
        y: Tile Y coordinate

    Returns:
        Tuple of (west, south, east, north) in degrees
    """
    n = 2.0 ** z

    # Calculate longitude bounds
    west = x / n * 360.0 - 180.0
    east = (x + 1) / n * 360.0 - 180.0

    # Calculate latitude bounds (using Mercator projection formula)
    lat_rad_north = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_rad_south = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))

    north = math.degrees(lat_rad_north)
    south = math.degrees(lat_rad_south)

    return (west, south, east, north)


def create_tile_image(data: np.ndarray) -> bytes:
    """
    Convert raster data to colored PNG tile

    Args:
        data: 2D numpy array with MapBiomas class codes

    Returns:
        PNG image bytes
    """
    height, width = data.shape

    # Create RGBA image (4 channels)
    rgba = np.zeros((height, width, 4), dtype=np.uint8)

    # Apply colors for each class
    for class_code, rgb in MAPBIOMAS_COLORS.items():
        mask = data == class_code
        rgba[mask, 0] = rgb[0]  # R
        rgba[mask, 1] = rgb[1]  # G
        rgba[mask, 2] = rgb[2]  # B
        rgba[mask, 3] = 200     # Alpha (semi-transparent)

    # Create PIL Image
    img = Image.fromarray(rgba, 'RGBA')

    # Resize to tile size if needed
    if img.size != (TILE_SIZE, TILE_SIZE):
        img = img.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.NEAREST)

    # Save to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)

    return buffer.getvalue()


def create_transparent_tile() -> bytes:
    """Create a fully transparent tile for areas outside raster bounds"""
    img = Image.new('RGBA', (TILE_SIZE, TILE_SIZE), (0, 0, 0, 0))
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


@router.get(
    "/metadata",
    summary="Get MapBiomas metadata",
    description="Returns MapBiomas raster metadata including bounds, CRS, and class definitions"
)
async def get_metadata():
    """
    Get MapBiomas raster metadata

    Returns class definitions with colors and names in Portuguese/English
    """
    metadata = load_metadata()

    # Add availability status
    metadata["available"] = RASTER_PATH.exists()

    if RASTER_PATH.exists():
        metadata["file_size_mb"] = round(RASTER_PATH.stat().st_size / (1024 * 1024), 2)

    return metadata


@router.get(
    "/tiles/{z}/{x}/{y}.png",
    summary="Get MapBiomas tile",
    description="Returns a 256x256 PNG tile with colored MapBiomas agricultural classes"
)
async def get_tile(z: int, x: int, y: int):
    """
    Get MapBiomas raster tile

    Converts raster data to colored PNG using MapBiomas color scheme.
    Returns transparent tile if outside raster bounds.

    Args:
        z: Zoom level (7-15 recommended)
        x: Tile X coordinate
        y: Tile Y coordinate

    Returns:
        PNG image response
    """
    if not HAS_RASTER_DEPS:
        raise HTTPException(
            status_code=500,
            detail="Raster processing dependencies not available (rasterio, PIL, numpy)"
        )

    if not RASTER_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="MapBiomas raster file not found"
        )

    # Limit zoom levels for performance
    if z < 5 or z > 16:
        raise HTTPException(
            status_code=400,
            detail=f"Zoom level {z} not supported. Use 5-16."
        )

    try:
        # Get tile bounding box
        tile_bbox = tile_to_bbox(z, x, y)
        west, south, east, north = tile_bbox

        # Open raster and check bounds
        with rasterio.open(RASTER_PATH) as src:
            raster_bounds = src.bounds

            # Check if tile is completely outside raster bounds
            if (east < raster_bounds.left or
                west > raster_bounds.right or
                north < raster_bounds.bottom or
                south > raster_bounds.top):
                # Return transparent tile
                png_bytes = create_transparent_tile()
                return Response(
                    content=png_bytes,
                    media_type="image/png",
                    headers={
                        "Cache-Control": "public, max-age=86400",  # 1 day cache
                        "Access-Control-Allow-Origin": "*"
                    }
                )

            # Calculate pixel coordinates for the tile bbox
            # Convert geographic coordinates to pixel coordinates
            inv_transform = ~src.transform

            # Get pixel coordinates for corners
            col_west, row_north = inv_transform * (west, north)
            col_east, row_south = inv_transform * (east, south)

            # Clamp to raster bounds
            col_start = max(0, int(col_west))
            row_start = max(0, int(row_north))
            col_end = min(src.width, int(col_east) + 1)
            row_end = min(src.height, int(row_south) + 1)

            # Calculate window
            width = col_end - col_start
            height = row_end - row_start

            if width <= 0 or height <= 0:
                png_bytes = create_transparent_tile()
                return Response(
                    content=png_bytes,
                    media_type="image/png",
                    headers={
                        "Cache-Control": "public, max-age=86400",
                        "Access-Control-Allow-Origin": "*"
                    }
                )

            # Read raster window with resampling to tile size
            window = Window(col_start, row_start, width, height)

            # Read data and resample to tile size
            data = src.read(
                1,  # First band
                window=window,
                out_shape=(TILE_SIZE, TILE_SIZE),
                resampling=rasterio.enums.Resampling.nearest
            )

            # Create colored tile
            png_bytes = create_tile_image(data)

            return Response(
                content=png_bytes,
                media_type="image/png",
                headers={
                    "Cache-Control": "public, max-age=86400",  # 1 day cache
                    "Access-Control-Allow-Origin": "*"
                }
            )

    except Exception as e:
        logger.error(f"Error generating tile {z}/{x}/{y}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating tile: {str(e)}"
        )


@router.get(
    "/classes",
    summary="Get MapBiomas class definitions",
    description="Returns list of agricultural land use classes with colors"
)
async def get_classes():
    """
    Get MapBiomas agricultural class definitions

    Returns class codes, names (PT/EN), and colors
    """
    metadata = load_metadata()
    return {
        "year": metadata.get("year", 2024),
        "classes": metadata.get("classes", {}),
        "total_classes": len(metadata.get("classes", {}))
    }


@router.get(
    "/bounds",
    summary="Get MapBiomas raster bounds",
    description="Returns geographic bounds of the MapBiomas raster"
)
async def get_bounds():
    """
    Get MapBiomas raster geographic bounds

    Returns bounding box in WGS84 coordinates
    """
    if not RASTER_PATH.exists():
        metadata = load_metadata()
        return metadata.get("bounds", {})

    try:
        with rasterio.open(RASTER_PATH) as src:
            bounds = src.bounds
            return {
                "west": bounds.left,
                "south": bounds.bottom,
                "east": bounds.right,
                "north": bounds.top,
                "crs": str(src.crs)
            }
    except Exception as e:
        logger.error(f"Error reading raster bounds: {e}")
        metadata = load_metadata()
        return metadata.get("bounds", {})
