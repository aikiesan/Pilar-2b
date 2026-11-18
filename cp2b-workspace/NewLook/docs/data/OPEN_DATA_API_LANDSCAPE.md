# Open-Data & API Landscape for Biomass → Bioenergy / Biogas Mapping

> A curated analysis of **public, open, freely available** data sources and APIs
> relevant to PILAR-2b / CP2B Maps: mapping biomass for bioenergy, biogas and
> bioproducts. **Primary focus: São Paulo state; designed to expand to all of
> Brazil** (and, for the Atlas moonshot, internationally).
>
> Each source is mapped to the platform's actual data model — the FDE forward
> engine (`M_wet × TS × VS × BMP × FDE`) and the published tables
> (`municipalities`, `biogas_plants`, `gas_pipelines`,
> `power_transmission_lines`, `power_substations`,
> `wastewater_treatment_plants`, `residuos`). The goal is to tell you **which
> source feeds which substrate/layer, how to access it, and what to wire up
> first.**
>
> Access details verified June 2026; endpoints marked _“confirm”_ are from
> domain knowledge and should be re-checked before coding. Links in
> [Sources](#sources).

---

## How to read this

PILAR-2b needs four broad classes of input. Every source below is tagged to one:

| Class | Drives | Current table(s) |
|-------|--------|------------------|
| 🌾 **Agricultural residues** | sugarcane, soy, corn, coffee, citrus → crop residue mass | `municipalities.*_biogas_m3_year`, `residuos` |
| 🐄 **Livestock manure** | cattle, swine, poultry herds → manure | `municipalities.livestock_*`, `cattle_*` |
| 🏙️ **Urban / sanitation** | population, MSW (RSU/RPO), sewage → ETE biogas | `municipalities.urban_*`, `rsu_*`, `wastewater_treatment_plants` |
| 🗺️ **Geospatial & energy infrastructure** | boundaries, plants, pipelines, grid | `municipalities.geometry`, `biogas_plants`, `gas_pipelines`, `power_*` |

**Coverage legend:** 🟩 SP-specific · 🟦 Brazil-wide (municipal) · 🌍 global.
**Access legend:** REST API · WFS/WMS (OGC) · CSV/bulk · BigQuery/SQL · portal/PDF.

---

## Priority shortlist — integrate these first

The eight highest-leverage sources: open, municipal granularity, real programmatic access, and each closes a concrete gap.

| # | Source | Class | Why first | Access |
|---|--------|-------|-----------|--------|
| 1 | **IBGE SIDRA / Agregados API** (PAM crops + PPM herds) | 🌾🐄 🟦 | The canonical municipal numbers behind every crop-residue and manure estimate — auto-refreshable | REST JSON |
| 2 | **IBGE Malhas API v3** | 🗺️ 🟦 | Official municipal/UF boundary GeoJSON — replace/validate `municipalities.geometry` from the source of truth | REST GeoJSON |
| 3 | **ANEEL SIGA** | 🗺️ 🟦 | Georeferenced power plants incl. **biomass & biogas thermo** — populate/validate `biogas_plants` + grid | WFS/GeoJSON/CSV |
| 4 | **ANP biomethane panel** | 🗺️ 🟩🟦 | Authorized biomethane plants (incl. SP) — ground-truth for real biogas→biomethane projects | portal/CSV |
| 5 | **MapBiomas** | 🌾 🟦 | Annual 30 m (10 m beta) land-use/crop masks — spatially allocate residues within a municipality | GEE / WMS / download |
| 6 | **SNIS / SINISA** | 🏙️ 🟦 | Municipal MSW tonnage + sewage volumes — the empirical base for `rsu_*` and ETE potential | CSV / BigQuery |
| 7 | **DataGEO / IDEA-SP** | 🗺️ 🟩 | SP environmental SDI (watersheds, APPs, land) for SP-specific siting layers | WMS (some WFS) |
| 8 | **Base dos Dados (BigQuery)** | all 🟦 | One SQL warehouse that already mirrors IBGE/SNIS/SEEG with standardized `id_municipio` — fastest ingestion path | BigQuery SQL |

---

## A. 🌾 Agricultural residue substrates (crops)

### A1. IBGE — Produção Agrícola Municipal (PAM) via SIDRA / Agregados API ⭐
- **Gives:** planted/harvested area, quantity produced, yield, production value, **per municipality, per crop, annual** (1974–). Directly drives sugarcane, soy, corn, coffee, citrus residue mass.
- **Coverage:** 🟦 all 5,570 municipalities (Brazil-wide; SP included).
- **Access — REST JSON:**
  - Agregados API: `https://servicodados.ibge.gov.br/api/v3/agregados/{tabela}/...`
  - SIDRA values API: `https://apisidra.ibge.gov.br/values/t/{tabela}/...`
  - Key tables: **1612** (temporary crops — cane, soy, corn), **1613** (permanent crops — coffee, citrus), **5457** (consolidated).
- **License:** open (IBGE public data). **Cadence:** annual.
- **Maps to:** `municipalities.sugarcane/soybean/corn/coffee/citrus_biogas_m3_year` (via FDE residue factors). **This is the #1 auto-refresh target.**

### A2. CONAB — Séries Históricas das Safras
- **Gives:** crop monitoring — **sugarcane** and **coffee** series (SP-relevant), grains; area/yield/production, by UF and crop.
- **Coverage:** 🟦 (UF / region; finer for some crops). **Access:** portal `portaldeinformacoes.conab.gov.br` + CSV downloads; Pentaho data service (confirm).
- **Use:** cross-check / more timely than annual PAM for cane & coffee; sugarcane is SP's dominant substrate.

### A3. IEA-SP / CATI **LUPA** (Levantamento das Unidades de Produção Agropecuária) 🟩
- **Gives:** SP agricultural **census at the rural-property level** — crops, areas, livestock, georeferenced production units. The richest SP-specific allocation layer.
- **Coverage:** 🟩 São Paulo only. **Access:** IEA-SP / CATI portals, downloads (confirm current LUPA edition + format).
- **Use:** sub-municipal localization of substrates in SP — a differentiator vs. municipal averages.

### A4. MapBiomas (land use / crop masks) ⭐ — *already used in the platform*
- **Gives:** annual land-cover/use rasters; agriculture, pasture, sugarcane, forestry classes. Collection 9 (30 m, 1985–2023) + 10 m beta (Sentinel-2).
- **Coverage:** 🟦 Brazil (biome-wide). **Access:** download portal, **Google Earth Engine** assets (`projects/mapbiomas-public/...`), WMS tiles, statistics toolkit.
- **Use:** spatially **disaggregate** municipal crop totals onto actual cropland; mask where residues physically are (ties to map display tiers).

### A5. IBGE — Censo Agropecuário 2017 (SIDRA)
- **Gives:** deep structural ag data incl. **manure/dejection management**, irrigation, establishment counts.
- **Coverage:** 🟦 municipal (census years). **Access:** SIDRA / Agregados API (tables 6619, 6620…). **Use:** refine FDE availability factors and manure-management assumptions.

---

## B. 🐄 Livestock manure substrates

### B1. IBGE — Pesquisa da Pecuária Municipal (PPM) via SIDRA ⭐
- **Gives:** **effective herds per municipality, annual** — cattle, swine, poultry, etc.; plus milk, eggs. Directly drives manure-based biogas.
- **Coverage:** 🟦 all municipalities. **Access:** Agregados / SIDRA API — table **3939** (effective herds), **74/94** (animal production).
- **Maps to:** `municipalities.cattle_biogas_m3_year`, `livestock_biogas_m3_year`. **#2 auto-refresh target** (pairs with A1).

### B2. IBGE Censo Agropecuário — confined vs. extensive
- **Use:** split herds into **confined** fractions (where manure is collectable → realistic biogas) vs. pasture — a key FDE availability driver for cattle/swine/poultry.

---

## C. 🏙️ Urban solid waste & population (RSU / RPO)

### C1. SNIS → SINISA (Sist. Nac. de Inf. sobre Saneamento) ⭐
- **Gives:** municipal **MSW collected (t/yr)**, per-capita generation, recycling, landfill/aterro data; also water/sewage. Solid-waste series since 2002; water/sewage since 1995. SINISA succeeds SNIS from 2024.
- **Coverage:** 🟦 municipal, annual. **Access:** SNIS web app + **CSV série histórica**; also mirrored on **Base dos Dados (BigQuery)** and `dados.gov.br`.
- **Maps to:** `municipalities.rsu_biogas_m3_year`, `rpo_biogas_m3_year` (organic fraction × FDE). The empirical base for urban biogas.

### C2. CETESB — Inventário Estadual de Resíduos Sólidos (SP) 🟩
- **Gives:** SP landfills/aterros, disposal quality index (IQR), waste destination. **Access:** CETESB annual reports (PDF/tables — confirm machine-readable extract). **Use:** SP-specific landfill-gas siting + validation of MSW destinations.

### C3. IBGE — population (Censo 2022 + estimates) via SIDRA
- **Gives:** municipal population (drives per-capita MSW & sewage). **Access:** Agregados API (tables 4709, 6579…). **Cadence:** annual estimates + census.

---

## D. 🏙️ Wastewater / sewage (ETEs)

### D1. SNIS / SINISA (sewage component)
- **Gives:** sewage volume collected/treated, population served, per municipality. **Use:** estimate ETE biogas potential and locate where treatment exists.

### D2. ANA — Atlas Esgotos & SNIRH / Hidroweb
- **Gives:** national sewage diagnosis (treatment plants, loads); hydrological stations. **Access:** ANA open data / SNIRH API (`confirm`: dadosabertos.ana.gov.br). **Use:** complements SNIS for ETE inventory + receiving-body context.

### D3. SABESP (SP operator) 🟩
- **Gives:** SP water/sewage operational data, some ETE locations. **Access:** SABESP transparency / open data (confirm). **Use:** SP-specific ETE georeferencing for `wastewater_treatment_plants`.

---

## E. 🗺️ Energy & biogas/biomethane infrastructure

### E1. ANEEL **SIGA** (Sistema de Informações de Geração) ⭐
- **Gives:** **every power plant** with concession/authorization, incl. **biomass and biogas thermoelectric**, with **coordinates**, capacity, fuel, status (operation/construction).
- **Coverage:** 🟦. **Access — OGC + API:** `dadosabertos.aneel.gov.br` (CKAN, CSV/JSON) and **ArcGIS Hub** `dadosabertos-aneel.opendata.arcgis.com` (GeoJSON, **WMS, WFS, GeoServices**).
- **Maps to:** `biogas_plants` (biogas/biomass units), `power_substations` / `power_transmission_lines` (grid context). **Top infrastructure source.**

### E2. ANP — Biomethane producers & biofuel authorizations
- **Gives:** **authorized biomethane plants** (dynamic panel covers CE, MG, PR, PE, RJ, RS, **SP**), production via SIMP, biofuel-producer authorizations.
- **Access:** `gov.br/anp` open data + dynamic Power BI panel (portal/CSV; report-style — limited clean API). **Use:** ground-truth real biogas→biomethane projects; validate `biogas_plants` against authorized reality.

### E3. EPE — Balanço Energético Nacional & webmaps
- **Gives:** national energy balance, bioenergy series, georeferenced energy infrastructure webmaps. **Access:** `epe.gov.br` publicações/dados abertos. **Use:** macro context, biomethane outlook.

### E4. CIBiogás / ABiogás — biogas plant panorama
- **Gives:** annual **biogas plant inventory** ("Panorama do Biogás" / mapa do biogás) — the most biogas-specific plant list in Brazil. **Access:** reports + portal (may need registration; not a clean open API — confirm). **Use:** the best single cross-check for `biogas_plants` completeness.

### E5. ONS — transmission network geodata
- **Gives:** national transmission lines/substations (SIN). **Access:** ONS open data (confirm). **Use:** authoritative `power_transmission_lines` / `power_substations`.

---

## F. 🗺️ Geospatial base & infrastructure layers

### F1. IBGE — Malhas Territoriais API v3 ⭐
- **Gives:** official boundary geometry (country/UF/municipality) as **GeoJSON / TopoJSON / SVG**.
- **Access:** `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{id}?formato=application/vnd.geo+json` (params `resolucao`, `intrarregiao`); docs `…/api/docs/malhas?versao=3`.
- **Maps to:** `municipalities.geometry` / `centroid` — keep boundaries canonical and reproducible.

### F2. IBGE — Localidades API
- **Gives:** municipality/UF/region registry, codes, names, centroids. **Access:** `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`. **Use:** join key (IBGE code) across every other dataset.

### F3. DataGEO / IDEA-SP (Sistema Ambiental Paulista) ⭐ 🟩
- **Gives:** SP environmental layers — watersheds, APPs, vegetation, conservation units, land use, fire foci. **Access:** `datageo.ambiente.sp.gov.br` — mostly **WMS** (visualization), some downloadable/WFS layers. **Use:** SP-specific environmental constraints/siting overlays.

### F4. OpenStreetMap — Overpass API (infrastructure) ⭐
- **Gives:** crowd-sourced **gas pipelines** (`man_made=pipeline`, `substance=gas`), **power lines** (`power=line`), **substations** (`power=substation`), roads. Often the only *open* source for these geometries.
- **Access:** Overpass API `https://overpass-api.de/api/interpreter` (free; rate-limited). 🌍 (Brazil/SP coverage varies).
- **Maps to:** `gas_pipelines`, `power_transmission_lines`, `power_substations` — a pragmatic open fill for layers that are otherwise proprietary.

### F5. SICAR / CAR — rural property boundaries
- **Gives:** **Cadastro Ambiental Rural** property polygons, APP/legal-reserve. **Access:** `car.gov.br` consulta pública + per-state downloads (confirm bulk terms). **Use:** property-level substrate siting; pairs with LUPA (A3).

### F6. INPE — TerraBrasilis (PRODES/DETER/land use)
- **Gives:** deforestation, land-use change, OGC services. **Access:** `terrabrasilis.dpi.inpe.br` WFS/WMS + downloads. **Use:** land-use context / change detection for residue availability.

---

## G. 🌦️ Climate & environmental context (process / siting)

| Source | Gives | Coverage | Access |
|--------|-------|----------|--------|
| **INMET** | temperature, precipitation, climate normals | 🟦 | portal + API (`confirm`: tempo.inmet.gov.br) |
| **NASA POWER** | solar, temperature, meteorology | 🌍 | REST API `power.larc.nasa.gov/api` |
| **SoilGrids (ISRIC)** | soil properties (C, N, texture) | 🌍 | REST `rest.isric.org` |
| **ANA SNIRH / Hidroweb** | streamflow, water availability | 🟦 | API/CSV (`confirm`) |

Use: digestion-temperature/seasonality assumptions, water-stress siting, and C:N context for co-digestion pairing.

---

## H. Cross-cutting warehouses & meta-sources

### H1. Base dos Dados — public **BigQuery** datalake ⭐
- **Gives:** treated, harmonized mirrors of IBGE (PAM/PPM/Censo), SNIS, SEEG, population, etc., with **standardized `id_municipio` / `ano`** — query everything with one SQL dialect.
- **Access:** Google BigQuery (project `basedosdados`), **1 TB/month free**; Python/R/Stata packages. **Use:** the **fastest ingestion path** — prototype joins in SQL before writing bespoke API clients. Caveat: refresh lag vs. the primary source.

### H2. SEEG (Observatório do Clima) — municipal GHG emissions
- **Gives:** per-municipality emissions by sector incl. **Agropecuária** and **Resíduos**, since 2000, 5,570 municipalities. **Access:** `plataforma.seeg.eco.br` + downloads + Base dos Dados. **Use:** independent **cross-validation** of waste/agri activity and a narrative climate co-benefit layer (avoided CH₄).

### H3. dados.gov.br + INDE
- National open-data + spatial-data catalogues — discovery layer for anything above. INDE (`inde.gov.br`) aggregates official WMS/WFS geoservices.

---

## I. 🌍 Expansion beyond São Paulo / Brazil (the Atlas moonshot)

For the "Global Biogas Atlas" direction (DBFZ/BEPE), the model generalizes by swapping municipal inputs for national ones:

| Source | Gives | Access |
|--------|-------|--------|
| **FAOSTAT** ⭐ | crop & livestock production/area, **245 countries, 1961–2024** | REST API + bulk `bulks-faostat.fao.org` |
| **FAO GAEZ** | agro-ecological zones, crop suitability/yields | portal/WCS |
| **IPCC EFDB** | emission / residue / manure factors | database/download |
| **ESA WorldCover / Copernicus** | 10 m global land cover | WMS/WMTS, download |
| **IRENA / IEA Bioenergy** | bioenergy capacity & potentials | portal/CSV |
| **Our World in Data** | harmonized energy/agri indicators | CSV/GitHub |

Pattern: **FAOSTAT production × IPCC residue/manure factors × the PILAR-2b FDE engine → per-country biogas potential.** Same methodology, coarser geometry (country/admin-1).

---

## Substrate → source matrix

| Substrate / layer | Primary | Secondary / validation | Geometry / allocation |
|-------------------|---------|------------------------|-----------------------|
| Sugarcane (vinasse, bagasse, straw) | IBGE PAM (1612) | CONAB cana; IEA-SP LUPA | MapBiomas cane mask |
| Soybean / corn | IBGE PAM (1612) | CONAB grãos | MapBiomas agriculture |
| Coffee | IBGE PAM (1613) | CONAB café | MapBiomas |
| Citrus | IBGE PAM (1613) | IEA-SP LUPA | MapBiomas |
| Cattle / swine / poultry manure | IBGE PPM (3939) | Censo Agro 2017 (confinement) | LUPA / SICAR properties |
| Urban MSW (RSU/RPO) | SNIS/SINISA | CETESB-SP; SEEG resíduos | IBGE population × boundary |
| Sewage / ETE | SNIS/SINISA | ANA Atlas Esgotos; SABESP | plant coords (SABESP/ANA) |
| Biogas/biomass plants | ANEEL SIGA | ANP biometano; CIBiogás | SIGA coordinates |
| Gas pipelines / grid | ANEEL SIGA; ONS | — | OSM Overpass |
| Municipal boundaries | IBGE Malhas API | — | (source of truth) |

---

## Recommended integration roadmap

**Quick wins (days, high value, low risk)**
1. **IBGE Malhas API → `municipalities.geometry`** — canonical, reproducible boundaries (replaces ad-hoc shapefiles).
2. **IBGE SIDRA PAM + PPM auto-refresh** — a scheduled job pulling crop (1612/1613) and herd (3939) tables → feeds the FDE engine. Turns the "semi-automated update" into a real pipeline for the dominant inputs.
3. **ANEEL SIGA + ANP → `biogas_plants`** — populate/validate real plants (WFS/GeoJSON ingest).
4. **OSM Overpass → pipelines/power layers** — open fill for `gas_pipelines`, `power_*`.

**Medium term**
5. **SNIS/SINISA → RSU & ETE** empirical base (CSV or via Base dos Dados).
6. **MapBiomas crop masks** → spatial disaggregation of municipal residue totals (drives the map display tiers).
7. **DataGEO-SP** environmental overlays for SP siting.

**Strategic**
8. **Base dos Dados (BigQuery)** as a unified staging layer — prototype all the joins in SQL first.
9. **FAOSTAT × IPCC factors** → the national/global Atlas generalization (BEPE/DBFZ).
10. **SEEG** as an independent emissions cross-check + climate co-benefit narrative.

---

## Practical notes

- **Join key:** the **IBGE 7-digit municipality code** is the universal key — standardize on it everywhere (Base dos Dados already does: `id_municipio`).
- **Projection:** national data is SIRGAS 2000 / EPSG:4674 or WGS84/EPSG:4326; the platform standardizes on 4326 — reproject on ingest.
- **Licensing:** all sources above are public/open (IBGE, ANEEL, ANP, SNIS, MapBiomas CC-BY-SA, FAOSTAT CC-BY). **Keep attribution** on derived layers; cite per dataset.
- **LGPD:** every recommended source is **aggregate / non-personal** (municipal counts, plant coordinates, land cover) — no personal-data exposure, consistent with the platform's data-minimization posture.
- **Reliability tiers:** clean REST/OGC APIs (IBGE, ANEEL) → automate directly; CSV/bulk (SNIS, CONAB, MapBiomas) → scheduled ETL; report/PDF (ANP panel, CIBiogás, CETESB) → periodic manual refresh. Prioritize automation where the API is clean **and** the input dominates the model (IBGE PAM/PPM).

---

## Sources

- IBGE Agregados/SIDRA (PAM): https://sidra.ibge.gov.br/pesquisa/pam/tabelas/ · API: https://servicodados.ibge.gov.br/api/docs/
- IBGE Malhas API v3: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- ANEEL SIGA / Dados Abertos: https://dadosabertos.aneel.gov.br/ · https://dadosabertos-aneel.opendata.arcgis.com/
- ANP Biometano: https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano
- MapBiomas: https://brasil.mapbiomas.org/downloads/
- DataGEO / IDEA-SP: https://datageo.ambiente.sp.gov.br/
- SNIS / SINISA: https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis · histórica: https://dados.gov.br/dados/conjuntos-dados/snis---srie-histrica
- Base dos Dados (BigQuery): https://basedosdados.org/docs/access_data_bq
- SEEG: https://plataforma.seeg.eco.br/
- CONAB séries históricas: https://portaldeinformacoes.conab.gov.br/
- FAOSTAT: https://www.fao.org/faostat/en/ · bulk: https://bulks-faostat.fao.org/
- OpenStreetMap Overpass API: https://overpass-api.de/

> _Compiled for PILAR-2b / CP2B (NIPE–UNICAMP). Access details verified June 2026;
> re-check “confirm” endpoints before implementation._
