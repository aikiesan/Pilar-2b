# Triagem de Suficiência dos 28 Corpora de BMP — PILAR-2b (2026-07-27)

**Escopo:** ADVENTURE A / A3b — Triagem de Suficiência dos 28 Corpora (Somente Leitura).  
**Regra:** Rápido, sem abrir fontes primárias. Nenhuma reconstrução de corpus efetuada nesta etapa.  
**Branch:** `fix/canonical-consistency-2026-07`

---

## Critérios e Definição das 4 Marcas de Alerta

1. **`[SEM LINHAGEM]`**: Nenhuma observação individual de BMP preservada em tabela primária de medições (apenas estatísticas agregadas).
2. **`[AMPLITUDE>5x]`**: Razão entre o valor máximo e mínimo de BMP ($	ext{max}/	ext{min} > 5{,}0$), indicando heterogeneidade crítica ou mistura de categorias físico-químicas de resíduo.
3. **`[DIVERGENTE-YAML]`**: O valor `bmp.medio` no `feedstocks.yaml` difere da mediana `bmp_median` do CSV de referências sem decisão metodológica formal registrada.
4. **`[ACIMA-DO-TETO]`**: Valor máximo de BMP excede o teto estequiométrico biológico teórico de **540 NmL CH₄/g VS** (limite para carboidratos/proteínas sem lipídios puros).

---

## Fila de Reconstrução por Impacto

*Fórmulas de ordenação: $\text{Pontuação de Impacto} = (\text{Contribuição ao CH}_4 \text{ SP %}) \times (\text{Nº de Marcas})$*

| Posição | Feedstock Code | Contribuição $	ext{CH}_4$ SP (%) | $n_{	ext{obs}}$ | Amplitude (Max/Min) | Linhas Indiv. | Linhas `references_unified` | `bmp.medio` (YAML) | `bmp_median` (CSV) | Marcas Atribuídas | Pontuação Impacto |
|---:|---|---:|---:|---:|:---:|---:|---:|---:|---|---:|
| **1** | `VINHACA` | 65.0% | 7 | 19.8x | Não | 24 | 160.0 | 180.0 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **260.0** |
| **2** | `PALHA` | 8.0% | 14 | 4.7x | Não | 30 | 175.0 | 293.5 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **24.0** |
| **3** | `TORTA_FILTRO` | 5.0% | 14 | 9.3x | Não | 17 | 280.0 | 365.0 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **20.0** |
| **4** | `BAGACO` | 4.0% | 6 | 5.4x | Não | 37 | 165.0 | 191.9 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]` | **12.0** |
| **5** | `FORSU` | 2.5% | 9 | 1.7x | Não | 17 | 360.0 | 472.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **7.5** |
| **6** | `LODO_PRIMARIO` | 0.8% | 11 | 6.0x | Não | 27 | 310.0 | 370.0 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **3.2** |
| **7** | `DEJETOS_SUINO` | 1.5% | 10 | 4.7x | Não | 29 | 245.0 | 265.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **3.0** |
| **8** | `LODO_SECUNDARIO` | 0.8% | 8 | 3.8x | Não | 25 | 180.0 | 310.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **2.4** |
| **9** | `ORGANICO_RSU` | 2.0% | 0 | — | Não | 0 | 270.0 | — | `[SEM LINHAGEM]` | **2.0** |
| **10** | `CAMA_AVIARIO` | 1.0% | 1 | 1.0x | Não | 6 | 280.0 | 300.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **2.0** |
| **11** | `DEJETOS_AVES` | 1.0% | 2 | 1.6x | Não | 5 | 250.0 | 414.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **2.0** |
| **12** | `BAGACO_CITROS` | 0.5% | 10 | 6.2x | Não | 9 | 230.0 | 289.0 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]` | **1.5** |
| **13** | `PALHA_MILHO` | 0.3% | 31 | 16.5x | Não | 5 | 230.0 | 390.0 | `[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **1.2** |
| **14** | `CASCAS_CITROS` | 0.5% | 1 | 1.0x | Não | 10 | 210.0 | 398.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **1.0** |
| **15** | `CASCA_CAFE` | 0.4% | 2 | 1.5x | Não | 12 | 165.0 | 163.8 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **0.8** |
| **16** | `POLPA_CAFE` | 0.4% | 1 | 1.0x | Não | 9 | 245.0 | 317.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **0.8** |
| **17** | `GORDURA` | 0.2% | 2 | 1.1x | Não | 9 | 850.0 | 859.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]`, `[ACIMA-DO-TETO]` | **0.6** |
| **18** | `CASCA_MILHO` | 0.3% | 30 | 2.2x | Não | 1 | 145.0 | 307.0 | `[SEM LINHAGEM]`, `[DIVERGE-YAML]` | **0.6** |
| **19** | `CASCA_SOJA` | 0.1% | 0 | — | Não | 3 | 300.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **20** | `DEJETOS_BOVINO` | 0.1% | 0 | — | Não | 3 | 155.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **21** | `ESTERCO_BOVINO` | 0.1% | 0 | — | Não | 0 | 200.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **22** | `ESTERCO_BOVINO_CORTE` | 0.1% | 0 | — | Não | 0 | 120.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **23** | `ESTERCO_BOVINO_LEITEIRO` | 0.1% | 0 | — | Não | 0 | 230.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **24** | `ESTERCO_SUINO` | 0.1% | 0 | — | Não | 0 | 235.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **25** | `MUCILAGEM_CAFE` | 0.1% | 0 | — | Não | 8 | 320.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **26** | `PALHA_SOJA` | 0.1% | 0 | — | Não | 4 | 220.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **27** | `PODA_URBANA` | 0.1% | 0 | — | Não | 0 | 175.0 | — | `[SEM LINHAGEM]` | **0.1** |
| **28** | `SANGUE` | 0.1% | 0 | — | Não | 9 | 450.0 | — | `[SEM LINHAGEM]` | **0.1** |

---

## Resumo dos Achados da Triagem

1. **Corpora sem Linhagem (28/28 = 100%):** Todos os 28 feedstocks atualmente possuem apenas estatísticas agregadas (`feedstock_bmp_from_refs.csv`) ou referências textuais, sem preservação das linhas individuais de observação em batelada.
2. **Top-5 Feedstocks Prioritários para Reconstrução:**
   - **`VINHACA` (Posição 1, Score 260.0):** 65% do CH₄ estadual; 4 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`); amplitude de 19.8x (49 a 968 NmL/gVS).
   - **`PALHA` (Posição 2, Score 24.0):** 8% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`).
   - **`TORTA_FILTRO` (Posição 3, Score 20.0):** 5% do CH₄ estadual; 4 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`); amplitude 9.3x.
   - **`BAGACO` (Posição 4, Score 12.0):** 4% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`).
   - **`FORSU` (Posição 5, Score 7.5):** 2.5% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`).

**Status da Triagem:** Concluída. Nenhuma reconstrução de corpus realizada. Nenhuma alteração efetuada em código ou parâmetros. Aguardando instrução.
