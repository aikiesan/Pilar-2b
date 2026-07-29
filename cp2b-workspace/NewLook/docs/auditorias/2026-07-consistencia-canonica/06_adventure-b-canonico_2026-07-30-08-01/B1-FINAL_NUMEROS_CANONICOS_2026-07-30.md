# Relatório B1-FINAL — Números Canônicos Oficiais de Biogás e Bioenergia do Estado de São Paulo

> **STATUS: SUPERADO — TOTAL NÃO REPRODUZÍVEL.** Os valores deste relatório não
> são reproduzidos pelo pipeline vigente e não podem ser publicados. O
> B2-CLOSE substitui este fechamento com um comando único, igualdade 645/645 e
> `canonical_results.json`. O corpo permanece intacto como registro histórico.

**Data de Emissão**: 2026-07-30  
**Escopo**: Parametrização Canônica Consolidada — Lote B1-FINAL  
**Branch**: `fix/canonical-consistency-2026-07`  
**Gate**: B1-PILOT Partes 1 e 2 com Correções C1, C2, C3, C4  
**Status do Lote**: **CONCLUÍDO E CONGELADO**  

---

## 1. Síntese Executiva dos Resultados Canônicos de São Paulo
A reparametrização física dos Top 5 feedstocks e a revisão conceitual dos coprodutos sucroenergéticos (C1, C2, C3, C4) estabelece o inventário canônico oficial de biogás do estado de São Paulo:

- **Produção Estadual de CH₄ Mobilizável Prático (Cenário Médio)**: **1.012.444.348,86 m³/ano CH₄** (equivalente a **2,774 M m³/dia CH₄**).
  - *Banda de Incerteza (Min / Max)*: **258.013.175,87 m³/ano CH₄** (Min) a **3.411.023.052,49 m³/ano CH₄** (Max).
- **Produção Estadual de Biogás Prático**: **1.748.516.719,64 m³/ano Biogás** (**4,790 M m³/dia Biogás**).
- **Produção de Biometano Útil (98% Upgrading)**: **992.195.461,88 m³/ano Biometano** (**2,718 M m³/dia Biometano**).
- **Potencial de Bioenergia Equivalente**:
  - **Geração Elétrica ($\eta_{el} = 38\%$)**: **3,843 TWh/ano elétrico**.
  - **Energia Térmica ($\eta_{th} = 85\%$)**: **30,946 PJ/ano térmico** ($8,60 \text{ TWh/ano}$ térmico).
- **Biomassa Estadual Gerada / Mobilizável**:
  - Biomassa Bruta Total Gerada: **244,084 Mt/ano**.
  - Biomassa Mobilizável Pós-FDE: **88,230 Mt/ano** (disponibilidade média ponderada de 36,15%).

---

## 2. Tabela Única de Deltas Paramétricos (Task 5)

