# Canonical Reference Corpus — unified from `scientific_references` (399)

**Source:** Supabase `scientific_references` (full export, 398 rows, ids→400).
**Pipeline:** `backend/scripts/unify_references.py` (deterministic clean + unify + dedupe + flag).
**Outputs:**
- `data/canonical_parameters/references_unified.csv` — 367 unique refs
- `data/quarantine/feedstock_bmp_from_refs.csv` — agregado BMP em quarentena; uso paramétrico suspenso

## Corpus health (367 unique refs)
| Metric | Value |
|---|---|
| With direct URL | **363 / 367 (99%)** |
| Missing URL (`needs_url`) | 4 |
| Peer-reviewed | 294 |
| **DOI reused across ≥2 residues (suspect)** | **18** — must verify/repair |
| Distinct feedstocks covered | 29 |

The `url` is the operative access field; 99% resolve directly. The 18 `suspect_doi_reuse`
rows are the residual wrong-DOI defect (e.g. a sludge DOI `10.1007/s41207-022-00264-z`
attached to bagaço id 40; an eucalyptus DOI on coffee id 13) — flagged in the
`suspect_doi_reuse` column, not auto-changed.

## Empirical BMP vs canonical `feedstocks.yaml` (mL CH₄ / g VS)
Mined from 196 BMP observations in `notes` across 24 feedstocks. Medians corroborate the model:

| Feedstock | refs BMP (min–max, **median**) | feedstocks.yaml medio | verdict |
|---|---|---|---|
| BAGACO | 44–236 (**192**) | 165 | ✓ consistent |
| PALHA | 130–605 (**294**) | 175 | refs higher (pretreated incl.) |
| VINHACA | 49–968 (**180**) | 90 | refs higher; wide (co-dig) |
| TORTA_FILTRO | 93–861 (**365**) | 280 | ✓ consistent |
| FORSU | 380–655 (**472**) | 310 | refs higher |
| DEJETOS_SUINO | 73–340 (**265**) | 235 | ✓ consistent |
| CAMA_AVIARIO | 300 | 280 | ✓ |
| GORDURA | 800–918 (**859**) | 850 | ✓ |
| PALHA_MILHO | 44–725 (**390**) | 230 | refs higher |
| SORO_QUEIJO | 101–861 (**454**) | (new) | not yet in model |

Wide ranges reflect co-digestion / pretreatment studies; medians are the comparison anchor.
Outliers flagged in source `notes` (e.g. DEJETOS_AVES 508 "OUTLIER… not representative of SP").

## Next
1. Repair the 18 `suspect_doi_reuse` (verify real DOI/URL per row — no guessing).
2. Adopt empirical medians where they strengthen `feedstocks.yaml`; document each change.
3. Recompute the 4 scenarios; produce the FIESP comparison (Pilar 31 residues / 4 sectors /
   367 peer-reviewed refs vs FIESP cana+aterro only).
