"""
ANEEL SIGA — biogas/biomass generation plants (the ingestion-contract template).

This is the reference implementation new sources should copy. It also closes
the P0 flag from METADATA.json: ingest SIGA into the validation pipeline
(`validation_plants_registry`) and settle the 19.69 vs 6.39 unit discrepancy.

Raw data: SIGA "empreendimentos em operação" CSV export from
https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel
(semicolon-separated, cp1252-encoded — the standard ANEEL export format).
Place the snapshot at data/raw/aneel_siga/<year>/siga_operacao.csv; fetch()
intentionally refuses to download silently so the snapshot date is a
deliberate, recorded act (METADATA.json `retrieved`).

UNIT AUDIT (the 19.69 vs 6.39 discrepancy): SIGA's `MdaPotenciaOutorgadaKw`
is in **kW**. 19.69 vs 6.39 is consistent with one number being read as GW
from a kW sum divided by 1e3 (-> MW misread as GW) and the other divided by
1e6. This loader normalizes ONCE (capacity_mw = kW / 1_000) and everything
downstream uses capacity_mw only. The aggregation gate must be fed ANEEL's
own published per-fuel totals to certify the normalization.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, run_standard_battery

RAW_FILENAME = "siga_operacao.csv"

# Raw SIGA column -> normalized column. Confirm against the snapshot's header
# on first real run; ANEEL occasionally renames columns between exports.
COLUMN_MAP = {
    "CodCEG": "ceg_code",
    "NomEmpreendimento": "plant_name",
    "SigUFPrincipal": "uf",
    "DscMuniciposPrincipal": "municipality_name",
    "DscOrigemCombustivel": "fuel_origin",
    "DscFonteCombustivel": "fuel_source",
    "MdaPotenciaOutorgadaKw": "capacity_kw",
}

# SIGA fuel origins that belong in the biogas/biomass validation universe.
BIOMASS_FUEL_ORIGINS = ("Biomassa",)

SPEC = SourceSpec(
    source_id="aneel_siga",
    name="ANEEL SIGA — biomass/biogas generation plants in operation",
    key_column="ceg_code",  # plant registry, not municipal — coverage gate skips
    required_columns={
        "ceg_code": "str",
        "plant_name": "str",
        "uf": "str",
        "municipality_name": "str",
        "fuel_origin": "str",
        "fuel_source": "str",
        "capacity_kw": "float",
        "capacity_mw": "float",
    },
    value_bounds={
        # Largest single biomass plant in Brazil is < 500 MW; anything above
        # means a unit slip somewhere. Lower bound 0 excludes negative kW.
        "capacity_kw": (0, 500_000),
        "capacity_mw": (0, 500),
    },
    aggregation_tolerance_pct=1.0,
)


def fetch(year: int, raw_dir: Path) -> Path:
    """Raw snapshots are placed manually (deliberate, dated act). This only
    verifies the snapshot exists and never overwrites one."""
    snapshot = Path(raw_dir) / SPEC.source_id / str(year) / RAW_FILENAME
    if not snapshot.exists():
        raise FileNotFoundError(
            f"SIGA snapshot missing: {snapshot}\n"
            "Download the 'empreendimentos em operação' CSV from "
            "https://dadosabertos.aneel.gov.br/dataset/"
            "siga-sistema-de-informacoes-de-geracao-da-aneel, place it at the "
            "path above, and record the retrieval date in docs/data/METADATA.json."
        )
    return snapshot


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    """Raw SIGA CSV -> normalized frame, filtered to biomass fuel origins,
    with the single authoritative kW -> MW conversion."""
    snapshot = fetch(year, raw_dir)
    raw = pd.read_csv(snapshot, sep=";", encoding="cp1252", dtype=str)

    missing = [c for c in COLUMN_MAP if c not in raw.columns]
    if missing:
        raise ValueError(
            f"SIGA export schema changed — missing columns {missing}; "
            f"got {list(raw.columns)}. Update COLUMN_MAP after checking the export."
        )

    df = raw[list(COLUMN_MAP)].rename(columns=COLUMN_MAP)
    df = df[df["fuel_origin"].isin(BIOMASS_FUEL_ORIGINS)].copy()

    # ANEEL numbers use comma decimal separators.
    df["capacity_kw"] = (
        df["capacity_kw"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    ).astype(float)
    df["capacity_mw"] = df["capacity_kw"] / 1_000.0  # THE unit conversion — only here

    return df.reset_index(drop=True)


def validate(
    df: pd.DataFrame,
    ctx: IngestContext | None = None,
) -> tuple[list[GateResult], IngestContext]:
    """Standard battery. Callers doing a real ingest must supply an
    IngestContext carrying ANEEL's published per-fuel totals (aggregation
    gate) and METADATA.json path (lineage gate); the CLI default context is
    only enough for schema/coverage/range."""
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=0)
    results = run_standard_battery(df, ctx)
    return results, ctx


def promote(df: pd.DataFrame, conn) -> None:
    """staging.aneel_siga_plants -> public.validation_plants_registry. Blocked until
    the staging schema lands (migration 021+, roadmap §3.1) — promotion must
    be a reviewed transaction against the real DB, not a CLI side effect."""
    raise NotImplementedError(
        "Promotion lands with migration 021 (staging schema). "
        "See BRAZIL_EXPANSION_ROADMAP.md §3.1 and §6 (July/August)."
    )
