"""Shared SPEC construction and gates for the two PAM tables.

The two tables differ only in which crops they carry, so everything else — the
frame shape, the subset gates, the battery wiring — lives here once.

THE SUBSET TRAPS (each is a real double-count if ignored)

1. `Café (em grão) Arábica` + `Café (em grão) Canephora` ⊆ `Café (em grão) Total`.
   Summing all three inflates coffee by ~2x. Only `Total` is ingested, and
   coffee_subset_gate asserts the containment so the trap cannot go unnoticed
   if IBGE reorders the columns.

2. `Cana para forragem` is NOT `Cana-de-açúcar`. Forage cane is a distinct
   fodder crop, never delivered to a mill, and has no bagasse/vinhaça chain.
   It is deliberately not mapped to the `sugarcane` stream.

The same discipline as ibge_ppm's `suino_matrizes ⊆ suino_total` gate.
"""

from __future__ import annotations

import pandas as pd

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, run_standard_battery

RAW_SUBDIR = "pam"

# Crop production is wet tonnes as reported by IBGE.
UNIT = "t"

# Plausibility ceiling per municipality-year, in tonnes. The largest single
# municipal figure in the whole 2008-2024 series is São Desidério (BA) soybean
# and Morro Agudo (SP) cane, both well under 10 Mt; 50 Mt leaves headroom for
# growth while still catching a unit slip (e.g. kg loaded as t).
MAX_MUNICIPAL_TONNES = 50_000_000.0


def build_spec(
    source_id: str,
    name: str,
    columns: tuple[str, ...],
    missing_allowlist: tuple[str, ...] = (),
    tolerance_pct: float = 1.0,
) -> SourceSpec:
    """One SourceSpec per PAM table. `columns` are the frame's value columns."""
    return SourceSpec(
        source_id=source_id,
        name=name,
        key_column="ibge_code",
        required_columns={"ibge_code": "str", **{col: "float" for col in columns}},
        value_bounds={col: (0.0, MAX_MUNICIPAL_TONNES) for col in columns},
        scope_ufs=(),  # national
        missing_allowlist=missing_allowlist,
        aggregation_tolerance_pct=tolerance_pct,
    )


def frame_from_reading(
    reading: dict[str, dict[str, float | None]],
    products: dict[str, str],
) -> pd.DataFrame:
    """{code: {product: value}} -> one WIDE row per municipality.

    Wide because the standard battery expects it: schema_gate checks ibge_code
    uniqueness and coverage_gate counts one row per municipality per UF.
    promote() melts this back to the long shape the DB stores.

    A None survives as NaN and is dropped at promote time — it must never
    become 0.0 here (see _sidra.parse_value for why the distinction is
    load-bearing).
    """
    records: list[dict[str, object]] = []
    for code in sorted(reading):
        row: dict[str, object] = {"ibge_code": code}
        for product, column in products.items():
            row[column] = reading[code].get(product)
        records.append(row)

    frame = pd.DataFrame.from_records(records)
    if frame.empty:
        return frame
    frame["ibge_code"] = frame["ibge_code"].astype(str)
    for column in products.values():
        frame[column] = pd.to_numeric(frame.get(column), errors="coerce")
    return frame


def subset_gate(
    frame: pd.DataFrame, subset_values: pd.Series | None, total_column: str, label: str
) -> GateResult:
    """Assert subset ≤ total per municipality, so a silent double-count fails loudly."""
    if subset_values is None or total_column not in frame:
        return GateResult(
            gate=f"subset:{label}",
            passed=True,
            details=f"{label} not present in this snapshot — nothing to contain",
        )
    both = pd.DataFrame({"sub": subset_values, "tot": frame[total_column]}).dropna()
    violations = int((both["sub"] > both["tot"] * 1.001).sum())
    return GateResult(
        gate=f"subset:{label}",
        passed=violations == 0,
        details=(
            f"{label} ⊆ {total_column} holds for {len(both)} municipalities"
            if violations == 0
            else f"{violations} municipalities where {label} > {total_column} — "
            "the columns are no longer nested; re-check the product mapping"
        ),
    )


def standard_battery(frame: pd.DataFrame, ctx: IngestContext) -> list[GateResult]:
    return run_standard_battery(frame, ctx)


def published_totals_gate(
    frame: pd.DataFrame,
    year: int,
    published: dict[int, dict[str, tuple[float, float]]],
) -> GateResult:
    """Municipal sums must reproduce IBGE's own published national production.

    This is the gate that actually validates the parser — the year forward-fill,
    the '-' vs '..'/'X' value codes and the product mapping all have to be right
    for the sum to land on the published headline.

    The figures are recorded at PUBLISHED precision (IBGE reports "782,0 milhões
    de toneladas", 4 significant digits), never at our computed precision. Copying
    our own output back in would make the gate circular and test nothing; keeping
    published precision means the tolerance absorbs IBGE's rounding and nothing
    else. A year with no recorded figure reports "cannot test", not "wrong".
    """
    expected = published.get(year)
    if not expected:
        return GateResult(
            gate="published_totals",
            passed=False,
            details=(
                f"no published national figure recorded for {year} — cannot test. "
                "Add it from https://sidra.ibge.gov.br (see PUBLISHED_NATIONAL) "
                "or promote with --accept-unfed-aggregation."
            ),
        )

    problems: list[str] = []
    checked: list[str] = []
    for column, (value, tolerance_pct) in expected.items():
        if column not in frame.columns:
            problems.append(f"{column}: absent from frame")
            continue
        actual = float(frame[column].sum(skipna=True))
        drift = abs(actual - value) / value * 100 if value else 0.0
        summary = f"{column}: {actual:,.0f} vs {value:,.0f} published ({drift:.2f}%)"
        (problems if drift > tolerance_pct else checked).append(summary)

    return GateResult(
        gate="published_totals",
        passed=not problems,
        details=(
            "; ".join(checked) if not problems else "OUT OF TOLERANCE — " + "; ".join(problems)
        ),
    )
