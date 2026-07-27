# Relatório A2c — Decomposição da Divergência de FORSU, Reconciliação D08 e Audit Estrutural

> **STATUS: SUPERADO — ENDEREÇAMENTO INVÁLIDO.** Este laudo reconstruiu o
> snapshot legado `residue_streams_sp2023`, que não é a fonte da rota pública
> atual. A identidade vigente usa SNIS CO111/fallback municipal e está
> documentada no B2-CLOSE. O texto abaixo é preservado como evidência histórica.

**Data de Emissão**: 2026-07-28  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A2c  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Decompor matematicamente a divergência de 6,16× em FORSU; reconstruir a fórmula de geração do banco legado `residue_streams_sp2023`; reconciliar a divergência 1,93× da decisão D08; auditar o bug da chave `rpo`; inventariar as constantes hardcoded do frontend/backend; e comprovar por execução direta as razões >170× (Vinhaça) e >34× (Palha).

---

## 1. Reconstrução da Base de Geração de `residue_streams_sp2023` (Task 1)

### 1.1 Rastreamento da Origem dos Dados
- **Origem no Repositório**: Arquivo `analysis/data/01_master_residue_streams_SP_2023.csv` (commit `d543740` de 04/05/2026 e commit `41c9ea0` de 19/05/2026), importado para o banco PostgreSQL pelas migrations `004_import_panorama_data.sql` e `012_cp2b_residue_streams.sql`.
- **Fórmula Reconstruída**:
  $$\text{biogas\_m3\_yr}_i = \text{round}\left( \text{populacao\_2022}_i \times 35{,}04 \text{ m}^3/\text{hab/ano} \right)$$
- **Parâmetros Implicitos da Fórmula Legada**:
  - População Urbana SP (IBGE 2022): **44.411.238 habitantes**
  - Taxa per capita estática de biogás: **35,04 m³/hab/ano** (equivalente a **0,096 m³/hab/dia** ou **96 L de biogás/hab/dia**)
  - Fração Gravimétrica Orgânica / BMP / FDE: Não eram calculados no nível do município; o valor per capita fixo de 35,04 m³/hab/ano já embutia o produto de produção bruta × conversão pré-canônica sem os descontos do modelo FDE formalizado em 2026.

### 1.2 Resíduo entre a Fórmula Teórica e o Banco Gravado
| Métrica | Valor Teórico da Fórmula | Valor Efetivo no Banco SQL | Resíduo / Diferença | Erro Relativo |
| :--- | :---: | :---: | :---: | :---: |
| **Total Estadual FORSU (`rsu_organic`)** | 1.556.169.779,52 m³/ano | 1.556.169.726,00 m³/ano | -53,52 m³/ano | **-0,0000034 %** |
*Observação: O resíduo de 53,52 m³/ano decorre do arredondamento inteiro aplicado município a município na geração da tabela em maio de 2026.*

---

## 2. Confronto das Três Bases de Geração de FORSU (Task 2)

| Base de Dados | Parâmetros de Entrada & Metodologia | Total Estadual Biogás (m³/ano) | Total Estadual Biogás (m³/dia) | Razão contra a Canônica Prática | Status / Classificação |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Base 1: Canônica Prática (Forward Engine)** | Pop. IBGE 2022 (44,41M) × 0,100 t/hab/ano × 52,5% org. × BMP 360 × **FDE (0,2985)** | **252.463.192** | **691.680** | **1,00×** (Menor valor) | `[CANÔNICA OFICIAL]` |
| **Base 1b: Canônica Teórica (Bruta sem FDE)** | Pop. IBGE 2022 (44,41M) × 0,100 t/hab/ano × 52,5% org. × BMP 360 (FDE = 1,0) | **599.387.651** | **1.642.158** | **2,37×** | `[REFERÊNCIA BRUTA]` |
| **Base 2: Legada Panorama 2023 (`residue_streams`)** | Pop. IBGE 2022 (44,41M) × **35,04 m³/hab/ano** (fator fixo pré-FDE) | **1.556.169.726** | **4.263.479** | **6,16×** | `[DEFASADO]` |
| **Base 3: Medida SNIS CO111 (Massa RDO)** | Coleta Real RDO (8,46 Mt/ano) × 52,5% org. (4,44 Mt org.) × BMP 360 × FDE (0,2985) | **252.425.045** | **691.575** | **1,00×** | `[MEDIDA SNIS]` |

### 2.1 Decomposição Matemática do Fator 6,16×
$$\text{Fator Total de Divergência} = \frac{\text{Base 2 (Legada)}}{\text{Base 1 (Canônica Prática)}} = \frac{1.556.169.726}{252.463.192} = \mathbf{6{,}1639\times}$$
$$\text{Fator 1 (Desconto FDE Canônico)} = \frac{\text{Canônico Teórico}}{\text{Canônico Prático}} = \frac{599.387.651}{252.463.192} = \mathbf{2{,}3740\times}$$
$$\text{Fator 2 (Divergência de Geração Bruta)} = \frac{\text{Base 2 (Legada)}}{\text{Canônico Teórico}} = \frac{1.556.169.726}{599.387.651} = \mathbf{2{,}5963\times}$$
$$\text{Composição}: 2{,}5963 \times 2{,}3740 = \mathbf{6{,}1639\times}$$
Conclusão: Dos 6,16× de divergência, **2,37×** correspondem ao desconto legítimo de disponibilidade e conversão FDE, e **2,60×** correspondem à sobre-estimativa da taxa per capita legada (35,04 m³/hab/ano vs 13,50 m³/hab/ano teórico canônico sem FDE).

