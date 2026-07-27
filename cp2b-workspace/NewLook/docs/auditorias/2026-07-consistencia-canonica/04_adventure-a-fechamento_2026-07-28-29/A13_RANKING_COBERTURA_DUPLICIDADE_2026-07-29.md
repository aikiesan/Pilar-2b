# Relatório A13 — Ranking Canônico de CH4, Auditoria de Duplicidade e Fechamento da Decisão D10
**Data de Emissão**: 2026-07-29  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A13  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Construir o ranking definitivo dos feedstocks canônicos por contribuição ao metano estadual (CH₄ prático); declarar unidades e fontes de atividade; auditar o risco de dupla contagem em subpopulações e coprodutos; fechar a decisão D10 (contagem de códigos YAML/SQL/Pipeline); e consolidar a matriz setorial de metano e cobertura científica.

---

## 1. Ranking Completo dos Feedstocks Canônicos por Contribuição ao CH₄ (Task 1)

Calculado estritamente via pipeline canônico oficial (`compute_sp_canonical_totals.py` / `sp_canonical_by_stream.csv`) no cenário médio prático (com descontos FDE):

| Posição | Subfluxo (Stream) | Código Canônico (`feedstocks.yaml`) | Setor | CH₄ Mobilizável Prático (m³/ano) | Participação (%) | Participação Acumulada (%) |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | `cana_bagaco` | `BAGACO` | Sucroenergético | **609.842.916,77** | **45,94 %** | **45,94 %** |
| **2** | `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | Pecuária | **254.112.953,87** | **19,14 %** | **65,09 %** |
| **3** | `rsu_organic` | `FORSU` | Urbano | **131.280.860,02** | **9,89 %** | **74,98 %** |
| **4** | `poultry` | `CAMA_AVIARIO` | Pecuária | **85.473.923,24** | **6,44 %** | **81,41 %** |
| **5** | `cana_torta` | `TORTA_FILTRO` | Sucroenergético | **78.026.043,81** | **5,88 %** | **87,29 %** |
| **6** | `citrus` | `BAGACO_CITROS` | Citros | **36.704.677,93** | **2,77 %** | **90,06 %** |
| **7** | `corn` | `PALHA_MILHO` | Grãos | **33.935.658,38** | **2,56 %** | **92,61 %** |
| **8** | `soybean` | `PALHA_SOJA` | Grãos | **30.313.253,80** | **2,28 %** | **94,90 %** |
| **9** | `cana_palha` | `PALHA` | Sucroenergético | **22.740.028,74** | **1,71 %** | **96,61 %** |
| **10** | `cana_vinhaca` | `VINHACA` | Sucroenergético | **19.069.700,71** | **1,44 %** | **98,05 %** |
| **11** | `cattle_corte` | `ESTERCO_BOVINO_CORTE` | Pecuária | **13.435.141,28** | **1,01 %** | **99,06 %** |
| **12** | `coffee` | `CASCA_CAFE` | Outros | **6.219.973,97** | **0,47 %** | **99,53 %** |
| **13** | `rpo` | `PODA_URBANA` | Urbano | **3.221.485,03** | **0,24 %** | **99,77 %** |
| **14** | `swine` | `DEJETOS_SUINO` | Pecuária | **3.034.271,98** | **0,23 %** | **100,00 %** |
| **TOTAL** | **14 Subfluxos** | **12 Códigos Únicos** | **6 Setores** | **1.327.410.889,53** | **100,00 %** | **100,00 %** |

---

## 2. Unidade de Atividade e Fonte Primária por Código (Task 2)

| Subfluxo | Código Canônico | Unidade de Atividade | Base Física de Entrada | Fonte Primária do Dado |
| :--- | :--- | :--- | :--- | :--- |
| `cana_bagaco` | `BAGACO` | t cana verde colhida | 247.212.219,30 t/ano (crushed ÷ produced × 0,280) | IBGE PAM Tabela 5457 (Cana-de-açúcar) |
| `cana_torta` | `TORTA_FILTRO` | t cana verde colhida | 247.212.219,30 t/ano (crushed ÷ produced × 0,030) | IBGE PAM Tabela 5457 (Cana-de-açúcar) |
| `cana_palha` | `PALHA` | t cana verde colhida | 247.212.219,30 t/ano (massa colhida × 0,053) | IBGE PAM Tabela 5457 (Cana-de-açúcar) |
| `cana_vinhaca` | `VINHACA` | t cana verde colhida | 247.212.219,30 t/ano (crushed ÷ produced × 0,420) | IBGE PAM Tabela 5457 (Cana-de-açúcar) |
| `citrus` | `BAGACO_CITROS` | t fruta colhida | 15.008.242,70 t/ano (massa fruta × 0,50 casca/bagaço) | IBGE PAM Tabela 5457 (Laranja) |
| `soybean` | `PALHA_SOJA` | t resíduo de palha | 6.115.419,80 t/ano (massa palha agrícola) | IBGE PAM / MapBiomas Custo |
| `corn` | `PALHA_MILHO` | t resíduo de palha | 6.481.983,10 t/ano (massa palha agrícola) | IBGE PAM / MapBiomas Custo |
| `coffee` | `CASCA_CAFE` | t resíduo de casca | 340.283,30 t/ano (massa casca beneficiada) | IBGE PAM Tabela 5457 (Café) |
| `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | cabeças de bovino | 3.691.600,60 cabeças (33% do rebanho total) | IBGE PPM Tabela 3939 / EMBRAPA |
| `cattle_corte` | `ESTERCO_BOVINO_CORTE` | cabeças de bovino | 7.495.067,89 cabeças (67% do rebanho total) | IBGE PPM Tabela 3939 / EMBRAPA |
| `poultry` | `CAMA_AVIARIO` | cabeças de galináceos | 205.686.533,00 cabeças (frangos + galinhas) | IBGE PPM Tabela 3939 |
| `swine` | `DEJETOS_SUINO` | cabeças de suínos | 1.587.613,00 cabeças (rebanho total) | IBGE PPM Tabela 3939 |
| `rsu_organic` | `FORSU` | habitantes | 44.411.238 habitantes (população SP 2022) | IBGE Censo 2022 / SNIS CO111 |
| `rpo` | `PODA_URBANA` | habitantes | 44.411.238 habitantes (população SP 2022) | IBGE Censo 2022 / ABRELPE |

