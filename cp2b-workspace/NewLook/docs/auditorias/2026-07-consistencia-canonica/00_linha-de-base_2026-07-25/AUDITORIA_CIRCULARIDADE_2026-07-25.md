# Auditoria de circularidade — parâmetros calibrados × independentes

**Data:** 2026-07-25 · **Lote:** 1a · **Modo:** somente leitura, nada foi alterado
**Escopo:** todas as refs (`--all`), incluindo a linhagem pré-squash.
**Baseline:** `docs/data/baseline_2026-07-25.json`

Pergunta: algum parâmetro do PILAR-2b foi ajustado olhando para uma referência
externa contra a qual a plataforma depois reporta concordância?

---

## Resposta curta

**Sim, um: `FRONTIER_ALPHA = 0.5`.** O commit que o introduziu tem, no assunto,
`(>FIESP benchmark)`, e no corpo, `~40% above FIESP's 6.4`. O cenário que ele
define — Fronteira do Biogás — foi tornado o **padrão do mapa** 49 minutos depois.

**A recalibração de BMP (`24b4095`) NÃO foi feita contra o FIESP.** A justificativa
citada é um corpus de 367 artigos de literatura primária, e três das quatro revisões
batem com a mediana do corpus declarada para o próprio feedstock. Mas as quatro
revisões são **unidirecionalmente para cima**, e ocorreram no mesmo dia, oito horas
depois da extração do benchmark FIESP, movendo o total de 6,39 → 6,53 Mm³/d, na
direção do benchmark. Registro a sequência; não afirmo intenção.

**Achado colateral, e é grave:** a "Fronteira do Biogás" foi definida **duas vezes,
com metodologias incompatíveis, em cinco dias**, e o arquivo publicado hoje ainda
contém **as duas definições**, uma contradizendo a outra.

---

## 1. `FRONTIER_ALPHA = 0.5`

### 1.1 Commit de introdução

`154cfae` · **2026-06-12 09:58:44 +0000** · autor `Claude`
Existe apenas em `origin/claude/dreamy-wright-icxmfp`; o conteúdo chegou a `main`
pelo squash do PR #101.

Assunto, literal:

```
feat: add 'Fronteira do Biogás' intermediate scenario (>FIESP benchmark)
```

Corpo, literal:

```
4th scenario between Medio Prazo and Otimista (midpoint, FRONTIER_ALPHA=0.5):
CH4 9.19 / biogas 16.42 / biometano 8.92 Mm3/d — ~40% above FIESP's 6.4.
Represents realistic-high mobilization across all 31 residues (relaxed
competing-use/collection factors under policy), not the theoretical ceiling.
- compute_sp_canonical_totals.py: emits Fronteira tier + FIESP comparison line
- FIESP report: 4 ordered scenarios + rationale for SP potential > FIESP
```

### 1.2 Diff literal

```diff
+    # ── Fronteira do Biogás (4º cenário) ────────────────────────────────────────
+    # Mobilização realista-alta entre Médio Prazo e Otimista: ponto médio por
+    # métrica (FRONTIER_ALPHA do caminho medio→max). Representa o relaxamento dos
+    # fatores de competição/coleta sob política pública dedicada, mantendo o
+    # envelope de incerteza biométrico. NÃO é o teto teórico (esse é o Otimista).
+    FRONTIER_ALPHA = 0.5
+    fro = tuple(m + FRONTIER_ALPHA * (x - m) for m, x in [(ch4[1], ch4[2]), (big[1], big[2]), (bm[1], bm[2])])
+    print(f"\n{'  → Fronteira do Biogás (4º cenário, mid medio↔max):':<46}"
+          f"CH₄={fro[0]:.2f}  Biogás={fro[1]:.2f}  Biometano={fro[2]:.2f}  M m³/dia")
+
     print("\n─── Benchmark FIESP ───────────────────────────────────────────────────────")
     print("  FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás")
     print("  SEMIL/FIESP 2024 (viável)                : ~11,4 M m³/dia biogás")
-    print(f"  PILAR-2b forward (Linha de Base/Médio/Otimista): "
-          f"{big[0]:.1f} / {big[1]:.1f} / {big[2]:.1f} M m³/dia biogás")
+    print("  FIESP/Amplun 2025 (cana+aterro)          : 11,7 biogás / 6,4 biometano")
+    print(f"  PILAR-2b (Base/Médio/Fronteira/Otimista biogás): "
+          f"{big[0]:.1f} / {big[1]:.1f} / {fro[1]:.1f} / {big[2]:.1f} M m³/dia "
+          f"— Fronteira (31 resíduos) > FIESP 6,4 biometano")
```

