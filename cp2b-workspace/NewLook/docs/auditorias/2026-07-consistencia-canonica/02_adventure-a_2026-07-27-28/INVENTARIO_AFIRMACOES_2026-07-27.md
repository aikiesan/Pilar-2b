# Inventário de afirmações estaduais — triagem manual A0c

**Data da triagem:** 2026-07-27  
**Modo:** somente leitura das fontes; este inventário é o único artefato produzido.  
**Escopo:** reclassificação manual das duas grandezas que A0b inflou para 1.597 e
1.658 ocorrências: potencial prático/médio/fronteira estadual e biometano estadual.

## Critério aplicado

Uma linha só foi mantida quando o valor:

1. aparece em prosa Markdown, README, texto de UI ou constante de código que
   represente um total;
2. refere-se explicitamente, no mesmo parágrafo, tabela/bloco ou cabeçalho
   imediatamente regente, ao Estado de São Paulo como um todo;
3. não é parcela municipal, regional ou por feedstock, nem fixture, seed, teste,
   snapshot ou array de dados;
4. não é benchmark de terceiro claramente atribuído a FIESP, CIBiogás, EPE ou
   outra metodologia.

Inventários A0/A0b foram excluídos para não recitar suas próprias listagens.
Valores PILAR-2b colocados ao lado de benchmarks foram mantidos; somente o valor
externo foi descartado. Uma linha com vários cenários constitui uma ocorrência,
com o vetor integral preservado na coluna **Valor**.

Para a data foi usado `git blame` da linha. `[LEGADO]` significa commit anterior
a 2026-07-20. `[ATIVO]` significa commit nessa data ou posterior, ou arquivo atual
não versionado. Nos três arquivos recuperados em `docs/archive`, a data é a do
commit de recuperação (2026-07-25), portanto a regra temporal os classifica como
`[ATIVO]`, embora o próprio diretório os declare material histórico.

## Resultado

| Grandeza | A0b `[AFIRMAÇÃO]` | A0c `[AFIRMAÇÃO]` | `[LEGADO]` | `[ATIVO]` |
|---|---:|---:|---:|---:|
| Potencial prático/médio/fronteira estadual | 1.597 | **63** | 22 | 41 |
| Biometano estadual | 1.658 | **25** | 11 | 14 |

Ambas ficaram abaixo do gatilho de parada de 100.

## 1. Potencial prático/médio/fronteira estadual

