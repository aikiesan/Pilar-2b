# FOSS4G Europe 2026 — PILAR-2b Methods & Results Supplement

**Platform:** PILAR-2b — Plataforma Interativa de Localização e Análise de Resíduos
(INPI BR 512026003115-0; NIPE/UNICAMP)
**Coverage:** 645 municipalities, state of São Paulo, Brazil
**Data vintage:** IBGE Censo Agropecuário 2017/IBGE 2022 pop.; MapBiomas Collection 9; SNIS 2022
**Generated:** 2026-06-06 by `backend/scripts/compute_sp_canonical_totals.py` (100% forward methodology)
**Phase 1 revision:** Corrected IBGE PAM unit interpretation for sugarcane (4 sub-streams) and citrus (peel fraction)

---

## 1. Methodology summary

### 1.1 Forward estimation engine

All streams use a single four-factor forward formula:

```
CH₄ (m³/yr) = M_wet × (TS/100) × (VS_TS/100) × BMP × FDE
```

where:
- `M_wet` — wet biomass (t/yr), derived from IBGE PAM crop residue tonnes × residue fraction
  (agricultural), head-count × EMBRAPA generation factors (livestock), or population ×
  per-capita generation (urban)
- `TS` — total solids content (% wet basis)
- `VS_TS` — volatile solids fraction (% of TS)
- `BMP` — biochemical methane potential (NmL CH₄/gVS)
- `FDE` — effective availability factor = FC × FCo × FS × FL × η

Biogas volume is recovered as `CH₄ / (CH₄_pct / 100)` using per-feedstock methane content
(55–68 % vol). Biomethane is `CH₄ × 0.97` (3 % upgrading loss, membrane/PSA).

Three scenarios (min/medio/max) apply the same scenario band to generation, chemistry, and FDE
simultaneously — producing a genuine lower/upper envelope, not a sensitivity range.

### 1.2 Critical Phase 1 correction — IBGE PAM unit interpretation

**IBGE PAM crop production data records raw agricultural production, not processed residues.**

Two streams required residue fraction correction before applying the forward engine:

**Sugarcane:** `sugarcane_biomass_tons_year` = raw green cane (t/yr, whole stalk at harvest).
The old code applied BAGACO (bagasse) BMP parameters to the full 247 Mt green cane, causing a
~3.6× overestimate. The corrected approach decomposes green cane into 4 industrial sub-streams:

| Sub-stream | Code | Residue fraction | Basis |
|---|---|---:|---|
| Wet bagasse | BAGACO | 0.280 t/t green cane | UNICA/CONSECANA 2022: 25–30% wet |
| Filter cake | TORTA_FILTRO | 0.030 t/t green cane | CONSECANA-SP cost tables: 2.8–3.5% |
| Collectible straw | PALHA | 0.053 t/t green cane | 12 t straw/ha × 35% collectible ÷ 80 t cane/ha (Carvalho 2017) |
| Vinhaça | VINHACA | 0.420 t/t green cane | 12 BnL EtOH/yr × 12 L/L × 1.01 kg/L ÷ 340 Mt cane |
| **Total residue fraction** | | **0.783** | **Remaining 21.7% = sucrose/water extracted as juice** |

**Citrus:** `citrus_biomass_tons_year` = whole fruit (t/yr). Only the peel/wet bagasse
fraction (50%) is available for AD after juice extraction. Applying BAGACO_CITROS parameters
directly to whole fruit caused a ~2× overestimate.
Correction: `M_wet_peel = citrus_biomass_tons_year × 0.50` (FUNDECITRUS 2022; industrial peel
yield 45–55% of whole fruit).

**Soybean, corn, coffee:** CSV already contains MapBiomas-derived residue tonnes (not raw crop).
No residue fraction correction needed.

### 1.3 FDE factor definitions

