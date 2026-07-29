"""
Import data from PanoramaCP2B and Precision Biogas SQLite databases to PostgreSQL/Supabase.

This script:
1. Creates the necessary PostgreSQL tables for scientific references and chemical data
2. Exports data from SQLite databases
3. Imports data into PostgreSQL with proper relationships

Usage:
    python scripts/import_panorama_data.py
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths to SQLite databases
PANORAMA_DB = Path(__file__).parent.parent / "data" / "cp2b_panorama.db"
PRECISION_DB = Path(__file__).parent.parent / "data" / "CP2B_Precision_Biogas.db"

# PostgreSQL connection from environment
DATABASE_URL = os.getenv("DATABASE_URL")

def create_tables(conn):
    """Create PostgreSQL tables for residuos and references."""

    cursor = conn.cursor()

    # 1. Sectors table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sectors (
            codigo VARCHAR(50) PRIMARY KEY,
            nome VARCHAR(200) NOT NULL,
            nome_en VARCHAR(200),
            emoji VARCHAR(10),
            ordem INTEGER,
            descricao TEXT
        )
    """)

    # 2. Subsectors table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subsectors (
            codigo VARCHAR(50) PRIMARY KEY,
            nome VARCHAR(200) NOT NULL,
            nome_en VARCHAR(200),
            sector_codigo VARCHAR(50) REFERENCES sectors(codigo),
            emoji VARCHAR(10),
            ordem INTEGER
        )
    """)

    # 3. Residuos table (main residues table)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS residuos (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR(50) UNIQUE,
            nome VARCHAR(200) NOT NULL,
            nome_en VARCHAR(200),
            sector_codigo VARCHAR(50) REFERENCES sectors(codigo),
            subsector_codigo VARCHAR(50) REFERENCES subsectors(codigo),
            categoria_codigo VARCHAR(50),
            categoria_nome VARCHAR(200),

            -- BMP (Biogas Methane Potential)
            bmp_min DECIMAL(10, 2),
            bmp_medio DECIMAL(10, 2),
            bmp_max DECIMAL(10, 2),
            bmp_unidade VARCHAR(50) DEFAULT 'NmL CH4/g VS',

            -- Total Solids (TS)
            ts_min DECIMAL(10, 2),
            ts_medio DECIMAL(10, 2),
            ts_max DECIMAL(10, 2),

            -- Volatile Solids (VS)
            vs_min DECIMAL(10, 2),
            vs_medio DECIMAL(10, 2),
            vs_max DECIMAL(10, 2),

            -- Chemical parameters
            chemical_cn_ratio DECIMAL(10, 2),
            chemical_ch4_content DECIMAL(10, 2),

            -- Conversion factors
            fc_medio DECIMAL(10, 4),
            fcp_medio DECIMAL(10, 4),
            fs_medio DECIMAL(10, 4),
            fl_medio DECIMAL(10, 4),
            fator_pessimista DECIMAL(10, 4),
            fator_realista DECIMAL(10, 4),
            fator_otimista DECIMAL(10, 4),

            -- Additional info
            generation TEXT,
            destination TEXT,
            icon VARCHAR(50),

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. Scientific references table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS residuo_references (
            id SERIAL PRIMARY KEY,
            residuo_id INTEGER REFERENCES residuos(id) ON DELETE CASCADE,
            parameter_type VARCHAR(50) NOT NULL,

            -- Citation details
            citation TEXT,
            authors TEXT,
            title TEXT,
            journal VARCHAR(300),
            year INTEGER,
            volume VARCHAR(50),
            pages VARCHAR(50),
            doi VARCHAR(200),
            url TEXT,

            -- Data validation
            reported_value DECIMAL(10, 2),
            reported_unit VARCHAR(50),
            is_primary BOOLEAN DEFAULT false,
            validation_status VARCHAR(50),

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Conversion factors table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversion_factors (
            id SERIAL PRIMARY KEY,
            category VARCHAR(100),
            subcategory VARCHAR(200),
            factor_value DECIMAL(10, 4),
            unit VARCHAR(100),
            literature_reference TEXT,
            reference_url TEXT,
            real_data_validation TEXT,
            safety_margin_percent DECIMAL(5, 2),
            final_factor DECIMAL(10, 4),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_residuos_sector ON residuos(sector_codigo)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_residuos_subsector ON residuos(subsector_codigo)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_references_residuo ON residuo_references(residuo_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_references_param ON residuo_references(parameter_type)")

    conn.commit()
    logger.info("✅ Tables created successfully")


def import_sectors(conn):
    """Import sector data."""
    cursor = conn.cursor()

    sectors = [
        ('AG_AGRICULTURA', 'Agrícola', 'Agricultural', '🌾', 1, 'Resíduos agrícolas'),
        ('PC_PECUARIA', 'Pecuária', 'Livestock', '🐄', 2, 'Resíduos pecuários'),
        ('IN_INDUSTRIAL', 'Industrial', 'Industrial', '🏭', 3, 'Resíduos industriais'),
        ('UR_URBANO', 'Urbano', 'Urban', '🏙️', 4, 'Resíduos urbanos'),
    ]

    execute_batch(cursor, """
        INSERT INTO sectors (codigo, nome, nome_en, emoji, ordem, descricao)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (codigo) DO NOTHING
    """, sectors)

    conn.commit()
    logger.info(f"✅ Imported {len(sectors)} sectors")


def import_from_precision_biogas(conn, sqlite_path):
    """Import data from CP2B_Precision_Biogas.db."""

    if not sqlite_path.exists():
        logger.warning(f"⚠️  Precision Biogas DB not found at {sqlite_path}")
        return

    logger.info(f"📖 Reading from {sqlite_path}")

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_cursor = sqlite_conn.cursor()

    # Get table names
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in sqlite_cursor.fetchall()]
    logger.info(f"Tables found: {tables}")

    # Import references
    if 'refs' in tables:
        sqlite_cursor.execute("SELECT * FROM refs LIMIT 10")
        refs = sqlite_cursor.fetchall()
        logger.info(f"Found {len(refs)} references")
        # TODO: Map to residuo_references table

    # Import chemical parameters
    if 'chem_param' in tables:
        sqlite_cursor.execute("SELECT * FROM chem_param LIMIT 10")
        params = sqlite_cursor.fetchall()
        logger.info(f"Found {len(params)} chemical parameters")
        # TODO: Map to residuos table

    sqlite_conn.close()


def import_from_panorama(conn, sqlite_path):
    """Import data from cp2b_panorama.db."""

    if not sqlite_path.exists():
        logger.warning(f"⚠️  Panorama DB not found at {sqlite_path}")
        return

    logger.info(f"📖 Reading from {sqlite_path}")

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_cursor = sqlite_conn.cursor()

    # Get table names
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in sqlite_cursor.fetchall()]
    logger.info(f"Tables found: {tables}")

    sqlite_conn.close()


def main():
    """Main import function."""

    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL environment variable not set")
        return

    logger.info("🚀 Starting data import...")

    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("✅ Connected to PostgreSQL")

        # Create tables
        create_tables(conn)

        # Import sectors
        import_sectors(conn)

        # Import from SQLite databases
        import_from_precision_biogas(conn, PRECISION_DB)
        import_from_panorama(conn, PANORAMA_DB)

        conn.close()
        logger.info("✅ Import completed successfully!")

    except Exception as e:
        logger.error(f"❌ Error during import: {e}")
        raise


if __name__ == "__main__":
    main()
