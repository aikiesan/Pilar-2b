#!/usr/bin/env python3
"""
check_plants_in_db.py
======================
Check all biogas and biomethane plant records in PostgreSQL (`infrastructure_features`).
"""

import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

BACKEND_DIR = Path(__file__).resolve().parent.parent


def get_db_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")


def safe_str(val) -> str:
    if val is None:
        return "N/A"
    s = str(val)
    return s.encode("ascii", errors="ignore").decode("ascii")


def check_plants():
    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT source_file, layer_id, COUNT(*) as cnt
        FROM infrastructure_features
        GROUP BY source_file, layer_id
        ORDER BY cnt DESC;
    """)
    print("=== CAMADAS DE INFRAESTRUTURA NO POSTGRESQL ===")
    for r in cur.fetchall():
        sf = safe_str(r["source_file"])
        lid = safe_str(r["layer_id"])
        print(f"  - Source File: {sf:<35} | Layer ID: {lid:<15} | Total: {r['cnt']}")

    # Search for biogas and biomethane plants in attributes JSONB or name or source_file
    cur.execute("""
        SELECT id, name, ibge_code, uf, attributes, source_file
        FROM infrastructure_features
        WHERE LOWER(name) LIKE '%biogas%' 
           OR LOWER(name) LIKE '%biometano%' 
           OR LOWER(source_file) LIKE '%biogas%'
           OR LOWER(source_file) LIKE '%plant%'
           OR LOWER(attributes::text) LIKE '%biogas%'
           OR LOWER(attributes::text) LIKE '%biometano%';
    """)
    plants = cur.fetchall()

    print(f"\n=== TOTAL DE PLANTAS DE BIOGAS E BIOMETANO NO POSTGRESQL: {len(plants)} plantas ===")
    print(
        f"{'Nome da Planta':<40} | {'UF':<4} | {'Fonte / Layer':<30} | {'Detalhes dos Atributos'}"
    )
    print("-" * 115)
    for p in plants[:30]:
        attrs = p["attributes"] or {}
        cap = (
            attrs.get("capacidade_m3_dia")
            or attrs.get("capacidade")
            or attrs.get("capacity")
            or attrs.get("potencia_mw")
            or "N/A"
        )
        tipo = (
            attrs.get("tipo")
            or attrs.get("tipo_combustivel")
            or attrs.get("substrato")
            or "Biogas/Biometano"
        )
        name_s = safe_str(p["name"])
        uf_s = safe_str(p["uf"])
        sf_s = safe_str(p["source_file"])
        print(f"{name_s[:40]:<40} | {uf_s:<4} | {sf_s[:30]:<30} | Cap: {cap} | Tipo: {tipo}")

    conn.close()


if __name__ == "__main__":
    check_plants()
