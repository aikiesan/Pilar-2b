# B7 — Saneamento pré-merge da branch canônica

**Data:** 2026-07-29
**Estado do lote:** **INTERROMPIDO NO PASSO 1.2** — condição de parada do próprio briefing.
**Branch de trabalho:** nenhuma. **Não houve checkout de `fix/canonical-consistency-2026-07`.**
**Alterações no repositório:** nenhuma além deste relatório. Nenhum commit, nenhum merge.

---

## Por que este lote parou antes de executar

O PASSO 1.2 diz, literalmente:

> *Verificar por `git log --follow` se houve renomeação que justificasse a deleção.
> **Se houve, PARE e reporte antes de restaurar.***

**Houve renomeação.** E o que veio depois dela não foi um acidente de reorganização: foi
uma decisão de política explícita, com mensagem de commit e regra de `.gitignore`.

Além disso, duas premissas do A17 que sustentam a recomendação de merge **não sobrevivem
à execução** (§3). O PASSO 5 é condicionado a "SOMENTE se o A17 recomendou merge seguro";
essa condição precisa ser reavaliada pelo autor antes de qualquer coisa.

---

## §1 — PASSO 1.2: a cronologia real do insumo de registro

```bash
git log --follow --format="%h %ad %s" --date=short --name-status \
  origin/fix/canonical-consistency-2026-07 \
  -- cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
```

Saída:

```
9fdfcb7 2026-07-27 docs: reestrutura e organiza repositorio de documentacao e historico
D	cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
92fb365 2026-06-05 docs(audit): add scientific parameter audit report (#89)
A	cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
```

Dois commits, com papéis distintos:

| Commit | Data | Ação |
|---|---|---|
| `9fdfcb7` | 2026-07-27 14:10 | **Moveu** `docs/data/municipality_biomass_tons.csv` → `docs/data/datasets/municipality_biomass_tons.csv` |
| `9ea4c87` | 2026-07-27 14:38 | **Removeu do rastreamento** o arquivo no novo caminho, e adicionou as regras de `.gitignore` |

`9ea4c87` — *"docs: remove heavy generated dataset files from git tracking and update
gitignore"* — removeu **oito** artefatos do diretório `datasets/` de uma só vez:

```
docs/data/datasets/METADATA.json                                    163 -
docs/data/datasets/baseline_2026-07-25.json                         408 -
docs/data/datasets/biogas_canonical_state_summary.csv                13 -
docs/data/datasets/canonical_results.json                       132.413 -
docs/data/datasets/espectro_estimativas_biometano_sp_2026-07-26.csv  12 -
docs/data/datasets/estado_2026-07-26_lote2.json                     393 -
docs/data/datasets/municipality_biomass_tons.csv                    646 -
docs/data/datasets/validator_exclusions.json                         31 -
```

e gravou no `.gitignore` da branch:

```
40: docs/data/datasets/*.json
41: docs/data/datasets/*.csv
42: !docs/data/datasets/README.md
```

**O conteúdo do CSV nunca mudou.** SHA-256 idêntico em `origin/main` e no blob
imediatamente anterior ao untrack:

```
main            → 5f8bc6c9c16af112ef2f3a796a235061998826410866c6618a02f53078a10964
9ea4c87^ (datasets/) → 5f8bc6c9c16af112ef2f3a796a235061998826410866c6618a02f53078a10964
```

### Correção de um achado meu no A10

O relatório A10, §1.4, afirma que o CSV foi *"removido pelo commit `9fdfcb7` … **sem
renomeação**"* e caracteriza o episódio como perda acidental numa faxina de documentação.
**Isso está errado nos dois pontos** e a diferença muda a decisão:

- houve renomeação (`9fdfcb7`), e
- a remoção do rastreamento (`9ea4c87`) foi **deliberada e declarada**, com política de
  `.gitignore` para impedir que arquivos gerados pesados voltem ao índice.

O A10 deve ser lido com esta correção. O que **não** muda: o gerador continua apontando
para o caminho **pré-renomeação** (`compute_sp_canonical_totals.py:40`), e por isso não
executa. O defeito é real; a causa é outra.

### O que isso significa para o PASSO 1.1

Restaurar `municipality_biomass_tons.csv` ao rastreamento **não é uma restauração — é a
reversão de uma decisão de política tomada explicitamente em `9ea4c87`**, e colide com
as regras 40–41 do `.gitignore` da própria branch.

Existem pelo menos três saídas, e a escolha entre elas é do autor:

