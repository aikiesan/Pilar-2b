# Registro cronológico — consistência canônica (2026-07-25 a 2026-07-28)

## Como usar este histórico

Leia as pastas pela numeração. Cada etapa registra o que era conhecido naquele momento;
um relatório posterior pode corrigir ou restringir uma conclusão anterior sem apagar a
evidência original.

Este índice é o ponto de entrada histórico. As fontes normativas atuais continuam fora
do arquivo:

- [decisões metodológicas vigentes](../../data/DECISOES_METODOLOGICAS.md);
- [resultados canônicos](../../data/canonical_results.json);
- [parâmetros canônicos](../../../data/canonical_parameters/feedstocks.yaml);
- [manuscrito CEUS](../../manuscrito/PILAR-2b_CEUS_2026-04.md).

## Estados usados

- **Histórico:** fotografia ou diagnóstico; não altera parâmetros.
- **Normativo relacionado:** gerou ou fundamentou regra mantida fora desta pasta.
- **Aplicado:** correção implementada e commitada.
- **Aberto:** investigação ou decisão ainda pendente.
- **Interrompido:** lote parou por regra de segurança ou descoberta de escopo.

## Passo a passo temporal

### 00 — Linha de base e auditoria fundacional (2026-07-25)

| Ordem | Lote/tema | Artefato | Estado | Registro Git original |
|---:|---|---|---|---|
| 00.01 | Estado factual inicial | [AUDITORIA_PILAR2B_2026-07-25.md](00_linha-de-base_2026-07-25/AUDITORIA_PILAR2B_2026-07-25.md) | Histórico | `dbea3a7` |
| 00.02 | Origem dos números do manuscrito | [FORENSE_VALIDACAO_2026-07-25.md](00_linha-de-base_2026-07-25/FORENSE_VALIDACAO_2026-07-25.md) | Histórico | `38e808d` |
| 00.03 | Arqueologia Git completa | [ATIVIDADE_GIT_COMPLETA_2026-07-25.md](00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md) | Histórico | `a75c9c7` |
| 00.04 | Circularidade e independência de parâmetros | [AUDITORIA_CIRCULARIDADE_2026-07-25.md](00_linha-de-base_2026-07-25/AUDITORIA_CIRCULARIDADE_2026-07-25.md) | Histórico | `319592d` |
| 00.05 | Dupla definição de “fronteira” | [INVENTARIO_FRONTEIRA_2026-07-25.md](00_linha-de-base_2026-07-25/INVENTARIO_FRONTEIRA_2026-07-25.md) | Histórico | `55d1e00` |
| 00.06 | Busca das observações de BMP | [BUSCA_OBSERVACOES_BMP_2026-07-25.md](00_linha-de-base_2026-07-25/BUSCA_OBSERVACOES_BMP_2026-07-25.md) | Histórico / aberto | `5191ee5` |
| 00.07 | Verificação do benchmark FIESP | [VERIFICACAO_BENCHMARK_FIESP_2026-07-25.md](00_linha-de-base_2026-07-25/VERIFICACAO_BENCHMARK_FIESP_2026-07-25.md) | Histórico | `5191ee5` |
| 00.08 | Auditoria detalhada do benchmark | [FIESP_BENCHMARK_AUDIT_REPORT.md](00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md) | Histórico | atualizado em `55d1e00` |
| 00.09 | Rascunho paralelo de decisões D01–D11 | [DECISOES_METODOLOGICAS_RASCUNHO_D01-D11.md](00_linha-de-base_2026-07-25/DECISOES_METODOLOGICAS_RASCUNHO_D01-D11.md) | Histórico / não normativo | primeiro versionamento nesta organização |

### 01 — Recálculo e reconciliação (2026-07-26)

| Ordem | Lote/tema | Artefato | Estado | Registro Git original |
|---:|---|---|---|---|
| 01.01 | Delta do Lote 2 | [DELTA_LOTE2_2026-07-26.md](01_reconciliacao_2026-07-26/DELTA_LOTE2_2026-07-26.md) | Aplicado / histórico | `c64a64f` |
| 01.02 | Confronto FIESP | [CONFRONTO_FIESP_2026-07-26.md](01_reconciliacao_2026-07-26/CONFRONTO_FIESP_2026-07-26.md) | Histórico | `ba36c20` |
| 01.03 | Dívidas e pendências | [DIVIDAS_LOTE5.md](01_reconciliacao_2026-07-26/DIVIDAS_LOTE5.md) | Aberto | `ba36c20` |
| 01.04 | Fechamento da sessão | [ESTADO_2026-07-26.md](01_reconciliacao_2026-07-26/ESTADO_2026-07-26.md) | Histórico | `6b30aa6` |
| 01.05 | Inconsistências internas | [INCONSISTENCIAS_INTERNAS_2026-07-26.md](01_reconciliacao_2026-07-26/INCONSISTENCIAS_INTERNAS_2026-07-26.md) | Histórico / aberto | primeiro versionamento nesta organização |

### 02 — Adventure A: inventário e linhagem (2026-07-27 a 2026-07-28)

