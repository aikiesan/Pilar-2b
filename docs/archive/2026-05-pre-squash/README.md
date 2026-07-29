# Arquivo — material anterior ao squash de 2026-05-19

> **SUPERADO. NÃO É ESPECIFICAÇÃO CORRENTE.**
> **Os números contidos nestes arquivos NÃO SÃO CANÔNICOS.**

## O que é isto

Material recuperado da linhagem de desenvolvimento que o squash de 2026-05-19
descartou, preservado aqui **exclusivamente para rastreabilidade histórica**.

O repositório público PILAR-2b tem duas raízes de commit disjuntas:

| Raiz | Data | Descrição |
|---|---|---|
| `41c9ea053611f31f01c35c94d5228a6593b5ca71` | 2026-05-19 | `Initial public release: PILAR-2b v3.0.3` — raiz de `main` |
| `2fce883ed9155276f61113d4aa2a5a1c56b0730d` | 2025-11-16 | `CP2B Maps V3 - Modern Web Platform Foundation` — raiz do desenvolvimento real |

A segunda **não é ancestral de `main`**
(`git merge-base --is-ancestor 2fce883 HEAD` → falso). O release público foi um
squash único que não carregou 34 caminhos presentes no tip da linhagem original.

Estes arquivos vêm de `ec52631959a777d27c2f6a7df038b203d6d6a356`, tip de
`origin/feat/payback-overhaul-ux-sprint` em 2026-07-25
(`feat: scenario-specific CAPEX tiers replace ±30% multiplier (Sprint 5)`,
2026-05-16).

Preservação redundante da linhagem completa:

- branch `origin/archive/dev-history-pre-squash` → `ec52631`
- tag `archive/dev-history-pre-squash` (criada fora desta sessão; o relay Git
  desta sessão recusa `refs/tags/*` com HTTP 403)
- `git bundle --all`, sha256
  `5bff22478d919b8091588420a6e974975bca8c0fd3b0011f217e374bc06e5999`,
  mantido fora do repositório

## Por que isto NÃO deve ser lido como fonte

Os documentos abaixo foram escritos entre fevereiro e maio de 2026, **antes**
das correções metodológicas de junho e julho de 2026 — entre elas a correção da
interpretação de unidades do IBGE PAM (cana decomposta em 4 sub-fluxos, citros
× 0,50), que sozinha reduziu o total estadual de CH₄ de 8,38 para 3,57 Mm³/dia,
e a recalibração de BMP de junho de 2026.

Discrepância concreta, para deixar o risco explícito: `Outline_Paper_CP2b _) (1).md`
afirma um *"potencial mobilizável de 19,69 milhões de m³ de CH4/dia"* para São
Paulo. O valor canônico corrente, produzido por
`backend/scripts/compute_sp_canonical_totals.py` e congelado em
`cp2b-workspace/NewLook/docs/data/baseline_2026-07-25.json`, é **3,6488 Mm³/dia**
(cenário medio) — uma razão de 5,4×.

**A fonte de verdade numérica é, e continua sendo:**

| Grandeza | Fonte |
|---|---|
| Parâmetros bioquímicos e FDE | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` |
| Totais estaduais | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py` |
| Estado numérico congelado | `cp2b-workspace/NewLook/docs/data/baseline_2026-07-25.json` |

## Conteúdo

| Arquivo | Origem no tip pré-squash | Bytes |
|---|---|---:|
| `Outline_Paper_CP2b _).md` | raiz do repositório | 1.473.995 |
| `Outline_Paper_CP2b _) (2).md` | raiz do repositório | 530.363 |
| `Outline_Paper_CP2b _) (1).md` | raiz do repositório | 18.882 |
| `Cronograma de Execução_CP2B.docx.md` | raiz do repositório | 6.491 |
| `Cronograma de metas e entregas_CP2B.docx.md` | raiz do repositório | 3.079 |
| `MIGRATION_PLAN.md` | raiz do repositório | 10.182 |
| `README_DICIONARIO_PIPELINE.md` | raiz do repositório | 7.316 |
| `backend-migrations/010_create_validation_plants_FIXED.sql` | `cp2b-workspace/NewLook/backend/migrations/` | 14.675 |
| `backend-migrations/001_rollback.sql` | `cp2b-workspace/NewLook/backend/migrations/` | 1.296 |
| `backend-scripts-archive/**` (13 entradas) | `cp2b-workspace/NewLook/backend/scripts/archive/` | — |

Os caminhos foram achatados: `backend/migrations/` → `backend-migrations/`,
`backend/scripts/archive/` → `backend-scripts-archive/`. Isso é deliberado, para
que nenhum destes arquivos possa ser confundido com um artefato ativo da
aplicação nem ser aplicado por engano por um runner de migrações.

### Não restaurado

`drive-download-20260507T225048Z-3-001.zip` (26.976.948 B) permanece **fora do
Git**. É um binário de 27 MB; a decisão sobre o que dele entra no repositório
está pendente.

## Exclusão do validador de documentação (Lote 4)

Este diretório inteiro está **excluído** do validador que proibirá números
digitados à mão em `docs/`, declarado em
`cp2b-workspace/NewLook/docs/data/validator_exclusions.json`.

O motivo é o mesmo que justifica o aviso no topo: são documentos históricos
imutáveis. Os números dentro deles **devem** divergir dos canônicos — é
exatamente isso que os torna evidência do estado anterior. Reconciliá-los
destruiria o valor de rastreabilidade. Não edite nada aqui para "corrigir"
um número.
