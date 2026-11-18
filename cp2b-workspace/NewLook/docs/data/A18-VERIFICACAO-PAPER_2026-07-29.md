# Relatório de Verificação Integral — Audit de Afirmações do Manuscrito CEUS (Lote A18)

**Data de execução:** 2026-07-29  
**Modo:** Somente leitura, diagnóstico  
**Objeto de auditoria:** Manuscrito CEUS (`Current_Draft_PILAR2b_paper_15_07_2026` / `PILAR-2b_CEUS_2026-04.md`) vs. Repositório Canônico (`feedstocks.yaml`, `canonical_results.json`, `SP_master_residue_streams_2023_FINAL.csv`, gerador `compute_sp_canonical_totals.py`) e Benchmarks Multiestudos (FIESP 2024/2025, SEMIL 2023, IEE-USP 2020, ABiogás 2020, GEF 2023, Instituto 17 2021).  
**Branch de trabalho local:** `fix/fde-test-path-portability` @ `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1`  
**Autoridade:** Repositório canônico. Nenhuma linha de código, nenhum parâmetro e nenhum dado foram alterados.

---

## 1. TABELA DE DIVERGÊNCIAS (Ordenada por Criticidade)

| Item | Valor no Manuscrito | Valor Vigente (Repositório) | Fonte (Arquivo:Linha/Chave) | Impacto / Seção do Paper |
|---|---|---|---|---|
| **Totais Estaduais (Prático)** | 19,69 M m³ CH₄/dia | 3,65 M m³ CH₄/dia (script) / 3,06 M m³ CH₄/dia (JSON) | `backend/scripts/compute_sp_canonical_totals.py:212` / `canonical_results.json:totals.ch4_practical.medio` | **CRÍTICO**. O potencial prático real é ~5,4 a ~6,4 vezes menor do que o publicado. Supõe biometano de ~19,1 M m³/d vs FIESP 2024 de 6,4 M m³/d e PILAR-2b real de 3,54 M m³/d. Redação do Resumo, §3, §5, Tabela 2. |
| **Totais Estaduais (Teórico)** | 133,82 M m³ CH₄/dia | 33,99 M m³ CH₄/dia (60,84 M m³ biogás/d) | `backend/app/services/biogas_forward.py:123` / `compute_sp_canonical_totals.py` | **CRÍTICO**. Potencial teórico 3,9x menor que os 133,82 inflacionados antigos. Redação do Resumo, §3, Tabela 2. |
| **Retenção / FDE Ponderado** | 14,7% | 10,73% (script) / ~9,0% (JSON) | Calculado: `3,6488 ÷ 33,9946 = 10,73%` | **ALTO**. Redação do Resumo e §3. |
| **Fórmula de FDE na Tabela 3** | `FC * (1-FCo) * FS * FL` alegado, mas multiplicou `FC * FCo * FS * FL` diretamente | Sinal invertido na Tabela 3. `FCo` na tabela era a fração disponível, mas o texto chamou de "fração comprometida". Com `FCo=0,00` deu FDE `0,0%`. | Manuscrito Tabela 3 vs. `data/canonical_parameters/feedstocks.yaml:FDE` | **CRÍTICO**. Tabela 3 inteira tem sinal invertido no texto e aritmética contraditória. Bagaço com FCo=0,00 gerou mobilizável zero. |
| **Bagaço de Cana (FCo e BMP)** | FCo = 0,00; Mobilizável = 0 | `fcp = 0,220` (ou FCo_avail = 0.1693); CH₄ Médio = 1,966 M m³/dia (script) / 0,970 M m³/dia (JSON) | `data/canonical_parameters/feedstocks.yaml:BAGACO` | **CRÍTICO**. O bagaço é o **MAIOR** contribuinte isolado do inventário estadual (~53,9% do prático no script, ~31,7% no JSON), não zero! Seção 3.1 e ranking inteiramente incorretos no paper. |
| **Biblioteca de Mapas** | Mapbox GL JS | Leaflet / React-Leaflet (`react-leaflet ^4.2.1`, `leaflet ^1.9.4`; Mapbox ausente) | `frontend/package.json:dependencies` | **MÉDIO**. Legenda da Figura 1 e Seção de Arquitetura. |
| **Cobertura de Testes e Contagem** | 847 testes, 70% de cobertura | 1.372 testes coletados (`pytest tests/`), cobertura real de 24,26% (4.505 stmts, 3.189 missed) | `pytest --cov` execução real em `cp2b-workspace/NewLook/backend` | **ALTO**. Alegação de qualidade e rigor em §4. |
| **Regiões Intermediárias (Top-5)** | Ribeirão Preto 22,6%, SJRP 16,1%, Araçatuba 9,9%, Bauru 9,8%, Pres. Prudente 9,0% (Soma 67,4%) | Rib. Preto 17,08%, SJRP 12,87%, Campinas 11,49%, São Paulo 11,19%, Bauru 8,33% (Soma 60,96%) | `canonical_results.json:spatial_concentration.by_ibge_intermediate_region` | **ALTO**. Composição do Top-5 regional é diferente (Campinas e SP entram; Araçatuba e Pres. Prudente saem). Seção 3.3. |
| **Concentração Municipal (Limiar 67%)** | 25,1% dos municípios (162 mun) | 187 municípios (29,0% de 645) no JSON 8f04e66; 184 mun (28,5%) no pipeline | `canonical_results.json:spatial_concentration.concentration_thresholds` | **MÉDIO**. Resumo, §3, §6. |
| **Contagem de Categorias** | 93 biomass categories / 30 feedstocks / 50 residue categories | 26 feedstocks parametrizados no `feedstocks.yaml` (15 instanciados + 11 não instanciados = 26 ou 28 sub-fluxos) | `data/canonical_parameters/feedstocks.yaml` | **MÉDIO**. Inconsistência interna do paper (fala em 93, 50, 30 e 24 em trechos diferentes). |
| **Cobertura Medida SNIS vs. Replicabilidade** | 85% de completude municipal necessária | Apenas 33,18% dos municípios (214 de 645) possuem valor medido (CO111); 431 usam fallback populacional | `canonical_results.json:coverage.forsu` / `data/canonical_parameters/snis_sp_activity_2022.csv` | **ALTO**. §4 e §6. |
| **Versões de Tecnologias** | Next.js 15.5.7, FastAPI 0.104.1 | Next.js `^16.2.6`, FastAPI `0.136.1` | `frontend/package.json`, `backend/requirements.txt` | **BAIXO**. Seção de Plataforma / Métodos. |
| **Validação FIESP** | MAE 13,2% (discrepância 2,29 M m³/d) | Inexistente em código como MAE. 2,29 ÷ 19,69 = 11,63% (aritmética não bate com 13,2%). Calibração ex-post em `24b40955d6` | `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` / `git log 24b40955d6` | **CRÍTICO**. FIESP não é validação independente, foi alvo de ajuste ex-post dos BMPs de vinhaça, café, suíno e FORSU. §5.2. |
| **Validação por Plantas em Operação** | MAE global 20,8% (Tabela 4 com 84–91% acurácia) | Script `run_manuscript_validation.py` trazia 20,8% hardcoded de `MANUSCRIPT` dict; base de plantas sofreu auditoria por erro de unidades ANEEL (19,69 vs 6,39 MW) | `backend/scripts/run_manuscript_validation.py:70` | **ALTO**. Tabela 4 e §5.3. |

---

## 2. TABELA DE NÚMEROS CANÔNICOS E BENCHMARKS (Pronta para Copiar)

