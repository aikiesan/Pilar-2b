# Regra única de BMP — especificação para aprovação

**Data:** 2026-07-25 · **Lote:** 1a-quater · **Estado:** ESPECIFICAÇÃO, NÃO APLICADA
**`feedstocks.yaml` não foi alterado.** Nenhum valor mudou.

Problema que motiva a regra, apurado no Lote 1a: a revisão de BMP de `24b4095`
elevou quatro feedstocks e deixou outros quatro inalterados, com o mesmo tipo de
evidência (mediana do corpus superior ao valor vigente), **sem critério documentado
que separasse os dois grupos**. O commit rotula os não alterados como
`confirmed within corpus range (no change)`. Nada define "within range".

---

## 1. Limitações dos dados, antes de qualquer regra

### 1.1 O intervalo interquartil NÃO É DERIVÁVEL

O corpus versionado é `data/canonical_parameters/feedstock_bmp_from_refs.csv`, com
uma linha por feedstock e cinco campos: `n_bmp_obs`, `bmp_min`, `bmp_median`,
`bmp_max`, `example_source_url`.

**As observações individuais que produziram essas medianas não estão versionadas.**
`references_unified.csv` (367 linhas) contém apenas metadados bibliográficos —
`feedstock_codes`, `citation`, `url`, `doi`, `year`, `peer_reviewed`,
`needs_url`, `suspect_doi_reuse`, `source_ids`. Nenhuma coluna de valor de BMP.

Consequências, ambas relevantes para a submissão:

- **O IQR pedido não pode ser calculado.** Registro como **NÃO DERIVÁVEL** em vez
  de estimá-lo a partir de min/mediana/max, o que seria inventar dispersão.
- **A recalibração de `24b4095` não é reproduzível a partir do repositório.** As
  medianas citadas nos comentários do YAML não podem ser reconferidas.

Qualquer regra proposta abaixo herda essa limitação: ela pode usar `n`, `min`,
`median` e `max` do corpus, e nada mais.

### 1.2 Cobertura do corpus é parcial

| Situação | Feedstocks |
|---|---:|
| Com corpus e `n ≥ 3` | **11** |
| Com corpus, `n = 1` ou `2` | **6** |
| **Sem nenhuma entrada no corpus** | **9** |
| **Total com bloco `bmp`** | **26** |

Os 9 sem corpus: `CASCA_SOJA`, `DEJETOS_BOVINO`, `ESTERCO_BOVINO`, `ESTERCO_SUINO`,
`MUCILAGEM_CAFE`, `ORGANICO_RSU`, `PALHA_SOJA`, `PODA_URBANA`, `SANGUE`.

Entre eles estão **`PALHA_SOJA` e `ESTERCO_BOVINO`**, dois dos treze streams
efetivamente somados no total estadual. Uma regra ancorada só no corpus deixaria
de fora parte do que o número publicado depende — por isso a regra proposta na §4
trata explicitamente os três regimes de cobertura.

---

## 2. Tabela dos 26 feedstocks

`vig` = valor vigente em `feedstocks.yaml`. `c_*` = corpus.
"Situação" = a mediana do corpus cai dentro da banda declarada `[vig_min, vig_max]`?

