# FIESP/Amplun Biometano Benchmark — Source-of-Record Extraction

**Document audited:** *"O Biometano em São Paulo: Potencial e Medidas para Alavancar a Produção — Relatório Técnico"*
**Date:** Junho de 2025
**Authorship:** Estudo desenvolvido por **Instituto 17 + PSR + Amplun Biogás** (consórcio executor),
encomendado/publicado pela **FIESP** (Federação das Indústrias do Estado de São Paulo) e parceiros
(CIESP, SIMA/SEMIL, ABREMA e associações setoriais).
**Period of study:** Ago/2024 – Ago/2025.
**Nature:** Scanned/image PDF (no text layer). Extracted by rendering each page with PyMuPDF and
reading visually. Page numbers below are the document's printed page numbers (≈ physical page index).

> Every value in this file is tagged with its FIESP page/table. This file is the audited
> source-of-record; the audit report and any parameter recalibration cite back to it.
> Where FIESP's own numbers are ambiguous or rest on a non-public source, this is flagged
> explicitly — those items are **not** silently propagated into the model.

---

## 1. Scope of the FIESP study (vs Pilar-2b)

FIESP's supply estimate is **deliberately narrow and plant-anchored**, not a full theoretical
inventory. It covers only:

1. **Resíduos da indústria sucroenergética** — vinhaça, torta de filtro, bagaço de cana
   (from the **146 usinas** in operation in SP).
2. **RSU em aterros sanitários** — landfill biogas from the organic fraction (FORSU), via the
   **IPCC (2006)** first-order methane-generation model.

It does **NOT** separately quantify livestock manure (cattle/swine/poultry), coffee, citrus, soy,
corn, sewage sludge, slaughterhouse, or pruning residues — all of which Pilar-2b already covers.
**FIESP is therefore narrower than Pilar-2b**, but more tightly calibrated (plant-by-plant) on the
two classes it does cover. (FIESP §1.1–1.3, PDF1 p.16–29.)

---

## 2. Sugar-energy residue factors — **Tabela 5** (FIESP PDF1 p.23)

> *"Tabela 5. Fatores utilizados para a geração de resíduos e efluentes e o potencial de produção de biogás."*
> Source line under table: **CH4 SOLUTIONS, 2020; OLIVEIRA et al., 2023; REGO; HERNÁNDEZ, 2006; UNIDO.**

| Resíduo industrial | Uso ao longo do ano | Fator de produção de resíduo | Fator de produção de biogás | Fator de produção de biometano | Teor de CH₄ no biogás |
|---|---|---|---|---|---|
| **Vinhaça** | 226 dias (100% de uso) | 0,8 m³ / t de cana processada | **17,68 Nm³ / t de cana processada** | – | – |
| **Torta de filtro** | 365 dias (100% de uso) | 0,03 m³ / t de cana processada (≈30 kg/t) | **84,41 Nm³ / t** *(see ⚠️ below)* | – | **53 %** |
| **Bagaço de cana** | 365 dias (**30% de uso**) | 250 kg / t de cana processada | – | **106 Nm³ biometano / t de bagaço** | – |

**Footnotes transcribed:**
- \* Whether cane goes to ethanol or sugar depends on cane quality.
- \*\* For parametrisation and comparison with the landfill route, biogas/biomethane production is
  also diluted over 365 days/year.
- \*\*\* **30 kg de resíduo de torta de filtro por tonelada de cana moída.**
- \*\*\*\* **13 toneladas de cana-de-açúcar geram 10 m³ de vinhaça** (⇒ ~0,77 m³/t ≈ 0,8 m³/t).

### ⚠️ Ambiguities to resolve before propagating (per project rule "ask if FIESP is ambiguous")
- **Torta de filtro "84,41 Nm³/t"**: the column header reads "Nm³/t de cana processada", but
  84,41 Nm³ of biogas from only 0,03 m³ (30 kg) of cake per tonne of cane is physically implausible
  *per tonne of cane* (≈2 800 Nm³/m³ cake). It is almost certainly **84,41 Nm³ per tonne of filter
  cake** ⇒ ~**2,53 Nm³/t cane** (0,030 × 84,41). **Flagged for user confirmation.**
