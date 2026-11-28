"""
IBGE Censo 2022 — resident population by five-year age group and sex (SIDRA 9514).

Feeds the age pyramid of the municipality profile. One snapshot per UF from the
SIDRA API (see ingest/sidra_api.py) at data/raw/ibge_censo_idade/2022/<uf>.json;
fetch() downloads the missing UFs, nationally by default.

QUERY: table 9514, variable 93 (população residente), period 2022, sex 4/5
(homens/mulheres), "forma de declaração da idade" total (113635), and the
classification 287 (idade) at its own five-year groups: 93070 (0 a 4) and
93084–93098 (5 a 9 … 75 a 79). IBGE goes on in five-year groups past 80
(49108, 49109, 60040, 60041) and ends with 6653 (100 anos ou mais); the
profile shows one 80+ bar, so those five are summed here.

FRAME: one row per municipality — `population` plus 34 columns
pop_<group>_<sex> (e.g. pop_0_4_h, pop_80mais_m). Wide because the coverage
gate counts rows per UF; promote() melts it into municipality_timeseries.

GATES: the standard battery; aggregation against IBGE's published Censo 2022
totals (Brasil 203,080,756; SP 44,411,238; MG 20,539,989), which the SP
snapshot reproduces exactly. Boa Esperança do Norte/MT (5101837) was created
after the census and is allow-listed.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, run_standard_battery
from ingest.ledger import upsert_timeseries
from ingest.sidra_api import ALL_UFS, fetch_by_uf, read_rows, snapshot_files

YEAR = 2022

# classification 287 code -> profile age group
GROUP_BY_CODE: dict[str, str] = {
    "93070": "0-4", "93084": "5-9", "93085": "10-14", "93086": "15-19",
    "93087": "20-24", "93088": "25-29", "93089": "30-34", "93090": "35-39",
    "93091": "40-44", "93092": "45-49", "93093": "50-54", "93094": "55-59",
    "93095": "60-64", "93096": "65-69", "93097": "70-74", "93098": "75-79",
    "49108": "80+", "49109": "80+", "60040": "80+", "60041": "80+", "6653": "80+",
}  # fmt: skip
AGE_GROUPS: tuple[str, ...] = tuple(dict.fromkeys(GROUP_BY_CODE.values()))
SEX_BY_CODE = {"4": "h", "5": "m"}

URL = (
    "https://apisidra.ibge.gov.br/values/t/9514/n6/in%20n3%20{uf}/v/93/p/2022"
    "/c2/4,5/c287/" + ",".join(GROUP_BY_CODE) + "/c286/113635"
)

PUBLISHED_TOTALS = {"BR": 203_080_756, "SP": 44_411_238, "MG": 20_539_989}


def variable_name(group: str, sex: str) -> str:
    return "pop_" + group.replace("-", "_").replace("+", "mais") + "_" + sex


VARIABLES: tuple[str, ...] = tuple(variable_name(g, s) for g in AGE_GROUPS for s in ("h", "m"))

SPEC = SourceSpec(
    source_id="ibge_censo_idade",
    name="IBGE Censo 2022 — população residente por grupo de idade e sexo (SIDRA 9514)",
    key_column="ibge_code",
    required_columns={"ibge_code": "str", "population": "float", **{v: "float" for v in VARIABLES}},
    # São Paulo city, 11.45 million, is the largest municipality.
    value_bounds={"population": (1, 12_500_000)},
    missing_allowlist=("5101837",),
    aggregation_tolerance_pct=0.0,
)


def fetch(year: int, raw_dir: Path, ufs: tuple[str, ...] = ALL_UFS) -> list[Path]:
    return fetch_by_uf(URL, raw_dir, SPEC.source_id, year, ufs)


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    """Every UF snapshot present for `year` -> one row per municipality."""
    files = snapshot_files(raw_dir, SPEC.source_id, year)
    sums: dict[str, dict[str, float]] = {}
    seen: dict[str, set[str]] = {}
    for f in files:
        for r in read_rows(f):
            code, sex, group = (
                str(r["D1C"]),
                SEX_BY_CODE.get(str(r["D4C"])),
                GROUP_BY_CODE.get(str(r["D5C"])),
            )
            if sex is None or group is None:
                continue
            var = variable_name(group, sex)
            seen.setdefault(code, set())
            if r["V"] is None:
                continue
            seen[code].add(var)
            sums.setdefault(code, {}).setdefault(var, 0.0)
            sums[code][var] += r["V"]
    rows = []
    for code in sorted(seen):
        row = {"ibge_code": code, **{v: sums.get(code, {}).get(v, np.nan) for v in VARIABLES}}
        values = [row[v] for v in VARIABLES if not np.isnan(row[v])]
        row["population"] = float(sum(values)) if values else np.nan
        rows.append(row)
    return pd.DataFrame(rows, columns=["ibge_code", "population", *VARIABLES])


def validate(
    df: pd.DataFrame, ctx: IngestContext | None = None
) -> tuple[list[GateResult], IngestContext]:
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=YEAR)
    if not ctx.published_totals:
        ctx.published_totals = dict(PUBLISHED_TOTALS)
        ctx.totals_column = "population"
    return run_standard_battery(df, ctx), ctx


def to_rows(df: pd.DataFrame, year: int = YEAR) -> list[dict]:
    rows = []
    for rec in df.to_dict("records"):
        for var in VARIABLES:
            value = rec.get(var)
            if value is None or pd.isna(value):
                continue
            rows.append(
                {"ibge_code": rec["ibge_code"], "year": year, "source_id": SPEC.source_id,
                 "variable": var, "value": float(value), "unit": "pessoas"}
            )  # fmt: skip
    return rows


def promote(df: pd.DataFrame, conn, run_id: int) -> int:
    return upsert_timeseries(conn, to_rows(df), run_id)