| Código | vig_min | **vig_medio** | vig_max | n | c_min | c_med | c_max | medio ÷ c_med | Situação |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `BAGACO` | 115,0 | **165,0** | 220,0 | 6 | 44,0 | 191,9 | 236,0 | 0,86× | dentro |
| `BAGACO_CITROS` | 170,0 | **230,0** | 310,0 | 10 | 85,9 | 289,0 | 537,0 | 0,80× | dentro |
| `CAMA_AVIARIO` | 200,0 | **280,0** | 360,0 | **1** | 300,0 | 300,0 | 300,0 | 0,93× | dentro |
| `CASCAS_CITROS` | 160,0 | **210,0** | 290,0 | **1** | 398,0 | 398,0 | 398,0 | 0,53× | **fora** |
| `CASCA_CAFE` | 120,0 | **165,0** | 220,0 | **2** | 131,7 | 163,8 | 196,0 | 1,01× | dentro |
| `CASCA_MILHO` | 110,0 | **145,0** | 185,0 | 30 | 220,0 | 307,0 | 485,0 | 0,47× | **fora** |
| `CASCA_SOJA` | 230,0 | **300,0** | 380,0 | — | — | — | — | — | sem corpus |
| `DEJETOS_AVES` | 150,0 | **250,0** | 340,0 | **2** | 320,0 | 414,0 | 508,0 | 0,60× | **fora** |
| `DEJETOS_BOVINO` | 90,0 | **155,0** | 220,0 | — | — | — | — | — | sem corpus |
| `DEJETOS_SUINO` | 150,0 | **245,0** | 300,0 | 10 | 72,9 | 265,0 | 340,0 | 0,92× | dentro |
| `ESTERCO_BOVINO` | 120,0 | **200,0** | 270,0 | — | — | — | — | — | sem corpus |
| `ESTERCO_SUINO` | 150,0 | **235,0** | 320,0 | — | — | — | — | — | sem corpus |
| `FORSU` | 250,0 | **360,0** | 500,0 | 9 | 380,0 | 472,0 | 655,0 | 0,76× | dentro |
| `GORDURA` | 700,0 | **850,0** | 1050,0 | **2** | 800,0 | 859,0 | 918,0 | 0,99× | dentro |
| `LODO_PRIMARIO` | 190,0 | **310,0** | 440,0 | 11 | 152,0 | 370,0 | 918,7 | 0,84× | dentro |
| `LODO_SECUNDARIO` | 80,0 | **180,0** | 260,0 | 8 | 218,0 | 310,0 | 823,0 | 0,58× | **fora** |
| `MUCILAGEM_CAFE` | 260,0 | **320,0** | 390,0 | — | — | — | — | — | sem corpus |
| `ORGANICO_RSU` | 170,0 | **270,0** | 360,0 | — | — | — | — | — | sem corpus |
| `PALHA` | 140,0 | **175,0** | 250,0 | 14 | 130,0 | 293,5 | 605,0 | 0,60× | **fora** |
| `PALHA_MILHO` | 150,0 | **230,0** | 300,0 | 31 | 44,0 | 390,0 | 725,0 | 0,59× | **fora** |
| `PALHA_SOJA` | 150,0 | **220,0** | 280,0 | — | — | — | — | — | sem corpus |
| `PODA_URBANA` | 100,0 | **175,0** | 250,0 | — | — | — | — | — | sem corpus |
| `POLPA_CAFE` | 190,0 | **245,0** | 290,0 | **1** | 317,0 | 317,0 | 317,0 | 0,77× | **fora** |
| `SANGUE` | 300,0 | **450,0** | 620,0 | — | — | — | — | — | sem corpus |
| `TORTA_FILTRO` | 200,0 | **280,0** | 380,0 | 14 | 92,8 | 365,0 | 861,0 | 0,77× | dentro |
| `VINHACA` | 90,0 | **160,0** | 200,0 | 7 | 49,0 | 180,0 | 968,0 | 0,89× | dentro |

Contagem: **10 dentro · 7 fora · 9 sem corpus**.

### 2.1 O viés é sistemático e unidirecional

Entre os 11 feedstocks com `n ≥ 3`, a razão `medio ÷ mediana_do_corpus` é:

| | valor |
|---|---:|
| mínimo | **0,47×** |
| mediana | **0,77×** |
| máximo | **0,92×** |

**Nenhum valor vigente ultrapassa a mediana do corpus.** Isso é coerente com a
justificativa declarada no próprio YAML — base de *mono-digestão sem
pré-tratamento*, enquanto o corpus inclui estudos com pré-tratamento e
co-digestão, que puxam a mediana para cima. **Mas essa política nunca foi escrita
como política.** Ela existe apenas como comentário caso a caso, e é justamente a
sua ausência que permitiu a aplicação seletiva de `24b4095`.

---

## 3. Regra R1, testada e REJEITADA

> **R1 — `medio := mediana do corpus`, quando `n ≥ 3`.**

Efeito simulado:

| | |
|---|---:|
| Feedstocks movidos | **11** |
| Para cima | **11** |
| Para baixo | **0** |

| Código | vigente | → novo | Δ | n |
|---|---:|---:|---:|---:|
| `CASCA_MILHO` | 145,0 | 307,0 | **+111,7 %** | 30 |
| `LODO_SECUNDARIO` | 180,0 | 310,0 | +72,2 % | 8 |
| `PALHA_MILHO` | 230,0 | 390,0 | +69,6 % | 31 |
| `PALHA` | 175,0 | 293,5 | +67,7 % | 14 |
| `FORSU` | 360,0 | 472,0 | +31,1 % | 9 |
| `TORTA_FILTRO` | 280,0 | 365,0 | +30,4 % | 14 |
| `BAGACO_CITROS` | 230,0 | 289,0 | +25,7 % | 10 |
| `LODO_PRIMARIO` | 310,0 | 370,0 | +19,4 % | 11 |
| `BAGACO` | 165,0 | 191,9 | +16,3 % | 6 |
| `VINHACA` | 160,0 | 180,0 | +12,5 % | 7 |
| `DEJETOS_SUINO` | 245,0 | 265,0 | +8,2 % | 10 |

**Rejeitada, por três razões:**

