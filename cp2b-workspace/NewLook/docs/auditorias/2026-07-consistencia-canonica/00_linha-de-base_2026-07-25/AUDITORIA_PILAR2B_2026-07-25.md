# AUDITORIA TÉCNICA — PILAR-2b

**Data da auditoria:** 2026-07-25
**Repositório:** `/home/user/Pilar-2b` (`github.com/aikiesan/Pilar-2b`)
**Branch ativa na auditoria:** `claude/pilar-2b-assessment-wthrjr`
**HEAD:** `9f890398a5ca750ef3817b528e6119e595f41b61` — `2026-07-23 09:26:15 -0300`
**Modo:** somente-leitura. Nenhum arquivo do projeto foi alterado. Nenhuma migração, seed ou deploy executado. Nenhum banco de dados foi acessado.

**Reprodução executada (única execução de código):** o pipeline canônico
`cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py` foi
re-executado em memória, a partir de um script de leitura em diretório temporário
fora do projeto, sem escrever nenhum arquivo no repositório. Onde um número desta
auditoria vem dessa re-execução (e não de um arquivo versionado), está marcado
**[RE-EXECUÇÃO 2026-07-25]**.

---

## 0.1 TABELA DE DIVERGÊNCIAS (ordenada por criticidade)

| # | Item | Valor A (local) | Valor B (local) | Impacto |
|---|---|---|---|---|
| D1 | **Fórmula do FDE — três definições incompatíveis no mesmo repositório** | `FDE = FC × FCo × FS × FL × η`, com FCo = *fração disponível* multiplicada direto (`backend/app/services/canonical_loader.py:102-123`; `docs/data/FDE_TRACEABILITY_MATRIX.md:6`; ex. BAGACO `0.95 × 0.22 × 0.90 × 0.90 = 0.1693` em `docs/data/FDE_TRACEABILITY_MATRIX.md:14`) | (B1) `factors.fc * (1 - factors.fcp) * factors.fs * factors.fl` — FCo tratado como *fração perdida* (`frontend/src/types/analysis.ts:45`); (B2) `fc_medio * fcp_medio * fs_medio * fl_medio * 100` (`frontend/src/services/residuosApi.ts:453`); (B3) `FDE = (1 - Competing_Uses) × Collection_Factor × η_conversion` — só 3 fatores, sem FS e FL (`docs/data/FDE_METHODOLOGY.md:35`) | **CEUS (metodologia), FAPESP.** Duas funções chamadas `calculateFDE` no frontend produzem resultados diferentes para o mesmo resíduo, e a documentação de metodologia descreve uma quarta forma. Revisor de periódico pedirá a fórmula única. |
| D2 | **Números canônicos do estado — dois conjuntos publicados** | CH₄ 3,57 / Biogás 6,39 / Biometano 3,46 Mm³/d (`docs/data/FOSS4G_PAPER_SUPPLEMENT.md:104-108`; `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:22-26`; `docs/data/METADATA.json` bloco `derived_artifacts.state_totals`) | CH₄ 3,65 / Biogás 6,53 / Biometano 3,54 Mm³/d (`docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:13`) — e **[RE-EXECUÇÃO 2026-07-25]** o código atual produz `3,6488 / 6,5326 / 3,5393` | **CEUS, FAPESP, BEPE.** O suplemento do paper e o METADATA.json estão desatualizados em relação ao código. `FOSS4G_PAPER_SUPPLEMENT.md` e `SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` datam de `2026-06-06`; `feedstocks.yaml` foi alterado em `2026-07-21`. |
| D3 | **Número de categorias de substrato** | **26** feedstocks em `data/canonical_parameters/feedstocks.yaml` (contagem programática das chaves de `feedstocks:`); confirmado por `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:150` ("26 feedstocks") e `docs/data/FDE_TRACEABILITY_MATRIX.md` | **31** em `README.md:87`, `README.md:304`, `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:31,99`; **38** em `scripts/calculate_fde_all_residues.py:3`; **~38** em `docs/data/SCIENTIFIC_AUDIT_REPORT.md:5`; **50+** em `README.md:86` | **CEUS, FAPESP.** O argumento central do benchmark FIESP ("31 resíduos > 2 classes FIESP") repousa num número que a base canônica não sustenta. |
| D4 | **Cobertura territorial declarada** | **645 municípios / São Paulo** — `README.md:11,13,16,22,74`; `CITATION.cff` (abstract); `docs/data/METADATA.json` (`spatial_units.municipalities.count: 645`); `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:5` | **5.571 municípios / Brasil** — `docs/HANDOFF_2026-07-21.md` ("production moved from 645 São Paulo municipalities to all 5,571"); `backend/app/api/v1/endpoints/municipalities.py:39,282,300`; `backend/app/api/v1/endpoints/geospatial.py:208`. Também **5.570** em mensagem de commit `#148` (`git log`) | **CEUS, FAPESP, BEPE.** A produção é nacional desde 2026-07-21; toda a documentação científica descreve escopo estadual. |
| D5 | **Contagem do corpus de referências** | **65** entradas em `data/canonical_parameters/references.yaml` (contagem programática); "Full reference list (65 entries with URLs)" em `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:222` | **53** em `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:87`; **58** em `README.md:89`; **367 refs únicas / 294 peer-reviewed** em `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:99`; **399** na mensagem do commit `#101` (`git log`); **368 linhas** em `references_unified.csv` / `references_review.csv` | **CEUS, FAPESP.** |
| D6 | **`mill_delivery_fraction` (0,85) não é aplicada no pipeline estadual** | Definida em `data/canonical_parameters/feedstocks.yaml:69-79` (`min 0.76 / medio 0.85 / max 0.92`) com acessor dedicado `canonical_loader.mill_delivery_fraction()` (`backend/app/services/canonical_loader.py:258-269`); `docs/HANDOFF_2026-07-21.md` afirma "Sugarcane additionally multiplies by `mill_delivery_fraction` (0.85)" | `compute_sp_canonical_totals.py` **não a chama em nenhum ponto** — as sub-correntes industriais usam a produção PAM integral (`backend/scripts/compute_sp_canonical_totals.py:202-217`) | **CEUS, FAPESP.** O total de SP não desconta a cana não moída, ao contrário do que a documentação afirma. Afeta bagaço, torta e vinhaça = 2,28 dos 3,65 Mm³/d de CH₄. |
| D7 | **Parâmetros químicos: tabela do suplemento ≠ `feedstocks.yaml`** | `feedstocks.yaml`: ESTERCO_BOVINO bmp medio 200,0 / ts 25,0 / vs_of_ts 78,0; CAMA_AVIARIO 280,0 / 25,0 / 69,8; FORSU 360,0 / 30,58 / 85,0; VINHACA 160,0 / 3,0 / 60,0; TORTA_FILTRO 280,0 / 38,0 / 80,0 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:172-186`: ESTERCO_BOVINO 155 / 18,0 / 72,0; CAMA_AVIARIO 265 / 65,0 / 72,0; FORSU 350 / 30,0 / 70,0; VINHACA 110 / 5,0 / 78,0; TORTA_FILTRO 235 / 38,0 / 84,0 | **CEUS.** A tabela de parâmetros do suplemento do paper não corresponde à base canônica atual. |
| D8 | **Coleção do MapBiomas** | **Collection 8.0** no código: `backend/app/services/mapbiomas_service.py:31,267`; `backend/setup_mapbiomas.py:35`; asserção de teste em `backend/tests/unit/services/test_mapbiomas_service.py:399` | **Collection 9** em `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:6,206`; **Collection 10** em `backend/scripts/load_biomass_tons.py:7` e `docs/data/SCIENTIFIC_AUDIT_REPORT.md:621`; **Collection 10.1** planejada em `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:143,285`. Divergência já auto-declarada em `docs/data/METADATA.json` (`_status_notes`) | **CEUS.** |
| D9 | **Número de processo FAPESP** | **2024/01112-1 (CP2Bsd)** — `CITATION.cff:50-52`; `README.md:52,511,519,535`; `frontend/messages/pt-BR.json:105,222`; `docs/data/METADATA.json` (`reproducibility.funding`) | **2025/08745-2** — `frontend/src/components/analysis/MethodologyPanel.tsx:244`; `frontend/src/app/[locale]/about/page.tsx:53,183`; `frontend/src/app/[locale]/municipality/[ibge_code]/page.tsx:216`; `frontend/messages/pt-BR.json:648,653`; `frontend/messages/en.json:648,653`; `backend/app/api/v1/endpoints/proximity.py:423`; `prepare-inpi-submission.sh:99` | **FAPESP (crítico administrativo), BEPE.** Dois números de processo diferentes exibidos na plataforma pública. |
| D10 | **Ano de referência dos dados de pecuária** | **Censo Agropecuário 2017** — `docs/data/METADATA.json` (`sources[ibge_censo_agro_2017]`); `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:6,202` | **IBGE PPM 2024** — `docs/HANDOFF_2026-07-21.md` ("`ibge_ppm` … 87,948 (2024 only)"); `backend/app/migrations/025_biomass_provenance.sql:73-80` ("they track PPM head at ratios 1.040 / 1.003 / 1.072"). Divergência auto-declarada em `docs/data/METADATA.json` (`_status_notes`) | **CEUS, FAPESP.** |
| D11 | **`validation_plants`: com ou sem dados?** | "contains no real-plant data rows" — `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:250-252`; "NULL in all rows" — `docs/data/SCIENTIFIC_AUDIT_REPORT.md:595` | A migração **insere 6 plantas** (`backend/migrations/010_create_validation_plants.sql:216-219` — "SAMPLE DATA: Insert 6 existing validation plants"), com o comentário `-- Note: Coordinates are approximate` (linha 218) | **CEUS.** Existem linhas, mas os campos de comparação (`prediction_error_pct`, `utilization_rate_pct`) não são preenchidos por elas. |
| D12 | **Versões do backend: README ≠ `requirements.txt`** | `README.md:130`: FastAPI **0.135.3** + Uvicorn **0.32.1**; `README.md:394-401`: `sqlalchemy==2.0.23`, `psycopg2-binary==2.9.9`, `shapely==2.0.2` | `backend/requirements.txt:3-4,10-12`: `fastapi==0.136.1`, `uvicorn[standard]==0.47.0`, `sqlalchemy==2.0.49`, `psycopg2-binary==2.9.12`, `shapely==2.1.2` | **CEUS (seção de implementação), reprodutibilidade.** |
| D13 | **Versão do Node exigida** | **18+** — `README.md:177`; `CONTRIBUTING.md:23`; `cp2b-workspace/NewLook/.github/workflows/ci.yml:25,65,93,119` (`node-version: '18'`) | **22** — `.github/workflows/ci.yml:22,46,66,85` (raiz do monorepo, o workflow efetivamente ativo) | **Reprodutibilidade (CEUS).** |
| D14 | **Sentry: integrado ou roadmap?** | "Integração completa com Sentry" em `[Unreleased]` — `cp2b-workspace/NewLook/CHANGELOG.md:10-21` | "Sentry observability integration (frontend + backend)" listado em *In Progress / Roadmapped* — `README.md:465` | Relato de estado (FAPESP). |
| D15 | **Cobertura de testes alvo** | `--cov-fail-under=40` (valor efetivamente aplicado) — `backend/pytest.ini:29` | "target: 80% coverage" — `README.md:275`; `backend/pyproject.toml:151-156` registra "actual coverage is ~55-60%, well short of the 80% this section used to claim" e mantém `--cov-fail-under=40` | **CEUS (qualidade).** |
| D16 | **Contradição interna no relatório FIESP** | §3: "**Aplicado** (2026-06 …): VINHACA 90 → **160** … 35/35 testes de regressão verdes" — `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:78-93` | §5 *Pendências*: "Aplicar (**se aprovado**) os ajustes de BMP do §3 e re-rodar `compute_sp_canonical_totals.py`" — `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:114` | **CEUS.** (Verificação: `feedstocks.yaml` já contém VINHACA bmp medio = 160,0 — o §3 é o estado real.) |
| D17 | **`analysis/README.md` referencia script inexistente** | "Data loading script: `cp2b-workspace/NewLook/backend/scripts/cp2b_clustering.py`" — `analysis/README.md:31` (arquivo existe) | O `README.md:465` e o `analysis/README.md` descrevem clustering sobre "645 municipalities", enquanto a base servida tem 5.571 (ver D4) | Menor. |

**Nota sobre licença:** **não há divergência de licença.** Todas as declarações
encontradas apontam GPL-3.0 (ver Bloco E). O achado relevante é de outra natureza:
o arquivo `LICENSE` tem 17 linhas e contém apenas o *aviso* de licença, não o
texto integral da GPL-3.0.

---

## 0.2 TABELA DE NÚMEROS CANÔNICOS (pronta para copiar)

| Grandeza | Valor | Unidade | Cenário | Arquivo:linha | Data do arquivo (git) |
|---|---:|---|---|---|---|
| CH₄ prático (SP) | 0,74 | M m³/dia | min | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:106` | 2026-06-06 09:34:36 -0300 |
| CH₄ prático (SP) | **3,57** | M m³/dia | medio | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:106` | 2026-06-06 09:34:36 -0300 |
| CH₄ prático (SP) | 14,45 | M m³/dia | max | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:106` | 2026-06-06 09:34:36 -0300 |
| Biogás prático (SP) | 1,32 | M m³/dia | min | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:107` | 2026-06-06 09:34:36 -0300 |
| Biogás prático (SP) | **6,39** | M m³/dia | medio | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:107` | 2026-06-06 09:34:36 -0300 |
| Biogás prático (SP) | 25,78 | M m³/dia | max | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:107` | 2026-06-06 09:34:36 -0300 |
| Biometano (SP) | 0,71 | M m³/dia | min | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:108` | 2026-06-06 09:34:36 -0300 |
| Biometano (SP) | **3,46** | M m³/dia | medio | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:108` | 2026-06-06 09:34:36 -0300 |
| Biometano (SP) | 14,02 | M m³/dia | max | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:108` | 2026-06-06 09:34:36 -0300 |
| CH₄ (SP) — 4 cenários nomeados | 0,75 / 3,65 / **9,19** / 14,74 | M m³/dia | Linha de Base / Médio Prazo / **Fronteira** / Otimista | `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:13-16` | 2026-06-12 07:40:53 -0300 |
| Biogás (SP) — 4 cenários | 1,35 / 6,53 / **16,42** / 26,30 | M m³/dia | Base / Médio / Fronteira / Otimista | `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:13-16` | 2026-06-12 07:40:53 -0300 |
| Biometano (SP) — 4 cenários | 0,73 / 3,54 / **8,92** / 14,29 | M m³/dia | Base / Médio / Fronteira / Otimista | `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:13-16` | 2026-06-12 07:40:53 -0300 |
| CH₄ prático (SP) **[RE-EXECUÇÃO 2026-07-25]** | 0,7537 / 3,6488 / 14,7363 | M m³/dia | min / medio / max | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py` (compute()) | 2026-07-18 13:48:33 -0300 |
| Biogás prático (SP) **[RE-EXECUÇÃO]** | 1,3507 / 6,5326 / 26,2993 | M m³/dia | min / medio / max | idem | 2026-07-18 |
| Biometano (SP) **[RE-EXECUÇÃO]** | 0,7311 / 3,5393 / 14,2942 | M m³/dia | min / medio / max | idem (UPGRADING_EFFICIENCY em `:54`) | 2026-07-18 |
| **CH₄ TEÓRICO (SP)** **[RE-EXECUÇÃO]** | 15,3788 / 33,9946 / 65,2731 | M m³/dia | min / medio / max | derivado de `biogas_forward.BiogasResult.ch4_theoretical_m3` (`backend/app/services/biogas_forward.py:86`) — **não é agregado nem impresso por nenhum script versionado** | 2026-07-01 16:45:19 +0300 |
| **Taxa de retenção (prático ÷ teórico)** **[RE-EXECUÇÃO]** | 4,90 % / 10,73 % / 22,58 % | % | min / medio / max | **calculada, não hardcoded**; nenhum arquivo do repositório publica esta razão | — |
| `FRONTIER_ALPHA` | 0.5 | adimensional | 4º cenário (Fronteira) | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:308` | 2026-07-18 13:48:33 -0300 |
| `UPGRADING_EFFICIENCY` (biogás→biometano) | 0.97 | adimensional | todos | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:54` | 2026-07-18 13:48:33 -0300 |
| `CITRUS_RESIDUE_FRACTION` | 0.50 | t casca / t fruta | todos | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:74` | 2026-07-18 13:48:33 -0300 |
| Cana → bagaço | 0.280 | t / t cana verde | todos | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:84` | 2026-07-18 |
| Cana → torta de filtro | 0.030 | t / t cana verde | todos | `…compute_sp_canonical_totals.py:90` | 2026-07-18 |
| Cana → palha | 0.053 | t / t cana verde | todos | `…compute_sp_canonical_totals.py:96` | 2026-07-18 |
| Cana → vinhaça | 0.420 | t / t cana verde | todos | `…compute_sp_canonical_totals.py:102` | 2026-07-18 |
| Soma das frações de cana | 0.783 | t / t cana verde | — | `…compute_sp_canonical_totals.py:77` | 2026-07-18 |
| `mill_delivery_fraction` (cana moída/produzida) | 0.76 / 0.85 / 0.92 | adimensional | min/medio/max | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml:69-72` — **definida mas não aplicada** (ver D6) | 2026-07-21 14:14:13 -0300 |
| População de SP (escalonamento urbano) | 44.411.238 | habitantes | todos | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:63` | 2026-07-18 |
| Cana bruta PAM (SP) | 247,21 | Mt/ano | — | **[RE-EXECUÇÃO]** de `docs/data/municipality_biomass_tons.csv`; valor "247 Mt" também em `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:44` | CSV: 2026-06-05 08:01:32 -0300 |
| Citros bruto PAM (SP) | 15,01 | Mt/ano | — | **[RE-EXECUÇÃO]** de `docs/data/municipality_biomass_tons.csv` | 2026-06-05 |
| Biomassa bruta total (medio) | 271.235.646,2819 | t/ano | medio | **[RE-EXECUÇÃO]** (`totals["biomass_gross"]["medio"]`) | — |
| Nº de categorias de substrato parametrizadas | **26** | feedstocks | — | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` (chaves sob `feedstocks:`) | 2026-07-21 14:14:13 -0300 |
| Complexo sucroalcooleiro (4 sub-fluxos) | 2,314 / **64,9 %** | M m³/d CH₄ / % do total | medio | `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md:135` | 2026-06-06 |
| Municípios de SP no CSV de entrada | 645 | municípios | — | **[RE-EXECUÇÃO]**: `Loaded 645 municipalities`; confirmado em `backend/app/migrations/025_biomass_provenance.sql:33` ("645 vs 645, zero difference") | 2026-07-18 |
| Municípios de SP sem cana (zero legítimo) | 133 | municípios | — | `cp2b-workspace/NewLook/backend/app/migrations/025_biomass_provenance.sql:19` | 2026-07-18 13:48:33 -0300 |
| Municípios nacionais (spine) | 5.571 | municípios | — | `cp2b-workspace/NewLook/docs/NATIONAL_DATA_LOAD.md:76`; `backend/app/api/v1/endpoints/municipalities.py:39` | 2026-07-21 / 2026-07-21 |
| Municípios com resíduo urbano **medido** (SNIS CO111) | 4.140 | municípios | — | `cp2b-workspace/NewLook/docs/HANDOFF_2026-07-21.md` (seção "Semantics that are easy to break") | 2026-07-23 09:15:45 -0300 |
| Municípios com urbano **modelado** (sem tonelagem SNIS) | 76 % | % | — | `cp2b-workspace/NewLook/backend/app/migrations/025_biomass_provenance.sql:43` | 2026-07-18 |
| Concentração espacial (nº e % de municípios que concentram X% do potencial) | **NÃO ENCONTRADO** | — | — | Nenhum arquivo do repositório calcula curva de Lorenz, Gini, share do top-N ou equivalente. Existe endpoint de ranking bruto (`backend/app/api/v1/endpoints/geospatial.py:843`; `…/intermediate_regions.py:109`) que retorna valores absolutos, sem participação percentual. | — |
| Ranking das regiões intermediárias com participação percentual | **NÃO ENCONTRADO** | — | — | `backend/app/api/v1/endpoints/intermediate_regions.py:109-145` ordena e retorna `value` absoluto; não computa `%`. Nenhum CSV/MD versionado com o ranking. | — |
| Potencial **prático de biometano por cenário** além dos 3+1 acima | ver linhas de biometano | — | — | Só existe como CH₄ × 0,97 (`compute_sp_canonical_totals.py:159`) | — |