| Opção | O que implica |
|---|---|
| **A — Reverter a política para este arquivo** | Adicionar `!docs/data/datasets/municipality_biomass_tons.csv` ao `.gitignore` e recommitar o CSV (646 linhas). O insumo de registro volta a ser versionado, com o custo que `9ea4c87` quis evitar. |
| **B — Apontar o gerador para o caminho novo** | Alterar `_CSV` para `docs/data/datasets/…`. **Não resolve nada por si só**: o arquivo continua não versionado, então CI e terceiros seguem sem conseguir executar. |
| **C — Tratar o insumo como dado externo declarado** | Publicá-lo fora do git (repositório de dados / DOI) e fazer o gerador buscá-lo por manifesto com hash. Coerente com a política de `9ea4c87` e com a tese de rastreabilidade do manuscrito, e o mais caro. |

**Recomendação:** A opção **B isolada não deve ser executada** — daria a impressão de
correção sem restaurar reprodutibilidade. Entre A e C, A destrava o merge imediatamente e
C é a resposta correta a longo prazo. Como o manuscrito afirma que qualquer pessoa
regenera os números com um comando, e um arquivo não versionado torna essa afirmação
falsa, **a decisão não é apenas de engenharia: é sobre a alegação central do artigo.**

Por isso este lote parou aqui, como o PASSO 1.2 manda.

---

## §2 — Os três arquivos deletados de `main` são a mesma política

```bash
git diff --diff-filter=D --name-only origin/main origin/fix/canonical-consistency-2026-07 \
  -- cp2b-workspace/NewLook
```

```
cp2b-workspace/NewLook/docs/data/METADATA.json
cp2b-workspace/NewLook/docs/data/biogas_canonical_state_summary.csv
cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
```

Os três seguiram o mesmo percurso: movidos para `datasets/` em `9fdfcb7`, desrastreados
em `9ea4c87`. Não são três acidentes — são uma política aplicada a três arquivos.

