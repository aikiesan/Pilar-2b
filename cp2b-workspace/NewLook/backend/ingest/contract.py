"""
The ingestion contract: what a source module must declare and implement.

A source lives in ingest/sources/<source_id>/source.py and exposes:

    SPEC: SourceSpec                     # declarative schema + bounds
    def fetch(year, raw_dir) -> Path     # download raw snapshot (idempotent)
    def load(year, raw_dir) -> DataFrame # raw -> typed frame, keyed per SPEC
    def validate(df, ctx) -> list[GateResult]   # standard battery + extras
    def promote(df, conn) -> None        # staging -> public, one transaction

`fetch` must never overwrite an existing snapshot (raw files are immutable);
`load` must be pure (same snapshot in, same frame out); `validate` must run
the standard battery via ingest.gates.run_standard_battery plus any
source-specific gates; `promote` must be callable twice with identical
results (the idempotency gate checks this via frame checksums).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SourceSpec:
    """Declarative description of one external data source."""

    source_id: str
    name: str
    # Spatial key: "ibge_code" (municipal), "cod_rgint" (intermediate region)
    # or "uf" (state-level series).
    key_column: str
    # column name -> pandas dtype kind: "int", "float" or "str"
    required_columns: dict[str, str]
    # column name -> (min, max) plausibility bounds; None = unbounded side.
    # Cited per-column in METADATA.json notes.
    value_bounds: dict[str, tuple[float | None, float | None]] = field(default_factory=dict)
    # UFs the source is expected to cover; empty = national (all 27).
    scope_ufs: tuple[str, ...] = ()
    # ibge_codes legitimately absent from the source (documented, never silent).
    missing_allowlist: tuple[str, ...] = ()
    # Tolerance (in %) for the aggregation gate against published totals.
    aggregation_tolerance_pct: float = 1.0


@dataclass
class IngestContext:
    """Everything validate() may need beyond the frame itself."""

    spec: SourceSpec
    year: int
    # Published aggregates from the source itself: uf (or "BR") -> total.
    published_totals: dict[str, float] = field(default_factory=dict)
    # Column the published totals refer to.
    totals_column: str | None = None
    # Headline platform metrics before this ingest (for the regression gate).
    baseline_metrics: dict[str, float] = field(default_factory=dict)
    # Explanations for intentional metric changes ("metric name" -> reason).
    regression_explanations: dict[str, str] = field(default_factory=dict)
    # Path to docs/data/METADATA.json (overridable in tests).
    metadata_path: str | None = None