| Factor | Definition | Range (typical) |
|---|---|---|
| FC | Fraction collectible from source | 0.30 – 0.95 |
| FCo | Fraction not pre-empted by competing uses | 0.10 – 0.95 |
| FS | Fraction available seasonally | 0.70 – 0.98 |
| FL | Fraction accessible to logistics/transport | 0.55 – 0.92 |
| η | Digestion conversion efficiency | 0.55 – 0.85 |

`availability = FC × FCo × FS × FL` (arithmetic product, checked by CI guard).
`FDE = availability × η`.

All 26 feedstocks carry per-factor literature citations; the complete source table is in
`docs/data/FDE_TRACEABILITY_MATRIX.md` (auto-generated; 53 cited references with URLs).

### 1.4 Uncertainty and confidence tiers

| Tier | Basis | Feedstocks |
|---|---|---|
| HIGH | Regulatory data or per-factor measured values | 6 |
| MEDIUM | Regional studies or commodity-specific proxy | 17 |
| LOW | Generic/global proxy; no direct SP study | 3 |

The three LOW-confidence feedstocks (CASCA_MILHO, ORGANICO_RSU, PODA_URBANA) are minor
contributors and are flagged explicitly. Their combined share is < 4 % of the SP total.

---

## 2. SP state results

### 2.1 Headline totals (all sectors, 645 municipalities) — 4 cenários

The platform uses four named scenarios, each applying a self-consistent band of generation
rates, chemistry parameters (BMP/TS/VS), and FDE (FC × FCo × FS × FL × η) simultaneously:

| Scenario | Description | CH₄ (M m³/day) | **Biogas (M m³/day)** | Biomethane (M m³/day) |
|---|---|---:|---:|---:|
| **Linha de Base** | min FDE/generation — maximum restrictions | 0.81 | 1.45 | 0.79 |
| **Médio Prazo** | medio FDE — regional literature values | **3.90** | **6.97** | **3.78** |
| **Otimista** | max FDE — favorable conditions | 13.62 | 24.32 | 13.21 |
| **Fronteira do Biogás** | Otimista + mandatory ETE sludge (policy) | 14.66 | 25.85 | 14.22 |

_Fronteira do Biogás adds LODO_PRIMARIO (0.913 M m³/day CH₄) and LODO_SECUNDARIO
(0.126 M m³/day CH₄) computed at max FDE, requiring large-scale investment and
mandatory regulatory frameworks (PNRS, AD mandate for ETE sludge). Barrier: CAPEX._

_Biogas and biomethane are different quantities: biogas is the raw digester output (CH₄ + CO₂ +
traces); biomethane is the purified/upgraded product after membrane or PSA processing (97 %
recovery assumed). Results reflect Phase 1 (IBGE PAM unit correction) and Phase 2 (cattle
spatial split — eastern SP dairy vs western SP beef) methodology corrections._

### 2.2 Stream breakdown — Médio Prazo scenario, CH₄ (M m³/day)

| Stream | Sector | Canonical feedstock | Residue fraction | CH₄ Médio Prazo | Share |
|---|---|---|---:|---:|---:|
| Sugarcane bagasse | Agricultural | BAGACO | × 0.280 | 1.966 | 50.4 % |
| Dairy cattle (eastern SP) | Livestock | ESTERCO_BOVINO_LEITEIRO | × 0.33 of herd | 0.696 | 17.8 % |
| MSW organic fraction | Urban | FORSU | — | 0.310 | 7.9 % |
| Sugarcane filter cake | Agricultural | TORTA_FILTRO | × 0.030 | 0.251 | 6.4 % |
| Poultry litter | Livestock | CAMA_AVIARIO | — | 0.234 | 6.0 % |
| Citrus peel | Agricultural | BAGACO_CITROS | × 0.500 | 0.101 | 2.6 % |
| Corn (stover/husk) | Agricultural | PALHA_MILHO | — | 0.093 | 2.4 % |
| Soybean (field straw) | Agricultural | PALHA_SOJA | — | 0.083 | 2.1 % |
| Sugarcane straw | Agricultural | PALHA | × 0.053 | 0.062 | 1.6 % |
| Sugarcane vinhaça | Agricultural | VINHACA | × 0.420 | 0.035 | 0.9 % |
| Beef cattle (western SP) | Livestock | ESTERCO_BOVINO_CORTE | × 0.67 of herd | 0.037 | 0.9 % |
| Coffee (husk) | Agricultural | CASCA_CAFE | — | 0.014 | 0.4 % |
| Urban pruning waste | Urban | PODA_URBANA | — | 0.009 | 0.2 % |
| Swine | Livestock | DEJETOS_SUINO | — | 0.007 | 0.2 % |
| **TOTAL** | | | | **3.898** | **100 %** |

