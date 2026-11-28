"""
MapBiomas Collection 11 — land cover per municipality, every year 1985–2025.

Replaces scripts/load_municipality_land_cover.py (three years, SP/MG only, no
gates) for the municipality profile's land chart. Same source file, the same
eight groups plus `soy`, taken out of `crops` so the profile can say when soy
passed pasture; `crops` is now "other crops" (no soy, no sugar cane).

Raw data: MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx, sheet
COVERAGE_11 (hectares), at data/raw/mapbiomas_cobertura/2025/. fetch() never
downloads: copy the workbook there (A:\\essencial-geo\\dados-brutos\\mapbiomas\\
estatisticas_municipios on the team PC). A municipality spanning two biomes
has one row per biome and class; they are summed.

FRAME: long, one row per (ibge_code, year, group_key). The coverage gate runs
on the distinct municipalities, scoped to the UFs loaded.

GATES:
  * schema, range, coverage (every municipality of the loaded UFs present)
  * group_sum: the nine groups add up to every source row of the municipality
    and year (±0.01%) — no class dropped or counted twice
  * aggregation: 2025 total per UF against the IBGE state area (±1%;
    MapBiomas uses its own limits and counts water)
"""

from __future__ import annotations

import dataclasses
from pathlib import Path

import openpyxl
import pandas as pd
from psycopg2.extras import execute_values

from ingest import ibge
from ingest.contract import IngestContext, SourceSpec
from ingest.gates import (
    GateResult,
    aggregation_gate,
    coverage_gate,
    cross_source_gate,
    lineage_gate,
    range_gate,
    schema_gate,
)

RAW_FILENAME = "MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx"
SHEET = "COVERAGE_11"
REFERENCE_YEAR = 2025
YEARS = range(1985, 2026)
DEFAULT_UFS: tuple[str, ...] = ("35", "31")  # São Paulo, Minas Gerais
GROUPS: tuple[str, ...] = (
    "forest", "pasture", "cane", "soy", "crops", "silviculture", "mosaic", "urban", "other",
)  # fmt: skip

# IBGE territorial area (km², Áreas Territoriais 2022) x 100 = hectares.
STATE_AREA_HA = {"SP": 24_821_948.5, "MG": 58_651_398.3}

SPEC = SourceSpec(
    source_id="mapbiomas_cobertura",
    name="MapBiomas Coleção 11 — cobertura e uso da terra por município, 1985–2025",
    key_column="ibge_code",
    required_columns={"ibge_code": "str", "year": "int", "group_key": "str", "area_ha": "float"},
    # Altamira/PA, the largest municipality, has 15.9 million ha.
    value_bounds={"area_ha": (0, 16_000_000), "year": (1985, 2025)},
    scope_ufs=("SP", "MG"),
    aggregation_tolerance_pct=1.0,
)

INSERT_SQL = (
    "INSERT INTO municipality_land_cover (ibge_code, year, group_key, area_ha, ingest_run_id) "
    "VALUES %s"
)
DELETE_SQL = "DELETE FROM municipality_land_cover WHERE LEFT(ibge_code, 2) = ANY(%s)"


def group_of(level_1: str | None, level_2: str | None, level_4: str | None) -> str:
    """The group a MapBiomas class row belongs to (soy and cane at level 4)."""
    l1, l2, l4 = level_1 or "", level_2 or "", level_4 or ""
    if l1.startswith("1.") or l1.startswith("2."):
        return "forest"
    if "Pasture" in l2:
        return "pasture"
    if "soybean" in l4.lower():
        return "soy"
    if "sugar cane" in l4.lower():
        return "cane"
    if "Agriculture" in l2:
        return "crops"
    if "Forest Plantation" in l2:
        return "silviculture"
    if "Mosaic" in l2:
        return "mosaic"
    if "Urban" in l2:
        return "urban"
    return "other"


def fetch(year: int, raw_dir: Path) -> Path:
    snapshot = Path(raw_dir) / SPEC.source_id / str(year) / RAW_FILENAME
    if not snapshot.exists():
        raise FileNotFoundError(
            f"MapBiomas workbook missing: {snapshot}\n"
            "Copy MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx (MapBiomas "
            "Collection 11 municipal statistics) to the path above."
        )
    return snapshot


