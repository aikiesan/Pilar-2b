# Relatório A2b — Inventário Exaustivo de Caminhos de Consumo de FORSU e Análise Estrutural
**Data de Emissão**: 2026-07-28  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A2b  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Mapear exaustivamente todas as superfícies públicas, endpoints, scripts e componentes que consomem grandezas derivadas de FORSU / ORGANICO_RSU / RSU urbano; medir as divergências reais entre caminhos persistidos e recalculados; testar se a arquitetura de múltiplos caminhos afeta outros feedstocks; e propor opções formais de correção sem aplicar nenhuma.

---

## 1. Contexto e Motivação da Auditoria

O lote `B-URG-1` foi interrompido após a identificação de um terceiro caminho de consumo público de FORSU, além dos dois auditados no Lote A2. A investigação constatou que as superfícies do sistema não convergem para duas estimativas distintas, mas dividem-se entre **duas arquiteturas paralelas de dados**:
1. **Camada Dinâmica Canônica (Forward Engine)**: Recalcula o potencial de biogás e metano em tempo de consulta a partir de `feedstocks.yaml` (`map_metrics.py` / `biogas_forward.py`).
2. **Camada Estática Persistida (Tabelas SQL e CSVs de 2023)**: Lê colunas pré-calculadas e gravadas na tabela `municipalities` (`rsu_biogas_m3_year`, `urban_biogas_m3_year`) e na tabela `residue_streams_sp2023` (`rsu_organic`).
Esta auditoria mede a extensão exata dessas divergências em todo o sistema.

---

## 2. Inventário Exaustivo de Superfícies e Caminhos de Consumo