**Sugarcane complex (4 sub-streams):** 2.314 M m³/day = **59.4 %** of SP total.
**Dairy cattle (Phase 2):** 0.696 M m³/day = **17.8 %** — eastern SP dairy belt is 2nd largest contributor.
**Beef cattle:** only 0.037 M m³/day (0.9%) despite 67% of SP herd — dispersed pasture farms, low FDE=0.032.

### 2.3 Benchmark comparison

| Reference | Value (M m³/day biogas) | Scope |
|---|---:|---|
| FIESP/AMPLUN 2021 (gross) | ~16.0 | All sectors; theoretical gross potential |
| SEMIL/FIESP 2024 (viable) | ~11.4 | Technically and economically viable |
| SEMIL/FIESP 2024 (long-term biomethane) | ~42.5 Mm³/day biomethane | Full infrastructure scenario |
| **PILAR-2b Linha de Base** | **1.45** | **min FDE/generation — maximum restrictions** |
| **PILAR-2b Médio Prazo** | **6.97** | **canonical audited FDE; Phase 1+2 corrected** |
| **PILAR-2b Otimista** | **24.32** | **max FDE/generation — favorable conditions** |
| **PILAR-2b Fronteira do Biogás** | **25.85** | **Otimista + mandatory ETE sludge policy** |

**Note on benchmark positioning:** The Médio Prazo scenario (6.97 Mm³/day) represents what is
mobilizable under realistic collection, competition, and logistics constraints with audited,
literature-validated FDE parameters. The gap from FIESP 2021 (16.0) reflects methodological
conservatism: sugarcane bagasse fraction (28% of green cane × FDE ≈ 0.12), cattle split
(67% beef/extensive with FDE ~0.032), and corrected IBGE PAM units — not inflated parameters.
The Fronteira scenario (25.85 Mm³/day) shows the policy ambition ceiling with full ETE
sludge mandate and optimistic infrastructure deployment.

---

## 3. Canonical feedstock database — summary (26 feedstocks)

### 3.1 Agricultural residues (lignocellulosic / process residues)

| Code | Feedstock (PT) | BMP medio (NmL/gVS) | TS medio (%) | VS/TS medio (%) | FDE medio | Conf. |
|---|---|---:|---:|---:|---:|---|
| BAGACO | Bagaço de cana | 165 | 58.9 | 90.0 | 0.1185 | HIGH |
| TORTA_FILTRO | Torta de filtro | 235 | 38.0 | 84.0 | 0.1453 | MEDIUM |
| PALHA | Palha de cana | 175 | 30.0 | 85.0 | 0.0403 | HIGH |
| VINHACA | Vinhaça | 110 | 5.0 | 78.0 | 0.0751 | HIGH |
| BAGACO_CITROS | Bagaço de citros | 230 | 18.0 | 88.0 | 0.1342 | MEDIUM |
| CASCAS_CITROS | Cascas de citros | 250 | 65.0 | 88.0 | 0.1264 | MEDIUM |
| CASCA_CAFE | Casca de café | 140 | 88.0 | 93.0 | 0.1354 | MEDIUM |
| POLPA_CAFE | Polpa de café | 280 | 15.0 | 82.0 | 0.1371 | MEDIUM |
| MUCILAGEM_CAFE | Mucilagem de café | 295 | 10.0 | 85.0 | 0.1756 | MEDIUM |
| PALHA_MILHO | Palha de milho | 230 | 82.0 | 86.0 | 0.0323 | MEDIUM |
| CASCA_MILHO | Casca de milho | 180 | 85.0 | 88.0 | 0.0989 | LOW |
| CASCA_SOJA | Casca de soja | 280 | 90.0 | 93.0 | 0.1249 | MEDIUM |
| PALHA_SOJA | Palha de soja | 220 | 84.0 | 85.0 | 0.0316 | HIGH |

