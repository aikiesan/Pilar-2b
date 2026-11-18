# Energy, Logistics & Bioeconomy Data Layer

> Companion to [`OPEN_DATA_API_LANDSCAPE.md`](./OPEN_DATA_API_LANDSCAPE.md). That
> doc covers data to **estimate biomass** (how much, where). This one covers the
> data that turns potential into a **decision tool**: energy demand & bio-energy
> production, the **mobility/logistics** of getting biomass to processing, and
> the wider **bioeconomy** (jobs, value, trade, climate).
>
> All sources are **public, open, municipal-keyed** (IBGE 7-digit code) unless
> noted. Focus: São Paulo, designed to expand to Brazil. Access verified June
> 2026; endpoints marked _“confirm”_ should be re-checked before coding.

---

## The reframing: potential → feasibility → bioeconomy

PILAR-2b today answers **“how much biogas could a município produce?”** These
layers let it answer the questions that decide whether a project happens:

| Question | New data dimension | Existing platform hook |
|----------|--------------------|------------------------|
| Is there **local demand** for the energy? | Energy consumption (elec. + fuels) | new demand layer on the map |
| Where is biomass **already turned into energy**? | Bio-energy production (plants, generation) | `biogas_plants`, ANEEL SIGA |
| Can the biomass **physically get to processing** cheaply? | Transport network, distance-to-plant | `proximity_service`, `codigestion_service` |
| Is it **worth it** economically / socially? | GDP, jobs, exports, value chains | new bioeconomy indicators |
| What's the **climate payoff**? | Avoided-CH₄ / emissions | SEEG (see landscape doc) |

The result is a **biomass → energy → logistics → economy** chain, all on the same
municipal key.

---

## 1. ⚡ Energy — demand & bio-energy production

### Demand side (is there a local market for the energy?)

#### 1.1 ANEEL — municipal electricity consumption ⭐
- **Gives:** electricity **consumption (MWh) and number of consumers by município and class** (residential, industrial, commercial, rural). The demand baseline for biogas-to-power self-sufficiency.
- **Coverage:** 🟦 municipal, monthly/annual. **Access:** `dadosabertos.aneel.gov.br` (CKAN — CSV/JSON; “confirm” exact dataset: *Consumo e nº de consumidores*).
- **New metric:** **self-sufficiency ratio** = estimated biogas-electricity ÷ municipal consumption.

#### 1.2 ANP — fuel sales by municipality ⭐
- **Gives:** **annual sales of fuels by município** (hydrated ethanol + petroleum derivatives, incl. **diesel** and natural gas), monthly-updated.
- **Coverage:** 🟦 municipal, annual. **Access:** `gov.br/anp` → *Vendas de derivados de petróleo e biocombustíveis* (CSV), mirrored on `dados.gov.br`.
- **New metric:** **biomethane substitution potential** = biomethane (from biogas) ÷ local diesel/CNG demand → "fleet decarbonisation" framing.

#### 1.3 EPE — energy balance & consumption panels
- **Gives:** Anuário Estatístico de Energia Elétrica, **Painel de Consumo Anual** (by class since 2004), Balanço Energético Nacional (BEN). National/regional/subsystem — coarser than municipal.
- **Access:** `epe.gov.br/pt/publicacoes-dados-abertos` (interactive panels + downloads). **Use:** macro context, sector trends, biofuel cost/efficiency assumptions (incl. biogas).

### Supply side (where biomass already becomes energy?)

#### 1.4 ANEEL SIGA — biomass/biogas power plants ⭐
- (Also in the landscape doc.) Georeferenced plants incl. **biomass & biogas thermoelectric**, capacity, status. → `biogas_plants`, baseline of installed bio-energy. Access: ArcGIS Hub WFS/GeoJSON + CKAN CSV.

#### 1.5 ONS — generation & load (operations)
- **Gives:** **generation by plant, hourly** (incl. thermal/biomass), energy load, subsystem balance — the operational reality of bio-energy dispatch.
- **Coverage:** 🟦 plant/subsystem. **Access:** `dados.ons.org.br` (CSV UTF-8 + some JSON APIs). **Use:** seasonality of bio-energy, dispatch vs. potential.

