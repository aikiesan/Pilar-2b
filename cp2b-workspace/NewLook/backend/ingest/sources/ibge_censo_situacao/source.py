"""
IBGE Censo 2022 — resident population by household situation, urban/rural (SIDRA 9923).

Fills municipalities.urban_population / rural_population, which
scripts/promote_ibge_demographics.py deliberately left NULL: the Censo
"básico" file has no urban/rural split, and SNIS service-area population is a
different concept. This table is the census's own split.

QUERY: table 9923, variable 93, period 2022, classification 1 (situação do
domicílio): 6795 total, 1 urbana, 2 rural. One snapshot per UF at
data/raw/ibge_censo_situacao/2022/<uf>.json.

GATES: standard battery (aggregation of `total` against the Censo totals) plus
urban + rural == total for every municipality, exactly.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from psycopg2.extras import execute_values

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, cross_source_gate, run_standard_battery
from ingest.sidra_api import ALL_UFS, fetch_by_uf, read_rows, snapshot_files
from ingest.sources.ibge_censo_idade.source import PUBLISHED_TOTALS

YEAR = 2022
COLUMN_BY_CODE = {"6795": "total", "1": "urban", "2": "rural"}
URL = "https://apisidra.ibge.gov.br/values/t/9923/n6/in%20n3%20{uf}/v/93/p/2022/c1/" + ",".join(
    COLUMN_BY_CODE
)

SPEC = SourceSpec(
    source_id="ibge_censo_situacao",
    name="IBGE Censo 2022 — população residente por situação do domicílio (SIDRA 9923)",
    key_column="ibge_code",
    required_columns={"ibge_code": "str", "total": "float", "urban": "float", "rural": "float"},
    value_bounds={"total": (1, 12_500_000), "urban": (0, 12_500_000), "rural": (0, 12_500_000)},
    missing_allowlist=("5101837",),
    aggregation_tolerance_pct=0.0,
)

UPDATE_SQL = """
UPDATE municipalities AS m
   SET urban_population = v.urban,
       rural_population = v.rural
  FROM (VALUES %s) AS v (ibge_code, urban, rural)
 WHERE m.ibge_code = v.ibge_code
"""


def fetch(year: int, raw_dir: Path, ufs: tuple[str, ...] = ALL_UFS) -> list[Path]:
    return fetch_by_uf(URL, raw_dir, SPEC.source_id, year, ufs)


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    values: dict[str, dict[str, float]] = {}
    for f in snapshot_files(raw_dir, SPEC.source_id, year):
        for r in read_rows(f):
            col = COLUMN_BY_CODE.get(str(r["D4C"]))
            if col is None:
                continue
            values.setdefault(str(r["D1C"]), {})[col] = np.nan if r["V"] is None else r["V"]
    rows = [
        {"ibge_code": c, **{k: v.get(k, np.nan) for k in ("total", "urban", "rural")}}
        for c, v in sorted(values.items())
    ]
    return pd.DataFrame(rows, columns=["ibge_code", "total", "urban", "rural"])


def _urban_plus_rural(df: pd.DataFrame) -> tuple[bool, str]:
    off = df[(df["urban"] + df["rural"]) != df["total"]]
    if len(off):
        sample = ", ".join(off["ibge_code"].head(5))
        return False, f"{len(off)} municipalities where urban + rural != total (e.g. {sample})"
    return True, f"urban + rural == total for all {len(df)} municipalities"


def validate(
    df: pd.DataFrame, ctx: IngestContext | None = None
) -> tuple[list[GateResult], IngestContext]:
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=YEAR)
    if not ctx.published_totals:
        ctx.published_totals = dict(PUBLISHED_TOTALS)
        ctx.totals_column = "total"
    results = run_standard_battery(df, ctx)
    results.append(cross_source_gate("urban_plus_rural", lambda: _urban_plus_rural(df)))
    return results, ctx


def promote(df: pd.DataFrame, conn, run_id: int) -> int:
    """Writes the split columns only; population stays with promote_ibge_demographics.

    Every municipality of the frame must exist in `municipalities`: an UPDATE that
    matches fewer rows raises, and the caller's transaction rolls back.
    """
    rows = [
        (r["ibge_code"], float(r["urban"]), float(r["rural"]))
        for r in df.to_dict("records")
        if not (pd.isna(r["urban"]) or pd.isna(r["rural"]))
    ]
    if not rows:
        return 0
    with conn.cursor() as cur:
        _execute_values(cur, UPDATE_SQL, rows, page_size=len(rows))
        updated = cur.rowcount
    if updated != len(rows):
        raise ValueError(
            f"urban/rural: {updated} of {len(rows)} municipalities found in municipalities; "
            "load the national municipality list first (scripts/seed_national_municipalities.py)"
        )
    return updated


def _execute_values(cur, sql: str, rows: list[tuple], page_size: int) -> None:
    execute_values(cur, sql, rows, page_size=page_size)