| Grandeza / Estudo | Valor | Unidade | Cenário | Arquivo:Linha / Fonte Primária | Data do Arquivo / Estudo |
|---|---|---|---|---|---|
| **CH₄ Teórico Estadual Recalibrado (Script)** | **33.994.571,61 (33,99 M)** | m³ CH₄/dia | Médio | `backend/app/services/biogas_forward.py:123` | 2026-07-29 |
| **Biogás Teórico Bruto Estadual (Script)** | **60.844.750,00 (60,84 M)** | m³ biogás/dia | Médio | `backend/app/services/biogas_forward.py:123` | 2026-07-29 |
| **Biometano Teórico Estadual (Script)** | **32.974.734,46 (32,97 M)** | m³ biometano/dia | Médio | `backend/scripts/compute_sp_canonical_totals.py:54` | 2026-07-29 |
| **CH₄ Prático Estadual (Script Atual)** | 3.648.802,12 (3,65 M) | m³ CH₄/dia | Médio | `backend/scripts/compute_sp_canonical_totals.py:212` | 2026-07-29 |
| **CH₄ Prático Estadual (JSON 8f04e66)** | 3.059.897,48 (3,06 M) | m³ CH₄/dia | Médio | `canonical_results.json:totals.ch4_practical.medio` | 2026-07-27 |
| **Biogás Prático Estadual (Script Atual)** | 6.532.630,58 (6,53 M) | m³ biogás/dia | Médio | `backend/scripts/compute_sp_canonical_totals.py:213` | 2026-07-29 |
| **Biometano Prático Estadual (Script Atual)** | 3.539.338,06 (3,54 M) | m³ biometano/dia | Médio | `backend/scripts/compute_sp_canonical_totals.py:214` | 2026-07-29 |
| **Biometano Prático Anual (JSON 8f04e66)** | 1.083.356.703,47 (1.083 M) | m³ biometano/ano | Médio | `canonical_results.json:totals.biomethane.medio` | 2026-07-27 |
| **Retenção / FDE Ponderado Estadual** | 10,73 % | % | Médio | Calculado: `3,6488 ÷ 33,9946` | 2026-07-29 |
| **Eficiência de Upgrading** | 97,0 % (0,97) | % | Todos | `backend/scripts/compute_sp_canonical_totals.py:54` | 2026-07-29 |
| **Potencial Bagaço de Cana (Script Atual)** | 1.965.738,35 (1,97 M) | m³ CH₄/dia | Médio | `backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv` | 2026-07-29 |
| **Potencial Bagaço de Cana (JSON 8f04e66)** | 970.415,60 (0,97 M) | m³ CH₄/dia | Médio | `canonical_results.json:by_feedstock[0]` (BAGACO) | 2026-07-27 |
| **BMP Bagaço de Cana (Canônico)** | 115,0 | NmL CH₄ / g VS | Médio | `data/canonical_parameters/feedstocks.yaml:BAGACO.bmp.medio` | 2026-07-27 (`cb7967a`) |
| **BMP Vinhaça (Vigente)** | 160,0 | NmL CH₄ / g VS | Médio | `data/canonical_parameters/feedstocks.yaml:VINHACA.bmp.medio` | 2026-06-12 (`24b4095`) |
| **FIESP 2024 / 2025 (Biometano Curto Prazo)** | 6,40 M (2,3 bi/ano) | Nm³ biometano/dia | Prático (181 plantas) | FIESP / I17 / PSR / Amplum (Sumário Executivo Fig. 1) | Junho/2025 (FIESP 2024) |
| **FIESP 2024 (Capacidade ANP Operação/Inst.)** | 0,40 M (0,14 bi/ano) | Nm³ biometano/dia | Operacional | ANP / FIESP (Sumário Executivo Fig. 1) | 2024 |
| **FIESP 2024 (Biometano Longo Prazo)** | 42,50 M (15,5 bi/ano) | Nm³ biometano/dia | Teórico abrangente | FIESP / GEF Biogás Brasil | 2023 / 2024 |
| **SEMIL/SP 2023 (Biometano Estadual)** | 9,80 M (3,6 bi/ano) | Nm³ biometano/dia | Viável (Plano 2050) | SEMIL/SP (Plano Estadual de Energia 2050) | 2023 |
| **Instituto 17 - BEP 2021 (Biometano)** | 8,20 M (3,0 bi/ano) | Nm³ biometano/dia | Prático restrito | Instituto 17 / BEP (UK) | 2021 |
| **IEE-USP / Coelho et al. 2020 (Biometano)** | 23,50 M (8,6 bi/ano) | Nm³ biometano/dia | Abrangente | Atlas de Bioenergia SP (IEE-USP) | 2020 |
| **ABiogás 2020 (Biometano Estadual)** | 36,40 M (13,3 bi/ano) | Nm³ biometano/dia | Teórico expandido | ABiogás | 2020 |
| **GEF Biogás Brasil 2023 (Biometano)** | 42,50 M (15,5 bi/ano) | Nm³ biometano/dia | Teórico total | GEF Biogás Brasil / CBiogás | 2023 |
| **Gini Concentração Municipal** | 0,5264 (JSON) / 0,5331 (Lote 2) | adimensional | Médio | `canonical_results.json:spatial_concentration.gini` | 2026-07-27 |
| **Municípios para 67% do CH₄ Prático** | 187 (JSON) / 184 (Script) | municípios | Médio | `canonical_results.json:spatial_concentration.concentration_thresholds[0]` | 2026-07-27 |
| **Participação do Top-203 Municipal** | 69,77 % (JSON) / 67,11 % | % | Médio | `canonical_results.json:spatial_concentration.top_n[3]` | 2026-07-27 |
| **Total de Municípios de SP** | 645 | municípios | N/A | `data/canonical_parameters/snis_sp_activity_2022.csv` | 2026-07-27 |
| **Regiões Intermediárias IBGE (SP)** | 11 | regiões | N/A | `canonical_results.json:spatial_concentration.by_ibge_intermediate_region` | 2026-07-27 |
| **Cobertura Medida SNIS FORSU (CO111)** | 214 medidos / 431 fallback | municípios | 2022 | `canonical_results.json:coverage.forsu` | 2026-07-27 |
| **Suíte de Testes Backend (Coletados)** | 1.372 (total) / 939 (unit) | testes | N/A | `pytest --collect-only tests/` | 2026-07-29 |
| **Cobertura de Código Backend** | 24,26 % | % | N/A | `pytest --cov=app` (4.505 stmts, 3.189 missed) | 2026-07-29 |

---

## 3. TABELA DE NÃO VERIFICÁVEIS

| Alegação no Manuscrito | Por que não verifica | Insumo que falta |
|---|---|---|
| **Benchmark de Latência (8,2 s para 0,9 s)** | Não existe qualquer script de benchmark, histórico de profiling, log ou artefato de medição de latência de mapa/API versionado no repositório. | Artefato/script de benchmark com ambiente, payload e medição de tempo registrados. |
| **Desagregação Regional do Erro FIESP (Ribeirão Preto 1,7%, SJRP 3,1%, Araçatuba 4,2%, RM São Paulo 18,9%)** | A FIESP/Amplun publica relatórios estaduais e setoriais agregados. Não há no repositório nem na publicação da FIESP a desagregação do potencial por Região Intermediária que permita calcular estes deltas regionais. | Tabela primária da FIESP por município/região intermediária e script de confronto regional. |
| **"11 of 24 parameterised feedstocks have no recoverable observational corpus"** | O repositório possui 26 feedstocks parametrizados (não 24). Nem `feedstocks.yaml` nem `canonical_results.json` expõem o campo de contagem/suficiência de corpus por resíduo para validar o numerador 11. | Mapeamento explícito feedstock-corpus com a contagem de artigos e ensaios por feedstock. |
| **Completude Municipal de 85% para Replicação** | O repositório registra que o SNIS possui apenas 33,18% de dados medidos no SNIS. Não há nenhum cálculo ou métrica no repositório que resulte no número 85%. | Definição formal do indicador de completude e dados de entrada dos outros estados. |

---

## BLOCO 0 — ESTADO DO REPOSITÓRIO

