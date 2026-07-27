# Política de BMP — ancoragem, base experimental e cobertura de corpus

**Vigência:** a partir de 2026-07-25 · **Lote:** 1e-a
**Escopo:** os 28 feedstocks de `data/canonical_parameters/feedstocks.yaml`.
**Estado:** política declarada. A regra R2 da §4 está suspensa desde o B-Q1.

Este documento existe porque a política **já era praticada e nunca havia sido
escrita**. A ausência de um critério declarado permitiu, em 2026-06-12, que quatro
feedstocks fossem revisados e outros quatro, com o mesmo tipo de evidência, não
fossem — sem que nada no repositório explicasse a diferença (§5).

---

## 1. As três declarações da política

### 1.1 Ancoragem conservadora

O valor `bmp.medio` de cada feedstock é posicionado **no terço inferior da faixa
observada no corpus**, quando há corpus. Não é a mediana do corpus, e isso é
deliberado.

### 1.2 Base experimental: mono-digestão, substrato não pré-tratado

Todo valor de `bmp` refere-se a **mono-digestão de substrato não pré-tratado**, em
regime mesofílico. Estudos com pré-tratamento (explosão a vapor, hidrólise
alcalina, térmico) e com co-digestão **não** definem o valor central — podem
informar `bmp.max`, nunca `bmp.medio`.

Esta é a razão física da ancoragem conservadora: o corpus mistura condições
experimentais, e a plataforma modela o que uma planta em São Paulo obtém do
substrato como ele chega ao digestor.

### 1.3 Consequência: o viés é sistemático, não caso a caso

Entre os 11 feedstocks com `n ≥ 3` observações no corpus, a razão entre o valor
vigente e a mediana do corpus é:

| Estatística | Razão `medio ÷ mediana_corpus` |
|---|---:|
| mínimo | **0,47×** |
| **mediana** | **0,77×** |
| máximo | **0,92×** |

**Nenhum valor vigente ultrapassa a mediana do corpus.** Os 11 valores estão todos
abaixo, e a mediana das razões — 0,77× — situa o conjunto no terço inferior. A
política da §1.1 descreve, portanto, o que a base já faz; o que muda aqui é que
passa a ser afirmação verificável em vez de padrão emergente.

Fonte da tabela: `docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md`, §2.1.

---

## 2. O que a política NÃO afirma

Delimitado para não ser lido como mais forte do que é:

1. **Não afirma que 0,77× é o alvo.** É a mediana observada, não um parâmetro.
   Nenhum feedstock é ajustado para atingir uma razão.
2. **Não afirma que o corpus é o árbitro do valor central.** O corpus delimita a
   faixa plausível; o valor central vem das referências primárias na base
   experimental declarada.
3. **Não verifica a condição experimental por referência.** Nada no repositório
   registra, referência a referência, se o estudo usou pré-tratamento ou
   co-digestão. A base declarada na §1.2 é política, não é hoje auditável por
   máquina. Corrigir isso exige estender o corpus, não a regra (§6).

---

## 3. Os três regimes de cobertura de corpus

Todo feedstock recebe um dos três rótulos, e o rótulo determina que verificação se
aplica.

| Regime | Condição | Verificação aplicável | Feedstocks |
|---|---|---|---:|
| `sufficient` | tem entrada no corpus **e** `n ≥ 3` | **R2 suspensa** (§4); não aplicar em CI | **11** |
| `insufficient` | tem entrada no corpus, `n = 1` ou `2` | R2 não se aplica — uma "mediana" de uma ou duas observações não é mediana. Exige ≥ 2 referências primárias | **6** |
| `none` | sem entrada no corpus | R2 não se aplica. Exige ≥ 2 referências primárias e figura nas limitações do manuscrito | **11** |

`sufficient` (11): `BAGACO`, `BAGACO_CITROS`, `CASCA_MILHO`, `DEJETOS_SUINO`,
`FORSU`, `LODO_PRIMARIO`, `LODO_SECUNDARIO`, `PALHA`, `PALHA_MILHO`,
`TORTA_FILTRO`, `VINHACA`.

`insufficient` (6): `CAMA_AVIARIO` (n=1), `CASCAS_CITROS` (n=1), `POLPA_CAFE` (n=1),
`CASCA_CAFE` (n=2), `DEJETOS_AVES` (n=2), `GORDURA` (n=2).

