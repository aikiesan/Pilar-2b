# CP2B Biogas Viability Calculator — Full Methodology

> **File:** `calculatorEngine.ts` (frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts)  
> **Last reviewed:** 2026-05-16  
> **Author:** Pilar-2b / Lucas Nakamura (UNICAMP)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Unit Conventions](#2-unit-conventions)
3. [Activity Types and Input Modes](#3-activity-types-and-input-modes)
4. [Biomass Quantification](#4-biomass-quantification)
   - 4.1 Sugarcane
   - 4.2 Livestock
   - 4.3 Crops (Corn, Soy, Coffee, Citrus)
5. [Biogas Calculation — Core Formula](#5-biogas-calculation--core-formula)
6. [Six Output Streams](#6-six-output-streams)
7. [Seasonality Distribution](#7-seasonality-distribution)
8. [Scenario Factors (Básico / Ideal / Avançado)](#8-scenario-factors-básico--ideal--avançado)
9. [CAPEX Reference Tiers](#9-capex-reference-tiers)
10. [Financial Calculations](#10-financial-calculations)
11. [Payback Range Calculation](#11-payback-range-calculation)
12. [Price References](#12-price-references)
13. [Data Sources](#13-data-sources)

---

## 1. Overview

The calculator estimates annual biogas potential and financial viability for rural and agro-industrial producers in São Paulo state. It is a **screening-level tool** — outputs are order-of-magnitude estimates to guide investment decisions, not engineering designs.

**Calculation flow:**

```
User Input (activity + quantity + months + output selection)
    ↓
Biomass Quantification (per activity type)
    ↓
Raw Biogas (m³/year, CH₄ content)
    ↓ applyScenario()
Scenario-adjusted Outputs (6 streams)
    ↓
Financial + Payback
    ↓
Results Dashboard (3 scenarios side-by-side)
```

---

## 2. Unit Conventions

| Quantity | Unit |
|----------|------|
| Biomass feedstock | tonnes (metric tons, t) |
| Biogas volume | m³/year |
| Methane (CH₄) | m³/year |
| Electrical energy | kWh/year (÷ 1,000 = MWh/year) |
| Thermal energy | MJ/year (÷ 1,000 = GJ/year) |
| Digestate | tonnes/year |
| Biochar | tonnes/year |
| CO₂ avoidance | tCO₂eq/year |
| Revenue | BRL/year |
| Payback | years |

---

## 3. Activity Types and Input Modes

| Activity type key | Display name | Input unit |
|---|---|---|
| `sugarcane` | Cana-de-açúcar | tonnes of raw cane **or** hectares |
| `swine` | Suínos | heads per species |
| `cattle` | Bovinos | heads (corte / leite separately) |
| `poultry` | Aves | heads (postura / corte separately) |
| `livestock` | Pecuária (geral) | all livestock species combined |
| `corn` | Milho (palha+sabugo) | tonnes of residue |
| `soy` | Soja (palha) | tonnes of residue |
| `coffee` | Café (borra/casca) | tonnes of residue |
| `citrus` | Citros (bagaço) | tonnes of residue |

### Sugarcane: hectares → tonnes conversion

```
tonnes_cane = hectares × 75  t/ha
```

The 75 t/ha factor is the Brazilian national average productivity (CONAB/UNICA historical series). Actual SP productivity ranges 70–85 t/ha; 75 is used as a conservative central estimate.

---

## 4. Biomass Quantification

### 4.1 Sugarcane — Multi-stream BMP method

Sugarcane generates four distinct residue streams, each with its own biochemical methane potential. All four are summed.

#### Residue stream parameters

| Stream | Key | RPR | VS | FDE | CH₄ content | BMP |
|--------|-----|-----|----|-----|-------------|-----|
| Bagaço (bagasse) | `bagaco` | 0.28 | 0.88 | 0.20 | 55% | 350 m³ CH₄/tVS |
| Palha (straw) | `palha` | 0.14 | 0.82 | 0.40 | 55% | 300 m³ CH₄/tVS |
| Vinhaça (stillage) | `vinhaca` | 0.12 | 0.02 | 0.90 | 65% | 350 m³ CH₄/tVS |
| Torta de filtro (filter cake) | `torta` | 0.03 | 0.75 | 0.35 | 60% | 280 m³ CH₄/tVS |

**Parameters defined as:**
- **RPR (Residue-to-Product Ratio):** tonnes of residue per tonne of raw cane input
- **VS (Volatile Solids fraction):** dry organic fraction of the residue (dimensionless, 0–1)
- **FDE (Farm-level Digestion Efficiency / availability):** fraction of generated residue that is practically collectable and directed to the digester (accounts for soil return, burning, transport losses)
- **CH₄:** volumetric fraction of methane in raw biogas for that stream
- **BMP:** Biochemical Methane Potential in m³ of CH₄ per tonne of Volatile Solids (m³ CH₄/tVS)

#### Per-stream formula

```
available_tons[stream]  = tons_cane × RPR[stream] × FDE[stream]

biogas_raw[stream]      = available_tons[stream] × VS[stream] × (BMP[stream] / CH₄[stream])
```

The `BMP / CH₄` ratio converts from "m³ CH₄/tVS" (what BMP measures) to "m³ biogas/tVS" (what the digester actually produces).

#### Aggregation across all 4 streams

```
totalBiogasM3Year   = Σ biogas_raw[stream]

ch4Weighted         = Σ (biogas_raw[stream] × CH₄[stream]) / totalBiogasM3Year

biomassTotal        = Σ available_tons[stream]

strawTons           = available_tons[palha]   ← used later for biochar
```

#### Typical values for 1,000 t/year cane input

| Stream | Available (t) | Biogas (m³) | CH₄ (m³) |
|--------|--------------|-------------|---------|
| Bagaço | 56.0 | ~35,636 | ~19,600 |
| Palha | 7.84 | ~5,424 | ~2,983 |
| Vinhaça | 2.16 | ~14,769 | ~9,600 |
| Torta | 0.79 | ~295 | ~177 |
| **Total** | **66.8** | **~56,124** | **~32,360** |

---

### 4.2 Livestock — PPB method (m³ biogas / head / year)

Livestock biogas is estimated from empirical production coefficients per animal head per year. These are whole-system figures incorporating manure collection efficiency typical for Brazilian installations.

#### Coefficients (EMBRAPA 2023; IEA Bioenergy; Chernicharo 2016)

| Species key | Common name | PPB (m³ biogas/head/year) | CH₄ content |
|------------|-------------|--------------------------|-------------|
| `swine` | Suínos | **200** | 65% |
| `cattle_beef` | Bovinos de corte | **350** | 60% |
| `cattle_dairy` | Bovinos leiteiros | **500** | 60% |
| `poultry_eggs` | Galinhas poedeiras | **1.4** | 60% |
| `poultry_meat` | Frangos de corte | **0.8** | 60% |

**Note on dairy vs. beef:** Dairy cattle generate ~43% more biogas per head because (a) they are higher-producing animals with more manure, and (b) dairies typically have liquid manure collection systems (freestall), giving higher effective digestion.

#### Formula

```
biogas[species] = heads[species] × PPB[species]

totalBiogasM3Year   = Σ biogas[species]

ch4Weighted         = Σ (biogas[species] × CH₄[species]) / totalBiogasM3Year

biomassTotal        = totalBiogasM3Year × 0.08
```

The `× 0.08` proxy converts biogas volume to a rough biomass input estimate for digestate calculation. It is not used for biogas calculation itself — only for output consistency.

**Biochar note:** Livestock manure is not suitable for pyrolysis in this model (`dryLigno = 0`), so biochar output is zero for livestock.

---

### 4.3 Crops — Single-stream BMP method

Crops use the same BMP approach as sugarcane but with a single residue stream.

#### Crop parameters

| Crop | Key | BMP | VS | Avail | CH₄ | Sources |
|------|-----|-----|----|-------|-----|---------|
| Milho (palha+sabugo) | `corn` | 320 m³ CH₄/tVS | 0.83 | 0.50 | 55% | Denis Miranda 2022; EMBRAPA Agroenergia |
| Soja (palha) | `soy` | 270 m³ CH₄/tVS | 0.80 | 0.45 | 55% | MAPA 2021; Luca et al. 2020 |
| Café (borra/casca) | `coffee` | 380 m³ CH₄/tVS | 0.78 | 0.70 | 58% | EMBRAPA Café 2022; Rocha et al. 2019 |
| Citros (bagaço) | `citrus` | 340 m³ CH₄/tVS | 0.85 | 0.60 | 56% | CEPEA/USP 2021; Silveira et al. 2020 |

**Avail (availability factor):** fraction of total residue mass that is effectively collected and delivered to the digester after accounting for:
- Soil organic matter return (regulatory and agronomic requirement)
- Logistics (transport radius, field collection losses)
- Competing uses (animal feed for corn/soy, export/industry for coffee)

Coffee has the highest availability (0.70) because borra/casca are already centralized at processing facilities.

#### Formula

```
availTons    = tonnes_input × Avail

biogasM3Year = availTons × VS × (BMP / CH₄)

ch4Weighted  = CH₄[crop]   (single stream, no weighting needed)

biomassTotal = availTons

dryLigno     = biomassTotal × 0.87   ← used for biochar
```

---

## 5. Biogas Calculation — Core Formula

All three pathways (sugarcane, livestock, crops) produce three core values that feed into `calcOutputs()`:

| Variable | Description |
|----------|-------------|
| `biogasM3Year` | Total raw biogas volume (m³/year) |
| `ch4Content` | Weighted average CH₄ fraction (0–1) |
| `biomassTotal` | Feedstock mass processed (t/year) |
| `dryLignoCellulosic` | Dry lignocellulosic biomass for biochar (t/year) |

These four values are passed as-is to the output calculation, and then **scaled by scenario factors** before being shown to the user.

---

## 6. Six Output Streams

All outputs are calculated from the same three primitives. The calculation uses avg-scenario constants as the base; scenario adjustment happens separately in `applyScenario()`.

### Conversion constants

| Constant | Value | Source |
|----------|-------|--------|
| CH₄ Lower Heating Value (LHV) | **35.8 MJ/m³** | ISO 6976 |
| Electrical efficiency (generator set) | **35%** | Avg. CHP/genset, Ideal scenario baseline |
| Thermal efficiency (heat recovery) | **50%** | Typical CSTR heat exchanger |
| MJ → kWh | **1 / 3.6** | (= 0.2778 kWh/MJ) |
| CH₄ diesel equivalence | **0.85 L diesel / m³ CH₄** | ANEEL 2023 |
| CO₂ mass ratio of CH₄ combustion | **0.657 × (44/16) / 1,000 tCO₂eq/m³ CH₄** | molecular weight ratio |

### 6.1 Electrical Energy

```
CH4_m3_year    = biogasM3Year × ch4Content

energyKwhYear  = CH4_m3_year × 35.8 MJ/m³ × 0.35 (elec_eff) × (1/3.6)
               = CH4_m3_year × 3.481 kWh/m³ CH₄
```

Displayed as **MWh/year** (÷ 1,000).

### 6.2 Biomethane

```
biomethaneM3Year = CH4_m3_year
```

Biomethane is assumed to equal the raw methane volume — a simplification that neglects upgrading losses (~3–5%). Acceptable for screening level.

Displayed as **m³/year**.

### 6.3 Digestate

```
digestateTonsYear = biomassTotal × 0.75
```

The 0.75 factor accounts for:
- Water removal during anaerobic digestion (~25% mass loss as biogas + evaporation)
- Resulting stabilized slurry mass

Displayed as **t/year**. Sub-label in results notes its value as organic fertilizer substitute (no financial valuation included — local market varies too widely).

### 6.4 Thermal Energy

```
thermalMjYear = CH4_m3_year × 35.8 MJ/m³ × 0.50 (thermal_eff)
              = CH4_m3_year × 17.9 MJ/m³ CH₄
```

Represents recoverable heat from CHP exhaust gases. At 50% thermal recovery this corresponds to what a well-engineered CHP installation captures. Displayed as **GJ/year** (÷ 1,000).

### 6.5 Biochar

```
biocharTonsYear = dryLignoCellulosic × biocharYield[avg]
               = dryLignoCellulosic × 0.28
```

Biochar comes from **slow pyrolysis** of the dry lignocellulosic fraction only:
- **Sugarcane:** straw (palha) — `strawTons`
- **Crops:** `biomassTotal × 0.87`
- **Livestock:** 0 (manure is not suitable for pyrolysis in this model)

The 0.28 yield (28%) is the Ideal scenario baseline. It varies by scenario (see §8).

Displayed as **t/year**.

### 6.6 CO₂ Avoidance (Carbon Credits)

```
co2TonsYear = CH4_m3_year × 0.657 × (44/16) / 1,000
```

Breakdown:
- `0.657`: kg CO₂eq per m³ CH₄ at standard conditions (density × GWP factor for methane combustion)
- `44/16`: molecular weight ratio CO₂/CH₄ (full oxidation stoichiometry)
- `/ 1,000`: converts kg → tonnes

This estimates the **avoided emissions** from substituting fossil fuels with biogas-derived energy. Eligible for carbon credits under VCM (voluntary) or RenovaBio (Brazilian mandatory market).

Displayed as **tCO₂eq/year**.

---

## 7. Seasonality Distribution

Biogas production follows the feedstock harvest/availability calendar. The user selects active months via `StepSazonalidade`. The engine distributes annual production uniformly across the active months:

```
perMonth = biogasYearly / |activeMonths|

monthly[m].biogas  = perMonth   if m ∈ activeMonths, else 0
monthly[m].energy  = monthly[m].biogas × ch4Content × 35.8 × elecEff × (1/3.6)
```

### Default active months per activity

| Activity | Default months | Rationale |
|----------|---------------|-----------|
| Sugarcane | Apr–Dec (9 months) | SP safra: starts Apr, ends Dec; Jan–Mar = entressafra |
| Livestock | All 12 months | Continuous production |
| Corn | Jul, Aug, Sep (3) | Safrinha SP harvest |
| Soy | Feb, Mar, Apr (3) | Verão SP harvest |
| Coffee | Jun, Jul, Aug, Sep (4) | Principal SP harvest |
| Citrus | Jun–Oct (5) | Processing season |

The user can override any month individually by toggling on the seasonality step. At least 1 month must remain active.

---

## 8. Scenario Factors (Básico / Ideal / Avançado)

Three technology scenarios represent different levels of investment, sophistication, and operational maturity. The base calculation always runs at **Ideal** coefficients; results are then scaled for each scenario in `applyScenario()`.

### Scenario parameters

| Parameter | Básico 🌱 | Ideal ⚙️ | Avançado 🚀 |
|-----------|-----------|----------|------------|
| **Label (pt)** | Básico | Ideal | Avançado |
| **Technology** | Lagoa coberta / tubular PVC | Biodigestor CSTR | CSTR + upgrading / CHP premium |
| **Utilization** | 55% | 75% | 90% |
| **Startup months** | 4 | 6 | 10 |
| **BMP factor** | 0.75× | 1.00× (baseline) | 1.20× |
| **Electrical efficiency** | 28% | 35% | 42% |
| **Thermal efficiency** | 40% | 50% | 60% |
| **Biochar yield** | 20% | 28% | 35% |
| **CAPEX tier** | Baixo | Médio | Alto |

### Parameter meanings

- **Utilization:** fraction of the theoretically available biomass that is actually processed. Even in the Avançado scenario, 10% is lost to collection inefficiency, pre-treatment rejects, and dead volume.

- **BMP factor:** multiplier applied to the base biogas volume. The 1.20× for Avançado reflects optimized retention times, temperature control (mesophilic 35°C vs ambient in lagoon), and better feedstock pre-treatment. The 0.75× for Básico reflects ambient-temperature lagoon digestion, which achieves lower conversion.

- **Electrical efficiency:** genset efficiency from CH₄ to AC electricity:
  - 28% → simple open-frame gas generator (common in small installations)
  - 35% → container CHP unit (standard CSTR pairing)
  - 42% → premium CHP with heat recovery optimization

- **Thermal efficiency:** recoverable heat from exhaust and jacket cooling:
  - 40% → basic heat exchanger
  - 50% → standard CHP
  - 60% → optimized thermal loop with multiple heat uses

- **Biochar yield:** fraction of dry lignocellulosic biomass converted to biochar in slow pyrolysis (500–600°C):
  - 20% → basic kiln, high moisture, poor temperature control
  - 28% → optimized retort
  - 35% → industrial continuous pyrolyzer

### `applyScenario()` scaling logic

```
biogas_scenario   = base.totalBiogasM3Year × bmpFactor

energy_scenario   = base.energyKwhYear × bmpFactor × (elecEff_scenario / elecEff_avg)
                  = base.energyKwhYear × bmpFactor × (elecEff / 0.35)

thermal_scenario  = base.thermalMjYear × bmpFactor × (thermalEff / 0.50)

biomethane        = base.biomethaneM3Year × bmpFactor

digestate         = base.digestateTonsYear × bmpFactor

co2               = base.co2TonsYear × bmpFactor

biochar           = base.biocharTonsYear × (biocharYield / 0.28)   ← independent of bmpFactor
```

Biochar scales only on pyrolysis yield, not on BMP, because it comes from a separate thermochemical pathway.

CH₄ content (`ch4ContentWeighted`) does not change between scenarios — it is a feedstock property, not a technology variable.

---

## 9. CAPEX Reference Tiers

CAPEX tier is selected **automatically** based on annual biogas volume, then overridden by scenario:

### Automatic tier selection (from biogas volume)

```
if biogasM3Year < 100,000   → Tier 0 (Baixo)
if biogasM3Year < 1,000,000 → Tier 1 (Médio)
else                         → Tier 2 (Alto)
```

### Tier reference values

| Tier | Label | Range | Mid-point (reference) | Typical installation |
|------|-------|-------|-----------------------|---------------------|
| 0 | Baixo | R$ 80k – 300k | **R$ 190,000** | Lagoa coberta, tubular PVC, small farm |
| 1 | Médio | R$ 300k – 2M | **R$ 1,150,000** | CSTR 200–2,000 m³, medium property |
| 2 | Alto | R$ 2M – 10M+ | **R$ 6,000,000** | CSTR + upgrading + CHP, agro-industrial |

Each scenario then forces its tier:
- **Básico** → always Tier 0 (even if biogas volume suggests higher)
- **Ideal** → always Tier 1
- **Avançado** → always Tier 2

The investment display shows only the **floor** of the range (optimistic CAPEX):
```
floor = mid × 0.65   (CAPEX_LOW_FACTOR)
```

Full range used internally for payback:
```
low  = mid × 0.65
high = mid × 1.50
```

---

## 10. Financial Calculations

### Revenue streams

Only the outputs the user selected are included in the payback-driving revenue:

| Output selected | Revenue formula |
|----------------|----------------|
| Energia elétrica | `energyKwhYear × energyTariffBrlKwh` |
| Biometano | `biomethaneM3Year × biomethaneM3` |
| Crédito de carbono | `co2TonsYear × co2CreditBrlTon` |
| Digestato, Biochar, Térmica | Not monetized (too site-specific) |

**Revenue aggregation logic:**

```
primaryRev  = energySavings  if energySavings > 0
            else biomethaneRev

annualRevMax = primaryRev + carbonRev
```

Energy and biomethane are treated as **mutually exclusive primary revenues** (you either inject into grid or upgrade to biomethane, not both simultaneously). Carbon credits always stack on top of whichever is chosen.

### Annual revenue variants

| Variant | Formula | Meaning |
|---------|---------|---------|
| `annualRevenueMaxBRL` | `annualRevMax` | Nominal theoretical maximum at face-value prices |
| `annualRevenueAvgBRL` | `annualRevMax × 0.75` | Realistic expected (see §11) |

### Diesel equivalence

```
dieselEquivLitersYear = biomethaneM3Year × CH4_DIESEL_EQUIV_RATIO × 1,000
                      = biomethaneM3Year × 0.85 × 1,000
```

The ×1,000 converts m³ CH₄ to litres of equivalent diesel (since `CH4_DIESEL_EQUIV_RATIO = 0.85 L/m³` is expressed per m³). Displayed in results for context when biomethane is a selected output.

---

## 11. Payback Range Calculation

The payback calculation deliberately models **three realistic scenarios**, not a single theoretical number. This is the most important departure from naïve calculators.

### Why three payback values

A simple `CAPEX / annual_revenue` formula systematically overestimates returns because:
1. **Year 1–2 ramp-up:** microbial communities take 3–6 months to stabilize; production is 40–60% of steady-state during this period
2. **Revenue realization gap:** spot tariffs for energy, grid access restrictions, biomethane market immaturity, and seasonal variation mean actual revenue is typically 45–75% of theoretical
3. **Maintenance costs:** compressors, membranes (upgrading), gas lines, and instrumentation require ongoing OPEX
4. **Consultancy and startup overhead:** engineering, permitting, and commissioning add 10–25% to effective CAPEX

### Parameters

| Parameter | Symbol | Value | Meaning |
|-----------|--------|-------|---------|
| Startup cost factor | `STARTUP_COST_FACTOR` | 0.12 | Consultancy + commissioning adds 12% to effective CAPEX |
| Revenue — best case | `REVENUE_BEST` | 1.10× | Optimistic: good tariffs, smooth operation, slight overperformance |
| Revenue — realistic | `REVENUE_AVG` | 0.75× | Typical: downtime, seasonal variation, partial market access |
| Revenue — conservative | `REVENUE_WORST` | 0.45× | Pessimistic: year 1–2 learning curve, poor market, frequent stops |
| Maintenance — low | `MAINT_LOW` | 3% of CAPEX/year | Simple systems (lagoon, minimal moving parts) |
| Maintenance — mid | `MAINT_MID` | 5% of CAPEX/year | Standard CSTR + gas management |
| Maintenance — high | `MAINT_HIGH` | 8% of CAPEX/year | CSTR + upgrading + CHP premium |

### Three payback formulas

All three use:
```
cl = capex_mid × 0.65   (low-end CAPEX)
cm = capex_mid          (mid-point CAPEX)
ch = capex_mid × 1.50   (high-end CAPEX)
```

#### Otimista (minimum payback)

Best tariffs, CAPEX at floor, minimal maintenance:

```
net_best = annualRevMax × REVENUE_BEST − cl × MAINT_LOW
         = annualRevMax × 1.10 − cl × 0.03

payback_min = (cl × 1.06) / net_best
```

The `1.06` adds a 6% financing / opportunity cost factor even in the best case.

Returns `999` (displayed as "Longo prazo") if `net_best ≤ 0`.

#### Esperado (average payback)

Realistic revenue, mid CAPEX, standard maintenance, full startup overhead:

```
net_avg = annualRevMax × REVENUE_AVG − cm × MAINT_MID
        = annualRevMax × 0.75 − cm × 0.05

payback_avg = (cm × 1.12) / net_avg
```

The `1.12` = `1 + STARTUP_COST_FACTOR` incorporates consultancy/commissioning overhead.

Returns `999` if `net_avg ≤ 0`.

#### Conservador (maximum payback)

Worst-case revenue realization, high CAPEX, high maintenance, extended startup:

```
net_worst = annualRevMax × REVENUE_WORST − ch × MAINT_HIGH
          = annualRevMax × 0.45 − ch × 0.08

payback_max = min((ch × 1.25) / net_worst, 40)
```

The `1.25` = extended startup/commissioning overhead (vs 1.12 in expected). The result is capped at **40 years** — anything above 40 is treated as economically indeterminate (`999`) and displayed as "Longo prazo — retorno depende de tarifa e consultoria".

#### Guard condition

If `annualRevNominal ≤ 0` (no monetizable outputs selected, or output volume is zero):
```
return { min: 999, avg: 999, max: 999 }
```

### Rounding

All payback values are rounded to one decimal place:
```
roundYears(y) = round(y × 10) / 10
```

Minimum meaningful payback is 0.5 years (6 months):
```
payback_min = max(roundYears(pb_min), 0.5)
```

---

## 12. Price References

All prices are São Paulo state defaults for 2025. The user can override all four via the price sliders in the Results dashboard.

| Price | Default | Slider range | Source |
|-------|---------|-------------|--------|
| Tarifa de energia elétrica | R$ 0.85/kWh | R$ 0.50 – 1.50/kWh | CPFL/Enel residential avg 2025 |
| Preço biometano | R$ 4.50/m³ | R$ 1.00 – 8.00/m³ | Indicative SP market 2025 |
| Crédito de carbono | R$ 35.00/tCO₂eq | R$ 10 – 100/tCO₂eq | VCM voluntary market 2025 |
| Diesel | R$ 6.50/L | R$ 4.00 – 9.00/L | SP pump price 2025 |

**Energy tariff note:** R$ 0.85/kWh is the residential B1 class average for CPFL/Enel SP in 2025, including all taxes and surcharges (TUSD + TE + PIS/COFINS + ICMS). For agricultural (rural) tariffs or net metering (GD-I), the effective tariff may be 15–30% lower. The slider allows this adjustment.

**Biomethane note:** The R$ 4.50/m³ is indicative. The market in Brazil was in formation in 2025, with spot prices ranging R$ 2.50–7.00/m³ depending on volume, pipeline access, and off-take contract terms.

**Carbon note:** R$ 35/tCO₂eq reflects the lower end of the Brazilian VCM (voluntary carbon market). RenovaBio CBIO credits traded R$ 40–55 in 2024–2025. The slider goes to R$ 100 to allow sensitivity testing for future compliance market scenarios.

---

## 13. Data Sources

| Source | Used for |
|--------|---------|
| **UNICA 2023** | Sugarcane stream RPR values, productivity benchmarks |
| **EMBRAPA Agroenergia** | Bagasse, straw BMP; crop residue BMP (corn); digestate characterization |
| **NBR 15.527** | Methane content fractions; LHV standardization |
| **Denis Miranda 2022** | Cross-validation: cattle BMP, corn straw BMP, Amazon bioeconomy context |
| **MAPA 2021** | Soy residue availability factor and BMP |
| **Luca et al. 2020** | Soy straw BMP validation |
| **EMBRAPA Café 2022** | Coffee borra/casca BMP and availability |
| **Rocha et al. 2019** | Coffee residue CH₄ content |
| **CEPEA/USP 2021** | Citrus bagasse BMP, availability in SP processing clusters |
| **Silveira et al. 2020** | Citrus biogas validation |
| **EMBRAPA 2023** | Livestock PPB coefficients (suínos, bovinos, aves) |
| **Chernicharo 2016** | Anaerobic reactors design manual — baseline efficiency factors |
| **IEA Bioenergy** | CH₄ content by livestock type; CHP efficiency benchmarks |
| **ISO 6976** | CH₄ Lower Heating Value (35.8 MJ/m³) |
| **ANEEL 2023** | CH₄–diesel equivalence ratio (0.85 L/m³) |
| **CONAB / UNICA** | Sugarcane yield 75 t/ha national average |

---

## Appendix A — Worked Example: 500 t/year Sugarcane, Ideal Scenario

**Input:** 500 t/year raw cane, all months Apr–Dec (9 months), output = Energia + Carbono

### Step 1 — Biomass and biogas per stream

| Stream | avail_t | biogas_m³ | ch4_m³ |
|--------|---------|-----------|--------|
| Bagaço | 500×0.28×0.20 = **28.0 t** | 28.0×0.88×(350/0.55) = **17,618** | 9,690 |
| Palha | 500×0.14×0.40 = **28.0 t** | 28.0×0.82×(300/0.55) = **12,567** | 6,912 |  
| Vinhaça | 500×0.12×0.90 = **54.0 t** | 54.0×0.02×(350/0.65) = **580** | 377 |
| Torta | 500×0.03×0.35 = **5.25 t** | 5.25×0.75×(280/0.60) = **1,838** | 1,103 |
| **Total** | **115.25 t** | **32,603 m³** | **18,082 m³** |

CH₄ weighted = 18,082 / 32,603 = **55.5%**

### Step 2 — Outputs (Ideal scenario, bmpFactor = 1.00)

```
CH4_m3_year       = 32,603 × 0.555         = 18,095 m³/year
energyKwhYear     = 18,095 × 35.8 × 0.35 × (1/3.6) = 63,014 kWh/year = 63.0 MWh/year
biomethaneM3Year  = 18,095 m³/year
digestateTonsYear = 115.25 × 0.75           = 86.4 t/year
thermalMjYear     = 18,095 × 35.8 × 0.50   = 323,900 MJ/year = 323.9 GJ/year
biocharTonsYear   = 28.0 × 0.28             = 7.8 t/year  (straw only)
co2TonsYear       = 18,095 × 0.657 × (44/16) / 1,000 = 32.6 tCO₂eq/year
```

### Step 3 — Financial (energia + carbono selected)

```
energySavings = 63,014 × 0.85        = R$ 53,562/year
carbonRev     = 32.6   × 35.00       = R$ 1,141/year
annualRevMax  = 53,562 + 1,141       = R$ 54,703/year
```

### Step 4 — CAPEX tier

`biogasM3Year = 32,603` → **< 100,000** → Tier 0 (Baixo), but Ideal scenario forces **Tier 1 (Médio)**

```
cm = R$ 1,150,000
cl = 1,150,000 × 0.65 = R$ 747,500
ch = 1,150,000 × 1.50 = R$ 1,725,000
```

### Step 5 — Payback range

```
Otimista:
  net_best    = 54,703 × 1.10 − 747,500 × 0.03 = 60,173 − 22,425 = R$ 37,748/year
  payback_min = (747,500 × 1.06) / 37,748       = 21.0 years

Esperado:
  net_avg     = 54,703 × 0.75 − 1,150,000 × 0.05 = 41,027 − 57,500 = −R$ 16,473/year
  payback_avg = → 999 (negative net — revenue too low for mid CAPEX at 500 t/year)

Conservador: → 999
```

**Interpretation:** At 500 t/year (a very small operation), the Ideal scenario's CAPEX (R$ 1.15M mid-point) is too large relative to the revenue base. The Básico scenario (Tier 0, R$ 190k mid) would be the appropriate technology choice for this scale — CAPEX floor of ~R$ 124k gives a payback of approximately 3–6 years.

---

## Appendix B — Scale Guide for Sugarcane Producers

| Scale | t/year | ha/year | Annual biogas (m³) | Recommended scenario |
|-------|--------|---------|-------------------|---------------------|
| Micro | 100 | ~1.3 ha | ~6,500 | Básico (tubular PVC) |
| Pequeno | 500 | ~6.7 ha | ~32,600 | Básico or Ideal |
| Médio | 2,000 | ~27 ha | ~130,000 | Ideal (CSTR) |
| Grande | 10,000 | ~133 ha | ~651,000 | Ideal or Avançado |
| Usina pequena | 50,000+ | ~667+ ha | 3,000,000+ | Avançado |

---

*This document reflects the calculator as built through Sprint 3 (May 2026). Coefficients should be reviewed annually against EMBRAPA and UNICA updates.*