#### 1.6 ANP — biomethane production & capacity
- **Gives:** authorized **biomethane** producers/capacity (panel covers SP), processing-capacity series (Anuário 2025, Tab. 4.15). **Use:** the real biogas→biomethane build-out vs. modelled potential.

---

## 2. 🚚 Mobility & logistics (biomass → processing)

Dispersed biomass is killed by transport cost. These layers let the platform model **catchment areas, hauling distance, and siting** — extending the existing `proximity_service` (buffers, near-pipeline/substation) and `codigestion_service` (spatial clustering).

#### 2.1 IBGE — Logística dos Transportes (multimodal network) ⭐
- **Gives:** official **multimodal transport network** — roads, railways, waterways, pipelines — as connected geographic networks.
- **Coverage:** 🟦. **Access:** IBGE Geociências → *Redes Geográficas / Logística dos Transportes* (shapefile/geopackage download). **Use:** the base graph for routing biomass to plants.

#### 2.2 DNIT — SNV road geographic base ⭐
- **Gives:** federal **highway geometry** with surface type, jurisdiction, road class. **Access:** DNIT SNV downloads (**Shapefile/KML**; current + historical). **Use:** real road distance (not straight-line) for hauling-cost models.

#### 2.3 EPL / ONTL — national logistics network (PNL)
- **Gives:** the **Plano Nacional de Logística** multimodal network + scenarios (origin–destination, transport cost-to-port datasets). **Access:** `ontl.epl.gov.br/planejamento/shapefiles/`. **Use:** strategic freight cost, biomass-to-port/biorefinery corridors.

#### 2.4 OpenStreetMap — roads via Overpass
- **Gives:** dense local/rural road network (`highway=*`) — fills gaps below the federal network. **Access:** Overpass API. **Use:** last-mile farm-to-digester routing.

#### 2.5 ANTAQ — waterways & ports
- **Gives:** inland waterway network, port throughput. **Access:** `antaq.gov.br` open data (confirm). **Use:** bulk biomass/biofuel movement (Tietê–Paraná in SP).

#### 2.6 Gas distribution network (SP: Comgás) 
- **Gives:** gas pipeline/distribution geometry — **biomethane injection access points**. **Access:** distributor maps / ARSESP (SP regulator) — likely WMS/report (confirm). **Use:** which biogas sites can realistically inject biomethane.

> **Analytical pattern:** combine (substrate supply) × (road network) → a
> **transport-weighted available biomass** surface and **digester catchment
> areas** — a direct upgrade to `proximity_service` and the co-digestion
> clustering already in the platform.

---

## 3. 🌱 Bioeconomy — value, jobs, trade, co-location

The "big scope": who processes biomass, what value it creates, and where the economy already concentrates.

#### 3.1 MDIC — ComexStat (municipal foreign trade) ⭐
- **Gives:** **exports/imports by município and product (NCM/HS)** — sugar, ethanol, meat, soy, coffee, citrus, etc. The economic weight of each biomass value chain.
- **Coverage:** 🟦 municipal, monthly. **Access:** `comexstat.mdic.gov.br` (API + bulk CSV). **Use:** value-chain importance; export-oriented agro hubs = biomass concentration.

#### 3.2 IBGE — PIB dos Municípios
- **Gives:** **municipal GDP** and **gross value added by sector** (incl. agropecuária). **Access:** SIDRA / Agregados API (table **5938**). **Use:** economic context, agro-dependence, biogas as local value-add.

#### 3.3 IBGE CEMPRE / RAIS — agro-industry employment
- **Gives:** establishments & formal jobs by sector/município (food, sugar-ethanol, agro-industry). **Access:** IBGE CEMPRE (SIDRA); RAIS via **Base dos Dados (BigQuery)**. **Use:** jobs supported by biomass chains; project social impact.

#### 3.4 Agro-industrial facilities (co-location) ⭐
- **Sugar–ethanol mills:** MAPA *SAPCana* / *DATAGRO* / UNICA — georeferenced mills; **vinasse/bagasse biogas happens at the mill** → the single highest-value SP co-location layer.
- **Slaughterhouses / dairies:** MAPA **SIF** registered establishments → manure/effluent co-digestion partners.
- **Access:** MAPA open data / SIF registry (confirm machine-readable form). **Maps to:** new "processing facilities" layer; pairs with `biogas_plants`.

