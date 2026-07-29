#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PILAR-2b V3 - Brazil Distance Matrix Pre-computation
Calculates all 133x133 = 17,689 distances between intermediary regions

This script pre-computes distances to optimize spillover calculations
Based on Prototipo_Choque_Marcelo distance approach

Author: CP2B Development Team
Date: 2025-12-01
"""

import pandas as pd
import numpy as np
import math
import time
import sys
import os
from pathlib import Path
from typing import Tuple, List

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate great-circle distance between two points using Haversine formula

    Args:
        lat1, lng1: Coordinates of first point (degrees)
        lat2, lng2: Coordinates of second point (degrees)

    Returns:
        Distance in kilometers

    Formula:
        a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)
        c = 2 * atan2(√a, √(1-a))
        d = R * c (where R = 6371 km)
    """
    # Earth radius in kilometers
    R = 6371.0

    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)

    # Differences
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Distance
    distance_km = R * c

    return distance_km


def compute_distance_matrix_from_csv(centroids_csv: str) -> pd.DataFrame:
    """
    Compute full distance matrix from centroids CSV

    Args:
        centroids_csv: Path to br_intermediary_regions_centroids.csv

    Returns:
        DataFrame with columns: origin_cd_rgint, target_cd_rgint, distance_km, distance_squared, distance_cubed
    """

    print("="*80)
    print("BRAZIL DISTANCE MATRIX COMPUTATION")
    print("="*80)

    start_time = time.time()

    # ========================================================================
    # STEP 1: LOAD CENTROIDS
    # ========================================================================

    print("\n[Step 1/4] Loading centroids from CSV...")

    if not os.path.exists(centroids_csv):
        raise FileNotFoundError(f"Centroids file not found: {centroids_csv}")

    centroids = pd.read_csv(centroids_csv)
    print(f"   Loaded {len(centroids)} regions")

    # Validate required columns
    required_cols = ['cd_rgint', 'nm_rgint', 'centroid_lat', 'centroid_lng']
    missing_cols = [col for col in required_cols if col not in centroids.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Check for null coordinates
    null_coords = centroids[
        centroids['centroid_lat'].isnull() | centroids['centroid_lng'].isnull()
    ]
    if len(null_coords) > 0:
        print(f"   WARNING: {len(null_coords)} regions have null coordinates!")
        print(f"   Regions: {null_coords['nm_rgint'].tolist()}")

    # Remove regions with null coordinates
    centroids = centroids.dropna(subset=['centroid_lat', 'centroid_lng'])
    print(f"   Valid regions with coordinates: {len(centroids)}")

    # ========================================================================
    # STEP 2: COMPUTE PAIRWISE DISTANCES
    # ========================================================================

    print("\n[Step 2/4] Computing pairwise distances...")
    print(f"   Total calculations: {len(centroids)} × {len(centroids)} = {len(centroids)**2:,}")

    distances_list = []
    total_calculations = len(centroids) * len(centroids)
    calculation_count = 0
    last_progress = 0

    for i, origin in centroids.iterrows():
        origin_code = origin['cd_rgint']
        origin_lat = origin['centroid_lat']
        origin_lng = origin['centroid_lng']

        for j, target in centroids.iterrows():
            target_code = target['cd_rgint']
            target_lat = target['centroid_lat']
            target_lng = target['centroid_lng']

            # Calculate distance
            if origin_code == target_code:
                # Distance to self is 0
                distance_km = 0.0
            else:
                distance_km = haversine_distance(
                    origin_lat, origin_lng,
                    target_lat, target_lng
                )

            # Pre-compute powers for spillover models
            distance_squared = distance_km ** 2
            distance_cubed = distance_km ** 3

            distances_list.append({
                'origin_cd_rgint': origin_code,
                'target_cd_rgint': target_code,
                'distance_km': round(distance_km, 2),
                'distance_squared': round(distance_squared, 4),
                'distance_cubed': round(distance_cubed, 6)
            })

            calculation_count += 1

            # Progress indicator
            progress = int((calculation_count / total_calculations) * 100)
            if progress >= last_progress + 10:
                print(f"   Progress: {progress}% ({calculation_count:,}/{total_calculations:,})")
                last_progress = progress

    print(f"   OK Computed {len(distances_list):,} distance pairs")

    # ========================================================================
    # STEP 3: CREATE DATAFRAME
    # ========================================================================

    print("\n[Step 3/4] Creating distance matrix DataFrame...")

    distance_matrix = pd.DataFrame(distances_list)

    print(f"   Shape: {distance_matrix.shape}")
    print(f"   Memory: {distance_matrix.memory_usage(deep=True).sum() / (1024**2):.2f} MB")

    # Statistics
    print(f"\n   Distance Statistics:")
    print(f"   Min distance: {distance_matrix[distance_matrix['distance_km'] > 0]['distance_km'].min():.2f} km")
    print(f"   Max distance: {distance_matrix['distance_km'].max():.2f} km")
    print(f"   Mean distance: {distance_matrix[distance_matrix['distance_km'] > 0]['distance_km'].mean():.2f} km")
    print(f"   Median distance: {distance_matrix[distance_matrix['distance_km'] > 0]['distance_km'].median():.2f} km")

    # ========================================================================
    # STEP 4: SAVE TO CSV
    # ========================================================================

    print("\n[Step 4/4] Saving distance matrix...")

    output_dir = Path(centroids_csv).parent
    output_csv = output_dir / 'br_intermediary_regions_distances.csv'

    distance_matrix.to_csv(output_csv, index=False)

    output_size = os.path.getsize(output_csv) / (1024 * 1024)
    print(f"   OK Saved to: {output_csv}")
    print(f"   File size: {output_size:.2f} MB")

    # ========================================================================
    # COMPLETION SUMMARY
    # ========================================================================

    end_time = time.time()
    elapsed = end_time - start_time

    print("\n" + "="*80)
    print("DISTANCE MATRIX COMPUTATION COMPLETE!")
    print("="*80)
    print(f"\nTime: {elapsed:.2f} seconds")
    print(f"Regions: {len(centroids)}")
    print(f"Distance pairs: {len(distance_matrix):,}")
    print(f"Output file: {output_csv}")
    print(f"File size: {output_size:.2f} MB")
    print("="*80)

    return distance_matrix


def generate_sql_insert_script(distance_matrix: pd.DataFrame, output_sql: str):
    """
    Generate SQL INSERT script for loading distances into database

    Args:
        distance_matrix: DataFrame with distance data
        output_sql: Path to output SQL file
    """

    print("\n[Bonus] Generating SQL INSERT script...")

    with open(output_sql, 'w', encoding='utf-8') as f:
        # Header
        f.write("-- ============================================================================\n")
        f.write("-- PILAR-2b V3 - Brazil Distance Matrix Data\n")
        f.write("-- Auto-generated distance data for all 133 intermediary regions\n")
        f.write(f"-- Total records: {len(distance_matrix):,}\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- ============================================================================\n\n")

        # Truncate existing data
        f.write("-- Clear existing data\n")
        f.write("TRUNCATE TABLE br_region_distances;\n\n")

        # Batch insert (1000 rows at a time for performance)
        f.write("-- Insert distance data (batched for performance)\n")

        batch_size = 1000
        total_batches = (len(distance_matrix) + batch_size - 1) // batch_size

        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(distance_matrix))
            batch = distance_matrix.iloc[start_idx:end_idx]

            f.write(f"\n-- Batch {batch_num + 1}/{total_batches} (rows {start_idx + 1}-{end_idx})\n")
            f.write("INSERT INTO br_region_distances (origin_cd_rgint, target_cd_rgint, distance_km, distance_squared, distance_cubed)\n")
            f.write("VALUES\n")

            for i, row in batch.iterrows():
                comma = "," if i < end_idx - 1 else ";"
                f.write(f"  ('{row['origin_cd_rgint']}', '{row['target_cd_rgint']}', "
                       f"{row['distance_km']}, {row['distance_squared']}, {row['distance_cubed']}){comma}\n")

            f.write("\n")

        # Footer
        f.write("-- ============================================================================\n")
        f.write("-- Verification query\n")
        f.write("-- ============================================================================\n")
        f.write("SELECT COUNT(*) as total_distances FROM br_region_distances;\n")
        f.write("SELECT MIN(distance_km) as min_distance, MAX(distance_km) as max_distance, AVG(distance_km)::numeric(8,2) as avg_distance FROM br_region_distances WHERE distance_km > 0;\n")

    sql_size = os.path.getsize(output_sql) / (1024 * 1024)
    print(f"   OK SQL script saved: {output_sql}")
    print(f"   File size: {sql_size:.2f} MB")


def main():
    """Main execution function"""

    # Paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data' / 'shapefiles' / 'brazil'
    centroids_csv = data_dir / 'br_intermediary_regions_centroids.csv'

    print(f"\nInput: {centroids_csv}")

    if not centroids_csv.exists():
        print(f"ERROR: Centroids file not found: {centroids_csv}")
        print("Please run optimize_br_regions.py first to generate centroids.")
        return 1

    # Compute distance matrix
    distance_matrix = compute_distance_matrix_from_csv(str(centroids_csv))

    # Generate SQL insert script
    output_sql = data_dir / 'br_intermediary_regions_distances.sql'
    generate_sql_insert_script(distance_matrix, str(output_sql))

    print("\nAll tasks completed successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