### 3.2 Livestock manure

| Code | Feedstock (PT) | BMP medio | TS medio (%) | VS/TS medio (%) | FDE medio | Conf. |
|---|---|---:|---:|---:|---:|---|
| DEJETOS_SUINO | Dejetos suínos líquidos | 270 | 6.0 | 70.0 | 0.2540 | MEDIUM |
| ESTERCO_SUINO | Esterco suíno (sólido) | 295 | 20.0 | 78.0 | 0.2645 | MEDIUM |
| DEJETOS_BOVINO | Dejetos bovinos | 200 | 10.0 | 75.0 | 0.1526 | MEDIUM |
| ESTERCO_BOVINO | Esterco bovino (campo) | 155 | 18.0 | 72.0 | 0.0924 | MEDIUM |
| DEJETOS_AVES | Dejetos de aves (liquame) | 295 | 8.0 | 73.0 | 0.2087 | MEDIUM |
| CAMA_AVIARIO | Cama de aviário | 265 | 65.0 | 72.0 | 0.1890 | MEDIUM |

### 3.3 Urban / industrial

| Code | Feedstock (PT) | BMP medio | TS medio (%) | VS/TS medio (%) | FDE medio | Conf. |
|---|---|---:|---:|---:|---:|---|
| FORSU | Fração orgânica RSU | 350 | 30.0 | 70.0 | 0.3159 | MEDIUM |
| ORGANICO_RSU | RSU indiferenciado | 180 | 40.0 | 60.0 | 0.0505 | LOW |
| PODA_URBANA | Resíduo de poda urbana | 175 | 55.0 | 87.0 | 0.0578 | LOW |
| LODO_PRIMARIO | Lodo primário de ETE | 310 | 15.0 | 68.0 | 0.4361 | HIGH |
| LODO_SECUNDARIO | Lodo secundário de ETE | 180 | 15.0 | 63.0 | 0.2549 | HIGH |
| GORDURA | Gordura e sebo animal | 850 | 90.0 | 95.0 | 0.1211 | MEDIUM |
| SANGUE | Sangue de frigoríficos | 450 | 18.0 | 90.0 | 0.1634 | MEDIUM |

_BMP values are NmL CH₄/gVS at standard conditions (0 °C, 1 atm). FDE medio = availability × η
(medio scenario). TORTA_FILTRO TS=38% = wet filter cake as produced at mills (not dried).
PALHA TS=30% = freshly harvested straw (not sun-dried). BAGACO_CITROS TS=18% = wet peel after
pressing. Full per-factor citations and uncertainty ranges are in `feedstocks.yaml` and
`FDE_TRACEABILITY_MATRIX.md`._

---

## 4. Key data sources