---

## BLOCO A — INVENTÁRIO

### A.1 Estrutura de diretórios (1º e 2º nível)

| Caminho | Propósito (declarado ou evidente) | Evidência |
|---|---|---|
| `/` (raiz) | Front page do monorepo: README, LICENSE, CITATION.cff, CONTRIBUTING, CODE_OF_CONDUCT | `README.md:148-162` descreve a estrutura |
| `.github/` | CI, CodeQL, OGC compliance, templates de issue/PR, Dependabot, SECURITY.md | `.github/workflows/{ci,codeql,ogc-compliance}.yml`; `.github/ISSUE_TEMPLATE/`; `.github/dependabot.yml`; `.github/SECURITY.md`; `.github/pull_request_template.md` |
| `analysis/` | Análise de clusters reproduzível + datasets de plantas reais (ANP/ANEEL) | `analysis/README.md:1-31`; scripts `build_aneel_biogas_gd.py`, `build_anp_biometano_dataset.py`, `build_biogas_plants_dataset.py` |
| `analysis/data/` | 15 CSVs/XLSX: master de correntes de resíduo SP-2023, sumários, fatores de conversão, plantas de biogás/biometano | listagem de diretório; `analysis/data/00_DATA_DICTIONARY.json` |
| `analysis/outputs/` | Resultados: `cluster_analysis.csv`, `cluster_pca.png`, `cluster_heatmap.png`, `cluster_sizes.png` | `analysis/README.md:17-24` |
| `docs/` (raiz) | Documentação transversal de datasets — contém apenas `docs/data/BIOGAS_PLANTS_DATASET.md` | listagem de diretório |
| `cp2b-workspace/NewLook/` | **A aplicação** (monorepo aninhado) | `README.md:150` ("── THE APPLICATION ──") |
| `…/NewLook/frontend/` | Next.js + React + TypeScript, mapas React-Leaflet | `frontend/package.json` |
| `…/NewLook/backend/` | FastAPI + PostGIS: API REST, motor FDE, migrações, ingest, scripts | `backend/pyproject.toml`; `backend/app/`; `backend/ingest/` |
| `…/NewLook/data/canonical_parameters/` | Fonte única de verdade: `feedstocks.yaml`, `references.yaml`, planilhas de revisão de referências | `feedstocks.yaml:5-8` |
| `…/NewLook/docs/` | Documentação técnica (api, architecture, compliance, data, deployment, planning, qa, security, sql) | listagem |
| `…/NewLook/apache/` | Configurações Apache2 de produção (`cp2b.unicamp.br`, `pilar2b`, GeoServer draft) | listagem |
| `…/NewLook/scripts/` | Geração a partir do canônico, FDE, sync/verify de dados, GeoServer | listagem |
| `…/NewLook/tests/ogc/` | Suíte de conformidade OGC (TEAM Engine / CITE) | `.github/workflows/ogc-compliance.yml:15` |
| `…/NewLook/data/` | JSONs de FDE por resíduo (`fde_all_residues.json`, `sao_paulo_biogas_potential_fde.json`) | listagem |

### A.2 Linguagens e contagem aproximada de linhas

Exclui `.git/`, `node_modules/`, `.next/`.

| Extensão | Arquivos | Linhas |
|---|---:|---:|
| `.py` | 191 | 42.232 |
| `.tsx` | 156 | 41.273 |
| `.sql` | 42 | 29.434 |
| `.md` | 97 | 22.950 |
| `.json` | 17 | 18.494 |
| `.ts` | 70 | 15.950 |
| `.csv` | 23 | 11.334 |
| `.yaml` | 5 | 2.603 |
| `.yml` | 10 | 1.161 |
| `.sh` | 8 | 889 |
| `.js` | 14 | 714 |

Observação: `README.md:288,461` afirma "~43 documentation files" / "~43 files, ~18,500+ lines"; a contagem efetiva de `.md` no repositório é **97 arquivos / 22.950 linhas** (o número de 43 pode referir-se apenas a `cp2b-workspace/NewLook/docs/`, o que não está explicitado).

### A.3 Git

| Item | Valor | Evidência |
|---|---|---|
| Último commit | `2026-07-23 09:26:15 -0300` — `9f89039` — `feat(map): selectable CVD-safe palettes for daltonic mode (#164)` | `git log -1` |
| Total de commits (HEAD) | **51** | `git rev-list --count HEAD` |
| Branch ativa | `claude/pilar-2b-assessment-wthrjr` | `git branch` |
| Branches existentes | `claude/pilar-2b-assessment-wthrjr`, `main`, `remotes/origin/claude/pilar-2b-assessment-wthrjr`, `remotes/origin/main` | `git branch -a` |
| Tags / releases | **NENHUMA** (`git tag` retorna vazio) | `git tag` |
| Primeiro commit no histórico | `2026-06-05` — `audit: BAGACO + livestock FDE corrections on canonical database (#90)` | `git log --reverse` |
| Contribuidores | Lucas Nakamura Cerejo `<lucassnakamura@gmail.com>` — 48 commits; Lucas Boaro `<email_do_lucas@exemplo.com>` — 2; Claude `<noreply@anthropic.com>` — 1 | `git shortlog -sne --all` |

**Fato relevante:** o histórico Git deste clone começa em **2026-06-05**, embora as
mensagens de commit referenciem PRs de `#90` a `#164` e o `CHANGELOG.md` documente
versões de `2025-10-13` em diante. O histórico anterior a 2026-06-05 **não está
presente no repositório auditado**.

### A.4 README, CONTRIBUTING, CHANGELOG, CITATION.cff

| Arquivo | Presente | Resumo | Data (git) |
|---|---|---|---|
| `README.md` (raiz, 22.006 bytes) | Sim | Badges (versão 3.0.3, GPL-3.0, INPI, UNICAMP, plataforma ao vivo, FOSS4G Europe 2026); reconhecimento institucional (INPI `BR512026003115-0`, FAPESP 2024/01112-1); 3 contribuições declaradas do estudo (`README.md:18-22`); features; arquitetura; quick start; documentação; métricas de performance; status do projeto (Sprints 1–5 concluídas); citação; licença GPL-3.0 | 2026-07-03 19:48:45 +0300 |
| `CONTRIBUTING.md` (raiz, 9.342 bytes) | Sim | Pré-requisitos (Node 18+, Python 3.10+, PostgreSQL 15+ com PostGIS), setup, workflow, padrões de código, requisitos de teste, processo de PR, guia de mensagens de commit | — |
| `CODE_OF_CONDUCT.md` (raiz) | Sim | Padrões de comunidade | — |
| `CHANGELOG.md` | Sim — **apenas em `cp2b-workspace/NewLook/CHANGELOG.md`**; não existe na raiz (o `README.md:287` aponta para o caminho aninhado) | Formato Keep a Changelog. Seções: `[Unreleased]` (Sentry, MCDA configurável, WCAG 2.1 AA, Bagacinho IA), `[3.0.3] 2026-05-18` (registro INPI, Apache2+PM2 na VM Unicamp, Sankey, ESLint 9), `[3.0.2] 2026-04-12` (CVE-2026-23869), `[3.0.1] 2025-12-07`, `[3.0.0-alpha] 2025-11-16`, `[2.0.0] 2025-10-13` | 2026-06-05 08:01:32 -0300 |
| `CITATION.cff` (raiz, 2.184 bytes) | Sim | `cff-version 1.2.0`; versão **3.0.3**; `date-released: 2026-05-18`; `license: GPL-3.0`; URL `https://cp2b.unicamp.br/pilar2b/pt-BR`; abstract com **645 municípios de SP** e metodologia FDE; 4 autores (Cerejo, Lamparelli, Moraes, Aguiar — todos NIPE/UNICAMP); grant FAPESP **2024/01112-1**; identifier INPI **BR512026003115-0** ("issued 12/05/2026, valid 50 years") | 2026-06-05 08:01:32 -0300 |
| ORCID em `CITATION.cff` | **NÃO ENCONTRADO** — nenhum autor tem campo `orcid` | — |
| DOI de software/dataset em `CITATION.cff` | **NÃO ENCONTRADO** — o único `identifiers` é o INPI (`type: other`) | — |

---

## BLOCO B — NÚMEROS CANÔNICOS

### B.1 Localização do pipeline canônico

| Componente | Arquivo | Papel | Data (git) |
|---|---|---|---|
| Base de parâmetros | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` | "SINGLE SOURCE OF TRUTH for all biochemical parameters" (`:5`); VERSION 1.0, DATE 2026-06-04 (`:4`) | 2026-07-21 14:14:13 -0300 |
| Motor de cálculo (puro) | `cp2b-workspace/NewLook/backend/app/services/biogas_forward.py` | forward: biomassa → CH₄ teórico → CH₄ prático → biogás; sem I/O | 2026-07-01 16:45:19 +0300 |
| Adaptador YAML→motor | `cp2b-workspace/NewLook/backend/app/services/canonical_loader.py` | `get_params`, `get_generation`, `biomass_tons_from_units`, `residue_tons_from_production`, `mill_delivery_fraction`, `biomass_tons_from_collected_waste` | 2026-07-21 14:14:13 -0300 |
| Agregador estadual | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py` | totais de SP, 100% forward | 2026-07-18 13:48:33 -0300 |
| Input de registro | `cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv` | "per-municipality SP 2023" (`compute_sp_canonical_totals.py:12`) | 2026-06-05 08:01:32 -0300 |
| Propagação p/ outras camadas | `cp2b-workspace/NewLook/scripts/generate_from_canonical.py` | gera SQL/Python/TS a partir do YAML (`feedstocks.yaml:6-7`) | — |
| Validador de rastreabilidade | `cp2b-workspace/NewLook/backend/scripts/validate_fde_traceability.py` | checagens de aritmética, ordenação e citação dos blocos FDE (`FOSS4G_PAPER_SUPPLEMENT.md:290-294`) | — |
| Pipeline alternativo (legacy vs canônico) | `cp2b-workspace/NewLook/backend/scripts/recalculate_biogas_canonical.py` | produz `docs/data/biogas_canonical_state_summary.csv` com colunas `legacy_theoretical_biogas` / `canonical_theoretical_biogas` / `canonical_practical_{min,medio,max}` | CSV: 2026-06-05 08:01:32 -0300 |

### B.2 Potencial teórico de CH₄

**Nenhum arquivo versionado publica o total estadual teórico de CH₄.**

- O motor calcula e expõe `ch4_theoretical_m3` por feedstock (`backend/app/services/biogas_forward.py:86,131,151`).
- `compute_sp_canonical_totals.py` acumula **apenas** `ch4_practical`, `biogas_practical`, `biomethane` e `biomass_gross` (`:191-196`, `:161-165`) e escreve apenas colunas práticas no CSV de saída (`:178-179`). O teórico é descartado.
- O único teórico agregado em arquivo é **por stream e não estadual-consolidado**, no pipeline alternativo: `docs/data/biogas_canonical_state_summary.csv` (coluna `canonical_theoretical_biogas`, em m³ de **biogás**/ano, não CH₄, e com 6 dos 12 streams marcados `legacy_carried`).

Valores por stream em `cp2b-workspace/NewLook/docs/data/biogas_canonical_state_summary.csv` (data do arquivo: 2026-06-05 08:01:32 -0300), reproduzidos exatamente:

| residue_stream | method | total_tons_yr | legacy_theoretical_biogas | canonical_theoretical_biogas | chemistry_delta_pct | canonical_practical_min | canonical_practical_medio | canonical_practical_max |
|---|---|---|---|---|---|---|---|---|
| aquaculture | legacy_carried | 0.0 | 130281.0 | 130281.0 | 0.0 | 130281.0 | 130281.0 | 130281.0 |
| cattle | legacy_carried | 11186668.5 | 1454267024.0 | 1454267024.0 | 0.0 | 1454267024.0 | 1454267024.0 | 1454267024.0 |
| citrus | forward_canonical | 15008242.7 | 285156605.0 | 976393389.4 | 242.4 | 25964316.7 | 75397097.5 | 172475413.6 |
| coffee | forward_canonical | 340283.3 | 95279430.0 | 67221205.9 | -29.4 | 3898326.8 | 7641706.7 | 12574701.4 |
| corn | forward_canonical | 6481983.1 | 1361216163.0 | 1911548601.7 | 40.4 | 28026308.3 | 61691025.8 | 103914514.2 |
| forestry | legacy_carried | 0.0 | 599802082.0 | 599802082.0 | 0.0 | 599802082.0 | 599802082.0 | 599802082.0 |
| poultry | legacy_carried | 205686533.0 | 308529800.0 | 308529800.0 | 0.0 | 308529800.0 | 308529800.0 | 308529800.0 |
| rpo_pruning | legacy_carried | 0.0 | 31204438.0 | 31204438.0 | 0.0 | 31204438.0 | 31204438.0 | 31204438.0 |
| rsu_organic | legacy_carried | 0.0 | 1556169771.0 | 1556169771.0 | 0.0 | 1556169771.0 | 1556169771.0 | 1556169771.0 |
| soybean | forward_canonical | 6115419.8 | 1223083878.0 | 2791967112.3 | 128.3 | 73158424.7 | 117262618.7 | 176093708.8 |
| sugarcane | forward_canonical | 247212219.3 | 12382565911.0 | 27400777648.7 | 121.3 | 1306837407.1 | 2683358155.0 | 6819966704.5 |
| swine | legacy_carried | 1587613.0 | 603292940.0 | 603292940.0 | 0.0 | 603292940.0 | 603292940.0 | 603292940.0 |

Nota factual: neste CSV, `canonical_practical_min = medio = max = theoretical` para todos
os 6 streams `legacy_carried`, e `total_tons_yr` de `poultry` é `205686533.0` — o valor
que `backend/app/migrations/025_biomass_provenance.sql:73-80` identifica como
**contagem de cabeças**, não toneladas.

**[RE-EXECUÇÃO 2026-07-25]** teórico estadual consolidado, derivado do próprio motor
sobre o mesmo CSV de entrada:

| Cenário | CH₄ teórico (M m³/dia) | CH₄ teórico (m³/ano) | CH₄ prático (M m³/dia) | Retenção |
|---|---:|---:|---:|---:|
| min | 15,3788 | 5.613.272.995,3 | 0,7537 | 4,90 % |
| medio | 33,9946 | 12.408.018.637,4 | 3,6488 | 10,73 % |
| max | 65,2731 | 23.824.680.781,8 | 14,7363 | 22,58 % |

### B.3 Potencial prático de CH₄ e de biometano, por cenário

Ver tabela 0.2. Resumo das fontes concorrentes:

| Fonte | CH₄ min/medio/max | Biogás min/medio/max | Biometano min/medio/max | Local | Data |
|---|---|---|---|---|---|
| Suplemento FOSS4G | 0.74 / 3.57 / 14.45 | 1.32 / 6.39 / 25.78 | 0.71 / 3.46 / 14.02 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:104-108` | 2026-06-06 |
| Status SP (pt-BR) | 0,74 / 3,57 / 14,45 | 1,32 / 6,39 / 25,78 | 0,71 / 3,46 / 14,02 | `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:22-26` | 2026-06-06 |
| Relatório FIESP | 0,75 / 3,65 / 14,74 | 1,35 / 6,53 / 26,30 | 0,73 / 3,54 / 14,29 | `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:13-16` | 2026-06-12 |
| **[RE-EXECUÇÃO]** código atual | 0,7537 / 3,6488 / 14,7363 | 1,3507 / 6,5326 / 26,2993 | 0,7311 / 3,5393 / 14,2942 | `backend/scripts/compute_sp_canonical_totals.py` | 2026-07-18 |

**DIVERGÊNCIA (D2).** Registradas ambas, sem escolha.

Fórmula do biometano (única no repositório):
`biometh = {sc: ch4[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}` — `backend/scripts/compute_sp_canonical_totals.py:159`, com `UPGRADING_EFFICIENCY = 0.97` em `:54`.

Quebra por stream (CH₄ medio, M m³/dia) — **[RE-EXECUÇÃO 2026-07-25]** vs. `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:120-134`:

| Stream | Re-execução 2026-07-25 | Suplemento (2026-06-06) |
|---|---:|---:|
| cana_bagaco | 1,9658 | 1.966 |
| cattle | 0,4031 | 0.403 |
| rsu_organic | **0,3597** | **0.310** |
| cana_torta | 0,2513 | 0.251 |
| poultry | 0,2342 | 0.234 |
| citrus | 0,1005 | 0.101 |
| corn | 0,0930 | 0.093 |
| soybean | 0,0832 | 0.083 |
| cana_palha | 0,0623 | 0.062 |
| cana_vinhaca | **0,0615** | **0.035** |
| coffee | **0,0170** | **0.014** |
| rpo | 0,0088 | 0.009 |
| swine | 0,0083 | 0.007 |

### B.4 `FRONTIER_ALPHA`

```python
    # ── Fronteira do Biogás (4º cenário) ────────────────────────────────────────
    # Mobilização realista-alta entre Médio Prazo e Otimista: ponto médio por
    # métrica (FRONTIER_ALPHA do caminho medio→max). Representa o relaxamento dos
    # fatores de competição/coleta sob política pública dedicada, mantendo o
    # envelope de incerteza biométrico. NÃO é o teto teórico (esse é o Otimista).
    FRONTIER_ALPHA = 0.5
    fro = tuple(
        m + FRONTIER_ALPHA * (x - m)
        for m, x in [(ch4[1], ch4[2]), (big[1], big[2]), (bm[1], bm[2])]
    )
```
— `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py:303-312`
(data do arquivo: 2026-07-18 13:48:33 -0300).

Definido **dentro da função de impressão** `_scenario_print()`, como variável local
— não é constante de módulo, não é importável, não é testável e não é exportado.
Nenhuma referência bibliográfica é citada para o valor 0.5; a justificativa no
comentário é qualitativa. Documentado também em `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:23-25`.

### B.5 Taxa de retenção (prático ÷ teórico)

- **É calculada, não hardcoded**: `prac = theo * fde` (`backend/app/services/biogas_forward.py:130`), com `fde = max(0.0, min(1.0, params.fde.get(sc)))` (`:129`).
- **Não existe em nenhum arquivo do repositório** como grandeza reportada (nem por feedstock, nem estadual). Nenhuma string `retention`/`retenção` referente a esta razão foi encontrada (as ocorrências de `retention_time` são tempo de retenção hidráulica, grandeza distinta — `frontend/src/types/scientific.ts:43`).
- Valores por cenário: ver B.2 (4,90 % / 10,73 % / 22,58 %) — **[RE-EXECUÇÃO 2026-07-25]**.
- Por feedstock, o equivalente publicado é o FDE medio, em `docs/data/FDE_TRACEABILITY_MATRIX.md` (coluna `FDE`) e em `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:154-198`.

### B.6 Concentração espacial

**NÃO ENCONTRADO.** Nenhum arquivo do repositório computa ou reporta "N municípios
concentram X% do potencial", curva de Lorenz, índice de Gini, coeficiente de
localização ou share cumulativo. Buscas por `concentr`, `Pareto`, `Gini`, `top 10`
e `top_municipalities` nos `.md`, `.py`, `.ts`, `.tsx` e `.sql` do repositório não
retornaram nenhum cálculo desse tipo.

O que existe: endpoints de ranking que retornam valores **absolutos** ordenados —
`backend/app/api/v1/endpoints/geospatial.py:843-891` e
`backend/app/api/v1/endpoints/intermediate_regions.py:109-145` — sem coluna de
participação percentual.

### B.7 Ranking das regiões intermediárias com participação percentual

**NÃO ENCONTRADO.** O endpoint `GET /intermediate-regions/rankings`
(`backend/app/api/v1/endpoints/intermediate_regions.py:109`) ordena por
`total_biogas_m3_year` (ou 4 outras métricas permitidas, `:115-121`) e devolve
`rank`, `ibge_code`, `name`, `state_code`, `value`, `centroid_lat`, `centroid_lng`
(`:133-143`) — **sem percentual**. Nenhum CSV ou MD versionado contém o ranking
materializado.

Fatos correlatos sobre regiões intermediárias:
- **133** regiões intermediárias IBGE (Brasil), Divisão Regional 2017 — `backend/migrations/007_intermediate_regions.sql:2-3`; `backend/app/api/v1/endpoints/intermediate_regions.py:3`; `docs/data/METADATA.json` (`spatial_units.intermediate_regions_rgint.count: 133`).
- **11** regiões intermediárias de São Paulo, renderizadas como contorno tracejado — `frontend/src/components/map/IntermediateRegionBoundaryLayer.tsx:5`.

### B.8 Número total de categorias de substrato parametrizadas

| Valor | Local | Data |
|---|---|---|
| **26** (autoritativo: contagem das chaves de `feedstocks:`) | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` | 2026-07-21 14:14:13 -0300 |
| 26 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:87,150,290` | 2026-06-06 |
| 26 | mensagens de commit `#90`, `audit(fde): … all 26 FDE blocks` | 2026-06-05 |
| 31 | `README.md:87,304`; `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:31,99`; `backend/scripts/compute_sp_canonical_totals.py:325` (string do benchmark: "Fronteira (31 resíduos)") | 2026-07-03 / 2026-06-12 / 2026-07-18 |
| 38 | `cp2b-workspace/NewLook/scripts/calculate_fde_all_residues.py:3` ("all 38 residues from Panorama_CP2B") | 2026-06-05 |
| ~38 | `docs/data/SCIENTIFIC_AUDIT_REPORT.md:5` | — |
| 50+ | `README.md:86`; `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md:57` | — |

Lista completa dos 26 códigos: `BAGACO`, `PALHA`, `VINHACA`, `TORTA_FILTRO`,
`BAGACO_CITROS`, `CASCAS_CITROS`, `CASCA_CAFE`, `POLPA_CAFE`, `MUCILAGEM_CAFE`,
`CASCA_SOJA`, `PALHA_SOJA`, `PALHA_MILHO`, `CASCA_MILHO`, `CAMA_AVIARIO`,
`DEJETOS_AVES`, `ESTERCO_BOVINO`, `DEJETOS_BOVINO`, `DEJETOS_SUINO`,
`ESTERCO_SUINO`, `FORSU`, `ORGANICO_RSU`, `LODO_PRIMARIO`, `LODO_SECUNDARIO`,
`PODA_URBANA`, `GORDURA`, `SANGUE`.

Destes, apenas **13** estão mapeados a streams municipais ativos via
`STREAM_TO_CANONICAL` (`backend/app/services/canonical_loader.py:54-67`);
`LODO_PRIMARIO` e `LODO_SECUNDARIO` são explicitamente declarados não mapeados
(`docs/data/FOSS4G_PAPER_SUPPLEMENT.md:264-266`).

### B.9 Fórmula exata de correção implementada em código

**(a) Motor forward canônico — `backend/app/services/biogas_forward.py:95-139`**

```python
def theoretical_ch4_m3(
    biomass_tons_wet: float, bmp: float, ts_pct: float, vs_of_ts_pct: float
) -> float:
    """m3 CH4 = biomass_wet_tons × (TS/100) × (VS_of_TS/100) × BMP. Never negative."""
    if biomass_tons_wet <= 0 or bmp <= 0 or ts_pct <= 0 or vs_of_ts_pct <= 0:
        return 0.0
    return biomass_tons_wet * (ts_pct / 100.0) * (vs_of_ts_pct / 100.0) * bmp


def biogas_from_ch4(ch4_m3: float, ch4_pct: float) -> float:
    """Convert methane volume to total biogas volume via methane content."""
    if ch4_m3 <= 0 or ch4_pct <= 0:
        return 0.0
    return ch4_m3 / (ch4_pct / 100.0)
```

```python
    for sc in SCENARIOS:
        theo = theoretical_ch4_m3(
            biomass_tons_wet,
            params.bmp.get(sc),
            params.ts.get(sc),
            params.vs_of_ts.get(sc),
        )
        fde = max(0.0, min(1.0, params.fde.get(sc)))
        prac = theo * fde
        ch4_theo[sc] = _round(theo)
        ch4_prac[sc] = _round(prac)
        biogas_prac[sc] = _round(biogas_from_ch4(prac, params.ch4_pct))
```

**(b) Composição FC/FCo/FS/FL — `backend/app/services/canonical_loader.py:102-141`**

```python
def _resolve_fde(entry: dict) -> Range:
    """Effective FDE = availability (FC×FCo×FS×FL) × eta (conversion efficiency).

    Supports three YAML shapes for backward/forward compatibility:
      1. structured:  fde: {availability: {min,medio,max}, eta: <scalar|range>, ...}
      2. flat:        fde: {min, medio, max}   (already the product)
      3. absent:      → 1.0 (theoretical potential)
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    if "availability" in block:
        avail = _range_from(block["availability"])
        eta = _eta_range(block.get("eta"))
        return Range(
            avail.min * eta.min,
            avail.medio * eta.medio,
            avail.max * eta.max,
        )
    if {"min", "medio", "max"} <= set(block):
        return _range_from(block)
    return Range(1.0, 1.0, 1.0)


def _resolve_availability(entry: dict) -> Range:
    """Physical availability = FC×FCo×FS×FL (without eta conversion efficiency).
    ...
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    if "availability" in block:
        return _range_from(block["availability"])
    if {"min", "medio", "max"} <= set(block):
        # flat FDE already includes η — can't separate; use as-is
        return _range_from(block)
    return Range(1.0, 1.0, 1.0)
```

**Fato crítico:** o produto `FC × FCo × FS × FL` **não é calculado em nenhum lugar do
backend**. O YAML armazena apenas o produto já resolvido, como escalar por cenário:

```yaml
      availability: { min: 0.0803, medio: 0.1693, max: 0.3467 }
```
— `data/canonical_parameters/feedstocks.yaml:125` (BAGACO). Os fatores individuais
existem apenas como *comentários e refs em prosa* dentro do mesmo bloco (`:194-200`
para PALHA: `"FC=0.85: mechanical baling recovers 80–90% of straw"`, `"FCo=0.10: 50–70%
retained for soil → ~10% surplus"`, `"FS=0.90: harvest season Apr–Nov"`, `"FL=0.85:
baling/transport logistics, mills <10 km"`). A decomposição materializada por fator
está em `docs/data/FDE_TRACEABILITY_MATRIX.md` (auto-gerado por
`backend/scripts/validate_fde_traceability.py --emit`), ex. linha 14:
`| **BAGACO** | HIGH | 0.95 (epe_ben2024) | 0.22 (epe_ben2024) | 0.90 (epe_ben2024) | 0.90 (epe_ben2024) | 0.7 | 0.1693 | 0.1185 |`
(0.95 × 0.22 × 0.90 × 0.90 = 0.16939 → × 0.7 = 0.11857).

**(c) Frontend — variante 1 — `frontend/src/types/analysis.ts:44-46`**

```typescript
// Calculate FDE from correction factors
export function calculateFDE(factors: CorrectionFactors): number {
  return factors.fc * (1 - factors.fcp) * factors.fs * factors.fl
}
```
(data do arquivo: 2026-06-12 07:40:53 -0300)

**(d) Frontend — variante 2 — `frontend/src/services/residuosApi.ts:443-454`**

```typescript
/**
 * Calculate FDE (Fator de Disponibilidade Efetiva) from availability factors
 */
export function calculateFDE(residuo: Residuo): number | null {
  const { fc_medio, fcp_medio, fs_medio, fl_medio } = residuo

  if (fc_medio === null || fcp_medio === null || fs_medio === null || fl_medio === null) {
    return null
  }

  return fc_medio * fcp_medio * fs_medio * fl_medio * 100
}
```
(data do arquivo: 2026-06-05 08:01:32 -0300)

**(e) Exibição na UI — `frontend/src/components/analysis/PerResidueFactorEditor.tsx:290`**

```
FDE = {(activeFactors.fc * 100).toFixed(0)}% × {((1 - activeFactors.fcp) * 100).toFixed(0)}% × {(activeFactors.fs * 100).toFixed(0)}% × {(activeFactors.fl * 100).toFixed(0)}% = {activeFDE.toFixed(2)}%
```

**(f) Documentação de metodologia — `docs/data/FDE_METHODOLOGY.md:35-38`**

```
FDE = (1 - Competing_Uses) × Collection_Factor × η_conversion
...
1. Competing_Uses = Σ(alternative_utilization_i) [0-1]
```
(sem FS e sem FL)

**(g) Script legacy — `scripts/calculate_fde_all_residues.py:5-9`**

```
FDE = Availability × Efficiency

Where:
- Availability = fator_realista (from Panorama database)
- Efficiency = digestor_efficiency × substrate_degradability
```
Este script lê `sqlite3` de `/home/user/Panorama_CP2B/data/cp2b_panorama.db`
(`:28`) — caminho absoluto **fora do repositório**; o banco não está versionado.

**Registro de DIVERGÊNCIA (D1):** (b) trata `FCo` como fração **disponível**
(multiplicada direto); (c) e (e) tratam `fcp` como fração **perdida** (`1 - fcp`);
(d) multiplica `fcp_medio` direto; (f) usa três fatores. Nenhuma decisão é tomada
aqui. Observação factual de contexto: a coluna do banco é comentada como
`fcp_min REAL, -- Competition factor` (`backend/app/migrations/003_residuos_schema.sql:92`).

### B.10 Ano de referência de cada fonte usada no cálculo

De `cp2b-workspace/NewLook/docs/data/METADATA.json` (`_generated: 2026-06-16`) e das anotações no código:

| Fonte | Ano de referência declarado | Local | Observação no próprio arquivo |
|---|---|---|---|
| IBGE PAM (SIDRA 5457) — cana, citros, milho, soja, café | **"2023 (VERIFY — filename 01_master_residue_streams_SP_2023)"** | `docs/data/METADATA.json` `sources[ibge_pam]` | marcado `VERIFY`; `retrieved: "VERIFY"` |
| IBGE PAM tabelas 1612/1613 (ingest nacional) | 2023 | `docs/HANDOFF_2026-07-21.md` ("PAM 2023 residue (Mt)"), `backend/ingest/sources/pam_1612/`, `pam_1613/` | — |
| IBGE Censo Demográfico 2022 (população) | **2022** (SP 44.411.238) | `docs/data/METADATA.json` `sources[ibge_census_2022]`; `backend/scripts/compute_sp_canonical_totals.py:61-63` | `retrieved: "VERIFY"` |
| IBGE Censo Agropecuário 2017 (rebanhos) | **2017** | `docs/data/METADATA.json` `sources[ibge_censo_agro_2017]` | `retrieved: "VERIFY"`; **contradito** por PPM 2024 (ver D10) |
| IBGE PPM (rebanhos, ingest) | 2024 (produção); 2008–2024 (local) | `docs/HANDOFF_2026-07-21.md`; `backend/ingest/sources/ibge_ppm/` | — |
| MapBiomas | **2024**, `collection: "8.0 (code) — VERIFY vs Collection 9"` | `docs/data/METADATA.json` `sources[mapbiomas]` | DOI: `10.58053/MapBiomas/JNJGVT` com nota "confirm DOI for the collection actually used" |
| SNIS | **2022** | `docs/data/METADATA.json` `sources[snis_2022]` | "~88% municipal coverage for SP; gap-filled via per-capita factors"; `retrieved: "VERIFY"` |
| CONAB (série histórica) | **2008–2024** | `docs/data/METADATA.json` `sources[conab]` | `retrieved: "VERIFY"` |
| UNICA / CONSECANA-SP | **2022** | `docs/data/METADATA.json` `sources[unica_consecana]` | `retrieved: "VERIFY"` |
| FUNDECITRUS | **2022** | `docs/data/METADATA.json` `sources[fundecitrus_2022]` | `retrieved: "VERIFY"` |
| EMBRAPA (fatores de geração) | **"VERIFY"** — ano não declarado | `docs/data/METADATA.json` `sources[embrapa]` | `reference_year: "VERIFY"` |
| EPE BEN 2024 | **2024** | `docs/data/METADATA.json` `sources[epe_ben_2024]` | `retrieved: "VERIFY"` |
| ANP Biometano | **2020–2026 (mensal)** | `docs/data/METADATA.json` `sources[anp_biometano]` | `retrieved: "2026-06"`; "Assembled; not yet ingested into validation_plants (P0)" |
| ANEEL SIGA | **"2025 (VERIFY on snapshot)"** | `docs/data/METADATA.json` `sources[aneel_siga]` | "The 19.69 vs 6.39 discrepancy is a units-audit item" |
| ANEEL GD (biogás) | **2026 (ref 06/2026)** | `docs/data/METADATA.json` `sources[aneel_gd]` | "546 units, 152 MW" |
| FIESP / Instituto 17 / PSR / Amplun | **2025** (Jun/2025) | `docs/data/METADATA.json` `sources[fiesp_2025]` | `retrieved: "2026-06"` |
| ABRELPE Panorama | 2022 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:212` | não consta em METADATA.json |
| CETESB | 2020 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:213` | não consta em METADATA.json |
| ABIOGÁS Atlas do Biogás | 2021 | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:214` | não consta em METADATA.json |
| SICAR | **NÃO ENCONTRADO** como fonte ingerida — única menção é listagem de paisagem de dados abertos em `docs/data/OPEN_DATA_API_LANDSCAPE.md` | — | — |

**8 de 16** fontes em `METADATA.json` têm `retrieved: "VERIFY"` (placeholder), e o
próprio arquivo declara: `"Retrieval dates ('retrieved') are placeholders pending
confirmation from the data owner."` (`_status_notes`).

---

## BLOCO C — STACK E VERSÕES

### C.1 Frontend

| Item | Declarado (`package.json`) | Travado (`package-lock.json`, lockfileVersion 3) | Local |
|---|---|---|---|
| Framework | `"next": "^16.2.6"` | **16.2.6** | `frontend/package.json:57` |
| React | `"react": "^19.2.6"`, `"react-dom": "^19.2.6"` | **19.2.6** | `frontend/package.json:60,62` |
| **Biblioteca de mapas** | `"react-leaflet": "^4.2.1"` sobre `"leaflet": "^1.9.4"` | **react-leaflet 4.2.1 / leaflet 1.9.4** | `frontend/package.json:64,55` |
| Tipos Leaflet | `"@types/leaflet": "^1.9.12"` | 1.9.21 | `frontend/package.json:41` |
| Heatmap | `"leaflet.heat": "^0.2.0"` | 0.2.0 | `frontend/package.json:56` |
| TypeScript | `"typescript": "^5.7.3"` | **5.9.3** | `frontend/package.json:106` |
| Tailwind | `"tailwindcss": "^3.4.17"` | — | `frontend/package.json:70` |
| i18n | `"next-intl": "^4.12.0"` | — | `frontend/package.json:58` |
| Charts | `"recharts": "^3.8.1"`, `"chart.js": "^4.5.1"`, `"react-chartjs-2": "^5.3.1"` | — | `frontend/package.json:69,47,61` |
| Estado | `"@tanstack/react-query": "^5.100.11"` | — | `frontend/package.json:39` |
| Fluxos | `"reactflow": "^11.10.4"` | — | `frontend/package.json:65` |
| Testes | `"jest": "^30.4.2"`, `"@playwright/test": "^1.60.0"`, `"playwright": "^1.57.0"`, `"jest-axe": "^10.0.0"` | — | `frontend/package.json:96,74,102,97` |
| Lint/format | `"eslint": "^9.0.0"`, `"prettier": "^3.8.3"`, `"husky": "^9.1.6"`, `"lint-staged": "^17.0.5"` | — | `frontend/package.json:88,103,95,101` |
| Licença declarada | `"license": "GPL-3.0"` | idem em `package-lock.json:10` | `frontend/package.json:5` |
| Versão do pacote | `"version": "3.0.0"` | — | `frontend/package.json:3` |
| Campo `engines` | **AUSENTE** — nenhuma versão de Node exigida no `package.json` | — | — |

`overrides` de segurança: `picomatch 4.0.4`, `glob 10.5.0`, `flatted 3.4.2`, `lodash 4.17.21` (`frontend/package.json:72-77`).

### C.2 Backend

| Item | Valor | Local |
|---|---|---|
| Framework | `fastapi==0.136.1` (comentário: "Updated from 0.115.7 — pulls starlette>=0.49.1 (fixes CVE-2025-54121, CVE-2025-62727)") | `backend/requirements.txt:3` |
| ASGI | `uvicorn[standard]==0.47.0` | `backend/requirements.txt:4` |
| Rate limiting | `slowapi==0.1.9` | `backend/requirements.txt:5` |
| ORM | `sqlalchemy==2.0.49`, `alembic==1.18.4` | `backend/requirements.txt:8,10` |
| Driver PG | `psycopg2-binary==2.9.12` | `backend/requirements.txt:9` |
| Auth | `passlib[bcrypt]==1.7.4`, `bcrypt==4.0.1`, `PyJWT==2.13.0`, `python-multipart==0.0.32` | `backend/requirements.txt:16,19,20,21` |
| Config | `python-dotenv==1.2.2`, `pydantic>=2.13.4`, `pydantic-settings==2.14.2`, `email-validator==2.3.0` | `backend/requirements.txt:24-29` |
| Geoespacial | `geoalchemy2==0.20.0`, `shapely==2.1.2`, `geojson==3.2.0`, `geopandas>=1.1.3`, `fiona>=1.9.6`, `pyproj==3.7.1`, `rasterio==1.4.4` | `backend/requirements.txt:32-38` |
| Dados | `pandas==2.3.3`, `numpy==1.24.3`, `scipy==1.15.3`, `scikit-learn>=1.7.2`, `openpyxl==3.1.5`, `xlrd>=2.0.2`, `PyYAML>=6.0.1` | `backend/requirements.txt:42-49` |
| HTTP | `httpx==0.28.1`, `requests==2.34.2` | `backend/requirements.txt:52-53` |
| Testes | `pytest==9.0.3`, `pytest-asyncio==1.3.0`, `pytest-cov==7.1.0`, `pytest-mock==3.15.1` | `backend/requirements.txt:57-60` |
| Formatação | `black>=26.5.1`, `isort==8.0.1` | `backend/requirements.txt:62-63` |
| **Python exigido** | `requires-python = ">=3.10"`; classifiers 3.10 e 3.11 | `backend/pyproject.toml:15,22-23` |
| Python (runtime de deploy) | `python-3.10` | `backend/runtime.txt:1` |
| Python (CI) | `python-version: '3.10'` | `.github/workflows/ci.yml:124,166,190` |
| Versão do pacote | `version = "3.0.0"` | `backend/pyproject.toml:7` |
| Licença (classifier) | `"License :: OSI Approved :: GNU General Public License v3 (GPLv3)"` | `backend/pyproject.toml:17` |
| Status de dev | `"Development Status :: 4 - Beta"` | `backend/pyproject.toml:13` |
| Contato declarado | `{name = "CP2B Team", email = "contact@detecta.org"}` | `backend/pyproject.toml:6` |

### C.3 Banco de dados

| Item | Valor | Local |
|---|---|---|
| **PostgreSQL + PostGIS (dev/local)** | `image: postgis/postgis:15-3.4` → **PostgreSQL 15 + PostGIS 3.4** | `docker-compose.yml:11` |
| **PostgreSQL + PostGIS (CI)** | `image: postgis/postgis:15-3.4` | `.github/workflows/ci.yml:148` |
| Requisito documentado | "PostgreSQL 15+ with PostGIS" | `README.md:179`; `CONTRIBUTING.md:26` |
| Instalação documentada | `postgresql-15 postgresql-15-postgis-3` | `README.md:246` |
| Hosting declarado | "PostgreSQL 15 + PostGIS 3.4 (Supabase)" | `README.md:131` |
| Extensão | `CREATE EXTENSION postgis;` | `README.md:248` |

### C.4 Node

| Contexto | Versão | Local |
|---|---|---|
| CI ativo (raiz do monorepo) | **22** | `.github/workflows/ci.yml:22,46,66,85` |
| CI aninhado (`NewLook/.github/workflows/ci.yml`) | **18** | linhas 25, 65, 93, 119 |
| README / CONTRIBUTING | **18+** | `README.md:177`; `CONTRIBUTING.md:23` |
| `package.json` `engines` | ausente | — |

### C.5 Confirmação/divergência das afirmações submetidas

| Afirmação | Veredito | Evidência |
|---|---|---|
| "React Leaflet 4.2.1 sobre Leaflet 1.9.4" | **CONFIRMA** | `frontend/package.json:64` (`"react-leaflet": "^4.2.1"`), `:55` (`"leaflet": "^1.9.4"`); versões travadas em `package-lock.json`: react-leaflet **4.2.1**, leaflet **1.9.4** |
| "Mapbox GL JS" | **DIVERGE** | Nenhuma ocorrência da string `mapbox` (case-insensitive) em nenhum arquivo do repositório fora de `node_modules` — busca em `.json`, `.ts`, `.tsx`, `.md`, `.js` retornou zero resultados. Não há dependência `mapbox-gl`, `react-map-gl` ou token de Mapbox. A biblioteca de mapas é Leaflet via React-Leaflet. |
| "Next.js" | **CONFIRMA** | `frontend/package.json:57` (`"next": "^16.2.6"`, travado em **16.2.6**); `frontend/next.config.js`; `README.md:119` |
| "FastAPI" | **CONFIRMA** (versão diverge do README) | `backend/requirements.txt:3` → `fastapi==0.136.1`. `README.md:130` e `README.md:394` afirmam **0.135.3** → **DIVERGE em versão** (D12) |
| "PostgreSQL 15 + PostGIS 3.4" | **CONFIRMA** | `docker-compose.yml:11` e `.github/workflows/ci.yml:148`: `postgis/postgis:15-3.4`; `README.md:131` |

---

## BLOCO D — DADOS E PIPELINE

### D.1 Fontes efetivamente ingeridas

**Via framework de ingestão (`backend/ingest/sources/`), com contrato e bateria de 8 gates:**

| `source_id` | Arquivo | Escopo |
|---|---|---|
| `aneel_siga` | `backend/ingest/sources/aneel_siga/source.py` | Empreendimentos de geração ANEEL (template do contrato — `backend/ingest/README.md:4`) |
| `ibge_ppm` | `backend/ingest/sources/ibge_ppm/source.py` | Pesquisa da Pecuária Municipal |
| `pam` (comum) | `backend/ingest/sources/pam/_common.py`, `_sidra.py` | acesso SIDRA |
| `pam_1612` | `backend/ingest/sources/pam_1612/source.py` | PAM lavouras temporárias |
| `pam_1613` | `backend/ingest/sources/pam_1613/source.py` | PAM lavouras permanentes |
| `snis` | `backend/ingest/sources/snis/source.py` | Saneamento / RSU |

**Via scripts de promoção (`backend/scripts/`):** `promote_pam.py`,
`promote_ibge_ppm.py`, `promote_snis.py`, `promote_ibge_demographics.py`,
`load_national_intermediate_data.py`, `load_infrastructure_layers.py`,
`load_biomass_tons.py`, `load_biomass_from_master.py`,
`seed_national_municipalities.py`.

**Via datasets versionados em `analysis/data/` (montados, ainda não ingeridos):**
`05_biogas_plants_brazil.csv/.xlsx`, `05b_biogas_aggregates_by_state.csv`,
`05c_anp_biometano_plants_latest.csv`, `05d_anp_biometano_production_state_monthly.csv`,
`05e_anp_biometano_plant_volume_monthly.csv`, `05f_anp_fleet_stats.csv`,
`05g_aneel_biogas_gd_plants.csv`, `05h_aneel_biogas_gd_summary.csv`.
`docs/data/METADATA.json` (`sources[anp_biometano]`) registra: *"Assembled; not yet
ingested into validation_plants (P0)."*

**Versões / coleções / anos:** ver tabela completa em **B.10**.

**SICAR:** **NÃO ENCONTRADO** como fonte ingerida (única menção: inventário de
dados abertos em `docs/data/OPEN_DATA_API_LANDSCAPE.md`).

### D.2 Etapas do pipeline de ETL, em ordem

**(a) Contrato de ingestão — 4 passos** (`backend/ingest/README.md:6-11`):

```
fetch    → immutable raw snapshot at data/raw/<source_id>/<year>/
load     → typed pandas DataFrame keyed on ibge_code / cod_rgint / uf
validate → standard 8-gate battery + source-specific gates
promote  → staging.* → public.* in ONE transaction (blocked until migration 021)
```

Orquestrador: `backend/ingest/runner.py` (`python -m ingest.runner run <source> --year <ano>`, `backend/ingest/README.md:16-20`).
Relatório: `docs/data/ingest_reports/<source>_<year>.md`; exit code ≠ 0 bloqueia promoção (`backend/ingest/README.md:23-24`).

**(b) Bateria de 8 gates** — `backend/ingest/gates.py`:

| # | Gate | Função | Linha |
|---|---|---|---|
| 1 | schema | `schema_gate` | `gates.py:51` |
| 2 | coverage | `coverage_gate` | `gates.py:85` |
| 3 | range | `range_gate` | `gates.py:114` |
| 4 | aggregation | `aggregation_gate` | `gates.py:134` |
| 5 | cross-source | `cross_source_gate` | `gates.py:181` |
| 6 | idempotency | `idempotency_gate` (+ `frame_checksum:195`) | `gates.py:203` |
| 7 | lineage | `lineage_gate` | `gates.py:218` |
| 8 | regression | `regression_gate` | `gates.py:245` |
| — | orquestração | `run_standard_battery`, `all_passed` | `gates.py:277,292` |

**(c) Carga nacional, em ordem** — `docs/NATIONAL_DATA_LOAD.md:74-81`, orquestrado por `backend/scripts/load_national.sh`:

| Passo | Script / ação | Produz |
|---|---|---|
| 1. Migrações | `backend/app/migrations/*.sql` | schema incl. spine (021), geometry LOD (022), infra (023), timeseries (024), provenance (025) |
| 2. Spine | `seed_national_municipalities.py` | 5.571 municípios + geometria da malha 2025 |
| 3. Pecuária | `promote_ibge_ppm.py` | linhas de rebanho/produto/aquicultura em `municipality_timeseries` |
| 4. Resíduo urbano | `promote_snis.py` | linhas medidas de resíduo/esgoto/população (blanks descartados, não zerados) |
| 5. Regiões intermediárias | `load_national_intermediate_data.py` | 133 linhas de região intermediária IBGE |
| 6. Infra (opcional) | `load_infrastructure_layers.py` | pontos de planta/subestação/duto via junção espacial |

`docs/NATIONAL_DATA_LOAD.md:83-85`: *"Biogas potential is **not** a load step — the API
(`app/services/map_metrics.py`) derives it from the promoted tonnage at read time."*

**(d) Pipeline canônico de parâmetros (paralelo ao ETL):**
`feedstocks.yaml` → `scripts/generate_from_canonical.py` → SQL/serviço Python/TS
(`feedstocks.yaml:6-7`, `:16-20`); validação por
`backend/scripts/validate_fde_traceability.py`; sincronização de banco por
`backend/scripts/sync_db_canonical.py` e `backend/app/migrations/016_canonical_sync.sql`.

### D.3 Esquema das tabelas principais

**`residuos` — tabela de fatores de correção de disponibilidade de resíduos**
(`backend/app/migrations/003_residuos_schema.sql:56`). Colunas de fatores, verbatim:

```sql
    fc_min REAL,                   -- Collection factor
    fc_medio REAL,
    fc_max REAL,
    fcp_min REAL,                  -- Competition factor
    fcp_medio REAL,
    fcp_max REAL,
    fs_min REAL,                   -- Seasonal factor
    fs_medio REAL,
    fs_max REAL,
    fl_min REAL,                   -- Logistic factor
    fl_medio REAL,
    fl_max REAL,
```
(`003_residuos_schema.sql:89-101`), mais:
```sql
    fator_pessimista REAL,
    fator_realista REAL,
    fator_otimista REAL,
```
(`:103-105`). Também contém `bmp_medio`, `ts_medio`, `vs_medio`,
`chemical_cn_ratio`, `chemical_ch4_content`, `generation`, `destination`,
`justification` (colunas lidas em `scripts/calculate_fde_all_residues.py:272-281`).

**Observação factual:** a tabela armazena os 4 fatores **separadamente e por
cenário** (min/medio/max), enquanto `feedstocks.yaml` armazena apenas o **produto
já resolvido** (`availability`). Não existe no repositório uma função que reconcilie
as duas representações.

Migrações relacionadas ao FDE: `backend/migrations/002_add_fde_validation.sql`,
`backend/migrations/002_add_fde_validation_all_residues.sql`,
`docs/sql/sql_sync_factors_to_database.sql`.

**Outras tabelas em `003_residuos_schema.sql`:** `sectors` (`:11`), `subsectors`
(`:36`), `residuo_references` (`:128`, com índices em `residuo_id`,
`parameter_type`, `year` — `:158-160`), `conversion_factors` (`:167`).

**`municipality_biomass_provenance`** — `backend/app/migrations/025_biomass_provenance.sql:45-56`:

```sql
CREATE TABLE IF NOT EXISTS municipality_biomass_provenance (
    ibge_code      VARCHAR(7)  NOT NULL,
    stream         VARCHAR(32) NOT NULL,
    source_id      VARCHAR(40) NOT NULL,
    reference_year SMALLINT    NOT NULL,
    quality        VARCHAR(12) NOT NULL DEFAULT 'measured'
        CHECK (quality IN ('measured', 'interpolated', 'proxy', 'estimated')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ibge_code, stream)
);
```
Índice: `idx_mbp_stream ON municipality_biomass_provenance (stream) INCLUDE (ibge_code, quality)` (`:69-70`).

**`validation_plants`** — `backend/migrations/010_create_validation_plants.sql:17-113`
(seleção de colunas): `plant_id SERIAL PRIMARY KEY`, `plant_name VARCHAR(255) NOT NULL`,
`municipality_name VARCHAR(255)`, `state VARCHAR(2) DEFAULT 'SP'`,
`plant_type VARCHAR(50) NOT NULL CHECK(...)`, `operational_status VARCHAR(20) DEFAULT 'operational'`,
`start_date DATE`, `feedstock_mix JSONB NOT NULL`, `primary_feedstock VARCHAR(100) NOT NULL`,
`gee_land_use_distribution JSONB`, `gee_analysis_date DATE`,
`gee_mapbiomas_collection VARCHAR(20)`, `data_source VARCHAR(255) NOT NULL`,
`data_source_url TEXT`, `data_quality VARCHAR(20) DEFAULT 'medium' CHECK(...)`,
`verification_status VARCHAR(20) DEFAULT 'pending' CHECK(...)`, `notes TEXT`,
`validation_notes TEXT`, `created_at`/`updated_at TIMESTAMP DEFAULT NOW()`, `created_by VARCHAR(100)`.
View: `validation_plants_detailed` (`:203-212`).
Campos de comparação `theoretical_potential_nm3`, `predicted_available_nm3`,
`prediction_error_pct`, `utilization_rate_pct` — presentes no schema, "NULL in all rows"
segundo `docs/data/SCIENTIFIC_AUDIT_REPORT.md:595`.

**Outras tabelas/migrações relevantes** (`backend/app/migrations/`):
`001_initial_schema.sql`, `004_import_panorama_data.sql`, `005_cn_ratio_ranges.sql`,
`006_biomass_tons.sql`, `012_ibge_municipality_indicators.sql`, `013_add_missing_columns.sql`,
`014_add_kinetics_column.sql`, `015_correct_bmp_parameters.sql`, `016_canonical_sync.sql`,
`017_create_calculator_leads.sql`, `018_calculator_leads_consent_dsr.sql`,
`019_calculator_leads_drop_cpf.sql`, `020_create_auth_users.sql`,
`021_national_spine_staging.sql`, `022_municipality_geometry_lod.sql`,
`023_infrastructure_features.sql`, `024_municipality_timeseries.sql`,
`025_biomass_provenance.sql`.
E em `backend/migrations/`: `001_add_performance_indexes.sql`,
`001_create_residuos_tables.sql`, `002_geojson_functions.sql`,
`003_add_industrial_residues.sql`, `005_insert_sector_aggregation_mapping_SUPABASE.sql`,
`007_intermediate_regions.sql`, `010_technology_routes.sql`, `011_cleanup_references.sql`,
`012_cp2b_residue_streams.sql`, `013_cp2b_municipality_summary.sql`,
`br_intermediary_regions_distances.sql`.

**Numeração duplicada:** existem dois diretórios de migração
(`backend/app/migrations/` e `backend/migrations/`) com prefixos numéricos
colidentes (`001`, `002`, `003`, `010`, `012`, `013` aparecem em ambos, com
conteúdos diferentes). Não há arquivo que declare a ordem de aplicação combinada.

### D.4 Cobertura territorial efetiva

| Fato | Valor | Local |
|---|---|---|
| Municípios de SP no CSV de entrada, todos os 11 streams uniformemente | 645 (match exato contra o conjunto UF-35 do banco: "645 vs 645, zero difference in either direction") | `backend/app/migrations/025_biomass_provenance.sql:29-33` |
| Municípios no spine nacional | 5.571 (geometria + LOD) | `docs/HANDOFF_2026-07-21.md`; `docs/NATIONAL_DATA_LOAD.md:76` |
| `sugarcane_biomass_tons_year IS NULL` | **0** (verificado contra o banco live em 2026-07-17) | `backend/app/migrations/025_biomass_provenance.sql:11-14` |
| `= 0` | **5.059** | idem |
| `> 0` | **512** | idem |
| Municípios de SP que legitimamente não cultivam cana | **133 de 645** | `backend/app/migrations/025_biomass_provenance.sql:19` |
| Streams com provenance backfilled para SP | **5** (`sugarcane`, `soybean`, `corn`, `coffee`, `citrus`) | `backend/app/migrations/025_biomass_provenance.sql:91-93` |
| Streams explicitamente **não** backfilled | `cattle`, `swine`, `poultry`, `aquaculture`, `rsu`, `rpo` | `backend/app/migrations/025_biomass_provenance.sql:100-103` |
| Municípios com resíduo urbano medido (SNIS CO111) | **4.140** | `docs/HANDOFF_2026-07-21.md` |
| Municípios com urbano modelado a partir de população | **76 %** | `backend/app/migrations/025_biomass_provenance.sql:43` |
| População nacional carregada | **203.080.756** ("exact match, published Censo 2022") | `docs/HANDOFF_2026-07-21.md` |
| Biomassa agrícola nacional | **556,5 Mt** | `docs/HANDOFF_2026-07-21.md` |
| Linhas de proveniência de safra | **26.842** | `docs/HANDOFF_2026-07-21.md` |

**Onde a cobertura é verificada no código:**

1. **Gate 2 (coverage)** — `backend/ingest/gates.py:85` (`coverage_gate`): falha quando "per-UF row counts ≠ official IBGE municipality counts (minus documented allowlist)" (`backend/ingest/README.md`, tabela de gates).
2. **Tabela de proveniência** — presença = dado conhecido; ausência = `no_data`. `backend/app/migrations/025_biomass_provenance.sql:24-26`: *"Coverage therefore cannot be derived from the value. It has to be recorded. … Never infer coverage from a zero again."*
3. **Leitura em API** — `backend/app/api/v1/endpoints/municipalities.py:47` (query), `:320-334` e `:656` (`_table_exists` + `_load_biomass_provenance`), com log de erro explícito quando a tabela falta: *"municipality_biomass_provenance missing — biomass coverage cannot be determined, so every municipality is served as no_data"* (`:331-334`).
4. **Serviço de disponibilidade** — `backend/app/services/biomass_availability.py:134,259` (vocabulário de qualidade + `NO_DATA`).
5. **Semântica de exibição** — `docs/HANDOFF_2026-07-21.md`: *"A measured 0 and a null are different facts and must display differently — '0 t/ano' vs 'Sem dados'."*

**Bug de cobertura declarado como aberto:** `docs/HANDOFF_2026-07-21.md`, item 1 da
lista "Open, in priority order": *"`/geospatial/statistics/summary` reports São Paulo
under a 'Brasil' label. It sums legacy `*_biogas_m3_year`/`population` columns,
populated for 645 municipalities. `total_population` returns 46M, not 203M. Most
visible remaining bug."* Itens 3 (`dashboard/compare`, `dashboard/proximity`,
`municipality/[ibge_code]` ainda leem colunas legacy) também listados como abertos.

