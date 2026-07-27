# Relatório B6 — Análise de Sazonalidade, Perfil Mensal e Invariância Anual
**Data de Emissão**: 2026-08-04  
**Escopo**: Reformulação da Sazonalidade como Atributo Temporal Não-Multiplicativo — Lote B6-CONCLUI  
**Branch**: `fix/canonical-consistency-2026-07`  
**Status do Gate**: **PASS** (Invariância Anual Verificada)  
**SHA-256 de `feedstocks.yaml`**: `9e3d40157d8cb49a55a3f7abf91cb497dc15cdd9e6e14a63105cab0453809e3b`  

---

## 1. Prova da Invariância Anual

A reformulação do componente de sazonalidade removeu o antigo fator multiplicativo $FS$ do catálogo e do motor de cálculo (`canonical_loader.py` e `biogas_forward.py`). A sazonalidade passa a redistribuir a massa anual no tempo sem descontar o potencial acumulado ($t/\text{ano}$).

- **Soma dos 12 Meses**: **1,116,862,580.90 m³/ano CH₄**
- **Total Canônico Invariante**: **1,116,862,580.90 m³/ano CH₄** (**3,059897 M m³/dia CH₄**)
- **Diferença Absoluta (Delta)**: `-0.00000119 m³/ano` (Tolerância: `< 0,01 m³/ano`)
- **Status de Validação**: **`PASS`** (Prova matemática de invariância confirmada em 645 municípios).

---

## 2. Declaração Metodológica Atualizada (Três Fatores + Atributo Temporal)

> [!IMPORTANT]
> **REGRAS DE GOVERNANÇA DE DISPONIBILIDADE (POLITICA_FATORES.md)**:
> 1. A disponibilidade física da biomassa é calculada por **três fatores multiplicativos**: $Disponibilidade = FC \times FCo \times FL$.
> 2. O antigo fator $FS$ (Sazonalidade) foi permanentemente removido do produto no catálogo.
> 3. A dimensão temporal é descrita exclusivamente pelo atributo descritivo **`availability_profile`**, composto por `window_months`, `days_available_yr`, `storable`, `point_of_availability` e a fonte da janela.
> 4. A sazonalidade redistribui o fluxo de biogás no calendário mensal, definindo a vazão instantânea e o dimensionamento da planta, sem jamais reduzir a energia total produzida no ano.

---

## 3. Tabela dos 15 Perfis de Disponibilidade Temporal (`availability_profile`)

| Subfluxo (Stream) | Código Canônico | Setor | Janela de Safra (`window_months`) | Dias de Oferta (`days_available_yr`) | Estocável (`storable`) | Ponto de Disponibilidade | Fonte da Janela / Limitação Declarada |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `cana_bagaco` | `BAGACO` | agricultural | `[4, 5, 6, 7, 8, 9, 10, 11]` | 208 dias | Sim | unidade industrial | UNICA/Moreira et al. (2016), moagem abril-novembro e 208 dias efetivos; Santos et al. (2011), pilha por 150 dias |
| `forsu` | `FORSU` | urban | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | urbano difuso | SNIS 2022 CO111 e fallback IBGE 2022; coleta domiciliar contínua |
| `cana_vinhaca` | `VINHACA` | agricultural | `[4, 5, 6, 7, 8, 9, 10, 11]` | 208 dias | Não | unidade industrial | UNICA, janela de moagem do Centro-Sul (abril-novembro) |
| `cana_torta` | `TORTA_FILTRO` | agricultural | `[4, 5, 6, 7, 8, 9, 10, 11]` | 208 dias | Não | unidade industrial | UNICA, janela de moagem do Centro-Sul (abril-novembro) |
| `poultry` | `CAMA_AVIARIO` | livestock | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | propriedade | IBGE PPM, plantel anual; geração distribuída ao longo do ano |
| `lodo_primario` | `LODO_PRIMARIO` | urban | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | urbano difuso | SNIS 2022 ES006; tratamento de esgoto contínuo |
| `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | livestock | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | propriedade | IBGE PPM, rebanho anual; geração contínua de dejetos |
| `citrus` | `BAGACO_CITROS` | agricultural | `[1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]` | 334 dias | Não | unidade industrial | Fundecitrus, metodologia PES: acompanhamento da colheita de junho ao fechamento em abril |
| `corn` | `PALHA_MILHO` | agricultural | `[6, 7, 8, 9]` | 122 dias | Não | campo | CONAB, calendário de colheita do milho segunda safra em São Paulo |
| `soybean` | `PALHA_SOJA` | agricultural | `[1, 2, 3, 4]` | 120 dias | Não | campo | CONAB, calendário de colheita de soja em São Paulo; atividade modelada é palha de campo, não casca do esmagamento |
| `cana_palha` | `PALHA` | agricultural | `[4, 5, 6, 7, 8, 9, 10, 11]` | 208 dias | Não | campo | CONAB, calendário de colheita da cana-de-açúcar em São Paulo |
| `cattle_corte` | `ESTERCO_BOVINO_CORTE` | livestock | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | propriedade | IBGE PPM, rebanho anual; geração contínua de dejetos |
| `lodo_secundario` | `LODO_SECUNDARIO` | urban | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | urbano difuso | SNIS 2022 ES006; tratamento de esgoto contínuo |
| `coffee` | `CASCA_CAFE` | agricultural | `[5, 6, 7, 8, 9]` | 153 dias | Não | unidade industrial | CONAB, Compêndio de Estudos 2018, colheita paulista de café maio-setembro |
| `swine` | `DEJETOS_SUINO` | livestock | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` | 365 dias | Não | propriedade | IBGE PPM, rebanho anual; geração contínua de dejetos |

