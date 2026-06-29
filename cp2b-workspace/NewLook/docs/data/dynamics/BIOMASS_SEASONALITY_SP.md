# Biomass Seasonality & Temporal Availability — São Paulo

> Part of the **biomass *dynamics*** series — and the heart of moving from a
> **static** to a **dynamic** view. Biomass is not available year-round: it
> follows **harvest/crush calendars**. This doc catalogues the data that puts the
> platform's substrate estimates **on a time axis**, plus the SP municipal data
> backbone (SEADE). São Paulo–focused. Verified June 2026; _“confirm”_ = re-check.

## Why this matters (the static→dynamic shift)

A município's "sugarcane biogas potential" is a yearly total — but **bagasse,
straw and vinasse only exist during the crush season (~April–November)**. Coffee,
citrus and grain residues have their own windows. Overlaying seasonality onto the
existing potential answers **"is feedstock available *this month*?"** — and, paired
with the energy-price dynamics doc, **"is it available *when energy is most
valuable*?"** That intersection is where biogas projects actually pencil out.

| Question | Source | Cadence |
|----------|--------|---------|
| Sugarcane crush (bagasse/straw/vinasse) progress | **UNICA / UNICADATA** | **bi-weekly (quinzenal)** |
| Crop harvest windows (grains, coffee, cane) | **CONAB safra calendar** | seasonal |
| SP intra-year harvest forecasts | **IEA-SP previsões de safra** | per safra |
| SP municipal socioeconomic/temporal backbone | **SEADE** (API) | varies |

---

## 1. UNICA / UNICADATA — bi-weekly sugarcane crush ⭐ (SP-critical)
- **Gives:** the **quinzenal (bi-weekly) crush report** for the Centro-Sul region (SP is the dominant share): cane crushed per fortnight, sugar/ethanol mix (ATR), season-to-date totals. Sugarcane is SP's #1 substrate, so this is the single most important **temporal** feed.
- **Coverage:** Centro-Sul region (SP-dominant); **bi-weekly through the season** (~Apr–Nov), historical by safra.
- **Access:** `unicadata.com.br` — "Acompanhamento quinzenal da safra" (reports/tables; PDF + UNICAdata tables — confirm machine-readable export).
- **Use in PILAR-2b:** distribute annual bagasse/straw/vinasse over the **actual crush curve** → a monthly availability profile; show **off-season gaps** (when cane biogas feedstock is unavailable and co-digestion/other substrates matter).

## 2. CONAB — safra calendar & monitoring
- **Gives:** crop **harvest calendars and intra-season monitoring** (grains, coffee, sugarcane) — planting/harvest windows by crop and region.
- **Access:** `portaldeinformacoes.conab.gov.br` (séries históricas + safra bulletins; CSV/portal).
- **Use:** seasonality for soy/corn/coffee residues — when straw/husk become available.

## 3. IEA-SP — previsões de safra (SP)
- **Gives:** São Paulo's own **intra-year harvest forecasts and estimates** (subjective/objective surveys), SP-specific by crop and region.
- **Coverage:** 🟩 SP. **Access:** IEA-SP portal (`iea.sp.gov.br` — confirm dataset/API). **Use:** SP-tuned seasonal availability (finer than national CONAB for SP crops).

## 4. SEADE — São Paulo municipal data backbone ⭐
- **Gives:** the state's reference municipal dataset — **GDP, labour, population, vital statistics** for every SP município, with a documented **API** and open portal. The SP-specific socioeconomic spine for any temporal/regional analysis.
- **Coverage:** 🟩 SP, municipal. **Access:** **API-SEADE** (`doc.seade.gov.br`), `perfil.seade.gov.br` (Perfil dos Municípios Paulistas), `municipios.seade.gov.br`, `repositorio.seade.gov.br`, and the state open-data portal `dadosabertos.sp.gov.br`.
- **Use:** SP municipal joins (GDP-agro, population) for the energy/bioeconomy metrics — an SP-native alternative/complement to IBGE with a clean API.

---

## Seasonality matrix (SP, indicative — refine with the sources above)

| Substrate | Availability window | Driver |
|-----------|--------------------|--------|
| Sugarcane bagasse / straw / vinasse | ~Apr–Nov (crush season) | UNICA crush curve |
| Soybean straw | ~Feb–May (harvest) | CONAB/IEA-SP |
| Corn straw (1st/2nd crop) | ~Feb–Jul | CONAB/IEA-SP |
| Coffee husk | ~May–Sep (harvest) | CONAB/IEA-SP |
| Citrus pulp | ~Jun–Dec (processing) | IEA-SP / industry |
| Livestock manure | **year-round** | continuous (baseload feedstock) |
| Urban waste (RSU/RPO) / sewage | **year-round** (mild seasonality) | continuous |

> Key insight for siting/operations: **agricultural feedstocks are seasonal;
> livestock + urban are baseload.** Co-digestion (already modelled in
> `codigestion_service`) is what smooths the annual supply — seasonality data
> makes that case quantitatively.

---

## New temporal capabilities this enables

| Capability | Inputs | Value |
|-----------|--------|-------|
| **Monthly availability profile** per município | annual potential × crush/harvest curves | when feedstock exists |
| **Supply–price intersection** | seasonality × CCEE PLD / bandeiras (energy-price doc) | feedstock available *when energy is valuable* |
| **Co-digestion smoothing case** | seasonal ag + baseload livestock/urban | year-round plant feasibility |
| **Off-season gap analysis** | crush calendar gaps | storage / alternative-substrate need |

## Integration notes

- **Adds a time axis:** like the energy-price doc, this is **time-series**, not a single value — surfaces as a monthly availability chart in the município profile panel.
- **Spatial scope:** UNICA is regional (Centro-Sul) → apply the crush *shape* to SP cane tonnage; IEA-SP/CONAB give SP/crop-specific timing.
- **Access tiers:** SEADE = clean API (automate); CONAB = portal/CSV; UNICA/IEA-SP = reports (periodic refresh, confirm machine-readable form).
- **Ties together the series:** seasonality (this doc) × energy price (energy-price doc) × waste flow (waste doc) = the full **dynamic** picture replacing the static map.

## Sources
- UNICA / UNICADATA (crush): https://unicadata.com.br/
- CONAB safra: https://portaldeinformacoes.conab.gov.br/
- IEA-SP (Instituto de Economia Agrícola): https://www.iea.sp.gov.br/
- SEADE — Perfil dos Municípios Paulistas: https://perfil.seade.gov.br/ · API: http://doc.seade.gov.br/index.php/API-SEADE
- Portal de Dados Abertos do Estado de SP: https://dadosabertos.sp.gov.br/

> _Companion to OPEN_DATA_API_LANDSCAPE.md and ENERGY_LOGISTICS_BIOECONOMY_DATA.md.
> Verified June 2026; re-check “confirm” endpoints before implementation._
