# Energy Price & Temporal Dynamics — São Paulo

> Part of the **biomass *dynamics*** series (vs. the static potential view).
> This one answers **“how much does energy cost, and *when*?”** — the time-of-day
> and seasonal price signals that decide *when* biogas-electricity and biomethane
> are most valuable. São Paulo–focused; sources are Brazil-wide but priced/regulated
> for SP distributors. Access verified June 2026; _“confirm”_ = re-check before coding.

## Why this matters (dynamic, not static)

A biogas plant's value isn't a single number — it depends on **when** it dispatches.
Electricity is worth far more at peak hours and in dry-season scarcity; piped gas
(biomethane substitute) has its own tariff. These feeds let PILAR-2b show
**when** a município's biogas is most valuable, not just how much exists.

| Question | Source | Granularity |
|----------|--------|-------------|
| Hourly wholesale price | **CCEE PLD** | hour, since 2001 |
| Monthly cost signal | **ANEEL bandeiras tarifárias** | month |
| Time-of-use retail price | **ANEEL tarifa branca** (ponta/intermediário/fora-ponta) | hour-block |
| Retail tariff by SP distributor | **ANEEL tarifas** | per concessionaire |
| Piped-gas tariff (biomethane benchmark) | **ARSESP** | per segment |

---

## 1. CCEE — PLD (Preço de Liquidação das Diferenças) ⭐
- **Gives:** the **hourly wholesale electricity price**, plus daily/weekly/monthly averages, for the SE/CO submarket (which includes SP). The core "what-time-is-energy-expensive" signal.
- **Coverage:** submarket (SE/CO ⊃ SP); **hourly**, historical **since 2001**.
- **Access — open CKAN portal:** `dadosabertos.ccee.org.br` — datasets `PLD_HORARIO`, `PLD_MEDIA_DIARIA`, weekly, monthly (CSV/JSON).
- **Use in PILAR-2b:** weight biogas-electricity by the hourly PLD curve → a **"dispatch value"** per município; reveals the dry-season (scarcity) premium when biogas is most valuable.

## 2. ANEEL — Bandeiras Tarifárias ⭐
- **Gives:** the **monthly tariff-flag** (green / yellow / red 1 / red 2) and its R$/kWh adder — a simple temporal scarcity/cost signal everyone understands.
- **Access:** `dadosabertos.aneel.gov.br/dataset/bandeiras-tarifarias` (CSV/JSON; acionamento history + values).
- **Use:** a plain-language "is energy expensive this month?" overlay; correlate biogas value with red-flag periods.

## 3. ANEEL — Tarifa Branca (time-of-use) & tariff posts
- **Gives:** the **time-of-use residential tariff** (since 2018) with **ponta / intermediário / fora-ponta** price blocks per distributor — the retail "what time" price.
- **Access:** ANEEL tariffs portal / open data (per-distributor tariff posts; confirm dataset).
- **Use:** value biogas self-consumption/injection against peak-hour retail prices.

## 4. ANEEL — Retail tariffs by SP distributor
- **Gives:** regulated tariffs (TUSD/TE, R$/MWh) per concessionaire. SP distributors: **Enel SP, CPFL Paulista, EDP SP, Elektro/Neoenergia, CPFL Piratininga**.
- **Access:** `dadosabertos.aneel.gov.br` (tarifas datasets). **Use:** map each município to its distributor's tariff → realistic local energy value.

## 5. ARSESP — piped-gas tariffs (SP) — biomethane benchmark
- **Gives:** **São Paulo piped natural-gas tariffs** by segment (residential, commercial, industrial, **cogeração**, free users), in R$/m³, updated via ARSESP deliberations. Distributors: Comgás, Naturgy SP, Gás Brasiliano.
- **Access:** `arsesp.sp.gov.br` → Tarifas (deliberations — PDF/tables; not a clean API → periodic manual refresh).
- **Use:** the **biomethane price benchmark** — what a SP município's biomethane could substitute/sell against; the cogeração tariff is directly relevant.

---

## New temporal metrics this enables

| Metric | Inputs | Tells you |
|--------|--------|-----------|
| **Dispatch value of biogas-electricity** | biogas-elec × hourly PLD curve | when (and how much) it's worth generating |
| **Peak-hour value uplift** | tarifa branca ponta vs fora-ponta | value of dispatchable biogas at peak |
| **Scarcity-period premium** | red-flag months / dry-season PLD | seasonal revenue concentration |
| **Biomethane tariff arbitrage** | biomethane vs ARSESP gas tariff | sell/substitute economics |

## Integration notes

- **Time axis:** this is the platform's first genuinely **temporal** layer — store as time series keyed on hour/month, not a single municipal value; surfaces as charts in the profile panel, not just choropleth.
- **Spatial join:** PLD is submarket-level (one curve for SE/CO) → apply uniformly to SP; tariffs join per **distributor concession area** → município → distributor mapping needed (ANEEL provides it).
- **Access tiers:** CCEE + ANEEL bandeiras/tarifas = clean CKAN (automate); ARSESP gas = deliberation PDFs (periodic manual).
- **Licensing/LGPD:** aggregate market/regulatory data, no personal data.

## Sources
- CCEE PLD (open data): https://dadosabertos.ccee.org.br/organization/preco_liquidacao_diferenca
- ANEEL Bandeiras Tarifárias: https://dadosabertos.aneel.gov.br/dataset/bandeiras-tarifarias
- ANEEL tarifas / informações econômico-financeiras: https://www.gov.br/aneel/pt-br/centrais-de-conteudos/relatorios-e-indicadores/tarifas-e-informacoes-economico-financeiras
- ARSESP — tarifas de gás canalizado (SP): https://www.arsesp.sp.gov.br/Paginas/Tarifas.aspx

> _Companion to OPEN_DATA_API_LANDSCAPE.md and ENERGY_LOGISTICS_BIOECONOMY_DATA.md.
> Verified June 2026; re-check “confirm” endpoints before implementation._
