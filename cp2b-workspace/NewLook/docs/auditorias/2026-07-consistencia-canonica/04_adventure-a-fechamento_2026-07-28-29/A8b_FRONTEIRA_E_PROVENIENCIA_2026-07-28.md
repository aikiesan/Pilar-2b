# A8b — Fronteira do Biogás e proveniência do corpus BMP

**Data:** 2026-07-28

**Branch:** `fix/canonical-consistency-2026-07`

**Escopo:** auditoria somente leitura. Nenhum código, parâmetro, resultado canônico
ou documento preexistente foi alterado. O único arquivo criado é este relatório.

## 1. Resultado executivo

1. O valor correto de `FORSU.bmp.max` no commit `24b4095` é **420 → 500**,
   não 400 → 420. A linha 68 do A8 está errada; a linha 294 do próprio A8 está
   correta.
2. O erro não se repete nas outras 11 linhas da tabela §3.2 do A8. Porém há uma
   segunda classe de erro: o A8 atribui os campos `bmp.corpus` ao commit inicial
   `92fb365`, mas os 28 blocos foram adicionados somente em `c64a64f`, em
   26/07/2026.
3. O cenário chamado Fronteira teve **duas definições diferentes**:
   - 06–07/06: cenário acima de `max`, acrescentando lodos de ETE em condição
     máxima, com premissa de digestão anaeróbia obrigatória;
   - 12/06: simples ponto médio, por métrica, entre `medio` e `max`,
     `FRONTIER_ALPHA = 0,5`.
4. No commit `154cfae`, nenhuma combinação explícita de FC, FCo, FS ou FL
   define a Fronteira. O código interpola o resultado final. O texto declara
   relaxamento de competição/coleta, mas não informa quais fatores mudam nem
   seus valores.
5. A escolha `0,5`, os valores resultantes e a afirmação de superação da FIESP
   aparecem no mesmo commit atômico. O Git não permite ordenar esses três fatos
   dentro do commit. Portanto, não há evidência versionada de que `0,5` tenha
   sido definido antes de se conhecer o resultado.
6. `feedstock_bmp_from_refs.csv` apareceu primeiro no ramo original em
   `5d3c378` e entrou na linha atual pelo squash `c588a4f`. Nenhum script
   versionado o gera.
7. A direção de proveniência declarada no contexto
   `CSV → bmp.corpus no YAML em 92fb365` é cronologicamente impossível:
   `92fb365` não contém `bmp.corpus`; o CSV surgiu em 12/06 e os blocos do YAML
   foram adicionados em 26/07 por `c64a64f`.
8. Das 24 linhas do CSV, 17 possuem código homônimo no YAML e, nessas 17,
   `n` e `median` coincidem exatamente. Sete não possuem código homônimo.
9. Há 11 feedstocks com `bmp.corpus.n = 0` e banda BMP completa.
10. Quatro `bmp.max` coincidem exatamente com `bmp.corpus.median`; não há caso
    apenas aproximado dentro da tolerância de 0,1%.

Nenhum total estadual atual foi executado, calculado ou consultado nesta
auditoria. Números de cenário abaixo são apenas transcrições literais dos
commits históricos que as tarefas 2 e 3 exigem reconstruir.

## 2. Errata do A8: `FORSU.bmp.max`

### 2.1 Diff real de `24b4095`

O diff de `feedstocks.yaml` registra:

```diff
-      min: 200.0
-      medio: 310.0
-      max: 420.0
+      min: 250.0
+      medio: 360.0
+      max: 500.0
```

Logo:

| Campo | Antes | Depois | Delta |
|---|---:|---:|---:|
| `FORSU.bmp.min` | 200 | 250 | +25,00% |
| `FORSU.bmp.medio` | 310 | 360 | +16,13% |
| `FORSU.bmp.max` | **420** | **500** | **+19,05%** |

### 2.2 Linhas contraditórias do A8

- **A8 linha 68, §3.2:** informa `400 → 420`, +5,00%. **Errada.**
- **A8 linha 294, §5:** informa `420 → 500`, +19,05%. **Correta.**

Uma busca em todo o histórico de `feedstocks.yaml` por `max: 400.0` não
encontrou esse valor para FORSU. O commit A8 (`afa9e3b`) adicionou somente o
relatório, sem script gerador. Assim, o que pode ser demonstrado é que a linha
68 é uma transcrição/resumo não derivado do diff real; o mecanismo exato que
produziu `400 → 420` não foi versionado.

