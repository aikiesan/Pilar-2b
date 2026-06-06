# FOSS4G Europe 2026 — PILAR-2b Methods & Results Supplement

**Platform:** PILAR-2b — Plataforma Interativa de Localização e Análise de Resíduos
(INPI BR 512026003115-0; NIPE/UNICAMP)
**Coverage:** 645 municipalities, state of São Paulo, Brazil
**Data vintage:** IBGE Censo Agropecuário 2017/IBGE 2022 pop.; MapBiomas Collection 9; SNIS 2022
**Generated:** 2026-06-06 by `backend/scripts/compute_sp_canonical_totals.py` (100% forward methodology)

---

## 1. Methodology summary

### 1.1 Forward estimation engine

All streams use a single four-factor forward formula:

```
CH₄ (m³/yr) = M_wet × (TS/100) × (VS_TS/100) × BMP × FDE
```

where:
- `M_wet` — wet biomass (t/yr), derived from CSV agricultural tonnes, head-count × EMBRAPA generation
  factors (livestock), or population × per-capita generation (urban)
- `TS` — total solids content (% wet basis)
- `VS_TS` — volatile solids fraction (% of TS)
- `BMP` — biochemical methane potential (NmL CH₄/gVS)
- `FDE` — effective availability factor = FC × FCo × FS × FL × η

Biogas volume is recovered as `CH₄ / (CH₄_pct / 100)` using per-feedstock methane content
(55–68 % vol). Biomethane is `CH₄ × 0.97` (3 % upgrading loss, membrane/PSA).

Three scenarios (min/medio/max) apply the same scenario band to generation, chemistry, and FDE
simultaneously — producing a genuine lower/upper envelope, not a sensitivity range.

### 1.2 FDE factor definitions

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

### 1.3 Uncertainty and confidence tiers

| Tier | Basis | Feedstocks |
|---|---|---|
| HIGH | Regulatory data or per-factor measured values | 6 |
| MEDIUM | Regional studies or commodity-specific proxy | 17 |
| LOW | Generic/global proxy; no direct SP study | 3 |

The three LOW-confidence feedstocks (CASCA_MILHO, ORGANICO_RSU, PODA_URBANA) are minor
contributors and are flagged explicitly. Their combined share is < 4 % of the SP total.

---

## 2. SP state results

### 2.1 Headline totals (all sectors, 645 municipalities)

| Metric | min | **medio** | max |
|---|---:|---:|---:|
| CH₄ practical (M m³/day) | 1.89 | **8.38** | 29.97 |
| **Biogas practical (M m³/day)** | 3.42 | **15.17** | 54.18 |
| Biomethane (M m³/day) | 1.83 | **8.12** | 29.07 |

_Biogas and biomethane are different quantities: biogas is the raw digester output (CH₄ + CO₂ +
traces); biomethane is the purified/upgraded product after membrane or PSA processing (97 %
recovery assumed)._

### 2.2 Stream breakdown — medio scenario, CH₄ (M m³/day)

| Stream | Sector | Canonical feedstock | CH₄ medio | Share |
|---|---|---|---:|---:|
| Sugarcane (bagasse) | Agricultural | BAGACO | 7.02 | 83.8 % |
| Cattle | Livestock | ESTERCO_BOVINO | 0.40 | 4.8 % |
| MSW organic fraction | Urban | FORSU | 0.31 | 3.7 % |
| Poultry | Livestock | CAMA_AVIARIO | 0.23 | 2.7 % |
| Citrus (processing) | Agricultural | BAGACO_CITROS | 0.20 | 2.4 % |
| Corn (stover/husk) | Agricultural | PALHA_MILHO | 0.09 | 1.1 % |
| Soybean (field straw) | Agricultural | PALHA_SOJA | 0.08 | 1.0 % |
| Coffee (husk) | Agricultural | CASCA_CAFE | 0.01 | 0.1 % |
| Swine | Livestock | DEJETOS_SUINO | 0.007 | 0.1 % |
| Urban pruning waste | Urban | PODA_URBANA | 0.009 | 0.1 % |
| **TOTAL** | | | **8.38** | **100 %** |

### 2.3 Benchmark comparison

