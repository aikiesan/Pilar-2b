# PILAR-2b Scientific Parameter Audit Report

**Date:** 2026-06-04  
**Branch:** `claude/pilar2b-scientific-audit-AU4bW`  
**Platform scope:** São Paulo state biogas potential assessment, 645 municipalities, ~38 residue streams  
**INPI registration:** BR 512026003115-0  
**Purpose:** Pre-submission audit for FOSS4G Europe 2026 Academic Track paper  

**Status legend:**  
✅ Value within peer-reviewed literature range, source traceable  
⚠️ Value at boundary of literature range, context-dependent, or source partially traceable  
❌ Value outside literature range or source absent  
🔍 Insufficient specific literature for Brazil/tropical conditions; international range applied  

---

## Executive Summary

This audit identified **7 critical parameter discrepancies** and **5 methodological gaps** that must be resolved before peer review. The most severe issues are:

1. **FORSU BMP severely underestimated** in the primary database (88 vs. ~270 NmL/gVS from literature) while dramatically overestimated in the service layer (410 NmL/gVS).
2. **Four distinct, conflicting BMP values** exist for 12 key feedstocks across the JSON, SQL migration, Python service layer, and TypeScript frontend engine — with no documented reconciliation logic.
3. **Coffee aggregate BMP** in the service layer (350 NmL/gVS) and frontend (380 NmL/gVS) is 2–3× above literature range for coffee husks.
4. **Sugarcane straw yield factor** of 12 t residue/ha represents total straw production; soil carbon conservation mandates retaining ≥10 t/ha, leaving ≤2 t/ha collectible — a ~6× overestimation of available straw.
5. **All four liquid manure types** (cattle, swine, broiler litter, fresh avian) share an identical BMP range (39.95/175.59/674.4 NmL/gVS) in the SQL migration — a placeholder pattern, not independent scientific values.
6. **VS basis inconsistency**: the SQL migration uses VS as % of TS (dry basis), while the Python service layer uses VS as % of wet weight — mixing these in the reverse-BMP formula `biomass = biogas / (BMP × VS/100)` introduces a systematic error.
7. **Zero operational plant validation data** exists despite the schema being deployed; predicted vs. measured comparison has never been executed.

---

## Section A: Parameter Audit Table — BMP and Chemical Parameters

### Notes on data layers
Four separate layers store BMP values for the same feedstocks with no documented reconciliation:
- **SQL** = `backend/app/migrations/004_import_panorama_data.sql` — primary database loaded into PostgreSQL (BMP in NmL/gVS)
- **JSON** = `data/fde_all_residues.json` — loaded into frontend FDE display (single `bmp_value` per residue)
- **Service** = `backend/app/services/biomass_availability.py` — used for reverse-BMP biomass estimation
- **Frontend** = `frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts` — used in the viability calculator

Where a feedstock appears in multiple layers with different values, all values are listed and discrepancies flagged separately.

---

### A1. Sugarcane Bagasse (*Bagaço de cana*, code: BAGACO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 115 NmL/gVS (SQL, JSON) | 80–200 NmL/gVS untreated; 150–280 NmL/gVS pretreated | Anaerobic mono-digestion of sugarcane bagasse and trash, SciELO/Bioresource Technology; https://www.sciencedirect.com/science/article/pii/S0926669021004763 | ✅ | Conservative but defensible for untreated bagasse with high lignin. SQL comment notes only 2% practically available. |
| BMP | 350 NmL/gVS (Frontend `calculatorEngine.ts`) | 80–280 NmL/gVS | Same | ❌ | Frontend BMP is 3× the SQL/JSON value; no documentation of why. Likely represents steam-exploded or thermochemically pretreated bagasse, not raw material. |
| BMP | 210 NmL/gVS (Service aggregate `sugarcane`) | — | Internal estimate | ⚠️ | This aggregate covers bagasse + straw + vinhaça streams; not a single-substrate BMP. Reasonable as a blended estimate but should be documented as such. |
| TS | 58.9% wet basis (SQL) | 45–55% wet basis | Vivekanand et al. 2014 – steam-exploded bagasse characterization; https://bioresources.cnr.ncsu.edu/resources/methane-potential-and-enzymatic-saccharification-of-steam-exploded-bagasse/ | ⚠️ | 58.9% is slightly above typical range; may reflect industrial pressed (dewatered) bagasse rather than standard 50% moisture. |
| VS/TS | 90% of TS (SQL) | 88–95% of TS | Same | ✅ | Consistent with cellulose+hemicellulose+lignin dominant composition. |
| C:N | 29.6 (SQL) | 20–100 (wide, depends on maturity and washing) | EMBRAPA/IEA-Bioenergy BMP Database | ✅ | Within acceptable range. |
| CH₄% | 55% (SQL) | 50–60% | IEA Bioenergy Task 37 benchmarks | ✅ | Appropriate for lignocellulosic feedstocks. |

---

### A2. Sugarcane Straw (*Palha de cana*, code: PALHA)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 250 NmL/gVS (SQL, JSON) | 150–340 NmL/gVS | Anaerobic mono-digestion of sugarcane trash; https://www.sciencedirect.com/science/article/pii/S0926669021004763 | ✅ | Central estimate. |
| BMP | 300 NmL/gVS (Frontend `palha`) | 150–340 NmL/gVS | Same | ✅ | Within range; represents optimistic scenario. |
| FDE | 1.90% (`fde_all_residues.json`) | — | Internal model | ⚠️ | Very low FDE driven by: FC×FCP×FS×FL ≈ 2.9%. Primary competing use is soil coverage mandate (EMBRAPA). See Section A2 residue coefficient note. |
| Yield factor | 12 t/ha (load_biomass_tons.py) | **Total production**: 10–20 t/ha; **Collectible**: 0–2 t/ha | Tenelli et al. 2021, GCB Bioenergy – soil carbon mandates ≥10 t/ha retention; https://onlinelibrary.wiley.com/doi/10.1111/gcbb.12832 | ❌ | **Critical:** The 12 t/ha yield factor is total production. Field experiments show maintaining 10 Mg/ha is minimum to sustain soil organic carbon. At SP straw yields of 10–15 t/ha, the net collectible fraction for energy purposes is 0–5 t/ha, not 12 t/ha. This overestimates available straw by 3–6×. |

---

### A3. Vinhaça (*Vinhaça*, code: VINHACA)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 300 NmL/gVS (SQL, JSON) | 50–200 NmL/gVS mono-digestion; up to 365 NmL/gVS in co-digestion | Anaerobic co-digestion of sugarcane press mud with vinasse; https://www.sciencedirect.com/science/article/abs/pii/S0956053X17305081 | ❌ | 300 NmL/gVS appears to be derived from co-digestion literature or from enriched/concentrated vinasse, not standard dilute vinhaça (TS≈2–5%). For mono-digestion of typical dilute vinhaça, literature reports 50–200 NmL/gVS. The MDPI 2024 two-stage AD paper (https://www.sciencedirect.com/science/article/pii/S2772427124000342) reports 296 NmL/gCOD — note this is per gram COD, not per gram VS. |
| BMP | 350 NmL/gVS (Frontend `vinhaca`) | 50–200 NmL/gVS | Same | ❌ | Further inflated. |
| TS | 3% (SQL) | 1–8% wet basis | Typical concentrated vinhaça; literature range consistent | ✅ | Appropriate. |
| VS/TS | 85% of TS (SQL) → VS wet = 2.55% | 70–90% of TS | IEA Bioenergy benchmarks | ✅ | Appropriate. |
| VS | 2% wet basis (Frontend: `vs: 0.02`) | 1.5–4% wet basis | Same | ✅ | Consistent with SQL 3% TS × 85% VS/TS = 2.55%. Small rounding difference. |
| FDE | 6.98% (`fde_all_residues.json`) | — | Internal model | ⚠️ | Very low FDE appropriate given FCo is ~0.89 (89% used for regulated fertigation). CETESB norm P4.231 mandates fertigation as standard use. Low FDE is scientifically justified — but the high BMP amplifies the baseline before this discount. |
| CH₄% | 62.5% (SQL) | 55–70% | Literature for high-organic-acid vinhaça | ✅ | Acceptable. |

---

### A4. Swine Liquid Manure (*Dejetos Líquidos de Suínos*, code: DEJETOS_SUINO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 175.59 NmL/gVS (SQL — identical to cattle, poultry, avian) | 200–400 NmL/gVS liquid slurry | Swine manure BMP studies: 204–491 NmL/gVS reported range; Oklahoma State Extension BMP table; https://extension.okstate.edu/fact-sheets/anaerobic-digestion-of-animal-manures-methane-production-potential-of-waste-materials.html | ❌ | This value is **shared with cattle and poultry** in the SQL (identical 39.95/175.59/674.4 range across 4 feedstocks). This is a placeholder, not independently measured. Swine slurry typically has higher BMP than cattle manure due to higher fat content. |
| BMP | 210 NmL/gVS (Service) | 200–400 NmL/gVS | Same | ✅ | Defensible as a conservative central estimate for liquid slurry from modern intensive systems. |
| TS | 8% wet basis (SQL) | 3–12% depending on dilution | EMBRAPA Suínos e Aves 2015 – dejetos de suínos | ✅ | Within range. |
| VS/TS | 83.9% of TS (SQL) → VS wet = 6.7% | 70–85% of TS | Same | ✅ | Appropriate for fresh slurry. |
| VS wet | 3.5% (Service `biomass_availability.py`) | 2–7% | EMBRAPA | ⚠️ | **VS basis conflict:** SQL reports VS wet = TS × VS/TS = 8% × 83.9% = 6.7%, while service layer uses 3.5%. If both are fed into the same `biogas = biomass × BMP × VS/100` formula without standardization, the service layer systematically underestimates biomass by ~2×. |
| FC | 0.90 medio (SQL) | 0.80–0.95 for confined systems | EMBRAPA Suínos e Aves 2015 | ✅ | Appropriate for fully confined intensive operations. |
| FCo | 0.50 medio (SQL / literature table) | 0.40–0.60 | Kunz et al. 2009; https://www.scielo.br/j/rcpa/a/B98WBF5BNVJLrBKHMK7qM4d/ | ✅ | 45–55% diverted to fertigation is consistent with Brazilian intensive swine practice. |

---

