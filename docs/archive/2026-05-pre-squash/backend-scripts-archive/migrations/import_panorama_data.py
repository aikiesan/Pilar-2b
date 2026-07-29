#!/usr/bin/env python3
"""
Migration script to import data from Panorama_CP2B project into PILAR-2b V3.

This script imports:
- Residuos (residues) with chemical parameters
- Scientific references linked to BMP, TS, VS, C:N, CH4 parameters
- Conversion factors with literature backing
- Subsector hierarchy

Source: /home/user/Panorama_CP2B/data/cp2b_panorama.db
        /home/user/Panorama_CP2B/data/cp2b_maps.db
Target: PostgreSQL (Supabase)

Author: Claude Code
Date: 2024-11-19
"""

import os
import re
import sqlite3
import logging
from typing import Optional
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import psycopg2 for PostgreSQL connection
try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    logger.warning("psycopg2 not installed. Will generate SQL statements instead.")

# Source database paths
PANORAMA_DB = "/home/user/Panorama_CP2B/data/cp2b_panorama.db"
MAPS_DB = "/home/user/Panorama_CP2B/data/cp2b_maps.db"

# Output SQL file (if not connecting directly)
OUTPUT_SQL = "/home/user/NewLook/cp2b-workspace/NewLook/backend/app/migrations/004_import_panorama_data.sql"


def parse_reference_string(ref_string: str) -> list[dict]:
    """
    Parse a semicolon-separated reference string into structured references.

    Example input:
    "WIKANDARI, R. et al. Improvement of Biogas Production... 2015.; RUIZ, B. et al. Assessment..."

    Returns list of dicts with parsed fields.
    """
    if not ref_string:
        return []

    references = []
    # Split by semicolon, handling multiple formats
    raw_refs = [r.strip() for r in ref_string.split(';') if r.strip()]

    for ref in raw_refs:
        parsed = {
            'citation': ref,
            'authors': None,
            'title': None,
            'journal': None,
            'year': None,
            'volume': None,
            'doi': None
        }

        # Try to extract year (4 digits)
        year_match = re.search(r'\b(19|20)\d{2}\b', ref)
        if year_match:
            parsed['year'] = int(year_match.group())

        # Try to extract authors (text before first period or "et al.")
        author_match = re.match(r'^([^.]+(?:et al\.)?)', ref)
        if author_match:
            parsed['authors'] = author_match.group(1).strip()

        # Try to extract DOI
        doi_match = re.search(r'(10\.\d{4,}/[^\s;]+)', ref)
        if doi_match:
            parsed['doi'] = doi_match.group(1)

        # Try to extract journal (often in italics or after title)
        # Look for patterns like "Journal Name, v. X, p. Y"
        journal_match = re.search(r'([A-Z][a-zA-Z\s&]+),\s*v\.\s*\d+', ref)
        if journal_match:
            parsed['journal'] = journal_match.group(1).strip()

        references.append(parsed)

    return references


def get_subsector_mapping() -> dict:
    """
    Define mapping from residue names to subsector codes.
    """
    return {
        # Cana-de-açúcar
        'Bagaço de cana': 'AG_CANA',
        'Palha de cana': 'AG_CANA',
        'Torta de filtro': 'AG_CANA',
        'Vinhaça': 'AG_CANA',

        # Citros
        'Bagaço de citros': 'AG_CITROS',
        'Cascas de citros': 'AG_CITROS',
        'Polpa de citros': 'AG_CITROS',

        # Café
        'Casca de café': 'AG_CAFE',
        'Mucilagem de café': 'AG_CAFE',
        'Polpa de café': 'AG_CAFE',

        # Milho
        'Casca de milho': 'AG_MILHO',
        'Palha de milho': 'AG_MILHO',
        'Sabugo de milho': 'AG_MILHO',

        # Soja
        'Casca de soja': 'AG_SOJA',
        'Palha de soja': 'AG_SOJA',
        'Vagem de soja': 'AG_SOJA',

        # Silvicultura
        'Casca de eucalipto': 'AG_SILVICULTURA',
        'Folhas de eucalipto': 'AG_SILVICULTURA',
        'Galhos e ponteiros': 'AG_SILVICULTURA',

        # Pecuária - Bovinos
        'Esterco bovino': 'PC_BOVINOS',
        'Dejetos líquidos bovino': 'PC_BOVINOS',

        # Pecuária - Suínos
        'Dejetos líquidos de suínos': 'PC_SUINOS',
        'Esterco sólido de suínos': 'PC_SUINOS',

        # Pecuária - Aves
        'Cama de aviário': 'PC_AVES',
        'Dejetos frescos de aves': 'PC_AVES',

        # Pecuária - Outros
        'Carcaças e mortalidade': 'PC_OUTROS',

        # Urbano - RSU
        'FORSU - Fração Orgânica separada': 'UR_RSU',
        'Fração orgânica RSU': 'UR_RSU',

        # Urbano - ETE
        'Lodo primário': 'UR_ETE',
        'Lodo secundário (biológico)': 'UR_ETE',

        # Industrial
        'Aparas e refiles': 'IN_PAPEL',
        'Bagaço de malte': 'IN_CERVEJA',
        'Cascas diversas': 'IN_ALIMENTOS',
        'Gordura e sebo': 'IN_ABATEDOURO',
        'Levedura residual': 'IN_CERVEJA',
        'Rejeitos industriais orgânicos': 'IN_ALIMENTOS',
        'Sangue animal': 'IN_ABATEDOURO',
        'Vísceras não comestíveis': 'IN_ABATEDOURO',
    }