`none` (11): `CASCA_SOJA`, `DEJETOS_BOVINO`, `ESTERCO_BOVINO`,
`ESTERCO_BOVINO_CORTE`, `ESTERCO_BOVINO_LEITEIRO`, `ESTERCO_SUINO`,
`MUCILAGEM_CAFE`, `ORGANICO_RSU`, `PALHA_SOJA`, `PODA_URBANA`, `SANGUE`.

> **Dois dos `none` entram no total estadual:** `PALHA_SOJA` e `ESTERCO_BOVINO`.
> O número publicado depende de dois feedstocks que o corpus não cobre. Isso é
> limitação declarada, não pendência silenciosa.

O limiar `n ≥ 3` é escolha de projeto, não da literatura, e está registrado como
tal em `REGRA_BMP_ESPECIFICACAO_2026-07-25.md` §6.

---

## 4. R2 — a regra única

> **SUSPENSA — ADVENTURE B / B-Q1, 2026-07-28.**
>
> O agregado que fornece `n` e `median`, agora preservado em
> `data/quarantine/feedstock_bmp_from_refs.csv`, não possui script gerador
> versionado nem linhagem das observações declaradas. Os 28 blocos
> `bmp.corpus` estão marcados como
> `provenance: "quarantined_unversioned_source"`. Até que a proveniência seja
> reconstruída, R2 não pode criar, ampliar, validar ou reprovar bandas BMP.
>
> A suspensão não reverte os quatro `bmp.max` alterados por `c64a64f`:
> `PALHA=293,5`, `PALHA_MILHO=390`, `CASCA_MILHO=307` e
> `LODO_SECUNDARIO=310`. Reversão ou requalificação pertence ao B1 e exige
> tabela de delta.

> **A banda declarada tem de conter a mediana do corpus.**
>
> Para todo feedstock com `coverage: sufficient`:
> ```
> bmp.min  ≤  mediana_do_corpus  ≤  bmp.max
> ```
> `bmp.medio` **não é alterado pela regra**. Quando a verificação falha, alarga-se
> a banda — `bmp.max := max(bmp.max, mediana_corpus)` — com uma linha de
> justificativa no YAML. O centro nunca se move para satisfazer a regra.

R2 é a resposta operacional à pergunta que ficou sem resposta em 2026-06-12: *o que
significa "dentro da faixa do corpus"*. Um predicado, três regimes, nenhuma exceção
manual.

Especificação completa, alternativa rejeitada (R1), efeito projetado, forma no YAML
e teste de CI: `docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md`.

---

## 5. A revisão de 2026-06-12 (`24b4095`)

Registro do episódio que motivou esta política.

Commit `24b4095`, `feat: recalibrate canonical BMP from 367-paper corpus + propagate
to all layers`, 2026-06-12 09:48:03 +0000, autor `Claude`.

### 5.1 Os quatro feedstocks elevados

| Feedstock | min antes → depois | **medio antes → depois** | max antes → depois | Δ medio |
|---|---|---|---|---:|
| `VINHACA` | 40,0 → 90,0 | **90,0 → 160,0** | 160,0 → 200,0 | **+77,8 %** |
| `CASCA_CAFE` | 90,0 → 120,0 | **140,0 → 165,0** | 190,0 → 220,0 | **+17,9 %** |
| `DEJETOS_SUINO` | 140,0 → 150,0 | **210,0 → 245,0** | 280,0 → 300,0 | **+16,7 %** |
| `FORSU` | 200,0 → 250,0 | **310,0 → 360,0** | 420,0 → 500,0 | **+16,1 %** |

Efeito declarado no próprio commit: `SP scenarios: biogas medio 6.39->6.53,
max 25.78->26.30 Mm3/d`.

### 5.2 Não houve critério uniforme

Três constatações factuais, registradas sem atribuição de intenção:

**(a) As quatro revisões são para cima. Nenhuma para baixo.**

**(b) Três das quatro coincidem com a mediana do corpus declarada no próprio
comentário do YAML; uma não.**

| Feedstock | Mediana declarada no comentário | Novo medio | Coincide? |
|---|---:|---:|---|
| `CASCA_CAFE` | ~164 | 165,0 | sim |
| `DEJETOS_SUINO` | ~245 | 245,0 | sim |
| `VINHACA` | 165,5 (Moura 2023) | 160,0 | aproximadamente |
| `FORSU` | **~472** | **360,0** | **não** |

O comentário do `FORSU` registra o fato sem explicá-lo: `medio raised 310->360`.

