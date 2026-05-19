#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inspect BR intermediary regions shapefile structure
"""
import geopandas as gpd
import os
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

shapefile_path = r"C:\Users\Lucas\Downloads\Extrato\BR_RG_Intermediarias_2024\BR_RG_Intermediarias_2024.shp"

if os.path.exists(shapefile_path):
    print(f"OK Shapefile found: {shapefile_path}")

    # Read shapefile
    gdf = gpd.read_file(shapefile_path)

    print(f"\nSHAPEFILE INFO:")
    print(f"   Shape: {gdf.shape}")
    print(f"   CRS: {gdf.crs}")
    print(f"   Columns: {list(gdf.columns)}")

    print(f"\nFIRST 5 ROWS:")
    print(gdf.head())

    print(f"\nREGION COUNT:")
    if 'NM_RGINT' in gdf.columns:
        print(f"   Total intermediary regions: {gdf['NM_RGINT'].nunique()}")
    elif 'NM_RGI' in gdf.columns:
        print(f"   Total intermediary regions: {gdf['NM_RGI'].nunique()}")

    print(f"\nMEMORY USAGE:")
    print(f"   Total: {gdf.memory_usage(deep=True).sum() / (1024**2):.2f} MB")

else:
    print(f"ERROR Shapefile not found: {shapefile_path}")
