"""
IBGE PAM 1612 — Produção Agrícola Municipal, lavouras temporárias.

Supplies the national crop production that closes the largest remaining gap on
the map: before this source, all five crop streams were São-Paulo-only (645 of
5,571 municipalities) and agriculture is ~77% of the modelled potential, so
Mato Grosso, Paraná and Goiás rendered as no_data.

    python -m ingest.runner run pam_1612 --year 2023

Raw snapshots (SIDRA "Ano x produto" exports, several workbooks per table each
covering a year range — see _sidra.select_workbook for the overlap rule):

    data/raw/pam/TABELA_1612_2012_A_2008.xlsx
    data/raw/pam/TABELA_1612_2016_A_2013.xlsx
    data/raw/pam/TABELA_1612_2020_A_2017.xlsx
    data/raw/pam/TABELA_1612_2024_A_2021.xlsx

WHAT THIS TABLE FEEDS, AND THE UNIT SUBTLETY THAT GOES WITH IT

`sugarcane_biomass_tons_year` stores RAW GREEN CANE, not a residue: the four
industrial sub-streams (bagaço .280 / torta .030 / palha .053 / vinhaça .420 per
tonne of cane) are applied downstream in compute_sp_canonical_totals.py, where
they are cited. PAM production therefore lands in that column unconverted, which
is exactly what the column already held for São Paulo.

`soybean_` and `corn_` columns are the opposite: they hold RESIDUE tonnes. São
Paulo's values came from MapBiomas area × SP-tuned yields, so promoting PAM
production into them requires an RPR (residue-to-product ratio). See
promote_pam.py — the conversion is applied there, not here; `load()` stays a
faithful reading of the source.

TRAP: `Cana para forragem` is a distinct fodder crop, never milled, with no
bagasse/vinhaça chain. It is NOT mapped to `sugarcane`. See _common.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ingest.contract import IngestContext
from ingest.gates import GateResult
from ingest.sources.pam import _common, _sidra

TABLE = 1612

# PAM product name (row 5, verbatim) -> frame column.
PRODUCTS: dict[str, str] = {
    "Cana-de-açúcar": "sugarcane_production_t",
    "Soja (em grão)": "soybean_production_t",
    "Milho (em grão)": "corn_production_t",
}

# Frame column -> biomass stream key used by municipality_biomass_provenance.
STREAMS: dict[str, str] = {
    "sugarcane_production_t": "sugarcane",
    "soybean_production_t": "soybean",
    "corn_production_t": "corn",
}

# Municipalities IBGE legitimately does not survey for temporary crops — 8 of
# 5,571, documented rather than silently tolerated. Fully urbanised metro cores
# (Diadema, São Caetano, Nilópolis, São João de Meriti), a coastal/protected
# island (Ilha Comprida), a Marajó floodplain municipality (Santa Cruz do Arari),
# a lagoon-and-dunes municipality (Arraial do Cabo), and one municipality created
# too recently to have a PAM series (Boa Esperança do Norte, MT — installed 2025).
# Absence here is a fact about Brazilian land use, not a gap in the snapshot.
MISSING_ALLOWLIST: tuple[str, ...] = (
    "1506401",  # Santa Cruz do Arari (PA)
    "3300258",  # Arraial do Cabo (RJ)
    "3303203",  # Nilópolis (RJ)
    "3305109",  # São João de Meriti (RJ)
    "3513801",  # Diadema (SP)
    "3520426",  # Ilha Comprida (SP)
    "3548807",  # São Caetano do Sul (SP)
    "5101837",  # Boa Esperança do Norte (MT)
)

SPEC = _common.build_spec(
    source_id="pam_1612",
    name="IBGE PAM 1612 — lavouras temporárias",
    columns=tuple(STREAMS),
    missing_allowlist=MISSING_ALLOWLIST,
)

# IBGE's own published national production, from the PAM release — the
# independent leg of the aggregation gate. Our municipal rows must reproduce
# these; that is what validates the parser (the year forward-fill, the '-' vs
# '..'/'X' value codes, the product mapping).
#
# Recorded at PUBLISHED precision (4 significant digits, as IBGE reports them),
# never at our computed precision — see _common.published_totals_gate for why
# that distinction is what keeps the gate honest. Each entry is
# (tonnes, tolerance_pct); the tolerance absorbs IBGE's own rounding.
#
# Years absent here make the gate report "cannot test", not "wrong" (same
# convention as promote_ibge_ppm.py). Add further years from
# https://sidra.ibge.gov.br/tabela/1612.
PUBLISHED_NATIONAL: dict[int, dict[str, tuple[float, float]]] = {
    2023: {
        "sugarcane_production_t": (782_000_000.0, 0.5),
        "soybean_production_t": (152_100_000.0, 0.5),
        "corn_production_t": (131_900_000.0, 0.5),
    },
}


def fetch(year: int, raw_dir: Path) -> Path:
    """Locate the immutable snapshot. Never downloads — taking a snapshot is a
    dated, recorded act (see data/raw/README.md)."""
    base = Path(raw_dir) / _common.RAW_SUBDIR
    _sidra.select_workbook(base, TABLE, year)  # raises with a helpful message
    return base


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    """One WIDE row per municipality for `year`; columns = the three crops."""
    base = fetch(year, raw_dir)
    workbook = _sidra.select_workbook(base, TABLE, year)
    reading = _sidra.read_year(workbook, year)
    if not reading:
        raise ValueError(f"table {TABLE} has no data for {year} in {workbook.name}")
    return _common.frame_from_reading(reading, PRODUCTS)


def validate(
    df: pd.DataFrame,
    ctx: IngestContext | None = None,
    raw_dir: Path | None = None,
) -> tuple[list[GateResult], IngestContext]:
    """Standard battery plus the published-production check."""
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=0)

    # Feed the standard aggregation gate IBGE's published headline for the
    # largest crop, so it tests something real instead of failing for want of
    # input. Callers may override by setting published_totals themselves.
    if not ctx.published_totals and ctx.year in PUBLISHED_NATIONAL:
        ctx.published_totals = {"BR": PUBLISHED_NATIONAL[ctx.year]["sugarcane_production_t"][0]}
        ctx.totals_column = "sugarcane_production_t"

    results = _common.standard_battery(df, ctx)
    results.append(_common.published_totals_gate(df, ctx.year, PUBLISHED_NATIONAL))
    return results, ctx


def promote(df: pd.DataFrame, conn) -> None:
    raise NotImplementedError(
        "Promotion runs via backend/scripts/promote_pam.py against the real DB — "
        "database writes stay a reviewed, manual step (ingest/README.md)."
    )
