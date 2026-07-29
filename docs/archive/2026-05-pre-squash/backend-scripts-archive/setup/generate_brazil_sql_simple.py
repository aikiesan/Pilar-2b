#!/usr/bin/env python3
"""
Generate SQL files for Brazil simulation without external dependencies
Uses only standard Python libraries
"""

import csv
import random
from pathlib import Path

# State economic data (2021 estimates in billions BRL)
STATE_VAB = {
    'SP': 2300, 'RJ': 900, 'MG': 800, 'RS': 500, 'PR': 480,
    'BA': 350, 'SC': 340, 'DF': 290, 'GO': 240, 'PE': 210,
    'CE': 180, 'PA': 170, 'ES': 150, 'AM': 120, 'MT': 150,
    'MA': 110, 'PB': 70, 'RN': 75, 'MS': 120, 'AL': 65,
    'PI': 60, 'SE': 55, 'RO': 50, 'TO': 45, 'AC': 18,
    'AP': 20, 'RR': 15,
}

STATE_POPULATION = {
    'SP': 46.6, 'RJ': 17.5, 'MG': 21.4, 'RS': 11.5, 'PR': 11.6,
    'BA': 14.9, 'SC': 7.3, 'DF': 3.1, 'GO': 7.2, 'PE': 9.6,
    'CE': 9.2, 'PA': 8.7, 'ES': 4.1, 'AM': 4.2, 'MT': 3.6,
    'MA': 7.1, 'PB': 4.0, 'RN': 3.6, 'MS': 2.8, 'AL': 3.4,
    'PI': 3.3, 'SE': 2.3, 'RO': 1.8, 'TO': 1.6, 'AC': 0.9,
    'AP': 0.9, 'RR': 0.6
}

# CD_UF to state abbreviation mapping
UF_MAPPING = {
    '41': 'PR', '13': 'AM', '52': 'GO', '27': 'AL', '23': 'CE',
    '35': 'SP', '33': 'RJ', '31': 'MG', '43': 'RS', '42': 'SC',
    '29': 'BA', '53': 'DF', '26': 'PE', '15': 'PA', '32': 'ES',
    '51': 'MT', '21': 'MA', '25': 'PB', '24': 'RN', '50': 'MS',
    '22': 'PI', '28': 'SE', '11': 'RO', '17': 'TO', '12': 'AC',
    '16': 'AP', '14': 'RR',
}

def generate_sample_data_sql():
    """Generate SQL for Brazil sample data"""

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data' / 'shapefiles' / 'brazil'
    centroids_file = data_dir / 'br_intermediary_regions_centroids.csv'

    print("="*80)
    print("GENERATING BRAZIL SAMPLE DATA SQL")
    print("="*80)

    # Load centroids
    print("\n[1/2] Loading centroids...")
    regions = []
    with open(centroids_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            regions.append(row)

    print(f"   Loaded {len(regions)} regions")

    # Count regions per state
    regions_per_state = {}
    for r in regions:
        cd_uf = r['cd_uf']
        regions_per_state[cd_uf] = regions_per_state.get(cd_uf, 0) + 1

    # Generate SQL
    print("\n[2/2] Generating SQL...")

    output_sql = data_dir / 'br_intermediary_regions_sample_data.sql'

    total_vab = 0
    total_pop = 0

    with open(output_sql, 'w', encoding='utf-8') as f:
        f.write("-- ============================================================================\n")
        f.write("-- PILAR-2b V3 - Brazil Sample Economic Data\n")
        f.write("-- Auto-generated sample data for 133 intermediary regions\n")
        f.write("-- ============================================================================\n\n")

        f.write("BEGIN;\n\n")

        f.write("-- Ensure table exists\n")
        f.write("DO $$\n")
        f.write("BEGIN\n")
        f.write("  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'br_intermediate_regions') THEN\n")
        f.write("    RAISE EXCEPTION 'Table br_intermediate_regions does not exist. Run migration 008 first.';\n")
        f.write("  END IF;\n")
        f.write("END $$;\n\n")

        # Insert regions in batches of 50
        batch_size = 50
        for batch_start in range(0, len(regions), batch_size):
            batch = regions[batch_start:batch_start + batch_size]
            batch_num = (batch_start // batch_size) + 1
            total_batches = (len(regions) + batch_size - 1) // batch_size

            f.write(f"-- Batch {batch_num}/{total_batches}\n")
            f.write("INSERT INTO br_intermediate_regions (\n")
            f.write("  cd_rgint, nm_rgint, cd_uf, nm_uf, sigla_uf,\n")
            f.write("  vab_total_brl, vab_agriculture_brl, vab_industry_brl, vab_services_brl, vab_public_brl,\n")
            f.write("  population, gdp_per_capita_brl, centroid_lat, centroid_lng\n")
            f.write(")\nVALUES\n")

            for i, region in enumerate(batch):
                cd_rgint = region['cd_rgint']
                nm_rgint = region['nm_rgint'].replace("'", "''")  # Escape quotes
                cd_uf = region['cd_uf']
                sigla_uf = UF_MAPPING.get(cd_uf, 'XX')

                # Get state data
                state_vab = STATE_VAB.get(sigla_uf, 100) * 1_000_000_000
                state_pop = STATE_POPULATION.get(sigla_uf, 2.0) * 1_000_000

                # Distribute among regions
                num_regions = regions_per_state.get(cd_uf, 1)

                # Add variation (±20%)
                random.seed(int(cd_rgint))
                variation = random.uniform(0.8, 1.2)

                region_vab = state_vab / num_regions * variation

                # Distribute by sector (Brazil averages)
                vab_agriculture = region_vab * 0.048
                vab_industry = region_vab * 0.178
                vab_services = region_vab * 0.684
                vab_public = region_vab * 0.090

                # Population
                population = int(state_pop / num_regions * variation)
                gdp_per_capita = region_vab / population if population > 0 else 0

                # Coordinates
                lat = float(region['centroid_lat'])
                lng = float(region['centroid_lng'])

                total_vab += region_vab
                total_pop += population

                comma = "," if i < len(batch) - 1 else ";"

                f.write(f"  ('{cd_rgint}', '{nm_rgint}', '{cd_uf}', 'State', '{sigla_uf}', "
                       f"{region_vab:.2f}, {vab_agriculture:.2f}, {vab_industry:.2f}, "
                       f"{vab_services:.2f}, {vab_public:.2f}, {population}, "
                       f"{gdp_per_capita:.2f}, {lat}, {lng}){comma}\n")

            f.write("\n")

        f.write("COMMIT;\n\n")
        f.write("-- Verification\n")
        f.write("SELECT COUNT(*) as total_regions,\n")
        f.write("       SUM(vab_total_brl)/1e12 as total_vab_trillion,\n")
        f.write("       SUM(population)/1e6 as total_pop_million\n")
        f.write("FROM br_intermediate_regions;\n")

    print(f"   ✓ Created: {output_sql.name}")
    print(f"   Total VAB: R$ {total_vab/1e12:.2f} trillion")
    print(f"   Total Population: {total_pop/1e6:.1f} million")

    return output_sql

if __name__ == "__main__":
    generate_sample_data_sql()
    print("\n" + "="*80)
    print("COMPLETE!")
    print("="*80)
