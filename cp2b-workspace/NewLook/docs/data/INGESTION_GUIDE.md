# Data Ingestion Guide — step by step

> The operational manual for getting a new dataset into PILAR-2b. The code
> half of this lives in `backend/ingest/` (read its README); the planning
> half in `docs/planning/BRAZIL_EXPANSION_ROADMAP.md` (§4 source master plan,
> §5 gate definitions). **One source per PR, always.**

## The lifecycle at a glance

```
 ┌─────────┐   ┌─────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────┐
 │ 0. plan │ → │ 1. fetch│ → │ 2. load      │ → │ 3. validate  │ → │ 4. PR   │
 │ SPEC +  │   │ raw     │   │ typed frame, │   │ 8 gates +    │   │ report+ │
 │ bounds  │   │ snapshot│   │ 1 unit conv. │   │ report file  │   │ lineage │
 └─────────┘   └─────────┘   └──────────────┘   └──────────────┘   └─────────┘
                                                        │ any gate fails
                                                        ▼
                                              fix loader/data/SPEC,
                                              re-run (never skip a gate)
```

Promotion to the live tables (step 5) is a separate, reviewed act — blocked
until the staging schema exists (migration 021; roadmap §3.1).

## Step 0 — Plan the SPEC (do this before touching data)

1. Read the source's row in roadmap §4: role, priority, and its **key
   validation** (what published number certifies the ingest).
2. Decide the spatial key: `ibge_code` (municipal), `cod_rgint`
   (intermediate region) or `uf` (state series).
3. Write down, with citations:
   - required columns and dtypes;
   - plausibility bounds per numeric column (these become the range gate —
     "0–500 MW because the largest biomass plant in Brazil is < 500 MW");
   - the source's own published aggregates (state/national totals) that the
     aggregation gate will check against;
   - one **independent** source for the cross-source gate.
4. Add (or complete) the source entry in `docs/data/METADATA.json`. The
   lineage gate fails on `VERIFY` placeholders — fill in the retrieval date
   the day you take the snapshot.

## Step 1 — Fetch: take the raw snapshot

- Put it at `backend/data/raw/<source_id>/<year>/` exactly as downloaded.
  Never edit a raw file; never overwrite an existing snapshot.
- Record in METADATA.json: `retrieved` (date), exact URL, and the export's
  version/collection if the portal versions its data.
- Large rasters (MapBiomas, LAPIG, PRODES) don't go into git — record the
  download URL + SHA-256 checksum in METADATA.json notes instead, and keep
  the file on the VM/external storage.

## Step 2 — Load: raw → typed DataFrame

- Copy `backend/ingest/sources/aneel_siga/` — it is the living template.
- Parsing rules that have already bitten us (bake them into `load()`):
  - Brazilian CSVs: `sep=";"`, `encoding="cp1252"` (ANEEL/gov standard),
    decimal comma + thousands dot (`19.912,00`).
  - **Every unit conversion happens in exactly one line, with a comment.**
    The ANEEL 19.69-vs-6.39 GW confusion was a units slip; the template's
    kW→MW line + `test_unit_audit_kw_vs_mw` shows the pattern.
  - If the export's schema drifted (renamed columns), fail loudly with an
    actionable error (see `COLUMN_MAP` handling in the template).
- Register the source: one line in `ingest/runner.py::SOURCES`.

## Step 3 — Validate: run the battery

```bash
cd backend
python -m ingest.runner run <source_id> --year 2025
```

- Non-zero exit = at least one gate failed = promotion blocked. Fix and
  re-run; never delete a gate to make a run pass.
- The run writes `docs/data/ingest_reports/<source>_<year>.md` — commit it.
- Wire the gates that need extra inputs in your `validate()`:
  - **aggregation**: feed the published totals from step 0 via
    `IngestContext(published_totals=..., totals_column=...)`;
  - **cross-source**: wrap your independent check with
    `gates.cross_source_gate(name, callable)`;
  - **idempotency**: run `load()` twice, compare `gates.frame_checksum()`;
  - **regression**: pass the platform's headline metrics as
    `baseline_metrics` and explain intentional changes in
    `regression_explanations` (they get printed in the report).

## Step 4 — Tests + PR

- Fixture: commit a **small excerpt of real rows** (5–10) under
  `backend/tests/unit/ingest/fixtures/<source_id>/<year>/` and port the four
  test classes from `test_aneel_siga.py` (fetch / load / validate / promote).
- Open the PR using the template — the "Data lineage" section is the review
  checklist for this guide. CI runs your loader tests + lint gates.

## Step 5 — Promote (after migration 021 lands)

- Promotion runs `staging.* → public.*` in one transaction, re-runs the
  regression gate against live headline metrics, and appends the outcome to
  the ingest report. Until then, `promote()` raising `NotImplementedError`
  is correct behavior.

## Yearly refresh (the January playbook)

Data is static and refreshed yearly. For each promoted source, the refresh
is: new snapshot (step 1) → same loader (step 2) → same gates (step 3) →
diff report; the regression gate forces every year-over-year change in
headline numbers to be explained in writing. The full runbook is a December
2026 roadmap deliverable (§6).

## Current source queue

The prioritized queue with per-source validations is roadmap §4. Sequence:
**ANEEL SIGA (template, July)** → IBGE PAM + Censo/PPM + SNIS (August) →
MapBiomas C10.1 + LAPIG (October) → ANP/EPE/SINIR/SICONFI/RAIS (November) →
INMET/ANA/PRODES as their layers come online.