### 2.3 Verificação das demais linhas

As outras 11 linhas da §3.2 — os três campos de VINHACA, CASCA_CAFE e
DEJETOS_SUINO, mais `FORSU.min` e `FORSU.medio` — coincidem com o diff real e
com as linhas 287–298 da §5. O modo de erro específico da linha 68 não afeta
essas 11 linhas.

### 2.4 Segunda contradição encontrada no A8

As linhas 315–340 do A8 apresentam vários `bmp.corpus.n` e
`bmp.corpus.median` como parâmetros nunca alterados, introduzidos na criação
inicial `92fb365`. O histórico contradiz essa classificação:

- `git show 92fb365:.../feedstocks.yaml` contém **zero** blocos `corpus`;
- o pai de `c64a64f` contém **zero** blocos `corpus`;
- `c64a64f` contém **28** blocos e sua mensagem declara explicitamente:
  “Regra R2: bloco bmp.corpus nos 28 feedstocks”.

Portanto, esses campos foram adicionados em `c64a64f` em 26/07/2026, e não em
`92fb365` em 05/06/2026.

## 3. Commit `154cfae`: definição da Fronteira

### 3.1 Ficha e arquivos co-alterados

- Hash: `154cfae7a9257eb4101d27e52d2250a626c97275`
- Autor e committer: Claude `<noreply@anthropic.com>`
- Data: 2026-06-12 09:58:44 UTC
- Mensagem: `feat: add 'Fronteira do Biogás' intermediate scenario (>FIESP benchmark)`
- Arquivos:
  1. `backend/scripts/compute_sp_canonical_totals.py` — modificado;
  2. `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` — modificado.

O commit lateral `154cfae` não é ancestral de `HEAD`. Seu conteúdo foi
integrado na linha atual pelo squash `c588a4f`.

### 3.2 Definição no código

O commit adicionou:

```python
FRONTIER_ALPHA = 0.5
fro = tuple(
    m + FRONTIER_ALPHA * (x - m)
    for m, x in [
        (ch4[1], ch4[2]),
        (big[1], big[2]),
        (bm[1], bm[2]),
    ]
)
```

Portanto, a definição executável de 12/06 era:

```text
fronteira(métrica) = medio(métrica) + 0,5 × (max(métrica) − medio(métrica))
```

Ela é uma interpolação **depois** do cálculo das métricas agregadas. Não há
seleção de valores de FC, FCo, FS, FL ou `eta` para um cenário Fronteira.

### 3.3 Definição em parâmetro

Não existe bloco `frontier`, `fronteira` ou `FRONTIER_ALPHA` em
`feedstocks.yaml`. O `0,5` foi uma constante de código.

Na implementação atual, a mesma constante está em
`backend/scripts/compute_sp_canonical_totals.py:75`; a função `_frontier` está
na linha 442. `canonical_results.json` registra a fórmula como metadado, mas é
saída gerada, não fonte paramétrica.

### 3.4 Premissa declarada versus premissa implementada

O comentário do código e o relatório dizem que a Fronteira representa
“relaxamento dos fatores de competição de uso e coleta sob política pública
dedicada”. O relatório ainda afirma que:

- FC/FS/FL seriam mantidos;
- apenas FCo seria relaxado;
- o cenário cobriria 31 resíduos.

Entretanto, o código:

- não identifica feedstocks afetados;
- não altera FC;
- não altera FCo;
- não altera FS;
- não altera FL;
- não declara valor novo para nenhum desses fatores;
- interpola todas as métricas finais em 50% do intervalo `medio → max`.

Assim, a base declarada é narrativa (“política dedicada”); não há base
bibliográfica ou regulatória citada para o valor `0,5`, nem uma tradução da
premissa em fatores físicos.

O próprio relatório após `154cfae` conserva, ao final da seção, um parágrafo da
definição anterior: “envelope superior com disponibilidade plena (FC/FCo
relaxados ao limite de coleta)” e os valores antigos. Esse trecho contradiz a
nova definição intermediária apresentada imediatamente acima.

### 3.5 A premissa veio antes ou depois do valor?

O pai de `154cfae`, `f851259`, já publicava uma Fronteira diferente, próxima do
envelope otimista, definida como mobilização plena. Em `154cfae`, aparecem
atomicamente:

- `FRONTIER_ALPHA = 0,5`;
- a nova explicação de ponto médio;
- os novos valores literais 9,19 / 16,42 / 8,92;
- o título e o texto que destacam superar a FIESP.