> **Nota de Fechamento da Janela do Milho (`PALHA_MILHO`)**: A pesquisa municipal PAM 1612 (*Milho em grão*) agrega a 1ª safra (verão: colheita fev–maio) e a 2ª safra (safrinha: colheita jun–set) em um único valor anual por município. Como a safrinha representa a maior parte da produção em SP (~75% conforme a CONAB 2023), a janela foi fixada em `[6, 7, 8, 9]` (122 dias), declarando-se essa limitação de agregação municipal da PAM no perfil.

---

## 4. Perfil Mensal Estadual de Metano (Sazonalidade Paulista)

| Mês | Nome do Mês | Produção Mensal CH₄ (m³/mês) | Vazão Média Diária (M m³/dia CH₄) | Participação no Total Anual (%) |
| :-: | :--- | :---: | :---: | :---: |
| **1** | Janeiro | ** 45,727,988.48** | **1.4751 M m³/d** |  4.09 % |
| **2** | Fevereiro | ** 45,727,988.48** | **1.6331 M m³/d** |  4.09 % |
| **3** | Março | ** 45,727,988.48** | **1.4751 M m³/d** |  4.09 % |
| **4** | Abril | **120,217,694.13** | **4.0073 M m³/d** | 10.76 % |
| **5** | Maio | **109,058,011.26** | **3.5180 M m³/d** |  9.76 % |
| **6** | Junho | **122,746,630.50** | **4.0916 M m³/d** | 10.99 % |
| **7** | Julho | **122,746,630.50** | **3.9596 M m³/d** | 10.99 % |
| **8** | Agosto | **122,746,630.50** | **3.9596 M m³/d** | 10.99 % |
| **9** | Setembro | **122,746,630.50** | **4.0916 M m³/d** | 10.99 % |
| **10** | Outubro | **111,302,031.24** | **3.5904 M m³/d** |  9.97 % |
| **11** | Novembro | **111,302,031.24** | **3.7101 M m³/d** |  9.97 % |
| **12** | Dezembro | ** 36,812,325.59** | **1.1875 M m³/d** |  3.30 % |

- **Mês de Pico Estadual**: **Mês 6 (Junho)** com **4.0916 M m³/dia CH₄**.
- **Mês de Vale Estadual**: **Mês 12 (Dezembro)** com **1.1875 M m³/dia CH₄**.
- **Razão Pico / Vale Estadual**: **3.33×** (reflete a concentração da safra de cana e milho entre abril e novembro).

---

## 5. Perfil Mensal por Região Intermediária (15 Regiões de SP)

| Cód. Região | Região Intermediária | Total CH₄ Médio (m³/ano) | Mês de Pico | Mês de Vale | Razão Pico / Vale | Comportamento Sazonal Dominante |
| :-: | :--- | :---: | :---: | :---: | :---: | :--- |
| `3501` | **São Paulo** | **129,459,995.99** | Mês 6 | Mês 1 | **1.00×** | Contínuo (urbano/pecuário) |
| `3502` | **Sorocaba** | ** 88,608,978.08** | Mês 4 | Mês 12 | **2.31×** | Dominado por safra de cana (pico inverno) |
| `3503` | **Bauru** | ** 93,759,456.68** | Mês 4 | Mês 12 | **4.03×** | Dominado por safra de cana (pico inverno) |
| `3504` | **Marília** | ** 86,824,539.80** | Mês 6 | Mês 12 | **5.05×** | Dominado por safra de cana (pico inverno) |
| `3505` | **Presidente Prudente** | ** 79,462,427.26** | Mês 6 | Mês 12 | **5.83×** | Dominado por safra de cana (pico inverno) |
| `3506` | **Araçatuba** | ** 81,734,411.71** | Mês 4 | Mês 12 | **8.63×** | Dominado por safra de cana (pico inverno) |
| `3507` | **São José do Rio Preto** | **142,574,037.49** | Mês 4 | Mês 12 | **5.85×** | Dominado por safra de cana (pico inverno) |
| `3508` | **Ribeirão Preto** | **193,146,011.86** | Mês 6 | Mês 12 | **8.71×** | Dominado por safra de cana (pico inverno) |
| `3509` | **Araraquara** | ** 73,433,178.68** | Mês 6 | Mês 12 | **6.01×** | Dominado por safra de cana (pico inverno) |
| `3510` | **Campinas** | **128,679,634.28** | Mês 6 | Mês 12 | **2.18×** | Dominado por safra de cana (pico inverno) |
| `3511` | **São José dos Campos** | ** 19,179,909.07** | Mês 6 | Mês 12 | **1.05×** | Contínuo (urbano/pecuário) |