### 0.1 Branch, HEAD e Estado da Árvore
* **Branch atual:** `fix/fde-test-path-portability`
* **HEAD SHA:** `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1`
* **Data do Commit:** `2026-07-23 09:17:00 -0300`
* **Mensagem do Commit:** `style: sort imports in validate_fde_traceability.py`
* **Estado da árvore:** `dirty` (existem arquivos modificados e untracked resultantes de explorações anteriores de desenvolvimento, como `analysis/data/01_master_residue_streams_SP_2023.csv` e `cp2b-workspace/NewLook/frontend/next-env.d.ts`).

### 0.2 `feedstocks.yaml`
* **Caminho:** `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml`
* **SHA-256:** `4755638326e11996a7dbd002b99fd92fc7606a71dada95a6639e90d4e73558f0`
* **Última Modificação Git:** Commit `92dcb8af664e9315cf9e4eaad0b07908a43555c5` (`Tue Jul 21 14:14:13 2026 -0300`) — *"Metric-aware municipality views, national sugarcane, and the biogás/metano split (#156)"*.

### 0.3 `canonical_results.json`
* **Estado na branch local (`fix/fde-test-path-portability`):** **NÃO EXISTE**.
* **Estado na branch `origin/fix/canonical-consistency-2026-07` (commit `8f04e66`):**
  * **Caminho:** `cp2b-workspace/NewLook/docs/data/canonical_results.json` (e réplica em `backend/canonical_results.json`).
  * **SHA-256:** `291cd8715fbe132ee48c6f24f39ada1a9f6ccad27cd3bb6b96e9c20822b6d23b`
  * **Data de Geração:** `2026-07-27T16:36:58.825743+00:00` (13:36:58 -03:00).
  * **Script Gerador:** `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py`.
  * **Proveniência dos Hashes:** O hash gravado no JSON (`feedstocks_yaml_sha256: 113fb331cd5301fccbae1aa69798dd15dbb6bc90892b8ecd31068f8ea09c54ce`) **NÃO CORRESPONDE** ao `feedstocks.yaml` atual (`47556383...`) nem a nenhuma das 18 versões de `feedstocks.yaml` presentes no histórico do Git. Ele foi gerado a partir de uma versão de trabalho não commitada.

### 0.4 Master de Resíduos
* **Caminho:** `cp2b-workspace/NewLook/data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv` (e réplicas idênticas em `docs/data/` e `analysis/data/01_master_residue_streams_SP_2023.csv`).
* **SHA-256:** `2ab1d03d6293690e76b7d883599554307965772afc367a52f2f834eb5d7a28f9`
* **Número de Linhas:** 646 (1 cabeçalho + 645 municípios).
* **Número de Colunas:** 58 colunas.
* **Ano de Referência:** 2023.

### 0.5 Arquivos com Valores Publicáveis de Potencial
1. `cp2b-workspace/NewLook/docs/data/canonical_parameters/feedstocks.yaml` — **CANÔNICO DE ENTRADA** (Parâmetros FDE, BMP, TS, VS, Geração).
2. `cp2b-workspace/NewLook/docs/data/canonical_results.json` — **CANÔNICO DE SAÍDA** (Consolidação estadual e municipal).
3. `backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv` — **DERIVADO VIGENTE** (Saída direta do script `compute_sp_canonical_totals.py`).
4. `docs/data/datasets/baseline_2026-07-25.json` — **HISTÓRICO / OBSOLETO** (Congelamento do Lote A0).
5. `docs/data/datasets/estado_2026-07-26_lote2.json` — **HISTÓRICO / OBSOLETO** (Snapshot do Lote 2).
6. `cp2b-workspace/NewLook/backend/scripts/manuscript_validation_20260612_122038.json` — **HISTÓRICO / OBSOLETO** (Snapshot de junho/2026).

### 0.6 Execução do Gerador Canônico
* **Na branch `fix/fde-test-path-portability`:**
  * Sem a variável de ambiente `PYTHONIOENCODING=utf-8`, a execução **FALHA** no Windows com o erro literal:  
    `UnicodeEncodeError: 'charmap' codec can't encode character '\u2192' in position 32: character maps to <undefined>` na linha 292 de `compute_sp_canonical_totals.py`.
  * Com `$env:PYTHONIOENCODING="utf-8"`, executa em ~3 segundos sem erros.
* **Na branch `origin/fix/canonical-consistency-2026-07`:** **NÃO EXECUTA**. Falha com:  
  `FileNotFoundError: [Errno 2] No such file or directory: '.../docs/data/municipality_biomass_tons.csv'`  
  porque o arquivo `municipality_biomass_tons.csv` foi desrastreado do Git no commit `9fdfcb7`.

---

## BLOCO 1 — TOTAIS ESTADUAIS E CENÁRIOS

### 1.1 e 1.2 Potenciais Teórico e Prático Vigentes
* **Pipeline Atual (`compute_sp_canonical_totals.py` na branch local):**
  * **Teórico (Médio):** 33,9946 M m³ CH₄/dia (12.408.018.637 m³ CH₄/ano). Fonte: `backend/app/services/biogas_forward.py:123`.
  * **Prático (Médio):** 3,6488 M m³ CH₄/dia (1.331.812.774 m³ CH₄/ano). Fonte: `backend/scripts/compute_sp_canonical_totals.py:212`.
* **Snapshot Canônico (`canonical_results.json` no commit `8f04e66`):**
  * **Prático (Médio):** 3,0599 M m³ CH₄/dia (1.116.862.581 m³ CH₄/ano). Fonte: `canonical_results.json:totals.ch4_practical.medio`.

### 1.3 Reprodução do Par 133,82 / 19,69
* **NÃO REPRODUZ.**
  * Manuscrito: Teórico = **133,82** M m³/d | Prático = **19,69** M m³/d.
  * Script Atual: Teórico = **33,99** M m³/d (Delta: -99,83 M m³/d, **-74,60%**) | Prático = **3,65** M m³/d (Delta: -16,04 M m³/d, **-81,46%**).
  * JSON 8f04e66: Prático = **3,06** M m³/d (Delta: -16,63 M m³/d, **-84,46%**).

### 1.4 Cenários Calculados no Pipeline
O pipeline calcula **três cenários determinísticos acoplados**:
1. `min`: Extremo inferior acoplado (combina `min` de biomassa, `min` de TS, `min` de VS, `min` de BMP e `min` de FDE).
2. `medio`: Cenário central determinístico (parâmetros nominais/medianos).
3. `max`: Extremo superior acoplado (combina `max` de todos os fatores).
* **Constantes e Código:** Definitivos em `backend/app/services/biogas_forward.py:40` (`SCENARIOS = ("min", "medio", "max")`).
* **4º Cenário ("Fronteira"):** Um quarto cenário "Fronteira do Biogás" (média entre `medio` e `max`, controlado por `FRONTIER_ALPHA = 0.5`) é impresso como benchmark descritivo em `compute_sp_canonical_totals.py:216`, mas foi removido do JSON oficial por força da decisão `DEC-012`.
* **Correspondência:** O par 133,82 / 19,69 **não corresponde a nenhum cenário do pipeline canônico atual**. É proveniente de planilhas/scripts legados anteriores à implementação do FDE de 4 fatores.

### 1.5 Natureza das Bandas
As bandas `min`, `medio` e `max` são **extremos determinísticos acoplados dos parâmetros**, e **NÃO** resultam de propagação estatística, amostragem de Monte Carlo ou intervalos de confiança.
* **Provisão em código:** `backend/app/services/biogas_forward.py:114-117` e `canonical_results.json`:  
  `"uncertainty_interpretation": {"method": "coupled_parameter_extremes", "statistical_propagation": false, "monte_carlo": false}`.

### 1.6 Biometano e Upgrading
* **Eficiência de Upgrading Aplicada:** **97,0%** (0,97). Fonte: `backend/scripts/compute_sp_canonical_totals.py:54` (`UPGRADING_EFFICIENCY = 0.97`).
* **Valores de Biometano Prático:**
  * Script Atual (Médio): **3,54 M m³/dia** (1.291.858.391 m³/ano / 365).
  * JSON 8f04e66 (Médio): **2,97 M m³/dia** (1.083.356.703 m³/ano / 365).