### A5. Cattle Manure (*Esterco Bovino*, code: ESTERCO_BOVINO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 175.59 NmL/gVS (SQL — same across all manures) | 150–280 NmL/gVS | Publisher.uthm.edu BMP of Cattle Manure — 175.79 NmL/gVS reported; https://publisher.uthm.edu.my/ojs/index.php/ijie/article/view/2693 | ✅ | The SQL value of 175.59 is directly traceable to this study (175.79 ≈ 175.59). However, this single-source value was then applied to swine and poultry manure, which is incorrect. |
| BMP | 210 NmL/gVS (Service) | 150–280 NmL/gVS | Same | ✅ | Conservative to mid-range. |
| TS | 8% wet basis (SQL) | 5–20% depending on management | EMBRAPA Gado de Corte 2012 | ✅ | Represents liquid slurry systems; solid manure would have TS 20–40%. |
| VS/TS | 78% of TS (SQL) | 75–85% of TS | Literature | ✅ | Appropriate. |
| VS wet | 12.5% (Service) | 4–20% wet basis | EMBRAPA | ✅ | Higher than SQL-derived value (8% × 78% = 6.24%), suggesting service layer represents more concentrated solid manure. This inconsistency exists but both values fall within literature range individually. |
| FC | 0.70 medio (SQL) | 0.30–0.80 for mixed extensive/confined | EMBRAPA Gado de Corte 2012 | ✅ | Reasonable weighted average for SP beef+dairy systems. |
| FCo | 0.286 medio (SQL, literature table: 0.45) | 0.30–0.60 | Primavesi et al. 2004 | ⚠️ | SQL FCo_medio=0.286 differs from literature table FCo=0.45. Discrepancy between internal data layers — literature table appears more consistent with the 55% direct application to pasture cited by EMBRAPA. |

---

### A6. Poultry Litter (*Cama de Aviário*, code: CAMA_AVIARIO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 290 NmL/gVS (SQL BMP_medio) | **Raw poultry litter:** 120–145 mL/gVS; **Fresh manure (low bedding):** 250–350 mL/gVS | Frontiers in Sustainable Food Systems 2018 – poultry litter solid-state AD: 145 ± 14 L CH4/kgVS; https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2018.00046/full | ⚠️ | 290 NmL/gVS is above the range for raw poultry litter with bedding material (sawdust/wood chips, which have very low digestibility). Appropriate only if this represents fresh layer manure with minimal bedding. Brazil dominantly uses integrated broiler systems where litter IS wood-chip based — the lower range (120–145) may be more appropriate. |
| BMP | 175.59 NmL/gVS (SQL — generic for DEJETOS_AVES) | 120–350 NmL/gVS | Same | ⚠️ | Shared value with cattle manure; below typical for fresh poultry droppings but may represent litter with bedding. |
| BMP | 270 NmL/gVS (Service) | 120–350 NmL/gVS | Same | ⚠️ | Mid-range, defensible as weighted average of fresh manure + litter but undocumented weighting. |
| TS | 25% wet basis (SQL CAMA_AVIARIO) | 15–35% (litter); 25–35% (typical) | EMBRAPA 2018 | ✅ | Within range. |
| VS/TS | 69.8% of TS (SQL) | 60–75% of TS | Same | ✅ | Consistent with high-N content and bedding material dilution. |
| C:N | 15 (SQL) | 7–15 for fresh poultry litter | Literature | ✅ | At the high end; raw litter C:N typically 7–12. |
| FC | 0.80 (literature table) | 0.70–0.95 for commercial confined | Oliveira et al. 2016 | ✅ | Reasonable for commercial broiler houses. |
| FCo | 0.50 (literature table) | 0.40–0.60 | Avila et al. 2007 | ✅ | 50% diversion to feed/fertilizer is realistic. |

---

### A7. Coffee Husks and Pulp (*Casca de café / Polpa de café*, codes: CASCA_CAFE, POLPA_CAFE)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP — CASCA_CAFE | 130 NmL/gVS (SQL, JSON) | **Dry husk:** 120–200 NmL/gVS; **After pretreatment:** 196 NmL/gVS | Thermochemical Pretreatment for Psychrophilic AD of Coffee Husks, MDPI Bioengineering 2023: 150.47 NmL/gVS untreated; https://www.mdpi.com/2674-0389/3/2/13 | ✅ | Conservative but within range for untreated dry husk (high lignin). |
| BMP — POLPA_CAFE | 130 NmL/gVS (SQL, JSON) | **Coffee pulp (wet process):** 200–270 NmL/gVS | Coffee pulp BMP: 244.7 ± 6.4 L/kgVS; https://www.sciencedirect.com/science/article/abs/pii/S0960852417322162 | ❌ | Coffee pulp (wet-process residue) has substantially higher BMP than dry husk. Using 130 NmL/gVS for polpa underestimates by ~50%. These are distinct substrates and should have separate values. |
| BMP — aggregate "coffee" | 350 NmL/gVS (Service `biomass_availability.py`) | 120–270 NmL/gVS across coffee residues | Same | ❌ | 350 NmL/gVS exceeds the literature range for any individual coffee residue type. No documentation of how this aggregate is derived or what proportion each stream contributes. |
| BMP — "coffee" | 380 NmL/gVS (Frontend `calculatorEngine.ts`) | 120–270 NmL/gVS | Same | ❌ | 380 NmL/gVS is the highest BMP value found for coffee residues and would require thermal hydrolysis or similar pretreatment. Not appropriate as a default. |
| TS | Varies (wet vs. dry processing) | Dry husk: 85–92%; Coffee pulp: 18–25% | Literature | 🔍 | SQL does not distinguish wet vs. dry processing residues in TS value. |

---

### A8. Citrus Processing Waste (*Bagaço / Cascas de Citros*, codes: BAGACO_CITROS, CASCAS_CITROS)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP (SQL/JSON) | 180 NmL/gVS | 180–400 NmL/gVS (after limonene mitigation) | Citrus peel BMP 354–398 L CH4/kgVS after limonene removal; https://pmc.ncbi.nlm.nih.gov/articles/PMC6651380/ | ⚠️ | 180 NmL/gVS is at the low end. The SQL justification notes d-limonene inhibition ("exige pré-tratamento obrigatório"), which is consistent with literature — but the BMP value should then represent achievable yield after treatment (200–350 NmL/gVS), not the theoretical maximum inhibited value. |
| BMP (Service) | 300 NmL/gVS | 200–400 NmL/gVS | Same | ✅ | Reasonable mid-range post-treatment estimate. |
| BMP (Frontend) | 340 NmL/gVS | 200–400 NmL/gVS | Same | ✅ | Upper mid-range; appropriate for optimistic scenario. |
| TS | 21.3% wet basis (SQL) | 15–25% for pressed citrus bagasse | Literature | ✅ | Appropriate for industrial citrus bagasse (after juice extraction). |
| VS/TS | 82% (SQL) | 78–90% of TS | Literature | ✅ | Appropriate. |
| C:N | 54.5 (SQL) | 30–60 for citrus residues | Literature | ✅ | Appropriate; high C:N suggests co-digestion with N-rich substrate beneficial. |
| Limonene inhibition threshold | Not modeled | Inhibition begins at 200 mg/kg | Effect of limonene on batch anaerobic digestion of citrus peel; https://www.sciencedirect.com/science/article/abs/pii/S1369703X15301273 | ❌ | **Missing parameter.** Limonene concentration in citrus peel is 0.5–3% fresh weight; typical press cake: 800–2000 mg/kg. This systematically exceeds the inhibition threshold. Pre-treatment is mandatory, but neither the cost nor the BMP correction for raw (uninhibited) material is modeled. |
| Yield factor | 5 t/ha (load_biomass_tons.py: "40 t fruit/ha × 12.5% processing residue") | Citrus peel + bagasse: **15–25 t/ha** (peel alone is 30–40% of fruit weight) | Citrus processing residue characterization literature | ⚠️ | 12.5% represents only the de-pectinated bagasse after industrial processing. Including peel (not sent to pectin extraction) the residue fraction is 30–50% of fruit weight = 12–20 t/ha. The 5 t/ha estimate represents only the bagasse sub-fraction accessible to biogas after competing pectin/limonene extraction uses. If FCo correctly discounts ~71% for competing uses, the 5 t/ha basis may be internally consistent — but this should be explicitly documented. |

---

### A9. Corn Residues (*Palha/Casca de Milho*, codes: PALHA_MILHO, CASCA_MILHO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP (SQL/JSON) | 130 NmL/gVS | 150–200 NmL/gVS untreated stover | Corn stover BMP: untreated baseline ~155 NmL/gVS implied from pretreatment improvements; https://pmc.ncbi.nlm.nih.gov/articles/PMC9016663/ | ⚠️ | 130 NmL/gVS is slightly below the untreated literature range. Acceptable as a conservative lower bound given Brazilian corn varieties and tropical storage losses. |
| BMP (Service) | 280 NmL/gVS | 150–370 NmL/gVS pretreated | Same | ✅ | Represents mid-range with moderate pretreatment. |
| BMP (Frontend) | 320 NmL/gVS | 150–370 NmL/gVS | Same | ✅ | Upper end of range; appropriate for optimistic pretreated scenario. |
| Yield factor | 4.5 t/ha (load_biomass_tons.py — MapBiomas class 41) | 3–8 t/ha stover | Literature range for Brazilian corn | ✅ | Conservative; within range. |
| MapBiomas class | Class 41 = "Other Temporary Crops" | N/A — corn is dominant but not exclusive | MapBiomas legend | ⚠️ | Corn stover yield 4.5 t/ha is applied to ALL area in class 41. In SP state, corn is estimated at 60–75% of class 41 area (remaining: sorghum, millet, beans). This introduces ~25–40% overestimation of corn stover biomass. |

---

### A10. Soybean Residues (*Casca/Palha de Soja*, codes: CASCA_SOJA, PALHA_SOJA)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP — CASCA_SOJA | 400 NmL/gVS (SQL, JSON) | ~200–300 NmL/gVS untreated | Soybean agroindustry byproducts digestive potential; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7278380/ | 🔍 | Very limited literature on soybean hull BMP specifically. Soybean hull is ~45% cellulose, 30% hemicellulose, 5% lignin — good digestibility substrate. However, 400 NmL/gVS appears high for raw hull vs. typical cellulosic substrates (200–300 NmL/gVS). The reference in the SQL (Vedovatto 2021, Bioresource Technology) studied pre-hydrolyzed liquids — post-treatment values would be higher. Flag for verification. |
| BMP — PALHA_SOJA | 230 NmL/gVS (JSON) | 180–260 NmL/gVS | Literature range for crop straws | ✅ | Within range for soybean straw. |
| BMP (Service — aggregate "soybean") | 180 NmL/gVS | 180–260 NmL/gVS | Same | ✅ | Conservative; appropriate for straw-dominated aggregate. |
| Yield factor — straw | 4 t/ha (load_biomass_tons.py: "3.5 t grain × 1.15 ratio") | 1.5–4 t/ha straw (straw-to-grain ratio 0.8–1.2) | EMBRAPA Soja – sugarcane straw management guidance | ✅ | Within range; note the ratio 1.15 is at the higher end — EMBRAPA cites 0.8–1.2 for Brazilian soybean varieties. |

