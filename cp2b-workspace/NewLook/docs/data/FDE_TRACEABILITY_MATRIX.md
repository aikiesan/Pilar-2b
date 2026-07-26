# FDE Traceability Matrix — PILAR-2b Canonical Feedstock Database

**AUTO-GENERATED** by `backend/scripts/validate_fde_traceability.py --emit`.
Do NOT edit by hand — edit `feedstocks.yaml`/`references.yaml` and regenerate.

`FDE = availability × η` where `availability = FC × FCo_available × FS × FL`.
`availability` is **derived on read** — it is not a field of `feedstocks.yaml`.
`FCo_available` is the AVAILABLE share, by the convention
`fco_available == 1 - fcp_committed`.

All values are the **medio** scenario. The source column is the `reference:`
declared on that factor in `feedstocks.yaml` (full citation + URL in
`references.yaml`). **`—` means no versioned reference reports that factor** —
until 2026-07-26 these cells silently borrowed the block's first reference, so
the matrix appeared fully sourced when it was not. Confidence tiers: HIGH =
regulatory/measured per-factor sources; MEDIUM = regional studies/proxy; LOW =
generic or no-direct-study proxy.

| Feedstock | Conf. | FC (src) | FCo_av (src) | FS (src) | FL (src) | η | avail | FDE |
|---|---|---|---|---|---|---:|---:|---:|
| **BAGACO** | HIGH | 0.95 (abiogas2021_atlas) | 0.22 (epe_ben2024) | 0.90 (abiogas2021_atlas) | 0.90 (abiogas2021_atlas) | 0.7 | 0.1693 | 0.1185 |
| **BAGACO_CITROS** | MEDIUM | 0.85 (abiogas2021_atlas) | 0.30 (abiogas2021_atlas) | 0.90 (abiogas2021_atlas) | 0.75 (abiogas2021_atlas) | 0.78 | 0.1721 | 0.1343 |
| **CAMA_AVIARIO** | MEDIUM | 0.80 (avila2007_poultry) | 0.50 (avila2007_poultry) | 0.90 (avila2007_poultry) | 0.75 (avila2007_poultry) | 0.7 | 0.2700 | 0.1890 |
| **CASCAS_CITROS** | MEDIUM | 0.80 (braddock1999_citrus) | 0.30 (braddock1999_citrus) | 0.90 (fundecitrus2022) | 0.75 (lohrasbi2010_citrus) | 0.78 | 0.1620 | 0.1264 |
| **CASCA_CAFE** | MEDIUM | 0.70 (abiogas2021_atlas) | 0.50 (abiogas2021_atlas) | 0.85 (abiogas2021_atlas) | 0.65 (abiogas2021_atlas) | 0.7 | 0.1934 | 0.1354 |
| **CASCA_MILHO** | LOW | 0.65 (fao2017_cropres) | 0.45 (fao2017_cropres) | 0.80 (conab2023_calendar) | 0.65 (fao2017_cropres) | 0.65 | 0.1521 | 0.0989 |
| **CASCA_SOJA** | MEDIUM | 0.75 (abiogas2021_atlas) | 0.40 (abiogas2021_atlas) | 0.85 (abiogas2021_atlas) | 0.70 (abiogas2021_atlas) | 0.7 | 0.1785 | 0.1249 |
| **DEJETOS_AVES** | MEDIUM | 0.75 (abpa2022_report) | 0.60 (miele2004_poultry) | 0.92 (embrapa2012_aves) | 0.70 (seganfredo2007_swine) | 0.72 | 0.2898 | 0.2087 |
| **DEJETOS_BOVINO** | MEDIUM | 0.75 (souza2009_cattle) | 0.50 (embrapa2015_cattle) | 0.88 (primavesi2004_cattle) | 0.68 (coldebella2006_biogas) | 0.68 | 0.2244 | 0.1526 |
| **DEJETOS_SUINO** | MEDIUM | 0.90 (embrapa2012_swine) | 0.55 (kunz2009_swine) | 0.95 (embrapa2012_swine) | 0.72 (moller2004_manure) | 0.75 | 0.3386 | 0.2539 |
| **ESTERCO_BOVINO** | MEDIUM | 0.55 (embrapa2015_cattle) | 0.45 (primavesi2004_cattle) | 0.82 (primavesi2004_cattle) | 0.65 (coldebella2006_biogas) | 0.7 | 0.1319 | 0.0923 |
| **ESTERCO_BOVINO_CORTE** | MEDIUM | 0.35 (embrapa2015_cattle) | 0.35 (primavesi2004_cattle) | 0.78 (primavesi2004_cattle) | 0.52 (coldebella2006_biogas) | 0.65 | 0.0497 | 0.0323 |
| **ESTERCO_BOVINO_LEITEIRO** | MEDIUM | 0.88 (embrapa2015_cattle) | 0.58 (primavesi2004_cattle) | 0.90 (primavesi2004_cattle) | 0.85 (coldebella2006_biogas) | 0.75 | 0.3905 | 0.2928 |
| **ESTERCO_SUINO** | MEDIUM | 0.90 (embrapa2012_swine) | 0.55 (kunz2009_swine) | 0.95 (abcs2016_swine) | 0.75 (perdomo2003_swine) | 0.75 | 0.3527 | 0.2645 |
| **FORSU** | MEDIUM | 0.90 (mata_alvarez2014_ofmsw) | 0.65 (mata_alvarez2014_ofmsw) | 0.90 (mata_alvarez2014_ofmsw) | 0.80 (mata_alvarez2014_ofmsw) | 0.75 | 0.4212 | 0.3159 |
| **GORDURA** | MEDIUM | 0.80 (mapa2019_riispoa) | 0.25 (anp2023_biodiesel) | 0.95 (abpa2022_report) | 0.75 (abiove2022_oilseed) | 0.85 | 0.1425 | 0.1211 |
| **LODO_PRIMARIO** | HIGH | 0.85 (von_sperling2007_sludge) | 0.75 (cetesb2020_sludge) | 0.95 (von_sperling2007_sludge) | 0.90 (cetesb2020_sludge) | 0.8 | 0.5451 | 0.4361 |
| **LODO_SECUNDARIO** | HIGH | 0.82 (andreoli2001_sludge) | 0.70 (cetesb2020_sludge) | 0.95 (snis2022_rsu) | 0.85 (abiogas2021_atlas) | 0.55 | 0.4635 | 0.2549 |
| **MUCILAGEM_CAFE** | MEDIUM | 0.85 (mussatto2011_coffee) | 0.45 (pandey2000_coffee) | 0.80 (conab2023_calendar) | 0.70 (mussatto2011_coffee) | 0.82 | 0.2142 | 0.1756 |
| **ORGANICO_RSU** | LOW | 0.90 (abrelpe2022_rsu) | 0.12 (abrelpe2022_rsu) | 0.92 (snis2022_rsu) | 0.82 (snis2022_rsu) | 0.62 | 0.0815 | 0.0505 |
| **PALHA** | HIGH | 0.85 (hassuani2005_straw) | 0.10 (carvalho2017_straw) | 0.90 (unica2023_straw) | 0.85 (leal2013_straw) | 0.62 | 0.0650 | 0.0403 |
| **PALHA_MILHO** | MEDIUM | 0.50 (abiogas2021_atlas) | 0.17 (abiogas2021_atlas) | 0.85 (abiogas2021_atlas) | 0.67 (abiogas2021_atlas) | 0.68 | 0.0475 | 0.0323 |
| **PALHA_SOJA** | HIGH | 0.75 (—) | 0.15 (abrelpe2022_rsu) | 0.85 (—) | 0.55 (—) | 0.6 | 0.0526 | 0.0316 |
| **PODA_URBANA** | LOW | 0.50 (abrelpe2022_rsu) | 0.35 (abrelpe2022_rsu) | 0.80 (snis2022_rsu) | 0.75 (—) | 0.55 | 0.1050 | 0.0577 |
| **POLPA_CAFE** | MEDIUM | 0.80 (mussatto2011_coffee) | 0.40 (bressani2015_coffee) | 0.85 (conab2023_calendar) | 0.70 (mussatto2011_coffee) | 0.72 | 0.1904 | 0.1371 |
| **SANGUE** | MEDIUM | 0.70 (mapa2019_riispoa) | 0.45 (fao2014_slaughter) | 0.95 (abpa2022_report) | 0.70 (mapa2019_riispoa) | 0.78 | 0.2095 | 0.1634 |
| **TORTA_FILTRO** | MEDIUM | 0.90 (abiogas2021_atlas) | 0.30 (velasquez2020_sugarcane) | 0.88 (velasquez2020_sugarcane) | 0.85 (abiogas2021_atlas) | 0.72 | 0.2020 | 0.1454 |
| **VINHACA** | HIGH | 0.95 (bonomi2015_vinhaca) | 0.15 (bonomi2015_vinhaca) | 0.90 (unica2023_straw) | 0.90 (bonomi2015_vinhaca) | 0.65 | 0.1154 | 0.0750 |