O Git fornece somente o intervalo:

```text
09:38:18 UTC — f851259: definição antiga e valores antigos
09:58:44 UTC — 154cfae: alpha, nova definição, novos valores e comparação
```

Não há commit intermediário. Logo, não é possível afirmar se a premissa foi
escrita antes ou depois de se observar o valor produzido.

### 3.6 Histórico do valor `0,5`

Na linha efetivamente integrada:

1. `c588a4f` incorporou `FRONTIER_ALPHA = 0,5`;
2. `9fbee10` apenas reformatou a expressão;
3. `cac1f425` moveu a constante para escopo de módulo e passou a reutilizá-la na
   consolidação espacial.

O valor numérico **nunca foi alterado**. Não há commit com outro alpha. A
mensagem do único refactor funcional posterior é
`fix: consolidate canonical spatial results`.

### 3.7 Definição anterior, omitida pela cronologia resumida do A8

O nome “Fronteira do Biogás” não nasceu em `154cfae`. Ele já existia nos
commits `2a646a9`/`8c2d8f3` de 06–07/06. A definição então era:

- executar `LODO_PRIMARIO` e `LODO_SECUNDARIO` em `max`;
- somar esse resultado ao cenário otimista;
- justificar por política obrigatória de digestão anaeróbia de lodos;
- usar os blocos de geração de lodo adicionados ao YAML.

Essa definição é materialmente diferente do ponto médio de `154cfae`.

### 3.8 Relação com o manuscrito atual

O rascunho atualmente arquivado não chama seu número de manchete de
“Fronteira”. Ele afirma `19.69 million m³ CH₄/day` nas linhas 133 e 165. Esse
valor não é nenhum dos três valores de Fronteira transcritos em `154cfae`.
Portanto, a afirmação de que o número de manchete atual é o valor Fronteira não
fica demonstrada pelo texto do manuscrito nem pelo commit `154cfae`.

## 4. Reconstrução de `f851259`

### 4.1 Ficha

- Hash: `f851259627e224ae43b74700bd4cea75af300bdd`
- Autor e committer: Claude `<noreply@anthropic.com>`
- Data: 2026-06-12 09:38:18 UTC
- Mensagem:
  `docs: FIESP comparison report + recomputed 4 scenarios + suspect-DOI worklist`
- Arquivos criados:
  1. `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md`;
  2. `docs/data/SUSPECT_DOI_WORKLIST.md`.

### 4.2 Divergência medida no relatório

O relatório comparou o recorte cana + aterro:

| Grandeza registrada | Pilar `medio` | Pilar `max` | FIESP |
|---|---:|---:|---:|
| Biogás | 4,76 | 16,40 | 11,7 |
| Biometano | 2,54 | 8,79 | 6,4 / 4,75 |

A conclusão literal foi que os valores FIESP caíam entre `medio` e `max` do
recorte Pilar. O relatório também registrou que aplicar diretamente os fatores
da Tabela 5 da FIESP produzia 12–13 de biometano, acima do próprio headline 6,4,
e classificou essa aplicação como não autoconsistente.

### 4.3 Recomendação de ajuste

O relatório continha recomendação explícita de elevar parâmetros:

> **Recomendação (não aplicada — preserva os 21+ testes de regressão):**
> rever para cima, com justificativa por linha, BMP de PALHA, VINHACA e FORSU
> onde a base empírica é robusta; manter os demais. Isso eleva *medio*
> aproximando-o do benchmark FIESP sem perder rigor.

Portanto, dez minutos antes de `24b4095`, o documento:

- registrava que o cenário médio estava abaixo do benchmark no recorte;
- recomendava elevar BMPs;
- declarava como efeito desejado aproximar `medio` do benchmark.

Esse é um fato cronológico e textual. Ele não prova intenção causal.

## 5. Proveniência de `feedstock_bmp_from_refs.csv`

### 5.1 Primeira aparição

Há duas referências necessárias por causa da topologia Git:

| Papel | Commit | Data | Autor | Mensagem |
|---|---|---|---|---|
| criação no ramo original | `5d3c3788431e17232a62f1276f7eb0c5a2b79766` | 2026-06-12 09:35:34 UTC | Claude | `data: unify full 399 scientific_references corpus + mine BMP from notes` |
| primeira entrada na linha atual | `c588a4f9d2426d93647e7ae91669ea0bbf6f9cec` | 2026-06-12 07:02:00 −03:00 | Lucas Nakamura Cerejo | `docs: FIESP benchmark extraction + citation/reference DB audits (#100)` |