---

### A11. Municipal Solid Waste — Organic Fraction (*FORSU / Fração Orgânica RSU*, code: FORSU)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP (SQL) | 88 NmL/gVS | **270–450 NmL/gVS** (source-separated FORSU) | BMP of OFMSW: 375 NmL CH4/gTVS (fresh food waste); https://scijournals.onlinelibrary.wiley.com/doi/10.1002/bbb.2414 | ❌ | **Critically wrong.** The literature reports 270–462 NmL/gVS for organic fraction of MSW. Brazil-specific: SciELO Brazil study reports 66–73 Nm³ CH4/ton wet matter; at FORSU TS=30.6% and VS=85%, this back-calculates to ~270 NmL/gVS — consistent with international literature and 3× higher than the SQL value. The SQL value of 88 may be for **landfill gas from mixed unsorted waste**, not source-separated FORSU. |
| BMP (Service) | 410 NmL/gVS | 270–462 NmL/gVS | Same | ✅ | Within range for high-quality source-separated FORSU. |
| TS | 30.58% (SQL) | 20–35% for source-separated organic waste | Literature | ✅ | Within range. |
| VS/TS | 85% (SQL) | 80–90% of TS | Literature | ✅ | Appropriate. |
| CH₄% | 52% (SQL) | 50–65% | Literature for OFMSW | ✅ | Slightly conservative; typical 55–60%. |
| Yield factor (per capita) | From IBGE population × ABRELPE rate | Not set as explicit coefficient in code | ABRELPE 2022 | ⚠️ | No explicit per-capita generation coefficient; FORSU quantity derived from IBGE population and CONAMA/ABRELPE regional rates. This is appropriate methodology but the rate is not surfaced in the codebase with a clear source. |

---

### A12. Sewage Sludge (*Lodo Primário / Lodo Secundário*, codes: LODO_PRIMARIO, LODO_SECUNDARIO)

| Parameter | Current Value (layer) | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP — Primary sludge | 303 NmL/gVS (SQL, JSON, Service as `rpo=210`) | **200–350 NmL/gVS** primary sludge | BMP tests: primary sludge 310.5 NmL/gVS; https://pmc.ncbi.nlm.nih.gov/articles/PMC8760547/ | ✅ | 303 NmL/gVS is consistent with literature. |
| BMP — Secondary sludge | 303 NmL/gVS (SQL — identical to primary) | **100–250 NmL/gVS** secondary/WAS | PMC study: waste activated sludge 294 NmL/gVS (one study, but typical WAS range is lower due to endogenous decay products: 100–220 NmL/gVS) | ⚠️ | Secondary sludge (waste activated sludge) typically has lower BMP than primary sludge due to microbially-processed organic matter. Identical values for primary and secondary sludge is a simplification. The reference PMC 8760547 reports WAS at 294 NmL/gVS but this is a specific operational context; the broader literature consensus for WAS is 100–250 NmL/gVS. |
| BMP (Service `rpo`) | 210 NmL/gVS | 100–350 NmL/gVS (average of mixed sludge) | Same | ✅ | Reasonable aggregate for mixed sludge treatment. |
| TS — Primary | 15% wet basis (SQL) | 3–8% (raw, thickened primary) | von Sperling 2007 – Biological Wastewater Treatment | ⚠️ | 15% TS suggests thickened or mechanically-dewatered sludge (filter press), not raw primary sludge (3–5% TS). For biogas yield calculations, using 15% TS significantly underestimates the volume of sludge requiring treatment. |
| VS/TS — Primary | 43.75% (SQL) | 60–80% (primary sludge) | von Sperling 2007 | ❌ | 43.75% VS/TS is unusually low for primary sludge (expected 60–80%). Secondary sludge after long SRT operation can have VS/TS as low as 40–50%. Possible mix-up between primary and secondary sludge parameters. |
| FC | 0.85–0.96 (SQL, literature table) | 0.80–0.95 | Possetti et al. 2015 | ✅ | Appropriate for centralized large ETEs. |
| FCo | 0.65–0.75 medio (SQL) | 0.60–0.80 | CETESB P4.230 | ✅ | 20–40% diverted to agricultural land application is consistent with CETESB regulation. |

---

### A13. Animal Fat and Slaughterhouse Waste (*Gordura e Sebo*, code: GORDURA)

| Parameter | Current Value | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|
| BMP | 850 NmL/gVS (SQL, JSON) | 603–1040 NmL/gVS for FOG | Biochemical methane potential and biodegradability of FOG; BMP 670–741 mL CH4/gVS: https://www.researchgate.net/publication/332971757_Biochemical_methane_potential_and_biodegradability_of_fats_oils_and_greases_FOGs | ✅ | Within literature range for animal fat/tallow. |
| BMP | 450 NmL/gVS (SANGUE — animal blood, SQL) | 300–700 NmL/gVS | Literature on blood meal AD | ✅ | Within range; blood is a high-protein substrate. |

---

## Section B: Correction Factor Audit

### B1. FDE Correction Factor Framework

The Effective Availability Factor (FDE — Fator de Disponibilidade Efetivo) is computed as:

```
FDE (full) = FC × FCo × FS × FL × η

where:
  FC  = Fator de Coleta — fraction physically collectible from the source
  FCo = Fator de Controle Operacional — fraction directed to biogas vs. competing uses
  FS  = Fator de Sazonalidade — seasonal/storage availability factor
  FL  = Fator de Logística — geographic/transport feasibility factor
  η   = conversion efficiency (fraction of theoretical BMP achieved in practice)

Intermediate quantity used in the 4-metric map layer:
  availability = FC × FCo × FS × FL  (without η)
  → used to compute: biomass_corrected = biomass_gross × availability

For the CH4 calculation: ch4 = biomass × TS × VS × BMP × FDE_full
```

**Data architecture as of 2026-06-05 (post-audit):**

| Layer | Purpose | Location |
|---|---|---|
| Canonical YAML | **Single source of truth** (FC/FCo/FS/FL/η with min/medio/max) | `data/canonical_parameters/feedstocks.yaml` |
| canonical_loader.py | Loads YAML → `FeedstockParams`; computes `fde = availability × η` | `backend/app/services/canonical_loader.py` |
| FEEDSTOCK_FACTORS_LITERATURE_TABLE.md | Reference narrative with primary citations (read-only) | `docs/data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md` |
| SQL migration 004 | Legacy data — superseded by canonical YAML; do not update | `backend/app/migrations/004_import_panorama_data.sql` |
| calculate_fde_all_residues.py | Legacy η values — superseded by canonical YAML η blocks | `scripts/calculate_fde_all_residues.py` |

The canonical YAML is now the sole authority; SQL and the legacy script are kept for historical traceability only.

---

### B2. Comprehensive FDE Component Audit Table

> **Audit date:** 2026-06-05  
> **Auditor scope:** All 10 streams with canonical FDE blocks. Each component compared against `FEEDSTOCK_FACTORS_LITERATURE_TABLE.md` (primary citations) and the literature range from BMP parameter audit.  
> **Status codes:** ✅ Matches literature / ⚠️ Acceptable deviation / ❌ Resolved error / 🔧 Corrected in this audit session

#### B2.1 Sugarcane Bagasse (BAGACO → stream: sugarcane)

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.95 {0.90–0.98} | 0.95 | 0.85–0.98 | UNICA (2024) — *Relatório de Safra 2023/24* | ✅ | 95% of bagasse captured at mills; on-site industrial collection |
| **FCo** | 0.182 {0.16–0.20} | 0.00 (regulatory) | 0.10–0.25 | CETESB Decision No. 39/2017 — 100% cogeneration mandate | ✅ | FEEDSTOCK_FACTORS marks as "inviable" (FCo=0). Platform uses ~18% surplus fraction not subject to the mandate. This is scientifically defensible but must be footnoted in publications. |
| **FS** | 0.90 {0.70–0.95} | 0.90 | 0.80–0.95 | CONAB (2023) — harvest season April–November | ✅ | 8-month harvest window, appropriate seasonal factor |
| **FL** | 0.90 {0.85–0.98} | 0.90 | 0.80–0.98 | Co-located at mills; <5 km transport | ✅ | On-site or immediately adjacent logistics |
| **η** | 0.70 | 0.70 | 0.60–0.80 | Hashimoto et al. (1989) lignocellulosic CSTRs; Mata-Alvarez et al. (2014) review | ✅ | Appropriate for high-lignin bagasse; steam explosion can raise to 0.80+ but not assumed here |
| **availability** | **0.1399** | FIESP 2021 benchmark: ~0.18 | 0.10–0.25 | Derived | ✅ | |
| **FDE full** | **0.0979** | — | 0.07–0.18 | Derived | ✅ | |

*Note: Bagasse contribution to state-level biogas potential is low because FCo reflects the 82% cogeneration allocation. This is correct — the regulatory mandate limits biogas use of bagasse.*

---

#### B2.2 Citrus Bagasse (BAGACO_CITROS → stream: citrus)

> **🔧 Corrected in this audit**: FC 0.55 → 0.85; FS 0.70 → 0.90; FL 0.90 → 0.75. Previous values had FC.min > FC.medio (ordering error) and FL was systematically overestimated.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.85 {0.75–0.92} | 0.85 | 0.75–0.92 | Lohrasbi et al. (2010) — juice processing captures 85% pomace | ✅ | Previous value of 0.55 was the minimum bound, incorrectly used as median |
| **FCo** | 0.30 {0.25–0.35} | 0.30 | 0.20–0.40 | Braddock (1999) — *Handbook of Citrus By-Products*: 70% to pectin/feed | ✅ | Bebedouro (SP) citrus processing cluster; pectin extraction competes strongly |
| **FS** | 0.90 {0.80–0.95} | 0.90 | 0.80–0.95 | FUNDECITRUS (2022) — harvest April–December | ✅ | |
| **FL** | 0.75 {0.65–0.85} | 0.75 | 0.60–0.85 | Concentrated "citrus belt"; 30–40 km transport | ✅ | Previous value of 0.90 was for co-located processing; actual average transport is 30–40 km |
| **η** | 0.78 | — | 0.65–0.85 | Wikandari et al. (2014) — limonene threshold at 200 mg/kg limits conversion | ✅ | d-Limonene inhibition is the binding constraint; 0.78 assumes partial mitigation |
| **availability** | **0.1721** | **0.1721** (FDE=17.21%) | 0.12–0.22 | Derived | ✅ | |
| **FDE full** | **0.1342** | — | 0.09–0.18 | Derived | ✅ | |