- **Bagaço "30% de uso"** mirrors Pilar's `FCo` concept (only the surplus not sent to cogeneration
  is available). Net per tonne of cane ≈ 0,250 t × 30% × 106 ≈ **7,95 Nm³ biometano / t cane**.
- **Vinhaça 17,68 Nm³/t cane** is read as gross biogas per tonne of cane (consistent with the
  0,8 m³/t residue factor). Methane content not given in the row (use ~55–60% typical).

### Provenance caveat (transparency weakness in FIESP itself)
The Tabela 5 yields trace primarily to **"CH4 SOLUTIONS, 2020 — Documentos internos"** (an internal
proprietary report, Castro-PR; **no public URL/DOI**). These specific per-tonne yields are therefore
**not independently verifiable** and must be treated as `[MISSING_SOURCE — proprietary]` when imported.
The corroborating public sources are OLIVEIRA et al. 2023 (GEO Biogás & Carbon report) and UNIDO.

---

## 3. Auxiliary sugar-energy tables

- **Tabela 4 (p.23):** share of cane destined to ethanol vs sugar, by mesoregion (e.g. Araçatuba
  60%/40%, Ribeirão Preto 87%/13%, São José do Rio Preto 49%/51%). Source: UNICA 2024.
- **Tabela 6 (p.24):** fortnightly cane-processing seasonality distribution by mesoregion
  (safra 20–21 to 23–24). Source: UNICA 2024.
- **Tabela 7 (p.25):** cane processed (last 6 safras avg) + vinhaça/torta potential by mesoregion.
  TOTAL cane processed ≈ **344 610 000 t**; safra duration ~226 days avg. Source: UNICA.
  (Confirms vinhaça "0,8 m³/t" via the "13 t cane → 10 m³ vinhaça" footnote.)

---

## 4. Landfill (RSU) methane model — **IPCC (2006)** (FIESP PDF1 p.26–28)

Base equation (FIESP eq., p.26):

```
L0 = MCF · DOC · DOCf · F · (4/3) · (1/dCH4)
```
- **L0** — methane generation potential
- **MCF** — methane correction factor (landfill management quality, 0–1)
- **DOC** — degradable organic carbon in RSU
- **DOCf** — fraction of DOC that decomposes = **0,014 · T · 0,28**
- **F** — fraction of methane in landfill gas
- **dCH4** — methane density

**Tabela 8 (p.27) — parameters used for the adequately-landfilled FORSU route:**

| L0 | MCF | F | T (°C) | % biogás no aterro | % metano | densidade CH₄ (t CH₄/m³) | fator de conversão |
|---|---|---|---|---|---|---|---|
| **47,24** | **1** | **0,5 (50%)** | **20** | **70 %** | **50 %** | **0,0007168** | **21,21** |

- `DOCf = 0,014 × 20 × 0,28` (T = 20 °C annual avg). Source: IPCC (2006).
- `dCH4 = 0,0007168 t CH₄/m³` — **CANDIANI; DA SILVA, 2012**.
- F = 0,5 (50%) — ABRELPE e ABIOGÁS 2018b.
- MCF = 1 for adequately-managed sanitary landfills (IPCC 2006).

**Tabela 9 (p.28) — DOCf by waste composition** (`DOC = Σ DOCi · Wi`):

| Categoria | Fração na caracterização do resíduo | DOC por tipo |
|---|---|---|
| A – Papel e papelão | 11,40 % | 0,4 |
| B – Resíduos orgânicos de parques/jardins | 0,00 % | 0,17 |
| C – Restos de alimentos | 41,50 % | 0,15 |
| D – Tecido | 5,60 % | 0,4 |
| E – Madeira | 0,00 % | 0,3 |

Source: ABRELPE, 2020; IPCC, 2006. Data quality caveat (FIESP footnote): SP landfill RSU
characterisation drew on the few studies available (~625,29 t/dia adequately landfilled basis).

---

## 5. Headline supply results

