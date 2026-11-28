"""
IBGE — resident population at every census, 1970–2022 (SIDRA 200 + 4714).

Feeds the population line of the municipality profile. Table 200 (Censos
1970–2010, variable 93, totals of sex, situation and age group) and table 4714
(Censo 2022, variable 93). Snapshots per UF at
data/raw/ibge_censo_historico/t200/2022/<uf>.json and .../t4714/2022/<uf>.json.

A municipality only has the censuses after it was created: SIDRA marks the
earlier ones "..." and those stay ABSENT (NaN in the frame, no row in the
table), never 0. The profile draws the line from the first year it has.

GATES: standard battery, aggregation of pop_2022 against the Censo 2022
totals; when the frame is national, Brasil 2010 must be 190,755,799 (±0.01%).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, cross_source_gate, run_standard_battery
from ingest.ledger import upsert_timeseries
from ingest.sidra_api import ALL_UFS, fetch_by_uf, read_rows, snapshot_files
from ingest.sources.ibge_censo_idade.source import PUBLISHED_TOTALS

YEAR = 2022
CENSUS_YEARS: tuple[int, ...] = (1970, 1980, 1991, 2000, 2010, 2022)
BR_2010 = 190_755_799
URLS = {
    "t200": "https://apisidra.ibge.gov.br/values/t/200/n6/in%20n3%20{uf}/v/93"
    "/p/1970,1980,1991,2000,2010/c2/0/c1/0/c58/0",
    "t4714": "https://apisidra.ibge.gov.br/values/t/4714/n6/in%20n3%20{uf}/v/93/p/2022",
}
COLUMNS = tuple(f"pop_{y}" for y in CENSUS_YEARS)

SPEC = SourceSpec(
    source_id="ibge_censo_historico",
    name="IBGE — população residente nos Censos 1970–2022 (SIDRA 200 e 4714)",
    key_column="ibge_code",
    required_columns={"ibge_code": "str", **{c: "float" for c in COLUMNS}},
    value_bounds={c: (1, 12_500_000) for c in COLUMNS},
    missing_allowlist=("5101837",),
    aggregation_tolerance_pct=0.0,
)


def fetch(year: int, raw_dir: Path, ufs: tuple[str, ...] = ALL_UFS) -> list[Path]:
    return [
        p
        for table, url in URLS.items()
        for p in fetch_by_uf(url, raw_dir, f"{SPEC.source_id}/{table}", year, ufs)
    ]


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    values: dict[str, dict[str, float]] = {}
    for table in URLS:
        for f in snapshot_files(raw_dir, f"{SPEC.source_id}/{table}", year):
            for r in read_rows(f):
                code = str(r["D1C"])
                values.setdefault(code, {})
                if r["V"] is None or r["V"] <= 0:
                    continue
                values[code][f"pop_{int(r['D3C'])}"] = r["V"]
    rows = [
        {"ibge_code": c, **{k: v.get(k, np.nan) for k in COLUMNS}}
        for c, v in sorted(values.items())
    ]
    df = pd.DataFrame(rows, columns=["ibge_code", *COLUMNS])
    # Only municipalities that exist today: a code with no 2022 count (merged or
    # renumbered since) has no page and no polygon on the map.
    return df[df["pop_2022"].notna()].reset_index(drop=True)


def _br_2010(df: pd.DataFrame) -> tuple[bool, str]:
    ufs = set(df["ibge_code"].str[:2])
    if len(ufs) < len(ALL_UFS):
        return (
            True,
            f"frame covers {len(ufs)} of {len(ALL_UFS)} UFs; national 2010 check not applicable",
        )
    got = float(df["pop_2010"].sum())
    ok = abs(got - BR_2010) / BR_2010 <= 0.0001
    return ok, f"Brasil 2010: {got:,.0f} vs published {BR_2010:,}"


def validate(
    df: pd.DataFrame, ctx: IngestContext | None = None
) -> tuple[list[GateResult], IngestContext]:
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=YEAR)
    if not ctx.published_totals:
        ctx.published_totals = dict(PUBLISHED_TOTALS)
        ctx.totals_column = "pop_2022"
    results = run_standard_battery(df, ctx)
    results.append(cross_source_gate("brasil_2010", lambda: _br_2010(df)))
    return results, ctx


def to_rows(df: pd.DataFrame) -> list[dict]:
    rows = []
    for rec in df.to_dict("records"):
        for y in CENSUS_YEARS:
            v = rec[f"pop_{y}"]
            if pd.isna(v):
                continue
            rows.append(
                {
                    "ibge_code": rec["ibge_code"],
                    "year": y,
                    "source_id": SPEC.source_id,
                    "variable": "populacao_residente",
                    "value": float(v),
                    "unit": "pessoas",
                }
            )
    return rows


def promote(df: pd.DataFrame, conn, run_id: int) -> int:
    return upsert_timeseries(conn, to_rows(df), run_id)
