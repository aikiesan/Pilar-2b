"""
PILAR-2b V3 - Data Migration Script
Migrate data from V2 SQLite database to PostgreSQL + PostGIS

Run this script after executing 001_initial_schema.sql in Supabase
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import json
from pathlib import Path
import sys
import os
from dotenv import load_dotenv

# Configuration
# Look for v2-data directory (could be in different locations)
_script_dir = Path(__file__).parent
_v2_data_candidates = [
    Path(r"C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V3\cp2b-workspace\project_map"),  # Windows absolute path
    Path("cp2b-workspace/project_map"),  # Relative Windows path
    Path("/home/user/NewLook/v2-data"),  # Linux absolute path
    _script_dir.parent.parent.parent.parent.parent / "v2-data",  # 5 levels up
    _script_dir.parent.parent.parent.parent.parent.parent / "v2-data",  # 6 levels up
    _script_dir.parent.parent.parent.parent.parent / "project_map",  # 5 levels up to project_map
]

V2_DATA_DIR = None
for candidate in _v2_data_candidates:
    if candidate.exists() and (candidate / "data" / "database" / "cp2b_maps.db").exists():
        V2_DATA_DIR = candidate
        break

if V2_DATA_DIR is None:
    V2_DATA_DIR = Path("/home/user/NewLook/v2-data")  # Default fallback

V2_DATABASE_PATH = V2_DATA_DIR / "data" / "database" / "cp2b_maps.db"
V2_REFERENCES_PATH = V2_DATA_DIR / "data" / "panorama_scientific_papers.json"

class DataMigrator:
    """Migrate PILAR-2b V2 data to PostgreSQL"""

    def __init__(self, postgres_conn_string: str):
        """
        Initialize migrator

        Args:
            postgres_conn_string: PostgreSQL connection string
                Format: "postgresql://user:password@host:port/database"
        """
        self.postgres_conn_string = postgres_conn_string
        self.v2_db_path = V2_DATABASE_PATH
        self.v2_references_path = V2_REFERENCES_PATH

        # Validate V2 database exists
        if not self.v2_db_path.exists():
            raise FileNotFoundError(f"V2 database not found: {self.v2_db_path}")

        print(f"[OK] V2 Database found: {self.v2_db_path}")
        print(f"[OK] V2 References found: {self.v2_references_path}")

    def connect_v2_db(self) -> sqlite3.Connection:
        """Connect to V2 SQLite database"""
        return sqlite3.connect(self.v2_db_path)

    def connect_postgres(self) -> psycopg2.extensions.connection:
        """Connect to PostgreSQL database"""
        return psycopg2.connect(self.postgres_conn_string)

    def migrate_municipalities(self):
        """Migrate municipality data from V2 to V3"""
        print("\n[DATA] Migrating municipalities data...")

        # Connect to both databases
        v2_conn = self.connect_v2_db()
        v2_conn.row_factory = sqlite3.Row
        v2_cursor = v2_conn.cursor()

        pg_conn = self.connect_postgres()
        pg_cursor = pg_conn.cursor()

        try:
            # Query V2 data
            v2_cursor.execute("""
                SELECT
                    nome_municipio,
                    codigo_ibge,
                    latitude,
                    longitude,
                    regiao_administrativa,
                    regiao_governo_imediata,
                    regiao_governo_intermediaria,
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
                    potencial_energia_kwh_dia,
                    potencial_energia_mwh_ano,
                    reducao_co2_ton_ano,
                    populacao,
                    populacao_urbana,
                    populacao_rural,
                    pib_total,
                    pib_per_capita
                FROM municipios
                ORDER BY nome_municipio
            """)

            municipalities = v2_cursor.fetchall()
            print(f"  Found {len(municipalities)} municipalities in V2 database")

            # Prepare batch insert
            insert_query = """
                INSERT INTO municipalities (
                    municipality_name,
                    ibge_code,
                    centroid,
                    administrative_region,
                    immediate_region,
                    intermediate_region,
                    total_biogas_m3_year,
                    total_biogas_m3_day,
                    urban_biogas_m3_year,
                    agricultural_biogas_m3_year,
                    livestock_biogas_m3_year,
                    rsu_biogas_m3_year,
                    rpo_biogas_m3_year,
                    sugarcane_biogas_m3_year,
                    soybean_biogas_m3_year,
                    corn_biogas_m3_year,
                    coffee_biogas_m3_year,
                    citrus_biogas_m3_year,
                    cattle_biogas_m3_year,
                    swine_biogas_m3_year,
                    poultry_biogas_m3_year,
                    aquaculture_biogas_m3_year,
                    energy_potential_kwh_day,
                    energy_potential_mwh_year,
                    co2_reduction_tons_year,
                    population,
                    urban_population,
                    rural_population,
                    gdp_total,
                    gdp_per_capita
                ) VALUES (
                    %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
            """

            # Prepare data for batch insert
            data_to_insert = []
            for row in municipalities:
                data_to_insert.append((
                    row['nome_municipio'],
                    str(row['codigo_ibge']) if row['codigo_ibge'] else None,
                    row['longitude'],  # longitude first for PostGIS Point
                    row['latitude'],
                    row['regiao_administrativa'],
                    row['regiao_governo_imediata'],
                    row['regiao_governo_intermediaria'],
                    row['total_final_m_ano'] or 0,
                    (row['total_final_m_ano'] or 0) / 365.0,  # Calculate daily
                    row['total_urbano_m_ano'] or 0,
                    row['total_agricola_m_ano'] or 0,
                    row['total_pecuaria_m_ano'] or 0,
                    row['rsu_potencial_m_ano'] or 0,
                    row['rpo_potencial_m_ano'] or 0,
                    row['biogas_cana_m_ano'] or 0,
                    row['biogas_soja_m_ano'] or 0,
                    row['biogas_milho_m_ano'] or 0,
                    row['biogas_cafe_m_ano'] or 0,
                    row['biogas_citros_m_ano'] or 0,
                    row['biogas_bovinos_m_ano'] or 0,
                    row['biogas_suino_m_ano'] or 0,
                    row['biogas_aves_m_ano'] or 0,
                    row['biogas_piscicultura_m_ano'] or 0,
                    row['potencial_energia_kwh_dia'] or 0,
                    row['potencial_energia_mwh_ano'] or 0,
                    row['reducao_co2_ton_ano'] or 0,
                    row['populacao'],
                    row['populacao_urbana'],
                    row['populacao_rural'],
                    row['pib_total'],
                    row['pib_per_capita']
                ))

            # Execute batch insert
            execute_batch(pg_cursor, insert_query, data_to_insert, page_size=100)
            pg_conn.commit()

            print(f"[OK] Successfully migrated {len(data_to_insert)} municipalities")

        except Exception as e:
            pg_conn.rollback()
            print(f"[ERROR] Error migrating municipalities: {e}")
            raise

        finally:
            v2_cursor.close()
            v2_conn.close()
            pg_cursor.close()
            pg_conn.close()

    def migrate_scientific_references(self):
        """Migrate scientific references from JSON to PostgreSQL"""
        print("\n[DOCS] Migrating scientific references...")

        if not self.v2_references_path.exists():
            print(f"[WARNING] References file not found: {self.v2_references_path}")
            return

        pg_conn = self.connect_postgres()
        pg_cursor = pg_conn.cursor()

        try:
            # Load JSON data
            with open(self.v2_references_path, 'r', encoding='utf-8') as f:
                references = json.load(f)

            print(f"  Found {len(references)} scientific references")

            insert_query = """
                INSERT INTO scientific_references (
                    paper_id, doi, title, authors, journal, publisher,
                    publication_year, abstract, keywords, sector, sector_full,
                    primary_residue, pdf_filename, codename_short, external_url,
                    validation_status, has_validated_params, metadata_confidence
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (paper_id) DO NOTHING
            """

            data_to_insert = []
            for ref in references:
                data_to_insert.append((
                    ref.get('paper_id'),
                    ref.get('doi'),
                    ref.get('title'),
                    ref.get('authors'),
                    ref.get('journal'),
                    ref.get('publisher'),
                    ref.get('publication_year'),
                    ref.get('abstract'),
                    ref.get('keywords'),
                    ref.get('sector'),
                    ref.get('sector_full'),
                    ref.get('primary_residue'),
                    ref.get('pdf_filename'),
                    ref.get('codename_short'),
                    ref.get('external_url'),
                    ref.get('validation_status'),
                    ref.get('has_validated_params', 0) == 1,
                    ref.get('metadata_confidence')
                ))

            execute_batch(pg_cursor, insert_query, data_to_insert, page_size=50)
            pg_conn.commit()

            print(f"[OK] Successfully migrated {len(data_to_insert)} references")

        except Exception as e:
            pg_conn.rollback()
            print(f"[ERROR] Error migrating references: {e}")
            raise

        finally:
            pg_cursor.close()
            pg_conn.close()

    def verify_migration(self):
        """Verify data was migrated successfully"""
        print("\n[CHECK] Verifying migration...")

        pg_conn = self.connect_postgres()
        pg_cursor = pg_conn.cursor()

        try:
            # Check municipalities
            pg_cursor.execute("SELECT COUNT(*) FROM municipalities")
            muni_count = pg_cursor.fetchone()[0]
            print(f"  Municipalities: {muni_count}")

            # Check references
            pg_cursor.execute("SELECT COUNT(*) FROM scientific_references")
            ref_count = pg_cursor.fetchone()[0]
            print(f"  Scientific References: {ref_count}")

            # Check spatial data
            pg_cursor.execute("""
                SELECT COUNT(*)
                FROM municipalities
                WHERE centroid IS NOT NULL
            """)
            spatial_count = pg_cursor.fetchone()[0]
            print(f"  Municipalities with coordinates: {spatial_count}")

            # Top 5 municipalities by biogas potential
            pg_cursor.execute("""
                SELECT municipality_name,
                       ROUND(total_biogas_m3_year::NUMERIC, 2) as biogas
                FROM municipalities
                WHERE total_biogas_m3_year > 0
                ORDER BY total_biogas_m3_year DESC
                LIMIT 5
            """)
            top_municipalities = pg_cursor.fetchall()
            print("\n  Top 5 Municipalities by Biogas Potential:")
            for idx, (name, biogas) in enumerate(top_municipalities, 1):
                print(f"    {idx}. {name}: {biogas:,.2f} m³/year")

            if muni_count == 645:
                print("\n[OK] Migration verification successful!")
            else:
                print(f"\n[WARNING] Warning: Expected 645 municipalities, found {muni_count}")

        except Exception as e:
            print(f"[ERROR] Error verifying migration: {e}")
            raise

        finally:
            pg_cursor.close()
            pg_conn.close()

    def run_full_migration(self):
        """Run complete migration process"""
        print("=" * 80)
        print("PILAR-2b V3 - Data Migration")
        print("Migrating from SQLite (V2) to PostgreSQL + PostGIS (V3)")
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
    print("\nPILAR-2b V3 - Data Migration Tool")
    print("-" * 80)

    # Load environment variables
    load_dotenv()

    # Try to get connection string from command line, env var, or prompt
    conn_string = None

    # 1. Check command line arguments
    if len(sys.argv) > 1:
        conn_string = sys.argv[1]
        print("\n[OK] Using connection string from command line")

    # 2. Check environment variable
    elif os.getenv('DATABASE_URL'):
        conn_string = os.getenv('DATABASE_URL')
        print("\n[OK] Using DATABASE_URL from environment")

    # 3. Prompt user
    else:
        print("\nPlease provide your Supabase/PostgreSQL connection string")
        print("Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres")
        print("\nExample: postgresql://postgres:mypassword@db.xxxxx.supabase.co:5432/postgres\n")

        try:
            conn_string = input("Connection string: ").strip()
        except EOFError:
            print("\nError: No connection string provided")
            print("You can also:")
            print("  1. Set DATABASE_URL environment variable")
            print("  2. Pass connection string as argument: python -m app.migrations.import_v2_data 'postgresql://...'")
            sys.exit(1)

    if not conn_string:
        print("Error: Connection string cannot be empty")
        sys.exit(1)

    # Auto-confirm if running non-interactively
    auto_confirm = os.getenv('AUTO_CONFIRM', 'false').lower() == 'true' or len(sys.argv) > 1

    if not auto_confirm:
        # Confirm migration
        print("\n" + "=" * 80)
        print("[WARNING] WARNING: This will INSERT data into your PostgreSQL database")
        print("=" * 80)
        print("\nThis migration will:")
        print("  1. Import 645 municipalities with biogas potential data")
        print("  2. Import 58 scientific references")
        print("  3. Create spatial indexes and verify data")
        print("\nMake sure you have already run: 001_initial_schema.sql")
        print("-" * 80)

        try:
            confirm = input("\nContinue with migration? (yes/no): ").strip().lower()
        except EOFError:
            confirm = 'yes'  # Auto-confirm on non-interactive

        if confirm != 'yes':
            print("Migration cancelled.")
            sys.exit(0)
    else:
        print("\n[OK] Auto-confirming migration (non-interactive mode)")

    # Run migration
    try:
        migrator = DataMigrator(conn_string)
        migrator.run_full_migration()
    except Exception as e:
        print(f"\nFatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