---

## 6. Fator de Capacidade Implícito (ICF = Dias de Oferta / 365)

### 6.1 Fator de Capacidade Implícito por Feedstock
| Subfluxo (Stream) | Código Canônico | Dias de Oferta (`days_available_yr`) | Fator de Capacidade Implícito (ICF) | Estocável | Ponto de Disponibilidade | CH₄ Médio Anual (m³/ano) |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| `cana_bagaco` | `BAGACO` | 208 dias | **1.0000 (100.00%)** | Sim | unidade industrial | 354,201,693.97 |
| `forsu` | `FORSU` | 365 dias | **1.0000 (100.00%)** | Não | urbano difuso | 186,980,529.47 |
| `cana_vinhaca` | `VINHACA` | 208 dias | **0.5699 (56.99%)** | Não | unidade industrial | 113,005,633.89 |
| `cana_torta` | `TORTA_FILTRO` | 208 dias | **0.5699 (56.99%)** | Não | unidade industrial | 103,443,618.80 |
| `poultry` | `CAMA_AVIARIO` | 365 dias | **1.0000 (100.00%)** | Não | propriedade |  80,725,371.91 |
| `lodo_primario` | `LODO_PRIMARIO` | 365 dias | **1.0000 (100.00%)** | Não | urbano difuso |  51,970,668.71 |
| `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | 365 dias | **1.0000 (100.00%)** | Não | propriedade |  44,918,956.62 |
| `citrus` | `BAGACO_CITROS` | 334 dias | **0.9151 (91.51%)** | Não | unidade industrial |  40,782,975.43 |
| `corn` | `PALHA_MILHO` | 122 dias | **0.3342 (33.42%)** | Não | campo |  39,924,304.05 |
| `soybean` | `PALHA_SOJA` | 120 dias | **0.3288 (32.88%)** | Não | campo |  35,662,651.55 |
| `cana_palha` | `PALHA` | 208 dias | **0.5699 (56.99%)** | Não | campo |  25,266,698.54 |
| `cattle_corte` | `ESTERCO_BOVINO_CORTE` | 365 dias | **1.0000 (100.00%)** | Não | propriedade |  17,224,540.22 |
| `lodo_secundario` | `LODO_SECUNDARIO` | 365 dias | **1.0000 (100.00%)** | Não | urbano difuso |  12,243,351.20 |
| `coffee` | `CASCA_CAFE` | 153 dias | **0.4192 (41.92%)** | Não | unidade industrial |   7,317,616.20 |
| `swine` | `DEJETOS_SUINO` | 365 dias | **1.0000 (100.00%)** | Não | propriedade |   3,193,970.34 |

### 6.2 Fator de Capacidade Implícito por Setor da Economia
| Setor da Economia | Fator de Capacidade Implícito Ponderado (ICF) | Ponderação Utilizada |
| :--- | :---: | :--- |
| **Agricultural** | **0.7746 (77.46%)** | Ponderado por CH4 medio anual |
| **Livestock** | **1.0000 (100.00%)** | Ponderado por CH4 medio anual |
| **Urban** | **1.0000 (100.00%)** | Ponderado por CH4 medio anual |

- **Fator de Capacidade Implícito Estadual Ponderado**: **0.8548 (85.48%)** (equivalente a **312.0 dias de operação total/ano**).

---

## 7. Conclusão e Encerramento

1. **Invariância Anual Verificada**: A sazonalidade redistribui perfeitamente os **1.116.862.580,90 m³/ano CH₄** ao longo dos 12 meses do ano sem alterar a massa total.
2. **Metodologia de Três Fatores**: A governança paramétrica passa a ser formalmente $FC \times FCo \times FL$ mais o atributo temporal `availability_profile`.
3. **Lote B6-CONCLUI Finalizado com Sucesso.**