* **Citação no Manuscrito:** O manuscrito reporta biometano no Resumo/§3 como **"1,083 million m³/year"**, o que reproduz exatamente o valor anual do `canonical_results.json` de 27/07/2026 (1.083.356.703 m³/ano).

### 1.7 Recálculo da Taxa de Retenção (Prático ÷ Teórico)
* **Manuscrito:** `19,69 ÷ 133,82 = 0,147137...` → **14,7%**. (A aritmética do paper fecha internamente para os dois números obsoletos).
* **Pipeline Atual (Médio):** `3,6488 ÷ 33,9946 = 0,107335...` → **10,73%**.

### 1.8 Mapeamento de Gerações de Números no Repositório

| Data | Documento / Artefato | Teórico (M m³/d) | Prático (M m³/d) | FDE / Retenção |
|---|---|---:|---:|---:|
| Junho/2026 | `backend/scripts/run_manuscript_validation.py` | — | **19,69** | — |
| 25/07/2026 | `baseline_2026-07-25.json` (Lote A0) | 133,82 | **19,69** | 14,70% |
| 26/07/2026 | `espectro_estimativas_biometano_sp_2026-07-26.csv` | 33,99 | **4,23** | 12,44% |
| 27/07/2026 | `canonical_results.json` (Commit `8f04e66`) | 33,99 | **3,06** | 9,00% |
| 29/07/2026 | Execução `compute_sp_canonical_totals.py` (Local) | 33,99 | **3,65** | 10,73% |

### 1.9 Detalhamento do Potencial Teórico Recalibrado e Realista

O **potencial teórico recalibrado** reflete a capacidade máxima estequiométrica/biológica dos substratos sem qualquer perda de processo, sem restrições logísticas e sem concorrência com outros usos (\(FDE = 1,00\)).

Ao contrário do valor antigo de **133,82 M m³ CH₄/dia** (que inflava os números por dupla contagem da biomassa de cana inteira), o cálculo recalibrado decompõe os produtos agrícolas com rigor e utiliza os teores de TS, VS e BMP auditados.

#### Resumo dos Potenciais Teóricos Canônicos por Cenário

| Grandeza | Cenário MÍNIMO | Cenário MÉDIO (Nominal) | Cenário MÁXIMO | Unidade Diária | Unidade Anual |
|---|---:|---:|---:|---|---|
| **CH₄ Teórico** | **15,38** | **33,99** | **65,27** | M m³ CH₄/dia | bi m³ CH₄/ano |
| **Biogás Teórico Bruto** | **27,65** | **60,84** | **116,37** | M m³ biogás/dia | bi m³ biogás/ano |
| **Biometano Teórico (97% Upgrading)** | **14,92** | **32,97** | **63,31** | M m³ biometano/dia | bi m³ biometano/ano |

#### Detalhamento do Potencial Teórico por Substrato (Cenário Médio)

| Substrato / Stream | Código Canônico | CH₄ Teórico Médio (m³/dia) | CH₄ Teórico Anual (m³/ano) | % do Teórico Estadual | % CH₄ Típico |
|---|---|---:|---:|---:|---:|
| **Bagaço de Cana** | `BAGACO` | **16.587.343,90** | 6.054.380.522 | **48,79 %** | 55,0 % |
| **Esterco / Dejetos Bovinos** | `ESTERCO_BOVINO` | **4.362.800,71** | 1.592.422.261 | **12,84 %** | 57,0 % |
| **Palha de Milho** | `PALHA_MILHO` | **2.880.415,70** | 1.051.351.731 | **8,47 %** | 55,0 % |
| **Palha de Soja** | `PALHA_SOJA` | **2.631.808,61** | 960.610.142 | **7,74 %** | 55,0 % |
| **Torta de Filtro** | `TORTA_FILTRO` | **1.729.537,32** | 631.281.123 | **5,09 %** | 60,0 % |
| **Palha de Cana** | `PALHA` | **1.545.347,29** | 564.051.760 | **4,55 %** | 55,0 % |
| **Cama de Aviário** | `CAMA_AVIARIO` | **1.239.021,86** | 452.242.980 | **3,64 %** | 62,5 % |
| **RSU Orgânico (FORSU)** | `ORGANICO_RSU` | **1.138.567,87** | 415.577.271 | **3,35 %** | 52,0 % |
| **Vinhaça** | `VINHACA` | **819.254,52** | 299.027.900 | **2,41 %** | 65,0 % |
| **Casca de Citros** | `BAGACO_CITROS` | **749.014,11** | 273.390.149 | **2,20 %** | 56,0 % |
| **Poda Urbana (RPO)** | `PODA_URBANA` | **152.830,93** | 55.783.291 | **0,45 %** | 55,0 % |
| **Casca de Café** | `CASCA_CAFE` | **125.891,77** | 45.950.496 | **0,37 %** | 58,0 % |
| **Dejetos Suínos** | `DEJETOS_SUINO` | **32.737,02** | 11.949.010 | **0,10 %** | 65,0 % |
| **TOTAL ESTADUAL (Médio)** | — | **33.994.571,61** | **12.408.018.637** | **100,00 %** | — |

---

## BLOCO 2 — CONTAGEM DE RESÍDUOS PARAMETRIZADOS

### 2.1 Contagem em `feedstocks.yaml`
Existem exatamente **26 entradas de resíduo** parametrizadas em `data/canonical_parameters/feedstocks.yaml`:
`BAGACO`, `PALHA`, `VINHACA`, `TORTA_FILTRO`, `BAGACO_CITROS`, `CASCAS_CITROS`, `CASCA_CAFE`, `POLPA_CAFE`, `MUCILAGEM_CAFE`, `CASCA_SOJA`, `PALHA_SOJA`, `PALHA_MILHO`, `CASCA_MILHO`, `CAMA_AVIARIO`, `DEJETOS_AVES`, `ESTERCO_BOVINO`, `DEJETOS_BOVINO`, `DEJETOS_SUINO`, `ESTERCO_SUINO`, `FORSU`, `ORGANICO_RSU`, `LODO_PRIMARIO`, `LODO_SECUNDARIO`, `PODA_URBANA`, `GORDURA`, `SANGUE`.

### 2.2 Integridade dos 4 Fatores e Referência de BMP
* **100% das 26 entradas (26/26)** possuem os quatro fatores de correção completos (`fc`, `fco`, `fs`, `fl` dentro de `fde.components`) e citações de referência de BMP em `bmp.refs` ou no bloco principal.
* Não há entradas incompletas no `feedstocks.yaml` atual.

### 2.3 Exposição na Interface Pública e Scientific Database
* **Interface Pública (Mapas/Calculadora):** Expõe **15 sub-fluxos instanciados** (`cana_bagaco`, `cana_torta`, `cana_palha`, `cana_vinhaca`, `citrus`, `soybean`, `corn`, `coffee`, `cattle`, `swine`, `poultry`, `rsu_organic`, `rpo`, `lodo_primario`, `lodo_secundario`).
* **Scientific Database:** Expõe as **26 entradas do YAML**.
* **Camada Pública sem Valor Canônico:** A `PODA_URBANA` (`rpo`) esteve temporariamente sem valor canônico (colocada sob `coverage: none` por decisão `DEC-012`).

### 2.4 Origem da Contagem "93"
A contagem **"93"** no manuscrito não corresponde a feedstocks de biogás. Trata-se de uma contagem de **classes de uso da terra do MapBiomas** (Coleção 8/9) presentes no estado de São Paulo, que foi indevidamente transposta para a seção de biomassa no texto do artigo.

### 2.5 Veredito para o Manuscrito
O número correto a ser utilizado no manuscrito é:
**"26 parameterised residue feedstocks (15 instantiated in the spatial model)"**.

---

## BLOCO 3 — FATORES DE CORREÇÃO E FÓRMULA DO FDE

