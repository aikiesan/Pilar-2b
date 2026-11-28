"""
The promote ledger and the long-table upsert shared by the profile sources.

Every promotion records one row in staging.ingest_runs (migration 021): which
source, which reference year, the checksum of the frame that went in, whether
the gates passed and where the report is. UNIQUE (source_id, reference_year,
frame_checksum) makes a re-run of the same snapshot touch the same row (its
promoted_at moves) instead of adding a second one. The sitemap reads the
latest promoted_at per source as the profile pages' real lastModified.
"""

from __future__ import annotations

import pandas as pd
from psycopg2.extras import execute_batch

from ingest.gates import frame_checksum

_execute_batch = execute_batch  # swapped by the tests' fake connection

RECORD_SQL = """
INSERT INTO staging.ingest_runs
    (source_id, reference_year, frame_checksum, gates_passed, report_path, row_count, promoted_at)
VALUES (%s, %s, %s, %s, %s, %s, now())
ON CONFLICT (source_id, reference_year, frame_checksum) DO UPDATE
    SET promoted_at = now(),
        gates_passed = EXCLUDED.gates_passed,
        report_path = EXCLUDED.report_path
RETURNING id
"""

UPSERT_TIMESERIES_SQL = """
INSERT INTO municipality_timeseries
    (ibge_code, year, source_id, variable, value, unit, quality, ingest_run_id)
VALUES (%(ibge_code)s, %(year)s, %(source_id)s, %(variable)s, %(value)s, %(unit)s,
        %(quality)s, %(ingest_run_id)s)
ON CONFLICT (ibge_code, year, source_id, variable) DO UPDATE
    SET value = EXCLUDED.value,
        unit = EXCLUDED.unit,
        quality = EXCLUDED.quality,
        ingest_run_id = EXCLUDED.ingest_run_id
"""


def record_run(
    conn,
    source_id: str,
    reference_year: int,
    df: pd.DataFrame,
    gates_passed: bool,
    report_path: str,
) -> int:
    """Insert (or touch) this promotion's ledger row; returns its id."""
    with conn.cursor() as cur:
        cur.execute(
            RECORD_SQL,
            (
                source_id,
                reference_year,
                frame_checksum(df),
                gates_passed,
                str(report_path),
                len(df),
            ),
        )
        return int(cur.fetchone()[0])


def upsert_timeseries(conn, rows: list[dict], ingest_run_id: int) -> int:
    """Upsert long rows (ibge_code, year, source_id, variable, value, unit)."""
    if not rows:
        return 0
    bound = [{**r, "quality": "measured", "ingest_run_id": ingest_run_id} for r in rows]
    with conn.cursor() as cur:
        _execute_batch(cur, UPSERT_TIMESERIES_SQL, bound, page_size=1000)
    return len(bound)
