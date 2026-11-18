#!/usr/bin/env python3
"""
Calculate realistic biogas potential for São Paulo using FDE values.

This script:
1. Reads production data from cp2b_maps.db by sector
2. Applies FDE values to calculate realistic potential
3. Compares theoretical vs realistic estimates
4. Generates comprehensive report

Author: Claude Code
Date: 2025-11-22
"""

import sqlite3
import json
from typing import Dict, List

# Database paths
MAPS_DB = "/home/user/Panorama_CP2B/data/cp2b_maps.db"
FDE_JSON = "/home/user/NewLook/cp2b-workspace/NewLook/data/fde_all_residues.json"

# Load FDE data
with open(FDE_JSON, 'r') as f:
    FDE_DATA = {r['nome']: r for r in json.load(f)}

def query_sector_production(sector_table: str) -> List[Dict]:
    """Query production data for a specific sector."""
    conn = sqlite3.connect(MAPS_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all columns first
    cursor.execute(f"SELECT * FROM {sector_table} LIMIT 1")
    if not cursor.fetchone():
        conn.close()
        return []

    # Query all data
    cursor.execute(f"SELECT * FROM {sector_table}")
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return results

def aggregate_by_residue(sector_data: List[Dict], sector_code: str) -> Dict:
    """Aggregate production data by residue type."""
    residue_totals = {}

    for row in sector_data:
        # Find residue columns (ending in _mg or _ton)
        for col_name, value in row.items():
            if value and isinstance(value, (int, float)) and value > 0:
                # Check if this is a residue column
                if '_mg' in col_name.lower() or '_ton' in col_name.lower() or '_t' in col_name.lower():
                    # Extract residue name from column name
                    residue_name = col_name.replace('_mg', '').replace('_ton', '').replace('_t', '').replace('_', ' ').strip()

                    if residue_name not in residue_totals:
                        residue_totals[residue_name] = 0

                    # Convert to Mg if needed
                    if '_ton' in col_name.lower() or '_t' in col_name.lower():
                        residue_totals[residue_name] += value
                    else:
                        residue_totals[residue_name] += value / 1000  # kg to Mg

    return residue_totals

def calculate_biogas_potential(production_mg: float, residue_info: Dict) -> Dict:
    """Calculate biogas potential for a residue."""
    fde = residue_info.get('fde', 0)
    fde_availability = residue_info.get('fde_availability', 0)
    bmp = residue_info.get('bmp_value', 0)

    # VS content (assume 15% if not available)
    vs_fraction = 0.15

    # Theoretical potential (no FDE)
    theoretical_m3 = production_mg * vs_fraction * bmp

    # Realistic potential (with FDE)
    realistic_m3 = production_mg * fde * vs_fraction * bmp

    # Convert to energy (1 m³ CH4 = 9.97 kWh = 0.00000997 GWh)
    theoretical_gwh = theoretical_m3 * 0.00000997
    realistic_gwh = realistic_m3 * 0.00000997

    return {
        'production_mg': production_mg,
        'fde': fde,
        'fde_availability': fde_availability,
        'bmp': bmp,
        'theoretical_m3': theoretical_m3,
        'realistic_m3': realistic_m3,
        'theoretical_gwh': theoretical_gwh,
        'realistic_gwh': realistic_gwh
    }

def main():
    print("=" * 100)
    print("🌱 POTENCIAL REALISTA DE BIOGÁS - ESTADO DE SÃO PAULO (COM FDE)")
    print("=" * 100)

    # Sector tables mapping
    sector_tables = {
        'AG_AGRICULTURA': 'residuos_agricolas',
        'PC_PECUARIA': 'residuos_pecuarios',
        'UR_URBANO': 'residuos_urbanos',
        'IN_INDUSTRIAL': 'residuos_industriais'
    }

    sector_names = {
        'AG_AGRICULTURA': '🌱 AGRICULTURA',
        'PC_PECUARIA': '🐄 PECUÁRIA',
        'IN_INDUSTRIAL': '🏭 INDUSTRIAL',
        'UR_URBANO': '🏙️ URBANO'
    }

    grand_total = {
        'theoretical_m3': 0,
        'realistic_m3': 0,
        'theoretical_gwh': 0,
        'realistic_gwh': 0
    }

    sector_results = {}

    # Process each sector
    for sector_code, table_name in sector_tables.items():
        print(f"\n{sector_names[sector_code]}")
        print("-" * 100)

        # Query sector data
        sector_data = query_sector_production(table_name)

        if not sector_data:
            print(f"   ⚠️  No data available for {table_name}")
            continue

        # Aggregate by residue
        residue_totals = aggregate_by_residue(sector_data, sector_code)

        sector_theoretical_m3 = 0
        sector_realistic_m3 = 0
        sector_theoretical_gwh = 0
        sector_realistic_gwh = 0

        residue_details = []

        for residue_name, production_mg in residue_totals.items():
            # Find matching FDE data
            matched_fde = None
            for fde_name, fde_info in FDE_DATA.items():
                if fde_info['setor'] == sector_code:
                    # Try exact match first
                    if residue_name.lower() == fde_name.lower():
                        matched_fde = fde_info
                        break
                    # Try partial match
                    if residue_name.lower() in fde_name.lower() or fde_name.lower() in residue_name.lower():
                        matched_fde = fde_info
                        break

            if not matched_fde:
                print(f"   ⚠️  No FDE data for: {residue_name} ({production_mg:,.0f} Mg)")
                continue

            # Calculate potential
            potential = calculate_biogas_potential(production_mg, matched_fde)

            sector_theoretical_m3 += potential['theoretical_m3']
            sector_realistic_m3 += potential['realistic_m3']
            sector_theoretical_gwh += potential['theoretical_gwh']
            sector_realistic_gwh += potential['realistic_gwh']

            residue_details.append({
                'nome': matched_fde['nome'],
                **potential
            })

        # Sort by realistic GWh
        residue_details.sort(key=lambda x: x['realistic_gwh'], reverse=True)

        # Print sector summary
        print(f"\n   Potencial Teórico (sem FDE):  {sector_theoretical_m3/1e9:>8.2f} bilhões m³ CH₄ | {sector_theoretical_gwh:>10.2f} GWh")
        print(f"   Potencial Realista (com FDE): {sector_realistic_m3/1e9:>8.2f} bilhões m³ CH₄ | {sector_realistic_gwh:>10.2f} GWh")

        if sector_theoretical_m3 > 0:
            reduction = sector_realistic_m3 / sector_theoretical_m3
            print(f"   Fator de Redução FDE:         {reduction:>8.1%}")

        # Print top contributors
        print(f"\n   Top resíduos:")
        for r in residue_details[:5]:
            print(f"      • {r['nome']:45s} {r['realistic_gwh']:>8.2f} GWh (FDE: {r['fde']:>6.1%}, Prod: {r['production_mg']/1e6:>6.2f}M Mg)")

        # Accumulate grand totals
        grand_total['theoretical_m3'] += sector_theoretical_m3
        grand_total['realistic_m3'] += sector_realistic_m3
        grand_total['theoretical_gwh'] += sector_theoretical_gwh
        grand_total['realistic_gwh'] += sector_realistic_gwh

        sector_results[sector_code] = {
            'theoretical_gwh': sector_theoretical_gwh,
            'realistic_gwh': sector_realistic_gwh,
            'residues': residue_details
        }

    # Print grand total
    print("\n" + "=" * 100)
    print("🎯 TOTAL ESTADO DE SÃO PAULO")
    print("=" * 100)

    print(f"\n💡 Potencial Teórico (sem FDE):")
    print(f"   {grand_total['theoretical_m3']/1e9:>10.2f} bilhões m³ CH₄/ano")
    print(f"   {grand_total['theoretical_gwh']:>10.2f} GWh/ano")
    print(f"   {grand_total['theoretical_gwh']/1000:>10.3f} TWh/ano")

    print(f"\n✅ Potencial Realista (COM FDE):")
    print(f"   {grand_total['realistic_m3']/1e9:>10.2f} bilhões m³ CH₄/ano")
    print(f"   {grand_total['realistic_gwh']:>10.2f} GWh/ano")
    print(f"   {grand_total['realistic_gwh']/1000:>10.3f} TWh/ano")

    if grand_total['theoretical_m3'] > 0:
        reduction_factor = grand_total['realistic_m3'] / grand_total['theoretical_m3']
        print(f"\n📉 Fator de Redução FDE: {reduction_factor:.1%}")
        print(f"   (O potencial realista é {reduction_factor:.1%} do teórico)")
        overestimation = 1 / reduction_factor
        print(f"   (Sem FDE, superestimamos o potencial em {overestimation:.1f}x)")

    # Household equivalence
    households_avg_kwh = 1920  # 160 kWh/month * 12
    households_served = (grand_total['realistic_gwh'] * 1e6) / households_avg_kwh
    print(f"\n🏠 Equivalente em Domicílios:")
    print(f"   {households_served:>10,.0f} domicílios/ano (consumo médio 160 kWh/mês)")

    # SP population context
    sp_pop = 46_024_937  # 2023 estimate
    sp_households = sp_pop / 3.3  # Average 3.3 people per household
    coverage = (households_served / sp_households) * 100
    print(f"   {coverage:>10.1f}% dos domicílios de São Paulo")

    print("\n" + "=" * 100)

    # Save results
    output = {
        'theoretical': {
            'm3_year': grand_total['theoretical_m3'],
            'gwh_year': grand_total['theoretical_gwh'],
            'twh_year': grand_total['theoretical_gwh'] / 1000
        },
        'realistic_with_fde': {
            'm3_year': grand_total['realistic_m3'],
            'gwh_year': grand_total['realistic_gwh'],
            'twh_year': grand_total['realistic_gwh'] / 1000
        },
        'fde_reduction_factor': reduction_factor if grand_total['theoretical_m3'] > 0 else 0,
        'households_served': int(households_served),
        'household_coverage_percent': coverage,
        'by_sector': sector_results
    }

    output_file = '/home/user/NewLook/cp2b-workspace/NewLook/data/sao_paulo_biogas_potential_fde.json'
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Resultados salvos em: {output_file}\n")

if __name__ == '__main__':
    main()