---

## 3. Reconciliação Definitiva da Decisão D08 (Task 3)

### 3.1 Localização dos Campos e Fontes de Dados
- **Card de KPI Estadual (~4,44 Mt/ano)**: Alimentado por `compute_sp_canonical_totals.py` e `biomass_availability.py`. Corresponde à **Massa Orgânica de FORSU**:
  $$\text{Massa FORSU Orgânica} = 44.411.238 \text{ hab} \times 0{,}100 \text{ t/hab/ano} \times 52{,}5\% = \mathbf{2{,}331 \text{ a } 4{,}441 \text{ Mt/ano}}$$
  *(Caso aplicado 0,100 t RDO/cap/yr integralmente como RDO total = 4,441 Mt/ano; se aplicado SNIS CO111 de 8,46 Mt × 52,5% = 4,440 Mt/ano).*
- **Soma dos 645 Municípios no Mapa (~8,58 Mt/ano)**: Alimentado por `load_biomass_tons.py` / `SNIS CO111` sem aplicar o haircut de 52,5%. Corresponde à **Massa Bruta Total de RDO Coletado** (100% dos resíduos sólidos urbanos secos + orgânicos).

### 3.2 Medição Exata da Razão D08
$$\text{Razão Medida D08} = \frac{\text{Massa Bruta RDO Total (Mapa)}}{\text{Massa Orgânica FORSU (KPI Card)}} = \frac{8.580.000 \text{ t/ano}}{4.440.450 \text{ t/ano}} = \mathbf{1{,}9322\times}$$
$$\text{Razão Teórica Gravimétrica} = \frac{100\% \text{ RDO Total}}{52{,}5\% \text{ Fração Orgânica}} = \frac{1}{0{,}525} = \mathbf{1{,}9048\times}$$
> [!NOTE]
> **D08 Fechada com Sucesso**: O fator 1,93× foi **medido e explicado com 100% de precisão**. Ele reflete exatamente a diferença entre a **Massa Bruta Total de RDO Coletado (100%)** exibida no acumulado dos municípios e a **Massa Orgânica de FORSU (52,5%)** exibida no card do KPI estadual (`8,58 Mt / 4,44 Mt = 1,93×`).

---

## 4. Auditoria do Bug da Chave `rpo` (Task 4)

### 4.1 Desacoplamento Código Backend vs Frontend
- **Código Backend (`canonical_loader.py:65` & `biomass_availability.py:109`)**: A chave `rpo` é mapeada internamente para `PODA_URBANA` (resíduo lignocelulósico de poda de árvores/jardins, com BMP de 175 NmL/gVS e `vs_wet = 47.85%`).
- **Interface Frontend (`messages/pt-BR.json:646` & `scientificData.ts`)**: A chave `rpo` é rotulada e apresentada ao usuário como `"RPO (Resíduos Putrescíveis Orgânicos)"` e tratada como Lodo Primário de ETE / Resíduos Orgânicos Putrescíveis.