| Arquivo | Linha | Valor | Data do commit | Classe |
|---|---:|---|---|:---:|
| `AUDITORIA_PILAR2B_2026-07-25.md` | 23 | CH₄ `3,57 / 3,65 / 3,6488`; biogás `6,39 / 6,53 / 6,5326` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 27 | CH₄ medio `3,65` Mm³/d (total de SP) | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 51 | CH₄ prático min `0,74` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 52 | CH₄ prático medio `3,57` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 53 | CH₄ prático max `14,45` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 54 | biogás prático min `1,32` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 55 | biogás prático medio `6,39` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 56 | biogás prático max `25,78` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 60 | CH₄ base/medio/fronteira/otimista `0,75 / 3,65 / 9,19 / 14,74` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 61 | biogás base/medio/fronteira/otimista `1,35 / 6,53 / 16,42 / 26,30` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 63 | CH₄ prático min/medio/max `0,7537 / 3,6488 / 14,7363` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 64 | biogás prático min/medio/max `1,3507 / 6,5326 / 26,2993` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `docs/archive/2026-05-pre-squash/README.md` | 41 | CH₄ estadual `8,38 → 3,57` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `docs/archive/2026-05-pre-squash/Outline_Paper_CP2b _) (1).md` | 16 | potencial mobilizável `19,69 milhões m³ CH₄/d` | 2026-07-25 | `[ATIVO]` |
| `docs/archive/2026-05-pre-squash/Outline_Paper_CP2b _) (1).md` | 107 | potencial mobilizável `19,69 milhões m³ CH₄/d` | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md` | 163 | biogás medio `6,39` (envelope `1,32–25,78`); CH₄ `3,57` Mm³/d | 2026-06-13 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 26 | CH₄ min `0,7537 → 0,6990` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 27 | CH₄ medio `3,6488 → 3,6367` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 28 | CH₄ max `14,7363 → 13,4421` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 29 | biogás min `1,3507 → 1,2491` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 30 | biogás medio `6,5326 → 6,4979` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 31 | biogás max `26,2993 → 24,0164` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 44 | CH₄ medio `3,6488 → 3,6367` Mm³/d (valor estadual) | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 99 | CH₄ prático min/medio/max `0,74 / 3,57 / 14,45` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 100 | biogás prático min/medio/max `1,32 / 6,39 / 25,78` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 125 | CH₄ medio total `3,568` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 136 | biogás medio `6,39` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 137 | biogás min/max `1,32 / 25,78` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 144 | biogás medio mobilizável `6,4` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 275 | CH₄ prático min/medio/max `0,74 / 3,57 / 14,45` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 276 | biogás prático min/medio/max `1,32 / 6,39 / 25,78` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 20 | CH₄ prático min/medio/max `0,74 / 3,57 / 14,45` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 21 | biogás prático min/medio/max `1,32 / 6,39 / 25,78` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 68 | biogás medio `6,39` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 69 | biogás min/max `1,3 / 25,8` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 71 | biogás mobilizável `6,4` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 118 | biogás mobilizável medio `6,4`, envelope `1,3–25,8` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 146 | potencial mobilizável `19,69 milhões m³ CH₄/d` | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 151 | potencial mobilizável `19,69 milhões m³ CH₄/d` | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 154 | CH₄ medio canônico `3,6488` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 165 | CH₄ estadual `19,69` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 166 | biogás canônico `6,39` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md` | 191 | CH₄ canônico corrente `3,6488` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 219 | CH₄ min `0,7537 → 0,7537` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 220 | CH₄ medio `3,6488 → 3,6488` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 221 | CH₄ max `14,7363 → 14,8836` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 222 | biogás min `1,3507 → 1,3507` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 223 | biogás medio `6,5326 → 6,5326` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 224 | biogás max `26,2993 → 26,5671` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 16 | definição A: CH₄/biogás `14,66 / 25,85`; definição B: `9,19 / 16,42` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 67 | CH₄/biogás base `0,75 / 1,35` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 68 | CH₄/biogás medio `3,65 / 6,53` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 69 | CH₄/biogás fronteira `9,19 / 16,42` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 70 | CH₄/biogás otimista `14,74 / 26,30` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 82 | biogás fronteira `16,42` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` | 73 | CH₄ estadual `19,69` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` | 75 | CH₄ canônico medio `3,6488` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` | 125 | CH₄ Fase 1/Fase 2 `3,57 → 3,90` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` | 126 | biogás Fase 1/Fase 2 `6,39 → 6,97` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md` | 14 | metano realista `2,16 bilhões m³/ano` | 2026-05-19 | `[LEGADO]` |
| `cp2b-workspace/NewLook/frontend/src/app/[locale]/about/page.tsx` | 543 | biogás estadual estimado `4,6 bilhões m³/ano` | 2026-05-19 | `[LEGADO]` |
| `Paper PILAR-2b - CEUS 04_2026.md` | 133 | potencial após correções `19,69 milhões m³ CH₄/d` | N/A — não versionado | `[ATIVO]` |
| `Paper PILAR-2b - CEUS 04_2026.md` | 165 | potencial prático `19,69 milhões m³ CH₄/d` | N/A — não versionado | `[ATIVO]` |

## 2. Biometano estadual

| Arquivo | Linha | Valor | Data do commit | Classe |
|---|---:|---|---|:---:|
| `AUDITORIA_PILAR2B_2026-07-25.md` | 23 | biometano `3,46 / 3,54 / 3,5393` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 57 | biometano min `0,71` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 58 | biometano medio `3,46` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 59 | biometano max `14,02` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 62 | biometano base/medio/fronteira/otimista `0,73 / 3,54 / 8,92 / 14,29` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `AUDITORIA_PILAR2B_2026-07-25.md` | 65 | biometano min/medio/max `0,7311 / 3,5393 / 14,2942` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md` | 163 | biometano medio `3,46` Mm³/d | 2026-06-13 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 32 | biometano min `0,7311 → 0,6780` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 33 | biometano medio `3,5393 → 3,5276` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md` | 34 | biometano max `14,2942 → 13,0388` Mm³/d | 2026-07-26 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 101 | biometano min/medio/max `0,71 / 3,46 / 14,02` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/FOSS4G_PAPER_SUPPLEMENT.md` | 277 | biometano min/medio/max `0,71 / 3,46 / 14,02` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 22 | biometano min/medio/max `0,71 / 3,46 / 14,02` Mm³/d | 2026-06-06 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 225 | biometano min `0,7311 → 0,7311` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 226 | biometano medio `3,5393 → 3,5393` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | 227 | biometano max `14,2942 → 14,4371` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 16 | definição A/B `14,22 / 8,92` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 67 | biometano base `0,73` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 68 | biometano medio `3,54` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 69 | biometano fronteira `8,92` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 70 | biometano otimista `14,29` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 82 | biometano fronteira `8,92` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` | 90 | biometano fronteira `~8,9` Mm³/d | 2026-06-12 | `[LEGADO]` |
| `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` | 127 | biometano Fase 1/Fase 2 `3,46 → 3,78` Mm³/d | 2026-07-25 | `[ATIVO]` |
| `cp2b-workspace/NewLook/frontend/src/app/[locale]/about/page.tsx` | 551 | biometano estadual `6,4 milhões m³/d` | 2026-05-19 | `[LEGADO]` |

## Exclusões sistemáticas verificadas

- `canonical_results.json`, CSVs e demais matrizes granulares: dados derivados,
  não prosa/constantes de total.
- tabelas por stream, município e região, inclusive contribuições isoladas como
  `PALHA_SOJA`, bagaço e FORSU.
- testes, snapshots, fixtures, seeds, arrays de plantas e séries ANP/ANEEL.
- valores externos identificados como FIESP/SEMIL, CIBiogás ou EPE.
- nomes de campos, fórmulas, eficiências e preços que contêm “biometano”, mas não
  publicam um total estadual.
- scripts que apenas calculam ou imprimem agregados em runtime, sem constante
  nomeada do total.

**Conclusão:** os 1.597 e 1.658 registros de A0b eram falsos positivos
sistemáticos. A população manualmente defensável é de 63 e 25 ocorrências,
respectivamente.