### D.5 Tratamento de dupla safra / safrinha

**SIM, existe — em dois lugares, ambos no milho:**

1. **RPR do milho — `data/canonical_parameters/feedstocks.yaml:731-733`:**
```
    # PAM "Milho (em grão)" is TOTAL production — 1ª + 2ª safra combined. The
    # safrinha, ~75% of Brazilian corn and grown over soybean stubble, is already
    # inside this figure and must not be added again from a separate source.
```
O RPR aplicado é `min: 1.00 / medio: 1.10 / max: 1.20`, basis `"t stover / t grain (cob excluded)"` (`feedstocks.yaml:735-742`).

2. **Fator sazonal FS do milho — `data/canonical_parameters/feedstocks.yaml:817`:**
```yaml
        fs:  { min: 0.72, medio: 0.80, max: 0.88 }   # corn harvest Feb–May + safrinha (CONAB 2023)
```
com a ref em `:823`: `value: "FS=0.80: corn harvest window incl. safrinha"`.

3. **Calendário de disponibilidade no frontend — `frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts:152`:**
```typescript
  corn:   [7, 8, 9],           // safrinha SP
```

4. **Soja/dupla safra a nível de uso da terra** — `docs/planning/ABIOVE_NATIONAL_EXPANSION_FEASIBILITY.md:80`: menciona "single/double crop" no contexto de transições MapBiomas (documento de planejamento, não implementação).

