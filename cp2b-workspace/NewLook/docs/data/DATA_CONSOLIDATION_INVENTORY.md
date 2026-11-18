# Data Consolidation Inventory — PILAR-2b

Sweep of every reference / parameter / dataset store in the project, with drift &
duplication flags and a recommended canonical + action. Companion to the 3-store
reference review already in progress.

## A. Reference (citation) stores

| Store | Where | Count | Role | Issue | Action |
|---|---|---|---|---|---|
| `scientific_references` | Supabase (live) | 399 | **Canonical** — powers the site's Scientific Database | 42 DOI-reuse-across-residues | review (xlsx tab 1) → fix |
| `references.yaml` | repo `data/canonical_parameters/` | 65 | **Canonical** for code/FDE traceability | **10 DOIs resolve to wrong paper** (CITATION_DOI_AUDIT) | review (xlsx tab 2) → fix |
| `referencias_unificadas` | Supabase **view** | 148 | curated Brazilian subset | trailing-`>.` DOIs; dual code schemes | review (xlsx tab 3) → fix |
| `scientificData.ts` | frontend `src/data/` | 60 DOIs | frontend kinetics + **own BMP** + free-text refs | **auto-gen from external `Panorama_CP2B`**; refs are free-text, not DOI-linked; BMP can drift from `feedstocks.yaml` | regenerate from canonical OR retire once API serves it |
| `004_import_panorama_data.sql` | backend migrations | 43 | one-time Panorama seed | historical seed, may differ from current | freeze (don't reseed); treat `scientific_references` as truth |
| `sql_insert_literature_references.sql` | `docs/sql/` | 34 rows | planned seed | overlaps refs.yaml | retire or regen from refs.yaml |
| `references_template.json` | backend `data/` | 2 | **placeholder w/ fake DOIs** (`...123456`) | not real data | delete |
| `PARAMETER_CITATIONS.md`, `FDE_TRACEABILITY_MATRIX.md`, `FEEDSTOCK_FACTORS_LITERATURE_TABLE.md` | `docs/data/` | derivative | auto-generated from refs.yaml/feedstocks.yaml | OK — keep generated |

### Supabase reference-table proliferation (from the table list)
The DB also carries **many overlapping reference tables/backups** that should be
collapsed to one source + views:
`references`, `references_residue_parameters`, `referencias_bibliograficas`
(+ `_backup_doi_fix`, `_backup_extract`), `residue_references`, `residuo_references`,
`technology_references`, `scientific_references`, plus helper views
`doi_coverage_dashboard`, `missing_doi_lookup`, `vw_residuos_referencias_webapp`,
`vw_residuos_unificados`, `vw_residuos_consolidados`.
→ **Recommendation:** pick `scientific_references` as the one physical table, drop the
two `referencias_bibliograficas_backup_*` tables, and keep the rest as **views** only.
(Needs a DB export to action — same path as the 399 review.)

## B. Parameter (BMP/TS/VS/kinetics) stores

| Store | Where | Role | Drift status | Action |
|---|---|---|---|---|
| `feedstocks.yaml` | repo `data/canonical_parameters/` | **SINGLE SOURCE OF TRUTH** | — | keep canonical |
| `_canonical_biomass_configs.py` | backend (generated) | generator output | in sync (regenerated) | keep generated |
| `biomass_availability.py` `RESIDUE_BIOMASS_CONFIGS` | backend (hand-merged) | runtime backend | synced (drift test guards it) | keep; rely on `test_service_bmp_matches_canonical` |
| `calculatorEngine.canonical.ts` | frontend (generated) | generator output | **generated but NOT merged** into live `calculatorEngine.ts` | merge into `calculatorEngine.ts` so the calculator uses recalibrated BMP |
| `calculatorEngine.ts` | frontend (live) | calculator runtime | **stale BMP** until merge above | update from canonical |
| `scientificData.ts` `REAL_KINETICS_DATA` | frontend | independent BMP (`bmp_experimental/simulated`) | parallel to feedstocks.yaml (e.g. poultry 275/288.75 vs CAMA_AVIARIO 280) | reconcile to canonical or label as experimental-only |
| `015_correct_bmp_parameters.sql`, `016_canonical_sync.sql` | backend migrations | DB sync | **canonical-keyed (BAGACO…) → 0 rows on prod slug DB** | rewrite slug-keyed (`bagaco_cana`) to actually update prod |

## C. Duplicated datasets (byte-identical)

| Duplicate | Verdict | Action |
|---|---|---|
| `CP2B_HANDOFF/{00..04}` **==** `analysis/data/{00..04}` (all 5 identical) | full copy of the SP-2023 handoff dataset in two dirs | ✅ **RESOLVED** — `CP2B_HANDOFF/` removed; `analysis/data/` is the single source; backend scripts repointed |
| `analysis/data/03_conversion_factors.csv` **==** `CP2B_HANDOFF/03_conversion_factors.csv` | (subset of above) | ✅ **RESOLVED** (see above) |

## D. Net consolidation actions (priority order)
1. **References:** finish the 3-store manual review (xlsx) → reconcile into `references.yaml` as the single repo source; regenerate `scientificData.ts` refs from it (retire free-text). *(in progress)*
2. **Frontend BMP drift:** merge `calculatorEngine.canonical.ts` → `calculatorEngine.ts`; reconcile `scientificData.ts` BMP to canonical.
3. **Prod DB BMP:** ship a **slug-keyed** version of `016` so `scientific_references`/`residuos` actually update (`docs/data/CANONICAL_VERIFICATION_PLAN.md`).
4. ~~**Dedupe datasets:** collapse `CP2B_HANDOFF` ⇄ `analysis/data`.~~ ✅ **DONE** — `CP2B_HANDOFF/` git-rm'd; scripts repointed to `analysis/data/`.
5. **Delete** `references_template.json` (fake DOIs); retire `sql_insert_literature_references.sql`.
6. **DB tidy:** drop `referencias_bibliograficas_backup_*`; keep one physical ref table + views (needs export).