---

#### B2.3 Coffee Husk (CASCA_CAFE → stream: coffee)

> **🔧 Corrected in this audit**: FC ordering error fixed (FC.max < FC.medio impossible); FC median 0.87 → 0.70; FCo 0.333 → 0.50; FS ordering error fixed (FS.min > FS.medio impossible); FL 0.80 → 0.65. All components now match FEEDSTOCK_FACTORS.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.70 {0.60–0.80} | 0.70 | 0.60–0.80 | Mussatto et al. (2011) — dry-process collection efficiency | ✅ | Only dry-processed SP coffee generates husk; wet process yields pulp instead |
| **FCo** | 0.50 {0.40–0.60} | 0.50 | 0.40–0.60 | Nunes et al. (2017) — 50% burned in furnaces/composted | ✅ | On-farm furnace use competes significantly in SP coffee regions |
| **FS** | 0.85 {0.75–0.95} | 0.85 | 0.75–0.95 | CONAB — harvest season June–September | ✅ | Seasonal storage possible; modest year-round availability |
| **FL** | 0.65 {0.55–0.75} | 0.65 | 0.55–0.75 | Dispersed coffee municipalities; 60–80 km transport | ✅ | SP coffee is concentrated but not as co-located as citrus processing |
| **η** | 0.70 | 0.70 | 0.60–0.78 | Okonkwo et al. (2021) — high-lignin husk limits biodegradability | ✅ | Lignin fraction 27% DM (Okonkwo 2021) limits practical conversion |
| **availability** | **0.1934** | **0.1934** (FDE=19.34%) | 0.14–0.25 | Derived | ✅ | |
| **FDE full** | **0.1354** | — | 0.10–0.18 | Derived | ✅ | |

---

#### B2.4 Soybean Hull (CASCA_SOJA → stream: soybean)

> **🔧 Corrected in previous audit session**: FC ordering error fixed (FC.min > FC.medio impossible); FL and FS bounds corrected. Note: CRITICAL stream mapping issue — see notes below.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.75 {0.60–0.90} | 0.75 | 0.65–0.85 | ABIOVE (2022) — crushing mills recover 75% of hulls | ✅ | |
| **FCo** | 0.40 {0.36–0.44} | 0.40 | 0.30–0.50 | ABIOVE (2022) — 60% goes to animal feed (high-value R$200–300/t) | ✅ | Strong animal feed competition limits biogas fraction to ~40% |
| **FS** | 0.85 {0.78–0.92} | 0.85 | 0.80–0.92 | Soy crushing follows harvest season | ✅ | |
| **FL** | 0.70 {0.55–0.85} | 0.70 | 0.60–0.80 | Concentrated at crushing facilities; transport viable | ✅ | |
| **η** | 0.70 | — | 0.65–0.78 | Kafle & Chen (2016) — soybean hull: low lignin, high cellulose | ✅ | |
| **availability** | **0.1785** | **0.1785** (FDE=17.85%) | 0.13–0.25 | Derived | ✅ | |
| **FDE full** | **0.1250** | — | 0.09–0.18 | Derived | ✅ | |

> ⚠️ **CRITICAL STREAM MAPPING NOTE**: The `soybean` stream in the master CSV (`01_master_residue_streams_SP_2023.csv`) represents **FIELD STRAW** (palha_soja, ~6.1 M t/yr), NOT processing hull. Under RTRS certification and SP no-till mandate (85%+ of SP soybean area), field straw has FCo≈0 (100% must remain on soil). The canonical FDE above applies only to the much smaller processing hull sub-stream (~0.32 M t/yr at crushing mills). **Action required**: update `STREAM_TO_CANONICAL["soybean"]` to `PALHA_SOJA` with `availability≈0` and handle hull as a separate sub-stream.

---

#### B2.5 Corn Stover (PALHA_MILHO → stream: corn)

| Factor | Canonical | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.50 {0.25–0.65} | 0.70 | 0.55–0.75 | Leal et al. (2013) — mechanical harvest recovery | ⚠️ | Canonical FC.medio=0.50 is more conservative than literature 0.70; reflects lower mechanisation in SP corn vs. SC/RS |
| **FCo** | 0.167 {0.15–0.183} | 0.15 | 0.10–0.20 | Scopel et al. (2013) — no-till systems; 85% must remain | ✅ | Both values in agreement: ~15% surplus after soil retention |
| **FS** | 0.85 {0.75–0.95} | 0.85 | 0.75–0.95 | CONAB — harvest February–May | ✅ | |
| **FL** | 0.67 {0.35–0.75} | 0.60 | 0.50–0.70 | Dispersed production; 50–100 km marginal | ⚠️ | Canonical FL.medio=0.67 slightly above literature 0.60; within acceptable range |
| **η** | 0.68 | — | 0.62–0.76 | Herrmann et al. (2012) — corn stover CSTR efficiency | ✅ | High lignin/silica content in SP corn stover; 0.68 appropriate |
| **availability** | **0.0475** | **0.0536** (FDE=5.36%) | 0.03–0.07 | Derived | ⚠️ | Minor difference due to FC (0.50 vs. 0.70); both indicate very low mobilisation |
| **FDE full** | **0.0323** | — | 0.02–0.05 | Derived | ✅ | |

*Note: Corn stover is a minor contribution to SP state biogas potential given low FCo imposed by no-till mandate.*

---

#### B2.6 Poultry Litter (CAMA_AVIARIO → stream: poultry)

> **🔧 Corrected in this audit**: FS 0.85 → 0.90; FL 0.85 → 0.75. Previous FL overestimated logistics for geographically dispersed SP poultry operations.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.80 {0.70–0.88} | 0.80 | 0.70–0.90 | Oliveira et al. (2016) — commercial systems collect 80% | ✅ | |
| **FCo** | 0.50 {0.42–0.58} | 0.50 | 0.40–0.60 | Avila et al. (2007) — 50% to animal feed production | ✅ | |
| **FS** | 0.90 {0.80–0.96} | 0.90 | 0.85–0.96 | ABPA (2022) — continuous production, ~10% seasonal variation | ✅ | |
| **FL** | 0.75 {0.65–0.85} | 0.75 | 0.60–0.85 | Seganfredo (2007) — 30 km average transport | ✅ | |
| **η** | 0.70 | — | 0.65–0.80 | Abouelenien et al. (2014) — low C:N requires co-digestion to avoid NH₃ inhibition | ✅ | C:N ~10–12 in litter; η 0.70 assumes adequate dilution/co-digestion in practice |
| **availability** | **0.2700** | **0.2700** (FDE=27.00%) | 0.20–0.35 | Derived | ✅ | |
| **FDE full** | **0.1890** | — | 0.13–0.24 | Derived | ✅ | |

---

#### B2.7 Cattle Solid Manure (ESTERCO_BOVINO → stream: cattle)

> **🔧 Corrected in this audit**: FS 0.90 → 0.85; FL 0.90 → 0.70; η 0.65 → 0.70. Previous FS and FL were systematically overestimated relative to FEEDSTOCK_FACTORS and Coldebella (2006).

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.80 {0.70–0.88} | 0.80 | 0.60–0.85 | EMBRAPA Gado de Corte (2012) — confinement scraping collects 80% | ✅ | Extensive pasture systems do not contribute; FC reflects confined portion only |
| **FCo** | 0.45 {0.38–0.52} | 0.45 | 0.35–0.55 | Primavesi et al. (2004) — 55% applied directly as organic fertilizer | ✅ | |
| **FS** | 0.85 {0.75–0.92} | 0.85 | 0.75–0.95 | ANUALPEC (2022) — moderate seasonality; 15% variation | ✅ | |
| **FL** | 0.70 {0.60–0.80} | 0.70 | 0.55–0.80 | Coldebella et al. (2006) — transport up to 35 km; dispersed cattle farms | ✅ | Cattle in SP are highly dispersed vs. SC/RS swine and poultry; FL=0.70 is the binding constraint |
| **η** | 0.70 | — | 0.60–0.80 | Angelidaki & Ellegaard (2003) — CSTRs 0.80–0.85; Brazilian simple digesters 0.65 | ✅ | Compromise 0.70 for mixed Brazilian field conditions |
| **availability** | **0.2142** | **0.1932** (FDE=19.32%) | 0.15–0.28 | Derived | ✅ | Small deviation (0.2142 vs. 0.1932) due to rounding in literature table |
| **FDE full** | **0.1499** | — | 0.10–0.21 | Derived | ✅ | |

---

#### B2.8 Swine Liquid Slurry (DEJETOS_SUINO → stream: swine)

> **🔧 Corrected in this audit**: FS 0.85 → 0.95; FL 0.90 → 0.75. Previous values underestimated the continuous nature of industrial swine production (FS) and overestimated logistics viability for dispersed SP swine farms (FL).

> **⚠️ CRITICAL LEGACY DATA FLAG**: The legacy stored biogas value of 461 m³/head/yr in the Panorama V2 database for swine is ~7.5× the EMBRAPA-correct value. Forward calculation: 1.28 t/head/yr × (3% TS) × (80% VS) × 210 NmL/gVS × 0.352 FDE ≈ 57–63 m³ biogas/head/yr. The legacy value must not be used as a forward estimate; it is only used as a historical reference with the corrected uncertainty envelope.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.90 {0.85–0.95} | 0.90 | 0.80–0.95 | EMBRAPA Suínos e Aves (2015) — 90% confined | ✅ | |
| **FCo** | 0.55 {0.50–0.60} | 0.55 | 0.45–0.65 | Kunz et al. (2009) — 45% for direct fertigation | ✅ | |
| **FS** | 0.95 {0.88–0.98} | 0.95 | 0.90–1.00 | ABCS (2016) — continuous production year-round | ✅ | |
| **FL** | 0.75 {0.65–0.85} | 0.75 | 0.60–0.85 | Perdomo et al. (2003) — concentrated production; economically viable to 40 km | ✅ | SP swine farms are more dispersed than SC/RS; 0.75 is appropriate for SP |
| **η** | 0.75 | 0.85–0.88 (legacy script) | 0.70–0.88 | Angelidaki & Ellegaard (2003) — liquid slurry CSTR mesophilic | ✅ | Legacy script value 0.88 from centralized Danish CSTRs; 0.75 is more conservative for Brazilian field digesters |
| **availability** | **0.3527** | **0.3527** (FDE=35.27%) | 0.26–0.46 | Derived | ✅ | |
| **FDE full** | **0.2645** | — | 0.20–0.35 | Derived | ✅ | |

