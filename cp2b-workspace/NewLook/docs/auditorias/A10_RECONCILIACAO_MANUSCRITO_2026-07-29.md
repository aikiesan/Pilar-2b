# A10 — Reconciliação Manuscrito ↔ Pipeline Canônico

**Data de execução:** 2026-07-29
**Modo:** somente leitura e diagnóstico
**Branch do working tree durante a execução:** `fix/fde-test-path-portability` @ `75e0b1e`
**Escopo entregue:** Tarefas 0 a 5 completas, mais diagnóstico de CI autorizado pelo
autor. As Tarefas 2 a 5 estavam interrompidas nas duas primeiras passagens por ausência
do draft; o autor forneceu o texto do draft na terceira passagem e elas foram então
executadas. Registro de proveniência do draft em §7; CI em §8.

---

## Sumário executivo

| Classe | Contagem |
|---|---|
| **BLOCKER** | 12 |
| **VERIFY** | 6 (2 resolvidos por execução) |
| **OK** | 9 |
| **INDETERMINADO** | 3 abertos (2 resolvidos) |

**O achado central, em uma frase:** os números do manuscrito estão certos e sua
rastreabilidade não existe. Todos os 24 valores da Tabela 2, os 15 da Tabela 3 e os 10
de concentração espacial conferem com o `canonical_results.json`; mas 10 dos 15
marcadores do Apêndice A não resolvem, três SHA-256 distintos disputam o mesmo
`feedstocks.yaml`, o insumo de registro foi deletado da branch, e o pipeline que o artigo
apresenta como sua contribuição metodológica não executa. O artigo afirma que o CI
reprova quando um número do manuscrito diverge do computado; o gate não pode estar
fazendo isso.

> **Adendo de 2026-07-29 (segunda passagem).** A árvore da branch
> `origin/fix/canonical-consistency-2026-07` foi extraída para fora do repositório via
> `git archive` (sem checkout, sem merge) e o gerador foi executado contra os próprios
> insumos da branch. **Ele não roda.** O insumo de registro foi deletado da branch e o
> caminho de saída do JSON não corresponde ao JSON commitado. A causa raiz do
> BLOCKER-3 está agora determinada — ver §1.4. O `[INDETERMINADO-1]` da primeira
> passagem foi **resolvido**: a reprodução não é possível, e o motivo é conhecido.

Três achados estruturais dominam este lote e precisam ser resolvidos **antes** que
qualquer verificação valor-a-valor do manuscrito seja possível:

1. **O draft nomeado no briefing não existe em nenhuma ref do repositório.** O único
   manuscrito CEUS versionado é `PILAR-2b_CEUS_2026-04.md`. Conforme instrução
   explícita ("não substitua por outra versão sem me avisar"), a Tarefa 2 em diante
   foi interrompida.