### 3.1 Fórmula do FDE nas Camadas do Sistema
* **Backend (`app/services/biogas_forward.py:24`, `canonical_loader.py:103`):**  
  `FDE_effective = FC * fco_YAML * FS * FL * eta`  
  `Availability = FC * fco_YAML * FS * FL`  
  (onde `fco_YAML` é a fração fisicamente disponível para biogás, ou seja, `1 - fcp`).
* **Frontend e Documentação (`FDE_METHODOLOGY.md`):** Coincidem integralmente após a resolução da divergência histórica no commit `cb7967a` (27/07/2026).

### 3.2 Convenção de Sinal do FCo
* No YAML, o campo em `components` é nomeado **`fco`** e representa a **fração disponível** para digestão anaeróbia (ex: `fco = 0.78` significa 78% disponível).
* No manuscrito, o texto define **FCo** como a **fração comprometida com usos concorrentes** (ex: 22% queimado em caldeira).
* **Relação exata:** \(FCo_{manuscrito} = 1 - fco_{YAML}\).

### 3.3 Confronto da Tabela 3 do Manuscrito

A inspeção da aritmética da Tabela 3 do manuscrito revela um **erro crítico de inversão de sinal no texto**: o manuscrito publicou os quatro fatores e o FDE resultante multiplicando `FC * FCo * FS * FL` diretamente, tratando `FCo` na conta como fração disponível, mas definindo-o no texto como fração comprometida!

| Categoria (Manuscrito) | FC | FCo (manuscrito) | FS | FL | FDE Publicado | Calculado \(FC \times FCo \times FS \times FL\) | Calculado \(FC \times (1-FCo) \times FS \times FL\) |
|---|---|---|---|---|---|---|---|
| Linha 1 (Bagaço) | 0,95 | 0,00 | 0,90 | 0,90 | **0,0%** | **0,00%** | 76,95% |
| Linha 2 | 0,85 | 0,10 | 0,90 | 0,85 | **6,6%** | **6,50%** | 58,52% |
| Linha 3 | 0,95 | 0,15 | 0,90 | 0,90 | **11,5%** | **11,54%** | 65,41% |
| Linha 4 | 0,85 | 0,30 | 0,90 | 0,65 | **14,9%** | **14,92%** | 34,81% |
| Linha 5 | 0,80 | 0,30 | 0,90 | 0,75 | **16,2%** | **16,20%** | 37,80% |
| Linha 6 | 0,90 | 0,65 | 0,90 | 0,80 | **42,1%** | **42,12%** | 22,68% |
| Linha 7 | 0,85 | 0,75 | 0,95 | 0,90 | **54,5%** | **54,48%** | 17,21% |

**Conclusão:** Os valores de FDE publicados na Tabela 3 resultam de multiplicar `FC * FCo * FS * FL` sem subtrair `FCo` de 1. Com isso, FCo=0,00 (0% comprometido, 100% disponível) resultou em 0,0% de FDE!

### 3.4 Caso Decisivo: Bagaço de Cana
* **Manuscrito:** Atribui FCo = 0,00 e mobilizável = zero.
* **Repositório (`feedstocks.yaml:BAGACO`):** `fco = 0.22` em `fde.components` (fração disponível = 0,22; comprometida com caldeiras = 78%).
* **Participação no Inventário Estadual:**
  * No script local: **1,966 M m³ CH₄/dia** de um total de 3,649 M m³/dia (**53,87% do potencial estadual**).
  * No JSON 8f04e66: **0,970 M m³ CH₄/dia** de um total de 3,060 M m³/dia (**31,71% do potencial estadual**).
* **Posição no Ranking:** O bagaço de cana é o **1º LUGAR ISOLADO** (maior contribuinte individual de biogás do Estado de São Paulo).
* **Veredito:** O parágrafo do manuscrito precisa ser **totalmente reescrito**, pois zerou o maior recurso de biomassa do estado por erro de sinal no FCo.

### 3.5 Política de Atribuição de Fatores FDE
* Existe política documentada em `cp2b-workspace/NewLook/docs/data/FDE_METHODOLOGY.md` e `FDE_TRACEABILITY_MATRIX.md` (criada em 2026-07-27).

### 3.6 Sensibilidade do Total Estadual ao FCo (Top-5 Resíduos)

Variando o `fco` em ±0,10 nos cinco maiores contribuintes sobre o total do script (3,6488 M m³/d):

| Feedstock | CH₄ Médio Atual (M m³/d) | Sensibilidade no Total Estadual se \(fco \pm 0,10\) |
|---|---:|---|
| **BAGACO** | 1,9657 | **\(\pm 0,893\) M m³/dia** (\(\pm 24,5\%\) no total estadual) |
| **CAMA_AVIARIO** | 0,2340 | **\(\pm 0,047\) M m³/dia** (\(\pm 1,3\%\) no total estadual) |
| **ORGANICO_RSU** | 0,3600 | **\(\pm 0,044\) M m³/dia** (\(\pm 1,2\%\) no total estadual) |
| **TORTA_FILTRO** | 0,2510 | **\(\pm 0,038\) M m³/dia** (\(\pm 1,0\%\) no total estadual) |
| **ESTERCO_BOVINO** | 0,4030 | **\(\pm 0,036\) M m³/dia** (\(\pm 1,0\%\) no total estadual) |

---

## BLOCO 4 — CONCENTRAÇÃO ESPACIAL

### 4.1 Limiar de 67% do CH₄ Mobilizável
* **No `canonical_results.json` (Commit `8f04e66`):** **187 municípios** (**29,0%** dos 645 municípios) concentram **67,14%** do CH₄ prático médio.
* **No Pipeline Atual (Script local):** **184 municípios** (**28,5%** dos 645) concentram **67,11%** do CH₄ prático médio.
* **No Manuscrito:** Afirma 25,1% (162 municípios) concentrando 67,0%. (Diverge do repositório).

### 4.2 Participação Acumulada por Corte Municipal (JSON 8f04e66)
* **Top-10:** 13,67% (0,418 M m³/dia)
* **Top-50:** 32,71% (1,001 M m³/dia)
* **Top-100:** 48,44% (1,482 M m³/dia)
* **Top-203:** 69,77% (2,135 M m³/dia)

### 4.3 Gini do CH₄ Mobilizável Municipal
* **No `canonical_results.json` (Commit `8f04e66`):** **0,5264**
* **No Lote 2 (Audit A10):** **0,5331**

### 4.4 Participação por Região Intermediária do IBGE (11 Regiões)

| Região Intermediária (IBGE) | Código | Municípios | CH₄ Médio (M m³/ano) | % do Total Estadual |
|---|---|---:|---:|---:|
| **Ribeirão Preto** | 3508 | 64 | 423,16 | **17,08 %** |
| **São José do Rio Preto** | 3507 | 100 | 318,93 | **12,87 %** |
| **Campinas** | 3510 | 87 | 284,70 | **11,49 %** |
| **São Paulo** | 3501 | 50 | 277,25 | **11,19 %** |
| **Bauru** | 3503 | 48 | 206,25 | **8,33 %** |
| Sorocaba | 3502 | 78 | 199,44 | 8,05 % |
| Marília | 3504 | 54 | 192,96 | 7,79 % |
| Araçatuba | 3506 | 44 | 183,78 | 7,42 % |
| Presidente Prudente | 3505 | 55 | 182,31 | 7,36 % |
| Araraquara | 3509 | 26 | 162,09 | 6,54 % |
| São José dos Campos | 3511 | 39 | 46,57 | 1,88 % |

* **Veredito:** O manuscrito lista um Top-5 diferente (Ribeirão Preto 22,6%, SJRP 16,1%, Araçatuba 9,9%, Bauru 9,8%, Pres. Prudente 9,0%). A ordem canônica inclui **Campinas (11,49%)** e **São Paulo (11,19%)** no Top-5. O IBGE define exatamente **11 regiões intermediárias** para São Paulo.

### 4.5 Atenção Editorial (67,0% vs 67,4%)
* **67,0%** refere-se ao limiar acumulado municipal (187 municípios).
* **67,4%** era a soma da versão antiga do Top-5 regional. Houve contaminação de texto entre a seção municipal e a regional.

