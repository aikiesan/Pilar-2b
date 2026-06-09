# PILAR-2b — Canonical Data Verification Plan (manual)

Goal: confirm every chemical parameter that feeds the biogas calculation is (a) sourced
from a DOI that actually resolves to the claimed paper, and (b) numerically defensible
against the literature. Output = corrected `feedstocks.yaml` + `references.yaml`, then a
single regeneration of all downstream layers.

**Golden rule:** edit ONLY the two YAML files
(`data/canonical_parameters/feedstocks.yaml`, `references.yaml`).
Never hand-edit SQL migrations / Python configs / TS constants — they are generated.

---

## Phase 0 — Setup (once)

1. Build the master worksheet. Export one row per (feedstock × parameter) from
   `feedstocks.yaml`. Columns:
   `code | param (bmp/ts/vs_of_ts/cn_ratio/ch4_pct) | min | medio | max | cite_key(s) | DOI | verified? | paper_ok? | value_in_paper | range_ok? | action | notes`
2. Build the reference worksheet from `references.yaml`:
   `cite_key | authors | year | title | doi | url | verified | RESOLVES_TO_CORRECT_PAPER? | notes`
3. Note the **three code namespaces** (so you don't get lost):
   - canonical YAML / migrations: `BAGACO`, `VINHACA`, `DEJETOS_BOVINO`…
   - DB `residuos.codigo` (app key): `bagaco_cana`, `vinhaca_cana`, `dejetos_bovinos_liquidos`…
   - DB `residuos.scientific_code`: `AG_CANA_001`, `PC_BOV_001`…
   Maintain a `canonical_code → codigo` mapping column; you will need it to push corrections to prod.

---

## Phase 1 — Prioritize (do the high-impact feedstocks first)

You don't need all 26 at once. Rank by contribution to the SP biogas total, verify top-down.
Get the ranking from the forward engine output:

```bash
# on VM or locally, against the cp2b DB
psql "$DATABASE_URL" -P pager=off -c \
 "SELECT codigo, nome, bmp_medio FROM residuos ORDER BY bmp_medio DESC;"
# and cross-check against the SP totals script output:
#   backend/scripts/compute_sp_canonical_totals.py  (per-feedstock GWh contribution)
```

Suggested priority tiers (biogas-dominant in SP):
- **Tier 1 (verify first):** BAGACO, PALHA, VINHACA, TORTA_FILTRO (sugarcane complex),
  DEJETOS_BOVINO, DEJETOS_SUINO, DEJETOS_AVES (livestock), FORSU/ORGANICO_RSU (urban).
- **Tier 2:** citrus (CASCAS_CITROS…), coffee (CASCA/POLPA/MUCILAGEM_CAFE), soy, corn residues.
- **Tier 3:** the remainder (ETE sludges, abattoir, dairy whey, yeast, etc.).

---

## Phase 2 — Reference / DOI audit (fixes the "misfiring URLs")

For EACH `cite_key` used by a Tier-1/2 feedstock:

1. Open `https://doi.org/<doi>` from `references.yaml`.
2. Confirm the resolved paper's **authors + year + title** match the YAML entry.
   - ✅ match → set `verified: true`.
   - ❌ wrong paper / dead DOI → find the correct DOI (Google Scholar / Crossref search by
     title+author), replace `doi:` and `url:`, then set `verified: true`. Record the old/new
     DOI in `notes`.
   - ⚠️ paper exists but does NOT contain the cited number → flag in worksheet
     `paper_ok = NO`; this feeds Phase 3 (the value itself is suspect).
3. Any reference with `verified: false` that you cannot confirm → do NOT use it as a primary
   ref; downgrade or replace.

**Rule:** a parameter value is only trustworthy when at least **2 independent verified refs**
support it (the YAML convention already asks for ≥2 refs/parameter).

---

## Phase 3 — Parameter value verification (the science)

For each (feedstock × parameter) in priority order, open the verified primary ref and confirm
the number, then sanity-check against these literature guard-rails:

| Parameter | Typical defensible range | Red flag if… |
|---|---|---|
| BMP (NmL CH₄/gVS) | lignocellulosic 80–250; manures 90–340; OFMSW/FORSU 200–450; fats/whey 300–900 | placeholder-looking round numbers (e.g. exactly 100/200/300); > 1000 |
| TS (% wet wt) | slurries 1–10; manures fresh 15–35; straws/bagasse 30–90; whey ~6 | TS > 95 for a wet residue; TS < 1 |
| VS (% of TS) | 70–97 for most biomass; lower for ash-rich (rice husk, poultry litter) | VS > 99; VS < 40 without justification |
| CH₄ % | 50–65 (AD biogas) | < 45 or > 70 |
| C/N | 15–35 ideal; manures 6–20; straws 50–120 | negative / zero; > 200 |

Checklist per parameter:
- [ ] min ≤ medio ≤ max and the spread reflects real study variance (not invented).
- [ ] medio traces to a *specific table/figure* in a verified ref (note page/table in worksheet).
- [ ] units match the YAML convention (BMP = NmL/gVS dry basis; TS = %wet; vs_of_ts = %ofTS).
- [ ] decision in `action`: KEEP / EDIT(new value) / NEEDS-MORE-SOURCES.

Watch especially for the items migration 015 already flagged as placeholders
(FORSU/ORGANICO_RSU underestimate; DEJETOS_*; ESTERCO_*) — re-derive these from the
Mata-Alvarez 2014 / Møller 2004 / Abouelenien 2014 refs cited in `015_correct_bmp_parameters.sql`.

---

## Phase 4 — Apply corrections (single regeneration)

1. Edit values/refs in the two YAML files only. Keep `verified: true` honest.
2. Regenerate all downstream layers:
   ```bash
   cd cp2b-workspace/NewLook/backend   # (or repo root, per the script header)
   python scripts/generate_from_canonical.py
   ```
   This rewrites the SQL migration(s), Python config, TS constants, and FDE JSON in lockstep.
3. **Fix the code-scheme bug before prod apply:** the generator currently emits canonical
   codes (`BAGACO`) but production `residuos.codigo` uses slugs (`bagaco_cana`). Either
   (a) make the generator emit the DB `codigo` using your Phase-0 mapping, or
   (b) post-process the generated SQL through the mapping. Confirm a dry run UPDATEs > 0 rows:
   ```bash
   psql "$DATABASE_URL" -c "SELECT codigo FROM residuos WHERE codigo = 'bagaco_cana';"  # must exist
   ```

---

## Phase 5 — Benchmark & validate (before trusting prod numbers)

1. Run the existing validators:
   ```bash
   python scripts/validate_fde_traceability.py
   python -m pytest tests/unit/test_canonical_parameters.py -q
   ```
2. Recompute SP totals and diff against the previous run:
   ```bash
   python scripts/compute_sp_canonical_totals.py   # compare per-feedstock GWh before/after
   ```
   Expect changes ONLY where you edited a value; investigate any unexpected movement.
3. Spot-check 3–5 municipalities in the UI calculator vs a hand calculation
   (BMP × VS × tonnage × availability × η) to confirm the chain is consistent.
4. Only after validators pass + totals reconcile: apply the corrected migration to prod and
   re-run the row-count check (every UPDATE should report `UPDATE 1`, not `UPDATE 0`).

---

## Tracking

- Keep the worksheet authoritative; commit it alongside YAML edits.
- One commit per tier (e.g. "verify(canonical): Tier 1 sugarcane+livestock BMP/DOIs") so
  review is reviewable and reversible.
- Cross-refs: see `docs/data/PARAMETER_CITATIONS.md`, `docs/data/FDE_TRACEABILITY_MATRIX.md`,
  `docs/data/SCIENTIFIC_AUDIT_REPORT.md`.