| Source | Use | URL |
|---|---|---|
| IBGE Censo Agropecuário 2017 | Agricultural crop areas, livestock head counts | https://sidra.ibge.gov.br/pesquisa/censo-agropecuario/censo-agropecuario-2017 |
| IBGE Estimativas de população 2022 | Municipal populations (SP: 44,411,238) | https://sidra.ibge.gov.br/ |
| MapBiomas Collection 9 | Land-use classification for crop/pasture areas | https://mapbiomas.org/ |
| EPE BEN 2024 | Sugarcane biomass availability factors | https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024 |
| UNICA/CONSECANA 2022 | Sugarcane industrial sub-stream residue fractions | https://unica.com.br/ |
| FUNDECITRUS 2022 | Citrus peel residue fraction (45–55% of whole fruit) | https://www.fundecitrus.com.br/ |
| Carvalho et al. 2017 | Sugarcane straw collectible fraction | https://doi.org/10.1111/gcbb.12410 |
| EMBRAPA (suínos, aves, bovinos) | Livestock manure generation factors | https://www.embrapa.br/suinos-e-aves/publicacoes |
| SNIS 2022 | Urban wastewater and solid waste statistics | http://www.snis.gov.br/ |
| ABRELPE Panorama 2022 | Municipal solid waste generation rates | https://abrelpe.org.br/panorama/ |
| CETESB 2020 | SP sludge characterization and treatment coverage | https://cetesb.sp.gov.br/ |
| ABIOGÁS Atlas do Biogás 2021 | Availability factors for diverse feedstocks | https://abiogas.org.br/atlas-do-biogas-2021/ |
| FIESP/AMPLUN 2021 | Benchmark gross biogas potential for SP | (benchmark comparison only) |
| SEMIL/FIESP 2024 | Benchmark viable biogas potential for SP | (benchmark comparison only) |

Full reference list (65 entries with URLs): `data/canonical_parameters/references.yaml`

---

## 5. Limitations and open items

1. **IBGE PAM unit interpretation (Phase 1)** — Prior to Phase 1, BAGACO BMP parameters were
   applied directly to raw green cane tonnage (IBGE PAM), causing a 3.6× overestimate for
   sugarcane and a 2× overestimate for citrus. The Phase 1 correction (residue fractions + 4
   sub-streams) is verified by regression tests in `test_biomass_residue_fractions.py`.

2. **No empirical plant validation** — `010_create_validation_plants.sql` schema exists for
   predicted-vs-measured comparison but contains no real-plant data rows. Authors will populate
   with SP operational plant data prior to final submission.

3. **3 LOW-confidence feedstocks** — CASCA_MILHO, ORGANICO_RSU, PODA_URBANA use generic or
   proxy sources; their combined contribution is < 4 % of SP CH₄ total.

4. **Uncertainty not propagated to map UI** — min/medio/max scenarios exist in the database and
   are computed by the backend; the map currently displays only the medio scenario.

5. **Static temporal baseline** — the canonical dataset uses 2017–2024 agricultural/livestock
   statistics; inter-annual variation is not modelled.

6. **LODO_PRIMARIO and LODO_SECUNDARIO** — ETE sludge feedstocks are present in the database but
   are not mapped to any active municipality stream (SP sewage sludge data not in the current CSV).

7. **Phase 2 planned** — Spatial differentiation of cattle collection potential (eastern SP =
   dairy intensive, high FC/FCo; western SP = beef extensive, low FC) using IBGE census data
   on confinement vs. pasture, as a separate PR.

---

## 6. Reproducibility commands

```bash
# Verify all 26 FDE blocks pass arithmetic, ordering, and citation checks:
python backend/scripts/validate_fde_traceability.py

# Regenerate the per-factor traceability matrix:
python backend/scripts/validate_fde_traceability.py --emit

# Recompute SP state totals (produces sp_canonical_by_stream.csv):
python backend/scripts/compute_sp_canonical_totals.py

# Run the full unit test suite (including Phase 1 regression guards):
pytest backend/tests/unit/services/test_fde_traceability.py \
       backend/tests/unit/services/test_canonical_loader.py \
       backend/tests/unit/services/test_biogas_forward.py \
       backend/tests/unit/services/test_biomass_residue_fractions.py \
       backend/tests/unit/test_canonical_parameters.py --no-cov
```

Expected output:
```
FDE traceability: all checks pass for 26 feedstocks ✅
CH4 practical (M m³/day)         0.74          3.57         14.45
Biogas practical (M m³/day)      1.32          6.39         25.78
Biomethane (M m³/day)            0.71          3.46         14.02
~65 passed, 1 warning in ~15s
```