E no `FIESP_BENCHMARK_AUDIT_REPORT.md`, adicionado pelo mesmo commit:

```diff
+### "Fronteira do Biogás" — o caminho intermediário que supera a FIESP
+Construção transparente: **ponto médio por métrica entre Médio Prazo e Otimista**
+(`FRONTIER_ALPHA = 0,5` em `compute_sp_canonical_totals.py`). ...
+> **Fronteira = 8,92 Mm³/d de biometano (16,42 de biogás) — ~40% acima do benchmark FIESP (6,4).**
+
+Por que é defensável dizer que o potencial de SP é **maior** que o da FIESP:
```

### 1.3 Respostas diretas

| Pergunta | Resposta |
|---|---|
| `154cfae` **introduziu** ou **alterou** `FRONTIER_ALPHA`? | **Introduziu.** É a primeira e única aparição da constante no grafo. Pickaxe `-S"FRONTIER_ALPHA"` sobre `--all` retorna 4 commits: `154cfae` (2026-06-12), `c588a4f` (squash do PR #100/#101), e os dois desta sessão (`dbea3a7`, `8fc51d6`). Nenhum valor anterior a 0.5 existiu. |
| A mensagem, o diff ou docs indicam que 0,5 foi escolhido para **superar ou reproduzir** o número do FIESP? | O **assunto** do commit é `(>FIESP benchmark)`. O **corpo** quantifica o resultado como `~40% above FIESP's 6.4`. O **mesmo diff** adiciona ao código a linha impressa `— Fronteira (31 resíduos) > FIESP 6,4 biometano` e ao relatório a seção `"o caminho intermediário que supera a FIESP"` seguida de `"Por que é defensável dizer que o potencial de SP é maior que o da FIESP"`. O **comentário no código** justifica 0,5 apenas como `ponto médio` do caminho medio→max. **Não interpreto a intenção do autor. Registro que a única justificativa técnica versionada para o valor 0,5 é "ponto médio", e que toda a moldura textual do commit é comparativa ao FIESP.** |
| Existe análise de sensibilidade de α? | **Não.** Nenhum outro valor de α aparece em ponto algum do grafo. Nenhum documento discute α ≠ 0,5. Única menção em documentação: `FIESP_BENCHMARK_AUDIT_REPORT.md:24`. |
| Existe referência bibliográfica para 0,5? | **Não. SEM JUSTIFICATIVA BIBLIOGRÁFICA.** |

### 1.4 Cronologia de 2026-06-12 (UTC)

Ordem exata dos commits do dia, todas as refs:

| Hora | Commit | Autor | Assunto |
|---|---|---|---|
| 01:55 | `1c8db39` | Claude | `docs: FIESP benchmark extraction + citation/reference DB audits` |
| 02:01 | `6974224` | Claude | `docs: quantify reference-DB defects from full 148-row unified view` |
| 07:02 | `c588a4f` | L. N. Cerejo | squash do PR #100 |
| 07:40 | `4037029` | L. N. Cerejo | squash do PR #101 — `Fronteira do Biogás scenario + map toggle, FIESP recalibration, unified 399-ref corpus` |
| 09:35 | `5d3c378` | Claude | `data: unify full 399 scientific_references corpus + mine BMP from notes` |
| **09:38** | `f851259` | Claude | `docs: FIESP comparison report + recomputed 4 scenarios + suspect-DOI worklist` |
| **09:48** | `24b4095` | Claude | `feat: recalibrate canonical BMP from 367-paper corpus` |
| 09:56 | `70d9042` | Claude | `fix(ci): sync biomass_availability RESIDUE_BIOMASS_CONFIGS to revised BMP` |
| **09:58** | `154cfae` | Claude | `feat: add 'Fronteira do Biogás' intermediate scenario (>FIESP benchmark)` |
| 10:06 | `c1bf832` | Claude | `feat(frontend): add 'Fronteira do Biogás' scenario to advanced-analysis + comparator` |
| 10:23 | `6ac8072` | Claude | `feat(map): per-municipality scenario toggle incl. Fronteira do Biogas` |
| **10:47** | `23947f3` | L. N. Cerejo | `Refactor map layout: ... set Fronteira as default ...` (PR #103) |

O benchmark FIESP entrou no repositório às 01:55. Às 09:48 os BMPs foram elevados,
às 09:58 o cenário Fronteira foi redefinido, e às 10:47 ele virou **o cenário padrão
do mapa**. Intervalo total: 8h52.

---

## 2. A "Fronteira do Biogás" foi definida duas vezes, incompativelmente

Achado não previsto no escopo do 1a, registrado por afetar diretamente o
enquadramento do cenário.

### Definição A — `8c2d8f3`, 2026-06-07, Lucas Nakamura Cerejo (PR #98)

`feat(scenarios): Phase 3 — 4 named scenarios + Fronteira do Biogás`

Fronteira = **Otimista + lodo de ETE sob mandato regulatório**. Construto físico:
acrescenta dois feedstocks reais ao cenário máximo, sob premissa de política
declarada.

```
Fronteira do Biogás — Otimista + mandatory ETE sludge policy    25.85 Mm³/day biogas

Fronteira adds LODO_PRIMARIO (0.913 M m³/day CH4) + LODO_SECUNDARIO
(0.126 M m³/day CH4) at max FDE, premised on mandatory AD policy for
all wastewater treatment sludge (PNRS + CONAMA regulatory mandate).
Barrier: high CAPEX; requires public policy, not just technical feasibility.
```

Implementado como função `_compute_fronteira(fs)`. Valores: **14,66 / 25,85 / 14,22**
Mm³/d (CH₄ / biogás / biometano). Adiciona também
`LODO_SECUNDARIO.generation.t_per_capita_yr` ao `feedstocks.yaml`, citando CETESB 2020.

### Definição B — `154cfae`, 2026-06-12, Claude (5 dias depois)

Fronteira = **ponto médio aritmético entre Médio Prazo e Otimista**. Nenhum feedstock
acrescentado; nenhuma premissa física. Valores: **9,19 / 16,42 / 8,92** Mm³/d.

O diff substitui a linha da tabela:

```diff
-| **Otimista** | 14,74 | 26,30 | 14,29 |
-| **Fronteira do Biogás** (mobilização plena / política) | ~14,9 | ~26,4 | ~14,5 |
+| **Fronteira do Biogás** (mobilização realista-alta) | **9,19** | **16,42** | **8,92** |
+| **Otimista** (teto técnico) | 14,74 | 26,30 | 14,29 |
```

### Estado hoje

| Verificação | Resultado |
|---|---|
| `_compute_fronteira`, `LODO_PRIMARIO`, `LODO_SECUNDARIO` em `compute_sp_canonical_totals.py` de `main` | **0 ocorrências** |
| `git log origin/main -S"_compute_fronteira"` | **vazio** — a Definição A nunca chegou a `main` |
| `FRONTIER_ALPHA = 0.5` em `main` | presente, `compute_sp_canonical_totals.py:308` |

### DIVERGÊNCIA VIVA — o arquivo publicado contém as duas definições

`docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/FIESP_BENCHMARK_AUDIT_REPORT.md` hoje:

- **linha 13-16**: tabela com Fronteira = **9,19 / 16,42 / 8,92** (Definição B);
- **linha 22-25**: `"ponto médio por métrica entre Médio Prazo e Otimista (FRONTIER_ALPHA = 0,5)"` (Definição B);
- **linhas 41-42**, sobreviventes da Definição A e nunca removidas:

> *"**Fronteira** = envelope superior com disponibilidade plena (FC/FCo relaxados ao
> limite de coleta), representando o teto de política pública. Coincide com os números
> do handoff (**14,66 / 25,85 / 14,22**)."*

O mesmo documento afirma que a Fronteira é 9,19 e que a Fronteira é 14,66. Nenhuma
das duas é assinalada como superada.

---

## 3. `24b4095` — a recalibração de BMP

`feat: recalibrate canonical BMP from 367-paper corpus + propagate to all layers`
2026-06-12 09:48:03 +0000, autor `Claude`.

### 3.1 Antes / depois — diff literal do `feedstocks.yaml`

| Feedstock | min antes→depois | **medio antes→depois** | max antes→depois | Δ medio | Direção |
|---|---|---|---|---:|---|
| `VINHACA` | 40,0 → **90,0** | **90,0 → 160,0** | 160,0 → **200,0** | **+77,8 %** | ↑ |
| `CASCA_CAFE` | 90,0 → **120,0** | **140,0 → 165,0** | 190,0 → **220,0** | **+17,9 %** | ↑ |
| `DEJETOS_SUINO` | 140,0 → **150,0** | **210,0 → 245,0** | 280,0 → **300,0** | **+16,7 %** | ↑ |
| `FORSU` | 200,0 → **250,0** | **310,0 → 360,0** | 420,0 → **500,0** | **+16,1 %** | ↑ |

Comentários de justificativa inseridos no próprio YAML, literais:

```yaml
      # Revised 2026-06 to untreated mono-digestion basis from scientific_references
      # corpus (Moura 2023 UFRJ MSc 165.5; Ferreira 2016 150-180; Moraes/Zaiat/Bonomi 2015).
      min: 90.0
      medio: 160.0
      max: 200.0
```
```yaml
      # Revised 2026-06 from scientific_references corpus (coffee husk untreated:
      # Gebremedhin 2016 131; Passos 2018 196; Czekala 2023; corpus median ~164).
```
```yaml
      # Revised 2026-06 from scientific_references corpus (untreated swine slurry mono
      # median ~245; Moller 2004 140-280; Wall 2014 165-265). medio 210->245.
```
```yaml
      # Revised 2026-06 from scientific_references corpus (untreated OFMSW: Fisgativa 2016;
      # Mata-Alvarez 2014 200-450; corpus median ~472). medio raised 310->360, max ->500.
```

### 3.2 O movimento foi consistentemente na direção do benchmark?

**Direcionalmente, sim; a referência citada, porém, não é o FIESP.**

Três observações factuais, sem interpretação:

**(i) As quatro revisões são para cima. Nenhuma para baixo.** O efeito declarado no
próprio commit é `SP scenarios: biogas medio 6.39->6.53, max 25.78->26.30 Mm3/d`.
Os benchmarks FIESP são todos superiores ao PILAR-2b (11,4 e 16,0 Mm³/d de biogás),
de modo que qualquer elevação reduz a distância ao benchmark. A redução foi de
**+2,2 %** no cenário medio.

**(ii) A justificativa citada é um corpus de literatura primária, não o FIESP.** O
corpus de 367 artigos foi unificado 13 minutos antes (`5d3c378`, 09:35,
`mine BMP from notes`). Três das quatro revisões coincidem com a mediana do corpus
declarada para o próprio feedstock:

| Feedstock | Mediana do corpus, declarada no comentário | Novo medio | Coincide? |
|---|---:|---:|---|
| `CASCA_CAFE` | ~164 | 165,0 | **sim** |
| `DEJETOS_SUINO` | ~245 | 245,0 | **sim** |
| `VINHACA` | Moura 2023 = 165,5 | 160,0 | aproximadamente |
| `FORSU` | **~472** | **360,0** | **NÃO** |

O `FORSU` foi elevado, mas **não até a mediana que o próprio comentário declara**.
O comentário registra o fato sem explicá-lo: `medio raised 310->360`.

**(iii) A aplicação foi seletiva.** O mesmo relatório FIESP (§3, `FIESP_BENCHMARK_AUDIT_REPORT.md:73-75`)
lista outros feedstocks cuja mediana do corpus também é superior ao valor canônico, e
que **não** foram alterados:

| Feedstock | Mediana do corpus | Valor canônico | Alterado? |
|---|---:|---:|---|
| `BAGACO` | 192 | 165 | **não** |
| `TORTA_FILTRO` | 365 | 280 | **não** |
| `CAMA_AVIARIO` | 300 | 280 | **não** |
| `GORDURA` | 859 | 850 | **não** |

O commit os declara `confirmed within corpus range (no change)`. O critério que separa
"revisar" de "confirmar dentro da faixa" não está documentado em lugar nenhum.

**Conclusão factual:** não há evidência versionada de que os BMPs tenham sido ajustados
*para* o FIESP. Há evidência versionada de que foram ajustados **unidirecionalmente para
cima**, contra um corpus, **no mesmo dia e nas mesmas horas** em que o benchmark FIESP
foi extraído, o relatório de comparação reescrito e o cenário Fronteira redefinido.

---

## 4. `UPGRADING_EFFICIENCY = 0.97`

| Item | Resultado |
|---|---|
| Commit de introdução | `92fb365` · 2026-06-05 · Lucas Nakamura Cerejo · `docs(audit): add scientific parameter audit report (#89)` |
| Forma na introdução | `UPGRADING_EFFICIENCY = 0.97` — **sem comentário, sem referência** |
| Alteração posterior | `d24f3f6` (2026-06-05) acrescentou o comentário `# biogas → biomethane upgrading`; o estado atual diz `# biogas → biomethane upgrading (membrane/PSA)` |
| Referência bibliográfica | **nenhuma, em nenhuma versão** |
| Menção em documentação | `FOSS4G_PAPER_SUPPLEMENT.md:30` — *"3 % upgrading loss, membrane/PSA"*, sem fonte |
| Veredito | **SEM JUSTIFICATIVA** |

O valor multiplica **todo** o biometano reportado pela plataforma
(`compute_sp_canonical_totals.py:159`).

---

## 5. `CITRUS_RESIDUE_FRACTION = 0.50`

| Item | Resultado |
|---|---|
| Commit de introdução | `3adf56b` · 2026-06-06 · Claude · `fix(compute): correct IBGE PAM unit interpretation — sugarcane 4 sub-streams + citrus peel fraction`; squash em `80e32c7` (PR #96) |
| Justificativa no código, literal | `# Citrus: whole fruit → wet processing peel/bagasse (FUNDECITRUS 2022)` · `# FCo in BAGACO_CITROS FDE (0.30) accounts for competing uses (feed pellets, pectin).` · `# Using 50% peel fraction ensures FCo is not double-applied.` · `CITRUS_RESIDUE_FRACTION = 0.50  # range 0.45–0.55; conservative mid-point` |
| Referência | FUNDECITRUS 2022 — **sem URL, sem DOI, sem página**. `METADATA.json` registra `retrieved: "VERIFY"` |
| Veredito | **JUSTIFICADO, FONTE NÃO VERIFICÁVEL.** O valor é o ponto médio declarado de uma faixa 0,45–0,55 atribuída a uma fonte que o próprio repositório marca como pendente de verificação. Não há vínculo com benchmark externo. |

Nota: a mesma constante reaparece em `914f3d8` (2026-07-21, ingestão nacional de
safras), sem alteração de valor.

---

## 6. Classificação: CALIBRADOS × INDEPENDENTES

### 6.1 CALIBRADOS — informados por referência externa ou ajuste post-hoc

| Parâmetro | Valor | Referência que informou | Commit | Observação |
|---|---:|---|---|---|
| `FRONTIER_ALPHA` | 0,5 | **Benchmark FIESP** (moldura do commit) | `154cfae` 2026-06-12 | Única justificativa técnica: "ponto médio". Sem referência bibliográfica. Sem análise de sensibilidade. Cenário virou o padrão do mapa 49 min depois |
| `VINHACA.bmp.medio` | 160,0 | Corpus de 367 artigos | `24b4095` 2026-06-12 | +77,8 % |
| `CASCA_CAFE.bmp.medio` | 165,0 | Corpus de 367 artigos | `24b4095` | +17,9 %; coincide com a mediana declarada |
| `DEJETOS_SUINO.bmp.medio` | 245,0 | Corpus de 367 artigos | `24b4095` | +16,7 %; coincide com a mediana declarada |
| `FORSU.bmp.medio` | 360,0 | Corpus de 367 artigos | `24b4095` | +16,1 %; **não** coincide com a mediana declarada (~472) |

### 6.2 INDEPENDENTES — literatura primária, sem ajuste a referência agregada

| Parâmetro | Valor | Fonte primária citada | Commit |
|---|---:|---|---|
| `BAGACO.bmp.medio` | 165,0 (era 115) | Paulose et al. 2021 (187,9 NmL/gVS untreated mesophilic) | `00b3beb` 2026-06-05 |
| `PALHA.bmp.medio` | 175,0 (era 210) | Paulose 2021 (161,8 untreated straw) — **revisão para baixo** | `00b3beb` |
| `BAGACO` FCo | 0,15–0,38 (era 0,164–0,200) | EPE BEN 2024 (consumo energético do bagaço −2 %; caldeiras 87–100 bar deixam 30–50 % de excedente) | `00b3beb` |
| Frações da cana | 0,280 / 0,030 / 0,053 / 0,420 | UNICA/CONSECANA 2022; Carvalho 2017 `doi:10.1111/gcbb.12410` (palha) | `3adf56b` 2026-06-06 |
| `mill_delivery_fraction` | 0,76 / 0,85 / 0,92 | Série UNICA moagem × IBGE PAM, 17 anos (2008–2024) | 2026-07-21 |
| `CITRUS_RESIDUE_FRACTION` | 0,50 | FUNDECITRUS 2022 (fonte `VERIFY`) | `3adf56b` |
| Blocos FDE per-factor (26 feedstocks) | — | ABIOGÁS 2021, EPE BEN 2024, CETESB, EMBRAPA, ABRELPE etc., por fator | `8d0c072`, `ebd2ce6` 2026-06-05 |

### 6.3 SEM JUSTIFICATIVA

| Parâmetro | Valor | Onde | Alcance do efeito |
|---|---:|---|---|
| `UPGRADING_EFFICIENCY` | 0,97 | `compute_sp_canonical_totals.py:54` | Multiplica **todo** o biometano reportado |
| `FRONTIER_ALPHA` | 0,5 | `compute_sp_canonical_totals.py:308` | Define integralmente o 4º cenário, padrão do mapa |

---

## 7. Inventário da Fase 2 (1a-bis)

Somente leitura. **Nada foi mesclado.**

### 7.1 Escopo do `b279978`

`feat(livestock): Phase 2 — spatial split of SP cattle into beef (west) and dairy (east) (#97)`
2026-06-07 · Lucas Nakamura Cerejo · vive apenas em `origin/pr/phase1-biomass-units`.

Três arquivos, 340 inserções:

| Arquivo | Δ |
|---|---:|
| `backend/scripts/compute_sp_canonical_totals.py` | +52 |
| `backend/tests/unit/services/test_spatial_livestock.py` | +170 (novo) |
| `data/canonical_parameters/feedstocks.yaml` | +122 |

### 7.2 Parâmetros introduzidos

`ESTERCO_BOVINO_CORTE` — *"Esterco bovino — gado de corte extensivo (SP Oeste)"*

| Campo | min | medio | max |
|---|---:|---:|---:|
| `bmp` (NmL/gVS) | 80,0 | 120,0 | 180,0 |
| `ts` (%) | 15,0 | 22,0 | 30,0 |
| `vs_of_ts` (%) | 62,0 | 72,0 | 80,0 |
| `t_per_head_yr` | 2,00 | 2,92 | 4,00 |
| `fc` | 0,25 | 0,35 | 0,45 |
| `fco` | 0,28 | 0,35 | 0,42 |
| `fs` | 0,70 | 0,78 | 0,88 |
| `fl` | 0,38 | 0,52 | 0,65 |
| `availability` | 0,0186 | 0,0497 | 0,1081 |

`ESTERCO_BOVINO_LEITEIRO` — *"Esterco bovino — gado leiteiro intensivo (SP Leste)"*:
`bmp` 150/230/300, `ts` 15/25/35, `t_per_head_yr` 3,65/5,11/6,57, `fc` = 0,88,
FDE medio 0,2929.

Constantes no script: `CATTLE_BEEF_FRACTION = 0.67`, `CATTLE_DAIRY_FRACTION = 0.33`,
atribuídas ao IBGE Censo Agropecuário 2017.

**Observação relevante para D1:** o bloco da Fase 2 grava `fc`, `fco`, `fs` e `fl`
como **campos estruturados**, com o produto conferido em comentário
(`# min: 0.25×0.28×0.70×0.38 = 0.0186 ; medio: 0.35×0.35×0.78×0.52 = 0.0497 ...`).
O `feedstocks.yaml` de `main` guarda apenas o produto `availability`, com os quatro
fatores em prosa. A Fase 2 é, portanto, o único ponto do repositório onde a
decomposição FC×FCo×FS×FL existe como dado legível por máquina.

### 7.3 Execução dos testes — não confiei na mensagem do commit

**Contra o estado atual de `main`: 10/10 FALHAM.** Não chegam a executar:

```
ImportError: cannot import name 'CATTLE_BEEF_FRACTION'
from 'scripts.compute_sp_canonical_totals'
```

**Contra a árvore da Fase 2, porém usando o motor e o loader de `main` hoje
(`biogas_forward.py` e `canonical_loader.py` copiados de `main`, não do `b279978`):
10/10 PASSAM.**

```
..........                                    [100%]
10 passed, 1 warning in 0.16s
```

Isso responde a pergunta prática: o código da Fase 2 é **compatível com o motor e o
loader atuais**. A incorporação é um porte de **dois arquivos** — o bloco do
`feedstocks.yaml` e o trecho do script de cálculo. Nenhuma alteração em
`biogas_forward.py` ou `canonical_loader.py` é necessária.

(O aviso é `PytestUnknownMarkWarning: Unknown pytest.mark.unit`, efeito de rodar fora
do `pytest.ini` do projeto, não um defeito do teste.)

### 7.4 Conflitos esperados

**Merge de branch: inviável.** `git merge-tree` entre `origin/main` e `b279978`
produz **27 marcadores de conflito**. O branch divergiu em 2026-06-07 e `main`
acumulou meses de mudanças: o diff de árvore completa é de **384 arquivos,
14.246 inserções e 31.935 deleções** — inclui a remoção de tudo que `main` ganhou
depois (GeoServer, testes OGC, ingestão nacional).

**Porte dirigido: viável.** Divergência apenas nos dois arquivos que importam:

| Arquivo | `b279978` × `origin/main` |
|---|---|
| `compute_sp_canonical_totals.py` | 49 inserções, 65 deleções |
| `feedstocks.yaml` | 176 inserções, 142 deleções |

Conflitos previstos, por região:

1. **`feedstocks.yaml`, bloco `ESTERCO_BOVINO`** — a Fase 2 reescreve o entorno; `main` ganhou depois `rpr` e `mill_delivery_fraction` em outros feedstocks. Os dois códigos novos são chaves de topo inéditas: **inserção limpa**, sem colisão.
2. **`compute_sp_canonical_totals.py`, tupla `LIVESTOCK`** — a Fase 2 a renomeia para `LIVESTOCK_SIMPLE` (suíno e aves) e acrescenta `_biomass_livestock_by_code()`. `main` alterou a mesma região em 2026-07-18 (`biomass_tons_from_units` via loader). **Conflito real, resolução manual.**
3. **`_accumulate` / laço principal** — a Fase 2 substitui a entrada única de bovino por `cattle_corte` + `cattle_leiteiro`. **Conflito real, resolução manual.**
4. **`docs/data/*`** — todo documento que cite `cattle 0,403 M m³/d` passa a estar desatualizado. Os dois novos códigos precisam entrar em `FDE_TRACEABILITY_MATRIX.md`, gerado por `validate_fde_traceability.py --emit`.
5. **`STREAM_TO_CANONICAL`** — hoje mapeia `"cattle": "ESTERCO_BOVINO"`. Com o desdobramento, o mapa de streams e o script de cálculo passam a discordar sobre o que é "cattle", a menos que ambos sejam ajustados juntos. **Este é o ponto de maior risco de silenciosamente divergir**, e é a mesma classe de falha que `canonical_loader.py:165-172` documenta ter causado o bug das 205 M de cabeças lidas como toneladas.

---

## 8. Decisões registradas

Conforme instrução, para não serem reabertas:

1. **Fase 2 será incorporada antes da submissão**, mesclada **junto** com a
   aplicação de `mill_delivery_fraction` ao caminho estadual, num **único
   recálculo**. Um delta, uma reescrita.
2. **Safrinha (`Milho_PAM_SAFRAS_Limpo.csv`) e CONAB
   (`CONAB_GRAOS_CANA_UF_2008_2024.csv`) ficam fora.** Entram depois da submissão.
   `feedstocks.yaml` não será alterado por causa deles.
3. **Sentry (D14):** resolvido como *"integrado em 2025-12 (`41df736`), perdido no
   squash de 2026-05-19, ausente hoje"* — `grep sentry` em `frontend/package.json`
   e `backend/requirements.txt` retorna 0 em ambos. **Não reinstalar.**
4. O `3,57 → 3,90` declarado no `b279978` **não será usado**. A base 3,57 não existe
   mais; o delta real sai do recálculo único.

---

## 9. Reprodução

```bash
git log -1 --format='%h %ad %an%n%s%n%b' --date=iso 154cfae
git show 154cfae -- '*/compute_sp_canonical_totals.py'
git show 24b4095 -- '*/feedstocks.yaml'
git log --all -S"FRONTIER_ALPHA" --format='%h|%ad|%an|%s' --date=short
git log --all -S"UPGRADING_EFFICIENCY" --reverse --format='%h|%ad|%s' | head -1
git log origin/main -S"_compute_fronteira"        # vazio
git merge-tree $(git merge-base origin/main b279978) origin/main b279978 | grep -c "changed in both"
```

Nada foi corrigido. Nenhum valor alterado. Nenhum código tocado. Nenhum merge feito.