O encadeamento do ramo original é:

```text
5d3c378 → f851259 → 24b4095 → 154cfae
```

`c588a4f` é o squash que reuniu essa série na linha atual.

### 5.2 Script gerador

O commit adicionou `backend/scripts/unify_references.py`, mas esse script:

- lê exportações de referências;
- limpa, mapeia e deduplica referências;
- grava somente `references_unified.csv`;
- não calcula estatísticas BMP;
- não grava `feedstock_bmp_from_refs.csv`.

Nenhum script versionado, em nenhuma ref pesquisada, escreve o CSV agregado.
A mensagem de commit declara “mine BMP from notes”, mas o procedimento que
transformou notas em 196 observações e depois em min/mediana/max não foi
versionado.

### 5.3 Leituras atuais

Nenhum código de produção rastreado lê o CSV hoje. As ocorrências rastreadas
estão em documentação e especificações de auditoria.

Há um script **local não rastreado**, preexistente no worktree,
`scripts/generate_a3b_report.py`, que lê o CSV para produzir relatório de
auditoria. Ele não integra runtime, API ou frontend e não foi incluído neste
commit.

### 5.4 Cronologia correta do YAML

O CSV surgiu em 12/06. Os blocos `bmp.corpus` foram adicionados ao YAML somente
em `c64a64f`, em 26/07, junto com a Regra R2. Assim:

```text
92fb365 (05/06): feedstocks.yaml sem bmp.corpus
5d3c378 / c588a4f (12/06): CSV agregado aparece
c64a64f (26/07): 28 blocos bmp.corpus entram no YAML; R2 altera quatro máximos
```

A coincidência entre CSV e YAML é real, mas a afirmação de que a mediana estava
gravada no YAML desde `92fb365` é falsa.

## 6. Comparação CSV × YAML, linha a linha

Critério: comparação direta pelo código `feedstock`, sem criar equivalências
semânticas não declaradas.

| Linha CSV | Feedstock | `n` CSV | `n` YAML | Mediana CSV | Mediana YAML | Resultado |
|---:|---|---:|---:|---:|---:|---|
| 2 | BAGACO | 6 | 6 | 191,9 | 191,9 | igual |
| 3 | BAGACO_CITROS | 10 | 10 | 289 | 289 | igual |
| 4 | CAMA_AVIARIO | 1 | 1 | 300 | 300 | igual |
| 5 | CASCAS_CITROS | 1 | 1 | 398 | 398 | igual |
| 6 | CASCA_CAFE | 2 | 2 | 163,8 | 163,8 | igual |
| 7 | CASCA_EUCALIPTO | 1 | — | 100 | — | código ausente no YAML |
| 8 | CASCA_MILHO | 30 | 30 | 307 | 307 | igual |
| 9 | DEJETOS_AVES | 2 | 2 | 414 | 414 | igual |
| 10 | DEJETOS_SUINO | 10 | 10 | 265 | 265 | igual |
| 11 | ESTERCO_BOVINO_FRESCO | 6 | — | 245 | — | código ausente no YAML |
| 12 | FORSU | 9 | 9 | 472 | 472 | igual |
| 13 | GORDURA | 2 | 2 | 859 | 859 | igual |
| 14 | LEVEDURA | 1 | — | 699 | — | código ausente no YAML |
| 15 | LODO_PRIMARIO | 11 | 11 | 370 | 370 | igual |
| 16 | LODO_SECUNDARIO | 8 | 8 | 310 | 310 | igual |
| 17 | PALHA | 14 | 14 | 293,5 | 293,5 | igual |
| 18 | PALHA_MILHO | 31 | 31 | 390 | 390 | igual |
| 19 | POLPA_CAFE | 1 | 1 | 317 | 317 | igual |
| 20 | SABUGO | 13 | — | 255 | — | código ausente no YAML |
| 21 | SORO_QUEIJO | 12 | — | 453,5 | — | código ausente no YAML |
| 22 | TORTA_FILTRO | 14 | 14 | 365 | 365 | igual |
| 23 | VAGEM_SOJA | 1 | — | 220 | — | código ausente no YAML |
| 24 | VINHACA | 7 | 7 | 180 | 180 | igual |
| 25 | VISCERAS | 3 | — | 650,9 | — | código ausente no YAML |

