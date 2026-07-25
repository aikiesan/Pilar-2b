#!/usr/bin/env python3
"""
Generate distance matrix SQL without external dependencies
Uses Haversine formula with only standard Python
"""

import csv
import math
from pathlib import Path

def haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate great-circle distance using Haversine formula"""
    R = 6371.0  # Earth radius in km

    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)

    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def generate_distance_matrix_sql():
    """Generate SQL for distance matrix"""

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data' / 'shapefiles' / 'brazil'
    centroids_file = data_dir / 'br_intermediary_regions_centroids.csv'

    print("="*80)
    print("GENERATING BRAZIL DISTANCE MATRIX SQL")
    print("="*80)

    # Load centroids
    print("\n[1/3] Loading centroids...")
    regions = []
    with open(centroids_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            regions.append({
                'cd_rgint': row['cd_rgint'],
                'nm_rgint': row['nm_rgint'],
                'lat': float(row['centroid_lat']),
                'lng': float(row['centroid_lng'])
            })

    print(f"   Loaded {len(regions)} regions")
    total_distances = len(regions) * len(regions)
    print(f"   Will compute {total_distances:,} distances ({len(regions)} × {len(regions)})")

    # Compute distances
    print("\n[2/3] Computing distances...")
    distances = []

    for i, origin in enumerate(regions):
        if (i + 1) % 10 == 0:
            progress = ((i + 1) / len(regions)) * 100
            print(f"   Progress: {progress:.0f}% ({i + 1}/{len(regions)} regions)")

        for target in regions:
            if origin['cd_rgint'] == target['cd_rgint']:
                dist_km = 0.0
            else:
                dist_km = haversine_distance(
                    origin['lat'], origin['lng'],
                    target['lat'], target['lng']
                )

            dist_squared = dist_km ** 2
            dist_cubed = dist_km ** 3

            distances.append({
                'origin': origin['cd_rgint'],
                'target': target['cd_rgint'],
                'distance_km': round(dist_km, 2),
                'distance_squared': round(dist_squared, 4),
                'distance_cubed': round(dist_cubed, 6)
            })

    print(f"   ✓ Computed {len(distances):,} distances")

    # Generate SQL
    print("\n[3/3] Generating SQL...")

    output_sql = data_dir / 'br_intermediary_regions_distances.sql'

    with open(output_sql, 'w', encoding='utf-8') as f:
        f.write("-- ============================================================================\n")
        f.write("-- PILAR-2b V3 - Brazil Distance Matrix\n")
        f.write("-- Pre-computed distances for all 133 intermediary regions\n")
        f.write(f"-- Total records: {len(distances):,}\n")
        f.write("-- ============================================================================\n\n")

        f.write("BEGIN;\n\n")

        f.write("-- Clear existing data\n")
        f.write("TRUNCATE TABLE br_region_distances;\n\n")

        # Insert in batches of 1000
        batch_size = 1000
        total_batches = (len(distances) + batch_size - 1) // batch_size

        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(distances))
            batch = distances[start_idx:end_idx]

            f.write(f"-- Batch {batch_num + 1}/{total_batches} (rows {start_idx + 1}-{end_idx})\n")
            f.write("INSERT INTO br_region_distances (origin_cd_rgint, target_cd_rgint, distance_km, distance_squared, distance_cubed)\n")
            f.write("VALUES\n")

            for i, row in enumerate(batch):
                comma = "," if i < len(batch) - 1 else ";"
                f.write(f"  ('{row['origin']}', '{row['target']}', "
                       f"{row['distance_km']}, {row['distance_squared']}, {row['distance_cubed']}){comma}\n")

            f.write("\n")

        f.write("COMMIT;\n\n")
        f.write("-- Verification\n")
        f.write("SELECT COUNT(*) as total_distances FROM br_region_distances;\n")
        f.write("SELECT MIN(distance_km) as min_distance,\n")
        f.write("       MAX(distance_km) as max_distance,\n")
        f.write("       AVG(distance_km)::numeric(8,2) as avg_distance\n")
        f.write("FROM br_region_distances WHERE distance_km > 0;\n")

    # Statistics
    non_zero = [d for d in distances if d['distance_km'] > 0]
    min_dist = min(d['distance_km'] for d in non_zero)
    max_dist = max(d['distance_km'] for d in distances)
    avg_dist = sum(d['distance_km'] for d in non_zero) / len(non_zero)

    print(f"   ✓ Created: {output_sql.name}")
    print(f"   Min distance: {min_dist:.2f} km")
    print(f"   Max distance: {max_dist:.2f} km")
    print(f"   Avg distance: {avg_dist:.2f} km")

    return output_sql

if __name__ == "__main__":
    generate_distance_matrix_sql()
    print("\n" + "="*80)
    print("COMPLETE!")
    print("="*80)
