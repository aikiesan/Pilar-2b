"""
The standard 8-gate validation battery every ingest must pass before promote.

Gates are pure functions over pandas DataFrames returning GateResult, so they
run identically in unit tests (fixture frames), in CI (seeded DB extracts)
and in real ingest runs. Definitions mirror BRAZIL_EXPANSION_ROADMAP.md §5:

    1. schema        columns/dtypes/keys present and valid
    2. coverage      row counts per UF vs official municipality counts
    3. range         numeric plausibility bounds
    4. aggregation   sums match the source's own published totals
    5. cross-source  at least one independent-source consistency check
    6. idempotency   two runs produce byte-identical promoted rows
    7. lineage       METADATA.json entry complete (no VERIFY placeholders)
    8. regression    headline platform metrics unchanged or explained
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Callable

import pandas as pd

from ingest import ibge
from ingest.contract import IngestContext, SourceSpec

_DTYPE_CHECKS: dict[str, Callable[[pd.Series], bool]] = {
    "int": lambda s: pd.api.types.is_integer_dtype(s),
    "float": lambda s: pd.api.types.is_numeric_dtype(s),
    "str": lambda s: pd.api.types.is_string_dtype(s) or pd.api.types.is_object_dtype(s),
}


@dataclass(frozen=True)
class GateResult:
    gate: str
    passed: bool
    details: str

    def __str__(self) -> str:  # used verbatim in ingest reports
        status = "PASS" if self.passed else "FAIL"
        return f"[{status}] {self.gate}: {self.details}"


# ── 1. schema ────────────────────────────────────────────────────────────────


def schema_gate(df: pd.DataFrame, spec: SourceSpec) -> GateResult:
    problems: list[str] = []

    missing = [c for c in spec.required_columns if c not in df.columns]
    if missing:
        problems.append(f"missing columns: {missing}")

    for col, kind in spec.required_columns.items():
        if col in df.columns and not _DTYPE_CHECKS[kind](df[col]):
            problems.append(f"column '{col}' is {df[col].dtype}, expected {kind}")

    if spec.key_column in df.columns:
        key = df[spec.key_column]
        nulls = int(key.isna().sum())
        if nulls:
            problems.append(f"{nulls} null keys in '{spec.key_column}'")
        dupes = int(key.duplicated().sum())
        if dupes:
            problems.append(f"{dupes} duplicate keys in '{spec.key_column}'")
        if spec.key_column == "ibge_code":
            bad = [k for k in key.dropna() if not ibge.is_valid_ibge_code(k)]
            if bad:
                problems.append(f"{len(bad)} invalid ibge_codes (e.g. {bad[:3]})")

    if problems:
        return GateResult("schema", False, "; ".join(problems))
    return GateResult(
        "schema", True, f"{len(df)} rows, {len(spec.required_columns)} required columns OK"
    )


# ── 2. coverage ──────────────────────────────────────────────────────────────


def coverage_gate(df: pd.DataFrame, spec: SourceSpec) -> GateResult:
    """Row count per UF must equal the official municipality count, minus the
    documented allowlist. Only meaningful for municipal-keyed sources."""
    if spec.key_column != "ibge_code":
        return GateResult("coverage", True, f"not municipal-keyed ({spec.key_column}); skipped")

    scope = spec.scope_ufs or tuple(sorted(ibge.MUNICIPALITY_COUNT_BY_UF))
    allow_by_uf: dict[str, int] = {}
    for code in spec.missing_allowlist:
        uf = ibge.uf_of(code)
        if uf:
            allow_by_uf[uf] = allow_by_uf.get(uf, 0) + 1

    counts = df["ibge_code"].astype(str).str[:2].map(ibge.UF_BY_CODE_PREFIX).value_counts()
    problems = []
    for uf in scope:
        expected = ibge.MUNICIPALITY_COUNT_BY_UF[uf] - allow_by_uf.get(uf, 0)
        got = int(counts.get(uf, 0))
        if got != expected:
            problems.append(f"{uf}: {got}/{expected}")

    if problems:
        return GateResult("coverage", False, f"UF counts off: {', '.join(problems)}")
    return GateResult("coverage", True, f"{len(scope)} UFs fully covered ({len(df)} rows)")


# ── 3. range ─────────────────────────────────────────────────────────────────


def range_gate(df: pd.DataFrame, spec: SourceSpec) -> GateResult:
    problems = []
    for col, (lo, hi) in spec.value_bounds.items():
        if col not in df.columns:
            problems.append(f"bounded column '{col}' absent")
            continue
        values = pd.to_numeric(df[col], errors="coerce")
        if lo is not None and (values < lo).any():
            problems.append(f"'{col}' has {int((values < lo).sum())} values < {lo}")
        if hi is not None and (values > hi).any():
            problems.append(f"'{col}' has {int((values > hi).sum())} values > {hi}")

    if problems:
        return GateResult("range", False, "; ".join(problems))
    return GateResult("range", True, f"{len(spec.value_bounds)} bounded columns within limits")


# ── 4. aggregation ───────────────────────────────────────────────────────────


def aggregation_gate(df: pd.DataFrame, ctx: IngestContext) -> GateResult:
    """Frame sums must match the source's own published totals (per UF and/or
    the national 'BR' total) within spec.aggregation_tolerance_pct."""
    if not ctx.published_totals or not ctx.totals_column:
        return GateResult(
            "aggregation", False, "no published totals provided — supply them in IngestContext"
        )
    col = ctx.totals_column
    if col not in df.columns:
        return GateResult("aggregation", False, f"totals column '{col}' absent from frame")

    tol = ctx.spec.aggregation_tolerance_pct / 100.0
    values = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    if "uf" in df.columns:
        by_uf = values.groupby(df["uf"]).sum()
    elif ctx.spec.key_column == "ibge_code":
        ufs = df["ibge_code"].astype(str).str[:2].map(ibge.UF_BY_CODE_PREFIX)
        by_uf = values.groupby(ufs).sum()
    else:
        by_uf = pd.Series(dtype=float)

    problems = []
    for scope, published in ctx.published_totals.items():
        got = float(values.sum()) if scope == "BR" else float(by_uf.get(scope, 0.0))
        if published == 0:
            ok = got == 0
        else:
            ok = abs(got - published) / abs(published) <= tol
        if not ok:
            problems.append(f"{scope}: got {got:,.2f} vs published {published:,.2f}")

    if problems:
        return GateResult(
            "aggregation",
            False,
            f"outside ±{ctx.spec.aggregation_tolerance_pct}%: {'; '.join(problems)}",
        )
    return GateResult(
        "aggregation",
        True,
        f"{len(ctx.published_totals)} totals within ±{ctx.spec.aggregation_tolerance_pct}%",
    )


# ── 5. cross-source ──────────────────────────────────────────────────────────


def cross_source_gate(name: str, check: Callable[[], tuple[bool, str]]) -> GateResult:
    """Wrap one independent-source consistency check (e.g. ANEEL vs ANP plant
    overlap, MapBiomas crop area vs PAM planted area). The callable returns
    (passed, human-readable detail)."""
    try:
        passed, detail = check()
    except Exception as exc:  # a crashing check must fail the gate, not the run
        return GateResult(f"cross-source[{name}]", False, f"check raised {exc!r}")
    return GateResult(f"cross-source[{name}]", passed, detail)


# ── 6. idempotency ───────────────────────────────────────────────────────────


def frame_checksum(df: pd.DataFrame) -> str:
    """Order-independent checksum of a frame's content (sorted columns/rows)."""
    normalized = df.reindex(sorted(df.columns), axis=1)
    normalized = normalized.sort_values(by=list(normalized.columns), kind="mergesort")
    payload = normalized.to_csv(index=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def idempotency_gate(first_checksum: str, second_checksum: str) -> GateResult:
    if first_checksum == second_checksum:
        return GateResult("idempotency", True, f"checksums match ({first_checksum[:12]}…)")
    return GateResult(
        "idempotency",
        False,
        f"re-run produced different rows ({first_checksum[:12]}… vs {second_checksum[:12]}…)",
    )


# ── 7. lineage ───────────────────────────────────────────────────────────────

_LINEAGE_REQUIRED_FIELDS = ("name", "role", "reference_year", "url", "retrieved")


def lineage_gate(metadata_path: str, source_id: str) -> GateResult:
    try:
        with open(metadata_path, encoding="utf-8") as fh:
            metadata = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        return GateResult("lineage", False, f"cannot read {metadata_path}: {exc}")

    entry = next((s for s in metadata.get("sources", []) if s.get("id") == source_id), None)
    if entry is None:
        return GateResult("lineage", False, f"source '{source_id}' missing from METADATA.json")

    problems = []
    for fld in _LINEAGE_REQUIRED_FIELDS:
        value = entry.get(fld)
        if value in (None, ""):
            problems.append(f"field '{fld}' empty")
        elif "VERIFY" in str(value).upper():
            problems.append(f"field '{fld}' still a VERIFY placeholder")

    if problems:
        return GateResult("lineage", False, "; ".join(problems))
    return GateResult("lineage", True, f"'{source_id}' fully documented in METADATA.json")


# ── 8. regression ────────────────────────────────────────────────────────────


def regression_gate(
    current_metrics: dict[str, float],
    ctx: IngestContext,
    tolerance_pct: float = 0.01,
) -> GateResult:
    """Headline platform numbers (SP mobilisable potential, plant counts,
    RGint rankings…) must be unchanged after promote, or every change must
    carry an explanation in ctx.regression_explanations."""
    if not ctx.baseline_metrics:
        return GateResult("regression", True, "no baseline metrics (first ingest of this source)")
    tol = tolerance_pct / 100.0
    unexplained = []
    for metric, baseline in ctx.baseline_metrics.items():
        got = current_metrics.get(metric)
        if got is None:
            unexplained.append(f"{metric}: missing from current metrics")
            continue
        changed = abs(got - baseline) > tol * max(abs(baseline), 1e-12)
        if changed and metric not in ctx.regression_explanations:
            unexplained.append(f"{metric}: {baseline:,.4g} -> {got:,.4g} (unexplained)")

    if unexplained:
        return GateResult("regression", False, "; ".join(unexplained))
    explained = len(ctx.regression_explanations)
    return GateResult(
        "regression", True, f"{len(ctx.baseline_metrics)} metrics OK ({explained} explained)"
    )


# ── battery runner ───────────────────────────────────────────────────────────


def run_standard_battery(df: pd.DataFrame, ctx: IngestContext) -> list[GateResult]:
    """Gates 1–4 + 7, which need only the frame and context. Cross-source (5),
    idempotency (6) and regression (8) need extra inputs, so sources wire them
    explicitly in their validate() — see sources/aneel_siga/source.py."""
    results = [
        schema_gate(df, ctx.spec),
        coverage_gate(df, ctx.spec),
        range_gate(df, ctx.spec),
        aggregation_gate(df, ctx),
    ]
    if ctx.metadata_path:
        results.append(lineage_gate(ctx.metadata_path, ctx.spec.source_id))
    return results


def all_passed(results: list[GateResult]) -> bool:
    return all(r.passed for r in results)