**O que NÃO existe:** nenhuma separação de 1ª e 2ª safra como streams distintos,
nenhum uso do split CONAB soja/milho-1ª/2ª (a fonte `conab` está registrada em
`docs/data/METADATA.json` com `role: "Crop split (soy/corn 1st-2nd/cana) by UF and year"`
e `retrieved: "VERIFY"`, mas nenhum script do repositório a lê para desdobrar safras).

---

## BLOCO E — LICENÇA E PROPRIEDADE INTELECTUAL

### E.1 Conteúdo do `LICENSE`

`/home/user/Pilar-2b/LICENSE` — **17 linhas**, data git `2026-06-05 08:01:32 -0300`:

```
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2025 PILAR-2b Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

**Licença declarada: GNU General Public License v3.0 (GPL-3.0).**

`cp2b-workspace/NewLook/LICENSE` — **17 linhas, byte-idênticas** ao da raiz
(mesma data git). Copyright: `Copyright (C) 2025 PILAR-2b Contributors`.

**Fato:** ambos os arquivos contêm apenas o *aviso* de licença (o parágrafo
padrão "how to apply"), **não o texto integral da GPL-3.0** (~674 linhas). O
próprio aviso instrui "You should have received a copy of the GNU General Public
License along with this program" — e essa cópia não está no repositório.

### E.2 Todas as menções a licença

| Local | Conteúdo |
|---|---|
| `LICENSE:1-2` | `GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007` |
| `cp2b-workspace/NewLook/LICENSE:1-2` | idem |
| `CITATION.cff:6` | `license: GPL-3.0` |
| `README.md:4` | badge `license-GPL--3.0` |
| `README.md:154` | `├── LICENSE · CITATION.cff        # GPL-3.0 · how to cite this work` |
| `README.md:517` | `**PILAR-2b** is open-source software released under the **GNU General Public License v3.0 (GPL-3.0)**.` |
| `README.md:519` | `… freely available for use, modification, and distribution under the terms of the GPL-3.0.` |
| `README.md:521` | `See [LICENSE](./LICENSE) for full details.` |
| `cp2b-workspace/NewLook/README.md:410` | mesma frase de `README.md:519` |
| `frontend/package.json:5` | `"license": "GPL-3.0"` |
| `frontend/package-lock.json:10` | `"license": "GPL-3.0"` (pacote raiz) |
| `backend/pyproject.toml:17` | `"License :: OSI Approved :: GNU General Public License v3 (GPLv3)"` |
| `frontend/src/app/[locale]/cite/page.tsx:119` | `Código-fonte: <strong>GNU GPL-3.0</strong>` |
| `frontend/src/app/[locale]/terms/page.tsx:45` | `'O código é distribuído sob licença GPL-3.0. A plataforma está registrada no INPI (BR512026003115-0). Os dados de origem pertencem às respectivas fontes (IBGE, MapBiomas, EMBRAPA, entre outras) e devem ser citados conforme suas licenças.'` |
| `frontend/src/app/[locale]/terms/page.tsx:98` | versão em inglês da mesma cláusula |
| `frontend/src/lib/featureFlags.ts:24` | `* shipping a citation/licence notice with the exports at the same time.` (comentário; ação não implementada) |
| Cabeçalhos de arquivos-fonte | **NÃO ENCONTRADO** — nenhum arquivo `.py`, `.ts` ou `.tsx` carrega cabeçalho de licença GPL |
| `frontend/package-lock.json` (dependências) | licenças de terceiros: `Apache-2.0`, `LGPL-3.0-or-later`, `MIT` etc. — licenças de dependências, não do projeto |

**CONCLUSÃO FACTUAL: não há divergência de licença.** Todas as declarações do
projeto apontam GPL-3.0, de forma consistente, em 12 locais distintos. **A tabela
de "pontos que precisariam ser alterados" não se aplica.**

### E.3 INPI, FAPESP, DOI, ORCID

**INPI — número único e consistente: `BR512026003115-0`**

| Local | Contexto |
|---|---|
| `CITATION.cff:54-56` | `identifiers: type: other, value: "BR512026003115-0", description: "INPI Brazil Software Registration — issued 12/05/2026, valid 50 years"` |
| `README.md:5` | badge `INPI%20BR-512026003115--0` |
| `README.md:47` | `Process Nº **BR512026003115-0** — issued 12/05/2026, valid 50 years (until 2076)` |
| `README.md:53` | `MINISTÉRIO DO DESENVOLVIMENTO, INDÚSTRIA, COMÉRCIO E SERVIÇOS — INPI — Diretoria de Patentes, Programas de Computador e Topografias de Circuitos` |
| `README.md:57-58` | `Registered under Law 9.609/1998 (§2°, art. 2°) as a Computer Program with SHA-512 integrity hash. Approved by Erica Guimaraes Correa, Chief of the Division of Computer Programs and Integrated Circuit Topographies.` |
| `README.md:453` | `- [x] INPI Brazil registration (BR512026003115-0)` |
| `README.md:509,511` | citação recomendada e nota de registro |
| `README.md:536` | `**INOVA Unicamp**: Support for INPI registration process` |
| `cp2b-workspace/NewLook/README.md:5,23,29,360,427` | idem no README aninhado |
| `frontend/src/app/[locale]/cite/page.tsx:10,24,109` | citação ABNT/BibTeX com `note = {Registered software, INPI BR512026003115-0}` |
| `frontend/src/app/[locale]/terms/page.tsx:45,98` | termos de uso |
| `cp2b-workspace/NewLook/CHANGELOG.md:33` | `[3.0.3] 2026-05-18` — `Registro oficial no INPI Brasil — Processo Nº **BR512026003115-0**` |
| `docs/data/METADATA.json` | `reproducibility.inpi: "BR512026003115-0"` |
| `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:4` | `(INPI BR 512026003115-0; NIPE/UNICAMP)` |
| `cp2b-workspace/NewLook/prepare-inpi-submission.sh:3,7,12,110,137-138,159-160` | script de preparação de submissão INPI/INOVA; referencia `REGISTRO_INPI_INOVA_UNICAMP.md` e `REGISTRO_INPI_RESUMO_RAPIDO.md` — **ambos ausentes do repositório** |

**FAPESP — DOIS números diferentes (DIVERGÊNCIA D9):**

| Número | Locais |
|---|---|
| **2024/01112-1 (CP2Bsd)** | `CITATION.cff:48-52` (`references: type: grant … number: "2024/01112-1"`); `README.md:52,511,519,535`; `cp2b-workspace/NewLook/README.md:28,410,426`; `frontend/messages/pt-BR.json:105,222`; `frontend/messages/en.json:105,222`; `docs/data/METADATA.json` (`reproducibility.funding`) |
| **2025/08745-2** | `frontend/src/components/analysis/MethodologyPanel.tsx:239,244`; `frontend/src/app/[locale]/about/page.tsx:53,183`; `frontend/src/app/[locale]/municipality/[ibge_code]/page.tsx:216`; `frontend/messages/pt-BR.json:648,653`; `frontend/messages/en.json:648,653`; `backend/app/api/v1/endpoints/proximity.py:423` (`"methodology_reference": "CP2B FAPESP Project 2025/08745-2"`); `cp2b-workspace/NewLook/prepare-inpi-submission.sh:99` |
| Menção genérica | `frontend/src/components/layout/Footer.tsx:210` (`t('footer.fapesp_project')` → resolve para 2024/01112-1) |

**DOI de dataset / software:**

| Item | Status |
|---|---|
| DOI do software / repositório | **NÃO ENCONTRADO** |
| DOI de dataset | **NÃO ENCONTRADO**. `docs/data/METADATA.json` (`reproducibility.zenodo_doi`) registra literalmente: `"TODO — deposit canonical_parameters/ + analysis/data/0*.csv and record DOI here and in CITATION.cff"` |
| DOI em `CITATION.cff` | ausente (o único identifier é o INPI) |
| DOI de fonte de dados | `10.58053/MapBiomas/JNJGVT` — `docs/data/METADATA.json` (`sources[mapbiomas].doi`), com nota `"(Collection 10 reference; confirm DOI for the collection actually used)"` |
| DOIs bibliográficos | presentes em massa em `data/canonical_parameters/references.yaml` (65 entradas), `references_unified.csv` (368 linhas) e nos comentários de `feedstocks.yaml` (ex. `doi:10.1111/gcbb.12410` em `compute_sp_canonical_totals.py:97`) |
| DOI suspeito hardcoded no frontend | `"doi": "10.5281/zenodo.8234567"` — `frontend/src/data/scientificData.ts:1080` |
| Trabalho de verificação de DOI pendente | `docs/data/SUSPECT_DOI_WORKLIST.md`; `docs/data/CITATION_DOI_AUDIT.md`; `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:113` (`"42 linhas com DOI reutilizado entre resíduos → SUSPECT_DOI_WORKLIST.md (verificação manual; sem chutes)"`) |

**ORCID:** **NÃO ENCONTRADO** em nenhum arquivo do repositório. `CITATION.cff`
lista 4 autores com `family-names`, `given-names` e `affiliation`, sem campo
`orcid`.

---

## BLOCO F — ESTADO OPERACIONAL

### F.1 Configuração de deploy

| Plataforma | Arquivo | Configuração |
|---|---|---|
| **VM UNICAMP (produção declarada)** | `cp2b-workspace/NewLook/ecosystem.config.js` | PM2: `pilar-backend` (uvicorn, `127.0.0.1:8001`, `--workers 2`, `max_memory_restart: '1500M'`) e `pilar-frontend` (`npm run start`, `PORT 3002`, `HOSTNAME 127.0.0.1`); `REPO_ROOT = '/var/www/pilar2b/repo/cp2b-workspace/NewLook'` |
| Apache2 (reverse proxy) | `apache/cp2b.unicamp.br.conf`, `apache/pilar2b.conf`, `apache/cp2b-ssl.conf`, `apache/pilar2b-geoserver.conf.draft` | — |
| PM2 (frontend isolado) | `frontend/ecosystem.config.js` | — |
| Railway | `backend/railway.json` | builder `NIXPACKS`; `startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT`; `restartPolicyType: ON_FAILURE`, `restartPolicyMaxRetries: 10`, `serverless: true`. Também `backend/nixpacks.toml`, `backend/Procfile` |
| Render | `backend/render.yaml` | `runtime: python`, `plan: starter`, `region: oregon`, `branch: main`, `rootDir: cp2b-workspace/NewLook/backend`, `healthCheckPath: /health`, `autoDeploy: true`, `PORT 10000` |
| Vercel | `frontend/vercel.json` | `framework: nextjs`, `regions: ["gru1"]`, `outputDirectory: .next` |
| Cloudflare Pages | `frontend/cloudflare.env.example` | — |
| Docker (dev) | `docker-compose.yml`, `backend/Dockerfile`, `backend/Dockerfile.dev`, `frontend/Dockerfile.dev`, `docker-compose.override.yml.example` | db `postgis/postgis:15-3.4:5432`; backend `:8000`; frontend `:3006`; bind de `./data/canonical_parameters:/app/data/canonical_parameters:ro` (`docker-compose.yml:38-40`) |
| Docker (produção) | `backend/docker-compose.production.yml` | — |
| GeoServer | `docker-compose.geoserver.yml`, `.env.geoserver.example`, `scripts/geoserver/`, `tests/ogc/docker-compose.ogc.yml` | — |
| Scripts de deploy | `frontend/deploy.sh`, `frontend/deploy-vm.sh`, `verify-setup.sh`, `backend/setup_and_start.ps1`, `scripts/cleanup-stale-branches.sh` | — |

**Workflows CI/CD:**

