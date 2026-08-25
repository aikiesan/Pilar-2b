# `ingest/` — the PILAR-2b ingestion contract

Every external dataset enters the platform through the same four steps and
the same validation battery. **Copy `sources/aneel_siga/` as your template.**

```
fetch    → immutable raw snapshot at data/raw/<source_id>/<year>/
load     → typed pandas DataFrame keyed on ibge_code / cod_rgint / uf
validate → standard 8-gate battery + source-specific gates
promote  → staging.* → public.* in ONE transaction (blocked until migration 021)
```

## Running

```bash
cd backend
python -m ingest.runner list
python -m ingest.runner run aneel_siga --year 2025            # fetch+load+validate
python -m ingest.runner run aneel_siga --year 2025 --step load
```

A validate run always writes `docs/data/ingest_reports/<source>_<year>.md`.
Exit code is non-zero when any gate fails — promotion is blocked.

## Adding a new source (the 15-minute version)

Full step-by-step with checklists: `docs/data/INGESTION_GUIDE.md`.

1. `mkdir sources/<source_id>/` and copy `sources/aneel_siga/source.py`.
2. Fill in `SPEC` (columns, dtypes, bounds, scope, tolerance) — this is where
   most of the thinking happens; bounds must be citable.
3. Implement `load()` for the raw format. Keep every unit conversion in ONE
   place with a comment (see the kW→MW audit note in the template).
4. Register the source in `runner.SOURCES` (one line).
5. Add a fixture excerpt (a few real rows) under
   `tests/unit/ingest/fixtures/<source_id>/<year>/` and tests mirroring
   `test_aneel_siga.py`.
6. Add/complete the source entry in `docs/data/METADATA.json` — the lineage
   gate fails on `VERIFY` placeholders, by design.

## Gate battery (details in `gates.py`, definitions in roadmap §5)

| # | Gate | Fails when |
|---|------|-----------|
| 1 | schema | missing/mistyped columns, null/duplicate/invalid keys |
| 2 | coverage | per-UF row counts ≠ official IBGE municipality counts (minus documented allowlist) |
| 3 | range | any value outside the SPEC's citable plausibility bounds |
| 4 | aggregation | sums ≠ the source's own published totals (± tolerance) — must be fed real published numbers, never skipped |
| 5 | cross-source | an independent-source consistency check fails (wired per source) |
| 6 | idempotency | two runs produce different promoted rows (frame checksums) |
| 7 | lineage | METADATA.json entry missing/incomplete/has VERIFY placeholders |
| 8 | regression | a headline platform metric changed without a written explanation |

## Design decisions

- **Gates are pure functions over DataFrames** — no DB required, so they run
  in unit tests, CI, and real ingests identically.
- **`fetch` never downloads silently** for sources whose portal exports are
  manual: taking a snapshot is a deliberate, dated act recorded in
  METADATA.json (`retrieved`).
- **`promote` is not wired to the CLI** until the staging schema exists
  (migration 021, roadmap §3.1). Database writes stay reviewed and manual.
- Tests for this package live in `tests/unit/ingest/`; coverage is measured
  over `app/` only, so ingest code never games the coverage floor.