**(c) Quatro feedstocks com mediana do corpus também superior ao valor vigente
NÃO foram alterados**, rotulados no commit como `confirmed within corpus range
(no change)`:

| Feedstock | Mediana do corpus | Valor canônico | Alterado? |
|---|---:|---:|---|
| `BAGACO` | 192 | 165 | não |
| `TORTA_FILTRO` | 365 | 280 | não |
| `CAMA_AVIARIO` | 300 | 280 | não |
| `GORDURA` | 859 | 850 | não |

**O critério que separou "revisar" de "confirmar dentro da faixa" não está
documentado em lugar nenhum do repositório.** É essa lacuna que a §1 e a §4
fecham: sob esta política, (b) e (c) passam a ter a mesma resposta — o corpus
delimita a banda, não move o centro.

### 5.3 Contexto cronológico

A revisão ocorreu no mesmo dia e nas mesmas horas em que o benchmark FIESP foi
extraído (01:55), o relatório de comparação reescrito (09:38) e o cenário Fronteira
redefinido (09:58). A cronologia completa está em
`docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/AUDITORIA_CIRCULARIDADE_2026-07-25.md` §1.4. A justificativa citada em
`24b4095` é o corpus de literatura primária, **não** o FIESP; o registro da
coincidência temporal é factual e não implica atribuição de causa.

---

## 6. Limitação estrutural: o corpus não é reproduzível

Apurado no Lote 1e-b e registrado aqui porque afeta o que esta política pode
afirmar.

`data/quarantine/feedstock_bmp_from_refs.csv` contém uma linha por
feedstock — `feedstock`, `n_bmp_obs`, `bmp_min`, `bmp_median`, `bmp_max`,
`example_source_url` — para 24 feedstocks, declarando **196 observações**.

**As 196 observações individuais não estão versionadas em lugar nenhum**, e o CSV
agregado **não é gerado por nenhum script do repositório**. Detalhe da busca em
`docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/BUSCA_OBSERVACOES_BMP_2026-07-25.md`.

Consequências para o que se pode afirmar:

1. **O intervalo interquartil não é calculável.** Só existem `n`, mínimo, mediana e
   máximo. Estimá-lo a partir desses quatro números seria inventar dispersão.
2. **A recalibração de `24b4095` não é reconferível.** As medianas citadas nos
   comentários do YAML não podem ser recalculadas a partir do repositório.
3. **A frase "mediana de 367 artigos primários" não é sustentável como está.** O
   corpus de 367 referências é bibliográfico
   (`references_unified.csv`: `feedstock_codes`, `citation`, `url`, `doi`, `year`,
   `peer_reviewed`, `needs_url`, `suspect_doi_reuse`, `source_ids`) e **não contém
   valores de BMP**. As 196 observações foram mineradas do campo de texto livre
   `notes` de uma tabela de banco de dados que não está versionada.

Enquanto isso não for resolvido, esta política **cita o corpus como delimitador de
faixa, nunca como fonte primária de valor** — o que é, aliás, exatamente o papel
que R2 lhe atribui.

---

## 7. Como aplicar a política a um feedstock novo

1. Determinar `bmp.medio` a partir de **≥ 2 referências primárias** na base da
   §1.2, cada uma com URL ou DOI verificável.
2. Declarar `bmp.min` e `bmp.max` como envelope de incerteza, não como extremos
   observados na literatura.
3. Atribuir `coverage` conforme a §3.
4. Enquanto R2 estiver suspensa, não usar `corpus.median` para verificar ou
   alargar a banda. Após eventual reativação formal, aplicar a regra então
   vigente com justificativa escrita — nunca mover o `medio`.
5. Nunca elevar um valor para aproximá-lo de um benchmark externo. Se um benchmark
   e a base divergem, a divergência é resultado, não defeito.

---

## 8. Documentos relacionados

| Documento | Papel |
|---|---|
| `REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | Especificação de R2, R1 rejeitada, efeito projetado, teste de CI |
| `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/BUSCA_OBSERVACOES_BMP_2026-07-25.md` | Onde as 196 observações foram procuradas e não encontradas |
| `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/AUDITORIA_CIRCULARIDADE_2026-07-25.md` | Parâmetros calibrados × independentes; cronologia de 2026-06-12 |
| `baseline_2026-07-25.json` | Estado numérico congelado, anterior a qualquer correção |
| `data/quarantine/feedstock_bmp_from_refs.csv` | Corpus agregado em quarentena; uso paramétrico suspenso |
