# PILAR-2b — Paper Data Verification

**Manuscript:** *PILAR-2b: Open-Source Spatial Decision Support Platform for Regional Biogas Potential Assessment* (CEUS draft)
**Verified against:** live PostgreSQL `cp2b_maps` (Docker), canonical exports in `analysis/paper_verification/`, spatial file `sp_spatial_concentration_2026-08-01.json`, LISA/cluster outputs, and `analysis/paper_figures/ANALISES_PARA_O_PAPER.md`.
**Date:** 2026-08-13 · **DB reconciles to git SHA** `e08da91` (canonical export)

---

## 0. Verdict

The manuscript's **quantitative core is sound** — every headline number and the full correction-factor cascade reproduce exactly from the live database. The work needed before submission is **consistency and provenance**, not recomputation:

- ✅ **34 numeric claims verified exact** against the DB / exports.
- ⚠️ **6 items need updating** — mostly internal inconsistencies (MapBiomas collection, reference year, license, Supabase wording) and one **stale exported file** (`cluster_analysis.csv`).
- ❓ **2 headline numbers could not be located** in the repo and need their source computation (infra 32.9/37.8/14.1 split; 91.4% population coverage).

---

## 1. Headline totals — ✅ ALL EXACT

| Claim (paper) | Paper value | DB / export value | Status |
|---|---|---|---|
| Theoretical potential | 19.90 bi Nm³ CH₄/yr = 54.52 M m³/day | 19,900,698,323 → 54.52 M/day | ✅ |
| **Real (practical)** | 7.83 bi/yr = **21.46 M m³/day = 39.36%** | 7,832,143,834 → 21.46 M/day; 7.83/19.90 = 39.36% | ✅ |
| Second scenario (Ideal) | 26.96 M m³/day = 49.45% | 9,841,178,207/365 = 26.96 M/day; 49.45% | ✅ |
| Municipalities | 645 | 645 | ✅ |
| Published range (biomethane) | 8.2–42.5 M Nm³/day | Instituto 17 8.20 … GEF 42.5 (espectro CSV) | ✅ |
| Installed/contracted capacity | ~0.4 M Nm³/day | ANP 2024 operante 0.40 | ✅ |

## 2. Feedstock shares (Real scenario) — ✅ EXACT

| Stream | Paper | DB share of 7.83 bi | Status |
|---|---|---|---|
| Sugarcane | 57.0% | 4.4677/7.832 = 57.0% | ✅ |
| Cattle manure | 15.7% | 15.65% | ✅ |
| Maize | 7.0% | 6.95% | ✅ |
| Soy | 6.2% | 6.25% | ✅ |
| Urban solid waste | 5.1% | 5.08% (rsu) | ✅ |

## 3. Correction-factor table (Table 3) — ✅ EXACT (1 nit)

FC×FCo×FS×FL products all reproduce: Bagasse 7.7%, Vinasse 11.5%, Cattle 14.9%, Citrus 16.2%, FORSU 42.1%, Primary sludge 54.5%. **Nit:** Straw computes to **6.50%**, table says **6.6%** — round to 6.5%.

## 4. Spatial concentration — ✅ EXACT

| Claim | Paper | Source value | Status |
|---|---|---|---|
| Gini | 0.5105 | 0.51046 (recomputed live: 0.5105) | ✅ |
| 5 leading intermediate regions | 60.86% | 17.82+13.88+9.92+9.72+9.51 = 60.86% | ✅ |
| Municipal range | 5,917× (66 → 390,490 m³/day) | Águas de S. Pedro 65.99; São Paulo 390,490 | ✅ |
| São Paulo urban share | 99.9% | urban sector 142.42M/142.53M = 99.9% | ✅ |
| Industrial tier (≥50k m³/day) | 132 muns = 20.5%, hold 54.8% | 132; 20.47%; 54.83% | ✅ |
| Screening set | 193 muns = 29.9%, hold 67% | 193; 29.92%; threshold 0.67 | ✅ |

## 5. Clustering & spatial autocorrelation — ⚠️ paper OK, **one exported file stale**

| Claim | Paper | Source | Status |
|---|---|---|---|
| Silhouette peak | k=3 (0.539) | ANALISES doc: 3→0.539 max | ✅ (matches analysis doc) |
| Typologies | 353 / 224 / 68 | ANALISES: cana+bov 353, bov+milho 224, RSU+esgoto 68 | ✅ (matches analysis doc) |
| Moran's I | 0.6261 (p=0.001) | ANALISES doc: 0.6261 | ✅ |
| High-High municipalities | 89, holding 24.1% | LISA file: 89 HH | ✅ (count); 24.1% not re-summed |

> ⚠️ **STALE FILE:** `analysis/outputs/cluster_analysis.csv` is a **k=4** run (sizes 599/36/9/1) built on **legacy GWh** data (May). It does **not** match the paper's k=3. The paper is consistent with the *newer* `paper_figures` analysis, but a reviewer opening the committed CSV will see a contradiction. **Regenerate `cluster_analysis.csv` to the k=3 run** (or remove it).