def load_panorama_residuos() -> list[dict]:
    """Load residuos data from Panorama SQLite database."""
    logger.info(f"Loading residuos from {PANORAMA_DB}")

    conn = sqlite3.connect(PANORAMA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id, codigo, nome, setor,
            categoria_codigo, categoria_nome,
            subsetor_codigo, subsetor_nome,
            bmp_min, bmp_medio, bmp_max,
            ts_min, ts_medio, ts_max,
            vs_min, vs_medio, vs_max,
            fc_min, fc_medio, fc_max,
            fcp_min, fcp_medio, fcp_max,
            fs_min, fs_medio, fs_max,
            fl_min, fl_medio, fl_max,
            fator_pessimista, fator_realista, fator_otimista,
            chemical_cn_ratio, chemical_ch4_content,
            generation, destination, justification, icon,
            bmp_referencias_literatura,
            ts_referencias_literatura,
            vs_referencias_literatura,
            cn_referencias_literatura,
            ch4_referencias_literatura,
            bmp_resumo_literatura,
            references_count
        FROM residuos
        ORDER BY setor, nome
    """)

    residuos = [dict(row) for row in cursor.fetchall()]
    conn.close()

    logger.info(f"Loaded {len(residuos)} residuos")
    return residuos


def load_conversion_factors() -> list[dict]:
    """Load conversion factors from Maps SQLite database."""
    logger.info(f"Loading conversion factors from {MAPS_DB}")

    conn = sqlite3.connect(MAPS_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            category, subcategory, factor_value, unit,
            literature_reference, reference_url,
            real_data_validation, safety_margin_percent,
            final_factor, date_validated, notes
        FROM conversion_factors
    """)

    factors = [dict(row) for row in cursor.fetchall()]
    conn.close()

    logger.info(f"Loaded {len(factors)} conversion factors")
    return factors