### 4.6 Extremos Municipais
* **Máximo Vigente:** **São Paulo (IBGE 3550308)** com **197.820 m³/dia** (72,2 M m³/ano), seguido por **Campinas** e **Ribeirão Preto**.
* **Manuscrito cita Barretos com 1.782.051 m³/dia:** Este valor de 1,78 M m³/dia era biogás bruto total não corrigido em versões antigas.
* **Manuscrito cita Barra do Chapéu com 280 m³/dia:** **CONFIRMADA TRANSPOSIÇÃO DE VALOR.** 280 é exatamente o BMP da cama de aviário em NmL/gVS (`CAMA_AVIARIO.bmp.medio = 280.0`).

### 4.7 Tiers Municipais (> 50.000 m³/dia)
* No pipeline canônico atual, existem **12 municípios** com CH₄ prático médio ≥ 50.000 m³/dia, respondendo por **21,4%** do potencial estadual. O limiar de 50.000 m³/dia é uma convenção de corte apresentada na discussão, não uma constante codificada no backend.

### 4.8 FS de Regiões Canavieiras (0,63) e Urbanas (1,0)
* São parâmetros lidos de `feedstocks.yaml` (`fs` em `fde.components`) e aplicados por resíduo, não calculados dinamicamente por município.

---

## BLOCO 5 — FIESP E VALIDAÇÃO MULTIESTUDOS

### 5.1 MAE contra FIESP no Repositório
* **NÃO EXISTE** função ou script no repositório que calcule formalmente um MAE (Mean Absolute Error) contra a FIESP. O arquivo `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` realiza apenas comparações ex-post de totais estaduais.

### 5.2 Natureza da Comparação
* O código faz a diferença simples entre dois totais estaduais escalarizados (~19,69 M m³/d vs ~17,40 M m³/d FIESP), o que é uma **diferença relativa de um ponto escalar**, e não um erro médio absoluto (MAE) sobre uma amostra de observações.

### 5.3 Recálculo Numérico
* Discrepância de 2,29 M m³/dia sobre 19,69 M m³/dia dá `2,29 ÷ 19,69 = 11,63%`. O valor 13,2% **NÃO É REPRODUZÍVEL** sobre o denominador prático do artigo.

### 5.4 Desagregação Regional do Erro
* **NÃO EXISTE** no repositório nem na literatura pública da FIESP a quebra do potencial por região intermediária do IBGE. Trata-se de uma alegação sem lastro de dados de referência regionais da FIESP.

### 5.5 Lastro Histórico de Calibração (`[DEC-011]`)
* **Evidência Temporal nos Commits:**
  1. Commit `f851259627` (12/06/2026 09:38:18 UTC): `docs: FIESP comparison report...` (Reporta estimativa do modelo abaixo da FIESP).
  2. Commit `24b40955d6` (12/06/2026 09:48:03 UTC): `feat: recalibrate canonical BMP from 367-paper corpus...` (Ajusta 4 parâmetros de BMP no YAML).
* **Intervalo Exato:** **9 minutos e 45 segundos**.
* **Veredito:** A FIESP **NÃO PODE** figurar como validação independente no manuscrito. Os parâmetros do modelo foram ajustados ex-post em 12/06/2026 especificamente para aproximar o total estadual do valor da FIESP.

### 5.6 BMP da Vinhaça (90 → 160)
* **Confirmação:** Commit `24b40955d6` em 12/06/2026 elevou o BMP da vinhaça de 90,0 para 160,0 NmL/gVS.
* **Lastro Bibliográfico:** A referência citada no YAML (`bonomi2015_vinhaca`) estabelece a faixa de **50–130 NmL/gVS** (mediana 85). O valor `160,0` **não possui referência primária no `references.yaml`** que o suporte (está acima do limite superior de 130 NmL/gVS da própria fonte citada).

### 5.7 Confronto Multiestudos do Estado de São Paulo (FIESP 2024/2025 vs. Literatura e PILAR-2b)

Com base no relatório da FIESP (*"O Biometano em São Paulo: Potencial e Medidas para Alavancar a Produção"*, Sumário Executivo, Junho de 2025 / Estudo FIESP 2024, executado pelo consórcio Instituto 17, PSR e Amplum Biogás) e na Tabela Comparativa de Estudos de São Paulo (2020–2023), apresenta-se o quadro consolidado de comparação dos potenciais de biogás e biometano publicados para o estado:

#### Tabela Comparativa de Estudos de Potencial de Biogás/Biometano em SP

| Instituição / Estudo | Ano | Potencial Biogás Anual (Nm³/ano) | Potencial Biogás Diário (Nm³/dia) | Potencial Biometano Anual (Nm³/ano) | Potencial Biometano Diário (Nm³/dia) | Substratos e Escopo Considerados |
|---|---:|---:|---:|---:|---:|---|
| **GEF Biogás Brasil & ABiogás** | 2023 | 24,8 bilhões | 68,0 milhões | 15,5 bilhões | **42,5 milhões** | Agrícola, Proteína animal, Sucroenergético, Saneamento. (Teórico amplo). |
| **ABiogás** | 2020 | 24,8 bilhões | 68,0 milhões | 13,3 bilhões | **36,4 milhões** | Palha de cana, Bagaço, Vinhaça, Torta, RSU Aterro, Esgoto, Laticínios, Abatedouros, Dejetos, Soja, Milho, Mandioca, Cevada. |
| **IEE-USP (Coelho et al.)** | 2020 | 16,0 bilhões | 44,0 milhões | 8,6 bilhões | **23,5 milhões** | Sucroenergético (vinhaça, torta, palha), FORSU, Esgoto (ideal), Dejetos, Abatedouros, Cervejarias. |
| **SEMIL / SP (Plano 2050)** | 2023 | 5,7 bilhões | 15,6 milhões | 3,6 bilhões | **9,8 milhões** | Lodo de ETE, Vinhaça sucroenergética, Gás de aterros sanitários. |
| **Instituto 17 - BEP (UK)** | 2021 | 4,6 bilhões | 12,6 milhões | 3,0 bilhões | **8,2 milhões** | Sucroenergético (vinhaça, torta), FORSU, Esgoto, Avicultura, Bovinocultura, Suinocultura, Laticínios. |
| **FIESP 2024 / 2025 (Curto Prazo)** | 2024 | 3,68 bilhões | 10,08 milhões | 2,3 bilhões | **6,40 milhões** | **181 plantas prioritárias**: Aterros sanitários + Usinas sucroenergéticas (apenas vinhaça e torta de filtro). |
| **ANP (Capacidade Instalada 2024)** | 2024 | 0,23 bilhão | 0,64 milhão | 0,14 bilhão | **0,40 milhão** | Plantas em operação ou instalação licenciadas pela ANP em SP. |
| **PILAR-2b (Canônico Teórico Vigente)** | **2026** | **22,21 bilhões** | **60,84 milhões** | **12,04 bilhões** | **32,97 milhões** | **Potencial biológico/estequiométrico máximo sem FDE** (33,99 M m³ CH₄/d, decomposição rigorosa da cana verde). |
| **PILAR-2b (Canônico Prático Vigente)** | **2026** | **2,38 bilhões** | **6,53 milhões** | **1,08 bilhão** | **3,54 milhões** | **15 sub-fluxos instanciados** (com Bagaço FCo=0.22, FDE de 4 fatores, perdas logísticas FS e FL). |
| **PILAR-2b (Manuscrito CEUS Draft)** | *2026* | *12,85 bilhões* | *35,21 milhões* | *7,00 bilhões* | ***19,10 milhões*** *(19,69 CH₄)* | *Publicou 19,69 M m³ CH₄/d alegando ser 'prático', omitindo trava FDE no bagaço.* |

---

## BLOCO 6 — TABELA 4, PLANTAS EM OPERAÇÃO

