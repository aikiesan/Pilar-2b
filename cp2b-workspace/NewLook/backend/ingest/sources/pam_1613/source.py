"""
IBGE PAM 1613 — Produção Agrícola Municipal, lavouras permanentes.

    python -m ingest.runner run pam_1613 --year 2023

Raw snapshots (note the overlapping ranges — 2020 is carried by two workbooks;
_sidra.select_workbook takes the newer vintage because IBGE revises):

    data/raw/pam/TABELA_1613_2008_A_2011.xlsx
    data/raw/pam/TABELA_1613_2012_A_2015.xlsx
    data/raw/pam/TABELA_1613_2016_A_2020.xlsx
    data/raw/pam/TABELA_1613_2020_A_2023.xlsx
    data/raw/pam/TABELA_1613_2024.xlsx

WHAT THIS TABLE FEEDS

`citrus_biomass_tons_year` stores WHOLE FRUIT, not peel: the 0.50 wet-peel
fraction (FUNDECITRUS 2022) is applied downstream in
compute_sp_canonical_totals.py, where FCo in the BAGACO_CITROS FDE also accounts
for competing uses (feed pellets, pectin) so it is not double-applied. PAM
production therefore lands unconverted, matching what the column already held
for São Paulo.

`coffee_biomass_tons_year` holds RESIDUE (husk) tonnes, so it needs an RPR at
promote time — see promote_pam.py.

THE COFFEE SUBSET TRAP
    `Café (em grão) Arábica` + `Café (em grão) Canephora` ⊆ `Café (em grão) Total`
Summing all three roughly doubles coffee. Only `Total` is ingested; the two
varietals are read solely to feed coffee_subset_gate, which asserts the
containment so a future column reorder fails loudly instead of silently
inflating the national figure.

CONFIDENTIAL VALUES CONCENTRATE HERE. IBGE withholds ('X') roughly 500 café and
500 laranja municipality-years per year to protect individual informants —
by far the heaviest use of the code in PAM. Those municipalities DO produce; the
figure is simply suppressed. They are therefore loaded as NULL and reach the map
as no_data, never as 0 (which would assert they grow no coffee).
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ingest.contract import IngestContext
from ingest.gates import GateResult
from ingest.sources.pam import _common, _sidra

TABLE = 1613

PRODUCTS: dict[str, str] = {
    "Café (em grão) Total": "coffee_production_t",
    "Laranja": "citrus_production_t",
}

# Read for the containment gate only — never summed into the coffee total.
VARIETAL_PRODUCTS: dict[str, str] = {
    "Café (em grão) Arábica": "_coffee_arabica_t",
    "Café (em grão) Canephora": "_coffee_canephora_t",
}

STREAMS: dict[str, str] = {
    "coffee_production_t": "coffee",
    "citrus_production_t": "citrus",
}

# 30 of 5,571 municipalities carry no permanent-crop survey at all — a wider set
# than 1612's 8, which is expected: permanent crops (tree/perennial) are absent
# from far more of Brazil than temporary ones. The list is semi-arid sertão
# (Piauí, Sergipe, Alagoas, RN), fully urbanised metro São Paulo (Osasco, Santo
# André, Carapicuíba, Diadema, São Caetano, Rio Grande da Serra), coastal resort
# and dune municipalities (Imbé, Xangri-lá, Chuí, Arraial do Cabo, Ilha Comprida),
# the Fernando de Noronha archipelago, a Marajó floodplain municipality, and
# grain-belt municipalities that grow only temporary crops (Campos de Júlio MT,
# Castelândia/Porteirão/Turvelândia GO). Absence is a land-use fact, not a gap.
MISSING_ALLOWLIST: tuple[str, ...] = (
    "1506401",  # Santa Cruz do Arari (PA)
    "2200053",  # Acauã (PI)
    "2203453",  # Dom Inocêncio (PI)
    "2403756",  # Fernando Pedroza (RN)
    "2605459",  # Fernando de Noronha (PE)
    "2700706",  # Batalha (AL)
    "2802601",  # Graccho Cardoso (SE)
    "2804201",  # Monte Alegre de Sergipe (SE)
    "2804508",  # Nossa Senhora da Glória (SE)
    "2807006",  # São Miguel do Aleixo (SE)
    "3157336",  # Santa Cruz de Minas (MG)
    "3300258",  # Arraial do Cabo (RJ)
    "3303203",  # Nilópolis (RJ)
    "3305109",  # São João de Meriti (RJ)
    "3510609",  # Carapicuíba (SP)
    "3513801",  # Diadema (SP)
    "3520426",  # Ilha Comprida (SP)
    "3534401",  # Osasco (SP)
    "3544103",  # Rio Grande da Serra (SP)
    "3547809",  # Santo André (SP)
    "3548807",  # São Caetano do Sul (SP)
    "4216057",  # São Cristóvão do Sul (SC)
    "4305439",  # Chuí (RS)
    "4310330",  # Imbé (RS)
    "4323804",  # Xangri-lá (RS)
    "5101837",  # Boa Esperança do Norte (MT)
    "5102686",  # Campos de Júlio (MT)
    "5205059",  # Castelândia (GO)
    "5218052",  # Porteirão (GO)
    "5221551",  # Turvelândia (GO)
)

SPEC = _common.build_spec(
    source_id="pam_1613",
    name="IBGE PAM 1613 — lavouras permanentes",
    columns=tuple(STREAMS),
    missing_allowlist=MISSING_ALLOWLIST,
)

# Recorded at published precision; see pam_1612.source and
# _common.published_totals_gate. Each entry is (tonnes, tolerance_pct).
PUBLISHED_NATIONAL: dict[int, dict[str, tuple[float, float]]] = {
    2023: {
        "coffee_production_t": (3_350_000.0, 0.5),
        "citrus_production_t": (17_650_000.0, 0.5),
    },
}


def fetch(year: int, raw_dir: Path) -> Path:
    base = Path(raw_dir) / _common.RAW_SUBDIR
    _sidra.select_workbook(base, TABLE, year)
    return base


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    """One WIDE row per municipality; coffee/citrus plus the two varietals."""
    base = fetch(year, raw_dir)
    workbook = _sidra.select_workbook(base, TABLE, year)
    reading = _sidra.read_year(workbook, year)
    if not reading:
        raise ValueError(f"table {TABLE} has no data for {year} in {workbook.name}")
    return _common.frame_from_reading(reading, {**PRODUCTS, **VARIETAL_PRODUCTS})


def validate(
    df: pd.DataFrame,
    ctx: IngestContext | None = None,
    raw_dir: Path | None = None,
) -> tuple[list[GateResult], IngestContext]:
    """Standard battery, the published-production check, and the coffee
    containment tripwire."""
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=0)

    if not ctx.published_totals and ctx.year in PUBLISHED_NATIONAL:
        ctx.published_totals = {"BR": PUBLISHED_NATIONAL[ctx.year]["citrus_production_t"][0]}
        ctx.totals_column = "citrus_production_t"

    results = _common.standard_battery(df, ctx)
    results.append(_common.published_totals_gate(df, ctx.year, PUBLISHED_NATIONAL))

    # Arábica + Canephora must not exceed Total (the double-count tripwire).
    varietals = [c for c in VARIETAL_PRODUCTS.values() if c in df.columns]
    combined = df[varietals].sum(axis=1, min_count=1) if varietals else None
    results.append(
        _common.subset_gate(df, combined, "coffee_production_t", "cafe_arabica+canephora")
    )
    return results, ctx


def promote(df: pd.DataFrame, conn) -> None:
    raise NotImplementedError(
        "Promotion runs via backend/scripts/promote_pam.py against the real DB — "
        "database writes stay a reviewed, manual step (ingest/README.md)."
    )