## 6. Verification section — ✅ where reproducible

| Claim | Paper | Source | Status |
|---|---|---|---|
| Screening model R² | 0.650 | ANALISES doc: R² = 0.650 | ✅ |
| MapBiomas join resolves | 580 of 645 | ANALISES doc: 580/645 by name | ✅ |
| 13 residue streams | thirteen | export has exactly 13 streams | ✅ |
| State-level land-cover divergence | 6.5% sugarcane / 4.1% soy | in audit docs (A18, A_distancia) — not re-run here | ◑ documented, not re-verified |
| Internal 3-point consistency | 645/645, no fallbacks | export reconciles engine=loader=sum | ✅ |

> ⚠️ **"Eleven of the thirteen residue streams more spatially concentrated than the aggregate":** by **Gini**, live recompute shows **all 13** streams are more unequal than the 0.5105 aggregate. The paper's "11 of 13" is a **spatial (Moran's I per stream)** claim, not Gini — it needs the per-stream Moran's I run to confirm. **Clarify the metric and re-verify the count of 11.**

## 7. Software / architecture — ✅ versions EXACT, ⚠️ one wording fix

| Claim | Paper | Repo | Status |
|---|---|---|---|
| Next.js | 16.2.6 | package.json ^16.2.6 | ✅ |
| Leaflet / React-Leaflet | 1.9.4 / 4.2.1 | ^1.9.4 / ^4.2.1 | ✅ |
| FastAPI / Python | 0.136.1 / 3.11 | 0.136.1 / 3.11.14 | ✅ |
| PostgreSQL / PostGIS | 15 / 3.4 | postgis:15-3.4 | ✅ |
| Response time | 8.2 s → sub-3 s | live benchmark: 17–23 ms | ✅ (well under 3 s) |

> ⚠️ **Supabase wording:** Methods say the persistence layer is *"hosted on Supabase."* Current architecture is **institutional VM + local PostgreSQL/PostGIS**, with Supabase as a **backup mirror** (live benchmark shows the Supabase path at 1569 ms vs 23 ms local). Update the sentence to reflect VM-primary / Supabase-backup.

---

## 8. ⚠️ ITEMS TO UPDATE BEFORE SUBMISSION

1. **`cluster_analysis.csv` is stale (k=4, legacy GWh).** Regenerate to the paper's k=3 run so the companion data matches the text. *(§5)*
2. **MapBiomas collection is internally inconsistent:** Table 2 says **Collection 10.0**, body text says **Collection 10.1**; `METADATA.json` separately flags **code = Collection 8.0** and supplement = 9. **State one collection everywhere.**
3. **Reference-year inconsistency:** Table 2 + its note say agricultural & livestock = **2023**; body §Data-integration says *"agricultural and livestock surveys for 2024."* Reference `IBGE 2023a` also cites *"Censo agropecuário 2022."* **Fix crop vs livestock reference years to one consistent set.**
4. **License:** Abstract says platform + dataset *"under GPL 3.0."* The dataset (REDU deposit) is **CC BY 4.0**; GPL 3.0 applies to the **code**. **Separate the two licenses.**
5. **Supabase methods wording** (see §7).
6. **Straw availability 6.6% → 6.5%** (Table 3 rounding). *(§3)*

## 9. ❓ COULD NOT LOCATE IN REPO — provide source / regenerate

1. **Infrastructure bivariate split** — Abstract & Conclusion: *"within 50 km, 32.9% reach both gas and electricity, 37.8% electricity alone, 14.1% beyond both."* The repo has only the **gas-only** distance table (47.4% within 50 km of gas). The **gas × electricity cross (32.9 / 37.8 / 14.1)** is not in any committed file. **Locate or regenerate the bivariate infrastructure computation.**
2. **91.4% population coverage** by the three primary sources — cited in Abstract, Results and Conclusion; **not found** in any doc or script. **Provide the computation.**

## 10. External / literature figures (not our computed data — cite sources only)

248,000 km² state area; 54% national sugarcane; 146 mills (7 with biogas projects); 6.8 M cattle head; ~40,000 t/day MSW; 226-day harvest; 38 landfills / 15 capture / ~47 units; Law 14.993/2024. These are attributed to IBGE/UNICA/SNIS/FIESP/CIBiogás and are outside the PILAR-2b dataset — verify only that citations are current.

---

### Files backing this verification (in `analysis/paper_verification/`)
- `645_municipalities_all_scenarios.csv` — full per-municipality basis (98 cols)
- `state_totals_by_scenario.csv` — per-stream Theoretical/Real/Ideal
- `intermediate_region_scenarios.csv` — 11 SP regions (top-5 = 60.86%)
- `PILAR2b_paper_verification.xlsx` — consolidated workbook
- `VERIFICATION_MANIFEST.json` — headline totals + provenance
