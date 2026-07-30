#!/usr/bin/env python3
"""
ingest_all_scientific_articles.py
==================================
Ingests all 464 tabulated scientific articles from references_review_ALL.xlsx
into PostgreSQL database table `residuo_references`.
"""

import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor

BACKEND_DIR = Path(__file__).resolve().parent.parent


def resolve_excel_path() -> Path:
    candidates = [
        BACKEND_DIR / "data" / "canonical_parameters" / "references_review_ALL.xlsx",
        BACKEND_DIR.parent / "data" / "canonical_parameters" / "references_review_ALL.xlsx",
        Path("/app/data/canonical_parameters/references_review_ALL.xlsx"),
        Path("/app/docs/data/references_review_ALL.xlsx"),
    ]
    for p in candidates:
        if p.is_file():
            return p
    return candidates[0]


EXCEL_PATH = resolve_excel_path()


def get_db_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")


def main():
    if not EXCEL_PATH.exists():
        print(f"File not found: {EXCEL_PATH}")
        sys.exit(1)

    print(f"Loading references from {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH)

    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor()

    cur.execute("SELECT codigo, id FROM residuos;")
    residuos_map = {row[0].upper(): row[1] for row in cur.fetchall()}

    # Add default fallback mapped IDs
    fallback_id = list(residuos_map.values())[0] if residuos_map else 1

    inserted = 0
    updated = 0

    for idx, row in df.iterrows():
        feedstock_code = str(row.get("feedstock") or "").upper().strip()
        residuo_id = residuos_map.get(feedstock_code, fallback_id)

        citation = str(row.get("citation") or "").strip()
        authors = str(row.get("authors") or "").strip() if pd.notna(row.get("authors")) else None
        title = str(row.get("title") or "").strip() if pd.notna(row.get("title")) else None
        journal = str(row.get("journal") or "").strip() if pd.notna(row.get("journal")) else None

        year = None
        if pd.notna(row.get("year")):
            try:
                year = int(float(row.get("year")))
            except (ValueError, TypeError):
                year = None

        doi = str(row.get("corrected_doi") or row.get("doi") or "").strip()
        if doi in ("nan", "None", ""):
            doi = None

        url = str(row.get("corrected_url") or row.get("url") or "").strip()
        if url in ("nan", "None", ""):
            url = None

        peer_rev = str(row.get("peer_reviewed") or "").lower() in ("yes", "true", "1")

        if not citation or citation == "nan":
            if authors and year:
                citation = f"{authors} ({year})"
            elif title:
                citation = title[:100]
            else:
                continue

        # Check existing reference
        cur.execute(
            """
            SELECT id FROM residuo_references 
            WHERE (doi IS NOT NULL AND doi = %s) OR citation = %s;
        """,
            (doi, citation),
        )

        existing = cur.fetchone()
        if existing:
            cur.execute(
                """
                UPDATE residuo_references
                SET authors = COALESCE(%s, authors),
                    title = COALESCE(%s, title),
                    journal = COALESCE(%s, journal),
                    year = COALESCE(%s, year),
                    doi = COALESCE(%s, doi),
                    url = COALESCE(%s, url),
                    is_primary = %s
                WHERE id = %s;
            """,
                (authors, title, journal, year, doi, url, peer_rev, existing[0]),
            )
            updated += 1
        else:
            cur.execute(
                """
                INSERT INTO residuo_references 
                (residuo_id, parameter_type, citation, authors, title, journal, year, doi, url, is_primary, validation_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
                (
                    residuo_id,
                    "bmp",
                    citation,
                    authors,
                    title,
                    journal,
                    year,
                    doi,
                    url,
                    peer_rev,
                    "verified",
                ),
            )
            inserted += 1

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM residuo_references;")
    total_in_db = cur.fetchone()[0]

    conn.close()

    print("\n=== INGESTÃO DE ARTIGOS CIENTÍFICOS CONCLUÍDA ===")
    print(f"  - Novas referências inseridas no DB : {inserted}")
    print(f"  - Referências atualizadas com metadados: {updated}")
    print(f"  - Total de artigos no banco PostgreSQL : {total_in_db}")


if __name__ == "__main__":
    main()
