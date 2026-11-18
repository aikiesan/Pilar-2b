# Reference Database Audit — live Supabase `cp2b-maps-v3` (399 refs)

**Date:** 2026-06-12
**Source:** user-provided SQL-Editor exports of `referencias_unificadas` (residue↔reference rows),
joined with residue names, plus a duplicate-DOI report. Sample of ~150 rows reviewed (full table = 399).
**Linkage:** `referencias_unificadas.codigo_residuo → residuos_cp2b.codigo` (one residue → many refs).
**Operative access field = `url`** (the app reaches papers by direct URL, not DOI). So the priority is
that every reference has a **correct, working URL to the actual paper**; the DOI is secondary (used
only to build a resolver URL when `url` is missing). Cleanup SQL: `docs/sql/audit_and_fix_reference_urls.sql`.
**Two provenance streams in the same table** (`origem_dados`):
- `referencias_bibliograficas` — Brazilian-focused, residue codes in the `AG_/PEC_/IND_/URB_` scheme,
  data mainly in `referencia_texto`; `titulo`/`autores` usually NULL.
- `residuo_references` — international papers, residue codes in the canonical `feedstocks.yaml` scheme
  (BAGACO, PALHA, CASCA_CAFE…); `titulo` often NULL, author in `autores`.

## Confirmed data-quality defects (with examples)

### A. Malformed DOIs — trailing `>.` (extraction artifact from `<…>.` markup) — **mechanical fix**
Resolve incorrectly as written. Examples (id · codigo · doi):
- 134 · CARCACAS_AVES · `10.1016/j.biortech.2019.122588>.`
- 119 · DEJETOS_BOVINO / 102 · ESTERCO_BOVINO · `10.4025/actascitechnol.v39i2.29167>.`
- 91 · DEJETOS_SUINO · `10.1016/j.jenvman.2015.12.014>.`
- 126 · DEJETOS_SUINO / 129 · ESTERCO_SUINO · `10.1016/j.jclepro.2014.10.035>.`
- 104 · DEJETOS_SUINO / 139 · ESTERCO_SUINO · `10.1016/j.scitotenv.2014.02.004>.`
- 123 · ESTERCO_SUINO · `10.1016/j.biortech.2008.09.022>.`
- 122 · ESTERCO_BOVINO · `10.1007/s10163-021-01298-1>.`
- 117 · PALHA · `10.1007/s12355-013-0265-2>.`
- 93 · PALHA · `10.1016/j.biombioe.2012.03.011>.`
**Fix:** strip trailing non-DOI characters (`>` `.` whitespace). Safe, deterministic (SQL below).

### B. DOI field ≠ cited paper — **needs correct DOI**
- 11 · AG_MILHO_PALHA · title = Tumuluru, *Frontiers in Energy Research* (text DOI
  `10.3389/fenrg.2024.1176903`) but `doi` column = `10.1016/j.biortech.2013.08.064`. → field holds a
  different paper's DOI; should be `10.3389/fenrg.2024.1176903` (confirm on publisher page).
- 1 · PEC_DEJETOS_LIQUIDOS_SUINO · EMBRAPA methodology (a website/report, no journal DOI) but
  `doi` = `10.1590/18069657rbcs20170405` (a soil-science article — the same DOI wrongly attached to the
  milho-palha row). → DOI should be NULL (institutional report) and the URL kept.

### C. Placeholder / fabricated-looking rows — **verify or remove**
- 121 · PC_BOVINOS_001 · "Oliveira & Santos (2020)", generic title "Methane production from cattle
  manure under Brazilian conditions", `doi` `10.1016/j.biombioe.2020.05.003`. Matches the
  `references_template.json` stub pattern → likely placeholder; confirm the real source or drop.
- 110 · CASCA_CAFE · "SILVA, Ariovaldo José da" — author only, no title/year/DOI → incomplete.

### D. DOI present in `referencia_texto` but `doi` column NULL — **back-fill**
Many `referencias_bibliograficas` rows carry "DOI: https://doi.org/…" inside `referencia_texto`
while the `doi` column is NULL (and vice-versa). Normalise: extract the DOI from text → `doi` column,
strip the resolver prefix, populate `url = https://doi.org/<doi>`.

### E. Dual residue-coding schemes — **unify**
`AG_CANA_BAGACO` (referencias_bibliograficas) and `BAGACO` (residuo_references) describe the same
residue. Use `mapeamento_residuos_equivalentes` to map both to one canonical code so a residue's
references aren't split across two keys. Reconcile to the `feedstocks.yaml` code set (single source).

## Quantified counts — full `referencias_unificadas` view (148 rows, confirmed)
> The `referencias_unificadas` **view returns 148 rows**, but the dashboard reports **399**. The 399
> therefore live in a **larger source table** (candidates: `scientific_references`, `references`,
> or the union of `referencias_bibliograficas` + `residuo_references`). **Tomorrow, export the
> 399-row source table**, not just this view. (`SELECT count(*) FROM scientific_references;` etc.)

| Defect | Count / 148 | Note |
|---|---|---|
| **Missing URL** | **94 (64%)** | URL is the operative access field → ~2/3 of refs are not clickable |
| Has working URL | 54 (36%) | scielo / embrapa / doi.org |
| DOI with trailing `>.` | ~14 | mechanical fix (SQL §3a) — affects `doi` column (url was null, so url_junk=0) |
| Recoverable url from doi | 25 | SQL §3b back-fill `url = https://doi.org/<doi>` |
| DOI ≠ cited title | ≥2 | id 11 AG_MILHO_PALHA; id 1 PEC_DEJETOS_LIQUIDOS_SUINO |
| Author-only / incomplete stubs | ~9 | id 110, 114, 97, 112, 105, 99, 135, 128, 132 |
| Placeholder | 1 | id 121 PC_BOVINOS_001 |
| `journal` field misparsed | many | residuo_references: "Jaboticabal", "Solo", "Paulo", "RSER" = citation fragments |

Cross-confirmation: id 115 BONOMI (VINHACA) = the vinasse paper flagged in CITATION_DOI_AUDIT.md
(really **Moraes, Zaiat & Bonomi 2015, RSER 44:888-903**, DOI `10.1016/j.rser.2015.01.023`); here it
carries **no DOI/URL**. The `residuo_references` BAGACO/PALHA/etc. entries overlap the
`references.yaml` 32-DOI set — so the same wrong-DOI problems exist in both stores.

## Residue-code bridge (confirmed)
`mapeamento_residuos_equivalentes` maps the two schemes:
`VINHACA↔AG_CANA_VINHACA`, `PALHA_MILHO↔AG_MILHO_PALHA`, `CASCA_CAFE↔AG_CAFE_CASCA`,
`CASCAS_CITROS↔AG_CITROS_CASCAS`, `BAGACO_CITROS↔AG_CITROS_BAGACO`, … → use it to unify (defect E).

## Remediation plan (once full 399 CSV is in hand)
1. Run mechanical cleanup (defect A + D) — deterministic SQL, no judgement (`fix_reference_dois.sql`).
2. Generate a "needs-human" worklist for defects B + C (DOI/title mismatch, placeholders) — verify each
   real DOI on the publisher page (user-assisted) before writing. **No guessed DOIs.**
3. Unify residue codes (defect E) via `mapeamento_residuos_equivalentes`.
4. Reconcile the cleaned corpus into `references.yaml` as the single source of truth, then regenerate
   the SQL/TS/MD layers from it so the 4-layer drift cannot recur.
