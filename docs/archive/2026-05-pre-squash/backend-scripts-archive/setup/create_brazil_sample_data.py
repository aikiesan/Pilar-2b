#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create sample economic data for Brazil's 133 intermediary regions
This generates placeholder VAB and population data for testing

Author: CP2B Development Team
Date: 2025-12-01
"""

import pandas as pd
import geopandas as gpd
import json
import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def create_sample_brazil_data():
    """
    Create sample economic data for Brazil regions
    Uses proportional scaling based on state GDP estimates
    """

    print("="*80)
    print("CREATING SAMPLE BRAZIL ECONOMIC DATA")
    print("="*80)

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data' / 'shapefiles' / 'brazil'

    # Load centroids (has region codes and names)
    centroids_file = data_dir / 'br_intermediary_regions_centroids.csv'

    if not centroids_file.exists():
        print(f"ERROR: Centroids file not found: {centroids_file}")
        print("Please run optimize_br_regions.py first")
        return None

    print(f"\n[Step 1/3] Loading centroids...")
    centroids = pd.read_csv(centroids_file)
    print(f"   Loaded {len(centroids)} regions")

    # Estimated state-level data (2021 estimates in billions BRL)
    state_vab_estimates = {
        'SP': 2300,  # São Paulo
        'RJ': 900,   # Rio de Janeiro
        'MG': 800,   # Minas Gerais
        'RS': 500,   # Rio Grande do Sul
        'PR': 480,   # Paraná
        'BA': 350,   # Bahia
        'SC': 340,   # Santa Catarina
        'DF': 290,   # Distrito Federal
        'GO': 240,   # Goiás
        'PE': 210,   # Pernambuco
        'CE': 180,   # Ceará
        'PA': 170,   # Pará
        'ES': 150,   # Espírito Santo
        'AM': 120,   # Amazonas
        'MT': 150,   # Mato Grosso
        'MA': 110,   # Maranhão
        'PB': 70,    # Paraíba
        'RN': 75,    # Rio Grande do Norte
        'MS': 120,   # Mato Grosso do Sul
        'AL': 65,    # Alagoas
        'PI': 60,    # Piauí
        'SE': 55,    # Sergipe
        'RO': 50,    # Rondônia
        'TO': 45,    # Tocantins
        'AC': 18,    # Acre
        'AP': 20,    # Amapá
        'RR': 15,    # Roraima
    }

    # Population estimates by state (millions)
    state_population = {
        'SP': 46.6, 'RJ': 17.5, 'MG': 21.4, 'RS': 11.5, 'PR': 11.6,
        'BA': 14.9, 'SC': 7.3, 'DF': 3.1, 'GO': 7.2, 'PE': 9.6,
        'CE': 9.2, 'PA': 8.7, 'ES': 4.1, 'AM': 4.2, 'MT': 3.6,
        'MA': 7.1, 'PB': 4.0, 'RN': 3.6, 'MS': 2.8, 'AL': 3.4,
        'PI': 3.3, 'SE': 2.3, 'RO': 1.8, 'TO': 1.6, 'AC': 0.9,
        'AP': 0.9, 'RR': 0.6
    }

    print(f"\n[Step 2/3] Generating economic data...")

    # Count regions per state
    regions_per_state = centroids.groupby('cd_uf').size().to_dict()

    # Generate data for each region
    sample_data = []

    for idx, row in centroids.iterrows():
        cd_rgint = row['cd_rgint']
        nm_rgint = row['nm_rgint']
        cd_uf = row['cd_uf']
        sigla_uf = row.get('sigla_uf', cd_uf)  # Fallback to cd_uf if sigla not available

        # Get state totals
        state_vab = state_vab_estimates.get(sigla_uf, 100) * 1_000_000_000  # Convert to BRL
        state_pop = state_population.get(sigla_uf, 2.0) * 1_000_000  # Convert to individuals

        # Distribute proportionally among regions in the state
        num_regions = regions_per_state.get(cd_uf, 1)
        region_vab_total = state_vab / num_regions

        # Add random variation (±20%)
        import random
        random.seed(int(cd_rgint))  # Deterministic for reproducibility
        variation = random.uniform(0.8, 1.2)
        region_vab_total *= variation

        # Distribute VAB by sector (Brazil national averages)
        vab_agriculture = region_vab_total * 0.048  # 4.8%
        vab_industry = region_vab_total * 0.178     # 17.8%
        vab_services = region_vab_total * 0.684     # 68.4%
        vab_public = region_vab_total * 0.090       # 9.0%

        # Population
        region_population = int(state_pop / num_regions * variation)

        # GDP per capita
        gdp_per_capita = region_vab_total / region_population if region_population > 0 else 0

        sample_data.append({
            'cd_rgint': cd_rgint,
            'nm_rgint': nm_rgint,
            'cd_uf': cd_uf,
            'sigla_uf': sigla_uf,
            'vab_total_brl': round(region_vab_total, 2),
            'vab_agriculture_brl': round(vab_agriculture, 2),
            'vab_industry_brl': round(vab_industry, 2),
            'vab_services_brl': round(vab_services, 2),
            'vab_public_brl': round(vab_public, 2),
            'population': region_population,
            'gdp_per_capita_brl': round(gdp_per_capita, 2),
            'centroid_lat': row['centroid_lat'],
            'centroid_lng': row['centroid_lng']
        })

    df = pd.DataFrame(sample_data)

    print(f"   Generated data for {len(df)} regions")
    print(f"   Total VAB: R$ {df['vab_total_brl'].sum()/1e12:.2f} trillion")
    print(f"   Total Population: {df['population'].sum()/1e6:.1f} million")

    # Save as CSV
    output_csv = data_dir / 'br_intermediary_regions_sample_data.csv'
    df.to_csv(output_csv, index=False)
    print(f"\n   Saved CSV: {output_csv}")

    # Generate SQL INSERT statements
    print(f"\n[Step 3/3] Generating SQL INSERT script...")

    output_sql = data_dir / 'br_intermediary_regions_sample_data.sql'

    with open(output_sql, 'w', encoding='utf-8') as f:
        f.write("-- Sample economic data for Brazil intermediary regions\n")
        f.write("-- Generated for testing - Replace with real IBGE data\n")
        f.write(f"-- Total regions: {len(df)}\n")
        f.write(f"-- Total VAB: R$ {df['vab_total_brl'].sum()/1e12:.2f} trillion\n\n")

        f.write("BEGIN;\n\n")

        # First, check if table exists
        f.write("-- Ensure table exists (run migration 008 if needed)\n")
        f.write("DO $$\n")
        f.write("BEGIN\n")
        f.write("  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'br_intermediate_regions') THEN\n")
        f.write("    RAISE EXCEPTION 'Table br_intermediate_regions does not exist. Run migration 008 first.';\n")
        f.write("  END IF;\n")
        f.write("END $$;\n\n")

        # Batch inserts (50 rows at a time)
        batch_size = 50
        total_batches = (len(df) + batch_size - 1) // batch_size

        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(df))
            batch = df.iloc[start_idx:end_idx]

            f.write(f"-- Batch {batch_num + 1}/{total_batches}\n")
            f.write("INSERT INTO br_intermediate_regions (\n")
            f.write("  cd_rgint, nm_rgint, cd_uf, nm_uf, sigla_uf,\n")
            f.write("  vab_total_brl, vab_agriculture_brl, vab_industry_brl, vab_services_brl, vab_public_brl,\n")
            f.write("  population, gdp_per_capita_brl,\n")
            f.write("  centroid_lat, centroid_lng\n")
            f.write(")\nVALUES\n")

            for i, (idx, row) in enumerate(batch.iterrows()):
                comma = "," if i < len(batch) - 1 else ";"
                f.write(f"  ('{row['cd_rgint']}', '{row['nm_rgint']}', '{row['cd_uf']}', 'State', '{row['sigla_uf']}', ")
                f.write(f"{row['vab_total_brl']}, {row['vab_agriculture_brl']}, {row['vab_industry_brl']}, ")
                f.write(f"{row['vab_services_brl']}, {row['vab_public_brl']}, {row['population']}, ")
                f.write(f"{row['gdp_per_capita_brl']}, {row['centroid_lat']}, {row['centroid_lng']}){comma}\n")

            f.write("\n")

        f.write("COMMIT;\n\n")
        f.write("-- Verify\n")
        f.write("SELECT COUNT(*) as total_regions, \n")
        f.write("       SUM(vab_total_brl)/1e12 as total_vab_trillion,\n")
        f.write("       SUM(population)/1e6 as total_pop_million\n")
        f.write("FROM br_intermediate_regions;\n")

    print(f"   Saved SQL: {output_sql}")

    # Summary
    print(f"\n" + "="*80)
    print("SAMPLE DATA GENERATION COMPLETE")
    print("="*80)
    print(f"Regions: {len(df)}")
    print(f"States: {df['sigla_uf'].nunique()}")
    print(f"Total VAB: R$ {df['vab_total_brl'].sum()/1e12:.2f} trillion")
    print(f"Total Population: {df['population'].sum()/1e6:.1f} million")
    print(f"\nFiles created:")
    print(f"  - {output_csv.name}")
    print(f"  - {output_sql.name}")
    print(f"\nNext steps:")
    print(f"  1. Run FIX_CONVERSION_FACTORS_TABLE.sql in Supabase")
    print(f"  2. Run br_intermediary_regions_sample_data.sql in Supabase")
    print(f"  3. Run migration 009 to load economic factors")
    print(f"  4. Load distances: br_intermediary_regions_distances.sql")
    print("="*80)

    return df


if __name__ == "__main__":
    create_sample_brazil_data()
