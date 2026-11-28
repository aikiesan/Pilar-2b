# Ingest report — ibge_censo_situacao (2022)

- **Source:** IBGE Censo 2022 — população residente por situação do domicílio (SIDRA 9923)
- **Run date:** 2026-11-28
- **Verdict:** PROMOTED

## Gate results

| Gate | Result | Details |
|------|--------|---------|
| schema | ✅ pass | 5570 rows, 4 required columns OK |
| coverage | ✅ pass | 27 UFs fully covered (5570 rows) |
| range | ✅ pass | 3 bounded columns within limits |
| aggregation | ✅ pass | 3 totals within ±0.0% |
| lineage | ✅ pass | 'ibge_censo_situacao' fully documented in METADATA.json |
| cross-source[urban_plus_rural] | ✅ pass | urban + rural == total for all 5570 municipalities |
