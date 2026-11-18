# Waste Generation & Flow Dynamics — São Paulo

> Part of the **biomass *dynamics*** series. Answers **“how much waste, and how
> does it move?”** — the *flow* of organic/urban waste from where it's generated
> to where it's processed, which is exactly the feedstock for urban biogas
> (RSU/RPO) and ETE biogas. São Paulo–focused. Access verified June 2026;
> _“confirm”_ = re-check before coding.

## Why this matters (flow, not stock)

Today the platform treats urban waste as a static per-município number. In reality
waste is a **flow**: generated here, hauled there, disposed/treated somewhere else —
and São Paulo uniquely **tracks that flow electronically** via SIGOR. Capturing it
turns RSU/RPO/ETE biogas from an estimate into an observed origin→destination map.

| Question | Source | Nature |
|----------|--------|--------|
| Where is waste generated → transported → destined? | **SIGOR-MTR (CETESB)** | manifest flow, SP |
| How much MSW per município, and at what landfill? | **CETESB Inventário de Resíduos** | annual, SP |
| MSW & sewage time series per município | **SNIS / SINISA** | annual, Brazil |
| Sewage volumes treated (ETE feedstock) | **SABESP / SNIS** | operational, SP |

---

## 1. SIGOR-MTR — CETESB waste-manifest system ⭐ (SP-unique)
- **Gives:** the **Manifesto de Transporte de Resíduos** flow for São Paulo — waste **generation → transport → intermediate/final destination**, by waste class, **mandatory since Jan 2021**. The only electronic, near-real-time waste-flow record in the state.
- **Coverage:** 🟩 SP, ongoing. **Access:** `mtr.cetesb.sp.gov.br` (operational system) + **aggregate publications** at `cetesb.sp.gov.br/sigor`. Note: granular MTR records are operational/self-declared (likely restricted); **aggregate/published extracts** are the open surface — confirm what CETESB exposes (and whether a data request is needed).
- **Use in PILAR-2b:** map **organic-waste origin→destination flows** → real catchment for urban-waste biogas; identify where organic waste *concentrates* (transfer stations, landfills) as candidate digester sites.

## 2. CETESB — Inventário Estadual de Resíduos Sólidos
- **Gives:** annual SP inventory — MSW quantities per município, **landfills/aterros** and their quality index (IQR), disposal destinations.
- **Coverage:** 🟩 SP, annual. **Access:** CETESB annual reports (PDF/tables — confirm machine-readable extract).
- **Use:** validate MSW tonnage and locate existing disposal sites (landfill-gas potential).

## 3. SNIS / SINISA — municipal MSW & sewage time series
- **Gives:** **time series** of MSW collected (t/yr), per-capita generation, recycling, and **sewage volumes** per município (solid-waste since 2002; SINISA from 2024).
- **Coverage:** 🟦 municipal, annual. **Access:** SNIS web app + CSV histórica; mirrored on **Base dos Dados (BigQuery)** and `dados.gov.br`.
- **Use:** the **temporal trend** of waste generation (growth → future feedstock); the empirical base for `rsu_*`/`rpo_*` and ETE potential.

## 4. SABESP — sewage / ETE operations (SP)
- **Gives:** SP water/sewage operational data, treated-sewage volumes, some ETE locations. **Access:** SABESP transparency / open data (confirm). **Use:** ETE biogas feedstock (organic load) and `wastewater_treatment_plants` georeferencing.

---

## New dynamic metrics this enables

| Metric | Inputs | Tells you |
|--------|--------|-----------|
| **Organic-waste catchment** | SIGOR origin→destination flows | real digester supply sheds |
| **Waste-concentration hotspots** | SIGOR destinations + CETESB landfills | best urban-biogas / landfill-gas sites |
| **MSW generation trend** | SNIS time series | future feedstock trajectory |
| **Sewage-load potential** | SNIS/SABESP treated volumes | ETE biogas per município |

## Integration notes

- **Flow vs. stock:** SIGOR is **origin–destination edges**, not a per-município scalar — model as flows (extends `proximity_service` / co-digestion clustering toward true catchments).
- **Access reality:** SIGOR granular data may require a formal CETESB request / be aggregated; design for the published-aggregate case first, with a path to richer data if access is granted. SNIS is the dependable open time-series fallback.
- **LGPD:** SIGOR generator records can name companies (legal entities, not persons) — keep to **aggregate** flows; no personal data. Consistent with the platform's data-minimisation posture.

## Sources
- SIGOR-MTR (CETESB): https://cetesb.sp.gov.br/sigor/ · https://mtr.cetesb.sp.gov.br/
- CETESB — resíduos sólidos: https://cetesb.sp.gov.br/
- SNIS / SINISA: https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis · histórica: https://dados.gov.br/dados/conjuntos-dados/snis---srie-histrica
- SABESP: https://www.sabesp.com.br/

> _Companion to OPEN_DATA_API_LANDSCAPE.md and ENERGY_LOGISTICS_BIOECONOMY_DATA.md.
> Verified June 2026; re-check “confirm” endpoints before implementation._