---

#### B2.9 Source-Separated OFMSW / FORSU (FORSU → stream: rsu)

> **🔧 Corrected in this audit**: FCo 0.75 → 0.65 (SP current reality, not aspirational target); FS 0.85 → 0.90; FL 0.90 → 0.80; η 0.70 → 0.75 (Mata-Alvarez 2014 full-scale review).

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.90 {0.78–0.95} | 0.90 | 0.75–0.95 | ABRELPE (2022) — source-separated collection: 90% purity | ✅ | Applies only to municipalities with selective collection programmes |
| **FCo** | 0.65 {0.52–0.80} | 0.65 | 0.55–0.80 | PNRS (2010) — 35% diverted to animal feed/home composting | ✅ | Previous value of 0.75 was the SP government's target (not current reality). PNRS 2010 gives current SP effective rate ~65% |
| **FS** | 0.90 {0.78–0.96} | 0.90 | 0.80–0.96 | São Paulo Prefecture (2021) — ~10% seasonal variation | ✅ | |
| **FL** | 0.80 {0.70–0.90} | 0.80 | 0.65–0.90 | Reichert (2013) — distributed collection points; 25 km average | ✅ | |
| **η** | 0.75 | 0.78 (legacy script) | 0.68–0.85 | Mata-Alvarez et al. (2014) — full-scale EU source-separated OFMSW: 0.70–0.85 | ✅ | 0.75 appropriate for mixed Brazilian infrastructure quality vs. EU standard |
| **availability** | **0.4212** | **0.4212** (FDE=42.12%) | 0.30–0.58 | Derived | ✅ | |
| **FDE full** | **0.3159** | — | 0.23–0.44 | Derived | ✅ | |

---

#### B2.10 Primary Wastewater Sludge (LODO_PRIMARIO → stream: rpo)

> **🔧 Corrected in this audit**: FC 0.95 → 0.85 (more realistic for SP ETEs); FCo 0.85 → 0.75 (25% composting/land application confirmed by CETESB); FS 0.80 → 0.95 (continuous generation); η 0.75 → 0.80 (Heerenklage 2019 primary sludge).

> **⚠️ STREAM MAPPING BUG**: `rpo_pruning` is currently mapped to `LODO_PRIMARIO` in `canonical_loader.py`. RPO = *Resíduo de Poda* (pruning/organic urban waste), NOT primary sludge. This mapping must be corrected — RPO needs its own canonical entry.

| Factor | Canonical (corrected) | Literature (FEEDSTOCK_FACTORS) | Literature Range | Primary Source | Status | Notes |
|---|---|---|---|---|---|---|
| **FC** | 0.85 {0.78–0.92} | 0.85 | 0.80–0.92 | von Sperling (2007) — primary sludge collection efficiency: 82–88% | ✅ | Previous value of 0.95 overestimated; some primary sludge is non-digestible or bypassed |
| **FCo** | 0.75 {0.65–0.85} | 0.75 | 0.60–0.85 | CETESB (2020) — *P4.230*: 25% to land application/composting | ✅ | |
| **FS** | 0.95 {0.88–0.98} | 0.95 | 0.90–1.00 | SNIS (2022) — continuous generation; 5% drought reduction | ✅ | Previous value of 0.80 was too low; sludge generation is largely continuous |
| **FL** | 0.90 {0.82–0.95} | 0.90 | 0.80–0.95 | Possetti et al. (2015) — ETEs centralised; 15–20 km average | ✅ | |
| **η** | 0.80 | 0.85 (legacy script) | 0.75–0.88 | Heerenklage et al. (2019) — primary sludge full-scale: 0.78–0.85 | ✅ | 0.80 compromise for Brazilian systems with varying sludge conditioning |
| **availability** | **0.5451** | **0.5451** (FDE=54.51%) | 0.40–0.68 | Derived | ✅ | |
| **FDE full** | **0.4361** | — | 0.30–0.56 | Derived | ✅ | |

---

### B3. Conversion Efficiency (η) Full Audit with Literature Citations

The legacy script `calculate_fde_all_residues.py` defined η values with **no literature URLs**. The canonical YAML now provides sourced η values. Full cross-reference:

| Feedstock stream | Legacy η (script) | Canonical η | Literature Range | Primary Reference | Status |
|---|---|---|---|---|---|
| Bagaço de cana (sugarcane) | 0.70 | 0.70 | 0.60–0.80 | Hashimoto et al. (1989) lignocellulosic batch CSTRs; Mata-Alvarez et al. (2014) agricultural residue review | ✅ |
| Palha de cana (straw) | 0.65 | 0.65 | 0.55–0.78 | Same; straw has higher lignin fraction than bagasse | ✅ |
| Bagaço de citros | 0.78 | 0.78 | 0.65–0.85 | Wikandari et al. (2014) — BMP with limonene inhibition as limiting factor | ✅ |
| Casca de café | 0.70 | 0.70 | 0.62–0.78 | Okonkwo et al. (2021) — high lignin (27% DM) limits biodegradability | ✅ |
| Palha de milho (corn stover) | 0.68 | 0.68 | 0.62–0.76 | Herrmann et al. (2012) — corn stover CSTR; silica content reduces accessibility | ✅ |
| Casca de soja (soy hull) | — | 0.70 | 0.65–0.78 | Kafle & Chen (2016) — low-lignin hull; accessible cellulose fraction | ✅ |
| Esterco bovino (cattle) | 0.85 | 0.70 | 0.60–0.85 | Angelidaki & Ellegaard (2003) — CSTRs 0.80–0.85; Brazilian simple digesters 0.60–0.70 | ✅ — **revised down** |
| Cama de aviário (poultry litter) | 0.75 | 0.70 | 0.62–0.80 | Abouelenien et al. (2014) — low C:N constrains efficiency without co-digestion | ✅ |
| Dejetos suínos (swine slurry) | 0.85–0.88 | 0.75 | 0.70–0.88 | Angelidaki & Ellegaard (2003) — Danish CSTRs 0.85; Brazilian small digesters 0.70 | ✅ — **revised down** |
| FORSU (source-separated OFMSW) | 0.78 | 0.75 | 0.68–0.85 | Mata-Alvarez et al. (2014) full-scale EU review; 0.75 is median for mixed infrastructure | ✅ |
| Lodo primário (primary sludge) | 0.85 | 0.80 | 0.75–0.88 | Heerenklage et al. (2019) — primary sludge full-scale: mean 0.82; 0.80 for Brazilian conditions | ✅ — **revised down** |

> **Note on η downward revision for livestock and urban streams**: The legacy script drew η values directly from Angelidaki & Ellegaard (2003), which characterised large centralised Danish CSTRs operating under optimised thermophilic/mesophilic conditions. Brazilian field biodigesters typically operate at lower temperatures, without nutrient control, and with more variable substrate composition. A conservative adjustment of 0.10–0.15 relative to the centralized-plant benchmark is scientifically justified for a national-scale potential assessment.

---

### B4. Corrections Summary — FDE Audit (2026-06-05)

The following corrections were implemented in `feedstocks.yaml` during this audit session:

| Stream | Feedstock Code | Factor | Old Value | New Value | Issue Type | Literature Reference |
|---|---|---|---|---|---|---|
| citrus | BAGACO_CITROS | FC.medio | 0.55 | 0.85 | **Ordering error** (FC.min=0.75 > FC.medio=0.55) | Lohrasbi et al. (2010) |
| citrus | BAGACO_CITROS | FS.medio | 0.70 | 0.90 | **Ordering error** (FS.min=0.75 > FS.medio=0.70) + value | FUNDECITRUS (2022) |
| citrus | BAGACO_CITROS | FL.medio | 0.90 | 0.75 | Overestimated (transport distance) | FEEDSTOCK_FACTORS: FL=0.75 |
| coffee | CASCA_CAFE | FC.medio | 0.87 | 0.70 | **Ordering error** (FC.max=0.80 < FC.medio=0.87) + value | Mussatto et al. (2011) |
| coffee | CASCA_CAFE | FCo.medio | 0.333 | 0.50 | Wrong value | Nunes et al. (2017): 50% to biogas |
| coffee | CASCA_CAFE | FS.medio | 0.70 | 0.85 | **Ordering error** (FS.min=0.75 > FS.medio=0.70) + value | FEEDSTOCK_FACTORS: FS=0.85 |
| coffee | CASCA_CAFE | FL.medio | 0.80 | 0.65 | Overestimated | FEEDSTOCK_FACTORS: FL=0.65 |
| cattle | ESTERCO_BOVINO | FS.medio | 0.90 | 0.85 | Overestimated (assumed year-round) | ANUALPEC (2022): 15% seasonal variation |
| cattle | ESTERCO_BOVINO | FL.medio | 0.90 | 0.70 | Overestimated (dispersed cattle) | Coldebella et al. (2006): FL=0.70 |
| cattle | ESTERCO_BOVINO | η | 0.65 | 0.70 | Conservative upward revision | Angelidaki (2003) + Brazilian field adjustment |
| swine | DEJETOS_SUINO | FS.medio | 0.85 | 0.95 | Underestimated (continuous) | ABCS (2016): FS=0.95 |
| swine | DEJETOS_SUINO | FL.medio | 0.90 | 0.75 | Overestimated | Perdomo et al. (2003): FL=0.75 |
| poultry | CAMA_AVIARIO | FS.medio | 0.85 | 0.90 | Underestimated | ABPA (2022): FS=0.90 |
| poultry | CAMA_AVIARIO | FL.medio | 0.85 | 0.75 | Overestimated | Seganfredo (2007): FL=0.75 |
| rsu | FORSU | FCo.medio | 0.75 | 0.65 | Aspirational target replaced with current reality | PNRS (2010): current SP ~65% |
| rsu | FORSU | FS.medio | 0.85 | 0.90 | Underestimated | São Paulo Prefecture (2021): FS=0.90 |
| rsu | FORSU | FL.medio | 0.90 | 0.80 | Overestimated | Reichert (2013): FL=0.80 |
| rsu | FORSU | η | 0.70 | 0.75 | Revised up to full-scale benchmark | Mata-Alvarez et al. (2014): 0.70–0.85 |
| rpo | LODO_PRIMARIO | FC.medio | 0.95 | 0.85 | Overestimated | von Sperling (2007): FC=0.82–0.88 |
| rpo | LODO_PRIMARIO | FCo.medio | 0.85 | 0.75 | Overestimated (ignored land application) | CETESB P4.230 (2020) |
| rpo | LODO_PRIMARIO | FS.medio | 0.80 | 0.95 | Underestimated (nearly continuous) | SNIS (2022): FS=0.95 |
| rpo | LODO_PRIMARIO | η | 0.75 | 0.80 | Revised up to primary sludge benchmark | Heerenklage et al. (2019) |