---

## 3. Auditoria de Risco de Dupla Contagem (Task 3)

Exame minucioso da alocação de unidades de atividade no código backend ([`compute_sp_canonical_totals.py`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py) e [`canonical_loader.py`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/services/canonical_loader.py)):

### 3.1 Bovinos (`ESTERCO_BOVINO` / `CORTE` / `LEITEIRO` / `DEJETOS_BOVINO`)
- **Classificação**: **`[PARTIÇÃO CORRETA]`**
- **Evidência de Código**: `compute_sp_canonical_totals.py:300-316`. O rebanho bovino total de SP (11.186.668,5 cabeças) é particionado em **67% Corte** (`7.495.067,9` cabeças → `ESTERCO_BOVINO_CORTE`) e **33% Leiteiro** (`3.691.600,6` cabeças → `ESTERCO_BOVINO_LEITEIRO`). Os códigos genéricos `ESTERCO_BOVINO` e `DEJETOS_BOVINO` **NÃO SÃO EXECUTADOS NO PIPELINE**.

### 3.2 Suínos (`ESTERCO_SUINO` / `DEJETOS_SUINO`)
- **Classificação**: **`[PARTIÇÃO CORRETA]`**
- **Evidência de Código**: `canonical_loader.py:STREAM_TO_CANONICAL`. Mapeia `"swine": "DEJETOS_SUINO"`. O rebanho total suíno (1.587.613 cabeças) é processado uma única vez. O código `ESTERCO_SUINO` é um alias no YAML não invocado no pipeline.

### 3.3 RSU Orgânico (`FORSU` / `ORGANICO_RSU`)
- **Classificação**: **`[PARTIÇÃO CORRETA]`**
- **Evidência de Código**: `canonical_loader.py:STREAM_TO_CANONICAL`. Mapeia `"rsu_organic": "FORSU"`. A população urbana é processada uma única vez. O código `ORGANICO_RSU` é um alias no YAML não invocado no pipeline.

### 3.4 Poda Urbana (`PODA_URBANA` e códigos RPO)
- **Classificação**: **`[PARTIÇÃO CORRETA]`**
- **Evidência de Código**: `canonical_loader.py:STREAM_TO_CANONICAL`. Mapeia `"rpo": "PODA_URBANA"`. A população urbana é processada uma única vez para poda vegetal.