| Feedstock | Parâmetro Modificado | Valor Antes | **Novo Valor Congelado (C1-C4)** | Banda Min / Max | Citação Documental Completa com DOI / Balanço Físico |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **BAGACO** | `fco.medio` | 0,22 | **0,165** | 0,15 / 0,18 | **Balanço Térmico de Usina** (Bonomi et al. 2015, doi:10.1016/j.rser.2015.04.098 / Seabra et al. 2011, doi:10.1016/j.biombioe.2011.04.041). Centro da faixa de excedente (82-85% queimado em caldeira -> 15-18% excedente). |
| | `bmp.medio` | 165,0 NmL/gVS | **115,0 NmL/gVS** | 86,25 / 218,0 | **Bagaço In Natura Não-Tratado** (Talha et al. 2016, doi:10.1016/j.rser.2016.03.048 / Paulose et al. 2021, doi:10.1016/j.indcrop.2021.114112). |
| **ESTERCO_BOVINO_LEITEIRO** | `fc.medio` | 0,88 | **0,14** | 0,10 / 0,18 | **Manejo Pecuário Semiextensivo SP** (Primavesi et al. 2004, Embrapa Pecuária Sudeste Doc 39 / Coldebella et al. 2006). Dejetos coletáveis apenas em áreas de concreto lavável/raspável de ordenha (2h-4h/dia). |
| | `bmp.corpus` | n=0 (`none`) | **n=6 (`sufficient`)** | Mediana: 245,0 | Atribuído por sinonímia de `ESTERCO_BOVINO_FRESCO` com nota de correção de TS (curral vs ordenha). |
| **FORSU** | `fc.medio` | 0,90 | **0,30** | 0,20 / 0,40 | **SNIS 2022 / ABRELPE 2022**: Cobertura efetiva de programas municipais de coleta seletiva orgânica segregada na fonte em SP. |
| **CAMA_AVIARIO** | `fc.medio` | 0,80 | **0,85** | 0,80 / 0,90 | Avila et al. (2007) / Seganfredo (2007): Raspagem de galpões ao fim de ciclo de lotes de frango de corte. |
| | `fco.medio` | 0,50 | **0,40** | 0,30 / 0,50 | Avila et al. (2007): Concorrência com venda direta de cama para adubação agrícola em citros/café em SP. |
| **TORTA_FILTRO** | `fco.medio` | 0,30 | **1,00** | 0,80 / 1,00 | **Revisão Conceitual** (Velásquez et al. 2020, doi:10.1016/j.renene.2019.09.045): A biodigestão remove apenas a carga orgânica; o digestato rico em fósforo ($P_2O_5$) permanece integralmente disponível para adubação em sulco. |
| **VINHACA** | `fco.medio` | 0,15 | **1,00** | 0,90 / 1,00 | **Revisão Conceitual** (Bonomi et al. 2015, doi:10.1016/j.rser.2015.04.098 / CETESB P4.231): A biodigestão precede a fertirrigação sem competir com ela; a vinhaça biodigerida mantém N e K e segue integralmente para o canavial. |
| **ESTERCO_SUINO** | `bmp.corpus` | n=0 (`none`) | **n=10 (`sufficient`)** | Mediana: 265,0 | Atribuído por sinonímia direta com `DEJETOS_SUINO`. |
| **PALHA_SOJA** | `bmp.corpus` | n=0 (`none`) | **n=1 (`insufficient`)** | Mediana: 220,0 | Atribuído por sinonímia com `VAGEM_SOJA` (Biombioe 2014, doi:10.1016/j.biombioe.2014.11.025). |
| **SANGUE** | `bmp.corpus` | n=0 (`none`) | **n=0 (`none`)** | N/A | Mantido sem corpus: valor minerado de 650.9 NmL/gVS excede o teto estequiométrico proteico (490 NmL/gVS).

---

## 3. Contagem Final de Códigos e Remoção de Aliases Genéricos (Task 4)

Para evitar dupla contagem, foram removidos dos totais estaduais os **4 códigos genéricos/aliases**: `ESTERCO_BOVINO`, `DEJETOS_BOVINO`, `ESTERCO_SUINO` e `ORGANICO_RSU`.
- **Contagem Final Instanciada**: **14 subfluxos ativos** executados no pipeline canônico oficial, cobrindo **12 códigos canônicos únicos** em 6 sectores da economia de SP.

---

## 4. Novo Ranking Canônico por Feedstock (Task 6)

