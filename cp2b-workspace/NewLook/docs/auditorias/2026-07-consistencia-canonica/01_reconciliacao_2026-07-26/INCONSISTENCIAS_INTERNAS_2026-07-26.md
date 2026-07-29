# Relatório de Diagnóstico de Inconsistências Internas — PILAR-2b (2026-07-26)

**Escopo:** Lote 2c — Diagnóstico e Somente Leitura (Nenhuma alteração em `feedstocks.yaml` ou no código).  
**Branch:** `fix/canonical-consistency-2026-07`  
**Estado Congelado de Referência:** `docs/data/estado_2026-07-26_lote2.json`

---

## Executive Summary

Este documento consolida a investigação forense de consistência interna dos parâmetros do PILAR-2b, dividida em três frentes:

1. **2c-a) Vinhaça:** Reconstrução matemática completa do rendimento implícito, identificando a etapa exata de desvio da literatura.
2. **2c-b) RSU / FORSU:** Análise do conflito entre os dois fatores de fração orgânica (0,100 t/cap/ano ≈ 27,4% vs 52,5% declarados no YAML) e mapeamento do consumo de ambos no pipeline.
3. **2c-c) Varredura dos 28 Feedstocks:** Tabela integral dos 28 substratos canônicos com parâmetros, metadados do corpus, rendimento implícito por tonelada úmida (ou m³ líquido) e mapeamento de dupla declaração / valores divergentes no ecossistema.

---

## 2c-a) VINHAÇA: Reconstrução do Rendimento Implícito e Diagnóstico

### 1. Reconstrução Matemática Completa

O cálculo da geração de biometano da vinhaça no motor de cálculo (`biogas_forward.py`) é dado por:

$$\text{CH}_4 \text{ [m}^3/\text{t úmida]} = \text{TS [\%]} \times \frac{\text{VS}}{\text{TS}} [\%] \times \text{BMP [NmL CH}_4/\text{g VS]}$$

Para a **Vinhaça de cana-de-açúcar (`VINHACA`)** com os parâmetros médios vigentes em `feedstocks.yaml`:
- $\text{TS}_{\text{medio}} = 3{,}0\%$ (0,030 kg TS / kg vinhaça úmida = 30 kg TS / m³)
- $(\text{VS}/\text{TS})_{\text{medio}} = 60{,}0\%$ (0,60 kg VS / kg TS = 18 kg VS / m³)
- $\text{BMP}_{\text{medio}} = 160{,}0 \text{ NmL CH}_4/\text{g VS}$ (0,160 m³ CH₄ / kg VS)

$$\text{Rendimento Implícito} = 1000 \text{ kg/m}^3 \times 0{,}030 \times 0{,}60 \times 0{,}160 = \mathbf{2{,}88 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3 \text{ vinhaça}}$$

### 2. Rendimento Implícito ANTES e DEPOIS do Commit `24b4095`

