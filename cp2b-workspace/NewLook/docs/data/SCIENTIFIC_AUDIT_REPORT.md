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

The FDE (Fator de Disponibilidade Efetivo) is computed as:

```
FDE = fator_realista × conversion_efficiency
    = (FC × FCo × FS × FL)_realista × (digestor_efficiency × substrate_degradability)
```

Source of truth for FC/FCo/FS/FL: `backend/app/migrations/004_import_panorama_data.sql` (min/medio/max)  
Narrative source with citations: `docs/data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md`  
Conversion efficiencies (η): `scripts/calculate_fde_all_residues.py` (NO literature citations)

### B2. Factor Audit Table

| Factor | Feedstock | SQL Value (medio) | Literature Table Value | Literature Range | Source | Status | Notes |
|---|---|---|---|---|---|---|---|
| **FC** | Bagaço de cana | 0.95 | 0.95 | 0.85–0.98 (industrial contracted collection) | UNICA 2024 industry report | ✅ | High FC appropriate for usinas; bagasse is fully collected at mill. |
| **FCo** | Bagaço de cana | 0.182 | ~0.18 | 0.10–0.25 | UNICA 2024 — 80% goes to cogeneration, 2G ethanol | ✅ | Low FCo reflects overwhelming competing use for cogeneration (CETESB-mandated energy use). |
| **FS** | Bagaço de cana | 0.90 | 0.90 | 0.80–0.95 | Sugarcane harvest seasonality (Apr–Nov in SP) | ✅ | Appropriate 8-month harvest window. |
| **FL** | Bagaço de cana | 0.90 | 0.90 | 0.80–0.98 | On-site collection at usinas | ✅ | High logistics factor appropriate — residue is generated at processing facility. |
| **FC** | Dejetos suínos | 0.90 | 0.90 | 0.80–0.95 | EMBRAPA Suínos e Aves 2015 — confined systems | ✅ | |
| **FCo** | Dejetos suínos | 0.50 | 0.55 | 0.40–0.60 | Kunz et al. 2009 – fertigation use; https://www.scielo.br/j/rcpa/a/B98WBF5BNVJLrBKHMK7qM4d/ | ✅ | Minor SQL vs. literature table discrepancy (0.50 vs. 0.55). Both defensible. |
| **FS** | Dejetos suínos | 1.00 | 0.95 | 0.90–1.00 | ABCS 2016 — continuous production | ✅ | Continuous confinement; minimal seasonality. |
| **FL** | Dejetos suínos | 0.90 | 0.75 | 0.60–0.90 | Perdomo et al. 2003 — transport costs; https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1139001 | ⚠️ | SQL FL_medio=0.90 vs. literature table FL=0.75. The discrepancy is significant (20%). Literature table value is better-sourced for SC/RS concentrated swine regions; SP has more dispersed production, suggesting 0.75–0.80 is more appropriate. |
| **FC** | Esterco bovino | 0.70 | 0.80 | 0.30–0.85 | EMBRAPA Gado de Corte 2012 | ⚠️ | SQL FC_medio=0.70 vs. literature table FC=0.80. The lower SQL value may better reflect extensive semi-confinement common in SP beef systems. But the discrepancy is unexplained. |
| **FCo** | Esterco bovino | 0.286 | 0.45 | 0.30–0.55 | Primavesi et al. 2004 | ⚠️ | **Large discrepancy**: SQL FCo_medio=0.286 (71.4% competing) vs. literature table FCo=0.45 (55% competing). The difference propagates directly into FDE: 0.286 vs. 0.45 = 57% difference in this factor alone. |
| **FS** | Esterco bovino | 1.00 | 0.85 | 0.75–0.95 | ANUALPEC 2022 | ⚠️ | SQL assumes full year availability; literature table accounts for 15% seasonal variation in confinement occupancy. |
| **FL** | Esterco bovino | 0.77 | 0.70 | 0.60–0.85 | Coldebella et al. 2006 | ✅ | Minor discrepancy (0.07); acceptable. |
| **FC** | Cama de aviário | 0.87 | 0.80 | 0.70–0.95 | Oliveira et al. 2016 | ✅ | SQL FC_medio=0.87 is slightly above literature table value of 0.80 but within the range. |
| **FCo** | Cama de aviário | 0.286 | 0.50 | 0.40–0.60 | Avila et al. 2007 | ❌ | **Large discrepancy**: SQL FCo_medio=0.286 vs. literature table FCo=0.50. SQL implies 71% competing use; literature table implies 50%. The 50% value (half diverted to feed/fertilizer) is better-cited and more consistent with observed Brazilian practice. |
| **FC** | FORSU | 0.50 | 0.90 | 0.70–0.95 | ABRELPE 2022 | ❌ | SQL FC_medio=0.50 vs. literature table FC=0.90 for source-separated FORSU. This is a major discrepancy. If FORSU is assumed to be from mixed collection (landfill), FC=0.50 may be appropriate; for properly source-separated systems, FC=0.90. The platform conflates these two scenarios. |
| **FCo** | FORSU | 0.85 | 0.65 | 0.55–0.80 | PNRS 2010 | ⚠️ | SQL FCo_medio=0.85 (85% available) vs. literature table FCo=0.65 (35% diverted to feed/composting). High SQL FCo is inconsistent with the very low SQL FC — if only 50% is collected (FC=0.50), the high FCo (0.85) produces a misleadingly high apparent availability. |
| **FC** | Lodo primário | 0.96 | 0.85 | 0.80–0.98 | von Sperling 2007 | ✅ | |
| **FCo** | Lodo primário | 0.65 | 0.75 | 0.60–0.85 | CETESB 2020 P4.230 | ✅ | Minor discrepancy; both within range. |
| **FS** | Lodo primário | 1.00 | 0.95 | 0.90–1.00 | SNIS 2022 — continuous generation | ✅ | |
| **η conversion** | Bagaço de cana | 0.70 | 0.65–0.75 | 0.60–0.80 (literature range for lignocellulosic) | ❌ **NO URL** | ❌ | Conversion efficiencies in `calculate_fde_all_residues.py` (0.60–0.90 by substrate) have **no literature citations whatsoever** — only code comments. These values directly scale all FDE outputs. For a peer-reviewed platform this is a critical gap. |
| **η conversion** | Dejetos suínos | 0.88 | 0.80–0.92 | Literature range | ❌ **NO URL** | ❌ | Same issue — no URL citation. |
| **η conversion** | FORSU | 0.78 | 0.70–0.85 | Literature range | ❌ **NO URL** | ❌ | Same issue — no URL citation. |

### B3. Summary of Correction Factor Discrepancies

The following feedstocks have **SQL vs. literature table factor discrepancies > 0.10** (significant):

| Feedstock | Factor | SQL medio | Lit. Table | Difference | Direction |
|---|---|---|---|---|---|
| Esterco bovino | FCo | 0.286 | 0.45 | 0.164 | SQL gives lower FCo (more competing use) → lower FDE |
| Cama de aviário | FCo | 0.286 | 0.50 | 0.214 | Same direction |
| FORSU | FC | 0.50 | 0.90 | 0.40 | SQL gives lower FC (less collectable) |
| Esterco bovino | FC | 0.70 | 0.80 | 0.10 | SQL gives lower FC |
| Dejetos suínos | FL | 0.90 | 0.75 | 0.15 | SQL gives higher FL |
| Esterco bovino | FS | 1.00 | 0.85 | 0.15 | SQL gives higher FS |

These discrepancies mean the three internal data sources (SQL, literature table, and JSON-derived FDE) are **not mutually consistent**, and users relying on different API endpoints would receive contradictory availability estimates.

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

*Audit generated 2026-06-04 on branch `claude/pilar2b-scientific-audit-AU4bW` as part of FOSS4G Europe 2026 pre-submission review.*