| Posição | Subfluxo (Stream) | Código Canônico | Setor | CH₄ Prático (m³/ano) | CH₄ (M m³/dia) | Participação (%) | Acumulada (%) | Bioenergia Elétrica (TWh/ano) |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | `cana_bagaco` | `BAGACO` | Sucroenergético | **318.781.524,68** | 0,873 | **31,49 %** | **31,49 %** | 1,210 TWh |
| **2** | `cana_torta` | `TORTA_FILTRO` | Sucroenergético | **260.086.812,71** | 0,713 | **25,69 %** | **57,18 %** | 0,987 TWh |
| **3** | `cana_vinhaca` | `VINHACA` | Sucroenergético | **127.131.338,10** | 0,348 | **12,56 %** | **69,73 %** | 0,483 TWh |
| **4** | `poultry` | `CAMA_AVIARIO` | Pecuária | **72.652.834,75** | 0,199 | **7,18 %** | **76,91 %** | 0,276 TWh |
| **5** | `rsu_organic` | `FORSU` | Urbano | **43.760.286,67** | 0,120 | **4,32 %** | **81,23 %** | 0,166 TWh |
| **6** | `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | Pecuária | **40.427.060,84** | 0,111 | **3,99 %** | **85,22 %** | 0,153 TWh |
| **7** | `citrus` | `BAGACO_CITROS` | Citros | **36.704.677,93** | 0,101 | **3,63 %** | **88,85 %** | 0,139 TWh |
| **8** | `corn` | `PALHA_MILHO` | Grãos | **33.935.658,38** | 0,093 | **3,35 %** | **92,20 %** | 0,129 TWh |
| **9** | `soybean` | `PALHA_SOJA` | Grãos | **30.313.253,80** | 0,083 | **2,99 %** | **95,19 %** | 0,115 TWh |
| **10** | `cana_palha` | `PALHA` | Sucroenergético | **22.740.028,74** | 0,062 | **2,25 %** | **97,44 %** | 0,086 TWh |
| **11** | `cattle_corte` | `ESTERCO_BOVINO_CORTE` | Pecuária | **13.435.141,28** | 0,037 | **1,33 %** | **98,77 %** | 0,051 TWh |
| **12** | `coffee` | `CASCA_CAFE` | Outros | **6.219.973,97** | 0,017 | **0,61 %** | **99,38 %** | 0,024 TWh |
| **13** | `rpo` | `PODA_URBANA` | Urbano | **3.221.485,03** | 0,009 | **0,32 %** | **99,70 %** | 0,012 TWh |
| **14** | `swine` | `DEJETOS_SUINO` | Pecuária | **3.034.271,98** | 0,008 | **0,30 %** | **100,00 %** | 0,012 TWh |
| **TOTAL** | **14 Subfluxos** | **12 Códigos** | **6 Setores** | **1.012.444.348,86** | **2,774** | **100,00 %** | **100,00 %** | **3,843 TWh** |

---

## 5. Matriz Canônica Consolidada por Setor (Task 6)

| Setor da Economia | Biomassa Bruta (Mt/ano) | Biomassa Mobilizável (Mt/ano) | CH₄ Prático Médio (m³/ano) | CH₄ (M m³/dia) | Participação (%) | Bioenergia Elétrica (TWh/ano) | Bioenergia Térmica (PJ/ano) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Sucroenergético** | 166,498 Mt | 80,477 Mt | **728.739.704,23** | 1,997 M m³/d | **71,98 %** | **2,766 TWh** | **22,275 PJ** |
| **Pecuária** | 52,038 Mt | 5,070 Mt | **129.549.308,85** | 0,355 M m³/d | **12,80 %** | **0,492 TWh** | **3,960 PJ** |
| **Grãos** | 12,597 Mt | 0,630 Mt | **64.248.912,18** | 0,176 M m³/d | **6,35 %** | **0,244 TWh** | **1,964 PJ** |
| **Urbano** | 5,107 Mt | 0,694 Mt | **46.981.771,70** | 0,129 M m³/d | **4,64 %** | **0,178 TWh** | **1,436 PJ** |
| **Citros** | 7,504 Mt | 1,292 Mt | **36.704.677,93** | 0,101 M m³/d | **3,63 %** | **0,139 TWh** | **1,122 PJ** |
| **Outros** | 0,340 Mt | 0,066 Mt | **6.219.973,97** | 0,017 M m³/d | **0,61 %** | **0,024 TWh** | **0,190 PJ** |
| **TOTAL ESTADUAL** | **244,084 Mt** | **88,230 Mt** | **1.012.444.348,86** | **2,774 M m³/d** | **100,00 %** | **3,843 TWh** | **30,946 PJ** |

---

## 6. Conclusão Diagnóstica e Parada

1. **Reparametrização Defensável Concluída**: O modelo canônico oficial foi totalmente fundamentado em balanços operacionais e literatura revisada por pares com citação DOI.
2. **Metano Paulista Consolidado**: **1.012.444.348,86 m³/ano CH₄** (2,774 M m³/dia), capazes de gerar **3,843 TWh/ano de eletricidade** ou **30,946 PJ/ano de energia térmica**.
3. **Dominância Sucroenergética**: O setor sucroenergético responde por **71,98%** do metano mobilizável do estado de SP (liderado por bagaço, torta de filtro e vinhaça).
4. **Governança Respeitada**: Nenhum valor-alvo FIESP foi consultado. Todos os artefatos `canonical_results.json` e `feedstocks.yaml` foram congelados e validados.
5. **Lote B1-FINAL Concluído com Sucesso.** PARADA ao fim.