def load_subsetor_hierarchy() -> list[dict]:
    """Load subsector hierarchy from Panorama SQLite database."""
    logger.info(f"Loading subsector hierarchy from {PANORAMA_DB}")

    conn = sqlite3.connect(PANORAMA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            setor_codigo, setor_nome, setor_emoji,
            subsetor_codigo, subsetor_nome,
            ordem_setor, ordem_subsetor
        FROM subsetor_hierarchy
        ORDER BY ordem_setor, ordem_subsetor
    """)

    hierarchy = [dict(row) for row in cursor.fetchall()]
    conn.close()

    logger.info(f"Loaded {len(hierarchy)} subsector entries")
    return hierarchy


def generate_sql_statements() -> str:
    """
    Generate SQL statements to import all data.
    This is used when direct PostgreSQL connection is not available.
    """
    logger.info("Generating SQL import statements...")

    sql_parts = []
    sql_parts.append("-- Auto-generated migration: Import Panorama CP2B data")
    sql_parts.append(f"-- Generated: {datetime.now().isoformat()}")
    sql_parts.append("")

    # Load data
    residuos = load_panorama_residuos()
    factors = load_conversion_factors()
    hierarchy = load_subsetor_hierarchy()
    subsector_mapping = get_subsector_mapping()

    # Generate subsectors insert
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- SUBSECTORS")
    sql_parts.append("-- ============================================================================")

    seen_subsectors = set()
    for h in hierarchy:
        if h['subsetor_codigo'] and h['subsetor_codigo'] not in seen_subsectors:
            seen_subsectors.add(h['subsetor_codigo'])
            sql_parts.append(f"""
INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    '{h['subsetor_codigo']}',
    '{h['subsetor_nome'].replace("'", "''")}',
    '{h['setor_codigo']}',
    {h['ordem_subsetor']}
) ON CONFLICT (codigo) DO NOTHING;""")

    # Generate residuos insert
    sql_parts.append("")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- RESIDUOS (Residues with chemical parameters)")
    sql_parts.append("-- ============================================================================")

    for r in residuos:
        # Get subsector from mapping
        subsector = subsector_mapping.get(r['nome'], r.get('subsetor_codigo'))

        # Escape strings
        nome = r['nome'].replace("'", "''") if r['nome'] else ''
        generation = r['generation'].replace("'", "''") if r.get('generation') else ''
        destination = r['destination'].replace("'", "''") if r.get('destination') else ''
        justification = r['justification'].replace("'", "''") if r.get('justification') else ''

        # Create unique codigo if not present
        codigo = r.get('codigo') or f"{r['setor']}_{r['nome'].upper().replace(' ', '_')[:20]}"
        codigo = codigo.replace("'", "''")

        sql_parts.append(f"""
INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    '{codigo}',
    '{nome}',
    '{r['setor']}',
    {f"'{subsector}'" if subsector else 'NULL'},
    {f"'{r['categoria_codigo']}'" if r.get('categoria_codigo') else 'NULL'},
    {f"'{r['categoria_nome']}'" if r.get('categoria_nome') else 'NULL'},
    {r.get('bmp_min') or 'NULL'},
    {r['bmp_medio']},
    {r.get('bmp_max') or 'NULL'},
    {r.get('ts_min') or 'NULL'},
    {r.get('ts_medio') or 'NULL'},
    {r.get('ts_max') or 'NULL'},
    {r.get('vs_min') or 'NULL'},
    {r.get('vs_medio') or 'NULL'},
    {r.get('vs_max') or 'NULL'},
    {r.get('fc_min') or 'NULL'},
    {r.get('fc_medio') or 'NULL'},
    {r.get('fc_max') or 'NULL'},
    {r.get('fcp_min') or 'NULL'},
    {r.get('fcp_medio') or 'NULL'},
    {r.get('fcp_max') or 'NULL'},
    {r.get('fs_min') or 'NULL'},
    {r.get('fs_medio') or 'NULL'},
    {r.get('fs_max') or 'NULL'},
    {r.get('fl_min') or 'NULL'},
    {r.get('fl_medio') or 'NULL'},
    {r.get('fl_max') or 'NULL'},
    {r.get('fator_pessimista') or 'NULL'},
    {r.get('fator_realista') or 'NULL'},
    {r.get('fator_otimista') or 'NULL'},
    {r.get('chemical_cn_ratio') or 'NULL'},
    {r.get('chemical_ch4_content') or 'NULL'},
    {f"'{generation}'" if generation else 'NULL'},
    {f"'{destination}'" if destination else 'NULL'},
    {f"'{justification}'" if justification else 'NULL'},
    {f"'{r['icon']}'" if r.get('icon') else 'NULL'}
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;
""")

    # Generate references insert
    sql_parts.append("")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- SCIENTIFIC REFERENCES (linked to residue parameters)")
    sql_parts.append("-- ============================================================================")

    for r in residuos:
        codigo = r.get('codigo') or f"{r['setor']}_{r['nome'].upper().replace(' ', '_')[:20]}"
        codigo = codigo.replace("'", "''")

        # Process each parameter type's references
        ref_fields = [
            ('bmp', r.get('bmp_referencias_literatura')),
            ('ts', r.get('ts_referencias_literatura')),
            ('vs', r.get('vs_referencias_literatura')),
            ('cn_ratio', r.get('cn_referencias_literatura')),
            ('ch4_content', r.get('ch4_referencias_literatura')),
        ]

        for param_type, ref_string in ref_fields:
            if ref_string:
                references = parse_reference_string(ref_string)
                for ref in references:
                    citation = ref['citation'].replace("'", "''")
                    authors = ref['authors'].replace("'", "''") if ref['authors'] else None
                    journal = ref['journal'].replace("'", "''") if ref['journal'] else None
                    doi = ref['doi'].replace("'", "''") if ref['doi'] else None

                    sql_parts.append(f"""
INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    '{param_type}',
    '{citation}',
    {f"'{authors}'" if authors else 'NULL'},
    {ref['year'] if ref['year'] else 'NULL'},
    {f"'{journal}'" if journal else 'NULL'},
    {f"'{doi}'" if doi else 'NULL'}
FROM residuos r WHERE r.codigo = '{codigo}';
""")

    # Generate conversion factors insert
    sql_parts.append("")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- CONVERSION FACTORS")
    sql_parts.append("-- ============================================================================")

    for f in factors:
        category = f['category'].replace("'", "''") if f['category'] else ''
        subcategory = f['subcategory'].replace("'", "''") if f['subcategory'] else ''
        lit_ref = f['literature_reference'].replace("'", "''") if f.get('literature_reference') else ''
        validation = f['real_data_validation'].replace("'", "''") if f.get('real_data_validation') else ''
        notes = f['notes'].replace("'", "''") if f.get('notes') else ''

        sql_parts.append(f"""
INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    '{category}',
    '{subcategory}',
    {f['factor_value']},
    '{f['unit']}',
    {f"'{lit_ref}'" if lit_ref else 'NULL'},
    {f"'{f['reference_url']}'" if f.get('reference_url') else 'NULL'},
    {f"'{validation}'" if validation else 'NULL'},
    {f['safety_margin_percent'] if f.get('safety_margin_percent') else 'NULL'},
    {f['final_factor'] if f.get('final_factor') else 'NULL'},
    {f"'{notes}'" if notes else 'NULL'}
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;
""")

    return "\n".join(sql_parts)


def import_to_postgresql():
    """
    Import data directly to PostgreSQL using psycopg2.
    Requires DATABASE_URL environment variable.
    """
    if not HAS_PSYCOPG2:
        logger.error("psycopg2 not available. Use generate_sql_statements() instead.")
        return False

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return False

    logger.info("Connecting to PostgreSQL...")

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Load data
        residuos = load_panorama_residuos()
        factors = load_conversion_factors()
        hierarchy = load_subsetor_hierarchy()
        subsector_mapping = get_subsector_mapping()

        # Insert subsectors
        logger.info("Inserting subsectors...")
        seen_subsectors = set()
        for h in hierarchy:
            if h['subsetor_codigo'] and h['subsetor_codigo'] not in seen_subsectors:
                seen_subsectors.add(h['subsetor_codigo'])
                cursor.execute("""
                    INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (codigo) DO NOTHING
                """, (h['subsetor_codigo'], h['subsetor_nome'],
                      h['setor_codigo'], h['ordem_subsetor']))

        # Insert residuos
        logger.info("Inserting residuos...")
        for r in residuos:
            subsector = subsector_mapping.get(r['nome'], r.get('subsetor_codigo'))
            codigo = r.get('codigo') or f"{r['setor']}_{r['nome'].upper().replace(' ', '_')[:20]}"

            cursor.execute("""
                INSERT INTO residuos (
                    codigo, nome, sector_codigo, subsector_codigo,
                    categoria_codigo, categoria_nome,
                    bmp_min, bmp_medio, bmp_max,
                    ts_min, ts_medio, ts_max,
                    vs_min, vs_medio, vs_max,
                    fc_min, fc_medio, fc_max,
                    fcp_min, fcp_medio, fcp_max,
                    fs_min, fs_medio, fs_max,
                    fl_min, fl_medio, fl_max,
                    fator_pessimista, fator_realista, fator_otimista,
                    chemical_cn_ratio, chemical_ch4_content,
                    generation, destination, justification, icon
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) ON CONFLICT (codigo) DO UPDATE SET
                    bmp_medio = EXCLUDED.bmp_medio,
                    ts_medio = EXCLUDED.ts_medio,
                    vs_medio = EXCLUDED.vs_medio,
                    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
                    chemical_ch4_content = EXCLUDED.chemical_ch4_content
                RETURNING id
            """, (
                codigo, r['nome'], r['setor'], subsector,
                r.get('categoria_codigo'), r.get('categoria_nome'),
                r.get('bmp_min'), r['bmp_medio'], r.get('bmp_max'),
                r.get('ts_min'), r.get('ts_medio'), r.get('ts_max'),
                r.get('vs_min'), r.get('vs_medio'), r.get('vs_max'),
                r.get('fc_min'), r.get('fc_medio'), r.get('fc_max'),
                r.get('fcp_min'), r.get('fcp_medio'), r.get('fcp_max'),
                r.get('fs_min'), r.get('fs_medio'), r.get('fs_max'),
                r.get('fl_min'), r.get('fl_medio'), r.get('fl_max'),
                r.get('fator_pessimista'), r.get('fator_realista'), r.get('fator_otimista'),
                r.get('chemical_cn_ratio'), r.get('chemical_ch4_content'),
                r.get('generation'), r.get('destination'), r.get('justification'), r.get('icon')
            ))

            residuo_id = cursor.fetchone()[0]

            # Insert references for this residue
            ref_fields = [
                ('bmp', r.get('bmp_referencias_literatura')),
                ('ts', r.get('ts_referencias_literatura')),
                ('vs', r.get('vs_referencias_literatura')),
                ('cn_ratio', r.get('cn_referencias_literatura')),
                ('ch4_content', r.get('ch4_referencias_literatura')),
            ]

            for param_type, ref_string in ref_fields:
                if ref_string:
                    references = parse_reference_string(ref_string)
                    for ref in references:
                        cursor.execute("""
                            INSERT INTO residuo_references (
                                residuo_id, parameter_type, citation,
                                authors, year, journal, doi
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            residuo_id, param_type, ref['citation'],
                            ref['authors'], ref['year'], ref['journal'], ref['doi']
                        ))

        # Insert conversion factors
        logger.info("Inserting conversion factors...")
        for f in factors:
            cursor.execute("""
                INSERT INTO conversion_factors (
                    category, subcategory, factor_value, unit,
                    literature_reference, reference_url,
                    real_data_validation, safety_margin_percent,
                    final_factor, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (category, subcategory) DO UPDATE SET
                    factor_value = EXCLUDED.factor_value,
                    literature_reference = EXCLUDED.literature_reference
            """, (
                f['category'], f['subcategory'], f['factor_value'], f['unit'],
                f.get('literature_reference'), f.get('reference_url'),
                f.get('real_data_validation'), f.get('safety_margin_percent'),
                f.get('final_factor'), f.get('notes')
            ))

        conn.commit()
        cursor.close()
        conn.close()

        logger.info("Migration completed successfully!")
        return True

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False