**Consequência direta para o PASSO 5.1** ("Confirmar que nenhum arquivo de `main` é
deletado pelo merge"): essa confirmação **não pode ser obtida** no estado atual. Restaurar
apenas o CSV do PASSO 1 resolveria **um** dos três; `METADATA.json` e
`biogas_canonical_state_summary.csv` continuariam sendo deletados de `main` pelo merge.

O PASSO 5.1, como redigido, exige uma decisão sobre os três, não sobre um.

---

## §3 — O gate do A17: duas premissas contrariadas por execução

O PASSO 5 é condicionado ao A17 ter recomendado merge seguro. Duas afirmações do A17 que
sustentam essa recomendação **são contrariadas por execução direta** — parte dela feita
pelo próprio autor.

### 3.1 A17 Tarefa 4.1 prevê CI totalmente verde. Não está verde.

| Job | A17 (previsto) | Executado (A10 §8) |
|---|---|---|
| `backend-lint` | **VERDE** — "todos os scripts e módulos da branch passam nos linters" | **VERMELHO** — `black`: 32 arquivos a reformatar; `isort`: 13 arquivos com imports fora de ordem |
| `backend-test` | **VERDE** — "939 testes unitários executados e aprovados" | **VERMELHO** — `20 failed, 950 passed` |
| `frontend-test` | **VERDE** — "testes unitários e a11y aprovados" | **VERMELHO** — `3 suites failed, 25 passed; 1 test failed, 577 passed` (execução do próprio autor) |

A Tarefa 4 do A17 é **previsão**, não execução; o A10 §8 é execução, com saída literal
registrada. Onde os dois divergem, a execução prevalece.

Observe-se ainda que o A17 diz "939 testes", o corpo do PR #165 diz "958 passed", e a
execução atual dá 950 passed + 20 failed. **Três contagens diferentes para a mesma
branch.**

### 3.2 O A17 não contradiz o A10 onde importa

Onde os dois relatórios se sobrepõem em matéria de fato verificável, concordam, e o A17
acrescenta precisão que eu não tinha:

- merge-tree limpo, 0 conflitos — não verifiquei; aceito como do A17;
- `FRONTIER_ALPHA = 0.5` permanece — **concordante** com A10 BLOCKER-11;
- 10 dos 15 marcadores do Apêndice A falham — **concordante** com A10 BLOCKER-8, com a
  mesma classificação por causa;
- razão pico/vale 3,3344 mensal vs. 3,45 diária — **concordante** com A10 BLOCKER-7;
- hash `113fb331…` não corresponde ao versionado — **concordante** com A10 BLOCKER-3;
- o merge remove as strings de i18n que afirmam superar o benchmark FIESP — informação
  nova e materialmente favorável ao merge, que o A10 não havia levantado.

O único ponto em que o A17 me corrige é a cronologia do CSV (§1), e a correção é boa.

O único ponto em que devo corrigir o A17 é a Tarefa 4.

---

## §4 — Passos não executados e por quê

| Passo | Estado | Motivo |
|---|---|---|
| 1.1 Restaurar o CSV | **BLOQUEADO** | Condição de parada 1.2 atingida. Requer decisão A/B/C do autor (§1). |
| 1.2 Verificar renomeação | **EXECUTADO** | Houve renomeação. Reportado. |
| 1.3 Commit isolado | **NÃO EXECUTADO** | Depende de 1.1. |
| 2.1 Reconciliar caminho do artefato | **NÃO EXECUTADO** | Depende de 1. Registro: existem **três** caminhos em jogo — o gerador escreve em `docs/data/canonical_results.json`; o JSON commitado está em `backend/canonical_results.json`; e `9ea4c87` desrastreou um terceiro, `docs/data/datasets/canonical_results.json` (132.413 linhas). A decisão do 2.1 precisa considerar os três, não dois. |
| 2.2 Conferir insumos vs. `provenance` | **NÃO EXECUTADO** | Depende de 1. |
| 2.3 Corrigir `UnicodeEncodeError` | **NÃO EXECUTADO** | Independente dos demais; poderia ser feito isolado, mas o lote está parado. |
| 3.x Regenerar o artefato | **NÃO EXECUTADO** | Impossível: o gerador não roda sem o insumo. |
| 4.1 Fixar versões de lint | **NÃO EXECUTADO** | Independente; ver recomendação abaixo. |
| 4.2 Expectativas de teste | **NÃO EXECUTADO** | **Provável segunda parada** — ver §5. |
| 4.3 `transformIgnorePatterns` | **NÃO EXECUTADO** | Independente. |
| 4.4 Concluir remoção de `rpo` | **NÃO EXECUTADO** | Independente. |
| 5.x Merge | **BLOQUEADO** | 5.1 não pode ser confirmado (§2) e o gate do A17 precisa de reavaliação (§3). |
| 6.x Gate do DEC-011 | **NÃO EXECUTADO** | Depende de 3. |

---

## §5 — Aviso sobre o PASSO 4.2: segunda parada provável

O PASSO 4.2 manda determinar qual valor é canônico **antes** de alterar o teste, e diz:
*"Se o teste estiver certo e o parâmetro errado, isso não é deste lote: PARE e reporte."*

O caso é:

```
test_canonical_loader::test_bagaco_values_match_canonical
  assert p.bmp.medio == pytest.approx(165.0)
  E  assert 115.0 == 165.0 ± 1.6e-04
```

O bagaço é **31,7 % do inventário estadual** — o maior stream do manuscrito. Uma mudança
de BMP de 165 para 115 é de −30,3 % no parâmetro do maior contribuinte.

Este lote proíbe alterar `feedstocks.yaml`. Portanto, se a investigação concluir que 165
era o valor correto, **o PASSO 4.2 para**, e a correção pertence a outro lote com tabela
de delta e aprovação. Se concluir que 115 é o correto, o teste é que está desatualizado e
pode ser ajustado aqui.

**A investigação não foi feita** porque o lote parou antes. Registro o alerta para que o
4.2 não seja executado como um ajuste mecânico de expectativa de teste: ele é, na prática,
uma verificação paramétrica sobre o maior stream do artigo.

---

## §6 — O que pode avançar sem decisão do autor

Quatro itens são independentes do impasse do insumo e não alteram nenhum número publicado:

1. **2.3** — `UnicodeEncodeError` do gerador (reconfigurar o stream de saída para UTF-8).
2. **4.1** — fixar versões de `black`/`isort`/`flake8` no workflow, eliminando o
   não-determinismo do job de lint; e rodar os formatadores.
3. **4.3** — `transformIgnorePatterns` cobrindo `next-intl`.
4. **4.4** — concluir a remoção de `rpo`/PODA_URBANA em `biomassAvailability.ts`, o que
   torna verdadeiro o campo `poda_urbana.public_interface: "removed"` do arquivo canônico.

Nenhum dos quatro toca `feedstocks.yaml` nem qualquer folha numérica. Os três últimos
levam três dos quatro grupos de falha de CI ao verde — restando apenas as falhas causadas
pelo insumo ausente e a expectativa do bagaço.

**Não os executei** porque o briefing estrutura B7 como sequência com gate no PASSO 1, e
avançar para o PASSO 4 com o PASSO 1 em aberto contraria o princípio declarado do lote.
Digam-me e executo os quatro como lote isolado.

---

## Decisões que dependem do autor

1. **Insumo de registro:** opção A, B ou C do §1. Recomendo **A** para destravar e **C**
   como trabalho subsequente; **B isolada, não**.
2. **Os outros dois arquivos deletados** (`METADATA.json`,
   `biogas_canonical_state_summary.csv`): mesma decisão, ou tratamento distinto?
3. **Gate do A17:** a recomendação de merge foi emitida sob previsão de CI verde que a
   execução contradiz. Revalidar antes do PASSO 5.
4. **Autorização para executar o §6** como lote isolado, fora da sequência.

---

*Nenhum merge, nenhum commit, nenhum checkout. Único arquivo escrito: este relatório.*