### Tabela 10 / Figura 3 (PDF1 p.29–30) — **total potential (futuro + já realizado)**

| Métrica | Valor |
|---|---|
| Potencial de **biogás** | **4 266 147 mil Nm³/ano** = **11 694 mil Nm³/dia ≈ 11,7 Mm³/d** |
| Potencial de **biometano** | **2 337 463 mil Nm³/ano** = **6 404 mil Nm³/dia ≈ 6,4 Mm³/d** |
| Número de plantas | **181** |

Top mesoregions: **Ribeirão Preto 32,3%** and **São José do Rio Preto 24%** of biogas+biomethane
potential (sugar-energy heartland). (FIESP p.30, Figura 3.)

### Tabela 11 (PDF1 p.31) — scenarios on the same supply base

| Cenário | Descrição | Biometano anual | Biometano médio diário | Plantas |
|---|---|---|---|---|
| **Cenário 1** | Todo o biogás convertido a biometano | 2 337 463 mil Nm³/ano | **6 403 940 Nm³/dia ≈ 6,4 Mm³/d** | 181 |
| **Cenário 2** | Descontando o biogás já usado p/ energia elétrica (≈84% sucroenergético, ≈85% aterros) | 1 724 526 mil Nm³/ano | **4 752 811 Nm³/dia ≈ 4,75 Mm³/d** | 158 |

### Tabela 12 (PDF1 p.31) — by gas-distribution concession (Cenário 1)
COMGÁS ~49 %, NATURGY ~5 %, NECTA ~14 % … TOTAL 2 337 405 692 Nm³/ano (média 6 403 985 Nm³/dia).

### Cross-check (FIESP §1.3, p.28–29, and Conclusões)
> *"…o potencial total de biogás estimado do Estado, a partir de resíduos sanitários, foi de
> 4,3 bilhões Nm³/ano de biogás ou 2,3 bilhões Nm³/ano de Biometano. Esse potencial em volume
> médio diário de biometano seria de 6,4 milhões de Nm³/dia."*
Corroborated against **Instituto 17 (2021): ~4,2 bilhões Nm³/ano de biogás** (sucroenergético + RSU).

---

## 6. Comparison anchor for Pilar-2b

| Quantity | FIESP 2025 (sugar+landfill only) | Pilar-2b current (all feedstocks) |
|---|---|---|
| Biogás (Mm³/d) | **11,7** (total) / discounted scenario lower | min 1,32 · medio 6,39 · max 25,78 |
| Biometano (Mm³/d) | **6,4** (Cenário 1) / **4,75** (Cenário 2) | min 0,71 · medio 3,46 · max 14,02 |
| Plants/coverage | 181 plants, plant-anchored, 2 feedstock classes | 26 feedstocks, statistical/forward |
| Validation | calibrated to 146 real usinas + aterros | FDE audited; 11 regression guards |

**Interpretation:** FIESP's 6,4 Mm³/d biometano corresponds to **sugar-energy + landfill only**,
plant-anchored and near-term. Pilar-2b's all-feedstock `medio` biomethane (3,46) is lower because
it applies conservative FDE over many dispersed residues; the FIESP-comparable subset of Pilar
(sugar-energy + FORSU only) is the correct apples-to-apples target and should land near 6,4 Mm³/d.

---

## 7. FIESP reference style (for Task 5 / ingestion)

FIESP §8 (PDF2 p.80–84) lists ~80 references — overwhelmingly **Brazilian institutional/agency
reports with landing-page URLs** (ANP, ARSESP, CONSEGÁS, BCB, EPE, IBGE, CETESB, ABIOGÁS, FGV,
FIPE, UNICA, ABRELPE, Biogás Danmark, IEA, EBA…), plus a handful of academic items. **No academic
DOIs underpin the core supply factors** — those rest on CH4 SOLUTIONS 2020 (internal) + IPCC 2006.
The biogas/biomethane-relevant FIESP references worth ingesting into Pilar's database (with their
public URLs) are enumerated in the audit report and added to `references.yaml` as `fiesp2025_*`.
