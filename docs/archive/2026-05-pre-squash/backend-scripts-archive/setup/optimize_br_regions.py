#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PILAR-2b V3 - Brazil Intermediary Regions Optimization Script
Optimizes BR_RG_Intermediarias_2024 shapefile for economic simulation

Based on Prototipo_Choque_Marcelo optimization approach
Targets: < 2MB GeoJSON, fast loading, 133 intermediary regions

Author: CP2B Development Team
Date: 2025-12-01
"""

import geopandas as gpd
import pandas as pd
import numpy as np
import json
import time
import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def optimize_br_intermediary_regions(
    input_shapefile: str,
    output_dir: str,
    simplification_tolerance: float = 0.01
):
    """
    Optimize Brazil intermediary regions shapefile for web use

    Args:
        input_shapefile: Path to BR_RG_Intermediarias_2024.shp
        output_dir: Directory to save optimized files
        simplification_tolerance: Geometry simplification tolerance (default: 0.01)

    Returns:
        dict: Optimization results with file sizes and metrics
    """

    print("="*80)
    print("PILAR-2b V3 - BRAZIL INTERMEDIARY REGIONS OPTIMIZATION")
    print("="*80)

    start_time = time.time()

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    try:
        # ========================================================================
        # STEP 1: LOAD SHAPEFILE
        # ========================================================================

        print("\n[Step 1/6] Loading shapefile...")
        gdf = gpd.read_file(input_shapefile)

        print(f"   Loaded {len(gdf)} regions")
        print(f"   CRS: {gdf.crs}")
        print(f"   Columns: {list(gdf.columns)}")
        print(f"   Memory: {gdf.memory_usage(deep=True).sum() / (1024**2):.2f} MB")

        # ========================================================================
        # STEP 2: VALIDATE AND CLEAN DATA
        # ========================================================================

        print("\n[Step 2/6] Validating and cleaning data...")

        # Ensure CRS is WGS84 (EPSG:4326) for web compatibility
        if gdf.crs.to_epsg() != 4326:
            print(f"   Converting CRS from {gdf.crs} to EPSG:4326...")
            gdf = gdf.to_crs(epsg=4326)

        # Validate geometries
        invalid_geoms = ~gdf.geometry.is_valid
        if invalid_geoms.any():
            print(f"   WARNING: {invalid_geoms.sum()} invalid geometries found")
            print(f"   Fixing invalid geometries...")
            gdf.loc[invalid_geoms, 'geometry'] = gdf.loc[invalid_geoms, 'geometry'].buffer(0)

        # Check for empty geometries
        empty_geoms = gdf.geometry.is_empty
        if empty_geoms.any():
            print(f"   WARNING: {empty_geoms.sum()} empty geometries found")
            gdf = gdf[~empty_geoms]

        print(f"   OK Data validated: {len(gdf)} regions")

        # ========================================================================
        # STEP 3: CALCULATE CENTROIDS FOR SPILLOVER
        # ========================================================================

        print("\n[Step 3/6] Calculating centroids...")

        # Calculate centroids for spillover calculations
        gdf['centroid_lat'] = gdf.geometry.centroid.y
        gdf['centroid_lng'] = gdf.geometry.centroid.x

        print(f"   OK Centroids calculated")

        # ========================================================================
        # STEP 4: GEOMETRY SIMPLIFICATION
        # ========================================================================

        print("\n[Step 4/6] Simplifying geometries...")
        print(f"   Tolerance: {simplification_tolerance} degrees")

        # Store original geometry for comparison
        original_coords = sum(len(geom.exterior.coords) if geom.geom_type == 'Polygon'
                             else sum(len(p.exterior.coords) for p in geom.geoms)
                             for geom in gdf.geometry)

        # Apply Douglas-Peucker simplification
        gdf['geometry'] = gdf.geometry.simplify(
            tolerance=simplification_tolerance,
            preserve_topology=True
        )

        # Calculate simplified coordinates
        simplified_coords = sum(len(geom.exterior.coords) if geom.geom_type == 'Polygon'
                               else sum(len(p.exterior.coords) for p in geom.geoms)
                               for geom in gdf.geometry)

        reduction_percent = (1 - simplified_coords / original_coords) * 100

        print(f"   Original coordinates: {original_coords:,}")
        print(f"   Simplified coordinates: {simplified_coords:,}")
        print(f"   Reduction: {reduction_percent:.1f}%")

        # ========================================================================
        # STEP 5: PREPARE OUTPUT DATAFRAME
        # ========================================================================

        print("\n[Step 5/6] Preparing output data...")

        # Select and rename columns for consistency
        gdf_output = gdf[[
            'CD_RGINT',      # Region code
            'NM_RGINT',      # Region name
            'CD_UF',         # State code
            'NM_UF',         # State name
            'SIGLA_UF',      # State abbreviation
            'AREA_KM2',      # Area in km²
            'centroid_lat',  # Centroid latitude
            'centroid_lng',  # Centroid longitude
            'geometry'       # Geometry
        ]].copy()

        # Rename columns to match CP2B naming conventions
        gdf_output.columns = [
            'cd_rgint',
            'nm_rgint',
            'cd_uf',
            'nm_uf',
            'sigla_uf',
            'area_km2',
            'centroid_lat',
            'centroid_lng',
            'geometry'
        ]

        # Clean region names
        gdf_output['nm_rgint'] = gdf_output['nm_rgint'].str.strip()
        gdf_output['nm_uf'] = gdf_output['nm_uf'].str.strip()

        print(f"   OK Data prepared with {len(gdf_output.columns)} columns")

        # ========================================================================
        # STEP 6: SAVE OPTIMIZED FILES
        # ========================================================================

        print("\n[Step 6/6] Saving optimized files...")

        results = {}

        # Save as GeoJSON (for web use)
        geojson_path = os.path.join(output_dir, 'br_intermediary_regions.geojson')
        print(f"   Saving GeoJSON to {geojson_path}...")
        gdf_output.to_file(geojson_path, driver='GeoJSON')
        geojson_size = os.path.getsize(geojson_path) / (1024 * 1024)
        results['geojson'] = {'path': geojson_path, 'size_mb': geojson_size}
        print(f"   OK GeoJSON saved: {geojson_size:.2f} MB")

        # Save as GeoParquet (for backend use)
        parquet_path = os.path.join(output_dir, 'br_intermediary_regions.parquet')
        print(f"   Saving GeoParquet to {parquet_path}...")
        gdf_output.to_parquet(parquet_path, compression='snappy', index=False)
        parquet_size = os.path.getsize(parquet_path) / (1024 * 1024)
        results['parquet'] = {'path': parquet_path, 'size_mb': parquet_size}
        print(f"   OK GeoParquet saved: {parquet_size:.2f} MB")

        # Save centroids as CSV (for quick distance calculations)
        centroids_path = os.path.join(output_dir, 'br_intermediary_regions_centroids.csv')
        print(f"   Saving centroids to {centroids_path}...")
        centroids_df = gdf_output[['cd_rgint', 'nm_rgint', 'cd_uf', 'centroid_lat', 'centroid_lng']].copy()
        centroids_df.to_csv(centroids_path, index=False, encoding='utf-8')
        centroids_size = os.path.getsize(centroids_path) / 1024
        results['centroids'] = {'path': centroids_path, 'size_kb': centroids_size}
        print(f"   OK Centroids saved: {centroids_size:.2f} KB")

        # Save metadata
        metadata_path = os.path.join(output_dir, 'br_intermediary_regions_metadata.json')
        print(f"   Saving metadata to {metadata_path}...")
        metadata = {
            'source': os.path.basename(input_shapefile),
            'total_regions': len(gdf_output),
            'crs': 'EPSG:4326',
            'simplification_tolerance': simplification_tolerance,
            'coordinate_reduction_percent': reduction_percent,
            'optimization_date': time.strftime('%Y-%m-%d %H:%M:%S'),
            'files': {
                'geojson': {
                    'path': os.path.basename(geojson_path),
                    'size_mb': geojson_size
                },
                'parquet': {
                    'path': os.path.basename(parquet_path),
                    'size_mb': parquet_size
                },
                'centroids': {
                    'path': os.path.basename(centroids_path),
                    'size_kb': centroids_size
                }
            },
            'regions_by_state': gdf_output.groupby('sigla_uf')['cd_rgint'].count().to_dict()
        }
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"   OK Metadata saved")

        # ========================================================================
        # SUMMARY
        # ========================================================================

        end_time = time.time()
        elapsed = end_time - start_time

        print("\n" + "="*80)
        print("OPTIMIZATION COMPLETE!")
        print("="*80)
        print(f"\nTime: {elapsed:.2f} seconds")
        print(f"Regions: {len(gdf_output)}")
        print(f"States covered: {gdf_output['sigla_uf'].nunique()}")
        print(f"\nFiles created:")
        print(f"  - GeoJSON: {geojson_size:.2f} MB")
        print(f"  - GeoParquet: {parquet_size:.2f} MB")
        print(f"  - Centroids CSV: {centroids_size:.2f} KB")
        print(f"  - Metadata JSON")
        print(f"\nGeometry simplification: {reduction_percent:.1f}% reduction")
        print("="*80)

        return {
            'success': True,
            'elapsed_time': elapsed,
            'total_regions': len(gdf_output),
            'files': results,
            'metadata': metadata
        }

    except Exception as e:
        print(f"\nERROR during optimization: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


def main():
    """Main execution function"""

    # Default paths
    input_shapefile = r"C:\Users\Lucas\Downloads\Extrato\BR_RG_Intermediarias_2024\BR_RG_Intermediarias_2024.shp"

    # Output to backend data directory
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / 'data' / 'shapefiles' / 'brazil'

    print(f"\nInput: {input_shapefile}")
    print(f"Output: {output_dir}\n")

    # Check if input file exists
    if not os.path.exists(input_shapefile):
        print(f"ERROR: Input shapefile not found: {input_shapefile}")
        print("Please provide the correct path to BR_RG_Intermediarias_2024.shp")
        return 1

    # Run optimization
    results = optimize_br_intermediary_regions(
        input_shapefile=input_shapefile,
        output_dir=str(output_dir),
        simplification_tolerance=0.01  # 0.01 degrees ≈ 1km
    )

    if results['success']:
        print("\nOptimization successful!")
        print(f"Files saved to: {output_dir}")
        return 0
    else:
        print("\nOptimization failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
