# Ingest report — ibge_censo_idade (2022)

- **Source:** IBGE Censo 2022 — população residente por grupo de idade e sexo (SIDRA 9514)
- **Run date:** 2026-11-28
- **Verdict:** PROMOTED

## Gate results

| Gate | Result | Details |
|------|--------|---------|
| schema | ✅ pass | 5570 rows, 36 required columns OK |
| coverage | ✅ pass | 27 UFs fully covered (5570 rows) |
| range | ✅ pass | 1 bounded columns within limits |
| aggregation | ✅ pass | 3 totals within ±0.0% |
| lineage | ✅ pass | 'ibge_censo_idade' fully documented in METADATA.json |