## Cited reference URLs

- `abcs2016_swine` — [https://www.abcs.org.br/informativos/publicacoes/](https://www.abcs.org.br/informativos/publicacoes/) (unverified — see note)
- `abiogas2021_atlas` — [https://abiogas.org.br/atlas-do-biogas-2021/](https://abiogas.org.br/atlas-do-biogas-2021/) ✓verified
- `abiove2022_oilseed` — [https://abiove.org.br/estatisticas/](https://abiove.org.br/estatisticas/) ✓verified
- `abouelenien2014_poultry` — [https://doi.org/10.1016/j.wasman.2013.10.001](https://doi.org/10.1016/j.wasman.2013.10.001) ✓verified
- `abpa2022_report` — [https://abpa-br.org/relatorios/](https://abpa-br.org/relatorios/) ✓verified
- `abrelpe2022_rsu` — [https://abrelpe.org.br/panorama/](https://abrelpe.org.br/panorama/) ✓verified
- `amon2007_cattle` — [https://doi.org/10.1016/j.biortech.2006.07.016](https://doi.org/10.1016/j.biortech.2006.07.016) ✓verified
- `andreoli2001_sludge` — [https://www.finep.gov.br/images/apoio-e-financiamento/historico-de-programas/prosab/Lodo_de_Esgotos.pdf](https://www.finep.gov.br/images/apoio-e-financiamento/historico-de-programas/prosab/Lodo_de_Esgotos.pdf) ✓verified
- `angelidaki2003_manure` — [https://doi.org/10.1385/ABAB:109:1-3:95](https://doi.org/10.1385/ABAB:109:1-3:95) ✓verified
- `anp2023_biodiesel` — [https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biodiesel](https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biodiesel) ✓verified
- `avila2007_poultry` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) ✓verified
- `bonomi2015_vinhaca` — [https://doi.org/10.1016/j.rser.2015.01.022](https://doi.org/10.1016/j.rser.2015.01.022) ✓verified
- `braddock1999_citrus` — [https://www.wiley.com/en-us/Handbook+of+Citrus+By+Products+and+Processing+Technology-p-9780471196181](https://www.wiley.com/en-us/Handbook+of+Citrus+By+Products+and+Processing+Technology-p-9780471196181) (unverified — see note)
- `bressani2015_coffee` — [https://www.epamig.br/informe-agropecuario/](https://www.epamig.br/informe-agropecuario/) (unverified — see note)
- `carvalho2017_straw` — [https://doi.org/10.1111/gcbb.12410](https://doi.org/10.1111/gcbb.12410) ✓verified
- `cetesb2020_sludge` — [https://cetesb.sp.gov.br/solo/valores-orientadores-para-solo-e-agua-subterranea/](https://cetesb.sp.gov.br/solo/valores-orientadores-para-solo-e-agua-subterranea/) ✓verified
- `coldebella2006_biogas` — [http://www.proceedings.scielo.br/scielo.php?pid=MSC0000000022006000200053&script=sci_arttext](http://www.proceedings.scielo.br/scielo.php?pid=MSC0000000022006000200053&script=sci_arttext) ✓verified
- `conab2023_calendar` — [https://www.conab.gov.br/institucional/publicacoes/outras-publicacoes](https://www.conab.gov.br/institucional/publicacoes/outras-publicacoes) ✓verified
- `embrapa2012_aves` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) ✓verified
- `embrapa2012_swine` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) ✓verified
- `embrapa2015_cattle` — [https://www.embrapa.br/gado-de-leite/publicacoes](https://www.embrapa.br/gado-de-leite/publicacoes) ✓verified
- `epe2020_biogas` — [https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/potencial-dos-recursos-energeticos-no-horizonte-2050](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/potencial-dos-recursos-energeticos-no-horizonte-2050) ✓verified
- `epe_ben2024` — [https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2024) ✓verified
- `fao2014_slaughter` — [https://www.fao.org/3/i3461e/i3461e.pdf](https://www.fao.org/3/i3461e/i3461e.pdf) ✓verified
- `fao2017_cropres` — [https://www.fao.org/conservation-agriculture/en/](https://www.fao.org/conservation-agriculture/en/) (unverified — see note)
- `fundecitrus2022` — [https://www.fundecitrus.com.br/pes/](https://www.fundecitrus.com.br/pes/) ✓verified
- `hashimoto1989_lignocellulosic` — [https://doi.org/10.1016/0960-8524(89)90042-8](https://doi.org/10.1016/0960-8524(89)90042-8) ✓verified
- `hassuani2005_straw` — [https://www.osti.gov/etdeweb/biblio/20656473](https://www.osti.gov/etdeweb/biblio/20656473) (unverified — see note)
- `heerenklage2019_sludge` — [https://doi.org/10.1016/j.wasman.2019.04.025](https://doi.org/10.1016/j.wasman.2019.04.025) ✓verified
- `herrmann2012_corn` — [https://doi.org/10.1016/j.biortech.2011.12.074](https://doi.org/10.1016/j.biortech.2011.12.074) ✓verified
- `ibge2017_censo` — [https://sidra.ibge.gov.br/pesquisa/censo-agropecuario/censo-agropecuario-2017](https://sidra.ibge.gov.br/pesquisa/censo-agropecuario/censo-agropecuario-2017) ✓verified
- `kafle2016_soy` — [https://doi.org/10.1016/j.wasman.2015.10.021](https://doi.org/10.1016/j.wasman.2015.10.021) ✓verified
- `kunz2009_swine` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) ✓verified
- `leal2013_straw` — [https://doi.org/10.1016/j.biombioe.2013.03.007](https://doi.org/10.1016/j.biombioe.2013.03.007) ✓verified
- `lohrasbi2010_citrus` — [https://doi.org/10.1016/j.biortech.2010.04.078](https://doi.org/10.1016/j.biortech.2010.04.078) ✓verified
- `mapa2019_riispoa` — [https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-animal](https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-animal) ✓verified
- `mata_alvarez2014_ofmsw` — [https://doi.org/10.1016/j.biortech.2014.03.077](https://doi.org/10.1016/j.biortech.2014.03.077) ✓verified
- `miele2004_poultry` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) (unverified — see note)
- `moller2004_manure` — [https://doi.org/10.2134/jeq2004.0027](https://doi.org/10.2134/jeq2004.0027) ✓verified
- `mussatto2011_coffee` — [https://doi.org/10.1007/s11947-011-0565-z](https://doi.org/10.1007/s11947-011-0565-z) ✓verified
- `okonkwo2021_coffee` — [https://doi.org/10.1016/j.biteb.2021.100830](https://doi.org/10.1016/j.biteb.2021.100830) ✓verified
- `pandey2000_coffee` — [https://doi.org/10.1016/S1369-703X(00)00084-X](https://doi.org/10.1016/S1369-703X(00)00084-X) ✓verified
- `paulose2021_bagaco` — [https://doi.org/10.1016/j.indcrop.2021.113498](https://doi.org/10.1016/j.indcrop.2021.113498) ✓verified
- `perdomo2003_swine` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) (unverified — see note)
- `pognani2011_garden` — [https://doi.org/10.1016/j.biortech.2010.09.006](https://doi.org/10.1016/j.biortech.2010.09.006) ✓verified
- `primavesi2004_cattle` — [https://www.embrapa.br/pecuaria-sudeste/publicacoes](https://www.embrapa.br/pecuaria-sudeste/publicacoes) ✓verified
- `seganfredo2007_swine` — [https://www.embrapa.br/suinos-e-aves/publicacoes](https://www.embrapa.br/suinos-e-aves/publicacoes) (unverified — see note)
- `sheets2015_fats` — [https://doi.org/10.1016/j.biortech.2014.09.072](https://doi.org/10.1016/j.biortech.2014.09.072) ✓verified
- `snis2022_rsu` — [http://antigo.snis.gov.br/diagnosticos](http://antigo.snis.gov.br/diagnosticos) ✓verified
- `souza2009_cattle` — [https://doi.org/10.4025/actascitechnol.v31i1.3214](https://doi.org/10.4025/actascitechnol.v31i1.3214) (unverified — see note)
- `unica2023_straw` — [https://unica.com.br/iniciativas/bioenergia/](https://unica.com.br/iniciativas/bioenergia/) ✓verified
- `velasquez2020_sugarcane` — [https://doi.org/10.1016/j.biombioe.2020.105774](https://doi.org/10.1016/j.biombioe.2020.105774) ✓verified
- `von_sperling2007_sludge` — [https://doi.org/10.2166/9781780402086](https://doi.org/10.2166/9781780402086) ✓verified
- `wikandari2014_citrus` — [https://doi.org/10.1016/j.biortech.2014.07.074](https://doi.org/10.1016/j.biortech.2014.07.074) ✓verified