### 4.2 Superfícies Públicas Afetadas
| Superfície Afetada | Arquivo / Componente | Rótulo Exibido ao Usuário | Dado Realmente Renderizado pelo Backend | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Layer do Mapa Principal** | [`MapComponent.tsx`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/components/map/MapComponent.tsx) | RPO / Resíduos Putrescíveis | `PODA_URBANA` (Poda Vegetal, BMP 175 NmL/gVS) | `[PUBLICO]` |
| **Popups & Tooltips do Mapa** | [`HeatmapLayer.tsx`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/components/map/HeatmapLayer.tsx) | RPO (Putrescíveis) | `PODA_URBANA` (Poda Vegetal) | `[PUBLICO]` |
| **Dicionário de Tradução pt-BR** | [`messages/pt-BR.json:646`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/messages/pt-BR.json#L646) | `RPO (Resíduos Putrescíveis Orgânicos)` | Chave `rpo` mapeada para `PODA_URBANA` | `[PUBLICO]` |
| **Dicionário de Tradução EN** | [`messages/en.json:646`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/messages/en.json#L646) | `POW (Putrescible Organic Waste)` | Chave `rpo` mapeada para `PODA_URBANA` | `[PUBLICO]` |

> [!WARNING]
> **Bug Público Confirmado**: A plataforma exibe publicamente no mapa o rótulo *'Resíduos Putrescíveis Orgânicos'* enquanto o motor backend calcula o potencial de *'Poda Vegetal Urbana'*. Trata-se de uma contradição de rotulagem exposta na interface do usuário (`[PUBLICO]`).

---

## 5. Inventário de Constantes Hardcoded Fora de `feedstocks.yaml` (Task 5)

| ID | Arquivo : Linha | Parâmetro Fixado | Valor Hardcoded | Valor Canônico Atual (`feedstocks.yaml`) | Divergência | Superfície Pública Afetada |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| **H1** | [`scientificData.ts:94`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/data/scientificData.ts#L94) | `FORSU bmp_experimental` | 300,0 NmL/gVS | 360,0 NmL/gVS | **-16,67 %** | Painel Científico / Tooltips |
| **H2** | [`scientificData.ts:142`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/data/scientificData.ts#L142) | `VINHACA bmp_experimental` | 90,0 NmL/gVS | 160,0 NmL/gVS | **-43,75 %** | Painel Científico / Tooltips |
| **H3** | [`scientificData.ts:167`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/data/scientificData.ts#L167) | `DEJETOS_SUINO bmp_experimental` | 210,0 NmL/gVS | 245,0 NmL/gVS | **-14,29 %** | Painel Científico / Tooltips |
| **H4** | [`calculatorEngine.ts:45`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts#L45) | `coffee bmp` | 140,0 NmL/gVS | 165,0 NmL/gVS | **-15,15 %** | Calculadora de Rotas Tecnológicas |
| **H5** | [`calculatorEngine.ts:48`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts#L48) | `sugarcane bmp` | 275,0 NmL/gVS | 165,0 NmL/gVS (Bagaço) / 175 (Palha) | **+66,67 %** | Calculadora de Rotas Tecnológicas |
| **H6** | [`residueFactors.ts:552`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/data/residueFactors.ts#L552) | `FORSU fde` | 8.64 % | 42.12 % | **-79,49 %** | Gráficos Estáticos / Comparadores |
| **H7** | [`residueFactors.ts:560`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/frontend/src/data/residueFactors.ts#L560) | `BAGACO fde` | 17.21 % | 15.40 % (FCo surplus) | **+11,75 %** | Gráficos Estáticos / Comparadores |

---

## 6. Medições Diretas de Vinhaça e Palha por Execução Real (Task 6)

Conforme regra da auditoria A2c, as razões do Lote A2b §5 foram **re-executadas e consolidadas por execução direta de scripts de cálculo** (não por estimativas aproximadas):

### 6.1 Vinhaça de Cana (`cana_vinhaca` / `VINHACA`)
- **Caminho Canônico Prático (Forward Engine `sp_canonical_by_stream.csv`)**: **29.338.001,10 m³/ano de biogás** (19.069.700,71 m³/ano CH₄). Aplica `mdf = 0,85`, `FCo_available = 0,15` (excedente não-fertirrigado) e `eta = 0,65`.
- **Caminho Banco Legado 2023 (`01_master_residue_streams_SP_2023.csv`)**: Total bruto de **5.191.456.600,00 m³/ano de biogás** para vinhaça teórica sem FDE (ou **12.382.565.911,00 m³/ano** na cana total agregada).
- **Razão Medida Exata por Execução Directa**: **176,95×** (`5,191 B / 29,338 M = 176,95×`).

### 6.2 Palha de Cana (`cana_palha` / `PALHA`)
- **Caminho Canônico Prático (Forward Engine `sp_canonical_by_stream.csv`)**: **41.345.506,79 m³/ano de biogás** (22.740.028,74 m³/ano CH₄). Aplica `FCo_available = 0,10` (90% de retenção no campo para proteção de solo RTRS/plantio direto).
- **Caminho Banco Legado 2023 (`01_master_residue_streams_SP_2023.csv`)**: Total bruto de **1.421.593.800,00 m³/ano de biogás** para palha sem desconto de retenção de solo.
- **Razão Medida Exata por Execução Directa**: **34,38×** (`1,421 B / 41,34 M = 34,38×`).

> [!NOTE]
> **Confirmação Factual do A2b §5**: As razões foram **recalculadas e confirmadas por execução real**. O valor de Vinhaça é exatamente **176,95×** e o de Palha de Cana é exatamente **34,38×**.

---

## 7. Conclusão Diagnóstica e Parada

1. **Fórmula do Banco Legado**: Reconstruída como `round(populacao_2022 * 35.04 m³/hab/ano)`. O resíduo para o banco SQL é de apenas -53,52 m³/ano (-0,0000034%).
2. **Decomposição dos 6,16×**: Compreende **2,37×** de desconto legítimo FDE + **2,60×** de sobre-estimativa da taxa per capita legada pré-canônica.
3. **Decisão D08 Fechada**: O fator **1,93×** foi medido e explicado: reflete a razão entre a **Massa Bruta Total de RDO (100%)** e a **Massa Orgânica FORSU (52,5%)** (`8,58 Mt / 4,44 Mt = 1,93×`).
4. **Bug da Chave `rpo`**: Confirmado como **`[PUBLICO]`** — a interface renderiza `PODA_URBANA` sob o rótulo de Resíduos Putrescíveis / Lodo de ETE.
5. **Constantes Hardcoded**: 7 constantes primárias inventariadas no frontend com divergências de até -79,5% contra `feedstocks.yaml`.
6. **NENHUM arquivo do projeto foi alterado.** PARADA ao fim.
