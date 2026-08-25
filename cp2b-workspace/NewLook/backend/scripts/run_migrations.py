#!/usr/bin/env python3
"""
run_migrations.py
=================
Automated idempotent SQL migration runner for PILAR-2b PostgreSQL/PostGIS database.

Applies all SQL scripts in `backend/app/migrations/*.sql` in alphabetical order,
tracking applied versions in `schema_migrations` table.

Usage:
  python backend/scripts/run_migrations.py
  DATABASE_URL="postgresql://postgres:password@db:5432/cp2b_maps" python scripts/run_migrations.py --seed
"""

import argparse
import logging
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BACKEND_DIR / "app" / "migrations"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("run_migrations")


def get_db_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")


def ensure_migrations_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
    conn.commit()


def get_applied_migrations(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations;")
        rows = cur.fetchall()
        return {r[0] for r in rows}


def apply_migration(conn, file_path: Path):
    version = file_path.name
    logger.info(f"Applying migration {version}...")
    sql = file_path.read_text(encoding="utf-8")

    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute("INSERT INTO schema_migrations (version) VALUES (%s);", (version,))
        conn.commit()
        logger.info(f"Successfully applied {version}.")
    except Exception as err:
        conn.rollback()
        err_msg = str(err).lower()
        if "already exists" in err_msg or "duplicate" in err_msg:
            logger.warning(f"Migration {version} warning (schema elements already exist): {err}")
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s) ON CONFLICT DO NOTHING;",
                    (version,),
                )
            conn.commit()
            logger.info(f"Marked {version} as applied despite pre-existing objects.")
        else:
            logger.error(f"Migration {version} failed: {err}")
            raise


def main():
    parser = argparse.ArgumentParser(description="Run PILAR-2b database migrations.")
    parser.add_argument(
        "--seed", action="store_true", help="Run data seeding after applying migrations"
    )
    args = parser.parse_args()

    db_url = get_db_url()
    logger.info(
        f"Connecting to database (URL: {db_url.split('@')[-1] if '@' in db_url else db_url})..."
    )

    try:
        conn = psycopg2.connect(db_url)
    except Exception as err:
        logger.error(f"Failed to connect to database: {err}")
        sys.exit(1)

    try:
        ensure_migrations_table(conn)
        applied = get_applied_migrations(conn)

        sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
        pending = [f for f in sql_files if f.name not in applied]

        if not pending:
            logger.info("Database schema is up-to-date. No pending migrations.")
        else:
            logger.info(f"Found {len(pending)} pending migration(s) out of {len(sql_files)} total.")
            for f in pending:
                apply_migration(conn, f)
            logger.info("All migrations completed successfully.")

        if args.seed:
            logger.info("Starting data seeders...")
            sys.path.insert(0, str(BACKEND_DIR))
            # Clear CLI args so child modules using argparse do not fail on --seed
            sys.argv = [sys.argv[0]]

            try:
                from scripts.load_biomass_from_master import main as load_biomass

                logger.info("Running load_biomass_from_master...")
                load_biomass()
            except Exception as e:
                logger.warning(f"Seeder load_biomass_from_master skipped or errored: {e}")

            try:
                from scripts.sync_db_canonical import main as sync_canonical

                logger.info("Running sync_db_canonical...")
                sync_canonical()
            except Exception as e:
                logger.warning(f"Seeder sync_db_canonical skipped or errored: {e}")

            try:
                from scripts.ingest_all_scientific_articles import main as ingest_articles

                logger.info("Running ingest_all_scientific_articles...")
                ingest_articles()
            except Exception as e:
                logger.warning(f"Seeder ingest_all_scientific_articles skipped or errored: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