#### 3.5 Context & prioritisation
- **IDHM** (Atlas Brasil/PNUD) — municipal human development; equity-weighted prioritisation.
- **SNIS/SINISA** sanitation indices (landscape doc) — under-served municipalities where biogas + sanitation co-benefit.
- **SEEG** municipal emissions (landscape doc) — avoided-CH₄ climate co-benefit per município.

---

## Suggested new analytical metrics (per município)

Derived once these layers are in — each a candidate map display tier / profile-panel field:

| Metric | Inputs | Tells you |
|--------|--------|-----------|
| **Energy self-sufficiency ratio** | biogas-elec ÷ ANEEL consumption | local autonomy potential |
| **Biomethane substitution potential** | biomethane ÷ ANP diesel/CNG sales | fleet/industry decarbonisation |
| **Transport-weighted available biomass** | substrate × road-distance decay | *realistically* collectable biomass |
| **Digester catchment / cluster viability** | supply × network + co-digestion | best plant locations (extends clustering) |
| **Local bioeconomy value** | PIB-agro, exports, jobs | economic stakes & impact |
| **Climate co-benefit** | avoided CH₄ (SEEG) | carbon narrative for funding |

---

## Integration roadmap (additive, builds on existing services)

**Phase 1 — demand & supply overlays (quick wins)**
1. **ANEEL municipal consumption** → demand layer + self-sufficiency ratio.
2. **ANP municipal fuel sales** → biomethane substitution metric.
3. **ANEEL SIGA + ONS** → installed/operational bio-energy baseline.

**Phase 2 — logistics (extends `proximity_service`)**
4. **IBGE Logística + DNIT SNV** road network → real-distance catchments.
5. **Transport-weighted biomass** surface + **digester siting** (extends co-digestion clustering).

**Phase 3 — bioeconomy & co-location**
6. **Sugar-ethanol mills + SIF facilities** → processing/co-location layer.
7. **ComexStat + PIB + RAIS** → value-chain & impact indicators.

**Phase 4 — Brazil/global expansion**
8. Same metrics nationally (all sources are Brazil-wide); for global, pair with FAOSTAT/IRENA/IEA (landscape doc).

---

## Practical notes

- **Join key:** IBGE 7-digit municipality code throughout; ANP/ANEEL/ComexStat all key on it (or município name → resolve via IBGE Localidades).
- **Granularity caveats:** EPE/ONS are often subsystem/plant-level, not municipal — use for context, not per-município metrics. ANEEL consumption and ANP sales **are** municipal.
- **Geometry/CRS:** transport networks are large; simplify/tile for the web map (ties to the vector-tiles item on the FOSS4G roadmap).
- **Access tiers:** clean APIs/CKAN (ANEEL, ComexStat, IBGE SIDRA, ONS) → automate; shapefile bulk (DNIT, EPL, IBGE Logística) → scheduled ETL; registries/PDF (MAPA mills/SIF, ARSESP gas) → periodic manual refresh.
- **Licensing/LGPD:** all aggregate/public (no personal data) — consistent with the platform's data-minimisation posture; keep per-source attribution.

---

## Sources

- EPE dados abertos: https://www.epe.gov.br/pt/publicacoes-dados-abertos
- ANP — vendas de combustíveis por município: https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/vendas-de-derivados-de-petroleo-e-biocombustiveis
- ANEEL dados abertos: https://dadosabertos.aneel.gov.br/
- ONS dados abertos: https://dados.ons.org.br/
- DNIT — SNV base geográfica: https://www.gov.br/dnit/ (Sistema Nacional de Viação)
- EPL / ONTL — shapefiles PNL: https://ontl.epl.gov.br/planejamento/shapefiles/
- IBGE — Logística dos Transportes: https://www.ibge.gov.br/geociencias/cartas-e-mapas/redes-geograficas/15793-logistica-dos-transportes.html
- MDIC — ComexStat: https://comexstat.mdic.gov.br/
- IBGE PIB dos Municípios (SIDRA): https://sidra.ibge.gov.br/pesquisa/pib-munic/tabelas

> _Compiled for PILAR-2b / CP2B (NIPE–UNICAMP). Companion to OPEN_DATA_API_LANDSCAPE.md.
> Access details verified June 2026; re-check “confirm” endpoints before implementation._