| Reference | Value (M m³/day biogas) | Scope |
|---|---:|---|
| FIESP/AMPLUN 2021 (gross) | ~16.0 | All sectors; theoretical gross potential |
| SEMIL/FIESP 2024 (viable) | ~11.4 | Technically and economically viable |
| SEMIL/FIESP 2024 (long-term biomethane) | ~42.5 Mm³/day biomethane | Full infrastructure scenario |
| **PILAR-2b forward — medio** | **15.17** | **Single forward engine; audited FDE; corrected mappings** |
| PILAR-2b forward — min / max | 3.42 / 54.18 | Uncertainty envelope |

**Key message:** using a single 100 % forward methodology with audited parameters and two
corrected stream mappings (soybean → field straw PALHA_SOJA; RPO → urban pruning PODA_URBANA),
the medio scenario (15.2 M m³/day) sits at 95 % of the FIESP 2021 gross benchmark and 33 %
above the FIESP 2024 viable estimate — reached by methodological rigor, not inflated parameters.
Bagasse alone accounts for 83 % of the total (7.02 of 8.38 M m³/day CH₄).

---

## 3. Canonical feedstock database — summary (26 feedstocks)

### 3.1 Agricultural residues (lignocellulosic)

| Code | Feedstock (PT) | BMP medio (NmL/gVS) | TS medio (%) | VS/TS medio (%) | FDE medio | Conf. |
|---|---|---:|---:|---:|---:|---|
| BAGACO | Bagaço de cana | 165 | 58.9 | 90.0 | 0.1185 | HIGH |
| PALHA | Palha de cana | 175 | 82.0 | 85.0 | 0.0403 | HIGH |
| VINHACA | Vinhaça | 110 | 5.0 | 78.0 | 0.0751 | HIGH |
| TORTA_FILTRO | Torta de filtro | 235 | 72.0 | 84.0 | 0.1453 | MEDIUM |
| BAGACO_CITROS | Bagaço de citros | 285 | 68.0 | 90.0 | 0.1342 | MEDIUM |
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
(medio scenario). Full per-factor citations and uncertainty ranges are in `feedstocks.yaml` and
`FDE_TRACEABILITY_MATRIX.md`._

---

## 4. Key data sources

| Source | Use | URL |
|---|---|---|
| IBGE Censo Agropecuário 2017 | Agricultural crop areas, livestock head counts | https://sidra.ibge.gov.br/pesquisa/censo-agropecuario/censo-agropecuario-2017 |
| IBGE Estimativas de população 2022 | Municipal populations (SP: 44,411,238) | https://sidra.ibge.gov.br/ |
| MapBiomas Collection 9 | Land-use classification for crop/pasture areas | https://mapbiomas.org/ |
| EPE BEN 2024 | Sugarcane biomass availability factors | https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024 |
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

1. **No empirical plant validation** — `010_create_validation_plants.sql` schema exists for
   predicted-vs-measured comparison but contains no real-plant data rows. Authors will populate
   with SP operational plant data prior to final submission.

2. **3 LOW-confidence feedstocks** — CASCA_MILHO, ORGANICO_RSU, PODA_URBANA use generic or
   proxy sources; their combined contribution is < 4 % of SP CH₄ total.

3. **Uncertainty not propagated to map UI** — min/medio/max scenarios exist in the database and
   are computed by the backend; the map currently displays only the medio scenario.

4. **Static temporal baseline** — the canonical dataset uses 2017–2024 agricultural/livestock
   statistics; inter-annual variation is not modelled.

5. **LODO_PRIMARIO and LODO_SECUNDARIO** — ETE sludge feedstocks are present in the database but
   are not mapped to any active municipality stream (SP sewage sludge data not in the current CSV).

---

## 6. Reproducibility commands

```bash
# Verify all 26 FDE blocks pass arithmetic, ordering, and citation checks:
python backend/scripts/validate_fde_traceability.py

# Regenerate the per-factor traceability matrix:
python backend/scripts/validate_fde_traceability.py --emit

# Recompute SP state totals (produces sp_canonical_by_stream.csv):
python backend/scripts/compute_sp_canonical_totals.py

# Run the full unit test suite (54 tests):
pytest backend/tests/unit/services/test_fde_traceability.py \
       backend/tests/unit/services/test_canonical_loader.py \
       backend/tests/unit/services/test_biogas_forward.py \
       backend/tests/unit/test_canonical_parameters.py --no-cov
```

Expected output:
```
FDE traceability: all checks pass for 26 feedstocks ✅
CH4 practical (M m³/day)         1.89          8.38         29.97
Biogas practical (M m³/day)      3.42         15.17         54.18
Biomethane (M m³/day)            1.83          8.12         29.07
54 passed, 1 warning in ~14s
```
