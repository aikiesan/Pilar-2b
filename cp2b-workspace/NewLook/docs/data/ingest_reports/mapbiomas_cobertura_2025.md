# Ingest report — mapbiomas_cobertura (2025)

- **Source:** MapBiomas Coleção 11 — cobertura e uso da terra por município, 1985–2025
- **Run date:** 2026-11-28
- **Verdict:** PROMOTED

## Gate results

| Gate | Result | Details |
|------|--------|---------|
| schema | ✅ pass | 552762 rows, 4 required columns OK |
| schema | ✅ pass | 1498 rows, 1 required columns OK |
| coverage | ✅ pass | 2 UFs fully covered (1498 rows) |
| range | ✅ pass | 2 bounded columns within limits |
| aggregation | ✅ pass | 2 totals within ±1.0% |
| cross-source[group_sum] | ✅ pass | 9 groups add up to the source for 61418 municipality-years |
| lineage | ✅ pass | 'mapbiomas_cobertura' fully documented in METADATA.json |
