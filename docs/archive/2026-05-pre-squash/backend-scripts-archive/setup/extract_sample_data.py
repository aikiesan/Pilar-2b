"""
PILAR-2b V3 - Sample Data Extraction Script
Extract 16 representative municipalities from V2 database for dashboard development
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any

# V2 Database path
V2_DB_PATH = Path(r"C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V2\data\database\cp2b_maps.db")
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "sample_municipalities.json"

# Sample municipalities (IBGE codes) - Araraquara region, diverse mix
SAMPLE_IBGE_CODES = [
    '3520400',  # Itápolis
    '3503208',  # Araraquara
    '3548807',  # São Carlos
    '3529302',  # Matão
    '3519600',  # Ibaté
    '3506102',  # Boa Esperança do Sul
    '3507506',  # Borborema
    '3553807',  # Taquaritinga
    '3514007',  # Descalvado
    '3533403',  # Pirassununga
    '3553906',  # Tabatinga
    '3543808',  # Rincão
    '3546504',  # Santa Rita do Passa Quatro
    '3543600',  # Ribeirão Bonito
    '3546009',  # Santa Lúcia
    '3548708',  # Américo Brasiliense
]


def extract_municipalities() -> List[Dict[str, Any]]:
    """Extract sample municipalities from V2 database"""

    if not V2_DB_PATH.exists():
        raise FileNotFoundError(f"V2 database not found: {V2_DB_PATH}")

    print(f"[OK] V2 Database found: {V2_DB_PATH}")

    conn = sqlite3.connect(V2_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Build query for sample municipalities
    placeholders = ','.join('?' * len(SAMPLE_IBGE_CODES))

    query = f"""
        SELECT
            nome_municipio,
            codigo_municipio,
            cd_mun,
            lat,
            lon,
            area_km2,
            populacao_2022,
            densidade_demografica,
            nm_rgi,
            nm_rgint,
            cd_rgi,
            cd_rgint,
            total_final_m_ano,
            total_agricola_m_ano,
            total_pecuaria_m_ano,
            total_urbano_m_ano,
            biogas_cana_m_ano,
            biogas_soja_m_ano,
            biogas_milho_m_ano,
            biogas_cafe_m_ano,
            biogas_citros_m_ano,
            biogas_bovinos_m_ano,
            biogas_suino_m_ano,
            biogas_aves_m_ano,
            biogas_piscicultura_m_ano,
            biogas_silvicultura_m_ano,
            rsu_potencial_m_ano,
            rpo_potencial_m_ano,
            residuos_cana_ton_ano,
            residuos_soja_ton_ano,
            residuos_milho_ton_ano,
            categoria_potencial
        FROM municipalities
        WHERE codigo_municipio IN ({placeholders})
        ORDER BY total_final_m_ano DESC
    """

    cursor.execute(query, SAMPLE_IBGE_CODES)
    rows = cursor.fetchall()

    print(f"[OK] Extracted {len(rows)} municipalities")

    municipalities = []
    for row in rows:
        muni = dict(row)
        # Ensure numeric values are properly formatted
        for key, value in muni.items():
            if value is None:
                muni[key] = 0 if 'biogas' in key or 'potencial' in key or 'residuos' in key else None
        municipalities.append(muni)

    conn.close()
    return municipalities


def create_geojson(municipalities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert municipalities to GeoJSON FeatureCollection"""

    features = []

    for muni in municipalities:
        # Create Point geometry from lat/lon
        geometry = {
            "type": "Point",
            "coordinates": [float(muni['lon']), float(muni['lat'])]
        }

        # Create properties (all data except geometry)
        properties = {
            "id": muni['codigo_municipio'] or muni['cd_mun'],
            "name": muni['nome_municipio'],
            "ibge_code": muni['codigo_municipio'] or muni['cd_mun'],
            "area_km2": muni['area_km2'],
            "population": muni['populacao_2022'],
            "population_density": muni['densidade_demografica'],
            "immediate_region": muni['nm_rgi'],
            "intermediate_region": muni['nm_rgint'],
            "immediate_region_code": muni['cd_rgi'],
            "intermediate_region_code": muni['cd_rgint'],

            # Biogas potential
            "total_biogas_m3_year": muni['total_final_m_ano'],
            "agricultural_biogas_m3_year": muni['total_agricola_m_ano'],
            "livestock_biogas_m3_year": muni['total_pecuaria_m_ano'],
            "urban_biogas_m3_year": muni['total_urbano_m_ano'],

            # Sector breakdown
            "sugarcane_biogas_m3_year": muni['biogas_cana_m_ano'],
            "soybean_biogas_m3_year": muni['biogas_soja_m_ano'],
            "corn_biogas_m3_year": muni['biogas_milho_m_ano'],
            "coffee_biogas_m3_year": muni['biogas_cafe_m_ano'],
            "citrus_biogas_m3_year": muni['biogas_citros_m_ano'],
            "cattle_biogas_m3_year": muni['biogas_bovinos_m_ano'],
            "swine_biogas_m3_year": muni['biogas_suino_m_ano'],
            "poultry_biogas_m3_year": muni['biogas_aves_m_ano'],
            "aquaculture_biogas_m3_year": muni['biogas_piscicultura_m_ano'],
            "forestry_biogas_m3_year": muni['biogas_silvicultura_m_ano'],
            "rsu_biogas_m3_year": muni['rsu_potencial_m_ano'],
            "rpo_biogas_m3_year": muni['rpo_potencial_m_ano'],

            # Residues
            "sugarcane_residues_tons_year": muni['residuos_cana_ton_ano'],
            "soybean_residues_tons_year": muni['residuos_soja_ton_ano'],
            "corn_residues_tons_year": muni['residuos_milho_ton_ano'],

            # Classification
            "potential_category": muni['categoria_potencial']
        }

        feature = {
            "type": "Feature",
            "geometry": geometry,
            "properties": properties
        }

        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_municipalities": len(features),
            "region": "Araraquara",
            "source": "PILAR-2b V2",
            "note": "Sample data for V3 dashboard development"
        }
    }

    return geojson