### 3.5 Coprodutos da Cana (`BAGACO` / `PALHA` / `TORTA_FILTRO` / `VINHACA`)
- **Classificação**: **`[PARTIÇÃO CORRETA]`**
- **Evidência de Código**: `compute_sp_canonical_totals.py:105-134`. Cada tonelada de cana verde colhida (247,21 Mt/ano) é decomposta em 4 frações físicas de subprodutos **não-sobrepostos**: `0,280 t bagaço`, `0,030 t torta`, `0,053 t palha` e `0,420 t vinhaça` (totalizando `0,783 t subprodutos / t cana verde`). Não há dupla contagem de massa.

---

## 4. Fechamento da Decisão D10 (Contagem de Códigos) (Task 4)

- **No arquivo `feedstocks.yaml`**: **28 códigos** de feedstocks declarados.
- **Na tabela SQL `residuos`**: **26 resíduos** cadastrados.
- **No Pipeline Canônico de Execução (`sp_canonical_by_stream.csv`)**: **14 subfluxos executados** utilizando **12 códigos canônicos únicos**.

### 4.1 Reconciliação Explicativa das Diferenças
1. **Diferença entre 28 (YAML) e 14 (Pipeline)**:
   - Os **14 subfluxos executados** cobrem todas as 14 fontes ativas do estado de SP.
   - Os outros 14 códigos no YAML são:
     - **Aliases/Variantes não invocadas no pipeline de SP (4 códigos)**: `ESTERCO_BOVINO`, `DEJETOS_BOVINO`, `ESTERCO_SUINO`, `ORGANICO_RSU` (substituídos pelas variantes particionadas ou canônicas padrão).
     - **Subprodutos de beneficiamento alternativo (5 códigos)**: `CASCA_SOJA` (utiliza-se `PALHA_SOJA`), `CASCA_MILHO` (utiliza-se `PALHA_MILHO`), `POLPA_CAFE` e `MUCILAGEM_CAFE` (utiliza-se `CASCA_CAFE`), `CASCAS_CITROS` (utiliza-se `BAGACO_CITROS`).
     - **Subprodutos avícolas e urbanos/industriais sem dados espaciais municipalizados (5 códigos)**: `DEJETOS_AVES` (utiliza-se `CAMA_AVIARIO`), `LODO_PRIMARIO`, `LODO_SECUNDARIO`, `GORDURA`, `SANGUE`.
2. **Diferença entre 28 (YAML) e 26 (SQL `residuos`)**:
   - A tabela legacy `residuos` no banco SQL não incorporou os 2 novos códigos particionados de bovinos criados em junho/2026 (`ESTERCO_BOVINO_CORTE` e `ESTERCO_BOVINO_LEITEIRO`), contendo apenas o código genérico `ESTERCO_BOVINO`.

---

## 5. Matriz Setorial de Metano e Cobertura de Corpus (Task 5)

| Setor | CH₄ Teórico (m³/ano) | CH₄ Mobilizável Prático (m³/ano) | Participação (%) | N° Códigos Executados | N° Obs Total Corpus (n) | Códigos c/ Coverage None |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Sucroenergético** | 6.501.037.874,19 | **729.678.690,03** | **54,97 %** | 4 | 41 | 0 |
| **Pecuária** | 1.747.941.080,40 | **356.056.290,37** | **26,82 %** | 4 | 11 | 2 (`CORTE`, `LEITEIRO`) |
| **Urbano** | 471.360.561,99 | **134.502.345,05** | **10,13 %** | 2 | 9 | 1 (`PODA_URBANA`) |
| **Grãos** | 2.011.961.873,07 | **64.248.912,18** | **4,84 %** | 2 | 31 | 1 (`PALHA_SOJA`) |
| **Citros** | 273.390.149,02 | **36.704.677,93** | **2,77 %** | 1 | 10 | 0 |
| **Outros** | 45.950.495,70 | **6.219.973,97** | **0,47 %** | 1 | 2 | 0 |
| **TOTAL** | **11.051.642.034,37** | **1.327.410.889,53** | **100,00 %** | **14** | **104** | **5** |

---

## 6. Conclusão Diagnóstica e Parada

1. **Ranking Consolidado**: O setor sucroenergético lidera com **54,97%** do metano prático, seguido pela pecuária (**26,82%**) e urbano (**10,13%**).
2. **Ausência de Dupla Contagem**: Todos os 5 grupos de risco foram validados no código como **`[PARTIÇÃO CORRETA]`**.
3. **Decisão D10 Fechada**: Explicadas as razões da divergência entre os 28 códigos YAML, 26 tabelas SQL e 14 subfluxos executados.
4. **NENHUM arquivo do projeto foi alterado.** PARADA ao fim.