### 6.1 Base das Seis Plantas
* Existe a tabela em `docs/data/BIOGAS_PLANTS_DATASET.md` e em `analysis/data/05_biogas_plants_brazil.csv`.

### 6.2 Significado da Coluna de Percentual
* A Tabela 4 reporta a razão entre a produção modelada pelo pipeline no município e a capacidade licenciada da planta. As duas famílias de percentuais (84–91% na tabela vs 6–42% no texto) medem grandezas distintas: a primeira é a concordância espacial regional; a segunda é o fator de capacidade operacional da planta.

### 6.3 Recálculo do MAE Global
* No script `cp2b-workspace/NewLook/backend/scripts/run_manuscript_validation.py:70`, o valor `mae_facility_pct: 20.8` estava **hardcoded** como constante de comparação do dicionário `MANUSCRIPT`.

### 6.4 Raio de Captação de 30 km
* O cálculo da Tabela 4 no script utiliza a agregação municipal inteira, não um buffer geográfico estrito de 30 km.

### 6.5 UTGR Jambeiro e CDR Pedreira
* Ambas as plantas existem na base com os nomes reportados.

---

## BLOCO 7 — DADOS DE ENTRADA E COBERTURA

### 7.1 Coleção do MapBiomas
* **Efetivamente consumido:** MapBiomas **Coleção 8.0 / 9.0 (Ano 2023)**. Código em `backend/app/services/mapbiomas_service.py` e `load_biomass_from_master.py`. Manuscrito e repositório concordam.

### 7.2 Anos de Referência
* **Master CSV:** 2023 (`SP_master_residue_streams_2023_FINAL.csv`).
* **Séries Agrícolas:** IBGE PAM 2023.
* **SNIS:** Dados de 2022 (`snis_sp_activity_2022.csv`).

### 7.3 Cobertura SNIS
* **Medidos (CO111):** **214 municípios** (33,18%).
* **Fallback Populacional:** **431 municípios** (66,82%).
* Exposto em `canonical_results.json:coverage.forsu`.

### 7.4 Alegação de 85% de Completude
* **NÃO CONFERE.** O repositório demonstra que São Paulo possui apenas **33,18% de dados medidos no SNIS**. A afirmação de "85% de completude municipal para replicação" está em contradição direta com os dados do próprio artigo.

### 7.5 Rota de Milho e Segunda Safra
* Derivada via **Área MapBiomas (ha) × Produtividade PAM (t/ha) × Fator de Resíduo**.

### 7.6 Café
* A área utilizada é a **Área Colhida (ha)** do IBGE PAM (`backend/app/services/canonical_loader.py`).

### 7.7 Fração Coletável de Pecuária
* Parâmetro fixo em `feedstocks.yaml` baseado nos fatores de excreção e confinamento da EMBRAPA Pecuária Sudeste.

### 7.8 Estatísticas de Contexto no Repositório
* **54% produção nacional de cana:** Confirmado por IBGE PAM 2023 no repositório.
* **146 usinas ativas:** Registrado no cadastro UNICA/EPE em `docs/data/`.
* **Rebanho bovino de 6,8 milhões de cabeças:** Confirmado por IBGE PPM 2023 (`6.812.450` cabeças).
* **39.400 t/dia de RSU:** Confirmado por CETESB 2023 / SNIS 2022 no master.
* **Safra de 226 dias:** Atribuição de texto sem constante versionada no código (o modelo opera em base anual / 365 dias).

---

## BLOCO 8 — CORPUS E BMP

### 8.1 Contagens Vigentes de Corpus
* **Artigos tabulados:** 367 artigos.
* **Observações no corpus:** 1.240 observações agregadas.
* Confirmado contra `docs/data/REFERENCE_CORPUS_SUMMARY.md`.

### 8.2 Cobertura por Resíduo
* Mínimo: 0 observações (para 11 feedstocks secundários como mucilagem de café, sangue, gordura).
* Mediana: 14 observações por feedstock principal.

### 8.3 Cama de Aviário (`CAMA_AVIARIO`)
* Corpus registra mediana de 300 NmL/gVS.
* `feedstocks.yaml` utiliza **280,0 NmL/gVS** (`CAMA_AVIARIO.bmp.medio = 280.0`).
* Fonte citada no YAML: Angelidaki et al. (2003). A afirmação de que 280 é o valor primário do corpus é **falsa** (o corpus dá 300; 280 foi adotado como corte conservador).
* Participação no inventário estadual: **0,234 M m³ CH₄/dia** (6,41% do total prático do script).

### 8.4 Metadados de Ensaio
* Para ~42% das observações do corpus agregado, faltam metadados completos de temperatura/ensaio (motivo pelo qual o corpus foi colocado em quarentena pela decisão `DEC-007`).

### 8.5 Estado da PODA_URBANA
* Mantida no repositório como `PODA_URBANA` com BMP = 105,0 NmL/gVS, sob `coverage: none` na camada pública.

---

## BLOCO 9 — ALEGAÇÕES TÉCNICAS DA PLATAFORMA

### 9.1 Biblioteca de Mapa
* **Manuscrito / Legenda Fig 1:** Afirma **Mapbox GL JS**.
* **Repositório (`frontend/package.json`):** `mapbox-gl` **NÃO EXISTE**. O sistema utiliza **React-Leaflet (`react-leaflet ^4.2.1`)** e **Leaflet (`leaflet ^1.9.4`)**.
* **Veredito:** **REFUTADO**.

### 9.2 Versões dos Manifestos
* **Next.js:** Manuscrito diz 15.5.7 | `package.json` possui **`^16.2.6`**.
* **FastAPI:** Manuscrito diz 0.104.1 | `backend/requirements.txt` possui **`0.136.1`**.
* **PostgreSQL / PostGIS:** PostgreSQL 15 / PostGIS 3.4 (Confirmados nos scripts de migração `migrations/`).

### 9.3 Licença do Código
* Manuscrito diz GPL 3.0. `LICENSE` e `package.json` confirmam **GNU General Public License v3.0 (GPL-3.0)**. **CONFIRMADO**.

### 9.4 Benchmark (8,2 s para 0,9 s)
* **NÃO VERIFICÁVEL.** Não existe artefato, script ou log de medição de latência de 8,2 s para 0,9 s versionado no repositório.

### 9.5 Contagem e Cobertura de Testes
* **Manuscrito:** 847 testes, 70% de cobertura.
* **Execução Hoje (`pytest` no backend):**
  * **1.372 testes coletados** na suíte total (`pytest tests/`).
  * **939 testes** na suíte unitária (`pytest tests/unit`).
  * **Cobertura Real Medida:** **24,26%** (4.505 statements, 3.189 missed).
* **Veredito:** **DIVERGE**.

### 9.6 Especificação OpenAPI 3.0
* **CONFIRMADO.** Gerada automaticamente pelo FastAPI em `/openapi.json` (42 endpoints mapeados).

### 9.7 Interface Bilingue
* **CONFIRMADO.** Suporte a `pt-BR` e `en-US` via arquivos i18n em `frontend/public/locales/`.

### 9.8 Módulos da Interface
* Os três módulos (**Scientific Database**, **Advanced Analysis**, **References**) existem com esses nomes no frontend.

### 9.9 Typos RGGI vs RCGI
* O repositório registra ocorrências corrigidas do acrônimo RCGI (*Research Centre for Greenhouse Gas Innovation*), prevenindo a confusão com a sigla norte-americana RGGI.

---

## BLOCO 10 — RASTREIO REVERSO DE AFIRMAÇÕES NUMÉRICAS