1. Move o total estadual **para cima em todos os feedstocks**, na direção do
   benchmark FIESP — exatamente o padrão que o Lote 1a identificou como risco de
   circularidade. Adotá-la agora agravaria o problema que a regra deveria resolver.
2. Abandona a base declarada de mono-digestão sem pré-tratamento, adotando uma
   mediana que mistura condições experimentais.
3. Deixa **15 dos 26** feedstocks fora de escopo, incluindo `PALHA_SOJA` e
   `ESTERCO_BOVINO`, que entram no total estadual.

---

## 4. Regra R2 — PROPOSTA

> ## R2 — Regra de contenção
>
> **A banda declarada tem de conter a mediana do corpus.**
>
> Para todo feedstock com `n ≥ 3`:
>
> ```
> bmp.min  ≤  mediana_do_corpus  ≤  bmp.max
> ```
>
> `bmp.medio` **não é alterado pela regra.** Ele permanece o valor central da
> plataforma na base declarada — mono-digestão, substrato não pré-tratado — e
> segue exigindo, como hoje, no mínimo duas referências primárias.
>
> Quando a regra falha, a correção é **alargar a banda**, não mover o centro:
> `bmp.max := max(bmp.max, mediana_do_corpus)`, ou `bmp.min := min(...)` no caso
> simétrico. A alteração exige uma linha de justificativa no YAML.
>
> Para `n = 1` ou `2`: a regra **não se aplica** — uma mediana de uma observação
> não é uma mediana. O feedstock recebe `corpus_coverage: insufficient` e continua
> exigindo ≥ 2 referências primárias.
>
> Para os sem corpus: `corpus_coverage: none`, mesma exigência de ≥ 2 referências
> primárias, e o feedstock é listado nas limitações do manuscrito.
>
> A regra é verificável em CI, sobre os três regimes, sem exceção manual.

### 4.1 Por que R2, e não outra

| Critério | R1 (mediana) | **R2 (contenção)** |
|---|---|---|
| Aplicável aos 26 sem exceção | não (15 fora) | **sim, via três regimes declarados** |
| Move o número-título (medio) | sim, 11× para cima | **não** |
| Direção do movimento | unidirecional ↑ | **só alarga incerteza** |
| Preserva a base mono-digestão | não | **sim** |
| Elimina o critério não documentado de `24b4095` | não | **sim** |
| Testável em CI | parcialmente | **sim** |
| Reproduzível com o que está versionado | sim | **sim** |

R2 responde à pergunta que `24b4095` deixou sem resposta — *o que significa "dentro
da faixa do corpus"* — com um predicado único, verificável e sem exceção. E o faz
sem mover o valor que o manuscrito reporta, o que é decisivo a esta altura: a
correção de método não vira, de carona, uma revisão do resultado.

### 4.2 O que R2 moveria

**Quatro feedstocks falham hoje**, todos por `bmp.max` abaixo da mediana do corpus.
Nenhum falha por `bmp.min`.

| Código | min | medio | max vigente | c_med | n | Correção mínima |
|---|---:|---:|---:|---:|---:|---|
| `PALHA_MILHO` | 150,0 | 230,0 | 300,0 | 390,0 | 31 | `max: 300 → 390` |
| `CASCA_MILHO` | 110,0 | 145,0 | 185,0 | 307,0 | 30 | `max: 185 → 307` |
| `LODO_SECUNDARIO` | 80,0 | 180,0 | 260,0 | 310,0 | 8 | `max: 260 → 310` |
| `PALHA` | 140,0 | 175,0 | 250,0 | 293,5 | 14 | `max: 250 → 293,5` |

Os outros três "fora" da §2 — `CASCAS_CITROS`, `DEJETOS_AVES`, `POLPA_CAFE` — têm
`n = 1` ou `2` e **saem de escopo por regra**, recebendo `corpus_coverage:
insufficient`. Isso é deliberado: `CASCAS_CITROS` reprovaria contra uma "mediana"
de uma única observação (398,0).

### 4.3 Efeito numérico projetado

Simulado com o motor canônico e o CSV de entrada atuais, aplicando apenas as quatro
correções de `max` acima. **Nada foi gravado; `feedstocks.yaml` está intacto.**