Resumo:

- 24 linhas no CSV;
- 17 códigos homônimos no YAML, todos com `n` e mediana exatamente iguais;
- zero divergências numéricas entre códigos homônimos;
- sete códigos presentes somente no CSV:
  `CASCA_EUCALIPTO`, `ESTERCO_BOVINO_FRESCO`, `LEVEDURA`, `SABUGO`,
  `SORO_QUEIJO`, `VAGEM_SOJA`, `VISCERAS`.

## 7. Feedstocks com `bmp.corpus.n = 0` e banda preenchida

Contagem: **11**.

| Feedstock | `bmp.min` | `bmp.medio` | `bmp.max` |
|---|---:|---:|---:|
| MUCILAGEM_CAFE | 260 | 320 | 390 |
| CASCA_SOJA | 230 | 300 | 380 |
| PALHA_SOJA | 150 | 220 | 280 |
| ESTERCO_BOVINO | 120 | 200 | 270 |
| ESTERCO_BOVINO_CORTE | 80 | 120 | 180 |
| ESTERCO_BOVINO_LEITEIRO | 150 | 230 | 300 |
| DEJETOS_BOVINO | 90 | 155 | 220 |
| ESTERCO_SUINO | 150 | 235 | 320 |
| ORGANICO_RSU | 170 | 270 | 360 |
| PODA_URBANA | 100 | 175 | 250 |
| SANGUE | 300 | 450 | 620 |

Todos têm `median: null`, `coverage: none` e não possuem linha homônima no CSV.

## 8. `bmp.max` igual ou dentro de 0,1% da mediana

Critério executado:

```text
abs(bmp.max − corpus.median) / abs(corpus.median) ≤ 0,001
```

Contagem: **4**.

| Feedstock | `bmp.max` | `corpus.median` | Diferença relativa | Tipo |
|---|---:|---:|---:|---|
| PALHA | 293,5 | 293,5 | 0% | igualdade exata |
| PALHA_MILHO | 390 | 390 | 0% | igualdade exata |
| CASCA_MILHO | 307 | 307 | 0% | igualdade exata |
| LODO_SECUNDARIO | 310 | 310 | 0% | igualdade exata |

Não há caso adicional apenas aproximado entre 0 e 0,1%. Os quatro máximos foram
alterados no commit `c64a64f`, cuja mensagem registra expressamente que a Regra
R2 alargou a banda para conter a mediana:

- PALHA: 250 → 293,5;
- PALHA_MILHO: 300 → 390;
- CASCA_MILHO: 185 → 307;
- LODO_SECUNDARIO: 260 → 310.

## 9. Conclusão sobre independência

Para a definição introduzida em `154cfae`, não foi localizada uma justificativa
independente para `FRONTIER_ALPHA = 0,5`. O valor é descrito como “ponto médio”,
mas não é derivado de fonte, política quantificada, curva de adoção ou combinação
explícita de fatores.

O mesmo commit:

- escolhe `0,5`;
- mostra o resultado;
- destaca que o resultado supera a FIESP;
- oferece uma narrativa de relaxamento de fatores que o código não implementa
  no nível dos fatores.

Isso demonstra acoplamento documental entre definição, resultado e benchmark.
Não demonstra qual deles motivou os demais, porque o Git não registra ordem
interna nem intenção. O intervalo factual permanece 09:38–09:58 UTC em
12/06/2026.

## 10. Comandos de verificação

```text
git show --format=fuller --stat --summary 24b4095
git show --format= --unified=5 24b4095 -- data/canonical_parameters/feedstocks.yaml
git show --format=fuller --stat --summary 154cfae
git show --format= --unified=8 154cfae
git show --format=fuller --stat --summary f851259
git show --format= --unified=12 f851259
git log --all --diff-filter=A --follow -- data/canonical_parameters/feedstock_bmp_from_refs.csv
git log --all -G "FRONTIER_ALPHA|def _frontier" -- backend/scripts/compute_sp_canonical_totals.py
git log --all -S "corpus:" -- data/canonical_parameters/feedstocks.yaml
git show c64a64f -- data/canonical_parameters/feedstocks.yaml
rg "feedstock_bmp_from_refs|FRONTIER_ALPHA|Fronteira do Biogás"
```

As comparações YAML–CSV foram executadas por leitura com `yaml.safe_load` e
`csv.DictReader`. Nenhuma função de cálculo estadual foi importada ou chamada.