| Workflow | Jobs | Local |
|---|---|---|
| `.github/workflows/ci.yml` (raiz — ativo) | `frontend-lint-and-build`, `frontend-test` (unit + a11y), `frontend-security` (`npm audit --production --audit-level=critical`), `frontend-e2e` (**`continue-on-error: true`**), `backend-lint` (black/isort/flake8), `backend-test` (pytest + cov, serviço postgis 15-3.4), `backend-security` (safety + bandit, bandit com `continue-on-error`) | linhas 1-200+ |
| `.github/workflows/codeql.yml` | análise CodeQL | — |
| `.github/workflows/ogc-compliance.yml` | `ogc-assembly-acceptance` (**BLOCKING**) + CITE conformance (**NON-BLOCKING**, `:5-8`) | — |
| `cp2b-workspace/NewLook/.github/workflows/ci.yml` | duplicata com `node-version: '18'` | — |
| `cp2b-workspace/NewLook/.github/workflows/codeql.yml` | duplicata | — |
| `.github/dependabot.yml` | atualizações automáticas de dependência | — |

**Gate de E2E declarado como não-confiável** — `.github/workflows/ci.yml:95-102`:
*"Soft gate (continue-on-error): the suite is not reliably green in CI because
NEXT_PUBLIC_API_URL below points the localhost:3000 frontend at the live production
backend, whose CORS policy rejects localhost — map-load tests then time out
(verified in run logs: 28568906651, and PR #135's earlier run: 3 failed + 6 flaky)."*

### F.2 URLs de produção declaradas

| URL | Local |
|---|---|
| `https://cp2b.unicamp.br/pilar2b/pt-BR` | `README.md:7,64,68`; `CITATION.cff:8` (`url:`) |
| `https://cp2b.unicamp.br/pilar2b/en` | `README.md:65` |
| `https://nipe.unicamp.br/cp2b` | `README.md:6,67` |
| `https://newlook-production.up.railway.app` | `.github/workflows/ci.yml:31,105` (fallback de `NEXT_PUBLIC_API_URL`) |
| `https://cp2b-maps-backend.onrender.com` | `backend/scripts/benchmark_endpoints.py:17` |
| `https://new-look-nu.vercel.app`, `https://new-look-delta.vercel.app`, `https://cp2bmaps.pages.dev`, `https://541792a2.cp2bmaps.pages.dev` | `backend/render.yaml` (`PRODUCTION_ORIGINS`) |
| `pilar.cp2b.unicamp.br` | `cp2b-workspace/NewLook/ecosystem.config.js:1` (comentário) |
| `https://github.com/aikiesan/Pilar-2b` | `CITATION.cff:7`; `README.md:3` |
| `https://github.com/aikiesan/NewLook` | `frontend/package.json:9` (`repository.url` — **aponta para outro repositório**) |
| Local: `http://localhost:3006` (frontend), `http://localhost:8000` (backend), `http://localhost:8000/docs` | `README.md:200,215-216`; `docker-compose.yml` |

### F.3 Endpoints de API expostos

Registro de routers: `backend/app/api/v1/api.py:25-92`. Prefixos:
`/auth`, `/municipalities`, `/analysis`, `/maps`, `/geospatial`, `/infrastructure`,
`/mock`, `/mapbiomas`, `/proximity`, `/residuos`, `/statistics`, `/scientific`,
`/technology-routes`, `/codigestion`, `/intermediate-regions`, `/calculator`.

| Método | Rota | Propósito | Local |
|---|---|---|---|
| GET | `/analysis/mcda` | análise multicritério | `endpoints/analysis.py:123` |
| GET | `/analysis/proximity` | proximidade | `analysis.py:166` |
| POST | `/analysis/custom` | análise customizada | `analysis.py:181` |
| GET | `/analysis/by-residue` | por resíduo | `analysis.py:186` |
| GET | `/analysis/statistics/by-category` | estatísticas por categoria | `analysis.py:334` |
| GET | `/analysis/statistics/by-stream` | por corrente de resíduo | `analysis.py:392` |
| GET | `/analysis/statistics/by-region` | por região | `analysis.py:443` |
| GET | `/analysis/distribution` | distribuição | `analysis.py:479` |
| GET | `/analysis/residue-config` | configuração de resíduos | `analysis.py:536` |
| POST/GET/PATCH/DELETE/PUT | `/auth/*` (9 rotas) | autenticação, perfil, DSR LGPD | `auth.py:30,47,57,73,89,105,118,129,143` |
| GET | `/codigestion/clusters` | clusters de co-digestão | `codigestion.py:39` |
| GET | `/codigestion/clusters/{cluster_id}` | detalhe de cluster | `codigestion.py:94` |
| GET | `/codigestion/municipality-cn-profiles` | perfis C:N municipais | `codigestion.py:129` |
| GET | `/codigestion/pairing-candidates` | candidatos a pareamento | `codigestion.py:150` |
| GET | `/codigestion/residue-cn-matrix` | matriz C:N | `codigestion.py:176` |
| DELETE | `/codigestion/clusters/cache` | invalidar cache | `codigestion.py:194` |
| GET | `/geospatial/*` (8 rotas) + POST (1) | GeoJSON, rankings, resumo, proximidade | `geospatial.py:200,400,461,649,699,789,842,895,1002` |
| GET | `/infrastructure/{railways,pipelines,substations,biogas-plants,transmission-lines,etes,administrative-regions,intermediate-regions,immediate-regions,sp-boundary}/geojson` | camadas de infraestrutura | `infrastructure.py:41,63,94,111,128,147,164,183,202,221` |
| GET | `/infrastructure/health` (+2 outras) | saúde / consultas | `infrastructure.py:359,247,279` |
| GET | `/intermediate-regions/geojson` | 133 regiões IBGE | `intermediate_regions.py:55` |
| GET | `/intermediate-regions/rankings` | top-N regiões (valor absoluto) | `intermediate_regions.py:109` |
| GET | `/intermediate-regions/` | lista com estatísticas | `intermediate_regions.py:149` |
| GET | `/intermediate-regions/{ibge_code}` | detalhe + geometria | `intermediate_regions.py:171` |
| POST | `/intermediate-regions/cluster` | clustering regional | `intermediate_regions.py:205` |
| GET | `/mapbiomas/*` (4 rotas) | tiles raster de uso da terra | `mapbiomas.py:157,179,296,315` |
| GET | `/maps/layers`, `/maps/layers/{layer_id}/geojson`, `/maps/bounds` | camadas de mapa | `maps.py:10,40,95` |
| GET | `/mock/*` (6 rotas) | dados de amostra para desenvolvimento | `mock_geospatial.py:39,53,84,114,180,233` |
| GET | `/municipalities/geojson` | GeoJSON dos municípios (LOD por `detail`) | `municipalities.py:276` |
| GET | `/municipalities/test-geometry` | diagnóstico | `municipalities.py:520` |
| GET | `/municipalities/stats/summary` | resumo | `municipalities.py:544` |
| GET | `/municipalities/`, `/municipalities/names` | lista / nomes | `municipalities.py:569,608` |
| GET | `/municipalities/{ibge_code}/metrics` | métricas por município (endpoint de detalhe do PR #158) | `municipalities.py:633` |
| GET | `/municipalities/{municipality_id}` | detalhe | `municipalities.py:713` |
| POST | `/proximity/analyze` | análise de proximidade (raio) | `proximity.py:148` |
| GET | `/proximity/*` (3 rotas) | consultas auxiliares | `proximity.py:339,382,427` |
| GET | `/residuos/*` (9 rotas) | setores, subsetores, resíduos, referências, fatores de conversão, comparação | `residuos.py:44,89,128,219,293,336,407,463,524` |
| GET | `/scientific/kinetics` | curvas cinéticas | `scientific.py:51` |
| GET | `/statistics/summary`, `/statistics/category/{category}` | estatísticas agregadas | `statistics.py:18,79` |
| GET/POST/PUT/DELETE | `/technology-routes/*` (11 rotas) | rotas tecnológicas, cards, rotas do usuário | `routers/technology_routes.py:40,105,210,292,380,427,469,509,566,655` |
| POST/GET/DELETE | `/calculator/submit`, `/calculator/leads/{lead_id}` | calculadora de viabilidade + captura de leads (LGPD) | `routers/calculator.py:78,157,203` |
| GET | `/health` | healthcheck (referenciado por `render.yaml`, `README.md:277`) | — |
| — | `/docs` (OpenAPI/Swagger auto-gerado) | `README.md:216` | — |

Documentação de API versionada: um único arquivo — `cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md`.

### F.4 Benchmark de performance versionado

**Script versionado: SIM. Resultados versionados: NÃO.**

| Item | Evidência |
|---|---|
| Script | `cp2b-workspace/NewLook/backend/scripts/benchmark_endpoints.py` — "Measures real-world latency for the API endpoints referenced in Section 3.1 and Table 5 of the manuscript. **Replaces hardcoded estimates (0.8s / 0.6s / 1.4s)** with verified measurements" (`:5-7`) |
| Método | `N_REQUESTS=100` (default), `CONCURRENCY=5`, `ThreadPoolExecutor`, `statistics` (`:15-21`; `run_manuscript_validation.py:38-39`); testes de cold-cache opcionais (`SKIP_COLD_CACHE=1`) |
| Endpoints medidos | 5, listados em `benchmark_endpoints.py:32-38` |
| Saída | `scripts/benchmark_results_<timestamp>.json` (`:27-29`) |
| **Arquivos de resultado no repositório** | **NENHUM** — busca por `benchmark_results_*.json` retorna zero arquivos |
| Runner combinado | `backend/scripts/run_manuscript_validation.py` (SQL de `validate_manuscript_data.sql` + benchmarks HTTP) |

**Números de performance publicados sem arquivo de medição rastreável** —
`README.md:370-380` (tabela "Performance Metrics"):

| Métrica | Alvo | Resultado | Status |
|---|---|---|---|
| Map tile load | <200ms | ~150ms | Pass |
| Proximity analysis (p95) | <3s | 2.1s | Pass |
| Cached response | — | 0ms | Pass |
| Page load time | <2s | 1.8s | Pass |
| Frontend bundle (gzipped) | <500KB | 380KB | Pass |
| Lighthouse Performance | >90 | 92 | Pass |
| Cache hit rate (warm) | >60% | 64% | Pass |

Nenhum destes 7 números tem arquivo de medição versionado. Outros números de
performance com procedência declarada: `docs/HANDOFF_2026-07-21.md`
(`detail=full` = **512 MB / 62 s**; rollup de `promote_pam.py` = **6m57s** na VM;
payload nacional = **15,05 MB** para 106 chaves × 5.571 features, em
`backend/app/api/v1/endpoints/municipalities.py:446`).

### F.5 Validação contra dados independentes

| Tipo de validação | O que existe | Métrica / valor | Onde é calculado |
|---|---|---|---|
| **Gate de agregação contra totais publicados IBGE** | Implementado e executado | PAM 2023, produção vs publicado IBGE: cana `782.058.236 vs 782.000.000` = **0,01%**; soja `152.144.238 vs 152.100.000` = **0,03%**; milho `131.949.711 vs 131.900.000` = **0,04%**; café `3.348.510 vs 3.350.000` = **0,04%**; citros `17.650.185 vs 17.650.000` = **0,00%**. População: `203.080.756` "exact match" | `backend/ingest/gates.py:134` (`aggregation_gate`); valores reportados em `docs/HANDOFF_2026-07-21.md`. PPM validado a **0,01%** (`docs/NATIONAL_DATA_LOAD.md:62-63`) |
| **Validação empírica de BMP contra corpus de literatura** | Sim, medianas comparadas | mediana das refs vs `feedstocks.yaml` medio (mL CH₄/gVS): BAGACO **192 vs 165**; TORTA **365 vs 280**; SUINO **265 vs 235**; GORDURA **859 vs 850**; CAMA_AVIARIO **300 vs 280**; FORSU **472 vs 310**. Base: "367 papers → 196 observações" | `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:71-77`; detalhe em `data/canonical_parameters/feedstock_bmp_from_refs.csv` e `docs/data/REFERENCE_CORPUS_SUMMARY.md` |
| **Benchmark externo (FIESP/SEMIL)** | Comparação, não validação estatística | FIESP/AMPLUN 2021 **~16,0** Mm³/d biogás; SEMIL/FIESP 2024 viável **~11,4**; SEMIL/FIESP 2024 longo prazo **~42,5** Mm³/d biometano; FIESP/Amplun 2025 **11,7 biogás / 6,4 biometano**; PILAR-2b medio **6,39** (ou 6,53) | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:139-145`; `backend/scripts/compute_sp_canonical_totals.py:318-326`; `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:48-58` |
| **Subconjunto apples-to-apples vs FIESP** | Sim | Pilar subset cana+aterro: biogás **1,12 / 4,89 / 16,91**; biometano **0,60 / 2,62 / 9,06** vs FIESP **11,7** total / **6,4** Cenário 1 / **4,75** Cenário 2 | `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:50-54` |
| **Validação predito × medido em plantas reais** | **NÃO CALCULADO** | Nenhuma métrica (erro %, RMSE, MAPE, R²) é computada em nenhum arquivo. `validation_plants` tem os campos (`prediction_error_pct`, `utilization_rate_pct`) mas "NULL in all rows" (`docs/data/SCIENTIFIC_AUDIT_REPORT.md:595`). Busca por `accuracy`, `MAPE`, `RMSE`, `r_squared` em `010_create_validation_plants.sql` retorna zero | — |
| Dados brutos para essa validação | Montados, não ingeridos | 6 plantas de amostra na migração (`backend/migrations/010_create_validation_plants.sql:216-219`, com `-- Note: Coordinates are approximate`); ex. `Cocal Narandiba` 8.900.000 Nm³/ano, `Raízen Geo Biogás Bonfim` 19.000.000 Nm³/ano, fonte `ANEEL/EPE 2023`, `data_quality: high`. Datasets ANP/ANEEL em `analysis/data/05*.csv` — `METADATA.json`: *"Assembled; not yet ingested into validation_plants (P0)"* | — |
| Probe de município único | Sim, documentado | Escada/PE: cana **261.817,37 t**, biogás **5.358.390 m³/ano**, metano **2.938.702**, biometano **2.850.541** | `docs/HANDOFF_2026-07-21.md` |
| Discrepância de unidade não resolvida | Declarada aberta | "ANEEL 19.69 vs 6.39 MW/GW — all must be resolved before paper submission" | `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39`; `docs/data/METADATA.json` (`sources[aneel_siga].notes`) |

### F.6 Estado São Paulo vs. outros estados (escopo operacional)

Fatos relevantes ao escopo declarado da plataforma:

| Fato | Local |
|---|---|
| São Paulo (UF 35) é o foco de pesquisa e o escopo **default** do mapa | `frontend/src/data/brazilStates.ts:4-5`; `frontend/src/components/map/ScopeSwitcher.tsx:1-5` |
| Seletor de escopo: SP, qualquer estado individual, ou Brasil inteiro | `frontend/src/components/map/ScopeSwitcher.tsx:2-4`, `:50-54`; `SCOPE_BRAZIL = 'BR'` em `brazilStates.ts:20` |
| Flag `hasResidueBreakdown` — **somente SP** tem a decomposição por resíduo; o resto do Brasil carrega apenas as bandas agregadas agrícola/pecuária/urbano | `frontend/src/data/brazilStates.ts:6-11,37` |
| Motivo declarado do gate | *"The map uses this flag to gate the per-residue filters honestly instead of silently blanking outside SP"* — `frontend/src/data/brazilStates.ts:9-10` |
| Badge "beta" na interface | `frontend/src/components/layout/UnifiedHeader.tsx:171` (`t('badge.beta')`) |
| Exportação de dados desligada durante o beta | `DATA_EXPORT_ENABLED = false` — `frontend/src/lib/featureFlags.ts:26`; razão exibida em `:29-31` |
| Motivo declarado do beta | *"The national dataset is still being validated — sugarcane is on a national mill-delivery ratio pending per-state moagem, the summary endpoint still reports São Paulo totals, and several crop streams have open methodology questions"* — `frontend/src/lib/featureFlags.ts:13-17` |
| Pontos onde o export está gateado | `frontend/src/components/map/ExportControl.tsx:41`; `frontend/src/components/map/DesktopLeftPanel.tsx:528-531`; `frontend/src/services/proximityApi.ts:344`; `frontend/src/app/[locale]/dashboard/advanced-analysis/page.tsx:484`; `frontend/src/app/dashboard/page.tsx:73` |
| Mapa como landing page | commit `#163` (`2026-07-23`): `feat(nav): make the interactive map the landing page; home becomes the guide hub` |
| Switcher de escopo estadual entregue | commit `#162` (`2026-07-23`): `feat(map): state scope switcher + mobile-first municipality panel` |

---

## BLOCO G — ATIVIDADE NO PERÍODO (01/08/2025 → 2026-07-25)

### G.1 Limitação factual do histórico

**O `git log` deste repositório cobre apenas 2026-06-05 a 2026-07-23.** O commit
mais antigo é `2026-06-05` (`audit: BAGACO + livestock FDE corrections on canonical
database (#90)`). Não existe nenhum commit datado entre **01/08/2025 e
2026-06-04** no repositório auditado, embora:

- as mensagens de commit numerem PRs de `#90` a `#164` (implicando ~89 PRs anteriores fora deste histórico);
- `cp2b-workspace/NewLook/CHANGELOG.md` documente versões `[2.0.0] 2025-10-13`, `[3.0.0-alpha] 2025-11-16`, `[3.0.1] 2025-12-07`, `[3.0.2] 2026-04-12`, `[3.0.3] 2026-05-18`;
- `frontend/package.json:9` aponte `repository.url` para `https://github.com/aikiesan/NewLook` (repositório distinto).

Para o período **01/08/2025 → 2026-06-04**, o `git log` deste repositório **NÃO
COMPROVA** atividade. As entregas desse intervalo constam apenas do CHANGELOG (G.4).

### G.2 `git log` agregado por mês (janela coberta pelo histórico)

| Mês | Commits | Arquivos tocados (`git log --name-only`, únicos) |
|---|---:|---|
| 2025-08 a 2026-05 | **0** | — (histórico ausente, ver G.1) |
| 2026-06 | **29** | — |
| 2026-07 | **22** | — |
| **Total (HEAD)** | **51** | — |

### G.3 Principais entregas funcionais do período, por tema (do `git log`)

**Tema: Metodologia canônica e FDE (junho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-05 | `#90` | `audit: BAGACO + livestock FDE corrections on canonical database` |
| 2026-06-05 | (Claude) | `audit(fde): full per-factor traceability + reproducibility for all 26 FDE blocks` |
| 2026-06-05 | `#92–#94` (re-land) | `audit(fde): full per-factor traceability for all 26 FDE blocks + re-land orphaned #92–#94` |
| 2026-06-06 | `#96` | `fix(compute): correct IBGE PAM unit interpretation — sugarcane 4 sub-streams + citrus peel fraction` |
| 2026-06-09 | `#99` | `Fix de calculator e canonical, bug e verification plan` |
| 2026-06-12 | `#100` | `docs: FIESP benchmark extraction + citation/reference DB audits` |
| 2026-06-12 | `#101` | `Fronteira do Biogás scenario + map toggle, FIESP recalibration, unified 399-ref corpus, How-to-Cite` |
| 2026-06-12 | `#102` | `feat: sync backend db with canonical totals and add How to Cite navigation` |
| 2026-06-13 | `#106` | `Add reference-review workbooks + data consolidation inventory` |
| 2026-06-13 | `#107` | `Scientific database: realistic kinetic curves (Gompertz from t50/t80 + band)` |
| 2026-07-17 | `#147` | `fix(canonical): make feedstocks.yaml reachable in Docker, and its absence loud` |
| 2026-07-23 | `#160` | `fix(tests): locate canonical data by search, not by counting parent dirs` |

**Tema: Dados reais e datasets externos (junho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-13 | `#105` | `Real-world Brazilian biogas/biomethane plants dataset (ANP + ANEEL, SP-first)` |
| 2026-06-29 | `#122` | `docs(data): open-data & API landscape for biomass/biogas mapping (SP→Brazil)` |
| 2026-06-29 | `#123` | `docs(data): energy, logistics & bioeconomy municipal data layer` |
| 2026-06-29 | `#124` | `docs(data): SP energy price & temporal dynamics (cost + what-times)` |
| 2026-06-29 | `#125` | `docs(data): SP waste generation & flow dynamics (how much, how distributed)` |
| 2026-06-29 | `#126` | `docs(data): SP biomass seasonality & temporal availability (dynamic view)` |

**Tema: Conformidade, privacidade e segurança (junho–julho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-25 | `#118` | `feat(privacy): LGPD consent gate, data-subject rights, real privacy/terms` |
| 2026-06-29 | `#127` | `feat(lgpd): drop CPF/CNPJ collection + add compliance guardrail tests` |
| 2026-06-29 | `#129` | `feat(security): baseline HTTP security headers middleware (+ guardrail)` |
| 2026-07-03 | `#137` | `Consolidated pending work: internal auth + GeoServer/OGC prep (#121), PII log sanitizer (#132), paper-credibility docs (#114)` |
| 2026-07-10 | `#142` | `Live-verification sweep: fix 3 production bugs (LGPD DSR, auth rate limiter), first green CITE run, offline auth mode` |

**Tema: Expansão nacional (julho/2026) — a maior mudança de escopo do período**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-07-03 | `#139` | `Brazil expansion foundation: roadmap + data-ingestion framework (8-gate validation battery) + ingestion guide` |
| 2026-07-13 | `#146` | `fix(migrations): make 020 & 021 safe against the production DB` |
| 2026-07-18 | `#148` | `National biomass + biogas map: head-count fix, coverage semantics, 5,570 municipalities` |
| 2026-07-18 | `#150` | `docs(national): turnkey local data-load — orchestrator, manifest, runbook + roadmap` |
| 2026-07-18 | `#151` | `fix(map): tie displayed values to served data + reconcile national totals against IBGE` |
| 2026-07-21 | `#154` | `National crop biomass (IBGE PAM) + measured urban waste + recovered metric toggles` |
| 2026-07-21 | `#156` | `Metric-aware municipality views, national sugarcane, and the biogás/metano split` |
| 2026-07-21 | `#157` | `chore(beta): withhold all dataset exports until the data is cleared to publish` |
| 2026-07-21 | `#158` | `perf(map): serve the choropleth only what it paints` |
| 2026-07-21 | `#159` | `fix(map): remove the Metano toggle — four toggles, not five` |
| 2026-07-23 | `#161` | `docs: session handoff for the national go-live` |

**Tema: UI/UX do mapa (junho–julho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-12 | `#103` | `Refactor map layout: remove floating search bar, relocate color modes toolbar to sidebar, add C/N legend, fix scenario re-rendering bug, set Fronteira as default, and disable Co-digestão` |
| 2026-06-12 | (L. Boaro) | `fix: update screenshot paths to include /pilar2b basePath`; `fix: update ColorMode import after MapToolbar removal` |
| 2026-07-03 | `#140` | `Zoom-smoothness perf pass + month playbooks (Jul–Dec) + migration 021 draft` |
| 2026-07-11 | `#143` | `feat(frontend): guide section + guided tour (recovered from lucas-boaro)` |
| 2026-07-23 | `#162` | `feat(map): state scope switcher + mobile-first municipality panel` |
| 2026-07-23 | `#163` | `feat(nav): make the interactive map the landing page; home becomes the guide hub` |
| 2026-07-23 | `#164` | `feat(map): selectable CVD-safe palettes for daltonic mode` |

**Tema: Qualidade e CI (junho–julho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-30 | `#131` | `chore(lint): remove unused imports + dead code (pyflakes-clean)` |
| 2026-07-01 | `#134` | `Lean & stable: harden CI gates, fix crashing technology-routes endpoints, mechanical cleanup` |
| 2026-07-02 | `#135` | `Lean & stable round 3: E2E/unit-test/flake8/bandit gates + 2 retry bugs` |

**Tema: Documentação e posicionamento (junho/2026)**

| Data | Commit / PR | Entrega |
|---|---|---|
| 2026-06-13 | `#108` | `docs: platform overview & development history (v3.0.3)` |
| 2026-06-13 | `#109` | `docs: future vision & full possibility map (strategy)` |
| 2026-06-13 | `#110` | `docs(readme): professional polish for FOSS4G presentation` |
| 2026-06-13 | `#111` | `chore: declutter repo root — remove duplicate CP2B_HANDOFF, relocate stray doc` |
| 2026-06-29 | `#128` | `docs(planning): month round-up + forward plan (compliance, cadence, sandbox limits)` |
| 2026-06-29 | `#130` | `docs(foss4g): surface open-data/dynamics docs in README + add FOSS4G one-pager` |

### G.4 Entregas do CHANGELOG anteriores ao histórico Git

`cp2b-workspace/NewLook/CHANGELOG.md` (única fonte para o período 2025-08 → 2026-06-04):

| Versão | Data | Conteúdo declarado |
|---|---|---|
| `[2.0.0]` | 2025-10-13 | `(project_map - Referência)` — `CHANGELOG.md:128` |
| `[3.0.0-alpha]` | 2025-11-16 | `CHANGELOG.md:113` |
| `[3.0.1]` | 2025-12-07 | `CHANGELOG.md:80` |
| `[3.0.2]` | 2026-04-12 | Segurança: `Corrigido especificador de versão do Next.js de ^16.2.2 para ^16.2.3 … CVE-2026-23869 (DoS via React Server Components)` — `CHANGELOG.md:65-72` |
| `[3.0.3]` | 2026-05-18 | Institucional: registro INPI `BR512026003115-0` (expedido 12/05/2026); plataforma ao vivo em `cp2b.unicamp.br/pilar2b`. Infra: Apache2 + PM2 na VM UNICAMP, roteamento `/api/`, subpath `/pilar2b/`. Features: Sankey com split flow; deploy script. Correções: E2E públicos, ESLint 9 flat config. Docs: README com INPI + VM guide. Limpeza: scripts arquivados removidos — `CHANGELOG.md:30-63` |
| `[Unreleased]` | — | Sentry (frontend Next.js + backend FastAPI, amostragem 10% em produção, source maps, `docs/SENTRY_SETUP.md`); planejado: MCDA configurável, WCAG 2.1 AA, Bagacinho IA Assistant, sistema completo de referências científicas — `CHANGELOG.md:8-27` |

### G.5 Refatorações arquiteturais relevantes

| Data | Commit / PR | Refatoração |
|---|---|---|
| 2026-06-06 | `#96` | **Mudança de estratégia de cálculo:** interpretação de unidades IBGE PAM corrigida — cana decomposta em 4 sub-fluxos industriais, citros × 0,50. Efeito documentado: total de CH₄ de **8,38 → 3,57** Mm³/d; biogás **15,17 → 6,39** (`docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:56-62`). Superestimativa anterior de **3,6×** (cana) e **~2×** (citros) |
| 2026-06-05 (pré-histórico, documentado) | — | **Inversão do pipeline: reverse → forward.** `backend/app/services/biogas_forward.py:4-10`: *"The historical pipeline stored biogas as static imported values and *reverse*-derived biomass from them, which meant corrections to BMP/VS never reached the map totals. This module inverts that"* |
| 2026-06-12 | `#101` | **4º cenário "Fronteira do Biogás"** + recalibração FIESP + corpus unificado de referências |
| 2026-07-03 | `#139` | **Framework de ingestão** com contrato de 4 passos + bateria de 8 gates (`backend/ingest/`) — mudança de arquitetura de dados |
| 2026-07-17 | `#147` | **Centralização da conversão cabeças→toneladas** no `canonical_loader`. `backend/app/services/canonical_loader.py:165-172`: *"The map never got the conversion, so it read IBGE's head counts straight out of the `{stream}_biomass_tons_year` columns and rendered animals as tonnes — 205M chickens became 205M tonnes of litter (real: 9.3M)"* |
| 2026-07-18 | `#148` | **Mudança de escopo territorial: 645 (SP) → 5.570/5.571 (Brasil)** + semântica de cobertura (`municipality_biomass_provenance`) |
| 2026-07-21 | `#158` | **Payload do mapa reestruturado** (slim + endpoint de detalhe por município): de 15,05 MB para servir só o pintado |
| 2026-07-21 | `#154`,`#156` | **Urbano passa a preferir dado medido** (SNIS CO111 × fração orgânica) sobre modelo populacional; split biogás/metano |
| 2026-07-23 | `#162`,`#163` | **Mapa como landing page** + switcher de escopo estadual |

**Nenhuma mudança de framework** (Next.js, FastAPI, PostgreSQL/PostGIS, Leaflet)
ocorreu no histórico coberto. **Nenhuma mudança de biblioteca de mapa** —
react-leaflet 4.2.1 é a única em todo o histórico.

### G.6 Releases / tags

**NENHUMA.** `git tag` retorna vazio. O versionamento existe apenas como string em
`CITATION.cff` (`3.0.3`), `README.md:3` (badge `3.0.3`), `frontend/package.json:3`
(`3.0.0`) e `backend/pyproject.toml:7` (`3.0.0`) — **estas duas últimas divergem da
versão 3.0.3 declarada no CITATION.cff e no README**.

### G.7 Contribuidores e volume

| Contribuidor | E-mail | Commits |
|---|---|---:|
| Lucas Nakamura Cerejo | `lucassnakamura@gmail.com` | **48** |
| Lucas Boaro | `email_do_lucas@exemplo.com` | **2** |
| Claude | `noreply@anthropic.com` | **1** |

(`git shortlog -sne --all`). O e-mail de Lucas Boaro é um placeholder literal
(`email_do_lucas@exemplo.com`). Referência adicional a um branch de terceiro:
`#143` — `feat(frontend): guide section + guided tour (recovered from lucas-boaro)`.

---

## BLOCO H — QUALIDADE

### H.1 Frameworks de teste e contagens

| Item | Valor | Evidência |
|---|---|---|
| Backend: framework | pytest 9.0.3 + pytest-asyncio 1.3.0 + pytest-cov 7.1.0 + pytest-mock 3.15.1 | `backend/requirements.txt:57-60` |
| Backend: arquivos de teste | **60** arquivos `test_*.py` sob `backend/tests/` | contagem de diretório |
| Backend: funções de teste | **1.285** ocorrências de `def test_` | busca em `backend/tests` |
| Backend: baseline declarado | **923 (Docker) / 939 (host)** | `docs/HANDOFF_2026-07-21.md` ("Test baseline") |
| Backend: caminhos executados | `tests/unit tests/integration tests/compliance` | `backend/pytest.ini:15` |
| Backend: testes **excluídos** do run padrão | 4 arquivos via `--ignore`: `tests/integration/endpoints/test_analysis.py`, `test_codigestion_endpoint.py`, `test_geospatial.py`, `test_municipalities.py` | `backend/pytest.ini:30-33` |
| Motivo declarado da exclusão | *"root-level and api/ have pre-existing failures from superseded Supabase/async patterns"* | `backend/pytest.ini:11-14` |
| Frontend: framework | Jest 30.4.2 + jsdom + Testing Library + jest-axe 10 (a11y) + Playwright 1.60 (E2E) | `frontend/package.json:74,96-98,102`; `frontend/jest.config.js`; `frontend/playwright.config.ts` |
| Frontend: arquivos de teste | **31** (`*.test.*` / `*.spec.*` em `src/` e `e2e/`) | contagem de diretório |
| Frontend: baseline declarado | **635** testes | `docs/HANDOFF_2026-07-21.md` |
| OGC/CITE | suíte de conformidade OGC via TEAM Engine, em `tests/ogc/` | `.github/workflows/ogc-compliance.yml:4-8` |

**Cobertura:**

| Item | Valor | Evidência |
|---|---|---|
| Limiar **aplicado** | `--cov-fail-under=40` | `backend/pytest.ini:29` |
| Cobertura real declarada | *"actual coverage is ~55-60%, well short of the 80% this section used to claim, so that number was aspirational rather than real"* | `backend/pyproject.toml:151-155` |
| Alvo no README | "target: 80% coverage" | `README.md:275` |
| **Relatório de cobertura versionado** | **NENHUM** — não existe `coverage.xml`, `htmlcov/` nem `lcov.info` no repositório (buscados e ausentes) | — |
| Configuração de relatório | `--cov-report=term-missing --cov-report=html:htmlcov --cov-report=xml:coverage.xml --cov-branch` | `backend/pytest.ini:23-28` |

**Testes específicos da metodologia canônica** (`backend/tests/unit/`):
`test_canonical_parameters.py`, `services/test_canonical_generation.py`,
`services/test_canonical_loader.py`, `services/test_biomass_residue_fractions.py`
(11 testes de regressão declarados em `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:103`),
`test_residuos_bounds.py`, `services/test_fde_traceability.py`,
`services/test_biogas_forward.py`, `services/test_mapbiomas_service.py`.
Saída esperada documentada: `~65 passed, 1 warning in ~15s` e
`FDE traceability: all checks pass for 26 feedstocks` (`docs/data/FOSS4G_PAPER_SUPPLEMENT.md:296-303`).
"35/35 testes de regressão passam" em `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:18,93`.

### H.2 Linters, type checking, pre-commit

| Ferramenta | Configuração | Local |
|---|---|---|
| Black | `line-length = 100`, `target-version = ['py310']` | `backend/pyproject.toml:29-31`; CI: `.github/workflows/ci.yml` (`black . --check`) |
| isort | `profile = "black"`, `line_length = 100` | `backend/pyproject.toml:46-48`; CI: `isort . --check-only` |
| Flake8 | `max-line-length = 100`, `extend-ignore = ["E203","W503","E501"]`, `max-complexity = 10` | `backend/pyproject.toml:57-70`; CI: `flake8 app/ --max-line-length=100 --extend-ignore=E203,W503` |
| **mypy** | `disallow_untyped_defs = true`, `disallow_incomplete_defs = true`, `strict_equality = true`, `warn_unreachable = true`, `ignore_missing_imports = true`; `tests.*` com `ignore_errors = true` | `backend/pyproject.toml:72-93`. **Configurado, mas NÃO executado no CI** — nenhum job de `.github/workflows/ci.yml` roda mypy; consta apenas como instrução manual em `README.md:274` |
| pydocstyle | `convention = "google"`, ignora D100–D107 | `backend/pyproject.toml:95-97` |
| bandit | `exclude_dirs = ["tests"]`, `skips = ["B101","B601"]`; CI com `continue-on-error: true` | `backend/pyproject.toml:99-101`; `.github/workflows/ci.yml` |
| safety | `safety check` no CI | `.github/workflows/ci.yml` |
| **pre-commit (backend)** | `backend/.pre-commit-config.yaml`: black 23.12.1, isort 5.13.2, flake8 7.0.0 (+flake8-docstrings), bandit 1.7.6, pre-commit-hooks v4.5.0 (trailing-whitespace, end-of-file-fixer, check-yaml/json/toml, check-merge-conflict, check-case-conflict, mixed-line-ending), pydocstyle 6.3.0, mypy v1.8.0 | `backend/.pre-commit-config.yaml` |
| Divergência de versão em pre-commit | pre-commit fixa `black rev: 23.12.1` e `isort rev: 5.13.2`; `requirements.txt:62-63` exige `black>=26.5.1` e `isort==8.0.1` | `backend/.pre-commit-config.yaml:7,15` vs `backend/requirements.txt:62-63` |
| ESLint | flat config (ESLint 9) | `frontend/eslint.config.mjs`; `frontend/package.json:88` |
| Prettier | `frontend/.prettierrc`, `.prettierignore` | — |
| Husky + lint-staged | `frontend/.husky/`, `frontend/.lintstagedrc.js`; hook `pre-commit: lint-staged && npm run test:a11y -- --bail --passWithNoTests` | `frontend/package.json:50` |
| TypeScript | `frontend/tsconfig.json`; `tsc` declarado clean no baseline | `docs/HANDOFF_2026-07-21.md` |
| GitGuardian | `cp2b-workspace/NewLook/.gitguardian.yaml` | — |
| Cursor rules | `cp2b-workspace/NewLook/.cursorrules` | — |

### H.3 Débitos técnicos marcados (TODO / FIXME / HACK / XXX)

Busca em `.py`, `.ts`, `.tsx`, `.sql`, `.yaml` (exclui `node_modules`, `.next`):
**8 ocorrências, todas `TODO`. Zero `FIXME`, zero `HACK`, zero `XXX`.**

| # | Local | Conteúdo |
|---|---|---|
| 1 | `frontend/src/components/ui/CookieConsent.tsx:50` | `// TODO: Replace with actual newsletter API endpoint` |
| 2 | `frontend/src/components/ui/NewsletterSignup.tsx:46` | `// TODO: Replace with actual newsletter API endpoint` |
| 3 | `frontend/src/components/layout/Footer.tsx:63` | `// TODO: wire to actual newsletter API` |
| 4 | `frontend/src/services/scientificApi.ts:790` | `// TODO: Replace with real API call` |
| 5 | `frontend/src/services/scientificApi.ts:904` | `// TODO: Replace with real API call` |
| 6 | `frontend/src/lib/logger.ts:35` | `// TODO: In production, send to error tracking service (Sentry, LogRocket, etc.)` |
| 7 | `frontend/src/data/scientificData.ts:321` | string de conteúdo científico, não marcador de débito |
| 8 | `frontend/src/data/scientificData.ts:398` | idem |

**TODO adicional fora do escopo da busca por extensão** (em JSON):
`docs/data/METADATA.json` → `reproducibility.zenodo_doi: "TODO — deposit
canonical_parameters/ + analysis/data/0*.csv and record DOI here and in CITATION.cff"`.

**Débito técnico substancial não marcado com TODO/FIXME**, declarado em prosa em
`docs/HANDOFF_2026-07-21.md` ("Open, in priority order") — 9 itens:

| # | Item | Detalhe |
|---|---|---|
| 1 | `/geospatial/statistics/summary` reporta São Paulo sob rótulo "Brasil" | `total_population` retorna 46M, não 203M. "Most visible remaining bug" |
| 2 | `detail=full` = **512 MB / 62 s** | "A self-inflicted denial of service if anything ever requests it. Cap or remove" |
| 3 | Leitores de colunas legacy | `dashboard/compare`, `dashboard/proximity`, `municipality/[ibge_code]` ainda mostram números com forma de SP |
| 4 | Rollup de `promote_pam.py` reescreve 5.571 linhas incluindo geometria (sem `WHERE`) | **6m57s** na VM |
| 5 | Scripts de promoção com `/app` hardcoded | workaround: `export PYTHONPATH=$PWD` |
| 6 | Sem LOD reativo a zoom | colunas da migração 022 existem; a camada busca `overview` uma vez |
| 7 | Gate cross-source do MapBiomas não construído | `prep_mapbiomas_crosswalk.py` existe e roda; 38 linhas sem match |
| 8 | Refinamento da cana por estado | vinhaça deveria sair do volume de etanol (12 m³/m³), não da cana |
| 9 | `audit_log` sem política de retenção | 19.293 linhas em 1.457 MB (~75 KB/linha), crescendo |

Backlog adicional referenciado: `docs/planning/IMPROVEMENT_BACKLOG.md`
(citado em `.github/workflows/ci.yml:102`);
`docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39` lista 6+ discrepâncias de dados
"flagged but unresolved".

---

## BLOCO I — LACUNAS

O que o repositório **hoje NÃO comprova**, com o local onde a ausência é verificável:

### I.1 Reprodutibilidade

| # | Lacuna | Verificação |
|---|---|---|
| 1 | **Nenhum DOI de dataset ou de software.** Não há depósito Zenodo/Figshare; `CITATION.cff` não tem campo `doi`; `METADATA.json` registra o depósito como `"TODO"` | `CITATION.cff:54-56`; `docs/data/METADATA.json` (`reproducibility.zenodo_doi`) |
| 2 | **Nenhuma tag ou release Git.** Não existe commit imutável correspondente à versão 3.0.3 citada em `CITATION.cff` e `README.md` | `git tag` (vazio) |
| 3 | **Versão inconsistente entre artefatos:** 3.0.3 (`CITATION.cff:5`, `README.md:3`) vs 3.0.0 (`frontend/package.json:3`, `backend/pyproject.toml:7`) | — |
| 4 | **Números publicados não reproduzem o código atual.** `FOSS4G_PAPER_SUPPLEMENT.md:296-303` documenta output esperado `3.57 / 6.39 / 3.46`; a re-execução do mesmo script em 2026-07-25 produz `3,6488 / 6,5326 / 3,5393` | D2; `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:296-303` |
| 5 | **`compute_sp_canonical_totals.py` não escreve os totais estaduais em arquivo versionado.** Só imprime em stdout (`:290-339`) e grava `sp_canonical_by_stream.csv` num diretório de output que não está no repositório (`:342,348`). Não há artefato versionado que prove os totais | `backend/scripts/compute_sp_canonical_totals.py:341-355` |
| 6 | **`FRONTIER_ALPHA` não é testável nem importável** — variável local dentro de `_scenario_print()`. Nenhum teste cobre o 4º cenário | `backend/scripts/compute_sp_canonical_totals.py:308` |
| 7 | **O potencial teórico estadual não é computado por nenhum script versionado**, portanto a razão prático/teórico (o cerne do argumento FDE) não é reportável a partir do repositório | B.2, B.5 |
| 8 | **Script de FDE dependente de banco externo não versionado:** `scripts/calculate_fde_all_residues.py:28` aponta para `/home/user/Panorama_CP2B/data/cp2b_panorama.db` — caminho absoluto, arquivo ausente. O pipeline que gerou os `fator_realista` originais não é reproduzível | `scripts/calculate_fde_all_residues.py:28` |
| 9 | **Nenhum ambiente travado para o backend.** Não há `poetry.lock`, `requirements.lock`, `Pipfile.lock` nem hashes; 8 dependências usam `>=` em vez de `==` (`pydantic`, `geopandas`, `fiona`, `pillow`, `scikit-learn`, `xlrd`, `PyYAML`, `black`) | `backend/requirements.txt` |
| 10 | **Histórico Git incompleto** — 51 commits cobrindo 2026-06-05 a 2026-07-23, com PRs numerados até #164. Não é possível auditar a proveniência de nenhuma decisão anterior a 2026-06-05 | G.1 |
| 11 | **`prepare-inpi-submission.sh` referencia dois documentos ausentes** (`REGISTRO_INPI_INOVA_UNICAMP.md`, `REGISTRO_INPI_RESUMO_RAPIDO.md`) | `prepare-inpi-submission.sh:137-138,159-160` |

### I.2 Documentação de API

| # | Lacuna | Verificação |
|---|---|---|
| 12 | **Um único arquivo de documentação de API** (`docs/api/API_DOCUMENTATION.md`) para ~100 rotas; não há especificação OpenAPI versionada (só a auto-gerada em runtime em `/docs`) | `docs/api/` (1 arquivo); `README.md:216` |
| 13 | **Nenhum endpoint documentado retorna metadados de proveniência/cenário** de forma versionada; a semântica `measured` vs `no_data` existe no banco mas não há contrato de API publicado que a formalize | D.4 |
| 14 | **Endpoints `mock` expostos no router de produção** (`/mock/*`, 6 rotas), sem gate de ambiente visível no registro | `backend/app/api/v1/api.py:42-43` |

### I.3 Dados de validação

| # | Lacuna | Verificação |
|---|---|---|
| 15 | **Nenhuma métrica de erro predito × medido é calculada em nenhum arquivo.** Zero ocorrências de `MAPE`, `RMSE`, `R²`, `prediction_error` computado. O schema tem os campos; nada os preenche | F.5; `docs/data/SCIENTIFIC_AUDIT_REPORT.md:595` |
| 16 | **`validation_plants` contém 6 plantas de amostra com coordenadas explicitamente aproximadas** e sem nenhum dos campos de comparação preenchidos | `backend/migrations/010_create_validation_plants.sql:218-219` |
| 17 | **Datasets ANP/ANEEL de plantas reais montados mas não ingeridos** — declarado "P0" | `docs/data/METADATA.json` (`sources[anp_biometano].notes`) |
| 18 | **Discrepância de unidade ANEEL não resolvida:** "19.69 vs 6.39 MW/GW" | `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39` |
| 19 | **Benchmark de performance sem nenhum resultado versionado** — os 7 números da tabela de `README.md:370-380` não têm arquivo de medição rastreável | F.4 |
| 20 | **Nenhum relatório de cobertura de testes versionado** | H.1 |
| 21 | **Nenhuma análise de incerteza propagada à UI** — declarado: *"min/medio/max scenarios exist in the database and are computed by the backend; the map currently displays only the medio scenario"* | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:258-260` |
| 22 | **Nenhuma análise de sensibilidade** dos parâmetros (BMP, TS, VS, FDE) — os cenários min/medio/max são um envelope acoplado, explicitamente *não* uma faixa de sensibilidade (`biogas_forward.py:113-117`; `FOSS4G_PAPER_SUPPLEMENT.md:32-34`) | — |
| 23 | **Nenhuma validação espacial** (autocorrelação, comparação com mapas independentes de biomassa) | busca sem resultado |
| 24 | **Gate cross-source (Gate 5) não implementado para MapBiomas** — 38 linhas sem match, declaradas "wrong-state attributions" | `docs/HANDOFF_2026-07-21.md`, item 7 |

### I.4 Parâmetros sem referência bibliográfica ou com referência frágil

| # | Parâmetro | Valor | Local | Status da referência |
|---|---|---|---|---|
| 25 | `FRONTIER_ALPHA` | 0.5 | `compute_sp_canonical_totals.py:308` | **Nenhuma referência.** Justificativa qualitativa em comentário: "ponto médio por métrica". Define um dos 4 cenários publicados |
| 26 | `UPGRADING_EFFICIENCY` | 0.97 | `compute_sp_canonical_totals.py:54` | **Nenhuma citação.** Comentário: `# biogas → biomethane upgrading (membrane/PSA)`. `FOSS4G_PAPER_SUPPLEMENT.md:30` diz "3 % upgrading loss, membrane/PSA" sem fonte |
| 27 | `CITRUS_RESIDUE_FRACTION` | 0.50 | `compute_sp_canonical_totals.py:74` | Atribuída a "FUNDECITRUS 2022" em comentário; `METADATA.json` marca `retrieved: "VERIFY"`; sem DOI, sem página, sem tabela |
| 28 | Frações da cana | 0.280 / 0.030 / 0.053 / 0.420 | `compute_sp_canonical_totals.py:84,90,96,102` | Bagaço e torta: "UNICA/CONSECANA 2022", "CONSECANA-SP tabela de custo" — sem URL/DOI. Palha: `doi:10.1111/gcbb.12410` (Carvalho 2017) ✓. Vinhaça: cálculo aritmético a partir de agregados nacionais ("~12 Bn L EtOH/yr (UNICA SP) × 12 L/L × 1,01 kg/L / 340 Mt cane") sem fonte para nenhum dos 3 termos |
| 29 | Eficiências de conversão η | 26 valores | `feedstocks.yaml` (blocos `fde.eta`) e `scripts/calculate_fde_all_residues.py:53-80` | Referenciadas em bloco por 5 fontes genéricas `[A]`–`[E]` (`calculate_fde_all_residues.py:34-52`); a atribuição por feedstock (`'Bagaço de cana': 0.70`, `'Palha de cana': 0.65`, …) é asserção sem citação por linha |
| 30 | Fatores individuais FC/FCo/FS/FL | 26 × 4 = 104 valores | `feedstocks.yaml` (apenas como comentários) | **Não existem como campos estruturados** — só o produto `availability`. A decomposição por fator é reconstruída em `FDE_TRACEABILITY_MATRIX.md`, mas não é parseável do YAML |
| 31 | `mill_delivery_fraction` | 0.76 / 0.85 / 0.92 | `feedstocks.yaml:69-72` | Ref `["unica2023_straw"]` — a mesma ref é usada para BMP do bagaço (`:88`) e para a fração de moagem, grandezas distintas. Banda declarada como "the observed range rather than a confidence interval". **E o parâmetro não é aplicado** (D6) |
| 32 | 3 feedstocks LOW-confidence | CASCA_MILHO, ORGANICO_RSU, PODA_URBANA | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:95-98` | "use generic or proxy sources"; contribuição combinada declarada "< 4 %" |
| 33 | 42 DOIs reutilizados entre resíduos | — | `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md:113`; `docs/data/SUSPECT_DOI_WORKLIST.md` | Verificação manual pendente |
| 34 | DOI Zenodo fictício hardcoded | `10.5281/zenodo.8234567` | `frontend/src/data/scientificData.ts:1080` | Servido ao usuário final |
| 35 | Limoneno em citros não modelado | — | `docs/data/SCIENTIFIC_AUDIT_REPORT.md:148` | *"**Missing parameter.** … typical press cake: 800–2000 mg/kg. This systematically exceeds the inhibition threshold [200 mg/kg]. Pre-treatment is mandatory, but neither the cost nor the BMP correction for raw (uninhibited) material is modeled"* |
| 36 | Base VS inconsistente entre camadas | — | `docs/data/SCIENTIFIC_AUDIT_REPORT.md:26,568` | *"the SQL migration uses VS as % of TS (dry basis), while the Python service layer uses VS as % of wet weight — mixing these … introduces a systematic error"* |
| 37 | Metais pesados / CONAMA 498/2020 não modelados | — | `docs/data/SCIENTIFIC_AUDIT_REPORT.md:527` | Determinam aplicabilidade do digestato ao solo |

### I.5 Metodologia

| # | Lacuna | Verificação |
|---|---|---|
| 38 | **Fórmula do FDE não é única no repositório** (4 variantes) — a lacuna mais direta para um revisor de metodologia | D1, B.9 |
| 39 | **Nenhuma análise de concentração espacial** — a terceira contribuição declarada em `README.md:22` ("The spatial distribution of biogas potential was quantified") não tem nenhuma métrica de distribuição implementada (Gini, Lorenz, share do top-N, autocorrelação) | B.6 |
| 40 | **Nenhum ranking regional com participação percentual** | B.7 |
| 41 | **Nenhuma variabilidade interanual modelada** — declarado: *"the canonical dataset uses 2017–2024 agricultural/livestock statistics; inter-annual variation is not modelled"* | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:262-263` |
| 42 | **Diferenciação espacial da pecuária não implementada** (Phase 2, planejada): bovino leiteiro-leste vs corte-oeste com FDE distintos | `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:111-115`; `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:268-271` |
| 43 | **LODO_PRIMARIO e LODO_SECUNDARIO parametrizados mas não mapeados** a nenhum stream municipal | `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:264-266`; `canonical_loader.py:54-67` |
| 44 | **13 dos 26 feedstocks não têm stream municipal** — `CASCAS_CITROS`, `POLPA_CAFE`, `MUCILAGEM_CAFE`, `CASCA_SOJA`, `CASCA_MILHO`, `DEJETOS_AVES`, `DEJETOS_BOVINO`, `ESTERCO_SUINO`, `ORGANICO_RSU`, `LODO_PRIMARIO`, `LODO_SECUNDARIO`, `GORDURA`, `SANGUE`. O argumento "31 resíduos > 2 classes FIESP" (`FIESP_BENCHMARK_AUDIT_REPORT.md:31`) não é sustentado pelos streams efetivamente somados (13) | B.8; `canonical_loader.py:54-67` |
| 45 | **Renomeação de cenários incompleta** — `min/medio/max` no código vs `Linha de Base / Médio Prazo / Fronteira / Otimista` na comunicação. Phase 3 declarada pendente | `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:117-120` |
| 46 | **Duas árvores de migração com numeração colidente** (`backend/app/migrations/` e `backend/migrations/`, prefixos 001/002/003/010/012/013 duplicados), sem ordem de aplicação declarada | D.3 |
| 47 | **Nenhum teste executa mypy no CI**, apesar da configuração strict | H.2 |
| 48 | **4 arquivos de teste de integração excluídos do run padrão** por falhas pré-existentes | H.1; `backend/pytest.ini:30-33` |
| 49 | **Gate E2E é soft (`continue-on-error: true`)** e declarado não-confiável no próprio workflow | F.1; `.github/workflows/ci.yml:95-102` |
| 50 | **Suíte CITE/OGC é non-blocking** | `.github/workflows/ogc-compliance.yml:5-8` |
| 51 | **`LICENSE` não contém o texto integral da GPL-3.0** (17 linhas; só o aviso), contrariando a própria instrução do aviso | E.1 |
| 52 | **Nenhum cabeçalho de licença em arquivos-fonte** | E.2 |
| 53 | **Nenhum ORCID para nenhum dos 4 autores** | E.3 |
| 54 | **Número de processo FAPESP divergente exibido na plataforma pública** (2024/01112-1 vs 2025/08745-2) | D9, E.3 |
| 55 | **`repository.url` do frontend aponta para outro repositório** (`aikiesan/NewLook`) | `frontend/package.json:9` |
| 56 | **E-mail de contato do pacote backend não institucional** (`contact@detecta.org`) e e-mail de contribuidor é placeholder (`email_do_lucas@exemplo.com`) | `backend/pyproject.toml:6`; `git shortlog` |
| 57 | **Escopo declarado (645 municípios de SP) não corresponde ao escopo servido (5.571, Brasil)** em todos os artefatos científicos: README, CITATION.cff, METADATA.json, FOSS4G_PAPER_SUPPLEMENT | D4 |
| 58 | **Coleção do MapBiomas não reconciliada** (8 no código / 9 no paper / 10 no loader / 10.1 planejada) — divergência auto-declarada como bloqueadora de submissão | D8; `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39` |
| 59 | **Ano de referência da pecuária não reconciliado** (Censo Agro 2017 vs PPM 2024) — auto-declarado como `VERIFY` | D10 |
| 60 | **8 de 16 fontes com `retrieved: "VERIFY"`** em `METADATA.json`, com nota de que as datas de retrieval são placeholders | B.10 |

---

*Fim do levantamento. Nenhum arquivo do projeto foi modificado nesta auditoria.*