def _read(xlsx: Path, ufs: tuple[str, ...]) -> tuple[pd.DataFrame, dict[tuple[str, int], float]]:
    """(frame, source total per (ibge_code, year)) for the given UF codes."""
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    try:
        rows = wb[SHEET].iter_rows(values_only=True)
        head = list(next(rows))
        col = {
            k: head.index(k) for k in ("geocode", "class_level_1", "class_level_2", "class_level_4")
        }
        year_col = {y: head.index(f"y{y}") for y in YEARS}
        sums: dict[tuple[str, int, str], float] = {}
        totals: dict[tuple[str, int], float] = {}
        codes: set[str] = set()
        for r in rows:
            code = str(r[col["geocode"]] or "").strip()
            if not code.startswith(ufs):
                continue
            codes.add(code)
            g = group_of(r[col["class_level_1"]], r[col["class_level_2"]], r[col["class_level_4"]])
            for y, i in year_col.items():
                v = float(r[i] or 0)
                sums[(code, y, g)] = sums.get((code, y, g), 0.0) + v
                totals[(code, y)] = totals.get((code, y), 0.0) + v
    finally:
        wb.close()
    records = [
        (code, y, g, round(sums.get((code, y, g), 0.0), 2))
        for code in sorted(codes)
        for y in YEARS
        for g in GROUPS
    ]
    df = pd.DataFrame(records, columns=["ibge_code", "year", "group_key", "area_ha"])
    df["year"] = df["year"].astype("int64")
    return df, totals


def load_from(xlsx: Path, ufs: tuple[str, ...] = DEFAULT_UFS) -> pd.DataFrame:
    """Pure read of the workbook for the given UF codes ('35', '31', …)."""
    df, totals = _read(Path(xlsx), tuple(ufs))
    df.attrs["source_totals"] = totals
    df.attrs["ufs"] = tuple(ufs)
    return df


def load(year: int, raw_dir: Path, ufs: tuple[str, ...] = DEFAULT_UFS) -> pd.DataFrame:
    return load_from(fetch(year, raw_dir), ufs)


def _group_sum(df: pd.DataFrame) -> tuple[bool, str]:
    totals = df.attrs.get("source_totals")
    if not totals:
        return False, "frame carries no source totals (load it with load_from)"
    got = df.groupby(["ibge_code", "year"])["area_ha"].sum()
    off = []
    for (code, year), expected in totals.items():
        value = float(got.get((code, year), 0.0))
        if abs(value - expected) > max(1e-4 * expected, 0.05 * len(GROUPS)):
            off.append(f"{code}/{year}: {value:,.1f} vs {expected:,.1f}")
    if off:
        return False, f"{len(off)} municipality-years off (e.g. {'; '.join(off[:3])})"
    return True, f"9 groups add up to the source for {len(totals)} municipality-years"


def validate(
    df: pd.DataFrame, ctx: IngestContext | None = None
) -> tuple[list[GateResult], IngestContext]:
    ufs = df.attrs.get("ufs", DEFAULT_UFS)
    siglas = tuple(ibge.UF_BY_CODE_PREFIX[u] for u in ufs)
    spec = dataclasses.replace(SPEC, scope_ufs=siglas)
    if ctx is None:
        ctx = IngestContext(spec=spec, year=REFERENCE_YEAR)
    ctx.spec = spec
    if not ctx.published_totals:
        ctx.published_totals = {uf: STATE_AREA_HA[uf] for uf in siglas if uf in STATE_AREA_HA}
        ctx.totals_column = "area_ha"
    one_per_municipality = df.drop_duplicates("ibge_code")[["ibge_code"]]
    # The frame is long: its key is (ibge_code, year, group_key). The schema gate
    # checks one key column, so it runs on that composite key, and the IBGE code
    # check runs on the distinct municipalities.
    row_key = df["ibge_code"].astype(str) + "|" + df["year"].astype(str) + "|" + df["group_key"]
    long_spec = dataclasses.replace(spec, key_column="row_key")
    code_spec = dataclasses.replace(spec, required_columns={"ibge_code": "str"})
    results = [
        schema_gate(df.assign(row_key=row_key), long_spec),
        schema_gate(one_per_municipality, code_spec),
        coverage_gate(one_per_municipality, spec),
        range_gate(df, spec),
        aggregation_gate(df[df["year"] == REFERENCE_YEAR], ctx),
        cross_source_gate("group_sum", lambda: _group_sum(df)),
    ]
    if ctx.metadata_path:
        results.append(lineage_gate(ctx.metadata_path, SPEC.source_id))
    return results, ctx


def promote(df: pd.DataFrame, conn, run_id: int, ufs: tuple[str, ...] = DEFAULT_UFS) -> int:
    """Replace the loaded UFs whole, so a municipality the file no longer lists
    does not linger with old numbers; other UFs are untouched."""
    rows = [
        (r.ibge_code, int(r.year), r.group_key, float(r.area_ha), run_id)
        for r in df.itertuples(index=False)
    ]
    with conn.cursor() as cur:
        cur.execute(DELETE_SQL, (list(ufs),))
        _execute_values(cur, INSERT_SQL, rows)
    return len(rows)


def _execute_values(cur, sql: str, rows: list[tuple]) -> None:
    execute_values(cur, sql, rows, page_size=2000)
