"""
cp2b_migrate.py — Apply CP2B migrations via psycopg2 (no psql binary required).

Run from any directory inside the project:
  DATABASE_URL=postgresql://user:pass@host/db python backend/scripts/cp2b_migrate.py

Applies in order:
  migrations/012_cp2b_residue_streams.sql
  migrations/013_cp2b_municipality_summary.sql
"""

import os
import sys
from pathlib import Path

import psycopg2

BACKEND_DIR = Path(__file__).resolve().parent.parent  # …/backend/
MIGRATIONS = [
    BACKEND_DIR / "migrations" / "012_cp2b_residue_streams.sql",
    BACKEND_DIR / "migrations" / "013_cp2b_municipality_summary.sql",
]


def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("ERROR: DATABASE_URL env var not set.")

    conn = psycopg2.connect(url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for path in MIGRATIONS:
                sql = path.read_text(encoding="utf-8")
                print(f"Applying {path.name} …")
                cur.execute(sql)
                print(f"  OK")
    finally:
        conn.close()

    print("\nMigrations applied. Ready to load data.")


if __name__ == "__main__":
    main()
