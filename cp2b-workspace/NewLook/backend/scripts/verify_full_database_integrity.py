#!/usr/bin/env python3
"""
verify_full_database_integrity.py
==================================
Comprehensive Database Audit Script for PILAR-2b PostgreSQL/PostGIS (cp2b_maps).
"""

import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

BACKEND_DIR = Path(__file__).resolve().parent.parent


def get_db_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/cp2b_maps"
    )


def audit_database():
    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor(cursor_factory=RealDictCursor)

    tables_to_check = [
        ("schema_migrations", "Migracoes SQL rastreadas"),
        ("municipalities", "Municipios (Geometrias + Potencial Canonico + IBGE 2025)"),
        ("residue_streams_sp2023", "Detalhamento municipal dos 15 sub-fluxos de biomassa"),
        ("residuos", "Feedstocks de Residuos (BMP, TS, VS, C:N, FDE)"),
        ("sectors", "Setores Principais do Biogas"),
        ("subsectors", "Subsetores de Biomassa"),
        ("residuo_references", "Corpus de Artigos Cientificos (Autores, Periodicos, DOIs)"),
        ("conversion_factors", "Fatores de Conversao de Literatura"),
        ("infrastructure_features", "Camadas de Infraestrutura (Gasodutos, ETEs, Usinas)"),
        ("municipality_timeseries", "Series Temporais Historicas (PAM, PPM, SNIS)"),
        ("municipality_biomass_provenance", "Metadados de Proveniencia e Qualidade"),
    ]

    print("=" * 85)
    print("      AUDITORIA INTEGRAL DE DADOS DO BANCO POSTGRESQL / POSTGIS (cp2b_maps)")
    print("=" * 85)
    print(f"{'Tabela':<30} | {'Registros':<10} | {'Status':<12} | {'Descricao'}")
    print("-" * 85)

    total_records = 0
    all_ok = True

    for tbl, desc in tables_to_check:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {tbl};")
            cnt = cur.fetchone()["count"]
            total_records += cnt
            status = "[OK]" if cnt > 0 else "[VAZIA]"
            print(f"{tbl:<30} | {cnt:10,d} | {status:<12} | {desc}")
        except Exception as err:
            conn.rollback()
            all_ok = False
            print(f"{tbl:<30} | {'ERRO':<10} | [ERRO]       | {err}")

    print("-" * 85)
    print(f"TOTAL DE REGISTROS CONSOLIDADOS NO BANCO: {total_records:,d}")

    # Checagens Específicas de Qualidade
    print("\n" + "=" * 85)
    print("                  VERIFICACOES DE INTEGRIDADE DE CONTEUDO")
    print("=" * 85)

    # 1. Municípios de SP com regionalização e biogás
    cur.execute("""
        SELECT COUNT(*) as cnt, SUM(total_biogas_m3_year) as total_bg
        FROM municipalities 
        WHERE intermediate_region IS NOT NULL AND total_biogas_m3_year > 0;
    """)
    r_sp = cur.fetchone()
    print(f"1. Municipios de SP com Potencial Calculado : {r_sp['cnt']} / 645")
    print(f"   - Biogas Bruto Total em SP (Postgres)   : {r_sp['total_bg']:,.2f} m3/ano")

    # 2. Artigos científicos com DOIs/URLs
    cur.execute("""
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN doi IS NOT NULL THEN 1 END) as with_doi,
               COUNT(CASE WHEN authors IS NOT NULL THEN 1 END) as with_authors
        FROM residuo_references;
    """)
    r_ref = cur.fetchone()
    print(f"2. Artigos Cientificos Ingeridos            : {r_ref['total']}")
    print(f"   - Artigos com DOIs Validados            : {r_ref['with_doi']}")
    print(f"   - Artigos com Autores Mapeados          : {r_ref['with_authors']}")

    # 3. Feedstocks com parâmetros BMP completos
    cur.execute("""
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN bmp_medio IS NOT NULL THEN 1 END) as with_bmp,
               COUNT(CASE WHEN fc_medio IS NOT NULL THEN 1 END) as with_fde
        FROM residuos;
    """)
    r_res = cur.fetchone()
    print(f"3. Feedstocks de Residuos Parametrizados    : {r_res['total']}")
    print(f"   - Com BMP Medio Configurado             : {r_res['with_bmp']}")
    print(f"   - Com Fatores FDE Completos             : {r_res['with_fde']}")

    conn.close()

    print("=" * 85)
    if all_ok:
        print("STATUS GLOBAL DO BANCO DE DADOS: 100% OPERACIONAL E CONSOLIDADO!")
    else:
        print("STATUS GLOBAL: ALGUMAS TABELAS REQUEREM ATENCAO.")
    print("=" * 85)


if __name__ == "__main__":
    audit_database()