def main():
    """Main entry point for the migration script."""
    logger.info("=" * 60)
    logger.info("Panorama CP2B Data Migration")
    logger.info("=" * 60)

    # Check if source databases exist
    if not os.path.exists(PANORAMA_DB):
        logger.error(f"Source database not found: {PANORAMA_DB}")
        return

    if not os.path.exists(MAPS_DB):
        logger.error(f"Source database not found: {MAPS_DB}")
        return

    # Try direct PostgreSQL import
    if HAS_PSYCOPG2 and os.environ.get('DATABASE_URL'):
        success = import_to_postgresql()
        if success:
            return

    # Fall back to generating SQL file
    logger.info(f"Generating SQL file: {OUTPUT_SQL}")
    sql = generate_sql_statements()

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write(sql)

    logger.info(f"SQL file generated: {OUTPUT_SQL}")
    logger.info("Run this SQL in your PostgreSQL database (e.g., Supabase SQL Editor)")

    # Print summary
    residuos = load_panorama_residuos()
    factors = load_conversion_factors()

    logger.info("")
    logger.info("Migration Summary:")
    logger.info(f"  - Residuos: {len(residuos)}")
    logger.info(f"  - Conversion Factors: {len(factors)}")

    # Count references
    total_refs = 0
    for r in residuos:
        for field in ['bmp_referencias_literatura', 'ts_referencias_literatura',
                      'vs_referencias_literatura', 'cn_referencias_literatura',
                      'ch4_referencias_literatura']:
            if r.get(field):
                refs = parse_reference_string(r[field])
                total_refs += len(refs)

    logger.info(f"  - Scientific References: {total_refs}")
    logger.info("")
    logger.info("Sectors breakdown:")

    sector_counts = {}
    for r in residuos:
        sector = r['setor']
        sector_counts[sector] = sector_counts.get(sector, 0) + 1

    for sector, count in sorted(sector_counts.items()):
        logger.info(f"  - {sector}: {count} residuos")


if __name__ == "__main__":
    main()