2. **Todo o estado auditado — os lotes A0–A16, B-URG, B1–B6, o
   `DECISOES_METODOLOGICAS.md` e o `canonical_results.json` — existe apenas na branch
   não mergeada `origin/fix/canonical-consistency-2026-07` (PR #165, aberto).** O
   working tree está numa branch que não contém nada disso e que reproduz o estado
   numérico *anterior* às correções.
3. **O `feedstocks_yaml_sha256` gravado em `canonical_results.json` não corresponde a
   nenhuma versão versionada de `feedstocks.yaml`, em nenhuma ref, nem em LF nem em
   CRLF.** A cadeia de proveniência do artefato canônico está quebrada.

O item prioritário 2.1 **foi resolvido** e a resposta é a alternativa (a): a ordem dos
rótulos no Apêndice A está trocada. Detalhe na §2.1.

---

## Tarefa 0 — Inventário do estado auditado

### 0.1 Arquivos de auditoria

**Localização real:** `cp2b-workspace/NewLook/docs/auditorias/2026-07-consistencia-canonica/`
— **não** `docs/audits/`, que não existia antes deste relatório. Convenção do briefing
diverge da convenção do repositório; este relatório seguiu o caminho literal do briefing.

**Ref onde existem:** exclusivamente `refs/remotes/origin/fix/canonical-consistency-2026-07`.
Comando de verificação:

```bash
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do git ls-tree -r --name-only "$r" | grep -q "docs/auditorias" && echo "$r"; done
```

Saída: `refs/remotes/origin/fix/canonical-consistency-2026-07` (única).

| Subdiretório | Arquivos | Commit | Data commit |
|---|---|---|---|
| `00_linha-de-base_2026-07-25/` | AUDITORIA_PILAR2B, ATIVIDADE_GIT_COMPLETA, AUDITORIA_CIRCULARIDADE, BUSCA_OBSERVACOES_BMP, FIESP_BENCHMARK_AUDIT_REPORT, FORENSE_VALIDACAO, INVENTARIO_FRONTEIRA, VERIFICACAO_BENCHMARK_FIESP | `76fb01b` | 2026-07-27 |
| `00_…` (rascunho) | DECISOES_METODOLOGICAS_RASCUNHO_D01-D11 | `e69bee6` | 2026-07-27 |
| `01_reconciliacao_2026-07-26/` | CONFRONTO_FIESP, DELTA_LOTE2, DIVIDAS_LOTE5, ESTADO_2026-07-26, INCONSISTENCIAS_INTERNAS | `76fb01b` | 2026-07-27 |
| `02_adventure-a_2026-07-27-28/` | A1, A1b–A1f, A2, A2b, A3b, A4, A7, INVENTARIO_AFIRMACOES, INVENTARIO_NUMEROS, INVENTARIO_NUMEROS_TRIAGEM | `76fb01b` | 2026-07-27 |
| `02_…` | A8_ARQUEOLOGIA_CALIBRACAO | `e69bee6` | 2026-07-27 |
| `03_adventure-b_2026-07-28/` | B-URG-2_ROTULO_NSTUDIES | `76fb01b` | 2026-07-27 |
| `04_adventure-a-fechamento_2026-07-28-29/` | A13, A15, A2c, A2d, A8b | `e69bee6` | 2026-07-27 |
| `05_adventure-b-superficies_2026-07-28-29/` | B-Q1, B-URG-4, B-URG-4b, B-URG-4c | `e69bee6` | 2026-07-27 |
| `06_adventure-b-canonico_2026-07-30-08-01/` | B1-FINAL, B1-PILOT_DELTA, B1-VERIFY | `e69bee6` | 2026-07-27 |
| `06_…` | B2-CLOSE_2026-08-01 | `78f92fd` | 2026-07-27 |
| `07_governanca_2026-07-30-08-01/` | B-URG-3_LICENCA_GPL3, FAPESP_ATRIBUICAO | `e69bee6` | 2026-07-27 |
| `08_adventure-a-conservadorismo_2026-08-02/` | A16_CONSERVADORISMO_ESTRUTURAL | `9e1930e` | 2026-07-27 |
| `09_fechamento_2026-08-03/` | B5-FS | `9ce38d5` | 2026-07-27 |
| `10_sazonalidade_2026-08-04/` | B6_SAZONALIDADE | `8f04e66` | 2026-07-27 |
| `11_confronto-externo_2026-08-04/` | A14, A14b | `e08da91`, `a3dda34` | 2026-07-27 |
| `11_…` | A14c_2026-08-05 | `fd54d02` | 2026-07-27 |

> **[VERIFY-1] Datas de nome de arquivo à frente das datas de commit.** Todos os 52
> arquivos foram commitados em **2026-07-27**, incluindo relatórios cujo nome declara
> 2026-08-01 a 2026-08-05. Nenhum arquivo tem data de commit posterior a 2026-07-27.
> A data corrente do sistema nesta execução é 2026-07-29 — anterior a datas que
> aparecem em nomes de arquivo e no corpo do `DECISOES_METODOLOGICAS.md` (DEC-013,
> "2026-08-03"). Não é determinável por evidência de repositório se isto é rebase/
> squash, relógio deslocado, ou nomeação prospectiva. **Não corrigir; registrar.**

### 0.2 Estado por lote

Classificação com base na evidência disponível. Atenção: **nenhum lote pode ser
declarado FECHADO em relação ao `main`**, porque nenhum deles está mergeado.

| Lote | Estado | Evidência |
|---|---|---|
| Lote 0–2b (PR #165) | **ABERTO** | PR #165 aberto, 46 commits, instrução explícita "Não fazer merge". Branch `fix/canonical-consistency-2026-07` não está contida em `main`. |
| A0 (linha de base) | **PARCIAL** | Relatórios existem em `00_linha-de-base_2026-07-25/`; existem apenas na branch aberta. |
| A1/A1b–A1f (vinhaça) | **PARCIAL** | 6 relatórios presentes. Corpo do PR #165 registra rendimento de CH₄ da vinhaça (2,88 Nm³/m³) como **inconsistência interna não resolvida**. |
| A2/A2b/A2c/A2d (FORSU) | **PARCIAL** | 4 relatórios; DEC-004 marcada "IMPLEMENTADA por DEC-010"; cobertura publicada em `canonical_results.json` (§2.3). |
| A3b (suficiência de corpora) | **PARCIAL** | `A3b_SUFICIENCIA_CORPORA.md` presente. Nota: **não existe arquivo `A3` no repositório**, apenas `A3b`. A referência do briefing a "relatório A3" (top-203 / 66,99 % / Gini 0,4896) **não tem arquivo correspondente versionado** — ver §2.2. |
| A4 (linhagem do banco) | **PARCIAL** | Relatório presente. |
| A7 (origem dos parâmetros) | **PARCIAL** | `A7_ORIGEM_PARAMETROS.md` presente — é a base da Tarefa 5, não executada. |
| A8/A8b (arqueologia da calibração) | **PARCIAL** | Ambos presentes. |
| A13, A15, A16 | **PARCIAL** | Presentes. |
| A14/A14b/A14c (confronto FIESP) | **PARCIAL** | Presentes; A14c é o arquivo mais recente da cadeia (2026-08-05). |
| A9 | **AUSENTE** | **Não existe nenhum arquivo `A9*` em nenhuma ref.** O briefing assume "lotes A0–A9 executados"; A9 não tem artefato. |
| A5, A6, A10, A11, A12 | **AUSENTES** | Sem artefato versionado. A numeração de lotes A é descontínua (A1–A4, A7, A8, A13–A16). |
| B-URG-1 | **AUSENTE (relatório)** | O briefing cita "divergência de 1,93× diagnosticada em B-URG-1". **Não existe arquivo `B-URG-1*`.** O diagnóstico correlato está em `A2c_DECOMPOSICAO_DIVERGENCIA_2026-07-28.md`. |
| B-URG-2 (rótulo n_studies) | **PARCIAL** | Relatório presente; DEC-006 ATIVA. |
| B-URG-3 (licença GPL-3) | **PARCIAL** | Relatório presente; verificação da Tarefa 3.3 **não executada**. |
| B-URG-4/4b/4c (superfícies) | **PARCIAL** | 3 relatórios; B-URG-4c marcado "FINAL". |
| B-Q1 (quarentena do corpus) | **PARCIAL** | DEC-007 ATIVA: corpus BMP em quarentena, R2 **suspensa**. |
| B1/B2/B5/B6 | **PARCIAL** | Relatórios presentes; DEC-010 a DEC-013 ATIVAS. |
| Lote 5 (sincronização de documentação) | **ABERTO** | `DIVIDAS_LOTE5.md` registra as pendências; o próprio PR #165 declara que toda documentação publicada fica desatualizada após o merge. |

> **[BLOCKER-1] Nenhum lote está fechado contra `main`.** Todo o corpo de auditoria e
> o artefato canônico vivem numa branch aberta que o autor instruiu explicitamente a
> não mergear. Enquanto isso, `main` e a branch de trabalho publicam os números
> **anteriores** às correções (§1.1). Submeter o manuscrito citando números da branch
> aberta significa citar números que o repositório público não produz.

### 0.3 Decisões com consequência textual no manuscrito

Fonte: `origin/fix/canonical-consistency-2026-07:cp2b-workspace/NewLook/docs/data/DECISOES_METODOLOGICAS.md`
(estado normativo, consolidação B5-FS, data declarada 2026-08-03).

| ID | Estado | Consequência textual |
|---|---|---|
| DEC-002 | ATIVA (ampliada por DEC-010, DEC-011) | `compute_sp_canonical_totals.py` + `canonical_results.json` são **fonte única** dos totais publicados. Qualquer número do manuscrito sem caminho no JSON é SEM ORIGEM por definição própria. |
| DEC-003 | ATIVA | Rotas VS e DQO da vinhaça permanecem separadas; "divergências não autorizam ajuste por alvo". O texto não pode apresentar uma rota única de vinhaça. |
| DEC-006 | ATIVA | **`reference_count` não pode ser apresentado como número de estudos, ensaios, amostras ou observações de BMP.** Qualquer frase do tipo "baseado em N estudos" derivada de contagem bibliográfica é insustentável. |
| DEC-007 | ATIVA | Corpus BMP agregado em **quarentena**; **R2 suspensa**. O manuscrito não pode invocar contenção de BMP por corpus como método vigente. |
| DEC-008 | ATIVA (corrigida por DEC-010) | Snapshots SQL legados **não são fonte publicada**. Números de mapa/API devem vir do pipeline canônico. |
| DEC-010 | ATIVA | FORSU por SNIS 2022 CO111 com fallback populacional explícito; lodos por ES006; exige igualdade dos 645 municípios entre rota pública e script. Consequência direta na §2.3. |
| DEC-011 | ATIVA | Toda afirmação numérica canônica em manuscrito deve usar **caminho do JSON**, com gate de CI (`scripts/validate_canonical_consistency.py`), tolerância absoluta 1e-6 / relativa 1e-9. |
| DEC-012 | ATIVA | Publicar concentração espacial **para CH₄ médio**; retirar PODA_URBANA da interface (`coverage:none`); publicar cobertura FORSU; **tratar min/médio/max como extremos determinísticos acoplados, não incerteza estatística**. O manuscrito não pode chamá-los de intervalo de confiança, quantil ou distribuição. |
| DEC-013 | ATIVA (fechamento paramétrico) | **FS = retenção de massa após perda documentada, nunca dias de oferta/365.** Sem fonte de perda, FS = 1,00; os 15 subfluxos instanciados passam a 1,00 nos três cenários. Qualquer descrição de FS como fator de sazonalidade/disponibilidade temporal no texto está incorreta. |
| DEC-001, DEC-004, DEC-005, DEC-009 | SUPERADAS/IMPLEMENTADAS | Sem consequência textual direta vigente. |

Confirmação independente pelo próprio JSON:
`uncertainty_interpretation = {"method": "coupled_parameter_extremes", "statistical_propagation": false, "monte_carlo": false, "limitation": "not confidence intervals, quantiles, or probability distributions"}` — coerente com DEC-012. **[OK-1]**

---

## Tarefa 1 — Integridade do pipeline canônico

### 1.1 Execução

**Comando exato** (a partir de `cp2b-workspace/NewLook/backend`):

```bash
PYTHONIOENCODING=utf-8 python scripts/compute_sp_canonical_totals.py
```

**Tempo de execução:** `real 0m5.953s` (medido na primeira execução, que abortou na
impressão; a execução completa tem a mesma ordem de grandeza).

> **[BLOCKER-2] O script não roda até o fim em Windows sem `PYTHONIOENCODING`.**
> Primeira execução, sem a variável:
> ```
> File "...compute_sp_canonical_totals.py", line 292, in _scenario_print
>   print("Methodology: IBGE PAM crop data \u2192 residue fractions \u2192 forward engine")
> UnicodeEncodeError: 'charmap' codec can't encode character '\u2192' in position 32
> ```
> O script **calcula** corretamente e **grava o CSV**, mas aborta antes de imprimir os
> totais. Um revisor que tentar reproduzir em Windows com o comando documentado obtém
> um traceback e nenhum número. Reprodutibilidade declarada não se sustenta.

**Saída literal (execução com `PYTHONIOENCODING=utf-8`), branch `fix/fde-test-path-portability`:**

```
INFO: Computing SP canonical FORWARD biogas totals...
INFO: Loaded 645 municipalities from municipality_biomass_tons.csv
INFO: Sugarcane raw (IBGE PAM green cane): 247.21 Mt/yr
INFO:   cana_bagaco      [agricultural|cana_PAM×0.280              ] CH4 medio= 1.966 M m³/d
INFO:   cana_torta       [agricultural|cana_PAM×0.030              ] CH4 medio= 0.251 M m³/d
INFO:   cana_palha       [agricultural|cana_PAM×0.053              ] CH4 medio= 0.062 M m³/d
INFO:   cana_vinhaca     [agricultural|cana_PAM×0.420              ] CH4 medio= 0.062 M m³/d
INFO: Citrus raw fruit: 15.01 Mt/yr → peel residue: 7.50 Mt/yr (×0.5)
INFO:   citrus           [agricultural|citrus_PAM×0.5              ] CH4 medio= 0.101 M m³/d
INFO:   soybean          [agricultural|csv_residue_tonnes          ] CH4 medio= 0.083 M m³/d
INFO:   corn             [agricultural|csv_residue_tonnes          ] CH4 medio= 0.093 M m³/d
INFO:   coffee           [agricultural|csv_residue_tonnes          ] CH4 medio= 0.017 M m³/d
INFO:   cattle           [livestock  |csv_head_count×EMBRAPA      ] CH4 medio= 0.403 M m³/d
INFO:   swine            [livestock  |csv_head_count×EMBRAPA      ] CH4 medio= 0.008 M m³/d
INFO:   poultry          [livestock  |csv_head_count×EMBRAPA      ] CH4 medio= 0.234 M m³/d
INFO:   rsu_organic      [urban      |sp_population_ibge2022      ] CH4 medio= 0.360 M m³/d
INFO:   rpo              [urban      |sp_population_ibge2022      ] CH4 medio= 0.009 M m³/d

==============================================================================
SP STATE — 100% FORWARD Canonical Biogas Potential
Methodology: IBGE PAM crop data → residue fractions → forward engine
==============================================================================

Métrica                                    MIN         MÉDIO           MAX
------------------------------------------------------------------------------
CH₄ prático (M m³/dia)                    0.75          3.65         14.74
Biogás prático (M m³/dia)                 1.35          6.53         26.30
Biometano (M m³/dia)                      0.73          3.54         14.29

  → Fronteira do Biogás (4º cenário, mid medio↔max):CH₄=9.19  Biogás=16.42  Biometano=8.92  M m³/dia

─── Benchmark FIESP ───────────────────────────────────────────────────────
  FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás
  SEMIL/FIESP 2024 (viável)                : ~11,4 M m³/dia biogás
  FIESP/Amplun 2025 (cana+aterro)          : 11,7 biogás / 6,4 biometano
  PILAR-2b (Base/Médio/Fronteira/Otimista biogás): 1.4 / 6.5 / 16.4 / 26.3 M m³/dia — Fronteira (31 resíduos) > FIESP 6,4 biometano
```

**Interpretação.** Estes valores reproduzem **exatamente** a coluna "Antes" da tabela
de delta do PR #165 (CH₄ 0,7537 / 3,6488 / 14,7363; Biogás 1,3507 / 6,5326 / 26,2993;
Biometano 0,7311 / 3,5393 / 14,2942). Ou seja: **a branch de trabalho é o estado
pré-correção.** Ela não é fonte válida para números de manuscrito.

Além disso, a saída desta versão do script ainda imprime:
- o **4º cenário "Fronteira"** com `FRONTIER_ALPHA` — suspenso por decisão do Lote 2;
- a linha de comparação FIESP com **"Fronteira (31 resíduos) > FIESP 6,4 biometano"** —
  exatamente a afirmação de superação de benchmark que a Tarefa 5 investigaria.

Ambos coerentes com a seção "NÃO resolvido neste PR" do #165.

> **Nota de conformidade com o modo somente-leitura:** a execução gravou
> `backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv`. Verificado por
> `git check-ignore -v`: o diretório está em `.gitignore:78`. O arquivo é **untracked e
> ignorado**; nenhum arquivo versionado do repositório foi alterado. `git status` do
> caminho retorna vazio.

### 1.2 SHA-256 de `feedstocks.yaml` vs. proveniência

**Desvio de especificação:** o campo do briefing é `provenance.feedstocks_sha256`. O
campo real em `canonical_results.json` é **`feedstocks_yaml_sha256`, no nível raiz**
(o bloco `provenance` não contém hash algum). Registrado como divergência de contrato.

**Valor gravado:**
`113fb331cd5301fccbae1aa69798dd15dbb6bc90892b8ecd31068f8ea09c54ce`

**Método do gerador** (`origin/fix/canonical-consistency-2026-07:…/compute_sp_canonical_totals.py:614`):
`hashlib.sha256(_FEEDSTOCKS.read_bytes()).hexdigest()` — bytes crus, sem normalização.

**Hashes medidos:**

| Origem | SHA-256 |
|---|---|
| Working tree, branch `fix/fde-test-path-portability` | `4755638326e11996a7dbd002b99fd92fc7606a71dada95a6639e90d4e73558f0` |
| Blob no tip de `origin/fix/canonical-consistency-2026-07` | `667a446c0f96a8167ac74bc574d9b332b558ca74de86c4d2cb139c7892ae768e` |
| Blob em `8f04e66` (commit que contém o JSON) | `667a446c0f96a8167ac74bc574d9b332b558ca74de86c4d2cb139c7892ae768e` |
| Blob em `e08da91` (`git_sha` gravado no JSON) | `4bfb8719041bf2f28dc3f34e39cfe209aee574c694b43ec87ab90acae2b8e19b` |
| **Alvo gravado no JSON** | **`113fb331…`** |

**Hipótese CRLF testada e rejeitada.** `core.autocrlf = true` neste clone, então o
working tree poderia diferir do blob. Teste direto sobre o blob de `8f04e66`:

```
LF  : 667a446c0f96a8167ac74bc574d9b332b558ca74de86c4d2cb139c7892ae768e
CRLF: b3d9ff53dda6315544cadef62554391aef37b6fe5cca035011c457ce2784511a
ALVO: 113fb331cd5301fccbae1aa69798dd15dbb6bc90892b8ecd31068f8ea09c54ce
```

Nenhuma das duas normalizações produz o alvo.

**Varredura exaustiva.** Todas as versões de `feedstocks.yaml` em **todas** as refs
(`refs/heads` + `refs/remotes`), 18 hashes distintos:

```bash
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do
  for c in $(git log --format=%H "$r" -- cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml); do
    git show $c:cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml | sha256sum | cut -d' ' -f1
  done
done | sort -u | grep -c "^113fb331"
```

Saída: **0**.

> **[BLOCKER-3] `feedstocks_yaml_sha256` não corresponde a nenhum estado versionado
> de `feedstocks.yaml`, em nenhuma ref, em nenhuma normalização de fim de linha.**
> O `canonical_results.json` foi gerado a partir de um `feedstocks.yaml` que não está
> no repositório. A cadeia de proveniência que DEC-002 e DEC-011 declaram como fonte
> única está **quebrada na raiz**. Nenhum número do manuscrito derivado deste JSON é
> rastreável até um insumo versionado enquanto isto não for resolvido.
>
> Insumo que falta para fechar: o `feedstocks.yaml` cujo sha256 é `113fb331…`, ou
> uma regeneração do JSON a partir de um arquivo versionado.

### 1.3 O `canonical_results.json` é artefato antigo commitado?

**Sim — e não é reproduzível pela branch de trabalho.**

| Evidência | Valor |
|---|---|
| Caminho | `cp2b-workspace/NewLook/backend/canonical_results.json` |
| Refs onde existe | apenas `origin/fix/canonical-consistency-2026-07` |
| `generated_at` | `2026-07-27T16:36:58.825743+00:00` (= 13:36:58 −03:00) |
| `git_sha` gravado | `e08da91b0f26212eae6ebd6e79c06859239bc029` |
| Commits que o tocaram | `cb7967a` (2026-07-27 08:20:45 −03:00, Lote B1-FINAL); `8f04e66` (2026-07-27 13:37:21 −03:00, Lote B6-CONCLUI) |
| `schema_version` | `2.1.0` |

O intervalo entre `generated_at` (13:36:58) e o commit `8f04e66` (13:37:21) é de **23
segundos** — consistente com geração seguida de commit imediato. Portanto o JSON **foi**
gerado por uma execução real, não copiado de um estado antigo. O problema não é
antiguidade, é a proveniência do insumo (§1.2).

> **[BLOCKER-4] A execução de 1.1 não gera nem pode gerar este arquivo.** O script na
> branch de trabalho (`787eba6`, 2026-07-18) tem como saída declarada apenas
> `sp_canonical_by_stream.csv`; não contém `import hashlib`, não emite JSON, e não lê
> `snis_sp_activity_2022.csv` nem `energy.yaml` — dois insumos que o `provenance` do
> JSON declara. São **duas versões diferentes do gerador**. A verificação pedida em
> 1.3 ("confirmar que o JSON foi gerado pela execução de 1.1") é **negativa**:
> a execução de 1.1 produz o estado pré-correção; o JSON pertence a outro gerador,
> em outra branch.

**[INDETERMINADO-1 — RESOLVIDO na §1.4]** Na primeira passagem a reprodução não foi
tentada por exigir checkout. Ela foi então executada **fora do repositório**, e o
resultado é negativo por causa determinada. Ver §1.4.

### 1.4 Reprodução na própria branch canônica — executada e **negativa**

**Método (sem checkout, sem merge, sem tocar `.git`):**

```bash
git archive origin/fix/canonical-consistency-2026-07 | tar -x -C <scratchpad>/pr165
```

`exit=0`, 33.331.200 bytes. A branch não tem `.gitattributes`, logo não há LFS a
resolver.

**Execução do gerador da branch contra os insumos da branch:**

```bash
cd <scratchpad>/pr165/cp2b-workspace/NewLook/backend
PYTHONIOENCODING=utf-8 python scripts/compute_sp_canonical_totals.py
```

**Saída literal:**

```
Traceback (most recent call last):
  File "...\scripts\compute_sp_canonical_totals.py", line 913, in <module>
    main()
  File "...\scripts\compute_sp_canonical_totals.py", line 893, in main
    _, municipalities, comparison = compute()
  File "...\scripts\compute_sp_canonical_totals.py", line 130, in compute
    rows, contexts, activity = _load_inputs()
  File "...\scripts\compute_sp_canonical_totals.py", line 96, in _load_inputs
    for row in csv.DictReader(_CSV.open(encoding="utf-8"))
FileNotFoundError: [Errno 2] No such file or directory:
  '...\pr165\cp2b-workspace\NewLook\docs\data\municipality_biomass_tons.csv'
EXIT=1
```

> **[BLOCKER-5] O insumo de registro foi deletado da branch canônica; o gerador não
> executa nela.**
>
> `compute_sp_canonical_totals.py:40` declara
> `_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"` — o arquivo que
> o próprio docstring chama de *"Input of record"* e que `provenance.municipal_activity_input`
> no JSON nomeia.
>
> Esse arquivo **foi removido** da branch pelo commit `9fdfcb7` (2026-07-27,
> *"docs: reestrutura e organiza repositorio de documentacao e historico"*), **sem
> renomeação**: não há nenhum caminho substituto na árvore da branch
> (`git ls-tree -r … | grep -iE "municipality.*\.csv|biomass_tons"` devolve apenas
> `analysis/data/02_municipality_summary_SP_2023.csv` — que é o `_CONTEXT` da linha 41,
> insumo distinto — e dois arquivos de código não relacionados).
>
> O arquivo existe em **todas as outras ~90 refs** do repositório, incluindo `main`.
> Foi perdido exclusivamente na branch que a cadeia de auditoria declara canônica, num
> commit de reorganização de documentação.
>
> **Consequência:** ninguém — nem o autor, nem um revisor, nem o CI — consegue
> regenerar `canonical_results.json` a partir da branch canônica. Os números que
> alimentam o manuscrito não são reproduzíveis a partir do estado versionado.

**Achado correlato — o JSON commitado está num caminho órfão.**

| Item | Caminho |
|---|---|
| Saída declarada pelo gerador (linha 45) | `_CANONICAL_JSON = _NEWLOOK / "docs" / "data" / "canonical_results.json"` |
| Existe na branch? | **NÃO** (`git cat-file -e` → `fatal: path … does not exist`) |
| JSON efetivamente commitado | `cp2b-workspace/NewLook/backend/canonical_results.json` |
| Existe na branch? | **SIM** |

O gerador vigente escreve num caminho que não existe na branch; o JSON que existe está
noutro caminho, que o gerador vigente não escreve. **São artefato e gerador
dessincronizados.** Isto explica o BLOCKER-3 de forma econômica: o
`backend/canonical_results.json` é remanescente de uma versão anterior do gerador, cujo
`feedstocks.yaml` de entrada (sha `113fb331…`) não sobreviveu ao histórico.

**Hipótese CRLF novamente testada e novamente rejeitada.** O `git archive` aplicou
conversão de fim de linha (`core.autocrlf=true`): o `feedstocks.yaml` extraído tem sha
`b3d9ff53dda6315544cadef62554391aef37b6fe5cca035011c457ce2784511a` — exatamente o valor
CRLF que eu havia calculado do blob `8f04e66`. Continua **≠** `113fb331…`. Nem a forma
LF (`667a446c…`) nem a CRLF (`b3d9ff53…`) da versão de tip produzem o hash gravado.

**Confirmação da ausência do draft na própria branch.** A árvore extraída contém
`docs/manuscrito/` com exatamente dois arquivos: `FOSS4G_2026.md` (2.992 bytes) e
`PILAR-2b_CEUS_2026-04.md` (740.449 bytes). **Nenhum draft de 2026-08.** Mergear o
PR #165 não produziria o manuscrito nomeado no briefing.

---

## Tarefa 2 — Verificação figura a figura

### Estado: INTERROMPIDA por ausência do draft

Busca exaustiva por `PILAR-2b_CEUS_draft_2026-08-05.md` ou sucessor:

```bash
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do git ls-tree -r --name-only "$r" | grep -i "ceus\|manuscrito/"; done | sort -u
```

Saída completa:
```
docs/manuscrito/FOSS4G_2026.md
docs/manuscrito/PILAR-2b_CEUS_2026-04.md
```

Histórico completo do diretório (`git log --all --diff-filter=AMR --name-only -- "docs/manuscrito/*"`)
registra apenas dois arquivos, ambos introduzidos em `9fdfcb7` e `76fb01b`.

> **O único manuscrito CEUS versionado é `PILAR-2b_CEUS_2026-04.md`** — quatro meses
> anterior ao draft nomeado no briefing, e anterior a **todos** os lotes de auditoria
> (que começam em 2026-07-25). Conforme instrução explícita do briefing, **não foi
> substituído** e a Tarefa 2 (exceto 2.1, resolvível por outra via) não foi executada.

### 2.1 — ITEM PRIORITÁRIO: ordem dos rótulos no Apêndice A → **RESOLVIDO**

Este item foi determinável **sem** o draft, porque o briefing fornece a tripla literal
`3.060 / 0.894 / 10.515` e o mapeamento alegado para `totals.ch4.{min,medio,max}`.

Valores lidos de `canonical_results.json` (`totals.ch4_practical`, unidade `m3_CH4/year`),
convertidos por `/365/1e6`:

| Rótulo canônico | Valor anual (m³ CH₄/ano) | Mm³/dia (÷365) | Mm³/dia (÷365,25) |
|---|---|---|---|
| `min` | 326.458.297,24 | **0,8944** | 0,8938 |
| `medio` | 1.116.862.580,90 | **3,0599** | 3,0578 |
| `max` | 3.837.998.317,52 | **10,5151** | 10,5079 |

**Conclusão: alternativa (a) — a ordem dos rótulos no manuscrito está trocada.**

Evidência: a tripla do manuscrito `3.060 / 0.894 / 10.515` contém exatamente os três
valores canônicos, com precisão de 3 casas decimais, mas nas posições **medio, min, max**.
Os dois primeiros estão permutados.

Isto **exclui** as alternativas (b) e (c):
- Não é (b) "valores trocados na origem": no JSON a ordem é estritamente
  `min < medio < max` (0,8944 < 3,0599 < 10,5151). A origem está correta.
- Não é (c) "min/medio/max não significam o que o rótulo sugere": `scenario` no JSON
  declara `min = "coupled deterministic lower parameter extreme"`,
  `medio = "coupled deterministic central parameter set"`,
  `max = "coupled deterministic upper parameter extreme"`. Os rótulos significam
  exatamente o que sugerem, e os valores respeitam a ordenação.

O divisor usado pelo manuscrito é **365**, não 365,25 (3,0599 → "3.060" arredonda
corretamente; 3,0578 arredondaria para "3.058").

> **[VERIFY-2] Correção pertence a um lote B.** O que precisa mudar é o texto do
> Apêndice A, não o pipeline. Registrado, não corrigido, conforme o mandato.
> **Ressalva:** esta conclusão vale para a tripla citada no briefing. A verificação
> contra o arquivo do draft não foi possível (draft ausente) — se o Apêndice A real
> contiver outra formatação ou outros valores, o achado precisa ser reconfirmado.

### 2.2 Concentração espacial → lado canônico determinado

Lido de `canonical_results.json`, `spatial_concentration.medio` (métrica declarada:
`ch4_practical`, coerente com DEC-012 "publicar concentração espacial para CH4 médio"):

| Grandeza | Valor canônico |
|---|---|
| `gini.value` | **0,5330579289850965** |
| `concentration_thresholds[0].target` | 67,0 % |
| `concentration_thresholds[0].municipalities_required` | **184** |
| `concentration_thresholds[0].state_total_cumulative` | **67,10939155701821 %** |
| `concentration_thresholds[0].ch4_cumulative` | 749.519.682,57 m³ CH₄/ano |

**Os números do manuscrito (184 municípios / 67,11 % / Gini 0,533) CONFEREM com o
`canonical_results.json`.**

Quanto ao "relatório A3" com top-203 / 66,99 % / Gini 0,4896:

> **[VERIFY-3] Não existe arquivo `A3` no repositório.** Existe apenas
> `A3b_SUFICIENCIA_CORPORA.md`, cujo tema é suficiência de corpora, não concentração
> espacial. Os valores top-203/66,99 %/Gini 0,4896 **não foram localizados em nenhum
> artefato versionado**. Não é determinável por evidência de repositório se são uma
> métrica distinta ou um estado obsoleto.
>
> O que a evidência **suporta**: os números do manuscrito vêm da estrutura
> `concentration_thresholds`, que é *limiar-alvo* (quantos municípios para atingir
> 67 %), enquanto "top-203" é *top-N* — o JSON tem uma estrutura `top_n` separada, com
> semântica diferente. São, por construção, métricas de tipo diferente. Um Gini,
> porém, não depende de limiar: **0,533 vs. 0,4896 é divergência real de valor**, não
> de definição, e só pode vir de estados canônicos distintos.
>
> Insumo que falta: o artefato onde 0,4896 foi calculado. **Não inferir qual é o
> obsoleto sem ele.**

### 2.3 Cobertura FORSU → lado canônico determinado; confirmação por execução NÃO feita

Lido de `canonical_results.json`, `coverage.forsu`:

```json
{
  "series_year": 2022,
  "measured_field": "CO111",
  "measured_co111_municipalities": 214,
  "population_fallback_municipalities": 431,
  "total_municipalities": 645,
  "measured_share_percent": 33.17829457364341,
  "route_counts": { "population_fallback": 431, "snis_co111": 214 }
}
```

**214 / 431 CONFEREM** (e 214 + 431 = 645, identidade fechada). Coerente com DEC-010.

Reconciliação SNIS registrada no mesmo bloco: `CO119 = CO111 + CO115`, 216 municípios
comparáveis, 216 iguais dentro de 0,01 t, delta absoluto máximo 3,49e-10. **[OK-2]**

> **A parte pedida — "confirmar por execução, não por leitura de código, que a
> divergência de 1,93× está resolvida nas duas superfícies públicas" — NÃO foi
> executada.** Motivos, em ordem:
> 1. O relatório `B-URG-1` não existe (§0.2); o diagnóstico de 1,93× está em
>    `A2c_DECOMPOSICAO_DIVERGENCIA_2026-07-28.md`.
> 2. Verificar "duas superfícies públicas" (mapa/API vs. script) exige subir backend e
>    banco. O briefing proíbe usar container local ou banco de produção antigo como
>    fonte, e o mandato é somente-leitura.
> 3. A branch de trabalho não contém o código corrigido.
>
> **[INDETERMINADO]** quanto à confirmação por execução. Insumo que falta: ambiente
> executável na branch `fix/canonical-consistency-2026-07` com o gate
> `scripts/validate_canonical_consistency.py` (DEC-011) rodando.

---

## Tarefa 2 (completa) — Verificação figura a figura

### 2.4 Corpo do manuscrito: o numérico está sólido

Verificação por script contra `canonical_results.json`, tolerância relativa 0,6 %
(o manuscrito publica 2 a 4 algarismos significativos). **Todos os valores do corpo
conferem**, com duas exceções tratadas em 2.5 e 2.6.

| Bloco | Itens verificados | Resultado |
|---|---|---|
| Tabela 2 (inventário estadual) | 24 valores: biomassa gerada e mobilizável, CH₄ (dia e ano), biogás, biometano, eletricidade, calor, nos 3 cenários | **24/24 CONFERE** (desvio máximo 0,147 %) |
| Razão mobilizável/gerado | 34,0 % | **CONFERE** (canônico 34,0179 %) |
| Biometano anual (resumo) | 1083 Mm³/ano | **CONFERE** (1.083,357) |
| Tabela 3 (15 feedstocks) | CH₄ Mm³/ano por feedstock | **15/15 CONFERE** — exato até a 2ª decimal |
| Setores | agrícola 719,61 / urbano 251,20 / pecuário 146,06 | **CONFERE** (agrícola canônico 719,605) |
| Concentração espacial | Gini 0,533; top-10 14,11 %; top-50 33,29 %; top-100 48,93 %; 184 municípios; 67,11 % | **6/6 CONFERE** |
| Regiões intermediárias | Ribeirão Preto 17,29 %; S. J. Rio Preto 12,77 %; São Paulo 11,59 %; Campinas 11,52 % | **4/4 CONFERE** |
| Perfil temporal | pico junho 4,09; vale dezembro 1,19 Mm³/d; fator de capacidade 0,855 estado / 0,775 agrícola / 1,000 pecuário e urbano | **CONFERE** (canônico 4,0916 / 1,1875 / 0,85477 / 0,77459 / 1,0 / 1,0) |
| Razões regionais | metropolitana 1,00; Ribeirão Preto 8,71 | **CONFERE** (1,0000588 / 8,70924) |
| Invariância anual | soma mensal = total anual dentro de 0,01 m³ | **CONFERE** — `status: pass`, delta −1,19e−06 m³/ano |
| Cobertura FORSU | 214 / 431 | **CONFERE** |

**[OK-4]** O corpo numérico do manuscrito é fiel ao `canonical_results.json`. O problema
deste manuscrito não é o valor dos números; é a rastreabilidade deles.

### 2.5 [BLOCKER-6] "24 feedstocks parameterizados" — o total canônico é 28

| Onde | Afirmação |
|---|---|
| Tabela 1, linha "Feedstock scope" | "24 parameterised, 15 instantiated" |
| §2, parágrafo final | "Eleven of the twenty-four parameterised feedstocks carry no recoverable observational corpus" |
| §4.2 | "Thirteen further parameterised feedstocks are not instantiated" |
| §6 | "Eleven of twenty-four parameterised feedstocks have no recoverable observational corpus" |

Contagem canônica:

```
by_feedstock: 15    parameterized_not_instantiated: 13    soma = 28
```

15 instanciados + 13 não instanciados = **28**, não 24. O próprio manuscrito é
internamente incoerente: §4.2 afirma "thirteen further", o que somado aos 15
instanciados dá 28, contradizendo o "24" da Tabela 1 e das §§2 e 6. O corpo do PR #165
registra independentemente que "a contagem de substratos passou de 26 para 28".

**Consequência:** a fração de cobertura de corpus muda de denominador. "Eleven of
twenty-four" (45,8 %) passa a onze de vinte e oito (39,3 %) — e o numerador 11 **não
foi verificável**, porque `by_feedstock` não expõe campo de corpus ou suficiência
(chaves: `feedstock`, `canonical_code`, `sector`, `provenance`, `availability`,
`biomass_gross`, `biomass_mobilizable`, `ch4_practical`, `biogas_practical`,
`biomethane`). **[INDETERMINADO-2]** quanto ao numerador 11. Insumo que falta: o campo
de suficiência de corpus por feedstock no resultado canônico, que o próprio manuscrito
apresenta como contribuição distintiva ("declared evidence sufficiency", Tabela 1).

### 2.6 [BLOCKER-7] Razão pico/vale: o valor está certo, o marcador aponta para outra métrica

Este é o achado mais fino do lote e não deve ser lido como erro numérico.

| | Valor |
|---|---|
| Manuscrito §4.4 e Apêndice A | **3,45**, declarado "on a daily flow basis" |
| Folha JSON `temporal_availability.state.peak_to_valley_ratio` | **3,3343894610636893** |
| Razão calculada sobre **totais mensais** (junho/dezembro) | **3,3344** |
| Razão calculada sobre **fluxo diário** (junho÷30, dezembro÷31) | **3,4455** |

O manuscrito está **numericamente correto**: 3,4455 arredonda para 3,45, e o texto
declara explicitamente a base diária. Os valores de pico e vale que ele publica
(4,09 e 1,19 Mm³/d) também conferem.

O problema é que a folha canônica gravada é a razão sobre **totais mensais**, não sobre
fluxo diário — duas métricas diferentes sob o mesmo nome. O Apêndice A mapeia
`3.45 → temporal_availability.state.peak_to_valley_ratio`, uma folha cujo valor é 3,3344.

**Sob o DEC-011** — "o CI extrai todas as folhas numéricas, aplica escala/arredondamento
e rejeita literal divergente", tolerância relativa 1e-9 — este par **deveria reprovar o
build**. A divergência é de 3,47 %, sete ordens de grandeza acima da tolerância
declarada. O gate não está reprovando, o que significa que ou não roda sobre o
manuscrito, ou não resolve este marcador. Ver 2.7.

### 2.7 [BLOCKER-8] O mapa de marcadores do Apêndice A não resolve

O Apêndice A é o mecanismo que o DEC-011 torna obrigatório. Cada linha foi resolvida
contra o `canonical_results.json` real:

| Marcador do Apêndice A | Resolve? | Chave real |
|---|---|---|
| `totals.biomass_gross.medio.value` | **OK** | — |
| `totals.biomass_mobilisable.medio.value` | **FALHA** | a chave é `biomass_mobili**z**able` (grafia com z) |
| `totals.ch4.{min,medio,max}.per_day` | **FALHA** | é `totals.ch4_practical.<cenário>.value`, em m³/**ano**; não existe folha `per_day` |
| `totals.biomethane.medio.per_day` | **FALHA** | existe `totals.biomethane.medio.value`, em m³/ano; sem `per_day` |
| `totals.energy.chp.{electric,thermal}.medio` | **FALHA** | é `totals.energy.<cenário>.{electricity_twh_year,thermal_pj_year}`; não há nível `chp` |
| `spatial_concentration.medio.gini` | **OK** | — |
| `spatial_concentration.medio.threshold_67` | **FALHA** | é `concentration_thresholds[0]` (lista) |
| `temporal_availability.state.peak_to_valley_ratio` | **OK, mas divergente** | ver 2.6 |
| `temporal_availability.implicit_capacity_factor.state` | **OK** | — |
| `coverage.forsu` | **OK** | — |
| `ranking.by_feedstock` | **FALHA** | é `by_feedstock`, na raiz; não existe nó `ranking` |
| `provenance.feedstocks_sha256` | **FALHA** | é `feedstocks_yaml_sha256`, na **raiz**, não dentro de `provenance` |

**10 dos 15 marcadores não resolvem.** Nenhuma das conversões por dia (`per_day`) existe
no arquivo: os valores diários publicados no manuscrito foram obtidos dividindo por 365
fora do pipeline, o que os torna, sob a definição do próprio DEC-011, literais digitados
à mão — exatamente a prática que o gate existe para proibir.

O Apêndice A traz o cabeçalho "(build note, not for submission)". Isso não atenua o
achado: se o mapa não resolve, o gate não pode estar validando o manuscrito, e a
afirmação central do artigo — "the continuous integration pipeline fails when any number
appearing in documentation, interface, **or manuscript** diverges from the computed
value" (§1) — não se sustenta.

### 2.8 [BLOCKER-9] Três SHA-256 distintos para o mesmo `feedstocks.yaml`

| Fonte | SHA-256 |
|---|---|
| Cabeçalho do manuscrito ("Canonical inventory") | `9e3d40157d8cb49a55a3f7abf91cb497dc15cdd9e6e14a63105cab0453809e3b` |
| `canonical_results.json`, `feedstocks_yaml_sha256` | `113fb331cd5301fccbae1aa69798dd15dbb6bc90892b8ecd31068f8ea09c54ce` |
| Todas as versões versionadas do arquivo (18 hashes distintos, todas as refs) | **nenhuma bate com nenhum dos dois** |

Varredura para o hash do manuscrito, mesmo método da §1.2: **0 correspondências**.

O manuscrito declara um catálogo, o resultado canônico declara outro, e o repositório
não contém nenhum dos dois. A cadeia de proveniência que o artigo apresenta como sua
contribuição metodológica principal está rompida em ambos os elos.

### 2.9 Números do manuscrito **sem origem** no arquivo canônico

As seções 4.5 (confronto externo) e 4.6 (realização medida) contêm dezenas de valores —
6,40 e 4,75 Mm³/d do roteiro setorial; razões 5,68× e 1,64×; base de atividade 1,394×;
0,80 vs. 0,420 m³/t de vinhaça; 13,26 Nm³ CH₄/m³ implícito; teto estequiométrico 7,0–9,8;
excesso de 35 % a 89 %; 0,40 Mm³/d da ANP; 13,5 %; 0,14 Mm³/d de aterro; 0,593 Mm³/d;
43,8 %; ~31 %; fatores 2,8 a 63 — e **nenhum deles tem chave no `canonical_results.json`**.

As chaves de raiz do arquivo são: `schema_version`, `generated_at`, `git_sha`,
`feedstocks_yaml_sha256`, `energy_parameters_sha256`, `scenario`,
`uncertainty_interpretation`, `totals`, `efficiencies`, `by_feedstock`, `by_sector`,
`by_municipality`, `coverage`, `parameterized_not_instantiated`, `validation`,
`spatial_concentration`, `temporal_availability`, `provenance`. Não há nó de confronto
externo nem de produção medida.

O Apêndice A também não mapeia nenhum deles. **[SEM ORIGEM]** em relação à fonte única
declarada pelo DEC-002. Os valores provavelmente derivam dos relatórios A14/A14b/A14c,
que são artefatos de auditoria e não o arquivo canônico — o que é uma proveniência real,
mas não a que o manuscrito declara.

Igualmente **[SEM ORIGEM]**: o ganho de 11,66 % atribuído à correção de sazonalidade
(§5.1) e o intervalo de conservadorismo de 15 % a 39 % da rota VS vs. DQO (§5.1).

---

## Tarefa 3 — Alegações técnicas ↔ repositório

Fonte: árvore extraída de `origin/fix/canonical-consistency-2026-07`.

| Alegação (§3.1) | Valor no manuscrito | Valor real | Arquivo | Status |
|---|---|---|---|---|
| React Leaflet | 4.2.1 | `^4.2.1` | `frontend/package.json` | **CONFERE** |
| Leaflet | 1.9.4 | `^1.9.4` | `frontend/package.json` | **CONFERE** |
| PostgreSQL | 15 | imagem `postgis/postgis:15-3.4` | `docker-compose.yml` | **CONFERE** |
| PostGIS | 3.4 | idem | `docker-compose.yml` | **CONFERE** |
| Next.js | *sem versão declarada* | `^16.2.6` | `frontend/package.json` | **N/A** — nada a divergir |
| FastAPI | *sem versão declarada* | `0.136.1` | `backend/requirements.txt` | **N/A** |

> **[VERIFY-4] RESOLVIDO por execução.** Consultas rodadas pelo autor:
> ```
> SELECT version();        → PostgreSQL 15.8 (Debian 15.8-1.pgdg110+1) on x86_64-pc-linux-gnu,
>                            compiled by gcc (Debian 10.2.1-6) 10.2.1 20210110, 64-bit
> SELECT PostGIS_Version(); → 3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1
> ```
> **PostgreSQL 15 e PostGIS 3.4 CONFEREM com o manuscrito**, agora por instância em
> execução e não apenas pela tag do compose. O manuscrito declara a série maior ("15"),
> que é a prática usual; a instância é 15.8.

**3.2 mapbox-gl — [OK-5].** Ausente de `package.json` (dependências e devDependencies) e
sem qualquer ocorrência da string `mapbox` em `frontend/src`. Nenhum resíduo. `maplibre-gl`
também ausente. A alegação de que a renderização é Leaflet puro se sustenta.

**3.3 Licença — [OK-6].** `LICENSE` é a GNU GPL versão 3, 29 June 2007. `package.json`
declara `"license": "GPL-3.0-only"`. Busca por "MIT License", "licensed under MIT" e
`"license": "MIT"` em `README.md`, `LICENSE`, `CITATION.cff` e `package.json`: **nenhuma
ocorrência**. O manuscrito declara GPL 3.0 em §3.1 e em Data availability, coerente com
o registro INPI. Nenhum resíduo MIT.

**3.4 MapBiomas — [INDETERMINADO-3].** O manuscrito **não cita MapBiomas em nenhum ponto
do texto fornecido**: §3.2 lista IBGE PAM, IBGE PPM e SNIS como fontes de atividade. A
string aparece apenas na saída do script (`"Soja/milho/café: já em toneladas de resíduo
(MapBiomas × yield_t/ha)"`). Não há, portanto, rótulo de coleção no manuscrito para
confrontar. A determinação da coleção real por inspeção do dado não foi possível porque
o insumo que a carregaria — `municipality_biomass_tons.csv` — é justamente o arquivo
deletado da branch (BLOCKER-5). Insumo que falta: o CSV de atividade.

> Observação de consistência, não de verificação: §3.2 do manuscrito atribui soja, milho
> e café ao IBGE PAM, enquanto o script declara esses três streams como derivados de
> MapBiomas × produtividade. São proveniências diferentes para os mesmos três números.
> Registrado; não resolvido.

**3.5 Desempenho — [OK-7].** Varredura do texto do draft: **não há nenhuma alegação de
tempo de resposta, benchmark de latência ou throughput**. A única afirmação próxima é
"requires no desktop GIS installation and no programming competency" (§3.1), que é de
natureza qualitativa. Nada a marcar como SEM ORIGEM neste item.

---

## Tarefa 4 — Auditoria de referências

**4.1 Citações autor-ano no corpo** (10 distintas): Global Methane Initiative (2014);
McCabe et al. (2020); Weiland (2010); Scarlat et al. (2018); Clodnitchi and Tudorache
(2022); EPE (2024); Bentsen et al. (2014); Hamelin et al. (2019); Uran and Janssen
(2003); Verstegen et al. (2012).

**4.2 Lista de referências — [INDETERMINADO-4].** **O draft fornecido não contém seção
de referências.** Entre "7. Conclusions" e "Data availability" não há lista. Não é
determinável se ela existe e foi omitida na transmissão ou se ainda não foi montada.

**4.3 Conjuntos.**
- *Citado-mas-não-listado:* **as 10 citações acima**, enquanto não houver lista. Este
  resultado é um artefato da ausência da lista, não um diagnóstico bibliográfico.
- *Listado-mas-não-citado:* **[INDETERMINADO]**.
- *Fiorini et al. (2024):* confirmado como caso anômalo, com uma correção factual. Os
  "Open items" do próprio manuscrito afirmam que ele está "cited in the retained
  introduction material but absent from the reference list". **No texto fornecido,
  Fiorini et al. (2024) não aparece como citação em nenhum ponto** — nem na introdução
  nem em qualquer outra seção. Ou a citação já foi removida na reescrita e a nota de
  pendência ficou obsoleta, ou o material de introdução mencionado não é o que foi
  transmitido. Reportado, não resolvido, conforme instrução.

**4.4 [BLOCKER-10] Violações do duplo-cego.** Cinco elementos identificadores:

| Elemento | Onde | Gravidade |
|---|---|---|
| `github.com/aikiesan/Pilar-2b` | Data availability | **Alta** — o handle é o nome de usuário do autor |
| `cp2b.unicamp.br/pilar2b` | Data availability | **Alta** — domínio institucional |
| "registered with the Brazilian National Institute of Industrial Property through the **University of Campinas** technology transfer office" | **§3.1, corpo do artigo** | **Crítica** — está no corpo, não numa seção destacável |
| "São Paulo Research Foundation (FAPESP), process 2025/08745-2" | Funding | **Média** — processo identificável |
| DOI `10.25824/redu/F36WP9` | Data availability | **Alta** — prefixo 10.25824 é o repositório de dados da Unicamp |

Quatro dos cinco estão em Data availability e Funding, seções que a Elsevier em geral
permite anonimizar ou reter durante a revisão. **O de §3.1 não é**: nomeia a instituição
no meio da descrição da arquitetura. Sob revisão duplo-cega, esse é o item que
efetivamente quebra o anonimato.

---

## Tarefa 5 — Alegações de validação

**5.1 Menções a FIESP.** No manuscrito, a FIESP **nunca é nomeada**: §4.5 fala em "an
independent sectoral roadmap published for São Paulo State in 2025". No repositório, a
referência é explícita e abundante — `data/benchmarks/fiesp_2025.yaml`, os relatórios
`VERIFICACAO_BENCHMARK_FIESP`, `CONFRONTO_FIESP`, `A14`/`A14b`/`A14c`, e a saída do
próprio script, que imprime um bloco "Benchmark FIESP" com quatro linhas.

**5.2 [OK-8] O texto NÃO apresenta a FIESP como validação, e nenhum MAE dela deriva.**

Verificação item a item da instrução:
- §3.3 declara: *"Any state-level benchmark is inadmissible as a parametric input"* —
  alinhado ao registro do A7.
- §5.2 **divulga explicitamente o episódio de calibração**, com a cronologia por commit
  ("a report identifying the model as below the external figure, a revision of four
  biochemical methane potential values ten minutes later"), e conclui: *"the external
  estimate ceased to be usable as validation, because agreement with it measured fit
  rather than independent concordance."*
- §4.5 é intitulada "External comparison under a non-calibration protocol" e afirma que
  a comparação foi conduzida "under a protocol prohibiting any parameter adjustment in
  response to its outcome".
- **Nenhum MAE, RMSE ou métrica de erro derivada da FIESP aparece no texto.** As razões
  5,68× e 1,64× são apresentadas como razões de comparação, não como erro do modelo.

Este item, que o briefing marcava como candidato a BLOCKER, está **limpo**. O manuscrito
trata a questão com mais franqueza do que a maioria da literatura da área.

**5.3 Classificação de cada alegação de "validação".**

| Alegação | Onde | Classificação |
|---|---|---|
| Produção medida da ANP, 13,5 % / 43,8 % | §4.6 | **Independente.** É contra saída medida por regulador, não contra outra estimativa. O texto a qualifica corretamente: "the only genuinely independent validation available". |
| Confronto com o roteiro setorial (5,68× / 1,64×) | §4.5 | **Calibração historicamente contaminada, corretamente declarada como tal.** O texto não a chama de validação. |
| Parâmetros de `feedstocks.yaml` revistos com a FIESP como referência | §5.2 | **Calibração.** Declarada. |
| `validation.public_route_vs_canonical` (645/645 municípios, delta 0,0) | resultado canônico | **Consistência interna, não validação.** Prova que duas superfícies do mesmo pipeline concordam — não que o pipeline esteja certo. O manuscrito não a apresenta como validação externa, o que está correto. |
| **"The scenario created in that sequence has been removed"** | §5.2 | **NÃO SUSTENTADA — [BLOCKER-11].** Ver abaixo. |

> **[BLOCKER-11] O cenário Fronteira não foi removido.** §5.2 afirma no passado que o
> cenário foi removido. Na branch canônica:
> ```
> compute_sp_canonical_totals.py:58   FRONTIER_ALPHA = 0.5
> compute_sp_canonical_totals.py:84   return values["medio"] + FRONTIER_ALPHA * (values["max"] - values["medio"])
> ```
> Na branch de trabalho o script vai além e **imprime** o cenário e a linha
> `"Fronteira (31 resíduos) > FIESP 6,4 biometano"` (saída literal na §1.1) — a mesma
> afirmação de superação de benchmark que §5.2 descreve como retirada. O corpo do
> PR #165 confirma independentemente: *"FRONTIER_ALPHA continua no código"* e *"14
> strings de i18n afirmam publicamente superar o benchmark FIESP"*.
>
> Note-se ainda que a §5.2 descreve a documentação do cenário como mencionando
> relaxamento "across thirty-one residues" — o "31 resíduos" que o script ainda imprime.
> A afirmação de remoção é, no estado atual do repositório, **falsa**.

---

## §7 — Proveniência do draft auditado

O draft **não está versionado**. `PILAR-2b_CEUS_draft_2026-08-05.md` não existe em
nenhuma ref, nem na árvore extraída do PR #165 (§1.4). O texto auditado nas Tarefas 2 a
5 foi **fornecido pelo autor colado no chat**, na terceira passagem deste lote.

Consequências que devem constar de qualquer uso deste relatório:

1. **Não há hash nem commit do texto auditado.** Uma reexecução futura do A10 não pode
   confirmar que auditou o mesmo texto.
2. **Não é verificável se o texto colado é integral.** A ausência de lista de
   referências (§4.2) pode ser omissão de transmissão ou do documento.
3. **O manuscrito viola sua própria política.** DEC-005 exige que toda mudança
   metodológica aponte para dados, código, relatório e commit; DEC-011 exige que toda
   afirmação numérica no manuscrito use caminho do JSON sob gate de CI. Um manuscrito
   fora do versionamento não pode ser alcançado por nenhum dos dois.

---

## §8 — Diagnóstico de CI (autorizado pelo autor)

Método: nova extração com `git -c core.autocrlf=false archive` (finais de linha LF, como
no runner ubuntu), executada no scratchpad. Comandos idênticos aos de
`.github/workflows/ci.yml`.

### backend-lint — "Backend - Lint & Format": **falha reproduzida**

```
black . --check      →  32 files would be reformatted, 152 files would be left unchanged
isort . --check-only →  13 arquivos "Imports are incorrectly sorted and/or formatted"
```

Entre os arquivos reprovados estão `scripts/compute_sp_canonical_totals.py`,
`app/api/v1/endpoints/geospatial.py`, `app/services/proximity_service.py` e
`tests/unit/scripts/test_validate_canonical_consistency.py`.

**Causa: deriva de formatação pura. Independente do CSV deletado.** `flake8` não pôde ser
executado (não instalado localmente); os dois primeiros passos já reprovam e o job para
neles.

> **[VERIFY-5] O job de lint é não-determinístico no tempo.** A etapa de instalação é
> `pip install -r requirements.txt black isort flake8` — **sem fixar versão** das três
> ferramentas. Um lançamento novo do `black` muda o resultado sem que uma linha de código
> mude. Meu `black` local é 23.12.1; o do runner é o mais recente no dia da execução, o
> que pode explicar parte da diferença entre estes 32 arquivos e o "black limpo" que o
> corpo do PR #165 declara. A contagem exata deve ser confirmada no log do runner.

### backend-test — "Backend - Unit Tests": **falha reproduzida**

```
20 failed, 950 passed in 42.82s
```

**Duas causas distintas.**

**(a) Propagação direta do BLOCKER-5.** `test_canonical_municipality_b2.py` falha com:

```
E   FileNotFoundError: [Errno 2] No such file or directory:
    '...\cp2b-workspace\NewLook\docs\data\municipality_biomass_tons.csv'
```

Os dois testes desse arquivo são `test_measured_forsu_sludge_and_availability_share_one_instance`
e **`test_public_surface_matches_canonical_for_all_bands`**. O segundo é precisamente a
garantia do DEC-010 — igualdade dos 645 municípios entre rota pública e script — e é a
evidência que a Tarefa 2.3 pedia. **Ela não pode ser produzida por execução na branch**,
pelo mesmo insumo deletado.

O `canonical_results.json` commitado registra `public_route_vs_canonical`: 645
comparados, 645 iguais, delta máximo 0,0 em todas as grandezas. Isso responde a Tarefa
2.3 **pelo artefato**, não por execução — e o artefato é o mesmo cuja proveniência está
rompida (BLOCKER-3/9). A confirmação por execução que o briefing exigia permanece
**[INDETERMINADO]**.

**(b) Deriva de parâmetros: testes não atualizados após as correções.**

```
test_canonical_loader::test_bagaco_values_match_canonical
  assert p.bmp.medio == pytest.approx(165.0)
  E  assert 115.0 == 165.0 ± 1.6e-04

test_canonical_loader::test_fde_resolved_as_availability_times_eta
  assert p.fde.medio == pytest.approx(0.1693 * 0.70, rel=1e-3)
  E  assert 0.0987525 == 0.11850999999999999 ± 1.2e-04
```

O BMP do bagaço mudou de 165 para 115 no catálogo e o teste ainda espera 165. **Bagaço é
31,7 % do inventário** — o maior stream do manuscrito. Os demais grupos com o mesmo
padrão: `test_biomass_residue_fractions` (3), `test_spatial_livestock` (3),
`test_canonical_parameters::test_service_bmp_matches_canonical` (1).

> **Ressalva metodológica.** Rodei **sem** o serviço PostgreSQL e **sem** as variáveis de
> ambiente que o job define (`DATABASE_URL`, `SECRET_KEY` etc.). As 9 falhas em
> `test_geospatial_detail.py` são plausivelmente ambientais e podem passar no runner. As
> 11 restantes — as dos grupos (a) e (b) — **não dependem de banco** e são reprodutíveis
> em qualquer ambiente.

> **[VERIFY-6] O corpo do PR #165 declara "pytest tests/unit → 958 passed (17 novos)".**
> A execução atual da mesma branch dá 950 passed, 20 failed. A declaração de verificação
> do PR está desatualizada em relação ao próprio tip da branch.

### frontend-test — "Frontend - Unit Tests": **falha reproduzida pelo autor**

Executado pelo autor em `~/Desktop/pr165/cp2b-workspace/NewLook/frontend` após `npm ci`.
**[INDETERMINADO-5] resolvido.**

```
Test Suites: 3 failed, 25 passed, 28 total
Tests:       1 failed, 577 passed, 578 total
```

**Duas causas distintas.**

**(a) Configuração de transformação do Jest — 2 suítes, nenhum teste executado.**
`HeatmapLayer.test.tsx` e `MunicipalityLayer.test.tsx` abortam na compilação:

```
node_modules\next-intl\dist\esm\production\index.react-client.js:1
export{useFormatter,useTranslations}from"./react-client/index.js";
^^^^^^
SyntaxError: Unexpected token 'export'
```

`next-intl` é distribuído como ESM e `node_modules` está fora do `transformIgnorePatterns`.
É defeito de configuração do Jest, não de código de aplicação, e é independente do
BLOCKER-5. Como depende de `jest.config` e não de sistema operacional, deve reproduzir
igualmente no runner ubuntu.

**(b) [BLOCKER-12] DEC-012 aplicado pela metade — `rpo` (PODA_URBANA) meio-removido.**

Único teste com falha real, em `src/lib/biomassAvailability.test.ts`:

```
● places every residue in exactly one sector, consistent with RESIDUES_BY_SECTOR
  expect(RESIDUES_BY_SECTOR[sector]).toContain(r)
  Expected value: "rpo"
  Received array: ["rsu"]
```

Causa confirmada por inspeção de `frontend/src/lib/biomassAvailability.ts`:

```
42:  rpo: { label: 'Poda urbana', sector: 'urban', biomassField: 'rpo_biomass_tons_year' },
...
45: export const RESIDUES_BY_SECTOR: Record<...> = {
48:   urban: ['rsu'],
49: };
```

A linha 42 **ainda declara** o resíduo `rpo` com `sector: 'urban'`; a linha 48 **já o
removeu** da lista do setor urbano. O registro de resíduos e o mapa de setores
discordam, e o teste de invariante existe justamente para detectar isso.

Isto contradiz diretamente uma decisão **ATIVA** e uma afirmação do artefato canônico:

| Fonte | Afirmação |
|---|---|
| DEC-012 (ATIVA) | "retirar PODA_URBANA da interface enquanto `coverage:none`" |
| `canonical_results.json`, `coverage.poda_urbana` | `{"coverage": "none", "instantiated": false, "public_interface": "removed", "reason": "corpus and canonical municipal activity are absent"}` |

**`"public_interface": "removed"` é falso.** A remoção foi parcial: `rpo` saiu das somas
por setor (linha 78 itera `RESIDUES_BY_SECTOR`, então o total urbano está correto), mas
permanece um `ResidueType` válido, com rótulo "Poda urbana" e campo de biomassa, visível
em qualquer superfície que itere o registro completo de resíduos.

O agravante é de natureza documental, não numérica: o `canonical_results.json` é o
arquivo que o manuscrito declara como fonte única, e ele **afirma sobre o estado da
interface uma coisa que o código contradiz**. Não é um número errado; é o artigo
declarando conformidade com sua própria política de governança onde ela não existe.

### Síntese do CI

| Job | Reproduzido? | Causa |
|---|---|---|
| Backend - Lint & Format | Sim | Deriva de formatação (`black` 32, `isort` 13). **Independente do BLOCKER-5.** Agravado por versões não fixadas. |
| Backend - Unit Tests | Sim | (a) CSV deletado → BLOCKER-5; (b) expectativas de parâmetro desatualizadas (BMP do bagaço 165→115). |
| Frontend - Unit Tests | Não | Indeterminado. |

**Conclusão do diagnóstico:** o CSV deletado explica **parte** do vermelho, não todo.
Corrigir apenas o BLOCKER-5 não deixaria o CI verde: restariam a formatação e as
expectativas de parâmetro obsoletas. Inversamente, corrigir formatação e testes sem
restaurar o CSV deixaria o gate do DEC-011 permanentemente incapaz de rodar.

---

## Lista consolidada e priorizada — o que impede a submissão

| # | Severidade | Item | O que falta |
|---|---|---|---|
| 0 | **BLOCKER-5** | **`municipality_biomass_tons.csv`, o insumo de registro, foi deletado da branch canônica por `9fdfcb7`, sem renomeação.** O gerador falha com `FileNotFoundError` (exit 1). Existe em todas as outras ~90 refs. Além disso, o gerador escreve em `docs/data/canonical_results.json`, caminho inexistente na branch, enquanto o JSON commitado está em `backend/`. Gerador e artefato estão dessincronizados. | Restaurar o CSV na branch (existe em `main`) e reconciliar o caminho de saída; depois regenerar. |
| 1 | **BLOCKER-3** | `feedstocks_yaml_sha256` (`113fb331…`) não corresponde a nenhuma versão versionada de `feedstocks.yaml`, em nenhuma ref, LF ou CRLF. A fonte única declarada por DEC-002/DEC-011 não é rastreável. **Causa raiz determinada na §1.4:** o JSON é remanescente de uma versão anterior do gerador. | O `feedstocks.yaml` correspondente, ou regeneração após resolver o item 0. |
| 2 | **BLOCKER-1** | Todo o estado auditado e o `canonical_results.json` vivem em `fix/canonical-consistency-2026-07`, PR #165 **aberto e com instrução de não mergear**. `main` e a branch de trabalho publicam os números pré-correção. | Decisão sobre o merge, ou declaração explícita de qual ref é a de submissão. |
| 3 | **BLOCKER-4** | A execução de 1.1 não reproduz `canonical_results.json`: dois geradores diferentes, em branches diferentes, com insumos diferentes (`snis_sp_activity_2022.csv`, `energy.yaml` ausentes na branch de trabalho). | Reexecução do gerador correto na branch correta, com saída literal registrada. |
| 4 | **BLOCKER-2** | `compute_sp_canonical_totals.py` aborta com `UnicodeEncodeError` em Windows sem `PYTHONIOENCODING=utf-8`. Reprodutibilidade por terceiros não se sustenta. | Correção no script (lote B) ou documentação do requisito. |
| 5 | **BLOCKER-10** | **Duplo-cego quebrado no corpo:** §3.1 nomeia a University of Campinas. Mais quatro identificadores em Data availability e Funding (handle `aikiesan`, `cp2b.unicamp.br`, FAPESP 2025/08745-2, DOI Unicamp). | Anonimizar §3.1; reter as demais seções conforme política da Elsevier. |
| 5a | **BLOCKER-8** | **10 dos 15 marcadores do Apêndice A não resolvem** contra o `canonical_results.json` (grafia `mobilisable`/`mobilizable`, `ch4` vs `ch4_practical`, `per_day` inexistente, `chp` inexistente, `threshold_67` é lista, `ranking` inexistente, `provenance.feedstocks_sha256` está na raiz). A afirmação de §1 de que o CI reprova números divergentes do manuscrito não se sustenta. | Corrigir o mapa de marcadores e fazer o gate rodar sobre o manuscrito. |
| 5b | **BLOCKER-9** | **Três SHA-256 para o mesmo `feedstocks.yaml`:** cabeçalho do manuscrito `9e3d4015…`, JSON `113fb331…`, e nenhum dos dois em nenhuma versão versionada. | Ver item 1; o hash do manuscrito precisa vir do arquivo efetivamente consumido. |
| 5c | **BLOCKER-11** | §5.2 afirma que o cenário Fronteira "has been removed". `FRONTIER_ALPHA = 0.5` continua em `compute_sp_canonical_totals.py:58,84`, e a branch de trabalho ainda imprime "Fronteira (31 resíduos) > FIESP 6,4 biometano". A afirmação é falsa no estado atual. | Remover o cenário do código, ou reescrever a alegação no tempo correto. |
| 5d | **BLOCKER-6** | "24 parameterised feedstocks" (Tabela 1, §§2 e 6) vs. contagem canônica **28** (15 instanciados + 13 não). O manuscrito é internamente incoerente: §4.2 diz "thirteen further", o que dá 28. Muda o denominador de "eleven of twenty-four". | Corrigir a contagem; e expor suficiência de corpus no resultado canônico para verificar o numerador 11. |
| 5e | **BLOCKER-7** | Razão pico/vale 3,45 (correta, base diária) mapeada para uma folha cujo valor é 3,3344 (base mensal). Sob a tolerância de 1e-9 do DEC-011 o gate deveria reprovar. | Publicar a folha de fluxo diário, ou reapontar o marcador. |
| 5f | **BLOCKER-12** | `canonical_results.json` afirma `poda_urbana.public_interface: "removed"`. É falso: `biomassAvailability.ts:42` ainda declara o resíduo `rpo` com `sector: 'urban'`, embora a linha 48 já o tenha tirado do mapa de setores. DEC-012 aplicado pela metade, detectado pelo teste de invariante do frontend. | Concluir a remoção no registro de resíduos, ou corrigir a afirmação no arquivo canônico. |
| 6 | **Draft não versionado** | `PILAR-2b_CEUS_draft_2026-08-05.md` não existe em nenhuma ref — confirmado por extração da árvore do PR #165. O texto auditado foi fornecido pelo autor no chat: sem hash, sem commit, integralidade não verificável, e fora do alcance de DEC-005 e DEC-011. | Versionar o manuscrito. |
| 6 | **VERIFY-2** | Apêndice A: rótulos `min` e `medio` permutados (`0.894` é min, `3.060` é medio). Determinado por aritmética; **origem correta, texto incorreto**. | Confirmação contra o arquivo do draft; correção é lote B. |
| 7 | **VERIFY-3** | Gini 0,533 (canônico, confere com o manuscrito) vs. 0,4896 (atribuído ao "A3", que não existe como arquivo). Divergência de valor, não de definição. | O artefato onde 0,4896 foi calculado. |
| 8 | **VERIFY-1** | 52 arquivos de auditoria com datas de nome até 2026-08-05, todos commitados em 2026-07-27, com data corrente de sistema 2026-07-29. | Explicação da cronologia (rebase/squash/relógio). |
| 9 | Lacunas de lote | Não existem artefatos para **A5, A6, A9, A10, A11, A12** nem para **B-URG-1**, apesar de o briefing pressupor "A0–A9 executados". | Confirmar se foram executados sem relatório ou se a numeração é apenas descontínua. |
| 10 | **INDETERMINADO** | Confirmação por execução da resolução do 1,93× nas duas superfícies públicas (2.3). Bloqueada a montante pelo item 0: o pipeline não executa na branch. | Resolver o item 0; depois, ambiente executável com o gate de CI de DEC-011. |

**Confere / OK — o que NÃO impede a submissão:**
- **[OK-1]** `uncertainty_interpretation` no JSON é coerente com DEC-012 (extremos determinísticos acoplados; sem propagação estatística, sem Monte Carlo), e o manuscrito usa a mesma linguagem.
- **[OK-2]** Identidade SNIS `CO119 = CO111 + CO115` fecha em 216/216 municípios, delta máximo 3,49e-10 t.
- **[OK-3]** Cobertura FORSU 214 + 431 = 645 fecha contra o total de municípios.
- **[OK-4]** **O corpo numérico do manuscrito é fiel ao arquivo canônico.** Tabela 2 (24 valores), Tabela 3 (15 feedstocks), setores, concentração espacial (Gini, top-N, limiar de 67 %), regiões intermediárias, perfil temporal, fatores de capacidade e invariância anual: todos conferem, desvio máximo 0,147 %.
- **[OK-5]** `mapbox-gl` totalmente ausente de dependências e de imports. Nenhum resíduo.
- **[OK-6]** Licença coerente em toda a superfície: `LICENSE` GPL v3, `package.json` `GPL-3.0-only`, manuscrito GPL 3.0, zero ocorrências de MIT.
- **[OK-7]** O manuscrito não faz nenhuma alegação de desempenho, benchmark ou tempo de resposta. Nada a marcar como SEM ORIGEM neste item.
- **[OK-9]** Versões de banco confirmadas **por execução**: PostgreSQL 15.8, PostGIS 3.4 (`USE_GEOS=1 USE_PROJ=1 USE_STATS=1`). Conferem com §3.1 do manuscrito.
- **[OK-8]** **A FIESP não é apresentada como validação e nenhuma métrica de erro deriva dela.** §3.3 declara benchmarks estaduais inadmissíveis como entrada paramétrica; §5.2 divulga o episódio de calibração com cronologia por commit e conclui explicitamente que a estimativa externa deixou de ser utilizável como validação; §4.5 opera sob protocolo de não-calibração declarado. Este item, que o briefing marcava como candidato a BLOCKER, está limpo.

**Diagnóstico de CI (§8):**

| Job | Causa |
|---|---|
| Backend - Lint & Format | `black` 32 arquivos, `isort` 13. **Independente do CSV deletado.** Agravado por `pip install black isort flake8` sem versões fixadas, o que torna o job não-determinístico no tempo. |
| Backend - Unit Tests | 20 failed / 950 passed. (a) `FileNotFoundError` do CSV deletado derruba o teste da garantia do DEC-010; (b) expectativas de parâmetro obsoletas — BMP do bagaço esperado 165,0, obtido 115,0, num stream que é 31,7 % do inventário. |
| Frontend - Unit Tests | 3 suítes falham / 1 teste falha (577 passam). (a) `transformIgnorePatterns` não cobre `next-intl` (ESM) — 2 suítes nem compilam; (b) **BLOCKER-12**: `rpo`/PODA_URBANA removido pela metade, contradizendo DEC-012 e o campo `"public_interface": "removed"` do próprio arquivo canônico. |

Corrigir apenas o CSV **não** deixaria o CI verde, e corrigir apenas lint e testes
deixaria o gate do DEC-011 permanentemente incapaz de rodar. São dois trabalhos, não um.

---

## Nota sobre um documento externo apresentado durante a execução

Durante este lote foi indicado o arquivo
`c:/Users/Lucas/.gemini/antigravity/brain/acf2bf73-…/pr_history_156_165.md`.
Ele descreve o **PR #165 como "Brazil-Wide Economic Simulation Engine (133 Intermediary
Regions)", merge commit `acf5451b…`, datado de dezembro de 2025** — descrição
incompatível com o corpo do PR #165 fornecido nesta mesma sessão ("saneamento de
consistência canônica", branch `fix/canonical-consistency-2026-07`, 46 commits, aberto).

O commit `acf5451b6c3a00a1d277e2689e35b5decc364564` **existe** no repositório
(`git cat-file -t` → `commit`). Portanto há **dois relatos conflitantes do que é o
PR #165**, e este relatório não os reconcilia: tratou-os como dado, não como
autoridade, e ancorou toda afirmação em evidência direta de git. Registrado para
decisão. Isto importa porque a numeração de PR é usada acima para identificar o estado
de submissão.

---

## Conformidade com as restrições do lote

- **Nenhum arquivo versionado foi criado ou modificado.** Único arquivo escrito no
  repositório: este relatório. Único efeito colateral de escrita dentro do repositório:
  `sp_canonical_by_stream.csv` em diretório `.gitignore`d
  (`cp2b-workspace/NewLook/.gitignore:78`), untracked, produzido pela execução
  obrigatória da Tarefa 1.1.
- **Nenhum checkout, merge, worktree ou alteração de ref.** A árvore do PR #165 foi
  lida por `git show` (blobs) e extraída por `git archive` para o diretório de
  scratchpad, **fora do repositório**. `git archive` é operação de leitura e não altera
  `.git`. A execução da §1.4 ocorreu inteiramente nessa cópia externa.
- **Nenhum container local nem banco de produção foi consultado** para números de
  manuscrito. Fonte: `feedstocks.yaml` + `compute_sp_canonical_totals.py` (execução) e
  leitura de blob de `canonical_results.json` (explicitamente marcada como leitura).
- **Nenhuma correção de texto foi proposta.**
- **Valores não determináveis foram marcados `[INDETERMINADO]` com o insumo faltante
  nomeado**, em vez de inferidos.
- **Lote B não iniciado.**