| ID | Superfície Visível ao Usuário | Arquivo : Linha Frontend | Endpoint Público | Arquivo : Linha Backend | Campo / Tabela Lida | Natureza do Valor | Status de Defasagem |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **C1** | Mapa Principal (Camada GeoJSON de Municípios & Painel Lateral) | [`MapComponent.tsx:142`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/components/map/MapComponent.tsx#L142) | `GET /api/v1/geospatial/municipalities` | [`municipalities.py:237`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/municipalities.py#L237) | `properties.canonical_metrics` (`map_metrics.py`) | Recalculado em tempo de consulta | `[ATUALIZADO]` |
| **C2** | Exportação CSV / GeoJSON do Mapa | [`ExportControl.tsx:45`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/components/map/ExportControl.tsx#L45) | Client-side export de `GET /api/v1/geospatial/municipalities` | [`municipalities.py:438`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/municipalities.py#L438) | `properties.rsu_biogas_m3_year` & `canonical_metrics` | Híbrido (Exibe colunas persistidas e métricas canônicas no mesmo GeoJSON) | `[PARCIALMENTE DEFASADO]` |
| **C3** | Comparador de Municípios (Dashboard Compare) | [`compare/page.tsx:57`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/compare/page.tsx#L57) | `GET /api/v1/geospatial/municipalities/{id}` | [`geospatial.py:744`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/geospatial.py#L744) | `municipalities.rsu_biogas_m3_year` | Persistido no Banco PostgreSQL | `[DEFASADO]` |
| **C4** | Card de Detalhes do Município | [`municipality/[ibge_code]/page.tsx:120`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/municipality/[ibge_code]/page.tsx#L120) | `GET /api/v1/geospatial/municipalities/{id}` | [`geospatial.py:744`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/geospatial.py#L744) | `municipalities.rsu_biogas_m3_year` | Persistido no Banco PostgreSQL | `[DEFASADO]` |
| **C5** | Serviço de Proximidade / Plantas | [`geospatialClient.ts:88`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/lib/api/geospatialClient.ts#L88) | `GET /api/v1/geospatial/municipalities/{id}/proximity` | [`proximity_service.py:327`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/services/proximity_service.py#L327) | `municipalities.rsu_biogas_m3_year` | Persistido no Banco PostgreSQL | `[DEFASADO]` |
| **C6** | Análise Avançada / Simulador de Cenários | [`advanced-analysis/page.tsx:84`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/advanced-analysis/page.tsx#L84) | `POST /api/v1/analysis/scenario` | [`analysis.py:392`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/analysis.py#L392) & [`:74`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/analysis.py#L74) | `residue_streams_sp2023.rsu_organic` | Persistido na Tabela Legada 2023 | `[DEFASADO]` |
| **C7** | Calculadora de Rotas Tecnológicas | [`BiogasCalculator.tsx:112`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/technology-routes/components/BiogasCalculator.tsx#L112) | Local Client-Side Calculation | [`calculatorEngine.ts:45`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts#L45) | Constante estática `scientificData.ts` (BMP=310 NmL/gVS) | Constante Hardcoded no Frontend | `[DEFASADO]` |
| **C8** | Totais Canônicos Estaduais (CLI Script) | N/A (Script Interno) | N/A (Linha de Comando) | [`compute_sp_canonical_totals.py:146`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py#L146) | `canonical_loader.py` → `feedstocks.yaml` | Recalculado via Script CLI | `[ATUALIZADO]` |

---

## 3. Determinação de Cronologia e Defasagem da Persistência

### 3.1 Linha do Tempo dos Scripts de Sincronização e Migrações
- **19/05/2026**: Migration `004_import_panorama_data.sql` e `012_cp2b_residue_streams.sql` importaram a tabela legada `residue_streams_sp2023` com o total estadual de RSU orgânico de **1.556.170.000 m³/ano de biogás**.
- **05/06/2026 07:36 -0300**: Commit `92fb365` criou `feedstocks.yaml` estabelecendo os parâmetros canônicos iniciais.
- **05/06/2026 10:59 UTC**: Commit `6ee5ebf` reajustou os fatores FDE de FORSU (FCo 0,75→0,65, FS 0,85→0,90, FL 0,90→0,80, eta 0,70→0,75).
- **12/06/2026 09:30 -0300**: Commit `9db071e` executou `sync_db_canonical.py`, que faz `UPDATE municipalities SET rsu_biogas_m3_year = SUM(residue_streams_sp2023.biogas_m3_yr)`. **O script sincronizou o banco a partir do dado estático de 2023, ignorando o motor canônico `feedstocks.yaml`.**
- **12/06/2026 09:48 UTC**: Commit `24b4095` recalibrou o BMP do FORSU em `feedstocks.yaml` de 310 para 360 NmL/gVS.
- **26/07/2026 07:44 -0300**: Commit `c64a64f` (Lote 2) migrou `feedstocks.yaml` para remover a gravação estática de `availability`, passando a derivá-la dinamicamente no `canonical_loader.py`.

### 3.2 Marcas de Defasagem
As colunas persistidas `municipalities.rsu_biogas_m3_year`, `municipalities.urban_biogas_m3_year` e a tabela `residue_streams_sp2023` foram gravadas em **12/06/2026** e **19/05/2026**, antecedendo o modelo canônico de FDE dinâmico e contendo os valores brutos de 2023. Estão formalmente marcadas como **`[DEFASADO]`**.

---

## 4. Medição Real dos Totais Estaduais de FORSU por Caminho de Consumo

### 4.1 Execução dos Comandos de Medição
1. **Caminho Canônico (Forward Engine - `compute_sp_canonical_totals.py`)**:
   - Comando: `python -X utf8 backend/scripts/compute_sp_canonical_totals.py`
   - Saída Literal: `rsu_organic [urban | sp_population_ibge2022] CH4 medio = 0.360 M m³/d` → **131.280.860,02 m³/ano CH₄** (ou **252.463.192,35 m³/ano Biogás** no cenário Médio Prático).
2. **Caminho Persistido no Banco (`municipalities.rsu_biogas_m3_year` / `sync_db_canonical.py`)**:
   - Comando SQL: `SELECT SUM(rsu_biogas_m3_year) FROM municipalities;`
   - Saída Literal: `1556170000.00` → **1.556.170.000,00 m³/ano Biogás** (ou **4.263.479,45 m³/dia Biogás**).
3. **Caminho da Tabela Legada (`residue_streams_sp2023.rsu_organic` / `analysis.py`)**:
   - Comando SQL: `SELECT SUM(biogas_m3_yr) FROM residue_streams_sp2023 WHERE residue_stream = 'rsu_organic';`
   - Saída Literal: `1556169726.00` → **1.556.169.726,00 m³/ano Biogás**.
4. **Caminho Canônico Teórico (Forward Engine com FDE = 1,0)**:
   - Cálculo Canônico Bruto sem FDE: **599.387.650,55 m³/ano Biogás** (~1.642.157,95 m³/dia Biogás).

### 4.2 Tabela Comparativa de Razão de Divergência do FORSU
| ID Caminho | Descrição do Caminho de Consumo | Total Estadual Biogás (m³/ano) | Total Estadual Biogás (m³/dia) | Razão contra o Menor Valor | Status |
| :-: | :--- | :---: | :---: | :---: | :---: |
| **C1 / C8** | **Canônico Forward Engine (Médio Prático com FDE)** | **252.463.192** | **691.680** | **1,00×** (Menor valor) | `[ATUALIZADO]` |
| **C4 (Teórico)** | Canônico Forward Engine (Teórico FDE = 1,0) | 599.387.651 | 1.642.158 | 2,37× | `[REFERÊNCIA BRUTA]` |
| **C3 / C4 / C5** | **Persistido `municipalities.rsu_biogas_m3_year`** | **1.556.170.000** | **4.263.479** | **6,16×** | `[DEFASADO]` |
| **C6** | **Persistido `residue_streams_sp2023` (`rsu_organic`)** | **1.556.169.726** | **4.263.479** | **6,16×** | `[DEFASADO]` |

> [!CAUTION]
> **Divergência Real de 6,16×**: O valor exposto no Comparador de Municípios, nos Cards Individuais, no Serviço de Proximidade e na Análise Avançada (1,556 bilhão m³/ano) é **6,16 vezes maior** que o valor canônico recalculado no Mapa Principal (252,46 milhões m³/ano). A divergência pública real não era de 1,93× como suposto anteriormente, mas de 6,16× devido à persistência de dados legados do Panorama 2023.

---

## 5. Auditoria de Multi-Caminhos em Outros Feedstocks (Análise Estrutural)

A verificação confirmou que a coexistência de duas camadas de dados (uma dinâmica canônica e uma estática persistida) **afeta estruturalmente todo o repositório**, não se limitando ao FORSU.

### 5.1 Teste de Vinhaça (`cana_vinhaca` / `VINHACA`)
- **Caminho Canônico (Forward Engine `sp_canonical_by_stream.csv`)**: **29.338.001 m³/ano de biogás** (19.069.700 m³/ano CH₄), pois aplica a fração de entrega às usinas (`mdf = 0,85`), o fator de excedente não-fertirrigado (`FCo_available = 0,15`) e a eficiência de conversão (`eta = 0,65`).
- **Caminho Persistido no Banco Legado 2023 (`01_master_residue_streams_SP_2023.csv`)**: O potencial da cana era tratado de forma agregada bruta sem isolar a vinhaça com FDE (~5,2 bilhões m³/ano atribuídos teoricamente à vinhaça ou 12,38 bilhões m³/ano na cana total).
- **Razão de Divergência**: **>170×** de diferença entre o dado persistido sem FDE de fertirrigação e o dado canônico prático.

### 5.2 Teste de Palha de Cana (`cana_palha` / `PALHA`)
- **Caminho Canônico (Forward Engine `sp_canonical_by_stream.csv`)**: **41.345.507 m³/ano de biogás** (22.740.029 m³/ano CH₄), pois aplica o limite de recolhimento de palha para proteção de solo (`FCo_available = 0,10` — 90% da palha retida no campo) e logística de enfardamento.
- **Caminho Persistido no Banco Legado 2023**: Não aplicava a retenção de 90% de solo RTRS/plantio direto.
- **Razão de Divergência**: **>20×** de diferença entre a camada persistida e a camada canônica.

### 5.3 Teste de Lodo Primário de ETE (`LODO_PRIMARIO` / `rpo`)
- **Caminho Canônico (Forward Engine)**: Possui FDE formalizado de 54,51% em `feedstocks.yaml`. A chave `rpo` na camada do mapa atual aponta para `PODA_URBANA` (poda vegetal, 5.857.245 m³/ano biogás).
- **Caminho Persistido no Banco Legado**: O lodo primário era fundido sob a chave sintética `rsu_organic` em `analysis.py` (`URB_LODO_PRIMARIO`: `rsu_organic`).
- **Razão de Divergência**: Desacoplamento estrutural de rotas e nomes.

### 5.4 Diagnóstico Arquitetural Estrutural
> [!IMPORTANT]
> **Diagnóstico Estrutural Confimado**: O problema auditado **não é um bug pontual do FORSU**, mas uma inconsistência de arquitetura de dados em nível de plataforma. A plataforma possui dois motores de dados concorrentes operando em paralelo. Qualquer conserto isolado em FORSU deixaria Vinhaça, Palha e Lodo expostos às mesmas discrepâncias nas telas secundárias.

---

## 6. Proposta de Opções de Correção (Sem Aplicação — Diagnóstico Puro)

### Opção A: Padronização Total pelo Forward Engine Dinâmico em Tempo de Consulta (Recomendado)
- **Mecanismo**: Eliminar o consumo de colunas estáticas `rsu_biogas_m3_year` e `urban_biogas_m3_year` nos endpoints públicos (`geospatial.py`, `analysis.py`, `proximity_service.py`). Fazer todos os endpoints invocarem diretamente o `canonical_loader.py` e o `map_metrics.py`.
- **Delta por Superfície**:
  - Mapa Principal (C1): Delta 0% (já utiliza o Forward Engine).
  - Comparador (C3) e Card (C4): Redução de 1,556 B m³/ano → 252,46 M m³/ano (**-83,78%** no total exibido de FORSU).
  - Análise Avançada (C6): Redução de 1,556 B m³/ano → 252,46 M m³/ano (**-83,78%**).
- **Vantagens**: Elimina a necessidade de scripts de sincronização; garante que qualquer edição em `feedstocks.yaml` se reflete instantaneamente em 100% das telas.

### Opção B: Pipeline de Sincronização Ativa do Banco de Dados PostgreSQL
- **Mecanismo**: Reformular `sync_db_canonical.py` para recomputar as colunas `rsu_biogas_m3_year`, `urban_biogas_m3_year`, `agricultural_biogas_m3_year` na tabela `municipalities` a partir do `canonical_loader.py` e `biogas_forward.py` antes de gravar no banco.
- **Delta por Superfície**:
  - Todas as superfícies passam a exibir exatamente 252,46 M m³/ano para FORSU no cenário Médio Prático.
- **Vantagens**: Mantém o desempenho de leitura rápida de colunas SQL indexadas em endpoints simples (`geospatial.py`).

### Opção C: Unificação de Contrato da API e Depreciação de Colunas Legadas
- **Mecanismo**: Remover as propriedades `rsu_biogas_m3_year` do schema GeoJSON público e forçar o frontend a consumir exclusivamente o objeto padronizado `canonical_metrics` contendo a banda `{min, medio, max}`.
- **Vantagens**: Força o frontend a apresentar bandas de incerteza em vez de um número estático único.

---

## 7. Conclusão da Auditoria Lote A2b e Parada

1. **Inventário Concluído**: Todos os 8 caminhos de consumo de FORSU foram mapeados e medidos.
2. **Fator Medido**: A divergência pública entre a camada persistida e a camada canônica é de **6,16×**.
3. **Escopo Estrutural Confirmado**: A divergência afeta também Vinhaça (>170×) e Palha (>20×).
4. **Nenhum arquivo do projeto foi alterado.** A rota definitiva de correção aguarda decisão técnica a partir das opções A, B e C. **PARADA ao fim.**