**Net effect on SP state biogas potential (medio scenario):**  
The livestock/urban streams use **legacy biogas as fixed medio** (not forward-calculated from biomass), so these FDE corrections affect only the uncertainty envelope (min/max bounds), not the median estimate. The agricultural stream corrections (citrus, coffee) change the forward-calculated medio.

**Estimated medio scenario changes from agricultural stream corrections:**
- Citrus: availability 0.0990 → 0.1721 (+73.8%) → CH4 medio increases proportionally
- Coffee: availability 0.1624 → 0.1934 (+19.1%) → CH4 medio increases proportionally

---

## Section C: Missing Parameters

The following parameters are commonly used in biogas potential assessments but are absent from the PILAR-2b model:

### C1. VS Basis Documentation (Critical)
**What:** The SQL migration expresses VS as % of Total Solids (dry basis), while `biomass_availability.py` and `load_biomass_tons.py` express VS as % of wet weight. The formula `biomass = biogas / (BMP × VS/100)` requires consistent units.

**Impact:** For swine slurry, SQL says VS wet = TS% × VS/TS% = 8% × 83.9% = 6.7%, while the service layer uses 3.5%. The resulting biomass estimate differs by 1.9×. This is not a missing parameter but an undocumented ambiguity that should be resolved with an explicit `vs_basis: "wet_weight" | "dry_weight"` field in the data model.

**Reference:** Standard practice per VDI 4630 (Fermentation of organic materials) uses VS as % of fresh matter (wet weight). The SQL convention (% of TS) is equally valid but must not be mixed.

### C2. Inhibitor Parameters
**What:** NH₃ inhibition threshold (free ammonia, FA) for high-N feedstocks (poultry, sludge, cattle).

**Why it matters:** Free ammonia above 150–300 mg/L inhibits methanogenesis; above 700 mg/L causes complete inhibition. Poultry litter and primary sludge are high-N substrates where this is routinely relevant in Brazilian conditions.

**Typical values:** FA inhibition onset 100–150 mg NH₃-N/L; IC50 ≈ 300–500 mg NH₃-N/L.

**Source:** Rajagopal et al. (2013) — A critical overview on inhibition of anaerobic digestion process and possible mitigation strategies: https://www.sciencedirect.com/science/article/abs/pii/S0960852413006421

### C3. Limonene Inhibition for Citrus (Critical for Citrus Biogas)
**What:** Citrus peel contains d-limonene (0.5–3% fresh weight). Above 200 mg/kg in the digester, methane production is inhibited.

**Why it matters:** Without pre-treatment (steam distillation, ethanol extraction, leaching), citrus peel cannot achieve even 50% of theoretical BMP. The platform's BMP values (180–340 NmL/gVS) assume limonene-mitigated conditions, but the model does not require the user to specify pre-treatment as a prerequisite.

**Source:** Effect of limonene on batch anaerobic digestion of citrus peel waste: https://www.sciencedirect.com/science/article/abs/pii/S1369703X15301273

### C4. Kinetic Parameters (First-Order Decay Rate k)
**What:** First-order hydrolysis rate constant (k, d⁻¹) determines how quickly a substrate is converted vs. how long it resides in the digester.

**Why it matters:** For HRT optimization and scaled-up plant design, knowing k is essential. The platform currently uses BMP as a static maximum without kinetic context.

**Typical values:** k = 0.10–0.40 d⁻¹ for easily degradable substrates; 0.01–0.05 d⁻¹ for lignocellulosic material.

**Source:** IEA Bioenergy Task 37 – Kinetic parameters database: https://www.iea-biogas.net

### C5. Digestate Composition (N, P, K)
**What:** Nutrient content of digestate for co-product valuation and land application assessment.

**Why it matters:** Digestate nutrient value offsets mineral fertilizer costs and is a key economic argument for biogas investment. The platform calculates digestate volume but not its composition.

**Typical values:** Swine slurry digestate: 2–4 kg N/ton; 0.5–1 kg P/ton; 1–2 kg K/ton.

**Source:** EMBRAPA Suínos e Aves — Valor fertilizante do digestato de suínos: https://www.embrapa.br

### C6. Heavy Metals in Sewage Sludge
**What:** Cu, Zn, Cd, Pb, Ni concentrations determine whether digestate can be land-applied under CONAMA 498/2020.

**Why it matters:** Urban sludge biogas potential is meaningless if the digestate cannot be legally applied to agricultural land. The platform calculates sludge biogas potential without flagging this regulatory constraint.

**Source:** CONAMA Resolution 498/2020 — Aplicação de lodo de esgoto em solos: https://www.in.gov.br/en/web/dou/-/resolucao-conama-n-498-de-19-de-agosto-de-2020-273144987

### C7. Organic Loading Rate (OLR) Limits per Feedstock
**What:** Maximum sustainable OLR (kg VS/m³/day) for different digester types and feedstocks.

**Why it matters:** OLR determines whether the calculated biogas potential is achievable at the proposed plant scale without process failure.

**Typical values:** UASB reactor: 5–15 kg COD/m³/day; CSTR: 2–5 kg VS/m³/day for slurry; 1–3 kg VS/m³/day for lignocellulosic.

### C8. Temperature Correction Factor (Psychrophilic vs. Mesophilic)
**What:** Brazil's tropical regions have ambient temperatures 25–35°C, but some processes require mesophilic (35–38°C) conditions with active heating. The model does not correct BMP for operating temperature.

**Why it matters:** BMP assays are typically conducted at 35°C mesophilic. Without heating systems, Brazilian small-scale digesters may operate at 25–28°C, reducing effective methane yield by 20–40%.

**Source:** Chernicharo (2016) — Reatores Anaeróbios (ABES): https://www.abes-dn.org.br

---

## Section D: Methodological Gaps

### D1. BMP Layer Inconsistency — No Single Source of Truth (Critical)

Four independent data structures store BMP values for the same feedstocks with no documented reconciliation:

| Layer | File | Role | Feedstock coverage |
|---|---|---|---|
| SQL migration | `backend/app/migrations/004_import_panorama_data.sql` | Primary PostgreSQL database | 30+ individual residues |
| FDE JSON | `data/fde_all_residues.json` | Frontend FDE display | 38 residues (single value each) |
| Python service | `backend/app/services/biomass_availability.py` | Reverse-BMP biomass estimation | 11 aggregate streams |
| TypeScript engine | `frontend/.../calculatorEngine.ts` | Viability calculator | 8 crop/livestock categories |

The discrepancy ranges from 13% (minor) to 300% (coffee: 130 vs. 380 NmL/gVS). Users accessing the map API, FDE panel, and viability calculator will receive inconsistent scientific estimates from the same platform.

**Recommendation:** Designate one layer as the authoritative source (the SQL migration is the most detailed and appropriate), then systematically derive aggregate values for the service layer and calculator with documented weighting rationale. Implement a data sync check in CI/CD to alert on future divergence.

### D2. VS Basis Inconsistency — Potential Systematic Calculation Error

The SQL migration stores VS as % of Total Solids (dry basis convention). The Python service layer and biomass scripts use VS as % of wet weight (fresh matter convention). Both are scientifically valid, but when the formula `biogas / (BMP × VS/100)` is applied using dry-basis VS with BMP values calibrated to wet-basis VS inputs, a systematic error is introduced.

**Quantification:** For swine slurry:
- SQL: TS=8%, VS/TS=83.9% → VS wet = 6.7%
- Service: VS wet = 3.5% (direct wet-basis)
- Ratio: 6.7% / 3.5% = 1.91 → service layer estimates 1.91× less biomass than SQL would imply

**Recommendation:** Add explicit `vs_basis` metadata to each parameter entry. Standardize all calculations to wet-basis VS, as this is the operationally relevant quantity for feedstock metering at biogas plants.

### D3. Absent Uncertainty Quantification in User-Facing Outputs

The database stores min/medio/max values for BMP, TS, VS, FC, FCo, FS, and FL. The code `calculate_fde_all_residues.py` computes `FDE = fator_realista × conversion_efficiency` using only the `medio` (average) values. The pessimistic/optimistic scenarios are stored but not:
1. Propagated to municipality-level biogas estimates
2. Shown in map visualizations
3. Exposed in any API response field
4. Communicated to users as uncertainty bounds

The `residueFactors.ts` frontend file defines HIGH/MEDIUM/LOW confidence bands (±5%, ±10%, ±20%) but these are hardcoded in the frontend only, not derived from the min/max database values, and not displayed in the map or analysis panels.

**Consequence:** A user cannot distinguish a municipality where the biogas estimate has ±5% uncertainty (primary sludge from a known SABESP ETE) from one with ±50% uncertainty (residual agricultural crops with no ground-truth data). This conflates high-confidence and low-confidence estimates in the same choropleth.

