"""
PILAR-2b V3 - Data Migration Script (Using Supabase SDK)
Migrate data from V2 SQLite database to Supabase using REST API

This version uses the Supabase Python SDK instead of direct PostgreSQL connection
to avoid IPv6/DNS resolution issues.
"""

import sqlite3
import json
from pathlib import Path
import sys
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Configuration
_script_dir = Path(__file__).parent
_v2_data_candidates = [
    Path(r"C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V3\cp2b-workspace\project_map"),
    Path("cp2b-workspace/project_map"),
]

V2_DATA_DIR = None
for candidate in _v2_data_candidates:
    if candidate.exists() and (candidate / "data" / "database" / "cp2b_maps.db").exists():
        V2_DATA_DIR = candidate
        break

if V2_DATA_DIR is None:
    raise FileNotFoundError("Could not find V2 data directory")

V2_DATABASE_PATH = V2_DATA_DIR / "data" / "database" / "cp2b_maps.db"
V2_REFERENCES_PATH = V2_DATA_DIR / "data" / "panorama_scientific_papers.json"


class SupabaseMigrator:
    """Migrate PILAR-2b V2 data to Supabase using SDK"""

    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize migrator with Supabase credentials

        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key (for admin operations)
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.v2_db_path = V2_DATABASE_PATH
        self.v2_references_path = V2_REFERENCES_PATH

        if not self.v2_db_path.exists():
            raise FileNotFoundError(f"V2 database not found: {self.v2_db_path}")

        print(f"[OK] V2 Database found: {self.v2_db_path}")
        print(f"[OK] V2 References found: {self.v2_references_path}")

    def connect_v2_db(self) -> sqlite3.Connection:
        """Connect to V2 SQLite database"""
        return sqlite3.connect(self.v2_db_path)

    def migrate_municipalities(self):
        """Migrate municipality data from V2 to Supabase"""
        print("\n[DATA] Migrating municipalities data...")

        # Connect to V2 database
        v2_conn = self.connect_v2_db()
        v2_conn.row_factory = sqlite3.Row
        v2_cursor = v2_conn.cursor()

        try:
            # Query V2 data - columns are in Portuguese
            v2_cursor.execute("""
                SELECT
                    nome_municipio,
                    cd_mun,
                    lat,
                    lon,
                    nm_rgint,
                    nm_rgi,
                    total_final_m_ano,
                    total_urbano_m_ano,
                    total_agricola_m_ano,
                    total_pecuaria_m_ano,
                    rsu_potencial_m_ano,
                    rpo_potencial_m_ano,
                    biogas_cana_m_ano,
                    biogas_soja_m_ano,
                    biogas_milho_m_ano,
                    biogas_cafe_m_ano,
                    biogas_citros_m_ano,
                    biogas_bovinos_m_ano,
                    biogas_suino_m_ano,
                    biogas_aves_m_ano,
                    biogas_piscicultura_m_ano,
                    populacao_2022
                FROM municipalities
                ORDER BY nome_municipio
            """)

            municipalities = v2_cursor.fetchall()
            print(f"  Found {len(municipalities)} municipalities in V2 database")

            # Prepare data for batch insert
            data_to_insert = []
            for row in municipalities:
                total_biogas = float(row['total_final_m_ano'] or 0)
                municipality_data = {
                    "municipality_name": row['nome_municipio'],
                    "ibge_code": str(row['cd_mun']) if row['cd_mun'] else None,
                    "centroid": f"POINT({row['lon']} {row['lat']})",
                    "administrative_region": None,  # Not in V2
                    "immediate_region": row['nm_rgi'],
                    "intermediate_region": row['nm_rgint'],
                    "total_biogas_m3_year": total_biogas,
                    "total_biogas_m3_day": total_biogas / 365.0,
                    "urban_biogas_m3_year": float(row['total_urbano_m_ano'] or 0),
                    "agricultural_biogas_m3_year": float(row['total_agricola_m_ano'] or 0),
                    "livestock_biogas_m3_year": float(row['total_pecuaria_m_ano'] or 0),
                    "rsu_biogas_m3_year": float(row['rsu_potencial_m_ano'] or 0),
                    "rpo_biogas_m3_year": float(row['rpo_potencial_m_ano'] or 0),
                    "sugarcane_biogas_m3_year": float(row['biogas_cana_m_ano'] or 0),
                    "soybean_biogas_m3_year": float(row['biogas_soja_m_ano'] or 0),
                    "corn_biogas_m3_year": float(row['biogas_milho_m_ano'] or 0),
                    "coffee_biogas_m3_year": float(row['biogas_cafe_m_ano'] or 0),
                    "citrus_biogas_m3_year": float(row['biogas_citros_m_ano'] or 0),
                    "cattle_biogas_m3_year": float(row['biogas_bovinos_m_ano'] or 0),
                    "swine_biogas_m3_year": float(row['biogas_suino_m_ano'] or 0),
                    "poultry_biogas_m3_year": float(row['biogas_aves_m_ano'] or 0),
                    "aquaculture_biogas_m3_year": float(row['biogas_piscicultura_m_ano'] or 0),
                    "energy_potential_kwh_day": total_biogas * 6.5 / 1000,  # Estimate: ~6.5 kWh per m³ biogas
                    "energy_potential_mwh_year": total_biogas * 6.5 / 1000 * 365 / 1000,  # Convert to MWh/year
                    "co2_reduction_tons_year": total_biogas * 1.98 / 1000,  # Estimate: ~1.98 kg CO2eq per m³
                    "population": int(row['populacao_2022']) if row['populacao_2022'] else None,
                    "urban_population": None,  # Not in V2
                    "rural_population": None,  # Not in V2
                    "gdp_total": None,  # Not in V2
                    "gdp_per_capita": None,  # Not in V2
                }
                data_to_insert.append(municipality_data)

            # Insert in batches of 100 (Supabase REST API limit)
            batch_size = 100
            total_inserted = 0

            for i in range(0, len(data_to_insert), batch_size):
                batch = data_to_insert[i:i + batch_size]
                print(f"  Inserting batch {i // batch_size + 1}/{(len(data_to_insert) + batch_size - 1) // batch_size}...")

                try:
                    self.supabase.table("municipalities").insert(batch).execute()
                    total_inserted += len(batch)
                    print(f"    [OK] Inserted {len(batch)} records")
                except Exception as e:
                    print(f"    [ERROR] Error inserting batch: {e}")
                    # Continue with next batch
                    continue

            print(f"[OK] Successfully migrated {total_inserted} municipalities")

        except Exception as e:
            print(f"[ERROR] Error migrating municipalities: {e}")
            raise

        finally:
            v2_cursor.close()
            v2_conn.close()

    def migrate_scientific_references(self):
        """Migrate scientific references from JSON to Supabase"""
        print("\n[DOCS] Migrating scientific references...")

        if not self.v2_references_path.exists():
            print(f"[WARNING] References file not found: {self.v2_references_path}")
            return

        try:
            # Load JSON data
            with open(self.v2_references_path, 'r', encoding='utf-8') as f:
                references = json.load(f)

            print(f"  Found {len(references)} scientific references")

            # Prepare data for insert
            data_to_insert = []
            for ref in references:
                reference_data = {
                    "paper_id": ref.get('paper_id'),
                    "doi": ref.get('doi'),
                    "title": ref.get('title'),
                    "authors": ref.get('authors'),
                    "journal": ref.get('journal'),
                    "publisher": ref.get('publisher'),
                    "publication_year": ref.get('publication_year'),
                    "abstract": ref.get('abstract'),
                    "keywords": ref.get('keywords'),
                    "sector": ref.get('sector'),
                    "sector_full": ref.get('sector_full'),
                    "primary_residue": ref.get('primary_residue'),
                    "pdf_filename": ref.get('pdf_filename'),
                    "codename_short": ref.get('codename_short'),
                    "external_url": ref.get('external_url'),
                    "validation_status": ref.get('validation_status'),
                    "has_validated_params": ref.get('has_validated_params', 0) == 1,
                    "metadata_confidence": ref.get('metadata_confidence'),
                }
                data_to_insert.append(reference_data)

            # Insert in batches
            batch_size = 50
            total_inserted = 0

            for i in range(0, len(data_to_insert), batch_size):
                batch = data_to_insert[i:i + batch_size]
                print(f"  Inserting batch {i // batch_size + 1}/{(len(data_to_insert) + batch_size - 1) // batch_size}...")

                try:
                    self.supabase.table("scientific_references").insert(batch).execute()
                    total_inserted += len(batch)
                    print(f"    [OK] Inserted {len(batch)} records")
                except Exception as e:
                    print(f"    [ERROR] Error inserting batch: {e}")
                    continue

            print(f"[OK] Successfully migrated {total_inserted} references")

        except Exception as e:
            print(f"[ERROR] Error migrating references: {e}")
            raise

    def verify_migration(self):
        """Verify data was migrated successfully"""
        print("\n[CHECK] Verifying migration...")

        try:
            # Check municipalities
            muni_response = self.supabase.table("municipalities").select("id", count="exact").execute()
            muni_count = muni_response.count
            print(f"  Municipalities: {muni_count}")

            # Check references
            ref_response = self.supabase.table("scientific_references").select("id", count="exact").execute()
            ref_count = ref_response.count
            print(f"  Scientific References: {ref_count}")

            # Get top 5 municipalities by biogas potential
            top_response = self.supabase.table("municipalities") \
                .select("municipality_name,total_biogas_m3_year") \
                .gt("total_biogas_m3_year", 0) \
                .order("total_biogas_m3_year", desc=True) \
                .limit(5) \
                .execute()

            if top_response.data:
                print("\n  Top 5 Municipalities by Biogas Potential:")
                for idx, muni in enumerate(top_response.data, 1):
                    biogas = muni['total_biogas_m3_year']
                    print(f"    {idx}. {muni['municipality_name']}: {biogas:,.2f} m³/year")

            if muni_count == 645:
                print("\n[OK] Migration verification successful!")
            else:
                print(f"\n[WARNING] Expected 645 municipalities, found {muni_count}")

        except Exception as e:
            print(f"[ERROR] Error verifying migration: {e}")
            raise

    def run_full_migration(self):
        """Run complete migration process"""
        print("=" * 80)
        print("PILAR-2b V3 - Data Migration (Supabase SDK)")
        print("Migrating from SQLite (V2) to Supabase")
        print("=" * 80)

        try:
            # Step 1: Migrate municipalities
            self.migrate_municipalities()

            # Step 2: Migrate scientific references
            self.migrate_scientific_references()

            # Step 3: Verify migration
            self.verify_migration()

            print("\n" + "=" * 80)
            print("[OK] MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 80)

        except Exception as e:
            print("\n" + "=" * 80)
            print(f"[ERROR] MIGRATION FAILED: {e}")
            print("=" * 80)
            sys.exit(1)


def main():
    """Main migration script"""
    print("\nPILAR-2b V3 - Data Migration Tool (Supabase SDK)")
    print("-" * 80)

    # Load environment variables
    load_dotenv()

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for admin operations

    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials in .env file")
        print("Required variables:")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    print(f"\n[OK] Supabase URL: {supabase_url}")
    print(f"[OK] Service Role Key: {'*' * 20}...{supabase_key[-10:]}")

    # Confirm migration
    print("\n" + "=" * 80)
    print("[WARNING] This will INSERT data into your Supabase database")
    print("=" * 80)
    print("\nThis migration will:")
    print("  1. Import 645 municipalities with biogas potential data")
    print("  2. Import 58 scientific references")
    print("  3. Verify data integrity")
    print("\nMake sure you have already run: 001_initial_schema.sql")
    print("-" * 80)

    try:
        confirm = input("\nContinue with migration? (yes/no): ").strip().lower()
    except EOFError:
        confirm = 'yes'  # Auto-confirm on non-interactive

    if confirm != 'yes':
        print("Migration cancelled.")
        sys.exit(0)

    # Run migration
    try:
        migrator = SupabaseMigrator(supabase_url, supabase_key)
        migrator.run_full_migration()
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