| Ordem | Lote/tema | Artefato | Estado |
|---:|---|---|---|
| 02.01 | A0 — inventário exaustivo | [INVENTARIO_NUMEROS_2026-07-27.md](02_adventure-a_2026-07-27-28/INVENTARIO_NUMEROS_2026-07-27.md) | Histórico |
| 02.02 | A0b — triagem do inventário | [INVENTARIO_NUMEROS_TRIAGEM_2026-07-27.md](02_adventure-a_2026-07-27-28/INVENTARIO_NUMEROS_TRIAGEM_2026-07-27.md) | Histórico |
| 02.03 | A0c — afirmações estaduais | [INVENTARIO_AFIRMACOES_2026-07-27.md](02_adventure-a_2026-07-27-28/INVENTARIO_AFIRMACOES_2026-07-27.md) | Histórico |
| 02.04 | A1 — base de medida da vinhaça | [A1_BASE_VINHACA_2026-07-27.md](02_adventure-a_2026-07-27-28/A1_BASE_VINHACA_2026-07-27.md) | Histórico |
| 02.05 | A1b — representatividade | [A1b_REPRESENTATIVIDADE_VINHACA_2026-07-27.md](02_adventure-a_2026-07-27-28/A1b_REPRESENTATIVIDADE_VINHACA_2026-07-27.md) | Histórico |
| 02.06 | A1c — ponderação | [A1c_PONDERACAO_VINHACA_2026-07-27.md](02_adventure-a_2026-07-27-28/A1c_PONDERACAO_VINHACA_2026-07-27.md) | Histórico |
| 02.07 | A1d — base do corpus | [A1d_BASE_CORPUS_BMP_VINHACA_2026-07-27.md](02_adventure-a_2026-07-27-28/A1d_BASE_CORPUS_BMP_VINHACA_2026-07-27.md) | Histórico / limitação registrada |
| 02.08 | A1e — reconstrução do corpus | [A1e_CORPUS_BMP_VINHACA_2026-07-28.md](02_adventure-a_2026-07-27-28/A1e_CORPUS_BMP_VINHACA_2026-07-28.md) | Histórico / artefatos de rastreabilidade |
| 02.09 | A1f — busca dirigida | [A1f_BUSCA_BMP_VINHACA.md](02_adventure-a_2026-07-27-28/A1f_BUSCA_BMP_VINHACA.md) | Histórico / corpus ampliado |
| 02.10 | A2 — FORSU | [A2_FORSU_2026-07-27.md](02_adventure-a_2026-07-27-28/A2_FORSU_2026-07-27.md) | Histórico / decisão aberta |
| 02.11 | A2b — caminhos de consumo de FORSU | [A2b_CAMINHOS_CONSUMO_FORSU_2026-07-28.md](02_adventure-a_2026-07-27-28/A2b_CAMINHOS_CONSUMO_FORSU_2026-07-28.md) | Histórico / expansão do diagnóstico |
| 02.12 | A3b — suficiência dos corpora | [A3b_SUFICIENCIA_CORPORA.md](02_adventure-a_2026-07-27-28/A3b_SUFICIENCIA_CORPORA.md) | Histórico |
| 02.13 | A4 — linhagem no banco | [A4_LINHAGEM_BANCO.md](02_adventure-a_2026-07-27-28/A4_LINHAGEM_BANCO.md) | Histórico / limitação registrada |
| 02.14 | A7 — origem dos parâmetros públicos | [A7_ORIGEM_PARAMETROS.md](02_adventure-a_2026-07-27-28/A7_ORIGEM_PARAMETROS.md) | Histórico; originou B-URG-2 |
| 02.15 | A8 — arqueologia da calibração | [A8_ARQUEOLOGIA_CALIBRACAO_2026-07-28.md](02_adventure-a_2026-07-27-28/A8_ARQUEOLOGIA_CALIBRACAO_2026-07-28.md) | Histórico |

Os artefatos ainda não rastreados recebem seu primeiro versionamento com esta
organização. O A8 foi originalmente commitado em `afa9e3b`.

### 03 — Adventure B: reconciliação de superfícies (2026-07-28)

| Ordem | Lote/tema | Artefato | Estado | Registro Git original |
|---:|---|---|---|---|
| 03.01 | B-URG-1 — FORSU | Sem relatório próprio: o lote parou ao encontrar caminhos públicos adicionais, documentados no [A2b](02_adventure-a_2026-07-27-28/A2b_CAMINHOS_CONSUMO_FORSU_2026-07-28.md) | Interrompido / escopo a redefinir | — |
| 03.02 | B-URG-2 — rótulo `nStudies` | [B-URG-2_ROTULO_NSTUDIES_2026-07-28.md](03_adventure-b_2026-07-28/B-URG-2_ROTULO_NSTUDIES_2026-07-28.md) | Aplicado | `3ff2356` |

## Relação causal resumida

1. A linha de base identificou divergências e fragilidades de rastreabilidade.
2. O Lote 2 recalculou e congelou deltas sem apagar a linha de base.
3. A Adventure A inventariou números, reconstruiu evidências de vinhaça, localizou a
   duplicidade FORSU e auditou a linhagem banco–API–UI.
4. A Adventure B começou a reconciliar superfícies públicas; B-URG-1 parou por expansão
   de escopo e B-URG-2 removeu uma alegação observacional indevida.

## Regras de preservação

- Não editar conclusões antigas para fazê-las coincidir com descobertas novas.
- Registrar correções em novo lote e apontar para o artefato anterior.
- Manter comandos e saídas literais quando fizerem parte da evidência.
- Atualizar este índice ao criar, concluir, interromper ou superseder um lote.
- Não colocar novos relatórios soltos na raiz do repositório ou em `docs/data`.