| Número no Manuscrito | Valor Vigente no Repositório | Fonte (Arquivo:Linha/Chave) | Veredito |
|---|---|---|---|
| **133,82** | 33,99 M m³/d | `backend/app/services/biogas_forward.py:123` | **DIVERGE** (-74,6%) |
| **19,69** | 3,65 M m³/d (script) / 3,06 M m³/d (JSON) | `compute_sp_canonical_totals.py:212` | **DIVERGE** (-81,5%) |
| **14,7%** | 10,73% | Calculado: `3,6488 ÷ 33,9946` | **DIVERGE** |
| **25,1%** | 29,0% (187 mun) / 28,5% (184 mun) | `canonical_results.json:spatial_concentration` | **DIVERGE** |
| **67,0%** | 67,14% | `canonical_results.json:spatial_concentration` | **REPRODUZ** |
| **67,4%** | 60,96% (soma top-5 real) | `canonical_results.json:by_ibge_intermediate_region` | **DIVERGE** |
| **22,6% (Ribeirão Preto)** | 17,08% | `canonical_results.json:by_ibge_intermediate_region[0]` | **DIVERGE** |
| **16,1% (SJRP)** | 12,87% | `canonical_results.json:by_ibge_intermediate_region[1]` | **DIVERGE** |
| **9,9% (Araçatuba)** | 7,42% | `canonical_results.json:by_ibge_intermediate_region[7]` | **DIVERGE** |
| **9,8% (Bauru)** | 8,33% | `canonical_results.json:by_ibge_intermediate_region[4]` | **DIVERGE** |
| **9,0% (Pres. Prudente)** | 7,36% | `canonical_results.json:by_ibge_intermediate_region[8]` | **DIVERGE** |
| **280 m³/dia (Barra do Chapéu)** | 197.820 m³/d (SP max); 280 é o BMP de cama de aviário | `canonical_results.json:by_municipality` | **DIVERGE (Transposição)** |
| **1.782.051 m³/dia (Barretos)** | 197.820 m³/d (SP max) | `canonical_results.json:by_municipality` | **DIVERGE** |
| **125 municípios** | 187 (para 67%) / 12 (acima de 50k m³/d) | `canonical_results.json:spatial_concentration` | **DIVERGE** |
| **19,4%** | 29,0% | `canonical_results.json:spatial_concentration` | **DIVERGE** |
| **50.000 m³/dia** | Limiar descritivo | Texto de discussão | **REPRODUZ (Conceitual)** |
| **58,5%** | 21,4% | Calculado sobre mun ≥ 50k m³/d | **DIVERGE** |
| **13,2% (MAE FIESP)** | Inexistente (11,6% se recarregado) | `FIESP_BENCHMARK_AUDIT_REPORT.md` | **DIVERGE / NÃO VERIFICÁVEL** |
| **2,29 milhões** | 2,29 M m³/d | `MANUSCRIPT` dict em `run_manuscript_validation.py` | **REPRODUZ (Histórico)** |
| **1,8 milhão** | 1,8 M m³/d | `FIESP_BENCHMARK_AUDIT_REPORT.md` | **REPRODUZ (Histórico)** |
| **1,7% (Err Rib Preto)** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **3,1% (Err SJRP)** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **4,2% (Err Araçatuba)** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **18,9% (Err RM SP)** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **20,8% (MAE Plantas)** | 20,8% | `run_manuscript_validation.py:70` (Hardcoded) | **REPRODUZ (Hardcoded)** |
| **15,4%** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **31,7%** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **36,5% / 38,8%** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **6,0% / 42,3%** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **30 km** | Buffer descritivo | `docs/data/BIOGAS_PLANTS_DATASET.md` | **REPRODUZ (Conceitual)** |
| **89,9% ... 84,7% (Tab 4)** | Presentes na Tabela 4 | `BIOGAS_PLANTS_DATASET.md` | **REPRODUZ (Histórico)** |
| **FDE Tabela 3 (0.0% .. 54.5%)** | Invertidos por erro de sinal de FCo | `data/canonical_parameters/feedstocks.yaml:fde` | **DIVERGE (Erro de Sinal)** |
| **FS 0,63** | 0,63 | `feedstocks.yaml:PALHA.fde.components.fs` | **REPRODUZ** |
| **FS 1,0** | 1,00 | `feedstocks.yaml:ORGANICO_RSU.fde.components.fs` | **REPRODUZ** |
| **645** | 645 municípios | `snis_sp_activity_2022.csv` | **REPRODUZ** |
| **30 feedstocks** | 26 feedstocks | `data/canonical_parameters/feedstocks.yaml` | **DIVERGE** |
| **50 residue categories** | 26 feedstocks | `data/canonical_parameters/feedstocks.yaml` | **DIVERGE** |
| **93 biomass categories** | 93 classes MapBiomas | Transposição de classes de uso da terra | **DIVERGE (Transposição)** |
| **85% completude** | 33,18% medido SNIS | `canonical_results.json:coverage.forsu` | **DIVERGE** |
| **60% / 54% cana** | 54% produção nacional | IBGE PAM 2023 | **REPRODUZ** |
| **146 usinas** | 146 usinas | Cadastro UNICA em `docs/data/` | **REPRODUZ** |
| **6,8 milhões bovinos** | 6.812.450 cabeças | IBGE PPM 2023 | **REPRODUZ** |
| **39.400 t/dia RSU** | 39.400 t/dia | Master CSV / CETESB 2023 | **REPRODUZ** |
| **226 dias safra** | 226 dias | Texto descritivo sem constante | **REPRODUZ (Conceitual)** |
| **7,3%** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |
| **8,2 s / 0,9 s** | Inexistente | Sem script de benchmark versionado | **NÃO VERIFICÁVEL** |
| **847 testes** | 1.372 testes (total) / 939 (unit) | `pytest --collect-only` | **DIVERGE** |
| **70% cobertura** | 24,26% | `pytest --cov=app` | **DIVERGE** |
| **11 regiões interm.** | 11 regiões | IBGE / `canonical_results.json` | **REPRODUZ** |
| **7 ha** | Inexistente | Sem fonte no repositório | **NÃO VERIFICÁVEL** |

---

## BLOCO 11 — LACUNAS DE EVIDÊNCIA E PARÂMETROS

### 11.1 Lacunas que um Revisor da CEUS Apontaria
1. **Quebra da Proveniência do JSON:** O hash `feedstocks_yaml_sha256: 113fb331...` no `canonical_results.json` não bate com o `feedstocks.yaml` versionado no Git. O artigo declara reprodutibilidade estrita que o repositório não valida automaticamente no CI.
2. **Ausência de Dados FIESP Desagregados:** O artigo afirma ter validador regional contra a FIESP, mas a FIESP não fornece dados regionais e o repositório não contém essa matriz de comparação.
3. **Ausência de Benchmark de Latência:** A afirmação de aceleração de 8,2 s para 0,9 s não possui script de reprodução nem log de medição.
4. **Contradição na Cobertura do SNIS:** O artigo afirma 85% de completude necessária para replicação, enquanto o dado real do estado de São Paulo no modelo tem apenas 33,18% de dados medidos.

### 11.2 Parâmetros Hardcoded em Código que Deveriam Estar em YAML
* **`UPGRADING_EFFICIENCY = 0.97`** (Eficiência de upgrading biogás → biometano = 97%): Hardcoded na linha 54 de `compute_sp_canonical_totals.py`.
* **`CITRUS_RESIDUE_FRACTION = 0.50`** (Fração de resíduo de citros = 50%): Hardcoded na linha 75 de `compute_sp_canonical_totals.py`.
* **Sugarcane Substream Fractions (0.280 bagaço, 0.030 torta, 0.053 palha, 0.420 vinhaça):** Hardcoded nas linhas 80–105 de `compute_sp_canonical_totals.py`.
* **`SP_POPULATION = 44_411_238`** (População de São Paulo): Hardcoded na linha 63 de `compute_sp_canonical_totals.py`.

### 11.3 Afirmações Qualitativas Apresentadas como Resultado
* **Tipologias Regionais:** A classificação dos municípios em tipologias (ex: "sugarcane-dominated", "livestock-heavy") resulta de regras heurísticas de agrupamento de pós-processamento, e não de um algoritmo estatístico não supervisionado de clustering validado no backend.

---
*Fim do Relatório de Verificação Lote A18 (Incrementado com dados FIESP 2024/2025 e Potencial Teórico Recalibrado).*
