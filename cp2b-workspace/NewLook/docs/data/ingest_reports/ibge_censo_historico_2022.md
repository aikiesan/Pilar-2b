# Ingest report — ibge_censo_historico (2022)

- **Source:** IBGE — população residente nos Censos 1970–2022 (SIDRA 200 e 4714)
- **Run date:** 2026-11-28
- **Verdict:** PROMOTED

## Gate results

| Gate | Result | Details |
|------|--------|---------|
| schema | ✅ pass | 5570 rows, 7 required columns OK |
| coverage | ✅ pass | 27 UFs fully covered (5570 rows) |
| range | ✅ pass | 6 bounded columns within limits |
| aggregation | ✅ pass | 3 totals within ±0.0% |
| lineage | ✅ pass | 'ibge_censo_historico' fully documented in METADATA.json |
| cross-source[brasil_2010] | ✅ pass | Brasil 2010: 190,755,799 vs published 190,755,799 |