| Grandeza | Cenário | Antes | Depois | Δ |
|---|---|---:|---:|---:|
| CH₄ prático (Mm³/d) | min | 0,7537 | 0,7537 | **0,00 %** |
| CH₄ prático (Mm³/d) | **medio** | **3,6488** | **3,6488** | **0,00 %** |
| CH₄ prático (Mm³/d) | max | 14,7363 | 14,8836 | **+1,00 %** |
| Biogás prático (Mm³/d) | min | 1,3507 | 1,3507 | 0,00 % |
| Biogás prático (Mm³/d) | **medio** | **6,5326** | **6,5326** | **0,00 %** |
| Biogás prático (Mm³/d) | max | 26,2993 | 26,5671 | +1,02 % |
| Biometano (Mm³/d) | min | 0,7311 | 0,7311 | 0,00 % |
| Biometano (Mm³/d) | **medio** | **3,5393** | **3,5393** | **0,00 %** |
| Biometano (Mm³/d) | max | 14,2942 | 14,4371 | +1,00 % |

Dos quatro corrigidos, apenas `PALHA` e `PALHA_MILHO` entram no total estadual;
`CASCA_MILHO` e `LODO_SECUNDARIO` não têm stream municipal ativo. Daí o efeito de
1 %, restrito ao cenário máximo.

### 4.4 Forma no YAML

Sem alterar a estrutura existente, acrescentando um bloco declarativo por feedstock:

```yaml
  PALHA_MILHO:
    bmp:
      min: 150.0
      medio: 230.0
      max: 390.0          # R2 (2026-07-25): alargado de 300,0 para conter a
                          # mediana do corpus (390,0; n=31). O medio permanece
                          # 230,0 — base mono-digestão sem pré-tratamento.
      corpus:
        n: 31
        median: 390.0
        coverage: sufficient   # sufficient | insufficient | none
```

`coverage` é o campo que torna os três regimes explícitos e o teste de CI escrevível
em uma linha.

### 4.5 Teste de CI que a regra habilita

```python
def test_bmp_band_contains_corpus_median():
    """R2: a banda declarada tem de conter a mediana do corpus (n >= 3)."""
    for code, entry in load_raw().items():
        corpus = entry.get("corpus")
        if not corpus or corpus.get("coverage") != "sufficient":
            continue
        bmp, med = entry["bmp"], corpus["median"]
        assert bmp["min"] <= med <= bmp["max"], (
            f"{code}: mediana do corpus {med} fora da banda "
            f"[{bmp['min']}, {bmp['max']}]"
        )
```

---

## 5. O que R2 NÃO resolve

Declarado, para não ser tomado como resolvido:

1. **O IQR continua indisponível.** As observações individuais não estão
   versionadas (§1.1). R2 usa mediana e `n`, que estão.
2. **A recalibração de `24b4095` continua não reproduzível.** R2 impede que o
   problema se repita; não reconstrói o que foi feito.
3. **Os 9 feedstocks sem corpus** ficam sob a regra antiga — ≥ 2 referências
   primárias — que continua sem verificação automática de *qual* condição
   experimental cada referência mediu.
4. **A base "mono-digestão sem pré-tratamento" passa a ser política escrita**, mas
   R2 não a verifica: nada no repositório registra, por referência, se o estudo usou
   pré-tratamento. Isso exigiria estender o corpus, não a regra.
5. **`CASCA_MILHO` fica com `medio` a 0,47× da mediana do corpus**, o desvio mais
   extremo da base. R2 alarga a banda e torna o desvio visível; não o justifica.
   Como `CASCA_MILHO` é um dos três feedstocks de baixa confiança já declarados no
   suplemento e não tem stream ativo, isso é registro, não bloqueio.

---

## 6. Decisão pedida

| Opção | Efeito |
|---|---|
| **Aprovar R2** | Entra no Lote 2, item (iii), junto com `mill_delivery_fraction` e a Fase 2, num único recálculo. Move `max` em 4 feedstocks; medio e min inalterados; total estadual medio inalterado |
| Aprovar R2 com outro limiar de `n` | O limiar 3 é escolha minha, não da literatura. Com `n ≥ 5`, `LODO_SECUNDARIO` sairia de escopo e restariam 3 correções |
| Rejeitar | O critério não documentado de `24b4095` permanece, e a assimetria entre revisados e "confirmados" fica sem explicação para o revisor |

Nada será aplicado sem aprovação explícita.

---

## 7. Reprodução

```bash
python3 - <<'PY'
import csv, yaml
from pathlib import Path
NL = Path("cp2b-workspace/NewLook")
fs = yaml.safe_load((NL/"data/canonical_parameters/feedstocks.yaml").read_text())["feedstocks"]
corpus = {r["feedstock"]: r for r in
          csv.DictReader((NL/"data/canonical_parameters/feedstock_bmp_from_refs.csv").open(encoding="utf-8-sig"))}
for code in sorted(fs):
    b = fs[code].get("bmp"); c = corpus.get(code)
    if not b or not c or int(c["n_bmp_obs"]) < 3: continue
    med = float(c["bmp_median"])
    print(code, "OK" if b["min"] <= med <= b["max"] else "FALHA", b["max"], med)
PY
```