- **ANTES de `24b4095`:** $\text{BMP}_{\text{medio}} = 90{,}0 \text{ NmL/g VS}$
  $$\text{Rendimento ANTES} = 30 \text{ kg TS/m}^3 \times 0{,}60 \times 0{,}090 = \mathbf{1{,}62 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$
- **DEPOIS de `24b4095`:** $\text{BMP}_{\text{medio}} = 160{,}0 \text{ NmL/g VS}$ (+77,8%)
  $$\text{Rendimento DEPOIS} = 30 \text{ kg TS/m}^3 \times 0{,}60 \times 0{,}160 = \mathbf{2{,}88 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$

### 3. Em Qual Etapa o Valor Sai da Faixa da Literatura?

- **Faixa de Literatura (SP):** **6,0 a 10,0 Nm³ CH₄ / m³ de vinhaça** (corresponde a uma DQO de ~45–65 g/L e teor de sólidos voláteis de ~35–45 kg VS/m³).
- **Razão PILAR-2b / Limite Inferior da Literatura:**
  $$\frac{2{,}88}{6{,}00} = \mathbf{0{,}48} \quad (\mathbf{48{,}0\%} \text{ do limite inferior da faixa})$$
- **Diagnóstico da Etapa:**
  - O $\text{BMP}_{\text{medio}}$ de $160 \text{ NmL/g VS}$ está **dentro** da faixa normal de degradabilidade biológica do corpus (mediana do corpus $n=7$ é $180 \text{ NmL/g VS}$). O BMP **não** é o gargalo.
  - O desvio ocorre inteiramente na composição física: $\text{TS} = 3{,}0\%$ e $\text{VS}/\text{TS} = 60\%$ resultam em apenas **18 kg VS / m³** (1,8% de matéria orgânica no líquido úmido). Na vinhaça industrial de usinas em SP, os sólidos totais variam de 4,5% a 6,5% e a fração volátil é de 70% a 80%.
  - O aumento expressivo de BMP no commit `24b4095` (+77,8%) foi insuficiente para colocar o rendimento na faixa da literatura porque o erro está na subestimativa de TS e VS/TS.

### 4. Consistência de Unidades

- **Caminho de Geração:** `compute_sp_canonical_totals.py` utiliza $0{,}420 \text{ t vinhaça / t de cana moída}$ ($12 \text{ L vinhaça / L EtOH} \times 1{,}01 \text{ kg/L} / 340 \text{ Mt cana}$).
- **Densidade:** A densidade da vinhaça é $\approx 1{,}01 \text{ t/m}^3 \approx 1{,}0 \text{ t/m}^3$.
- No motor de cálculo, $1 \text{ t de vinhaça úmida} \equiv 1 \text{ m}^3 \text{ de vinhaça}$. As unidades $\text{Nm}^3 \text{ CH}_4/\text{t}$ e $\text{Nm}^3 \text{ CH}_4/\text{m}^3$ são numericamente idênticas e preservadas em todo o pipeline.

---

## 2c-b) RSU / FORSU: Conflito de Fração Orgânica (27,4% vs 52,5%)

### 1. As Duas Declarações no `feedstocks.yaml`

No mesmo arquivo `data/canonical_parameters/feedstocks.yaml`, sob o código `FORSU`:
1. `generation.t_per_capita_yr.medio`: **0,100 t/habitante/ano** de substrato orgânico.
2. `organic_fraction_of_rdo.medio`: **0,525 (52,5%)** da massa de RSU coletada.

### 2. Origem e Fator de Discrepância

- **Geração Média de RSU em SP:** $\sim 1{,}0 \text{ kg/hab/dia} = 0{,}365 \text{ t/hab/ano}$ (dado padrão ABRELPE/SNIS para o estado de São Paulo).
- **Fração Orgânica Implícita via `generation`:**
  $$\frac{0{,}100 \text{ t/hab/ano}}{0{,}365 \text{ t/hab/ano}} \approx \mathbf{27{,}4\%}$$
- **Razão entre as duas declarações:**
  $$\frac{52{,}5\%}{27{,}4\%} = \mathbf{1{,}916 \approx 1{,}94}$$

### 3. Consumo no Pipeline

Os dois parâmetros são consumidos em pontos **diferentes e isolados** do sistema:
- **`compute_sp_canonical_totals.py` (Script de Totais Estaduais Canônicos):**  
  Aplica `biomass_tons_from_units("rsu_organic", pop)`, que lê `generation.t_per_capita_yr` (**0,100 t/hab/ano**). Para a população de SP (~44,4 milhões), projeta ~4,44 Mt/ano de FORSU úmida, gerando **0,3597 Mm³/d de CH₄ médio** (terceiro maior stream do estado).
- **`municipalities.py` (API de Detalhamento Municipal):**  
  Quando a tonelagem coletada de RSU (SNIS CO111) está disponível no município, aplica `biomass_tons_from_collected_waste()`, que lê `organic_fraction_of_rdo` (**52,5%**).

### 4. Hipótese de Haircut Não Declarado

A nota interna de `generation` indica: *"SNIS 2022: SP state urban MSW ~550 g/cap/day; organic fraction ~50% -> 0.10 t/cap/yr"*.  
No entanto, se a geração real de RSU for $1{,}0 \text{ kg/hab/dia}$, o valor de $0{,}100 \text{ t/hab/ano}$ embute um **haircut velado de ~48%** (supondo que apenas metade do RSU gerado ou da fração orgânica seja segregável/coletável).  
De acordo com os princípios aplicados no Lote 2 (remoção de `availability` persistido), haircuts de disponibilidade física ou de adesão à coleta seletiva devem ser fatores explícitos no bloco `fde.components` ($\text{FC}$ / $\text{FCo}$), e jamais mantidos escondidos dentro do fator de geração por habitante.

---

## 2c-c) Varredura dos 28 Feedstocks Canônicos

### 1. Duplas Declarações e Fragmentação de Parâmetros

A varredura completa identificou as seguintes classes de desconexão e duplas declarações no repositório:

1. **Subfluxos de Cana-de-Açúcar (`BAGACO`, `PALHA`, `TORTA_FILTRO`, `VINHACA`):**
   - No `feedstocks.yaml`, apenas `BAGACO` possui `rpr` (0,28) e `mill_delivery_fraction` (0,85).
   - No script `compute_sp_canonical_totals.py` (linhas 100–120), as frações de geração de `torta` (0,030 t/t) e `vinhaça` (0,420 t/t) estão hardcoded no array `SUGARCANE_SUBSTREAMS`, em vez de estarem centralizadas no YAML.
2. **Desmembramento Bovino (`ESTERCO_BOVINO` vs `CORTE` / `LEITEIRO`):**
   - O agregado `ESTERCO_BOVINO` declara `generation` = 3,65 t/cab/ano (10 kg/dia).
   - Os subgrupos declaram `CORTE` = 2,92 t/cab/ano (8 kg/dia) e `LEITEIRO` = 5,11 t/cab/ano (14 kg/dia). A média ponderada (67% corte / 33% leiteiro) resulta em $0{,}67 \times 2{,}92 + 0{,}33 \times 5{,}11 = 3{,}643 \text{ t/cab/ano}$, perfeitamente consistente com o agregado.
3. **Substratos Urbanos e ETEs:**
   - `FORSU` contém a dupla declaração explicada no item 2c-b (`generation` vs `organic_fraction_of_rdo`).
   - `LODO_PRIMARIO` possui bloco `generation` (0,073 t/hab/ano), enquanto `LODO_SECUNDARIO` não possui `generation` no YAML (seu fluxo é derivado ou acoplado).
4. **Valores Estáticos Legados no Frontend (`frontend/src/data/residueFactors.ts`):**
   - O arquivo do frontend mantém uma tabela estática desacoplada (`DETAILED_RESIDUES`) derivada do antigo arquivo `FDE_Disponibilidade_Residuos_CP2B.csv` com valores legados (ex: FORSU BMP=350, Lodo Primário BMP=250, Lodo Secundário BMP=280), que divergem do `feedstocks.yaml` canônico.

---

### 2. Tabela Geral de Parâmetros e Rendimentos Implícitos dos 28 Feedstocks

A tabela a seguir apresenta os parâmetros vigentes no `feedstocks.yaml`, a comparação do $\text{BMP}_{\text{medio}}$ com a mediana do corpus ($n \ge 1$) e o rendimento teórico implícito calculados por:

$$\text{Rendimento Implícito [Nm}^3 \text{ CH}_4 / \text{t úmida ou m}^3 \text{ líquido]} = \frac{\text{TS}}{100} \times \frac{\text{VS}}{\text{TS}} \times \text{BMP}$$

| Código Canônico | Nome em Português | TS (%) | VS/TS (%) | BMP médio (NmL/gVS) | Mediana Corpus (n) | Razão BMP / Corpus | Rendimento CH₄ (Nm³/t úmida) |
|---|---|---:|---:|---:|---|---:|---:|
| `BAGACO` | Bagaço de cana-de-açúcar | 58,90 | 90,00 | 165,0 | 191,9 (n=6) | 0,86 | 87,47 |
| `PALHA` | Palha de cana-de-açúcar | 30,00 | 82,00 | 175,0 | 293,5 (n=14) | **0,60** ⚠️ | 43,05 |
| `VINHACA` | Vinhaça de cana-de-açúcar | 3,00 | 60,00 | 160,0 | 180,0 (n=7) | 0,89 | **2,88** ⚠️ |
| `TORTA_FILTRO` | Torta de filtro | 38,00 | 80,00 | 280,0 | 365,0 (n=14) | 0,77 | 85,12 |
| `BAGACO_CITROS` | Bagaço de citros | 18,00 | 88,00 | 230,0 | 289,0 (n=10) | 0,80 | 36,43 |
| `CASCAS_CITROS` | Cascas de citros | 20,00 | 88,00 | 210,0 | 398,0 (n=1) | **0,53** ⚠️ | 36,96 |
| `CASCA_CAFE` | Casca de café | 88,00 | 93,00 | 165,0 | 163,8 (n=2) | 1,01 | 135,04 |
| `POLPA_CAFE` | Polpa de café | 20,00 | 86,00 | 245,0 | 317,0 (n=1) | 0,77 | 42,14 |
| `MUCILAGEM_CAFE` | Mucilagem de café | 8,00 | 90,00 | 320,0 | Sem corpus (n=0) | — | 23,04 |
| `CASCA_SOJA` | Casca de soja | 90,00 | 93,00 | 300,0 | Sem corpus (n=0) | — | 251,10 |
| `PALHA_SOJA` | Palha de soja | 84,00 | 85,00 | 220,0 | Sem corpus (n=0) | — | 157,08 |
| `PALHA_MILHO` | Palha de milho | 82,00 | 86,00 | 230,0 | 390,0 (n=31) | **0,59** ⚠️ | 162,20 |
| `CASCA_MILHO` | Casca de milho | 88,00 | 85,00 | 145,0 | 307,0 (n=30) | **0,47** ⚠️ | 108,46 |
| `CAMA_AVIARIO` | Cama de aviário | 25,00 | 69,80 | 280,0 | 300,0 (n=1) | 0,93 | 48,86 |
| `DEJETOS_AVES` | Dejetos frescos de aves | 15,00 | 75,00 | 250,0 | 414,0 (n=2) | **0,60** ⚠️ | 28,12 |
| `ESTERCO_BOVINO` | Esterco bovino (agregado) | 25,00 | 78,00 | 200,0 | Sem corpus (n=0) | — | 39,00 |
| `ESTERCO_BOVINO_CORTE` | Bovino de corte (extensivo) | 22,00 | 72,00 | 120,0 | Sem corpus (n=0) | — | 19,01 |
| `ESTERCO_BOVINO_LEITEIRO` | Bovino leiteiro (intensivo) | 25,00 | 80,00 | 230,0 | Sem corpus (n=0) | — | 46,00 |
| `DEJETOS_BOVINO` | Dejetos líquidos bovinos | 8,00 | 78,00 | 155,0 | Sem corpus (n=0) | — | 9,67 |
| `DEJETOS_SUINO` | Dejetos líquidos de suínos | 3,00 | 80,00 | 245,0 | 265,0 (n=10) | 0,92 | 5,88 |
| `ESTERCO_SUINO` | Esterco sólido de suínos | 28,00 | 83,00 | 235,0 | Sem corpus (n=0) | — | 54,61 |
| `FORSU` | FORSU (separada na fonte) | 30,58 | 85,00 | 360,0 | 472,0 (n=9) | 0,76 | 93,57 |
| `ORGANICO_RSU` | Mistura orgânica RSU | 30,58 | 82,00 | 270,0 | Sem corpus (n=0) | — | 67,70 |
| `LODO_PRIMARIO` | Lodo primário ETE | 15,00 | 68,00 | 310,0 | 370,0 (n=11) | 0,84 | 31,62 |
| `LODO_SECUNDARIO` | Lodo secundário ETE | 15,00 | 63,00 | 180,0 | 310,0 (n=8) | **0,58** ⚠️ | 17,01 |
| `PODA_URBANA` | Resíduo de poda urbana | 55,00 | 87,00 | 175,0 | Sem corpus (n=0) | — | 83,74 |
| `GORDURA` | Gordura e sebo animal | 95,00 | 98,00 | 850,0 | 859,0 (n=2) | 0,99 | 791,35 |
| `SANGUE` | Sangue animal | 18,00 | 93,00 | 450,0 | Sem corpus (n=0) | — | 75,33 |

---

## Observações Críticas de Destaque para Decisão

1. **Vinhaça (I1):** O rendimento implícito de $2{,}88 \text{ Nm}^3/\text{m}^3$ viola o limite inferior da literatura (6,0 a 10,0 Nm³/m³). A correção exigirá revisar $\text{TS}$ (de 3,0% para ~5,0%) e/ou $\text{VS}/\text{TS}$ (de 60% para ~75%), mantendo o BMP ancorado no corpus primário (não no benchmark FIESP).
2. **FORSU (I2):** Definir se a geração por habitante deve ser unificada em $0{,}1916 \text{ t/hab/ano}$ (correspondente a $1{,}0 \text{ kg/hab/dia} \times 52{,}5\%$) ou se a fração de coleta/segregação deve ser formalmente promovida a um componente explícito de disponibilidade no bloco `fde`.
3. **Feedstocks com BMP substancialmente abaixo do Corpus:** `PALHA` (0,60), `PALHA_MILHO` (0,59), `CASCA_MILHO` (0,47), `LODO_SECUNDARIO` (0,58), `DEJETOS_AVES` (0,60) e `CASCAS_CITROS` (0,53) possuem BMPs médios posicionados bem abaixo da mediana das observações compiladas no corpus. Qualquer ajuste nestes parâmetros exigirá recálculo canônico e emissão de tabela de delta.

---
**Status:** Diagnóstico concluído. Nenhuma alteração realizada em arquivos de código ou parâmetros. Aguardando instrução.