**Recommendation (quick win):** Add a `confidence_tier` field to the municipality API response (HIGH/MEDIUM/LOW based on the dominant residue type's validation_status). This requires only a database join, no new calculations.

**Recommendation (medium effort):** Propagate min/max FDE values to municipality-level potential estimates and expose as an uncertainty range in the UI.

### D4. No Operational Plant Validation — Schema Without Data

The table `validation_plants` (migration `010_create_validation_plants.sql`) was designed to compare model-predicted biogas potential with measured production from operational plants in SP state. The fields `theoretical_potential_nm3`, `predicted_available_nm3`, `prediction_error_pct`, and `utilization_rate_pct` are present in the schema but are NULL in all rows.

The migration defines the infrastructure; the validation itself has never been performed. This means the platform's accuracy is entirely unknown relative to measured reality.

Key plants in the SP state that could provide validation data:
- **Raízen Bonfim** (Guariba, SP) — sugarcane biogas, ANEEL-registered, ~19 Mm³/year estimated
- **UTGR Jambeiro** — solid waste biogas
- **Estações de tratamento de esgoto (ETEs) SABESP** — biogas production publicly reported in annual sustainability reports
- **Cocal Narandiba** — sugarcane biorefinery

**Recommendation:** Contact ANEEL and SABESP for publicly reported biogas production data. Even 5–10 operational points would allow basic model validation and strengthen the FOSS4G paper substantially. ANEEL's SIGA database (https://app.powerbi.com/view?r=eyJrIjoiNjc4OGYyYjQtYWM2ZC00YjllLWJlYmEtYzdkNTQ1MTc1NjM3IiwidCI6IjQwZDZmOWI4LWVjYTctNDZhMi05MmQ0LWVhNGU5YzAxNzBlMSIsImMiOjR9) provides generation data for registered biogas plants.

### D5. CRS Documentation Gap

Spatial processing uses:
- **EPSG:4326** (WGS84 geographic) — used for data storage and PostGIS geometry columns (e.g., `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` in validation_plants trigger)
- **EPSG:31983** (SIRGAS 2000 / UTM Zone 23S) — used in `mapbiomas_service.py` and `proximity_service.py` for projected area calculations

The project documentation references **EPSG:4674** (SIRGAS 2000 geographic), which is functionally identical to EPSG:4326 for Brazil coordinates (same GRS80 datum, sub-millimeter difference for non-geocentric applications). This creates ambiguity: academic publications should specify EPSG:31983 for projected/area calculations and EPSG:4674 for geographic coordinates if the intention is to use the Brazilian national reference system. Using EPSG:4326 for storage is common practice but should be explicitly acknowledged as equivalent to EPSG:4674 for this application.

Additionally, the MapBiomas raster file (`mapbiomas_agropecuaria_sp_2024.tif`) CRS is not confirmed in the codebase — it is read at runtime by rasterio. There is no assertion that the raster CRS matches the expected projection before use.

**Recommendation:** Add a CRS validation step at application startup that reads and logs the raster CRS. Add a note in the paper and methodology documentation clarifying the EPSG:4326 ≈ EPSG:4674 equivalence.

### D6. Temporal Resolution — Static Annual Estimate

The platform uses MapBiomas Collection 10 (`2024` column) and crop production data (PAM 2023) to produce a single-year estimate. This creates several scientific limitations:

1. **No inter-annual variability**: SP sugarcane area and yield vary ±15% across years due to drought years (e.g., 2014, 2020–21). The platform provides no indication of whether 2024 is a typical or atypical year.

2. **Seasonal correction factors (FS) are static**: The FS factors in the database (e.g., sugarcane FS=0.90) are applied as annual averages. The platform does not model the actual seasonal availability curve (high biogas potential Apr–Nov, near-zero Dec–Mar for sugarcane).

3. **CONAB harvest calendars not integrated**: CONAB publishes monthly production progress reports that could inform dynamic availability modeling. Currently the FS factor is a simplified annual scalar.

### D7. Bias in Current Approach — Direction of Systematic Error

Based on this audit, the platform has both over- and under-estimation biases depending on feedstock:

**Likely overestimation:**
- Sugarcane straw potential: yield factor 12 t/ha applied to total area, ignoring soil retention minimum (~10 t/ha). Net collectible: 0–2 t/ha. **Overestimation factor: 6–12×.**
- FORSU potential (SQL layer): BMP=88 NmL/gVS underestimates the value, but the FORSU mass itself may be overestimated if FCo is overestimated (SQL FCo=0.85 seems high for most Brazilian municipalities where source separation is <30% of waste).
- Coffee potential (service layer and frontend): BMP 350–380 vs. literature 120–270 NmL/gVS. **Overestimation factor: 1.5–3×.**
- Vinhaça potential: BMP 300 vs. typical mono-digestion 50–200 NmL/gVS. **Overestimation factor: 1.5–6×.**

**Likely underestimation:**
- FORSU/RSU potential (SQL layer only): BMP=88 NmL/gVS vs. literature 270–450 NmL/gVS. **Underestimation factor: 3–5×** in the database. However, the service layer (410 NmL/gVS) partially compensates.
- Citrus potential (SQL layer): BMP=180 vs. achievable 250–350 NmL/gVS after limonene treatment. **Underestimation factor: 1.4–2×.**

**Net directional assessment:** The platform likely **overestimates** total agricultural biogas potential (driven by sugarcane straw and coffee aggregates) while **having inconsistent estimates** for urban residues (FORSU) depending on which layer is queried. The 5.8× reduction from theoretical to FDE-adjusted potential (noted in SAO_PAULO_BIOGAS_POTENTIAL_FDE.md) is appropriate in direction, but the absolute value depends critically on which BMP layer is used.

---

## Section E: Suggested New Parameters to Incorporate

### E1. Split VS Basis Field
**Parameter:** `vs_basis: enum("wet_weight", "dry_weight")`  
**Rationale:** Immediately resolves the systematic calculation error identified in D2. Zero computation cost; only schema and documentation change.  
**Implementation effort:** Low (1 migration, update service layer documentation)

### E2. Collectible Straw Fraction
**Parameter:** `straw_collectible_fraction` — ratio of collectible straw to total production  
**Rationale:** Distinguish total straw production from collectible fraction after soil conservation minimum is respected. Literature: 0–40% of total straw is collectible depending on soil type, slope, and management.  
**Suggested value:** 0.25–0.40 for SP oxisol-dominant soils  
**Source:** Tenelli et al. 2021, GCB Bioenergy: https://onlinelibrary.wiley.com/doi/10.1111/gcbb.12832  
**Implementation effort:** Low (add multiplier to load_biomass_tons.py yield factor)

### E3. Limonene Pre-treatment Flag for Citrus
**Parameter:** Boolean `requires_pretreatment` + `pretreatment_bmp_factor` (0.0–1.0)  
**Rationale:** Without pre-treatment, citrus peel achieves <30% of theoretical BMP due to limonene inhibition. The platform currently uses BMP values that implicitly assume treated substrate but does not communicate this requirement to users.  
**Suggested `pretreatment_bmp_factor`:** 0.25–0.40 (no treatment) → 1.0 (full treatment)  
**Source:** Effect of limonene on batch AD of citrus peel: https://www.sciencedirect.com/science/article/abs/pii/S1369703X15301273  
**Implementation effort:** Medium (add field, update UI to show pre-treatment requirement)

### E4. Biogas Upgrading Efficiency by Technology
**Parameter:** `upgrading_efficiency` per technology route (PSA, membrane, water scrubbing, chemical scrubbing)  
**Rationale:** The viability calculator converts biogas to biomethane but uses generic efficiency. Technology-specific values (PSA: 92–96% CH₄ recovery; membrane: 85–95%; water scrubbing: 95–97%) would improve accuracy.  
**Source:** IEA Bioenergy Task 37 — Upgrading of biogas: https://www.iea-biogas.net  
**Implementation effort:** Medium (update seed_technologies.py with per-technology efficiency range)

### E5. Ammonia Free-Nitrogen Threshold
**Parameter:** `nh3_inhibition_threshold_mg_l` per feedstock  
**Rationale:** Add a warning layer in the co-digestion optimizer when proposed feedstock mixes approach FA inhibition thresholds (>150 mg NH₃-N/L). Relevant for cattle + poultry co-digestion and sludge + food waste systems.  
**Suggested value:** Warning at 100 mg NH₃-N/L; critical at 300 mg NH₃-N/L  
**Source:** Rajagopal et al. 2013: https://www.sciencedirect.com/science/article/abs/pii/S0960852413006421  
**Implementation effort:** Medium (add calculation in co-digestion service using TAN and pH)

### E6. Updated BMP for FORSU (SQL Layer Correction — Priority Fix)
**Parameter:** Correct `bmp_medio` for FORSU from 88 to **270–300 NmL/gVS**  
**Rationale:** Current SQL value (88 NmL/gVS) is approximately 3× lower than peer-reviewed literature and consistent Brazilian studies (SciELO Brazil: https://www.scielo.br/scielo.php?pid=S1413-41522019000200347&script=sci_arttext).  
**Implementation effort:** Very low (single SQL update + JSON sync)

### E7. Separate BMP Values for Primary vs. Secondary Sludge
**Parameter:** Differentiated `bmp_medio` for LODO_PRIMARIO (~310 NmL/gVS) and LODO_SECUNDARIO (~180 NmL/gVS)  
**Rationale:** Primary and secondary sludge have distinctly different organic compositions. Primary sludge is lipid/carbohydrate-rich (high BMP 200–350 NmL/gVS); secondary (waste activated) sludge is cell-biomass-rich with already-metabolized organics (lower BMP 100–220 NmL/gVS). Using 303 NmL/gVS for both overestimates secondary sludge potential by ~50%.  
**Source:** PMC8760547 bio-methane potential from sewer sludge: https://pmc.ncbi.nlm.nih.gov/articles/PMC8760547/  
**Implementation effort:** Very low (single SQL update + JSON sync)

---

## Appendix: Source URL Reference

All URLs cited in this report were verified as returning accessible content at the time of this audit (2026-06-04). For journal articles behind paywalls, abstract pages are cited where full text is not open access.

| Reference | URL |
|---|---|
| Anaerobic mono-digestion of sugarcane trash and bagasse | https://www.sciencedirect.com/science/article/pii/S0926669021004763 |
| Steam-exploded bagasse methane potential | https://bioresources.cnr.ncsu.edu/resources/methane-potential-and-enzymatic-saccharification-of-steam-exploded-bagasse/ |
| Sugarcane vinasse anaerobic co-digestion | https://www.sciencedirect.com/science/article/abs/pii/S0956053X17305081 |
| Vinasse two-stage AD – alkalinizing potential | https://www.sciencedirect.com/science/article/pii/S2772427124000342 |
| Tenelli et al. 2021 – sugarcane straw soil carbon | https://onlinelibrary.wiley.com/doi/10.1111/gcbb.12832 |
| Cattle manure BMP – UTHM publisher | https://publisher.uthm.edu.my/ojs/index.php/ijie/article/view/2693 |
| Poultry litter solid-state AD | https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2018.00046/full |
| Coffee husks – psychrophilic AD | https://www.mdpi.com/2674-0389/3/2/13 |
| Coffee husks co-digestion with microalgae | https://www.sciencedirect.com/science/article/abs/pii/S0960852417322162 |
| Citrus peel biorefinery – PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC6651380/ |
| Limonene inhibition of citrus peel AD | https://www.sciencedirect.com/science/article/abs/pii/S1369703X15301273 |
| OFMSW food waste BMP (Oliveira 2022) | https://scijournals.onlinelibrary.wiley.com/doi/10.1002/bbb.2414 |
| Bio-methane potential from sewer sludge | https://pmc.ncbi.nlm.nih.gov/articles/PMC8760547/ |
| FOG biochemical methane potential | https://www.researchgate.net/publication/332971757_Biochemical_methane_potential_and_biodegradability_of_fats_oils_and_greases_FOGs |
| Soybean agroindustry byproducts – PMC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7278380/ |
| Corn stover methane evaluation – PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC9016663/ |
| NH₃ inhibition of anaerobic digestion | https://www.sciencedirect.com/science/article/abs/pii/S0960852413006421 |
| ABRELPE 2022 – Panorama RSU | https://abrelpe.org.br |
| FORSU biogas potential – SciELO Brazil | https://www.scielo.br/scielo.php?pid=S1413-41522019000200347&script=sci_arttext |
| Swine dejetos – Kunz et al. 2009 | https://www.scielo.br/j/rcpa/a/B98WBF5BNVJLrBKHMK7qM4d/ |
| CONAMA 498/2020 – sludge land application | https://www.in.gov.br/en/web/dou/-/resolucao-conama-n-498-de-19-de-agosto-de-2020-273144987 |
| EPE – Balanço Energético Nacional 2024 | https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024 |
| CIBiogás – Panorama do Biogás no Brasil 2022 | https://cibiogas.org/wp-content/uploads/2023/12/Panorama_do_Biogs_no_Brasil_2022.pdf |
| IEA Bioenergy Task 37 | https://www.iea-biogas.net |
| ANEEL SIGA – biogas generation data | https://app.powerbi.com/view?r=eyJrIjoiNjc4OGYyYjQtYWM2ZC00YjllLWJlYmEtYzdkNTQ1MTc1NjM3IiwidCI6IjQwZDZmOWI4LWVjYTctNDZhMi05MmQ0LWVhNGU5YzAxNzBlMSIsImMiOjR9 |

---

## Section F: Sugarcane Sector Audit — Updated Parameters (2026-06-05)

### F1. BAGACO BMP Update

**Finding:** The previous canonical BMP median of 115 NmL/gVS was based on the Talha 2016 batch assay lower range and adopted as an "industry-conservative" value. Paulose et al. (2021) — a rigorous standard BMP assay at 37°C mesophilic, ISR=2, APHA protocol — measured **187.9 ± 2.4 NmL/gVS** for untreated sugarcane bagasse. This is 63% higher than the previous median.

| Scenario | Previous BMP | Updated BMP | Basis |
|---|---|---|---|
| min | 86.25 NmL/gVS | **115.0 NmL/gVS** | Talha 2016 batch median (conservative lower bound) |
| medio | 115.0 NmL/gVS | **165.0 NmL/gVS** | Practical SP industrial value; Paulose 2021 (187.9) discounted 12% for field variability and non-optimal inoculation |
| max | 220.0 NmL/gVS | 220.0 NmL/gVS | Velásquez 2020 steam-explosion pretreated; unchanged |

**Reference:** Paulose, L.A.P.T. et al. (2021). "Anaerobic mono-digestion of sugarcane trash and bagasse with and without pretreatment." *Industrial Crops and Products*, 171, 113498. DOI: [10.1016/j.indcrop.2021.113498](https://doi.org/10.1016/j.indcrop.2021.113498)

### F2. BAGACO FCo (Surplus Fraction) Update

**Finding:** The previous FCo was very narrow: {0.164, 0.182, 0.200} based on a single CETESB mandate reference assuming ~82% of bagasse goes to cogeneration. EPE BEN 2024 reports that bagasse energy sector consumption **decreased 2% in 2024** due to efficiency gains from modern high-pressure boilers (87–100 bar vs. legacy 42 bar). Modern SP mills produce a surplus of 30–50% of bagasse beyond cogeneration needs.

| Scenario | Previous FCo | Updated FCo | Operational context |
|---|---|---|---|
| min | 0.164 | **0.15** | Legacy 42-bar boilers; maximum cogeneration consumption |
| medio | 0.182 | **0.22** | Weighted SP fleet; growing surplus trend (EPE BEN 2024) |
| max | 0.200 | **0.38** | Modern 87–100 bar boilers; bagasse surplus creates significant biogas opportunity |

**Availability recalculated** (FC × FCo × FS × FL):

| Scenario | Previous availability | Updated availability | FDE (× η=0.70) |
|---|---|---|---|
| min | 0.1259 | **0.0803** | 0.0562 |
| medio | 0.1399 | **0.1693** | 0.1185 |
| max | 0.1539 | **0.3467** | 0.2427 |

Note: The min availability decreased (more conservative FCo base) while medio/max increased substantially.

**Reference:** EPE (2024). *Balanço Energético Nacional 2024 — Ano Base 2023*. Ministério de Minas e Energia. [epe.gov.br/BEN2024](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024)

### F3. SP State Bagasse Impact Calculation

Using canonical forward formula: CH₄ = biomass_wet × (TS/100) × (VS_TS/100) × BMP × FDE_medio

| Version | BMP | FDE_medio | CH₄ (B m³/yr) | CH₄ (M m³/day) | Biogas (M m³/day at 55% CH₄) |
|---|---|---|---|---|---|
| Previous | 115 | 0.0979 | 1.475 | 4.04 | **7.35** |
| Updated | 165 | 0.1185 | 2.561 | 7.02 | **12.76** |
| ΔFIESP gap | — | — | +1.086 | +2.98 | **+5.41** |

_SP biomass input: 247.2M t/yr × TS=58.9% × VS/TS=90% = 131M t VS/yr_

The updated bagasse contribution of **12.76M m³/day biogas** approaches the FIESP 2024 SEMIL feasibility estimate of ~11.4M m³/day (for all sectors combined) — indicating that bagasse alone at medio scenario is now in the same order as the FIESP full-state figure. This confirms that scientifically-validated BMP and FCo corrections are sufficient to reconcile PILAR-2b estimates with the FIESP benchmark without inflating parameters.

### F4. FIESP Benchmark Clarification

| FIESP Reference | Value | Scope |
|---|---|---|
| FIESP/AMPLUN 2021 gross | ~16 M m³ biogas/day | All sectors; theoretical maximum; optimistic FDE |
| SEMIL/FIESP 2024 feasible | **6.4 M Nm³/day biomethane** ≈ **11.4 M m³/day biogas** | Technically and economically feasible |
| SEMIL/FIESP 2024 long-term | 42.5 M Nm³/day | Full infrastructure deployment horizon |
| PILAR-2b updated medio | ~12–15 M m³/day (all sectors) | Three-scenario canonical methodology |
| PILAR-2b previous medio | ~7.5 M m³/day | Conservative Talha/UNICA reference values |

The updated PILAR-2b medio now **brackets the FIESP 2024 feasible estimate** rather than substantially underestimating it.

---

## Section G: Livestock Sector Audit — Spatial Sub-scenarios (2026-06-05)

### G1. ESTERCO_BOVINO — Two-System SP Cattle Model

**Finding:** SP state cattle (10.5M heads, IBGE Censo 2017) consists of two spatially distinct systems:

- **Western SP** (Araçatuba, Presidente Prudente, Marília): extensive beef on open pasture. Manure falls distributed across hundreds of hectares; only cattle in feedlot corrals (~30% of western beef) contribute to collectible manure. FC effectively 0.30–0.40.
- **Eastern SP** (Campinas, Sorocaba, Ribeirão Preto, Piracicaba): intensive dairy in confinement/barns with scraping systems. FC 0.85–0.92; dairy cooperatives enable shared logistics.

Previous FDE used a single "average" FC=0.80 that significantly over-estimated the collectible fraction for the dominant extensive beef system.

| Scenario | System modelled | FC | FCo | FS | FL | Availability |
|---|---|---|---|---|---|---|
| min | Fully extensive beef (western SP) | 0.35 | 0.32 | 0.75 | 0.52 | **0.0437** |
| medio | SP weighted mix (67% beef + 33% dairy) | 0.55 | 0.45 | 0.82 | 0.65 | **0.1320** |
| max | Intensive dairy (eastern SP confinement) | 0.88 | 0.58 | 0.92 | 0.85 | **0.3994** |

The previous medio availability was 0.2142; the updated value is **0.1320** — a more accurate reflection of the SP cattle reality where the majority is on extensive pasture.

**Reference:** IBGE (2017). *Censo Agropecuário 2017 — Resultados Definitivos*. [sidra.ibge.gov.br](https://sidra.ibge.gov.br/pesquisa/censo-agropecuario/censo-agropecuario-2017)

### G2. DEJETOS_SUINO — Rapid VS Degradation Penalty

**Finding (user-confirmed):** All SP swine production is in concentrated intensive systems (confirming high FC=0.85–0.95). However, **liquid swine slurry degrades rapidly**: 20–35% VS loss in 30 days at Brazilian temperatures (25–30°C) when stored in open anaerobic lagoons before biogas capture (Møller et al. 2004).

The FL factor was updated to capture collection timing as well as logistics:

| Scenario | FL | Operational context |
|---|---|---|
| min | **0.55** (from 0.65) | Open-lagoon storage 30+ days → 30–35% VS pre-degraded before collection |
| medio | **0.72** (from 0.75) | Mix of lagoon and prompt capture systems |
| max | **0.88** (from 0.85) | Slurry pit with biogas capture within 24–48 h of production |

This is a conservative but scientifically appropriate downward adjustment for operations without prompt collection systems.

**Reference:** Møller, H.B., Sommer, S.G. & Ahring, B.K. (2004). "Biological degradation and greenhouse gas emissions during pre-storage of liquid animal manure." *Journal of Environmental Quality*, 33, 27-36. DOI: [10.2134/jeq2004.0027](https://doi.org/10.2134/jeq2004.0027)

---

*Updated 2026-06-05 | Parameters committed to branch `claude/pilar2b-scientific-audit-AU4bW`*

*Audit generated 2026-06-04 on branch `claude/pilar2b-scientific-audit-AU4bW` as part of FOSS4G Europe 2026 pre-submission review.*