def calculate_statistics(municipalities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate summary statistics for sample data"""

    total_biogas = sum(m['total_final_m_ano'] or 0 for m in municipalities)
    total_population = sum(m['populacao_2022'] or 0 for m in municipalities)
    avg_biogas = total_biogas / len(municipalities) if municipalities else 0

    # Find top municipality
    top_muni = max(municipalities, key=lambda m: m['total_final_m_ano'] or 0)

    # Category distribution
    categories = {}
    for m in municipalities:
        cat = m['categoria_potencial'] or 'SEM DADOS'
        categories[cat] = categories.get(cat, 0) + 1

    stats = {
        "total_municipalities": len(municipalities),
        "total_biogas_m3_year": total_biogas,
        "avg_biogas_m3_year": avg_biogas,
        "total_population": total_population,
        "top_municipality": {
            "name": top_muni['nome_municipio'],
            "biogas_m3_year": top_muni['total_final_m_ano']
        },
        "categories": categories
    }

    return stats


def main():
    """Main extraction process"""
    print("\nPILAR-2b V3 - Sample Data Extraction")
    print("=" * 80)

    try:
        # Extract data
        municipalities = extract_municipalities()

        # Create GeoJSON
        geojson = create_geojson(municipalities)

        # Calculate stats
        stats = calculate_statistics(municipalities)

        # Save to file
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        print(f"[OK] GeoJSON saved to: {OUTPUT_PATH}")
        print(f"\nStatistics:")
        print(f"  Total municipalities: {stats['total_municipalities']}")
        print(f"  Total biogas potential: {stats['total_biogas_m3_year']:,.0f} m³/year")
        print(f"  Average biogas potential: {stats['avg_biogas_m3_year']:,.0f} m³/year")
        print(f"  Total population: {stats['total_population']:,}")
        print(f"  Top municipality: {stats['top_municipality']['name']} ({stats['top_municipality']['biogas_m3_year']:,.0f} m³/year)")
        print(f"  Categories: {stats['categories']}")
        print("\n" + "=" * 80)
        print("[OK] EXTRACTION COMPLETED SUCCESSFULLY")
        print("=" * 80)

    except Exception as e:
        print(f"\n[ERROR] EXTRACTION FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
